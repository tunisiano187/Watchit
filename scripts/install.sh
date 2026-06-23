#!/usr/bin/env bash
# Watchit — cross-platform install & bootstrap script
# Supports: Ubuntu/Debian, Fedora/RHEL/CentOS, Arch Linux, macOS (Homebrew)
#
# Usage (from repo root):  bash scripts/install.sh
# Usage (one-liner):       curl -fsSL https://raw.githubusercontent.com/tunisiano187/Watchit/main/scripts/install.sh | bash
set -euo pipefail

# ── ANSI colours ──────────────────────────────────────────────────────────────
if [ -t 1 ] && tput colors &>/dev/null && [ "$(tput colors)" -ge 8 ]; then
  C_RESET='\033[0m'; C_BOLD='\033[1m'; C_DIM='\033[2m'
  C_RED='\033[0;31m'; C_GREEN='\033[0;32m'; C_YELLOW='\033[1;33m'
  C_BLUE='\033[0;34m'; C_MAGENTA='\033[0;35m'; C_CYAN='\033[0;36m'
else
  C_RESET=''; C_BOLD=''; C_DIM=''; C_RED=''; C_GREEN=''
  C_YELLOW=''; C_BLUE=''; C_MAGENTA=''; C_CYAN=''
fi

# ── Print helpers ─────────────────────────────────────────────────────────────
banner() {
  echo -e "${C_CYAN}${C_BOLD}"
  echo '  ██╗    ██╗ █████╗ ████████╗ ██████╗██╗  ██╗██╗████████╗'
  echo '  ██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║██║╚══██╔══╝'
  echo '  ██║ █╗ ██║███████║   ██║   ██║     ███████║██║   ██║   '
  echo '  ██║███╗██║██╔══██║   ██║   ██║     ██╔══██║██║   ██║   '
  echo '  ╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║██║   ██║   '
  echo '   ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝╚═╝   ╚═╝   '
  echo -e "${C_RESET}"
  echo -e "  ${C_DIM}Your personalized tech-watch digest, delivered daily.${C_RESET}"
  echo
}

section()  { echo -e "\n${C_BOLD}${C_BLUE}╔═ $* ${C_RESET}\n"; }
info()     { echo -e "  ${C_BLUE}→${C_RESET} $*"; }
ok()       { echo -e "  ${C_GREEN}✓${C_RESET} $*"; }
warn()     { echo -e "  ${C_YELLOW}⚠${C_RESET}  $*"; }
error()    { echo -e "  ${C_RED}✗${C_RESET}  $*" >&2; }
die()      { error "$*"; exit 1; }
skip()     { echo -e "  ${C_DIM}–${C_RESET} $* ${C_DIM}(already installed)${C_RESET}"; }
blank()    { echo; }

# Prompt with optional default
ask() {
  local label="$1" default="${2-}" answer
  echo -en "  ${C_BOLD}?${C_RESET} ${label}"
  [ -n "$default" ] && echo -en " ${C_DIM}[$default]${C_RESET}"
  echo -en ": "
  read -r answer
  echo "${answer:-$default}"
}

# Silent prompt (passwords / secrets)
ask_secret() {
  local label="$1" answer
  echo -en "  ${C_BOLD}?${C_RESET} ${label}: "
  read -rs answer; echo
  echo "$answer"
}

# y/n confirm — default is first char of $2 (y or n)
confirm() {
  local label="$1" default="${2:-y}" answer
  while true; do
    echo -en "  ${C_BOLD}?${C_RESET} ${label} ${C_DIM}[y/n, default: $default]${C_RESET}: "
    read -r answer
    answer="${answer:-$default}"
    case "$answer" in
      [Yy]*) return 0 ;;
      [Nn]*) return 1 ;;
      *) warn "Please answer y or n." ;;
    esac
  done
}

