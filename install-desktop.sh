#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ID="what-the-fork"
APP_NAME="What the Fork"

APPIMAGE_LINK="$ROOT_DIR/release/${APP_ID}.AppImage"
ICON_SOURCE="$ROOT_DIR/build/icon.png"

if [[ ! -e "$APPIMAGE_LINK" ]]; then
  echo "[install-desktop] AppImage not found at $APPIMAGE_LINK. Run ./update.sh first." >&2
  exit 1
fi

if [[ ! -f "$ICON_SOURCE" ]]; then
  echo "[install-desktop] Icon not found at $ICON_SOURCE." >&2
  exit 1
fi

DESKTOP_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
ICON_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/512x512/apps"

mkdir -p "$DESKTOP_DIR" "$ICON_DIR"

ICON_DEST="$ICON_DIR/${APP_ID}.png"
cp -f "$ICON_SOURCE" "$ICON_DEST"

DESKTOP_FILE="$DESKTOP_DIR/${APP_ID}.desktop"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=$APP_NAME
Comment=Git desktop client for diff visualization
Exec="$APPIMAGE_LINK" %U
Icon=$APP_ID
Terminal=false
Categories=Development;RevisionControl;
StartupWMClass=What the Fork
EOF

chmod +x "$DESKTOP_FILE"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true
fi

if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t "${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor" >/dev/null 2>&1 || true
fi

echo "[install-desktop] Installed."
echo "  Desktop entry: $DESKTOP_FILE"
echo "  Icon:          $ICON_DEST"
echo "  Exec target:   $APPIMAGE_LINK"
