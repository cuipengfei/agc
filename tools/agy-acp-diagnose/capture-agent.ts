#!/usr/bin/env bun
import { connect } from "node:net";
import { Readable, Writable } from "node:stream";
import { acp } from "./runtime";
import { readBridgeTools, socketStream } from "./bridge";

const args = process.argv.slice(2);
const geminiIndex = args.indexOf("--gemini-dir");
const portIndex = args.indexOf("--ide-mcp-port");
const socketPath = process.env.AGY_DIAG_SOCKET;
if (geminiIndex < 0 || portIndex < 0 || !socketPath) throw new Error("capture context unavailable");
const geminiDir = args[geminiIndex + 1];
const port = Number(args[portIndex + 1]);
if (!geminiDir || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error("invalid capture context");
const { tools, socket: bridge } = await readBridgeTools(port);
const control = connect(socketPath);
const controlStream = socketStream(control);
const writer = controlStream.writable.getWriter();
const reader = controlStream.readable.getReader();
const sessionId = crypto.randomUUID();
let system: unknown;
let cwd: unknown;
let model: unknown;
let thinking: unknown;
const stdio = acp.ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin));
const connection = new acp.AgentSideConnection(() => ({
    async initialize() { return { protocolVersion: 1, agentCapabilities: {}, authMethods: [] }; },
    async newSession(params: { cwd: unknown; _meta?: { antigravity?: { systemPrompt?: { append?: unknown } } } }) {
        system = params._meta?.antigravity?.systemPrompt?.append;
        cwd = params.cwd;
        return { sessionId, configOptions: [] };
    },
    async setSessionConfigOption(params: { configId: string; value: unknown }) {
        if (params.configId === "model") model = params.value;
        if (params.configId === "thought_level") thinking = params.value;
        return { configOptions: [] };
    },
    async prompt() {
        if (typeof system !== "string" || typeof cwd !== "string" || typeof model !== "string" || typeof thinking !== "string") throw new Error("incomplete capture");
        await writer.write({ jsonrpc: "2.0", method: "captured", params: { system, cwd, model, thinking, tools, geminiDir } });
        const release = await reader.read();
        if (release.done || !release.value || !("method" in release.value) || release.value.method !== "release") throw new Error("capture interrupted");
        return { stopReason: "end_turn" };
    },
}), stdio);
try {
    await connection.closed;
} finally {
    writer.releaseLock();
    reader.releaseLock();
    control.destroy();
    bridge.destroy();
}
