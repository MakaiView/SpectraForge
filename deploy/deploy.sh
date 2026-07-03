#!/usr/bin/env bash
# One-shot deploy on the LXC: pull latest, rebuild + restart the app, apply
# migrations. Idempotent — safe to re-run. See SETUP_HOMELAB.md.
#
#   ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

echo "→ Pulling latest from GitHub…"
git pull --ff-only

echo "→ Building + starting the app stack…"
docker compose -f deploy/docker-compose.app.yml up -d --build

echo "→ Applying database migrations…"
./deploy/migrate.sh

echo "✓ Deploy complete — app is live behind Caddy."
