import type { Plugin } from "@opencode-ai/plugin";
import { readFile, appendFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

interface BufferedMessage {
  role: "user" | "assistant";
  timestamp: number;
  texts: Map<string, string>;
  tools: Map<
    string,
    {
      tool: string;
      input: Record<string, unknown>;
      status: string;
      error?: string;
    }
  >;
  errors: string[];
}

function formatTimestamp(epoch: number): string {
  const date = new Date(epoch);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatToolSummary(toolName: string, input: Record<string, unknown>): string {
  const mainArgKeys = ["command", "filePath", "pattern"];
  const mainArg = mainArgKeys.map((key) => input[key]).find((val) => val !== undefined);
  const otherArgs = Object.entries(input)
    .filter(([key]) => !mainArgKeys.includes(key))
    .map(([key, val]) => {
      const strVal = typeof val === "string" ? val : JSON.stringify(val);
      const truncated = strVal.length > 60 ? `${strVal.slice(0, 57)}...` : strVal;
      return `--${key}=${truncated}`;
    })
    .join(" ");

  const mainStr = typeof mainArg === "string" ? mainArg : JSON.stringify(mainArg ?? "");
  const truncatedMain = mainStr.length > 80 ? `${mainStr.slice(0, 77)}...` : mainStr;

  const parts = [`> [tool] ${toolName}`];
  if (truncatedMain && truncatedMain !== '""') {
    parts.push(truncatedMain);
  }
  if (otherArgs) {
    parts.push(otherArgs);
  }
  return parts.join(" ");
}

function formatMessage(msg: BufferedMessage): string {
  const roleLabel = msg.role === "user" ? "User" : "Trainer";
  const time = formatTimestamp(msg.timestamp);
  const lines: string[] = [`### ${roleLabel} (${time})`];

  const textContent = Array.from(msg.texts.values())
    .filter((t) => t.trim().length > 0)
    .join("\n\n");

  if (textContent) {
    lines.push(textContent);
  }

  for (const [, toolInfo] of msg.tools) {
    const summary = formatToolSummary(toolInfo.tool, toolInfo.input);
    lines.push(summary);
    if (toolInfo.status === "error" && toolInfo.error) {
      const truncatedError =
        toolInfo.error.length > 200 ? `${toolInfo.error.slice(0, 197)}...` : toolInfo.error;
      lines.push(`> [error] ${truncatedError}`);
    }
  }

  for (const error of msg.errors) {
    const truncatedError = error.length > 200 ? `${error.slice(0, 197)}...` : error;
    lines.push(`> [error] ${truncatedError}`);
  }

  return lines.join("\n");
}

export const ConversationLogPlugin: Plugin = async ({ directory }) => {
  const dataDir = join(directory, "data");
  const logPath = join(dataDir, "conversation.md");

  const messageBuffer = new Map<string, BufferedMessage>();
  const flushedMessages = new Set<string>();

  async function ensureDataDir(): Promise<void> {
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }
  }

  async function flushMessages(): Promise<void> {
    const messagesToFlush: Array<[string, BufferedMessage]> = [];

    for (const [msgId, msg] of messageBuffer) {
      if (!flushedMessages.has(msgId)) {
        messagesToFlush.push([msgId, msg]);
      }
    }

    if (messagesToFlush.length === 0) return;

    messagesToFlush.sort(([, a], [, b]) => a.timestamp - b.timestamp);

    const formatted = messagesToFlush.map(([, msg]) => formatMessage(msg)).join("\n\n");

    await ensureDataDir();
    await appendFile(logPath, `${formatted}\n\n`, "utf-8");

    for (const [msgId] of messagesToFlush) {
      flushedMessages.add(msgId);
    }

    messageBuffer.clear();
  }

  async function readLastLines(filePath: string, lineCount: number): Promise<string> {
    try {
      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n");
      return lines.slice(-lineCount).join("\n");
    } catch {
      return "";
    }
  }

  return {
    event: async ({ event }) => {
      if (event.type === "message.updated") {
        const info = event.properties.info;
        if (!info?.id) return;

        const existing = messageBuffer.get(info.id);
        if (existing) {
          existing.role = info.role;
          existing.timestamp = info.time.created;
          if (info.role === "assistant" && "error" in info && info.error) {
            const errorMsg = "message" in info.error ? String(info.error.message) : "Unknown error";
            if (!existing.errors.includes(errorMsg)) {
              existing.errors.push(errorMsg);
            }
          }
        } else if (!flushedMessages.has(info.id)) {
          const errors: string[] = [];
          if (info.role === "assistant" && "error" in info && info.error) {
            const errorMsg = "message" in info.error ? String(info.error.message) : "Unknown error";
            errors.push(errorMsg);
          }
          messageBuffer.set(info.id, {
            role: info.role,
            timestamp: info.time.created,
            texts: new Map(),
            tools: new Map(),
            errors,
          });
        }
      }

      if (event.type === "message.part.updated") {
        const part = event.properties.part;
        if (!part?.messageID) return;

        if (!messageBuffer.has(part.messageID) && !flushedMessages.has(part.messageID)) {
          messageBuffer.set(part.messageID, {
            role: "assistant",
            timestamp: Date.now(),
            texts: new Map(),
            tools: new Map(),
            errors: [],
          });
        }

        const msg = messageBuffer.get(part.messageID);
        if (!msg) return;

        if (part.type === "text" && part.text) {
          msg.texts.set(part.id, part.text);
        }

        if (part.type === "tool" && part.state) {
          const state = part.state;
          if (state.status === "completed" || state.status === "error") {
            msg.tools.set(part.id, {
              tool: part.tool,
              input: state.input ?? {},
              status: state.status,
              error: state.status === "error" ? state.error : undefined,
            });
          }
        }
      }

      if (event.type === "session.idle") {
        await flushMessages();
      }

      if (event.type === "session.compacted") {
        await ensureDataDir();
        const marker = `\n---\n*[Session compacted at ${formatTimestamp(Date.now())}]*\n---\n\n`;
        await appendFile(logPath, marker, "utf-8");
      }
    },

    "experimental.session.compacting": async (_input, output) => {
      const lastLines = await readLastLines(logPath, 30);
      if (lastLines.trim()) {
        output.context.push(
          `## Recent Conversation History (from data/conversation.md)\n\n${lastLines}`,
        );
      }
    },
  };
};
