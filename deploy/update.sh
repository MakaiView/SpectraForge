#!/usr/bin/env bash
# Auto-update: check GitHub for a newer version and redeploy if there is one.
# Runs on a timer (deploy/spectraforge-update.timer). Git stays the source of
# truth; no inbound ports or CI secrets needed. Two channels via
# SF_UPDATE_CHANNEL:
#   stable (default) — deploy the latest release tag vX.Y.Z (you control ships
#                      by tagging: scripts/release.sh).
#   edge             — track origin/master (deploy every commit).
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

CHANNEL="${SF_UPDATE_CHANNEL:-stable}"
git fetch --tags --prune --quiet origin

if [ "$CHANNEL" = "edge" ]; then
  TARGET_REF="origin/master"
  DESC="master@$(git rev-parse --short origin/master)"
else
  TARGET_REF="$(git tag -l 'v*' --sort=-v:refname | head -n1)"
  if [ -z "$TARGET_REF" ]; then
    echo "$(date -Is) no release tags yet — nothing to deploy (channel: stable)."
    exit 0
  fi
  DESC="$TARGET_REF"
fi

CURRENT="$(git rev-parse HEAD)"
TARGET="$(git rev-parse "$TARGET_REF")"
if [ "$CURRENT" = "$TARGET" ]; then
  echo "$(date -Is) up to date ($DESC)."
  exit 0
fi

echo "$(date -Is) new version found → deploying $DESC"
git checkout --quiet --force "$TARGET_REF"
./deploy/_apply.sh
echo "$(date -Is) ✓ updated to $DESC"
