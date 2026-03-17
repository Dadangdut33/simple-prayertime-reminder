#!/usr/bin/env bash
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────────────
BINARY_NAME="simple-prayertime-reminder"
INSTALL_DIR="$(go env GOPATH)/bin"
# ──────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log()     { echo -e "${CYAN}==>${RESET} ${BOLD}$*${RESET}"; }
success() { echo -e "${GREEN}✔${RESET}  $*"; }
fatal()   { echo -e "${RED}✖${RESET}  $*" >&2; exit 1; }

BINARY_PATH="${INSTALL_DIR}/${BINARY_NAME}"

log "Uninstalling ${BINARY_NAME}..."

if [ ! -f "$BINARY_PATH" ]; then
  fatal "Binary not found at ${BINARY_PATH}. Is it installed?"
fi

rm -f "$BINARY_PATH"
success "Removed ${BINARY_PATH}"

echo ""
echo -e "${GREEN}${BOLD}Uninstall complete!${RESET}"