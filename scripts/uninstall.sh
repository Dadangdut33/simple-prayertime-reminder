#!/usr/bin/env bash
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────────────
BINARY_NAME="simple-prayertime-reminder"
INSTALL_DIR="$(go env GOPATH)/bin"
OS_NAME="$(uname -s | tr '[:upper:]' '[:lower:]')"
# ──────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log()     { echo -e "${CYAN}==>${RESET} ${BOLD}$*${RESET}"; }
success() { echo -e "${GREEN}✔${RESET}  $*"; }
fatal()   { echo -e "${RED}✖${RESET}  $*" >&2; exit 1; }

log "Uninstalling ${BINARY_NAME}..."

REMOVED=0

# ─── macOS app bundle ─────────────────────────────────────────────────────────
if [[ "$OS_NAME" == "darwin" ]]; then
  APP_BUNDLE="$HOME/Applications/${BINARY_NAME}.app"
  if [[ -d "$APP_BUNDLE" ]]; then
    rm -rf "$APP_BUNDLE"
    success "Removed app bundle: ${APP_BUNDLE}"
    REMOVED=1
  else
    log "App bundle not found at ${APP_BUNDLE}, skipping."
  fi
fi

# ─── Binary ───────────────────────────────────────────────────────────────────
BINARY_PATH="${INSTALL_DIR}/${BINARY_NAME}"
if [[ -f "$BINARY_PATH" ]]; then
  rm -f "$BINARY_PATH"
  success "Removed binary: ${BINARY_PATH}"
  REMOVED=1
else
  log "Binary not found at ${BINARY_PATH}, skipping."
fi

# ─── Linux desktop entry & icon ───────────────────────────────────────────────
if [[ "$OS_NAME" == "linux" ]]; then
  DESKTOP_FILE="$HOME/.local/share/applications/${BINARY_NAME}.desktop"
  ICON_PATH="$HOME/.local/share/icons/${BINARY_NAME}.png"

  if [[ -f "$DESKTOP_FILE" ]]; then
    rm -f "$DESKTOP_FILE"
    success "Removed desktop entry: ${DESKTOP_FILE}"
    REMOVED=1
  else
    log "Desktop entry not found at ${DESKTOP_FILE}, skipping."
  fi

  if [[ -f "$ICON_PATH" ]]; then
    rm -f "$ICON_PATH"
    success "Removed icon: ${ICON_PATH}"
    REMOVED=1
  else
    log "Icon not found at ${ICON_PATH}, skipping."
  fi

  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true
  fi
fi

# ─── Nothing found ────────────────────────────────────────────────────────────
if [[ "$REMOVED" -eq 0 ]]; then
  fatal "Nothing to uninstall — no files were found."
fi

echo ""
echo -e "${GREEN}${BOLD}Uninstall complete!${RESET}"