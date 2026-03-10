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

# Generate remote-opencode config from environment variables
cat > ~/.remote-opencode/config.json << EOF
{
  "discordToken": "${DISCORD_TOKEN}",
  "clientId": "${DISCORD_CLIENT_ID}",
  "guildId": "${DISCORD_GUILD_ID}"
EOF

# Add allowed user IDs if provided
if [ -n "$DISCORD_ALLOWED_USER_IDS" ]; then
    # Convert comma-separated list to JSON array
    IFS=',' read -ra USER_IDS <<< "$DISCORD_ALLOWED_USER_IDS"
    JSON_ARRAY="["
    for i in "${!USER_IDS[@]}"; do
        if [ $i -gt 0 ]; then
            JSON_ARRAY+=","
        fi
        JSON_ARRAY+="\"${USER_IDS[$i]}\""
    done
    JSON_ARRAY+="]"
    echo ",\"allowedUserIds\":$JSON_ARRAY" >> ~/.remote-opencode/config.json
fi

# Add OpenAI API key if provided (for voice transcription)
if [ -n "$OPENAI_API_KEY" ]; then
    echo ",\"openaiApiKey\":\"${OPENAI_API_KEY}\"" >> ~/.remote-opencode/config.json
fi

# Close the JSON object
echo "}" >> ~/.remote-opencode/config.json

echo "Generated remote-opencode config"

# Create data.json with project path
cat > ~/.remote-opencode/data.json << EOF
{
  "projects": [
    { "alias": "gym-ai-trainer", "path": "/app" }
  ],
  "bindings": [],
  "threadSessions": [],
  "worktreeMappings": []
}
EOF

echo "Configured gym-ai-trainer project"

# Deploy slash commands to Discord
echo "Deploying slash commands to Discord..."
remote-opencode deploy

# Start the Discord bot
echo "Starting remote-opencode Discord bot..."
exec remote-opencode start
