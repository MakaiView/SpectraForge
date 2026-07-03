#!/usr/bin/env bash
# Build + (re)start the app stack and apply migrations. No git here — callers
# (deploy.sh manual, update.sh automatic) check out the right ref first. Builds
# from source on the LXC (the "Simple" compose path).
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

echo "→ Building + starting the app stack…"
docker compose -f deploy/docker-compose.app.yml up -d --build

echo "→ Applying database migrations…"
./deploy/migrate.sh
