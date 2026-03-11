#!/usr/bin/env node
/**
 * Simple Discord bot that forwards all messages in a channel to OpenCode
 * No threads, no slash commands - just direct message passthrough
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

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
});

function startOpenCode(prompt) {
  return new Promise((resolve, reject) => {
    const proc = spawn("opencode", ["--agent", "gym-ai-trainer"], {
      cwd: PROJECT_PATH,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`OpenCode exited with code ${code}: ${errorOutput}`));
      }
    });

    // Send the prompt
    proc.stdin.write(prompt + "\n");
    proc.stdin.end();
  });
}

client.once("ready", () => {
  console.log(`✓ Simple bot ready! Logged in as ${client.user.tag}`);
  console.log(`✓ Listening to channel ${CHANNEL_ID}`);
  console.log(`✓ Project path: ${PROJECT_PATH}`);
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

    // Run OpenCode with the prompt
    const response = await startOpenCode(prompt);

    // Remove processing reaction
    await message.reactions.cache.get("⏳")?.users.remove(client.user.id);

    // Send response (split if too long)
    const chunks = response.match(/[\s\S]{1,1900}/g) || ["No output"];
    for (const chunk of chunks) {
      await message.reply(chunk);
    }

    console.log(`[Bot] Responded with ${response.length} chars`);
  } catch (error) {
    console.error("Error processing message:", error);
    await message.reactions.cache.get("⏳")?.users.remove(client.user.id);
    await message.reply(`❌ Error: ${error.message}`);
  }
});

client.login(config.bot.discordToken);
