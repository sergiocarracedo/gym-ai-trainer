#!/bin/bash
# Start the gym-ai-trainer agent with opencode

set -e

# Change to script directory
cd "$(dirname "$0")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if opencode is installed
if ! command -v opencode &> /dev/null; then
  echo -e "${YELLOW}OpenCode is not installed.${NC}"
  echo ""
  
  # Ask for installation scope
  echo "Where would you like to install OpenCode?"
  echo "  1) Global (recommended - available system-wide)"
  echo "  2) Local (only for this project)"
  echo ""
  read -p "Choose [1/2]: " scope_choice
  
  case $scope_choice in
    2)
      INSTALL_FLAG=""
      echo -e "${YELLOW}Installing locally...${NC}"
      ;;
    *)
      INSTALL_FLAG="-g"
      echo -e "${YELLOW}Installing globally...${NC}"
      ;;
  esac
  
  # Check if bun is available, otherwise use npm
  if command -v bun &> /dev/null; then
    echo "Using bun to install opencode-ai..."
    if [ "$INSTALL_FLAG" == "-g" ]; then
      bun add -g opencode-ai
    else
      bun add opencode-ai
    fi
  else
    echo "Using npm to install opencode-ai..."
    if [ "$INSTALL_FLAG" == "-g" ]; then
      npm install -g opencode-ai
    else
      npm install opencode-ai
    fi
  fi
  
  echo -e "${GREEN}OpenCode installed successfully!${NC}"
  echo ""
fi

# Check if node_modules exists (for project dependencies)
if [ ! -d "node_modules" ]; then
  echo "Installing project dependencies..."
  if command -v bun &> /dev/null; then
    bun install
  else
    npm install
  fi
fi

# Start opencode with the gym-ai-trainer agent
echo -e "${GREEN}Starting Gym AI Trainer...${NC}"
exec opencode --agent gym-ai-trainer
