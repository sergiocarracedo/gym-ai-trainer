FROM node:22-alpine

RUN apk add --no-cache python3 make g++ jq bash
RUN npm install -g opencode-ai remote-opencode

WORKDIR /app

COPY base/simple-bot.js /simple-bot.js
COPY base/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY agent/ /app/

ENTRYPOINT ["/entrypoint.sh"]