# Numbered menu: menu "Choose" "Option A" "Option B" → prints chosen value
menu() {
  local title="$1"; shift
  local options=("$@") i=1 answer
  echo -e "  ${C_BOLD}?${C_RESET} ${title}:"
  for opt in "${options[@]}"; do
    echo -e "    ${C_CYAN}$i)${C_RESET} $opt"
    ((i++))
  done
  while true; do
    echo -en "  ${C_BOLD}>${C_RESET} Enter number [1-${#options[@]}]: "
    read -r answer
    if [[ "$answer" =~ ^[0-9]+$ ]] && [ "$answer" -ge 1 ] && [ "$answer" -le "${#options[@]}" ]; then
      echo "${options[$((answer - 1))]}"
      return
    fi
    warn "Invalid choice, pick 1-${#options[@]}."
  done
}

gen_secret()   { openssl rand -hex 32; }
gen_password() { openssl rand -base64 24 | tr -d '/+='; }

SUDO=""
[ "$(id -u)" -ne 0 ] && SUDO="sudo"

# ── OS detection ──────────────────────────────────────────────────────────────
detect_os() {
  OS_ID=""
  PKG_MGR=""
  if [[ "$(uname -s)" == "Darwin" ]]; then
    OS_ID="macos"
    PKG_MGR="brew"
    return
  fi
  if [ -f /etc/os-release ]; then
    # shellcheck source=/dev/null
    . /etc/os-release
    OS_ID="${ID:-unknown}"
    case "${ID_LIKE:-} $ID" in
      *debian*|*ubuntu*)   PKG_MGR="apt"    ;;
      *fedora*|*rhel*)     PKG_MGR="dnf"    ;;
      *centos*)            PKG_MGR="yum"    ;;
      *arch*)              PKG_MGR="pacman" ;;
      *suse*)              PKG_MGR="zypper" ;;
    esac
    # Override: detect by available command if ID_LIKE wasn't helpful
    if [ -z "$PKG_MGR" ]; then
      command -v apt-get &>/dev/null  && PKG_MGR="apt"
      command -v dnf     &>/dev/null  && PKG_MGR="dnf"
      command -v yum     &>/dev/null  && PKG_MGR="yum"
      command -v pacman  &>/dev/null  && PKG_MGR="pacman"
      command -v zypper  &>/dev/null  && PKG_MGR="zypper"
    fi
  fi
  [ -z "$PKG_MGR" ] && die "Unsupported OS. Install git, docker, curl, openssl manually then re-run."
}

# ── Package install abstraction ────────────────────────────────────────────────
pkg_update() {
  case "$PKG_MGR" in
    apt)    $SUDO apt-get update -qq ;;
    dnf)    $SUDO dnf check-update -q || true ;;
    yum)    $SUDO yum check-update -q || true ;;
    pacman) $SUDO pacman -Sy --noconfirm ;;
    zypper) $SUDO zypper refresh -q ;;
    brew)   brew update -q ;;
  esac
}

pkg_install() {
  case "$PKG_MGR" in
    apt)    $SUDO apt-get install -y -q "$@" ;;
    dnf)    $SUDO dnf install -y -q "$@" ;;
    yum)    $SUDO yum install -y -q "$@" ;;
    pacman) $SUDO pacman -S --noconfirm "$@" ;;
    zypper) $SUDO zypper install -y -q "$@" ;;
    brew)   brew install "$@" ;;
  esac
}

