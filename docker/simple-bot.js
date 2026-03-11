#!/usr/bin/env node
/**
 * Simple Discord bot that forwards all messages in a channel to OpenCode
 * No threads, no slash commands - just direct message passthrough
 * Uses OpenCode server mode with HTTP API
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

// Try to require discord.js from remote-opencode's node_modules
let Client, GatewayIntentBits;
try {
  const discordPath = require.resolve("discord.js", {
    paths: ["/usr/local/lib/node_modules/remote-opencode/node_modules"],
  });
  const discord = require(discordPath);
  Client = discord.Client;
  GatewayIntentBits = discord.GatewayIntentBits;
} catch (e) {
  console.error("Failed to load discord.js:", e.message);
  console.error("Trying global install...");
  const discord = require("discord.js");
  Client = discord.Client;
  GatewayIntentBits = discord.GatewayIntentBits;
}

const configPath = path.join(process.env.HOME, ".remote-opencode", "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const PROJECT_PATH = "/app";
const OPENCODE_PORT = 3000;

if (!CHANNEL_ID) {
  console.error("Error: DISCORD_CHANNEL_ID environment variable not set");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [],
});

// Start OpenCode server
console.log("Starting OpenCode server...");
const opencodeServer = spawn("opencode", ["serve", "--port", OPENCODE_PORT.toString()], {
  cwd: PROJECT_PATH,
  env: { ...process.env, OPENCODE_AGENT: "gym-ai-trainer" },
  stdio: ["ignore", "pipe", "pipe"],
});

opencodeServer.stdout.on("data", (data) => {
  console.log(`[OpenCode] ${data.toString().trim()}`);
});

opencodeServer.stderr.on("data", (data) => {
  console.error(`[OpenCode Error] ${data.toString().trim()}`);
});

opencodeServer.on("close", (code) => {
  console.error(`OpenCode server exited with code ${code}`);
  process.exit(1);
});

// Wait for server to be ready
function waitForServer(retries = 30) {
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(`http://127.0.0.1:${OPENCODE_PORT}/health`, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            if (retries > 0) {
              setTimeout(() => check(), 1000);
              retries--;
            } else {
              reject(new Error("OpenCode server did not become ready"));
            }
          }
        })
        .on("error", () => {
          if (retries > 0) {
            setTimeout(() => check(), 1000);
            retries--;
          } else {
            reject(new Error("OpenCode server did not become ready"));
          }
        });
    };
    check();
  });
}

function sendToOpenCode(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message: prompt });

    const options = {
      hostname: "127.0.0.1",
      port: OPENCODE_PORT,
      path: "/api/chat",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    const req = http.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(responseData);
            resolve(parsed.response || responseData);
          } catch {
            resolve(responseData);
          }
        } else {
          reject(new Error(`OpenCode API returned status ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

client.once("ready", async () => {
  console.log(`✓ Simple bot ready! Logged in as ${client.user.tag}`);
  console.log(`✓ Listening to channel ${CHANNEL_ID}`);
  console.log(`✓ Project path: ${PROJECT_PATH}`);
  console.log(`✓ Guild count: ${client.guilds.cache.size}`);

  // Wait for OpenCode server
  try {
    console.log("Waiting for OpenCode server to be ready...");
    await waitForServer();
    console.log("✓ OpenCode server ready!");
  } catch (error) {
    console.error("✗ OpenCode server failed to start:", error.message);
    process.exit(1);
  }

  // Try to fetch the channel
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    console.log(`✓ Channel found: #${channel.name} (type: ${channel.type})`);
  } catch (error) {
    console.error(`✗ Failed to fetch channel ${CHANNEL_ID}:`, error.message);
  }
});

client.on("error", (error) => {
  console.error("Discord client error:", error);
});

client.on("messageCreate", async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Only respond in the configured channel
  if (message.channelId !== CHANNEL_ID) return;

  // Check authorization if configured
  const allowedUserIds = config.allowedUserIds || [];
  if (allowedUserIds.length > 0 && !allowedUserIds.includes(message.author.id)) {
    await message.reply("❌ You are not authorized to use this bot.");
    return;
  }

  const prompt = message.content.trim();
  if (!prompt) return;

  try {
    // React to show we're processing
    await message.react("⏳");

    console.log(`[${message.author.tag}] ${prompt}`);

    // Send to OpenCode API
    const response = await sendToOpenCode(prompt);

    console.log(`[Bot] Received ${response.length} chars`);

    // Remove processing reaction
    await message.reactions.cache.get("⏳")?.users.remove(client.user.id);

    // Send response (split if too long)
    const chunks = response.match(/[\s\S]{1,1900}/g) || ["No output"];
    for (const chunk of chunks) {
      await message.reply(chunk);
    }
  } catch (error) {
    console.error("Error processing message:", error);
    await message.reactions.cache.get("⏳")?.users.remove(client.user.id);
    await message.reply(`❌ Error: ${error.message}`);
  }
});

client.login(config.bot.discordToken);
