#!/bin/bash
set -e

# Validate required environment variables
required_vars=(
    "DISCORD_TOKEN"
    "DISCORD_CLIENT_ID"
    "DISCORD_GUILD_ID"
    "DISCORD_CHANNEL_ID"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: Required environment variable $var is not set"
        exit 1
    fi
done

echo "All required environment variables are set"

# Create remote-opencode config directory (for compatibility)
mkdir -p ~/.remote-opencode

# Build JSON config
node -e "
const fs = require('fs');
const config = {
  bot: {
    discordToken: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID
  }
};

if (process.env.DISCORD_ALLOWED_USER_IDS) {
  config.allowedUserIds = process.env.DISCORD_ALLOWED_USER_IDS.split(',').map(s => s.trim());
}

if (process.env.OPENAI_API_KEY) {
  config.openaiApiKey = process.env.OPENAI_API_KEY;
}

fs.writeFileSync(process.env.HOME + '/.remote-opencode/config.json', JSON.stringify(config, null, 2));
console.log('Generated config.json');
"

echo "Config contents:"
cat ~/.remote-opencode/config.json

# Install discord.js for simple bot
echo "Installing discord.js..."
cd /tmp && npm install discord.js

# Start the simple bot
echo "Starting simple Discord bot (no threads, direct message passthrough)..."
exec node /docker/simple-bot.js
