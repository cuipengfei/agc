#!/usr/bin/env bun
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";

const globalDir = join(process.env.BUN_INSTALL ?? join(homedir(), ".bun"), "install/global");
// 使用当前 OMP 版本的 NDJSON 传输解析协议消息。
const { ndJsonStream } = await import(Bun.resolveSync("@oh-my-pi/pi-utils/acp", globalDir));
if (process.env.FAKE_STARTED) await writeFile(process.env.FAKE_STARTED, "started");
const stream = ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin));
const writer = stream.writable.getWriter();
for await (const message of stream.readable) {
    if (!("id" in message)) continue;
    if (message.method === "initialize") {
        await writer.write({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "fixture", version: "1" } } });
    } else if (message.method === "tools/list") {
        await writer.write({ jsonrpc: "2.0", id: message.id, result: { tools: [{ name: "search", description: "PRIVATE_DESCRIPTION_SENTINEL", inputSchema: { type: "object", properties: { topic: { anyOf: [{ type: "string", enum: ["general", "PRIVATE_ENUM_SENTINEL"] }, { type: "null" }] } } } }] } });
    } else {
        await writer.write({ jsonrpc: "2.0", id: message.id, error: { code: -32601, message: "Unknown method" } });
    }
}
