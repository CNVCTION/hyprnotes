#!/usr/bin/env bash
# notes-cli installer — curl -sL notescli.sh | bash
set -euo pipefail

BOLD='\033[1m'
CYAN='\033[36m'
GREEN='\033[32m'
RED='\033[31m'
DIM='\033[2m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}✎ notes-cli${RESET} installer"
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

# Install globally
echo -e "${CYAN}Installing notes-cli...${RESET}"
npm install -g notes-cli 2>/dev/null || {
  echo -e "${DIM}Package not on npm yet, installing from GitHub...${RESET}"
  npm install -g "https://github.com/cnvction/notes-cli/tarball/main" 2>/dev/null || {
    echo -e "${RED}Installation failed. Install manually:${RESET}"
    echo -e "  ${DIM}npm i -g notes-cli${RESET}"
    echo -e "  ${DIM}# or from source:${RESET}"
    echo -e "  ${DIM}git clone https://github.com/cnvction/notes-cli.git${RESET}"
    echo -e "  ${DIM}cd notes-cli && npm install && npm run build && npm link${RESET}"
    exit 1
  }
}

# Create ~/notes directory
mkdir -p ~/notes

echo ""
echo -e "${GREEN}✓ Installed!${RESET} Run ${BOLD}notes${RESET} to start."
echo -e "${DIM}Notes are stored in ~/notes/${RESET}"
echo ""