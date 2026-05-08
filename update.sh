#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

SKIP_PULL=0
for arg in "$@"; do
  case "$arg" in
    --skip-pull) SKIP_PULL=1 ;;
    *) echo "[update] Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

if [[ "$SKIP_PULL" -eq 0 ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "[update] Working tree has local changes. Commit/stash before updating." >&2
    git status --short
    exit 1
  fi
  echo "[update] Pulling latest from origin."
  git pull --ff-only
fi

LOCK_HASH_FILE="node_modules/.update-lock-hash"
CURRENT_LOCK_HASH="$(sha256sum package-lock.json | awk '{print $1}')"
PREVIOUS_LOCK_HASH=""
[[ -f "$LOCK_HASH_FILE" ]] && PREVIOUS_LOCK_HASH="$(cat "$LOCK_HASH_FILE")"

if [[ ! -d node_modules ]] || [[ "$CURRENT_LOCK_HASH" != "$PREVIOUS_LOCK_HASH" ]]; then
  echo "[update] Installing dependencies (npm ci)."
  npm ci
  mkdir -p node_modules
  echo "$CURRENT_LOCK_HASH" > "$LOCK_HASH_FILE"
else
  echo "[update] Dependencies up to date."
fi

echo "[update] Building AppImage."
rm -f release/*.AppImage 2>/dev/null || true
npm run build:appimage

NEW_APPIMAGE="$(ls -t release/*.AppImage 2>/dev/null | head -n1 || true)"
if [[ -z "$NEW_APPIMAGE" ]]; then
  echo "[update] Build finished but no AppImage produced." >&2
  exit 1
fi

chmod +x "$NEW_APPIMAGE"

STABLE_LINK="release/what-the-fork.AppImage"
ln -sfn "$(basename "$NEW_APPIMAGE")" "$STABLE_LINK"

echo "[update] Done. AppImage: $NEW_APPIMAGE"
echo "[update] Stable symlink: $STABLE_LINK -> $(readlink "$STABLE_LINK")"