# ── Install Docker (distro-specific) ──────────────────────────────────────────
install_docker() {
  info "Installing Docker Engine…"
  case "$PKG_MGR" in
    apt)
      pkg_install ca-certificates curl gnupg lsb-release
      $SUDO install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/"${OS_ID}"/gpg \
        | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      $SUDO chmod a+r /etc/apt/keyrings/docker.gpg
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/${OS_ID} $(lsb_release -cs) stable" \
        | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
      pkg_update
      pkg_install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      ;;
    dnf|yum)
      $SUDO "$PKG_MGR" install -y -q yum-utils
      $SUDO yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      $SUDO "$PKG_MGR" install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
      $SUDO systemctl enable --now docker
      ;;
    pacman)
      pkg_install docker docker-compose
      $SUDO systemctl enable --now docker
      ;;
    zypper)
      $SUDO zypper install -y docker docker-compose
      $SUDO systemctl enable --now docker
      ;;
    brew)
      warn "On macOS, install Docker Desktop: https://www.docker.com/products/docker-desktop/"
      warn "Then re-run this script."
      exit 0
      ;;
  esac

  # Add current user to docker group (Linux only)
  if [[ "$(uname -s)" != "Darwin" ]] && ! groups | grep -q docker; then
    $SUDO usermod -aG docker "$USER" || true
    warn "Added $USER to the docker group. You may need to log out and back in,"
    warn "or run the rest of this script with:  newgrp docker"
  fi
}

# ── Dependency checks ─────────────────────────────────────────────────────────
check_deps() {
  section "Checking dependencies"
  local need_update=false

  # git
  if command -v git &>/dev/null; then
    skip "git $(git --version | awk '{print $3}')"
  else
    info "git not found — will install"
    need_update=true
    NEED_GIT=true
  fi

  # curl
  if command -v curl &>/dev/null; then
    skip "curl"
  else
    info "curl not found — will install"
    need_update=true
    NEED_CURL=true
  fi

  # openssl
  if command -v openssl &>/dev/null; then
    skip "openssl $(openssl version | awk '{print $2}')"
  else
    info "openssl not found — will install"
    need_update=true
    NEED_OPENSSL=true
  fi

  # jq
  if command -v jq &>/dev/null; then
    skip "jq $(jq --version)"
  else
    info "jq not found — will install"
    need_update=true
    NEED_JQ=true
  fi

  # Docker
  if command -v docker &>/dev/null; then
    skip "docker $(docker --version | awk '{print $3}' | tr -d ',')"
    DOCKER_OK=true
  else
    info "Docker not found — will install"
    need_update=true
    NEED_DOCKER=true
  fi

  # docker compose (v2 plugin)
  COMPOSE_CMD=""
  if docker compose version &>/dev/null 2>&1; then
    skip "docker compose v2"
    COMPOSE_CMD="docker compose"
  elif command -v docker-compose &>/dev/null; then
    skip "docker-compose (v1)"
    COMPOSE_CMD="docker-compose"
  else
    info "docker compose not found — will install with Docker"
    NEED_DOCKER=true
  fi

  # Install what's needed
  if [ "$need_update" = true ]; then
    info "Updating package index…"
    pkg_update
  fi

  local base_pkgs=()
  [ "${NEED_GIT:-}"     = true ] && base_pkgs+=("git")
  [ "${NEED_CURL:-}"    = true ] && base_pkgs+=("curl")
  [ "${NEED_OPENSSL:-}" = true ] && base_pkgs+=("openssl")
  [ "${NEED_JQ:-}"      = true ] && base_pkgs+=("jq")

  if [ "${#base_pkgs[@]}" -gt 0 ]; then
    info "Installing: ${base_pkgs[*]}"
    pkg_install "${base_pkgs[@]}"
  fi

  if [ "${NEED_DOCKER:-}" = true ]; then
    install_docker
    COMPOSE_CMD="docker compose"
  fi

  [ -z "$COMPOSE_CMD" ] && COMPOSE_CMD="docker compose"
  ok "All dependencies satisfied"
}

