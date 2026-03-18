#!/usr/bin/env bash
set -euo pipefail

# Config
REPO="dadangdut33/simple-prayertime-reminder"
FRONTEND_DIR="frontend"
BINARY_NAME="simple-prayertime-reminder"
INSTALL_DIR="$(go env GOPATH)/bin"
TMP_DIR="$(mktemp -d)"
OS_NAME="$(uname -s | tr '[:upper:]' '[:lower:]')"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log()     { echo -e "${CYAN}==>${RESET} ${BOLD}$*${RESET}"; }
success() { echo -e "${GREEN}✔${RESET}  $*"; }
fatal()   { echo -e "${RED}✖${RESET}  $*" >&2; rm -rf "$TMP_DIR"; exit 1; }

trap 'rm -rf "$TMP_DIR"' EXIT

# ─── Dependency checks ───
log "Checking dependencies..."

command -v go   >/dev/null 2>&1 || fatal "go is not installed. Visit https://go.dev/dl/"
command -v pnpm >/dev/null 2>&1 || fatal "pnpm is not installed. Visit https://pnpm.io/installation"
command -v git  >/dev/null 2>&1 || fatal "git is not installed."
command -v wails3 >/dev/null 2>&1 || {
  log "Installing wails3..."
  go install github.com/wailsapp/wails/v3/cmd/wails3@latest
  export PATH="$(go env GOPATH)/bin:$PATH"
}

GO_VERSION=$(go version | grep -oP 'go\K[0-9]+\.[0-9]+')
REQUIRED="1.21"
if [ "$(printf '%s\n' "$REQUIRED" "$GO_VERSION" | sort -V | head -n1)" != "$REQUIRED" ]; then
  fatal "Go $REQUIRED+ required, found $GO_VERSION"
fi

success "Dependencies OK"

# ─── Clone repo ───
log "Cloning repository..."
git clone --depth=1 "https://github.com/${REPO}.git" "$TMP_DIR"
success "Repository cloned"

# ─── Read version ───
APP_VERSION="$(awk 'BEGIN{ininfo=0} /^info:/{ininfo=1;next} /^[^[:space:]]/{if($0!~/^info:/)ininfo=0} ininfo && $1=="version:"{gsub(/"/,"",$2);print $2;exit}' "$TMP_DIR/build/config.yml")"
if [[ -z "${APP_VERSION:-}" ]]; then
  APP_VERSION="unknown"
fi

# ─── Build frontend ───
log "Installing frontend dependencies..."
(cd "$TMP_DIR/$FRONTEND_DIR" && pnpm install --frozen-lockfile)
success "Frontend dependencies installed"

log "Building frontend..."
(cd "$TMP_DIR/$FRONTEND_DIR" && pnpm run build)
success "Frontend built"

# ─── Install Go binary ───
log "Building app..."
(cd "$TMP_DIR" && CGO_ENABLED=1 wails3 build -tags production)

BIN_PATH="$TMP_DIR/bin/$BINARY_NAME"
APP_BUNDLE_PATH="$TMP_DIR/bin/$BINARY_NAME.app"

if [[ "$OS_NAME" == "darwin" && -d "$APP_BUNDLE_PATH" ]]; then
  MAC_APP_DIR="$HOME/Applications"
  log "Installing macOS app bundle..."
  mkdir -p "$MAC_APP_DIR"
  rm -rf "$MAC_APP_DIR/$BINARY_NAME.app"
  cp -R "$APP_BUNDLE_PATH" "$MAC_APP_DIR/$BINARY_NAME.app"
  success "App ${APP_VERSION} installed to ${MAC_APP_DIR}/${BINARY_NAME}.app"
else
  if [[ ! -f "$BIN_PATH" ]]; then
    fatal "Build output not found at $BIN_PATH"
  fi

  log "Installing binary..."
  mkdir -p "$INSTALL_DIR"
  rm -f "$INSTALL_DIR/$BINARY_NAME"
  install -m 755 "$BIN_PATH" "$INSTALL_DIR/$BINARY_NAME"
  success "Binary ${APP_VERSION} installed to ${INSTALL_DIR}/${BINARY_NAME}"
fi

# ─── Linux desktop entry ───
if [[ "$OS_NAME" == "linux" ]]; then
  DESKTOP_DIR="$HOME/.local/share/applications"
  ICON_DIR="$HOME/.local/share/icons"
  DESKTOP_FILE="$DESKTOP_DIR/${BINARY_NAME}.desktop"
  ICON_PATH="$ICON_DIR/${BINARY_NAME}.png"

  log "Creating desktop entry..."
  mkdir -p "$DESKTOP_DIR" "$ICON_DIR"
  rm -f "$DESKTOP_FILE" "$ICON_PATH"
  if [[ -f "$TMP_DIR/assets/icon.png" ]]; then
    install -m 644 "$TMP_DIR/assets/icon.png" "$ICON_PATH"
  fi
  cat >"$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Simple PrayerTime Reminder (${APP_VERSION})
Comment=A simple, Muslim companion app.
Exec=${INSTALL_DIR}/${BINARY_NAME}
Icon=${ICON_PATH}
Terminal=false
Categories=Utility;Office;
StartupWMClass=Simple PrayerTime Reminder
EOF
  chmod 644 "$DESKTOP_FILE"
  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true
  fi
  success "Desktop entry created at ${DESKTOP_FILE}"
fi

# ─── PATH check ───
echo ""
echo -e "${GREEN}${BOLD}Installation complete!${RESET}"

if [[ ":$PATH:" != *":${INSTALL_DIR}:"* ]]; then
  echo -e "${RED}Warning:${RESET} ${INSTALL_DIR} is not in your PATH."
  echo -e "Add this to your shell profile (e.g. ~/.bashrc or ~/.zshrc):"
  echo -e "  ${CYAN}export PATH=\"\$PATH:${INSTALL_DIR}\"${RESET}"
else
  if [[ "$OS_NAME" == "darwin" ]]; then
    echo -e "Open: ${BOLD}open \"$HOME/Applications/${BINARY_NAME}.app\"${RESET}"
  else
    echo -e "Run: ${BOLD}${BINARY_NAME}${RESET}"
  fi
fi
