#!/usr/bin/env bash
# SpectraForge backup — captures the irreplaceable assets plus restore config:
#   1) Postgres (all recipes/attempts/calibration data + auth)  → db-<stamp>.sql.gz
#   2) Supabase Storage object files (uploaded photos / SVGs)    → storage-<stamp>.tar.gz
#   3) Config needed to restore (.env.production + deploy/)      → config-<stamp>.tar.gz
#
# The DB dump ALONE is NOT enough: photo bytes live on the Storage filesystem,
# not in Postgres, so a DB-only restore leaves every image path dangling. This
# script grabs both, plus the config required to stand the stack back up.
#
# Cron/systemd friendly. Override target + retention with env:
#   SF_BACKUP_DIR   (default /mnt/nas/sf)   where archives are written
#   SF_BACKUP_KEEP  (default 14)            how many of each kind to retain
#   SF_DB_CONTAINER / SF_STORAGE_CONTAINER  (defaults supabase-db / supabase-storage)
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

DEST="${SF_BACKUP_DIR:-/mnt/nas/sf}"
KEEP="${SF_BACKUP_KEEP:-14}"
DB_CONTAINER="${SF_DB_CONTAINER:-supabase-db}"
STORAGE_CONTAINER="${SF_STORAGE_CONTAINER:-supabase-storage}"
STAMP="$(date +%F-%H%M%S)"

mkdir -p "$DEST"
echo "→ SpectraForge backup → $DEST (stamp $STAMP)"

# 1) Database — every table + roles.
echo "  • database…"
docker exec -t "$DB_CONTAINER" pg_dumpall -U postgres | gzip > "$DEST/db-$STAMP.sql.gz"

# 2) Storage object files — stream a tar out of the container (no in-container
#    tooling needed; works for bind mounts or named volumes alike).
echo "  • storage files…"
docker cp "$STORAGE_CONTAINER:/var/lib/storage" - | gzip > "$DEST/storage-$STAMP.tar.gz"

# 3) Restore config (contains secrets — keep the backup target private).
echo "  • config…"
tar -czf "$DEST/config-$STAMP.tar.gz" .env.production deploy 2>/dev/null || true

# Retention: keep the newest $KEEP of each kind.
for kind in db storage config; do
  # shellcheck disable=SC2012
  ls -1t "$DEST/$kind-"* 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
done

echo "✓ Backup complete:"
ls -lh "$DEST"/*-"$STAMP".* 2>/dev/null | awk '{print "   " $NF "  (" $5 ")"}'
