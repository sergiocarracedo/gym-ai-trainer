import { Plugin } from "@opencode/plugin";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

interface ToolInfo {
	tool: string;
	input: Record<string, unknown>;
	status: string;
	error?: string;
}

interface BufferedMessage {
	role: "user" | "assistant";
	timestamp: number;
	texts: string[];
	tools: ToolInfo[];
	errors: string[];
}

/** Structural view of the user/assistant messages returned by `ctx.session.context()`. */
interface LoggableMessage {
	type: string;
	time: { created: number };
	text?: string;
	content?: unknown[];
	error?: unknown;
}

const STORAGE_KEY = "logged-messages";
const HISTORY_LINES = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
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

	const textContent = msg.texts.filter((t) => t.trim().length > 0).join("\n\n");

	if (textContent) {
		lines.push(textContent);
	}

	for (const toolInfo of msg.tools) {
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

function toBufferedMessage(message: LoggableMessage): BufferedMessage | undefined {
	const timestamp = message.time?.created ?? Date.now();

	if (message.type === "user") {
		if (typeof message.text !== "string") return undefined;
		return { role: "user", timestamp, texts: [message.text], tools: [], errors: [] };
	}

	if (message.type !== "assistant") return undefined;

	const texts: string[] = [];
	const tools: ToolInfo[] = [];
	const errors: string[] = [];

	if (isRecord(message.error) && typeof message.error.message === "string") {
		errors.push(message.error.message);
	}

	for (const part of message.content ?? []) {
		if (!isRecord(part)) continue;

		if (part.type === "text") {
			if (typeof part.text === "string") texts.push(part.text);
			continue;
		}

		if (part.type !== "tool" || !isRecord(part.state)) continue;

		const status = part.state.status;
		if (status !== "completed" && status !== "error") continue;

		const stateError = isRecord(part.state.error) ? part.state.error.message : undefined;
		tools.push({
			tool: typeof part.name === "string" ? part.name : "tool",
			input: isRecord(part.state.input) ? part.state.input : {},
			status,
			error: typeof stateError === "string" ? stateError : undefined,
		});
	}

	return { role: "assistant", timestamp, texts, tools, errors };
}

export default Plugin.define({
	id: "conversation-log",
	async setup(ctx) {
		const dataDir = join(ctx.location.directory, "data");
		const logPath = join(dataDir, "conversation.md");
		const projectID = ctx.location.project.id;
		const loadedAt = Date.now();

		function report(scope: string, err: unknown): void {
			console.error(
				`[conversation-log] ${scope}:`,
				err instanceof Error ? err.message : String(err),
			);
		}

		async function loadLogged(): Promise<Record<string, string[]>> {
			const result: Record<string, string[]> = {};
			const stored = await ctx.storage.get(STORAGE_KEY);
			if (!isRecord(stored)) return result;
			for (const [sessionID, ids] of Object.entries(stored)) {
				if (Array.isArray(ids) && ids.every((id) => typeof id === "string")) {
					result[sessionID] = ids;
				}
			}
			return result;
		}

		const logged = await loadLogged();

		async function ensureDataDir(): Promise<void> {
			if (!existsSync(dataDir)) {
				await mkdir(dataDir, { recursive: true });
			}
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

		// The event stream is shared across the server, so only log sessions that
		// belong to this project.
		async function isOwnSession(sessionID: string): Promise<boolean> {
			try {
				const session = await ctx.session.get({ sessionID });
				return session.projectID === projectID;
			} catch (err) {
				report("session.get", err);
				return false;
			}
		}

		async function flushSession(sessionID: string): Promise<void> {
			if (!(await isOwnSession(sessionID))) return;

			const messages = await ctx.session.context({ sessionID });
			const seen = new Set(logged[sessionID] ?? []);
			// First flush for a session: skip anything that predates this plugin
			// load so existing history is not re-appended to the log.
			const hasBaseline = logged[sessionID] !== undefined;

			const pending: BufferedMessage[] = [];
			const pendingIDs: string[] = [];

			for (const message of messages) {
				if (message.type !== "user" && message.type !== "assistant") continue;
				if (seen.has(message.id)) continue;
				if (!hasBaseline && message.time.created < loadedAt) continue;

				const buffered = toBufferedMessage(message);
				if (!buffered) continue;
				pending.push(buffered);
				pendingIDs.push(message.id);
			}

			if (pending.length === 0) return;

			pending.sort((a, b) => a.timestamp - b.timestamp);
			const formatted = pending.map((msg) => formatMessage(msg)).join("\n\n");

			await ensureDataDir();
			await appendFile(logPath, `${formatted}\n\n`, "utf-8");

			logged[sessionID] = [...(logged[sessionID] ?? []), ...pendingIDs];
			await ctx.storage.set(STORAGE_KEY, logged);
		}

		async function appendCompactionMarker(sessionID: string): Promise<void> {
			if (!(await isOwnSession(sessionID))) return;
			await ensureDataDir();
			const marker = `\n---\n*[Session compacted at ${formatTimestamp(Date.now())}]*\n---\n\n`;
			await appendFile(logPath, marker, "utf-8");
		}

		// Serialize flushes so concurrent sessions cannot interleave appends or
		// race on the stored message IDs.
		let queue: Promise<void> = Promise.resolve();
		const enqueue = (work: () => Promise<void>): void => {
			queue = queue.then(work).catch((err) => report("flush", err));
		};

		const controller = new AbortController();
		void (async () => {
			try {
				for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
					// `session.idle` is not delivered to plugin event subscriptions, so
					// the execution lifecycle is what actually triggers a flush.
					if (
						event.type === "session.idle" ||
						event.type === "session.execution.succeeded" ||
						event.type === "session.execution.interrupted" ||
						event.type === "session.execution.failed"
					) {
						enqueue(() => flushSession(event.data.sessionID));
					} else if (event.type === "session.compaction.ended") {
						enqueue(() => appendCompactionMarker(event.data.sessionID));
					}
				}
			} catch (err) {
				if (!controller.signal.aborted) report("event subscription", err);
			}
		})();

		await ctx.session.hook("compaction", async (event) => {
			try {
				const lastLines = await readLastLines(logPath, HISTORY_LINES);
				if (lastLines.trim()) {
					event.system.push({
						type: "text",
						text: `## Recent Conversation History (from data/conversation.md)\n\n${lastLines}`,
					});
				}
			} catch (err) {
				report("compaction hook", err);
			}
		});

		return () => controller.abort();
	},
});
