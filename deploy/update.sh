#!/usr/bin/env bash
# Auto-update: check GitHub for a newer version and redeploy if there is one.
# Runs on a timer (spectraforge-update.timer) AND on demand — the in-app
# "Check for updates" button drops deploy/state/update-requested.json, which a
# systemd .path unit (spectraforge-update-trigger.path) uses to fire this same
# service. Git stays the source of truth; no inbound ports or CI secrets needed.
#
# Channels via SF_UPDATE_CHANNEL:
#   stable (default) — deploy the latest release tag vX.Y.Z (you ship by tagging).
#   edge             — track origin/master (deploy every commit).
#
# NOTE: no `set -e` — we want to capture failures and record them to the status
# file so the Admin Console can show what happened.
set -uo pipefail
cd "$(dirname "$0")/.."   # repo root

STATE_DIR="$(pwd)/deploy/state"
STATUS_FILE="$STATE_DIR/last-update.json"
REQUEST_FILE="$STATE_DIR/update-requested.json"
mkdir -p "$STATE_DIR"

CHANNEL="${SF_UPDATE_CHANNEL:-stable}"

# A manual request (from the app) forces a rebuild even when already current.
TRIGGER="timer"
FORCE="0"
if [ -f "$REQUEST_FILE" ]; then
  TRIGGER="manual"
  grep -q '"force"[[:space:]]*:[[:space:]]*true' "$REQUEST_FILE" 2>/dev/null && FORCE="1"
  rm -f "$REQUEST_FILE"
fi

FROM_VERSION="$(git describe --tags --always 2>/dev/null || echo unknown)"

write_status() { # status  message  [toVersion]
  local status="$1" message="$2" to="${3:-$FROM_VERSION}"
  message="${message//\\/\\\\}"; message="${message//\"/\\\"}"; message="${message//$'\n'/ }"
  cat > "$STATUS_FILE" <<EOF
{
  "finishedAt": "$(date -Is)",
  "status": "$status",
  "trigger": "$TRIGGER",
  "channel": "$CHANNEL",
  "fromVersion": "$FROM_VERSION",
  "toVersion": "$to",
  "message": "$message"
}
EOF
  chmod 666 "$STATUS_FILE" 2>/dev/null || true
}

fail() { write_status "error" "$1"; echo "$(date -Is) ✗ $1" >&2; exit 1; }

git fetch --tags --prune --quiet origin || fail "git fetch failed — check network/credentials."

if [ "$CHANNEL" = "edge" ]; then
  TARGET_REF="origin/master"
else
  TARGET_REF="$(git tag -l 'v*' --sort=-v:refname | head -n1)"
  if [ -z "$TARGET_REF" ]; then
    write_status "up-to-date" "No release tags yet — nothing to deploy."
    echo "$(date -Is) no release tags yet (channel: stable)."
    exit 0
  fi
fi

CURRENT="$(git rev-parse HEAD)"
TARGET="$(git rev-parse "$TARGET_REF")"
TO_VERSION="$(git describe --tags "$TARGET_REF" 2>/dev/null || echo "$TARGET_REF")"

if [ "$CURRENT" = "$TARGET" ] && [ "$FORCE" != "1" ]; then
  write_status "up-to-date" "Already on $TO_VERSION." "$TO_VERSION"
  echo "$(date -Is) up to date ($TO_VERSION)."
  exit 0
fi

echo "$(date -Is) deploying $TO_VERSION (force=$FORCE, trigger=$TRIGGER)…"
git checkout --quiet --force "$TARGET_REF" || fail "git checkout of $TO_VERSION failed."
if ./deploy/_apply.sh; then
  write_status "updated" "Deployed $TO_VERSION." "$TO_VERSION"
  echo "$(date -Is) ✓ updated to $TO_VERSION"
else
  fail "Build/apply failed for $TO_VERSION — see journalctl."
fi
