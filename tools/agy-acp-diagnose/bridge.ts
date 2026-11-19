import { connect, type Socket } from "node:net";
import { Readable, Writable } from "node:stream";
import { acp } from "./runtime";
import type { ToolDeclaration } from "./types";
import { parseTools, record } from "./validation";

export function socketStream(socket: Socket) {
    return acp.ndJsonStream(Writable.toWeb(socket), Readable.toWeb(socket));
}

export async function readBridgeTools(port: number): Promise<{ tools: ToolDeclaration[]; socket: Socket }> {
    const socket = connect(port, "127.0.0.1");
    const stream = socketStream(socket);
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    try {
        await writer.write({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "diagnostic", version: "1" } } });
        const initialization = await reader.read();
        if (initialization.done || !initialization.value || !("result" in initialization.value)) throw new Error("MCP initialize failed");
        await writer.write({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
        const response = await reader.read();
        if (response.done) throw new Error("MCP tools/list failed");
        return { tools: parseTools(record(record(response.value).result).tools), socket };
    } catch (error) {
        socket.destroy();
        throw error;
    } finally {
        writer.releaseLock();
        reader.releaseLock();
    }
}
