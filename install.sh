#!/usr/bin/env bash
# hyprnotes installer
#   curl -sL https://raw.githubusercontent.com/CNVCTION/hyprnotes/master/install.sh | bash
set -euo pipefail

BOLD='\033[1m'
CYAN='\033[36m'
GREEN='\033[32m'
RED='\033[31m'
DIM='\033[2m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}✎ hyprnotes${RESET} installer"
echo -e "${DIM}Dead-simple CLI notepad${RESET}"
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
  echo -e "${RED}Error: Node.js is required but not installed.${RESET}"
  echo -e "${DIM}Install Node.js: https://nodejs.org/${RESET}"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}Error: Node.js 18+ required (found $(node -v))${RESET}"
  exit 1
fi

echo -e "${DIM}Node.js $(node -v) detected${RESET}"

# Install globally — try npm registry first, then GitHub release tarball
echo -e "${CYAN}Installing hyprnotes...${RESET}"

if npm install -g hyprnotes 2>/dev/null; then
  echo -e "${DIM}Installed from npm registry${RESET}"
else
  echo -e "${DIM}Installing from GitHub release...${RESET}"
  npm install -g "https://github.com/cnvction/hyprnotes/tarball/v1.0.1" 2>/dev/null || {
    echo -e "${RED}Installation failed.${RESET}"
    echo -e "  ${DIM}npm i -g hyprnotes${RESET}"
    echo -e "  ${DIM}# or from source:${RESET}"
    echo -e "  ${DIM}git clone https://github.com/cnvction/hyprnotes.git${RESET}"
    echo -e "  ${DIM}cd hyprnotes && npm install && npm run build && npm link${RESET}"
    exit 1
  }
fi

# Create ~/notes directory
mkdir -p ~/notes

echo ""
echo -e "${GREEN}✓ Installed!${RESET} Run ${BOLD}hyprnotes${RESET} to start."
echo -e "${DIM}Notes are stored in ~/notes/${RESET}"
echo ""
echo -e "${DIM}Also available via: brew install cnvction/hyprnotes/hyprnotes${RESET}"
echo ""
