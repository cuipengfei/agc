import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mcpStatus } from "./status";

const cli = join(import.meta.dir, "cli.ts");

test("mcp-status 仅输出本配置中的服务状态且不输出凭据", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agy-status-test-"));
    try {
        const config = join(dir, "mcp.json");
        await writeFile(config, JSON.stringify({
            disabledServers: ["web"],
            enabledServers: ["runner"],
            mcpServers: {
                web: { type: "http", url: "https://example.invalid/?key=sentinel-secret-value" },
                runner: { type: "stdio", enabled: false, command: "sentinel-command-value", env: { KEY: "sentinel-secret-value" } },
            },
        }));
        const child = Bun.spawn([process.execPath, cli, "mcp-status", "--config", config], { stdout: "pipe", stderr: "pipe" });
        const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
        expect(code).toBe(0);
        expect(stderr).toBe("");
        expect(stdout).not.toContain("sentinel-secret-value");
        expect(stdout).not.toContain("sentinel-command-value");
        expect(JSON.parse(stdout)).toEqual({
            scope: "source-config",
            servers: [
                { name: "runner", type: "stdio", enabled: true },
                { name: "web", type: "http", enabled: false },
            ],
        });
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test("服务连接类型与启用优先级按配置计算", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agy-status-test-"));
    try {
        const config = join(dir, "mcp.json");
        await writeFile(config, JSON.stringify({
            enabledServers: ["override", "disabled"], disabledServers: ["disabled"],
            mcpServers: { implicit: { command: "tool" }, remote: { url: "https://example.invalid" }, override: { type: "sse", enabled: false }, disabled: { type: "http" }, running: { enabled: true }, stopped: { enabled: false } },
        }));
        expect((await mcpStatus(config)).servers).toEqual([
            { name: "disabled", type: "http", enabled: false },
            { name: "implicit", type: "stdio", enabled: true },
            { name: "override", type: "sse", enabled: true },
            { name: "remote", type: "http", enabled: true },
            { name: "running", type: "stdio", enabled: true },
            { name: "stopped", type: "stdio", enabled: false },
        ]);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test("无效的 MCP 服务状态配置明确失败", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agy-status-test-"));
    try {
        const config = join(dir, "mcp.json");
        for (const value of [null, "invalid", { mcpServers: [] }, { mcpServers: false }, { disabledServers: "all" }, { enabledServers: [1] }, { mcpServers: { tool: { type: "unknown" } } }, { mcpServers: { tool: { enabled: "true" } } }]) {
            await writeFile(config, JSON.stringify(value));
            await expect(mcpStatus(config)).rejects.toThrow();
        }
        await writeFile(config, "{}");
        expect((await mcpStatus(config)).servers).toEqual([]);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
