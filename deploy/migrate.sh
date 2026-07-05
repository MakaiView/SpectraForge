#!/usr/bin/env bash
# Apply supabase/migrations/* to the self-hosted Postgres, idempotently. Runs a
# postgres-client container on the sfnet network (reaches postgres at db:5432)
# and reads SUPABASE_DB_URL from .env.production via docker --env-file — no
# host-side sourcing, so values with spaces don't break it.
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

[ -f .env.production ] || { echo "✗ .env.production not found in $(pwd)"; exit 1; }

echo "→ Applying migrations…"
docker run --rm --network sfnet --env-file .env.production -v "$PWD:/work" -w /work postgres:17 \
  bash /work/deploy/migrate-inner.sh
echo "✓ Migrations applied."
