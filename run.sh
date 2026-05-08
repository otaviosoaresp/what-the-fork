#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_DIR="$ROOT_DIR/release"

find_appimage() {
  if [[ -L "$RELEASE_DIR/what-the-fork.AppImage" ]]; then
    echo "$RELEASE_DIR/what-the-fork.AppImage"
    return
  fi
  ls -t "$RELEASE_DIR"/*.AppImage 2>/dev/null | head -n1
}

APPIMAGE="$(find_appimage || true)"

if [[ -z "${APPIMAGE:-}" ]]; then
  echo "[run] AppImage not found in $RELEASE_DIR — building first."
  "$ROOT_DIR/update.sh" --skip-pull
  APPIMAGE="$(find_appimage || true)"
fi

if [[ -z "${APPIMAGE:-}" ]]; then
  echo "[run] Build did not produce an AppImage. Aborting." >&2
  exit 1
fi

chmod +x "$APPIMAGE"

if "$APPIMAGE" "$@"; then
  exit 0
fi

echo "[run] Direct launch failed. Retrying with --appimage-extract-and-run (libfuse2 fallback)."
exec "$APPIMAGE" --appimage-extract-and-run "$@"
