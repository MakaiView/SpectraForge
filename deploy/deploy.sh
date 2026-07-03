#!/usr/bin/env bash
# Manual deploy on the LXC: pull latest master, then build + migrate. For
# hands-off updates use the release-gated auto-updater (deploy/update.sh +
# systemd timer) instead. See SETUP_HOMELAB.md.
#
#   ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

echo "→ Pulling latest master from GitHub…"
git pull --ff-only

./deploy/_apply.sh

echo "✓ Deploy complete — app is live behind Caddy."
