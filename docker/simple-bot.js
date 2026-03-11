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

let currentSessionID = null;

async function getConfig() {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${OPENCODE_PORT}/config`, (res) => {
        let responseData = "";
        res.on("data", (chunk) => (responseData += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(responseData));
            } catch (e) {
              reject(new Error(`Failed to parse config: ${e.message}`));
            }
          } else {
            reject(new Error(`Failed to get config: ${res.statusCode}`));
          }
        });
      })
      .on("error", reject);
  });
}

async function ensureSession() {
  if (currentSessionID) return currentSessionID;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "127.0.0.1",
      port: OPENCODE_PORT,
      path: "/session",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
            currentSessionID = parsed.id;
            console.log(`[OpenCode] Created session: ${currentSessionID}`);
            resolve(currentSessionID);
          } catch (e) {
            reject(new Error(`Failed to parse session response: ${e.message}`));
          }
        } else {
          reject(new Error(`Failed to create session: ${res.statusCode}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(JSON.stringify({}));
    req.end();
  });
}

function resetSession() {
  const oldSession = currentSessionID;
  currentSessionID = null;
  console.log(`[OpenCode] Session reset (was: ${oldSession})`);
  return oldSession;
}

async function sendToOpenCode(prompt) {
  return new Promise((resolve, reject) => {
    ensureSession()
      .then((sessionID) => {
        const data = JSON.stringify({
          parts: [{ type: "text", text: prompt }],
        });

        const options = {
          hostname: "127.0.0.1",
          port: OPENCODE_PORT,
          path: `/session/${sessionID}/message`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data),
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
                const thinking = parsed.parts
                  .filter((p) => p.type === "thinking")
                  .map((p) => p.text || p.thinking || "")
                  .join("\n\n");
                const text = parsed.parts
                  .filter((p) => p.type === "text")
                  .map((p) => p.text)
                  .join("\n\n");
                resolve({ thinking, text: text || "No response" });
              } catch {
                resolve({ thinking: "", text: responseData });
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
      })
      .catch((error) => {
        reject(error);
      });
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
    // Handle commands
    if (prompt.startsWith("/")) {
      const [command] = prompt.slice(1).split(/\s+/);

      switch (command.toLowerCase()) {
        case "info":
        case "status": {
          await message.react("📊");
          const config = await getConfig();
          const info = [
            "**OpenCode Status**",
            `• Session: \`${currentSessionID || "none"}\``,
            `• Agent: \`${config.agent || "gym-ai-trainer"}\``,
            `• Model: \`${config.model || "unknown"}\``,
            `• Provider: \`${config.provider || "unknown"}\``,
          ].join("\n");
          await message.reply(info);
          return;
        }

        case "reset": {
          await message.react("🔄");
          const oldSession = resetSession();
          await message.reply(
            `✅ Session reset (was: \`${oldSession || "none"}\`). New session will be created on next message.`,
          );
          return;
        }

        case "help": {
          await message.react("❓");
          const help = [
            "**Available Commands**",
            "`/info` or `/status` - Show current session and config",
            "`/reset` - Reset the current session",
            "`/help` - Show this help message",
            "",
            "Any other message is sent directly to the AI agent.",
          ].join("\n");
          await message.reply(help);
          return;
        }

        default:
          // Unknown command - send as regular message to agent
          break;
      }
    }

    // Start typing indicator (expires after 10s, so repeat every 8s)
    const typingInterval = setInterval(() => {
      message.channel.sendTyping().catch(() => {});
    }, 8000);
    message.channel.sendTyping().catch(() => {});

    console.log(`[${message.author.tag}] ${prompt}`);

    // Send to OpenCode API
    const { thinking, text } = await sendToOpenCode(prompt);

    // Stop typing indicator
    clearInterval(typingInterval);

    console.log(`[Bot] Received ${text.length} chars text, ${thinking.length} chars thinking`);

    // Create thread for thinking if present
    if (thinking && thinking.trim()) {
      try {
        const thread = await message.startThread({
          name: `💭 Thinking`,
          autoArchiveDuration: 60,
        });
        const thinkingChunks = thinking.match(/[\s\S]{1,1900}/g) || [thinking];
        for (const chunk of thinkingChunks) {
          await thread.send(`**Thinking:**\n${chunk}`);
        }
      } catch (e) {
        console.error("Failed to create thinking thread:", e.message);
      }
    }

    // Send main response (split if too long)
    const chunks = text.match(/[\s\S]{1,1900}/g) || ["No output"];
    for (const chunk of chunks) {
      await message.reply(chunk);
    }
  } catch (error) {
    console.error("Error processing message:", error);
    await message.reply(`❌ Error: ${error.message}`);
  }
});

client.login(config.bot.discordToken);
