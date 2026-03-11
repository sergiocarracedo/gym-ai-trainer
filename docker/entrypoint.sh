#!/bin/bash
set -e

# Validate required environment variables
required_vars=(
    "DISCORD_TOKEN"
    "DISCORD_CLIENT_ID"
    "DISCORD_GUILD_ID"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: Required environment variable $var is not set"
        exit 1
    fi
done

echo "All required environment variables are set"

# Create remote-opencode config directory
mkdir -p ~/.remote-opencode

# Build JSON config using node for proper formatting
# Note: remote-opencode expects config in { bot: { discordToken, clientId, guildId } } format
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

# Verify config was created
if [ ! -f ~/.remote-opencode/config.json ]; then
    echo "Error: Failed to generate config.json"
    exit 1
fi

echo "Config contents:"
cat ~/.remote-opencode/config.json

# Create data.json with project path and optional channel binding
node -e "
const fs = require('fs');
const data = {
  projects: [
    { alias: 'gym-ai-trainer', path: '/app' }
  ],
  bindings: [],
  threadSessions: [],
  worktreeMappings: []
};

// If DISCORD_CHANNEL_ID is provided, automatically bind it
if (process.env.DISCORD_CHANNEL_ID) {
  data.bindings.push({
    channelId: process.env.DISCORD_CHANNEL_ID,
    projectAlias: 'gym-ai-trainer'
  });
  console.log('Auto-binding channel ' + process.env.DISCORD_CHANNEL_ID + ' to gym-ai-trainer project');
}

fs.writeFileSync(process.env.HOME + '/.remote-opencode/data.json', JSON.stringify(data, null, 2));
"

echo "Configured gym-ai-trainer project"

# Start the Discord bot
echo "Starting remote-opencode Discord bot..."
exec remote-opencode start
