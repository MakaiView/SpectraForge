#!/usr/bin/env bash
# Build + (re)start the app stack and apply migrations. No git here — callers
# (deploy.sh manual, update.sh automatic) check out the right ref first. Builds
# from source on the LXC (the "Simple" compose path).
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

# Which compose file: default = app.yml (Caddy/TLS); set SF_COMPOSE_FILE to
# deploy/docker-compose.lan.yml for a LAN-only deploy.
COMPOSE="${SF_COMPOSE_FILE:-deploy/docker-compose.app.yml}"

echo "→ Building + starting the app stack ($COMPOSE)…"
# --env-file so compose interpolates the NEXT_PUBLIC_* build args from
# .env.production (they're baked into the client bundle at build time).
docker compose --env-file .env.production -f "$COMPOSE" up -d --build

echo "→ Applying database migrations…"
./deploy/migrate.sh
