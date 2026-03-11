FROM node:22

# Install OpenCode and remote-opencode
RUN npm install -g opencode-ai remote-opencode

# Set working directory
WORKDIR /app

# Copy agent files
COPY agent/ .

# Copy Docker scripts
COPY docker/entrypoint.sh /entrypoint.sh
COPY docker/simple-bot.js /simple-bot.js
RUN chmod +x /entrypoint.sh

# Run entrypoint
ENTRYPOINT ["/entrypoint.sh"]
