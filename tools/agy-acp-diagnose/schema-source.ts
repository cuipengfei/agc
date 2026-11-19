import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { record } from "./validation";

const globalDir = join(process.env.BUN_INSTALL ?? join(homedir(), ".bun"), "install/global");

export async function readServerTools(name: string, configPath: string) {
    // OMP 依赖按用户当前的 BUN_INSTALL 路径解析，配置值不进入日志。
    const { setTransports } = await import(Bun.resolveSync("@oh-my-pi/pi-utils/logger", globalDir));
    setTransports({ console: false, file: false });
    const { MCPManager } = await import(Bun.resolveSync("@oh-my-pi/pi-coding-agent/mcp/manager", globalDir));
    const { connectToServer, listTools, disconnectServer } = await import(Bun.resolveSync("@oh-my-pi/pi-coding-agent/mcp/client", globalDir));
    const manager = new MCPManager(process.cwd(), null);
    const data = record(JSON.parse(await readFile(configPath, "utf8")));
    const config = record(record(data.mcpServers)[name]);
    if (config.enabled === false) throw new Error("server unavailable");
    const connection = await connectToServer(name, await manager.prepareConfig(config, { oauth: false }));
    try {
        return { tools: await listTools(connection) };
    } finally {
        await disconnectServer(connection);
    }
}
