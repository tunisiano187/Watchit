#!/usr/bin/env bash
# Watchit — interactive Ubuntu setup wizard
# Usage: bash scripts/setup.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

# ── colours (used only outside whiptail) ─────────────────────────────────────
C_GREEN='\033[0;32m'; C_YELLOW='\033[1;33m'; C_RED='\033[0;31m'; C_NC='\033[0m'
log()  { echo -e "${C_GREEN}►${C_NC} $*"; }
warn() { echo -e "${C_YELLOW}⚠${C_NC}  $*"; }
die()  { echo -e "${C_RED}✗${C_NC}  $*" >&2; exit 1; }

# ── dependency installer ──────────────────────────────────────────────────────
install_deps() {
  local need=()
  for pkg in whiptail curl jq openssl; do
    command -v "$pkg" &>/dev/null || need+=("$pkg")
  done
  if [[ ${#need[@]} -gt 0 ]]; then
    log "Installing: ${need[*]}"
    sudo apt-get update -qq
    sudo apt-get install -y -q "${need[@]}"
  fi

  # Docker engine
  if ! command -v docker &>/dev/null; then
    log "Installing Docker Engine…"
    sudo apt-get install -y -q ca-certificates gnupg lsb-release
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      | sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) \
          signed-by=/etc/apt/keyrings/docker.gpg] \
          https://download.docker.com/linux/ubuntu \
          $(lsb_release -cs) stable" \
      | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -qq
    sudo apt-get install -y -q docker-ce docker-ce-cli containerd.io \
                               docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker "$USER"
    warn "Added $USER to the docker group — you may need to log out/in once."
  elif ! docker compose version &>/dev/null 2>&1; then
    log "Installing docker-compose-plugin…"
    sudo apt-get install -y -q docker-compose-plugin
  fi
}

# ── TUI helpers ───────────────────────────────────────────────────────────────
W=$(( $(tput cols)  * 4 / 5 )); [[ $W -lt 70 ]] && W=70
H=$(( $(tput lines) * 4 / 5 )); [[ $H -lt 22 ]] && H=22
LH=$(( H - 8 ))

# Read a value; outputs to stdout; exits non-zero on Cancel
_wt() { whiptail "$@" 3>&1 1>&2 2>&3; }

input()     { _wt --title "$1" --inputbox     "$2" 10 $W "${3:-}"; }
password()  { _wt --title "$1" --passwordbox  "$2" 10 $W ""; }
yesno()     { _wt --title "$1" --yesno        "$2" 10 $W && echo yes || echo no; }
msgbox()    { whiptail --title "$1" --msgbox  "$2" $H $W; }
menu()      {
  # menu <title> <prompt> <default> item1 tag1 item2 tag2 …
  local title=$1 prompt=$2 default=$3; shift 3
  _wt --title "$title" --default-item "$default" \
      --menu "$prompt" $H $W $LH "$@"
}
checklist() {
  # checklist <title> <prompt> item1 tag1 on|off …
  local title=$1 prompt=$2; shift 2
  _wt --title "$title" --checklist "$prompt" $H $W $LH "$@"
}

# ── secret generators ─────────────────────────────────────────────────────────
gen_pass()   { openssl rand -hex 24; }
gen_secret() { openssl rand -base64 32 | tr -d '\n'; }
gen_hex()    { openssl rand -hex 32; }

# ── Ollama model picker ───────────────────────────────────────────────────────
pick_ollama_model() {
  local base_url="$1"
  local raw
  raw=$(curl -sf --connect-timeout 6 "${base_url%/}/api/tags" 2>/dev/null || true)

  if [[ -z "$raw" ]]; then
    input "Ollama model" \
      "Could not reach $base_url — enter the model name to pull on first run:" \
      "mistral:7b"
    return
  fi

  local -a names
  mapfile -t names < <(echo "$raw" | jq -r '.models[]?.name // empty' 2>/dev/null)

  if [[ ${#names[@]} -eq 0 ]]; then
    input "Ollama model" \
      "No models found at $base_url — enter the model to use:" \
      "mistral:7b"
    return
  fi

  # Build whiptail menu items: tag + description pairs
  local -a items
  for m in "${names[@]}"; do
    local size
    size=$(echo "$raw" | jq -r --arg n "$m" \
           '.models[]? | select(.name==$n) | .size // 0 | . / 1073741824 | floor | tostring + " GB"' \
           2>/dev/null || echo "")
    items+=("$m" "${size:-}")
  done
  items+=("__other__" "Enter a model name manually")

  local choice
  choice=$(menu "Ollama model" \
    "Select a model (↑↓ arrows, Enter to confirm):" \
    "${names[0]}" "${items[@]}")

  if [[ "$choice" == "__other__" ]]; then
    input "Ollama model" "Enter the model name:" "mistral:7b"
  else
    echo "$choice"
  fi
}

# ── MAIN ──────────────────────────────────────────────────────────────────────
main() {

  # ── welcome ────────────────────────────────────────────────────────────────
  msgbox "Watchit — setup wizard" \
"Welcome to the Watchit interactive setup.

This wizard will:
  • Install Docker (if needed)
  • Ask a few questions about your environment
  • Generate all passwords and secrets automatically
  • Write a .env file
  • Optionally start the stack and run migrations

Press OK to begin."

  # ── existing .env ──────────────────────────────────────────────────────────
  if [[ -f "$ENV_FILE" ]]; then
    local ow
    ow=$(yesno "Existing .env" \
      ".env already exists.\n\nOverwrite it with a fresh configuration?")
    [[ "$ow" != "yes" ]] && { log "Keeping existing .env — nothing changed."; exit 0; }
  fi

  # ── admin account ──────────────────────────────────────────────────────────
  local ADMIN_EMAIL
  while true; do
    ADMIN_EMAIL=$(input "Admin account" \
      "Email address for the admin account (used to sign in via magic link):" "")
    [[ "$ADMIN_EMAIL" =~ ^[^@]+@[^@]+\.[^@]+$ ]] && break
    msgbox "Invalid email" "Please enter a valid email address."
  done

  # ── allow signups ──────────────────────────────────────────────────────────
  local ALLOW_SIGNUP
  local signup_choice
  signup_choice=$(yesno "User signups" \
    "Allow other users to sign up?\n\n(No = only $ADMIN_EMAIL can log in)")
  [[ "$signup_choice" == "yes" ]] && ALLOW_SIGNUP="true" || ALLOW_SIGNUP="false"

  # ── email delivery ─────────────────────────────────────────────────────────
  local RESEND_API_KEY FROM_EMAIL
  RESEND_API_KEY=$(input "Resend API key" \
    "Paste your Resend API key (get one free at resend.com).\n\nLeave blank to run without email delivery (digests won't be sent):" "")
  FROM_EMAIL=$(input "Sender address" \
    "From address shown in digest emails:" "onboarding@resend.dev")

  # ── app URL ────────────────────────────────────────────────────────────────
  local TRACKING_BASE_URL
  TRACKING_BASE_URL=$(input "App URL" \
    "Public URL where Watchit is reachable.\nUsed in email tracking links — must be reachable by email recipients:" \
    "http://localhost:3000")

  # ── interface language ─────────────────────────────────────────────────────
  local DEFAULT_LOCALE
  DEFAULT_LOCALE=$(menu "Interface language" \
    "Default language for the web interface:" "en" \
    "en" "English" \
    "fr" "Français")

  # ── Ollama ─────────────────────────────────────────────────────────────────
  local OLLAMA_URL OLLAMA_MODEL USE_DOCKER_OLLAMA="true"
  local ollama_mode
  ollama_mode=$(menu "Ollama (topic extraction)" \
    "Where should Watchit run Ollama?" "docker" \
    "docker"  "Bundled — run via Docker Compose (recommended, auto-started)" \
    "local"   "Local — already running on this machine (localhost:11434)" \
    "remote"  "Remote — another machine on the network")

  case "$ollama_mode" in
    docker)
      USE_DOCKER_OLLAMA="true"
      OLLAMA_URL="http://ollama:11434"
      OLLAMA_MODEL=$(input "Ollama model" \
        "Model to pull on first run (pulled automatically at startup):" "mistral:7b")
      ;;
    local)
      USE_DOCKER_OLLAMA="false"
      OLLAMA_URL="http://host.docker.internal:11434"
      OLLAMA_MODEL=$(pick_ollama_model "http://localhost:11434")
      ;;
    remote)
      USE_DOCKER_OLLAMA="false"
      OLLAMA_URL=$(input "Ollama URL" \
        "Full base URL of your Ollama instance (reachable from Docker):" \
        "http://192.168.1.100:11434")
      OLLAMA_MODEL=$(pick_ollama_model "$OLLAMA_URL")
      ;;
  esac

  # ── Vane (search engine) ───────────────────────────────────────────────────
  msgbox "Vane — search engine" \
"Vane is the AI search backend powering article discovery.

It requires a chat model and an embedding model, configured in
its own admin UI AFTER the stack is first started.

You can enter placeholder values now and update them later:
  1. Start the stack
  2. Open http://localhost:3001 → Settings → Models
  3. Configure providers and note their IDs
  4. Run: scripts/setup.sh --update-vane

Press OK to enter the values (or placeholders)."

  local VANE_CHAT_PROVIDER_ID VANE_CHAT_MODEL_KEY
  local VANE_EMBED_PROVIDER_ID VANE_EMBED_MODEL_KEY

  VANE_CHAT_PROVIDER_ID=$(input "Vane — chat provider ID" \
    "Chat provider ID (from Vane Settings → Models → Provider name).\nExamples: openai, anthropic, ollama" \
    "openai")
  VANE_CHAT_MODEL_KEY=$(input "Vane — chat model key" \
    "Chat model key (from Vane Settings → Models → Model name):" \
    "gpt-4o-mini")
  VANE_EMBED_PROVIDER_ID=$(input "Vane — embedding provider ID" \
    "Embedding provider ID:" \
    "openai")
  VANE_EMBED_MODEL_KEY=$(input "Vane — embedding model key" \
    "Embedding model key:" \
    "text-embedding-3-small")

  # ── auto-generated secrets ─────────────────────────────────────────────────
  log "Generating passwords and secrets…"
  local POSTGRES_PASSWORD NEXTAUTH_SECRET INTERNAL_API_KEY
  POSTGRES_PASSWORD=$(gen_pass)
  NEXTAUTH_SECRET=$(gen_secret)
  INTERNAL_API_KEY=$(gen_hex)

  # ── summary ────────────────────────────────────────────────────────────────
  msgbox "Configuration summary" \
"The following will be written to .env:

  Admin email:        $ADMIN_EMAIL
  Allow signups:      $ALLOW_SIGNUP
  Sender address:     $FROM_EMAIL
  App URL:            $TRACKING_BASE_URL
  Default language:   $DEFAULT_LOCALE

  Ollama:             $OLLAMA_URL
  Ollama model:       $OLLAMA_MODEL

  Vane chat:          $VANE_CHAT_PROVIDER_ID / $VANE_CHAT_MODEL_KEY
  Vane embedding:     $VANE_EMBED_PROVIDER_ID / $VANE_EMBED_MODEL_KEY

  Postgres password:  (auto-generated)
  NextAuth secret:    (auto-generated)
  Internal API key:   (auto-generated)

Press OK to write the file."

  # ── write .env ─────────────────────────────────────────────────────────────
  cat > "$ENV_FILE" <<EOF
# Generated by Watchit setup wizard on $(date -u '+%Y-%m-%dT%H:%M:%SZ')
# Edit this file to update settings, then restart the stack:
#   docker compose restart

# ── PostgreSQL ────────────────────────────────────────────────────────────────
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://watchit:${POSTGRES_PASSWORD}@postgres:5432/watchit

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ── Auth (NextAuth v5) ────────────────────────────────────────────────────────
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=${TRACKING_BASE_URL}

# ── Email (Resend) ────────────────────────────────────────────────────────────
RESEND_API_KEY=${RESEND_API_KEY:-re_placeholder_set_a_real_key}
FROM_EMAIL=${FROM_EMAIL}

# ── App ───────────────────────────────────────────────────────────────────────
TRACKING_BASE_URL=${TRACKING_BASE_URL}
INTERNAL_API_KEY=${INTERNAL_API_KEY}
ALLOW_SIGNUP=${ALLOW_SIGNUP}
ADMIN_EMAIL=${ADMIN_EMAIL}

# ── i18n ──────────────────────────────────────────────────────────────────────
DEFAULT_LOCALE=${DEFAULT_LOCALE}
SUPPORTED_LOCALES=en,fr

# ── Vane (search engine) ──────────────────────────────────────────────────────
# Configure models in the Vane UI (http://localhost:3001) then update these.
VANE_URL=http://vane:3000
VANE_CHAT_PROVIDER_ID=${VANE_CHAT_PROVIDER_ID}
VANE_CHAT_MODEL_KEY=${VANE_CHAT_MODEL_KEY}
VANE_EMBEDDING_PROVIDER_ID=${VANE_EMBED_PROVIDER_ID}
VANE_EMBEDDING_MODEL_KEY=${VANE_EMBED_MODEL_KEY}

# ── Ollama (topic extraction) ─────────────────────────────────────────────────
OLLAMA_URL=${OLLAMA_URL}
OLLAMA_MODEL=${OLLAMA_MODEL}
EOF
  chmod 600 "$ENV_FILE"
  log ".env written → $ENV_FILE"

  # ── add host.docker.internal on Linux for non-docker Ollama ───────────────
  if [[ "$USE_DOCKER_OLLAMA" == "false" ]]; then
    warn "Using external Ollama. Ensuring 'host.docker.internal' resolves inside containers…"
    warn "Add the following to your docker-compose.yml watchit and worker services if needed:"
    warn "  extra_hosts: [ 'host.docker.internal:host-gateway' ]"
  fi

  # ── start stack? ───────────────────────────────────────────────────────────
  local do_start
  do_start=$(yesno "Start the stack" \
    "Start the Docker Compose stack now?\n\nThis will build images and pull dependencies.\nFirst run may take several minutes.")

  if [[ "$do_start" == "yes" ]]; then
    log "Building and starting services…"

    local compose_args=()
    # Disable bundled Ollama if user has external one
    if [[ "$USE_DOCKER_OLLAMA" == "false" ]]; then
      compose_args+=("--scale" "ollama=0")
    fi

    docker compose -f "$REPO_ROOT/docker-compose.yml" \
      --env-file "$ENV_FILE" \
      up -d --build "${compose_args[@]}"

    log "Waiting for postgres to be healthy…"
    local retries=30
    until docker compose -f "$REPO_ROOT/docker-compose.yml" \
            --env-file "$ENV_FILE" \
            exec postgres pg_isready -U watchit -q 2>/dev/null \
         || (( --retries == 0 )); do
      sleep 2
    done
    (( retries > 0 )) || die "Postgres did not become healthy in time."

    log "Running database migrations…"
    docker compose -f "$REPO_ROOT/docker-compose.yml" \
      --env-file "$ENV_FILE" \
      run --rm watchit pnpm db:migrate

    msgbox "Setup complete 🎉" \
"Watchit is running!

  Web app:   ${TRACKING_BASE_URL}
  Vane UI:   http://localhost:3001

Sign in with: ${ADMIN_EMAIL}

Next steps if you used placeholder Vane values:
  1. Open http://localhost:3001 → Settings → Models
  2. Configure your chat and embedding providers
  3. Update VANE_CHAT_PROVIDER_ID / VANE_CHAT_MODEL_KEY
     and VANE_EMBEDDING_PROVIDER_ID / VANE_EMBEDDING_MODEL_KEY in .env
  4. Run: docker compose restart worker

To trigger a manual digest:
  curl -X POST ${TRACKING_BASE_URL}/api/internal/digest/run \\
       -H 'x-internal-api-key: ${INTERNAL_API_KEY}'"
  else
    msgbox "Setup complete" \
".env has been written to:
  $ENV_FILE

To start the stack manually:
  cd $REPO_ROOT
  docker compose up -d
  docker compose run --rm watchit pnpm db:migrate"
  fi
}

# ── entry point ───────────────────────────────────────────────────────────────
case "${1:-}" in
  --update-vane)
    # Non-TUI quick update for Vane provider config
    [[ ! -f "$ENV_FILE" ]] && die "No .env found — run setup.sh first."
    echo "Current Vane settings:"
    grep "^VANE_" "$ENV_FILE" || true
    echo ""
    read -rp "VANE_CHAT_PROVIDER_ID: " vcp
    read -rp "VANE_CHAT_MODEL_KEY:   " vcm
    read -rp "VANE_EMBEDDING_PROVIDER_ID: " vep
    read -rp "VANE_EMBEDDING_MODEL_KEY:   " vem
    sed -i \
      -e "s|^VANE_CHAT_PROVIDER_ID=.*|VANE_CHAT_PROVIDER_ID=${vcp}|" \
      -e "s|^VANE_CHAT_MODEL_KEY=.*|VANE_CHAT_MODEL_KEY=${vcm}|" \
      -e "s|^VANE_EMBEDDING_PROVIDER_ID=.*|VANE_EMBEDDING_PROVIDER_ID=${vep}|" \
      -e "s|^VANE_EMBEDDING_MODEL_KEY=.*|VANE_EMBEDDING_MODEL_KEY=${vem}|" \
      "$ENV_FILE"
    log "Updated. Restarting worker…"
    docker compose -f "$REPO_ROOT/docker-compose.yml" --env-file "$ENV_FILE" restart worker
    log "Done."
    ;;
  *)
    install_deps
    main
    ;;
esac
