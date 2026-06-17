#!/bin/sh
set -e

REDIS_HOST="${REDIS_URL:-redis://redis:6379}"
# Extract host:port from redis URL (strip protocol prefix)
REDIS_ADDR="${REDIS_HOST#redis://}"
REDIS_ADDR="${REDIS_ADDR#rediss://}"
REDIS_HOST_ONLY="${REDIS_ADDR%%:*}"
REDIS_PORT_ONLY="${REDIS_ADDR##*:}"
REDIS_PORT_ONLY="${REDIS_PORT_ONLY%%/*}"
: "${REDIS_PORT_ONLY:=6379}"

UPDATE_QUEUE="watchit:update:queue"
UPDATE_STATUS_KEY="watchit:update:status"

redis_cmd() {
  redis-cli -h "$REDIS_HOST_ONLY" -p "$REDIS_PORT_ONLY" "$@"
}

set_status() {
  STATE="$1"
  MSG="$2"
  TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  redis_cmd SET "$UPDATE_STATUS_KEY" "{\"state\":\"${STATE}\",\"message\":\"${MSG}\",\"updatedAt\":\"${TS}\"}" || true
}

echo "[updater] Starting updater daemon…"

while true; do
  echo "[updater] Waiting for update trigger…"
  # BLPOP with 60s timeout; returns empty on timeout, loops back
  RESULT="$(redis_cmd BLPOP "$UPDATE_QUEUE" 60 2>/dev/null || true)"
  if [ -z "$RESULT" ]; then
    continue
  fi

  echo "[updater] Update triggered — starting update process"
  set_status "running" "Pulling latest code..."

  (
    set -e

    cd /repo

    echo "[updater] git pull origin main"
    git pull origin main || { set_status "error" "git pull failed"; exit 1; }

    set_status "running" "Building images..."
    echo "[updater] docker compose build"
    docker compose -f /repo/docker-compose.yml build watchit worker || { set_status "error" "docker compose build failed"; exit 1; }

    set_status "running" "Restarting services..."
    echo "[updater] docker compose up -d"
    docker compose -f /repo/docker-compose.yml up -d watchit worker || { set_status "error" "docker compose up failed"; exit 1; }

    set_status "running" "Running migrations..."
    echo "[updater] db:migrate"
    docker compose -f /repo/docker-compose.yml run --rm watchit pnpm db:migrate || { set_status "error" "db:migrate failed"; exit 1; }

    set_status "success" "Update complete"
    echo "[updater] Update completed successfully"
  ) || true
done
