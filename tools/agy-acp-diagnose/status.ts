import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { record } from "./validation";

interface Status {
    name: string;
    type: "stdio" | "http" | "sse";
    enabled: boolean;
}

function names(value: unknown): Set<string> {
    if (value === undefined) return new Set();
    if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw new Error("invalid server list");
    return new Set(value);
}

function transport(server: Record<string, unknown>): Status["type"] {
    const value = server.type ?? server.transport ?? (server.command ? "stdio" : server.url ? "http" : "stdio");
    if (value !== "stdio" && value !== "http" && value !== "sse") throw new Error("invalid transport");
    return value;
}

export async function mcpStatus(configPath = join(homedir(), ".omp/agent/mcp.json")) {
    const config = record(JSON.parse(await readFile(configPath, "utf8")));
    const servers = record(config.mcpServers ?? {});
    const disabled = names(config.disabledServers);
    const enabled = names(config.enabledServers);
    const result: Status[] = Object.entries(servers).map(([name, value]) => {
        const server = record(value);
        if (server.enabled !== undefined && typeof server.enabled !== "boolean") throw new Error("invalid enabled state");
        return {
            name,
            type: transport(server),
            enabled: !disabled.has(name) && (enabled.has(name) || server.enabled !== false),
        };
    });
    result.sort((left, right) => left.name.localeCompare(right.name));
    return { scope: "source-config" as const, servers: result };
}
