#!/usr/bin/env bash
# Apply supabase/migrations/* to the self-hosted Postgres. Runs a throwaway node
# container on the `sfnet` network so it can reach postgres at db:5432. Uses the
# Supabase CLI's `db push --db-url` (same migrations that run in local dev), so
# prod and dev stay in lockstep.
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

set -a
# shellcheck disable=SC1091
source .env.production
set +a

: "${SUPABASE_DB_URL:?set SUPABASE_DB_URL in .env.production (postgresql://postgres:PW@db:5432/postgres)}"

echo "→ Applying migrations…"
docker run --rm --network sfnet -v "$PWD:/work" -w /work node:22-slim \
  npx --yes supabase@latest db push --db-url "$SUPABASE_DB_URL"
echo "✓ Migrations applied."