# ── Repo bootstrap (for curl | bash installs) ─────────────────────────────────
REPO_ROOT=""
bootstrap_repo() {
  # Are we already inside the Watchit repo?
  if [ -f "$(pwd)/docker-compose.yml" ] && grep -q "watchit" "$(pwd)/docker-compose.yml" 2>/dev/null; then
    REPO_ROOT="$(pwd)"
    ok "Running inside Watchit repo at $REPO_ROOT"
    return
  fi

  # Try parent directories up to 2 levels
  for d in ".." "../.."; do
    if [ -f "$d/docker-compose.yml" ] && grep -q "watchit" "$d/docker-compose.yml" 2>/dev/null; then
      REPO_ROOT="$(cd "$d" && pwd)"
      ok "Found Watchit repo at $REPO_ROOT"
      return
    fi
  done

  # Clone fresh
  section "Cloning Watchit"
  local install_dir
  install_dir="$(ask "Installation directory" "$HOME/watchit")"
  if [ -d "$install_dir/.git" ]; then
    info "Directory exists — pulling latest changes…"
    git -C "$install_dir" pull --ff-only
  else
    git clone https://github.com/tunisiano187/Watchit.git "$install_dir"
  fi
  REPO_ROOT="$install_dir"
  ok "Watchit cloned to $REPO_ROOT"
}

# ── Configuration wizard ──────────────────────────────────────────────────────
configure() {
  section "Configuration"
  echo -e "  ${C_DIM}These values are written to ${REPO_ROOT}/.env${C_RESET}"
  blank

  ENV_FILE="$REPO_ROOT/.env"

  # Load existing values as defaults
  if [ -f "$ENV_FILE" ]; then
    warn ".env already exists — existing values used as defaults. Press Enter to keep."
    blank
    # shellcheck source=/dev/null
    set -o allexport; source "$ENV_FILE" || true; set +o allexport
  fi

  # ── Admin & auth ────────────────────────────────────────────────────────────
  echo -e "  ${C_BOLD}${C_MAGENTA}Admin & authentication${C_RESET}"
  ADMIN_EMAIL=$(ask "Admin email (receives first magic-link)" "${ADMIN_EMAIL:-}")
  [ -z "$ADMIN_EMAIL" ] && die "Admin email is required."

  local allow_tmp
  allow_tmp=$(menu "Allow new users to self-register?" "No — invite-only (recommended)" "Yes — open registration")
  case "$allow_tmp" in
    *Yes*) ALLOW_SIGNUP="true"  ;;
    *)     ALLOW_SIGNUP="false" ;;
  esac

  blank
  # ── App URL ─────────────────────────────────────────────────────────────────
  echo -e "  ${C_BOLD}${C_MAGENTA}Application URL${C_RESET}"
  info "Used to build tracking links in emails."
  TRACKING_BASE_URL=$(ask "Public URL (e.g. https://watchit.example.com)" "${TRACKING_BASE_URL:-http://localhost:3000}")
  NEXTAUTH_URL="$TRACKING_BASE_URL"

  blank
  # ── Email (Resend) ──────────────────────────────────────────────────────────
  echo -e "  ${C_BOLD}${C_MAGENTA}Email delivery — Resend${C_RESET}"
  info "Free tier: 3 000 emails/month. Get a key at https://resend.com"
  RESEND_API_KEY=$(ask_secret "Resend API key (starts with re_)")
  [ -z "$RESEND_API_KEY" ] && warn "No Resend key set — email sending will be disabled."

  blank
  # ── Ollama / LLM ─────────────────────────────────────────────────────────────
  echo -e "  ${C_BOLD}${C_MAGENTA}LLM for topic extraction (Ollama)${C_RESET}"
  local ollama_mode
  ollama_mode=$(menu "Ollama setup" \
    "Local — run Ollama inside Docker (needs ~4 GB RAM)" \
    "Remote — I already have an Ollama server" \
    "Skip — use TF-IDF fallback only (no LLM)")

  case "$ollama_mode" in
    Local*)
      OLLAMA_URL="http://ollama:11434"
      OLLAMA_MODEL=$(ask "Model to pull" "${OLLAMA_MODEL:-mistral:7b}")
      info "Ollama will start automatically and pull $OLLAMA_MODEL on first boot."
      ;;
    Remote*)
      OLLAMA_URL=$(ask "Ollama URL" "${OLLAMA_URL:-http://192.168.1.100:11434}")
      OLLAMA_MODEL=$(ask "Model name" "${OLLAMA_MODEL:-mistral:7b}")
      ;;
    Skip*)
      OLLAMA_URL=""
      OLLAMA_MODEL=""
      info "TF-IDF fallback will be used for topic extraction."
      ;;
  esac

  blank
  # ── Language / locale ────────────────────────────────────────────────────────
  echo -e "  ${C_BOLD}${C_MAGENTA}Language${C_RESET}"
  local locale_choice
  locale_choice=$(menu "Default interface language" "English (en)" "Français (fr)")
  case "$locale_choice" in
    *fr*) DEFAULT_LOCALE="fr" ;;
    *)    DEFAULT_LOCALE="en" ;;
  esac
  SUPPORTED_LOCALES="en,fr"

  blank
  # ── Vane / Perplexica ────────────────────────────────────────────────────────
  echo -e "  ${C_BOLD}${C_MAGENTA}Vane (search engine — Perplexica)${C_RESET}"
  info "Vane runs automatically via Docker. Its providers must be configured"
  info "in its UI at ${TRACKING_BASE_URL%:*}:3001 after first boot."
  VANE_CHAT_PROVIDER_ID=$(ask   "Chat provider ID"       "${VANE_CHAT_PROVIDER_ID:-ollama}")
  VANE_CHAT_MODEL_KEY=$(ask     "Chat model key"         "${VANE_CHAT_MODEL_KEY:-mistral:7b}")
  VANE_EMBEDDING_PROVIDER_ID=$(ask "Embedding provider ID" "${VANE_EMBEDDING_PROVIDER_ID:-ollama}")
  VANE_EMBEDDING_MODEL_KEY=$(ask   "Embedding model key"   "${VANE_EMBEDDING_MODEL_KEY:-nomic-embed-text:latest}")

  blank
  # ── Secrets (auto-generated) ─────────────────────────────────────────────────
  echo -e "  ${C_BOLD}${C_MAGENTA}Secrets (auto-generated if blank)${C_RESET}"
  POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(gen_password)}"
  NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$(gen_secret)}"
  INTERNAL_API_KEY="${INTERNAL_API_KEY:-$(gen_secret)}"
  ok "Secrets ready"

  # ── GitHub token (optional) ──────────────────────────────────────────────────
  blank
  echo -e "  ${C_BOLD}${C_MAGENTA}GitHub (optional — for update checks)${C_RESET}"
  info "A token raises the GitHub API rate limit from 60 to 5 000 req/hour."
  GITHUB_TOKEN=$(ask_secret "GitHub token (or leave blank)")

  # ── Write .env ───────────────────────────────────────────────────────────────
  blank
  info "Writing ${ENV_FILE}…"
  cat > "$ENV_FILE" <<EOF
