import { expect, test } from "bun:test";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

const globalDir = path.resolve(process.env.BUN_INSTALL ?? path.join(homedir(), ".bun"), "install/global");
// 使用当前宿主插件加载器测试真实扩展入口。
const { loadLegacyPiModule } = await import(Bun.resolveSync("@oh-my-pi/pi-coding-agent/extensibility/plugins/legacy-pi-compat", globalDir));
const { default: register } = await loadLegacyPiModule(path.resolve(import.meta.dir, "../extensions/agy-sensitive-guard.ts"));
const handlers: Array<(event: unknown, ctx: unknown) => Promise<{ block?: boolean } | undefined>> = [];
register({ on(event: string, handler: typeof handlers[number]) { if (event === "tool_call") handlers.push(handler); } });
const ctx = { cwd: "/tmp" };
async function blocked(toolName: string, input: unknown): Promise<boolean> {
    for (const handler of handlers) if ((await handler({ toolName, input }, ctx))?.block) return true;
    return false;
}

test("阻断直接读取含凭据的 MCP 配置，普通文本读取仍可用", async () => {
    const config = path.join(homedir(), ".omp/agent/mcp.json");
    expect(await blocked("read", { path: `${config}:1` })).toBe(true);
    expect(await blocked("read", { path: `/tmp/notes.txt;${config}:2-3:raw` })).toBe(true);
    expect(await blocked("grep", { path: config, pattern: "key" })).toBe(true);
    expect(await blocked("read", { path: "/tmp/notes.txt" })).toBe(false);
    expect(await blocked("read", { path: path.join(homedir(), ".omp/agent/.env") })).toBe(true);
    expect(await blocked("read", { path: path.join(homedir(), ".omp/agent/models.yml") })).toBe(true);
    for (const relative of [".codex/auth.json", ".prime/agent/auth.json", ".local/share/opencode/auth.json"]) {
        expect(await blocked("read", { path: path.join(homedir(), relative) })).toBe(true);
    }
    expect(await blocked("read", { path: pathToFileURL(config).href })).toBe(true);
    expect(await blocked("read", { path: "https://example.invalid/text" })).toBe(false);
    expect(await blocked("read", null)).toBe(false);
    expect(await blocked("read", "unexpected")).toBe(false);
    expect(await blocked("read", {})).toBe(false);
    expect(await blocked("read", { path: 42 })).toBe(false);
    expect(await blocked("read", { path: "" })).toBe(false);
});

test("路径经过目录 symlink 时仍阻断受保护的凭据目标", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "agy-guard-test-"));
    try {
        const alias = path.join(root, "home");
        await symlink(homedir(), alias);
        expect(await blocked("read", { path: path.join(alias, ".omp/agent/auth.json") })).toBe(true);
        const finalAlias = path.join(root, "config");
        await symlink(path.join(homedir(), ".omp/agent/mcp.json"), finalAlias);
        expect(await blocked("read", { path: finalAlias })).toBe(true);
        const dangling = path.join(root, "dangling");
        await symlink(path.join(root, "missing"), dangling);
        expect(await blocked("read", { path: dangling })).toBe(true);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("阻断直接执行可能回显凭据的 agy MCP 命令", async () => {
    expect(await blocked("bash", { command: "agy mcp list" })).toBe(true);
    expect(await blocked("bash", { command: "env agy mcp add example https://example.invalid" })).toBe(true);
    expect(await blocked("bash", { command: "printf ok; env CHECK=1 agy mcp list | head" })).toBe(true);
    expect(await blocked("bash", { command: "agy --help" })).toBe(false);
    for (const input of [null, {}, "agy mcp list", { command: 42 }]) expect(await blocked("bash", input)).toBe(false);
});
