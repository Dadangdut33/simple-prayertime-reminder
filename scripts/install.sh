#!/usr/bin/env bash
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────────────────────
REPO="dadangdut33/simple-prayertime-reminder"
FRONTEND_DIR="frontend"
BINARY_NAME="simple-prayertime-reminder"
INSTALL_DIR="$(go env GOPATH)/bin"
TMP_DIR="$(mktemp -d)"
# ──────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log()     { echo -e "${CYAN}==>${RESET} ${BOLD}$*${RESET}"; }
success() { echo -e "${GREEN}✔${RESET}  $*"; }
fatal()   { echo -e "${RED}✖${RESET}  $*" >&2; rm -rf "$TMP_DIR"; exit 1; }

trap 'rm -rf "$TMP_DIR"' EXIT

# ─── Dependency checks ────────────────────────────────────────────────────────
log "Checking dependencies..."

command -v go   >/dev/null 2>&1 || fatal "go is not installed. Visit https://go.dev/dl/"
command -v pnpm >/dev/null 2>&1 || fatal "pnpm is not installed. Visit https://pnpm.io/installation"
command -v git  >/dev/null 2>&1 || fatal "git is not installed."

GO_VERSION=$(go version | grep -oP 'go\K[0-9]+\.[0-9]+')
REQUIRED="1.21"
if [ "$(printf '%s\n' "$REQUIRED" "$GO_VERSION" | sort -V | head -n1)" != "$REQUIRED" ]; then
  fatal "Go $REQUIRED+ required, found $GO_VERSION"
fi

success "Dependencies OK"

# ─── Clone repo ───────────────────────────────────────────────────────────────
log "Cloning repository..."
git clone --depth=1 "https://github.com/${REPO}.git" "$TMP_DIR"
success "Repository cloned"

# ─── Build frontend ───────────────────────────────────────────────────────────
log "Installing frontend dependencies..."
(cd "$TMP_DIR/$FRONTEND_DIR" && pnpm install --frozen-lockfile)
success "Frontend dependencies installed"

log "Building frontend..."
(cd "$TMP_DIR/$FRONTEND_DIR" && pnpm run build)
success "Frontend built"

# ─── Install Go binary ────────────────────────────────────────────────────────
log "Installing Go binary..."
(cd "$TMP_DIR" && go install .)
success "Binary installed to ${INSTALL_DIR}/${BINARY_NAME}"

# ─── PATH check ───────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Installation complete!${RESET}"

if [[ ":$PATH:" != *":${INSTALL_DIR}:"* ]]; then
  echo -e "${RED}Warning:${RESET} ${INSTALL_DIR} is not in your PATH."
  echo -e "Add this to your shell profile (e.g. ~/.bashrc or ~/.zshrc):"
  echo -e "  ${CYAN}export PATH=\"\$PATH:${INSTALL_DIR}\"${RESET}"
else
  echo -e "Run: ${BOLD}${BINARY_NAME}${RESET}"
fi