# Watchit — generated by install.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://watchit:${POSTGRES_PASSWORD}@postgres:5432/watchit
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# ── Redis ────────────────────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ── Auth ─────────────────────────────────────────────────────────────────────
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=${NEXTAUTH_URL}
ADMIN_EMAIL=${ADMIN_EMAIL}
ALLOW_SIGNUP=${ALLOW_SIGNUP}

# ── Email ────────────────────────────────────────────────────────────────────
RESEND_API_KEY=${RESEND_API_KEY:-}

# ── Tracking links ────────────────────────────────────────────────────────────
TRACKING_BASE_URL=${TRACKING_BASE_URL}

# ── Vane (search) ────────────────────────────────────────────────────────────
VANE_URL=http://vane:3001
VANE_CHAT_PROVIDER_ID=${VANE_CHAT_PROVIDER_ID}
VANE_CHAT_MODEL_KEY=${VANE_CHAT_MODEL_KEY}
VANE_EMBEDDING_PROVIDER_ID=${VANE_EMBEDDING_PROVIDER_ID}
VANE_EMBEDDING_MODEL_KEY=${VANE_EMBEDDING_MODEL_KEY}

# ── Ollama (LLM) ─────────────────────────────────────────────────────────────
OLLAMA_URL=${OLLAMA_URL:-}
OLLAMA_MODEL=${OLLAMA_MODEL:-}

