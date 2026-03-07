#!/bin/bash
# Start the gym-ai-trainer agent with opencode

# Change to script directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start opencode with the gym-ai-trainer agent
exec opencode --agent gym-ai-trainer
