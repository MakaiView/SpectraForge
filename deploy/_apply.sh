#!/usr/bin/env bash
# Build + (re)start the app stack and apply migrations. No git here — callers
# (deploy.sh manual, update.sh automatic) check out the right ref first. Builds
# from source on the LXC (the "Simple" compose path).
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

# Which compose file: default = app.yml (Caddy/TLS); set SF_COMPOSE_FILE to
# deploy/docker-compose.lan.yml for a LAN-only deploy.
COMPOSE="${SF_COMPOSE_FILE:-deploy/docker-compose.app.yml}"

# Shared deploy-state dir (bind-mounted into the app for the update panel + the
# in-app update trigger). 777 so both the host updater and the container's
# non-root app user (uid 1001) can read/write it.
mkdir -p deploy/state && chmod 777 deploy/state

# Bake the deployed ref into the image so the app can show its running version.
export SF_VERSION="$(git describe --tags --always 2>/dev/null || echo dev)"

echo "→ Building + starting the app stack ($COMPOSE) at $SF_VERSION…"
# --env-file so compose interpolates the NEXT_PUBLIC_* build args from
# .env.production (they're baked into the client bundle at build time). SF_VERSION
# comes from the exported shell env above (shell env wins over --env-file).
docker compose --env-file .env.production -f "$COMPOSE" up -d --build

echo "→ Applying database migrations…"
./deploy/migrate.sh
