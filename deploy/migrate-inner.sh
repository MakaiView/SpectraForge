#!/usr/bin/env bash
# Runs INSIDE a postgres client container (see migrate.sh). Applies
# supabase/migrations/*.sql in order, tracked in public._sf_migrations so
# re-runs (every deploy) are idempotent. Reads SUPABASE_DB_URL from the
# container env (docker --env-file), so no fragile host-side sourcing.
set -euo pipefail
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL not set in .env.production}"

psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c \
  "create table if not exists public._sf_migrations (name text primary key, applied_at timestamptz default now());"

for f in /work/supabase/migrations/*.sql; do
  name="$(basename "$f")"
  if [ -n "$(psql "$SUPABASE_DB_URL" -tAc "select 1 from public._sf_migrations where name = '$name'")" ]; then
    echo "  skip    $name"
    continue
  fi
  echo "  apply   $name"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f "$f"
  psql "$SUPABASE_DB_URL" -c "insert into public._sf_migrations (name) values ('$name')"
done
