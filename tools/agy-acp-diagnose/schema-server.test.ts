import { expect, test } from "bun:test";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const cli = join(import.meta.dir, "cli.ts");
const fixture = join(import.meta.dir, "fixtures/mcp.ts");

async function run(args: string[]) {
    const child = Bun.spawn([process.execPath, cli, "schema", ...args], { stdout: "pipe", stderr: "pipe", timeout: 10_000 });
    const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    return { stdout, stderr, code };
}

test("显式授权后从指定 MCP 服务获取源声明并只输出结构", async () => {
    const root = await mkdtemp(join(tmpdir(), "agy-schema-test-"));
    try {
        const config = join(root, "mcp.json");
        const marker = join(root, "started");
        await writeFile(config, JSON.stringify({ mcpServers: { fixture: { type: "stdio", command: process.execPath, args: [fixture], env: { FAKE_STARTED: marker, KEY: "PRIVATE_KEY_SENTINEL" } } } }));
        const args = ["--server", "fixture", "--config", config];
        const denied = await run(args);
        expect(denied.code).not.toBe(0);
        expect(await access(marker).then(() => true, () => false)).toBe(false);
        const result = await run(["--live", ...args]);
        expect(result.code).toBe(0);
        expect(result.stderr).toBe("");
        for (const secret of ["PRIVATE_KEY_SENTINEL", "PRIVATE_DESCRIPTION_SENTINEL", "PRIVATE_ENUM_SENTINEL"]) {
            expect(result.stdout).not.toContain(secret);
        }
        const topic = JSON.parse(result.stdout).tools[0].changes.find((change: { path: string }) => change.path === "/properties/topic");
        expect(topic.source.anyOf).toBe(2);
        expect(topic.wire.enumIncludesNull).toBe(true);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("缺少配置文件时不连接服务或打开用户数据库", async () => {
    const root = await mkdtemp(join(tmpdir(), "agy-schema-home-"));
    try {
        const agent = join(root, ".omp/agent");
        const marker = join(root, "started");
        await mkdir(agent, { recursive: true });
        await writeFile(join(agent, "mcp.json"), JSON.stringify({ mcpServers: { fixture: { type: "stdio", command: process.execPath, args: [fixture], env: { FAKE_STARTED: marker } } } }));
        const child = Bun.spawn([process.execPath, cli, "schema", "--live", "--server", "fixture"], {
            cwd: root, stdout: "pipe", stderr: "pipe", timeout: 10_000,
            env: { ...process.env, HOME: root, BUN_INSTALL: process.env.BUN_INSTALL ?? join(homedir(), ".bun"), PI_CODING_AGENT_DIR: agent, OMP_PROFILE: "", PI_PROFILE: "", XDG_DATA_HOME: join(root, "data"), XDG_STATE_HOME: join(root, "state"), XDG_CACHE_HOME: join(root, "cache") },
        });
        const code = await child.exited;
        expect(code).not.toBe(0);
        expect(await access(marker).then(() => true, () => false)).toBe(false);
        expect(await access(join(agent, "agent.db")).then(() => true, () => false)).toBe(false);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
