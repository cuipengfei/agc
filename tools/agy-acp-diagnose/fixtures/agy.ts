#!/usr/bin/env bun
import { writeFile } from "node:fs/promises";
import { connect } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";

const globalDir = join(process.env.BUN_INSTALL ?? join(homedir(), ".bun"), "install/global");
// 使用 SDK 解析实际 ACP/MCP 数据流，替身仅模拟外部 agy 的响应。
const { AgentSideConnection, ndJsonStream } = await import(Bun.resolveSync("@oh-my-pi/pi-utils/acp", globalDir));
const argv = process.argv.slice(2);
const get = (name: string) => argv[argv.indexOf(name) + 1];
const socket = connect(Number(get("--ide-mcp-port")), "127.0.0.1");
const stream = ndJsonStream(Writable.toWeb(socket), Readable.toWeb(socket));
const reader = stream.readable.getReader();
const writer = stream.writable.getWriter();
await writer.write({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
const response = (await reader.read()).value;
const tools = response?.result?.tools;
if (!Array.isArray(tools)) throw new Error("missing fake tools");
let system = "";
let model = "";
let thought = "";
const sessionId = crypto.randomUUID();
const stdio = ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin));
const connection = new AgentSideConnection(conn => ({
    async initialize() { return { protocolVersion: 1, agentCapabilities: {}, authMethods: [] }; },
    async newSession(params) {
        system = params._meta?.antigravity?.systemPrompt?.append;
        return { sessionId, configOptions: [] };
    },
    async setSessionConfigOption(params) {
        if (params.configId === "model") model = params.value;
        if (params.configId === "thought_level") thought = params.value;
        return { configOptions: [] };
    },
    async prompt() {
        if (model !== "fixture-model" || thought !== "medium" || !get("--gemini-dir").startsWith("/dev/shm/")) throw new Error("unexpected probe context");
        if (process.env.FAKE_HANG === "1") {
            await writeFile(process.env.FAKE_READY_PATH!, "ready");
            await Promise.withResolvers<void>().promise;
        }
        if (process.env.FAKE_TOOLCALL === "1" && tools.length > 0) {
            await writer.write({ jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: tools[0].name, arguments: {} } });
            const reply = (await reader.read()).value;
            if (!reply?.result?.isError) throw new Error("tool call was not rejected");
            await Promise.withResolvers<void>().promise;
        }
        let text: string;
        if (process.env.FAKE_BASELINE_NETWORK === "1") text = "ECONNRESET";
        else if (process.env.FAKE_BASELINE_503 === "1") text = "No capacity available, code 503";
        else if (system.includes("SENSITIVE_SYSTEM_SENTINEL") && tools.length === 0) text = "RESOURCE_EXHAUSTED";
        else if (system === "You are a helpful coding assistant." && tools.length === 0) text = "OK";
        else if (system === "You are a helpful coding assistant." && tools.length === 1) text = "INVALID_ARGUMENT";
        else throw new Error("unexpected probe variables");
        await conn.sessionUpdate({ sessionId, update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text } } });
        if (text !== "OK") await Promise.withResolvers<void>().promise;
        return { stopReason: "end_turn" };
    },
}), stdio);
await connection.closed;
socket.destroy();
