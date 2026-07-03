#!/usr/bin/env bash
# Cut a release from your Mac: bump package.json version, commit, tag, push.
# The homelab's auto-update timer (stable channel) deploys the new tag within
# minutes. See SETUP_HOMELAB.md → Auto-update.
#
#   ./scripts/release.sh 0.2.0
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

VERSION="${1:?usage: scripts/release.sh <version>   e.g. 0.2.0}"
VERSION="${VERSION#v}"
TAG="v${VERSION}"

# Must be on master with a clean tree.
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "master" ] || { echo "✗ On '$BRANCH' — switch to master first."; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "✗ Working tree not clean — commit or stash first."; exit 1; }
git rev-parse "$TAG" >/dev/null 2>&1 && { echo "✗ Tag $TAG already exists."; exit 1; }

echo "→ Bumping version to $VERSION…"
npm version "$VERSION" --no-git-tag-version >/dev/null
git add package.json package-lock.json
git commit -q -m "Release $TAG"
git tag -a "$TAG" -m "Release $TAG"

echo "→ Pushing master + $TAG…"
git push -q origin master
git push -q origin "$TAG"

echo "✓ Released $TAG. The homelab will auto-deploy it on its next update check (≤10 min)."