# ── Internals ────────────────────────────────────────────────────────────────
INTERNAL_API_KEY=${INTERNAL_API_KEY}
GITHUB_TOKEN=${GITHUB_TOKEN:-}
COMPOSE_PROJECT_NAME=watchit

# ── i18n ─────────────────────────────────────────────────────────────────────
DEFAULT_LOCALE=${DEFAULT_LOCALE}
SUPPORTED_LOCALES=${SUPPORTED_LOCALES}
EOF
  ok "Configuration saved to $ENV_FILE"
}

# ── Docker Compose operations ─────────────────────────────────────────────────
start_stack() {
  section "Starting Watchit"
  cd "$REPO_ROOT"

  # Build / pull
  info "Pulling base images…"
  $COMPOSE_CMD pull --quiet --ignore-pull-failures 2>/dev/null || true

  info "Building Watchit image…"
  $COMPOSE_CMD build --quiet watchit worker

  # Start
  info "Starting containers (this may take a minute)…"
  $COMPOSE_CMD up -d

  # Wait for Postgres to be healthy
  info "Waiting for Postgres to be ready…"
  local attempts=0
  until $COMPOSE_CMD exec -T postgres pg_isready -U watchit -q 2>/dev/null; do
    ((attempts++))
    [ "$attempts" -ge 30 ] && die "Postgres did not become ready in time."
    sleep 2
  done
  ok "Postgres is up"

  # Run migrations
  info "Running database migrations…"
  $COMPOSE_CMD exec -T watchit pnpm db:migrate
  ok "Migrations complete"
}

# ── Summary ────────────────────────────────────────────────────────────────────
print_summary() {
  blank
  echo -e "${C_GREEN}${C_BOLD}╔══════════════════════════════════════════════╗${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}║        Watchit is up and running! 🎉         ║${C_RESET}"
  echo -e "${C_GREEN}${C_BOLD}╚══════════════════════════════════════════════╝${C_RESET}"
  blank
  echo -e "  ${C_BOLD}Dashboard:${C_RESET}  ${TRACKING_BASE_URL}"
  echo -e "  ${C_BOLD}Admin:${C_RESET}      ${TRACKING_BASE_URL}/admin"
  echo -e "  ${C_BOLD}Sign-in:${C_RESET}    ${TRACKING_BASE_URL}/auth/signin"
  blank
  echo -e "  ${C_DIM}First sign-in: use ${ADMIN_EMAIL}${C_RESET}"
  echo -e "  ${C_DIM}Config file:   ${REPO_ROOT}/.env${C_RESET}"
  blank
  echo -e "  ${C_BOLD}Useful commands:${C_RESET}"
  echo -e "  ${C_DIM}  View logs:     cd ${REPO_ROOT} && ${COMPOSE_CMD} logs -f watchit${C_RESET}"
  echo -e "  ${C_DIM}  Stop:          cd ${REPO_ROOT} && ${COMPOSE_CMD} down${C_RESET}"
  echo -e "  ${C_DIM}  Reconfigure:   bash ${REPO_ROOT}/scripts/setup.sh${C_RESET}"
  blank
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  clear
  banner

  detect_os
  echo -e "  ${C_DIM}OS: ${OS_ID}  ·  Package manager: ${PKG_MGR}${C_RESET}"
  blank

  check_deps
  bootstrap_repo
  configure

  blank
  if confirm "Start all containers now?"; then
    start_stack
    print_summary
  else
    blank
    info "To start later, run:"
    echo -e "  ${C_DIM}cd ${REPO_ROOT} && ${COMPOSE_CMD} up -d${C_RESET}"
    blank
  fi
}

main "$@"
