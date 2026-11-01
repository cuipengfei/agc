import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import * as path from "node:path";
import type { ProtectedLocation } from "../extensions/deny-mnemopi-grep.ts";

const EXTENSION_PATH = path.resolve(import.meta.dir, "../extensions/deny-mnemopi-grep.ts");
const LOADER_PATH = Bun.resolveSync("@oh-my-pi/pi-coding-agent/extensibility/plugins/legacy-pi-compat", path.resolve(process.env.BUN_INSTALL ?? path.join(homedir(), ".bun"), "install/global"));
const { loadLegacyPiModule } = await import(LOADER_PATH);
const { createGrepGuard } = await loadLegacyPiModule(EXTENSION_PATH) as typeof import("../extensions/deny-mnemopi-grep.ts");
const roots: string[] = [];

afterAll(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
});

interface Fixture {
    root: string;
    agent: string;
    memories: string;
    mnemopi: string;
    dbFile: string;
    historyDb: string;
    repo: string;
}

function touch(file: string, content = "value\n"): void {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
}

function fixture(): Fixture {
    const root = mkdtempSync(path.join(tmpdir(), "deny-mnemopi-grep-"));
    roots.push(root);
    const agent = path.join(root, ".omp", "agent");
    const memories = path.join(agent, "memories");
    const mnemopi = path.join(memories, "mnemopi");
    const dbFile = path.join(mnemopi, "banks", "a", "mnemopi.db");
    const historyDb = path.join(agent, "history.db");
    const repo = path.join(root, "repo");

    touch(dbFile, "SQLite format 3\u0000");
    touch(`${dbFile}-wal`, "wal");
    touch(`${dbFile}-shm`, "shm");
    touch(historyDb, "SQLite format 3\u0000");
    touch(`${historyDb}-wal`, "wal");
    touch(`${historyDb}-shm`, "shm");
    touch(path.join(agent, "config.yml"), "watchdog: true\n");
    touch(path.join(agent, "extensions", "deny.ts"), "export const enabled = true;\n");
    touch(path.join(agent, "rules", "rule.md"), "# rule\n");
    touch(path.join(agent, "logs", "omp.log"), "started\n");
    touch(path.join(memories, "mnemopi-notes", "note.txt"), "notes\n");
    touch(path.join(repo, "src", "main.ts"), "export const main = 1;\n");
    touch(path.join(repo, "README.md"), "# repo\n");
    touch(path.join(repo, "debug.log"), "log\n");

    return { root, agent, memories, mnemopi, dbFile, historyDb, repo };
}

function defaultLocations(f: Fixture): ProtectedLocation[] {
    return [
        { path: f.mnemopi, kind: "directory" },
        { path: f.historyDb, kind: "sqlite-family" },
    ];
}

interface Outcome {
    block: boolean;
    reason: string;
}

async function grep(
    f: Fixture,
    input: { path?: string; gitignore?: boolean },
    cwd = f.root,
    locations = defaultLocations(f),
): Promise<Outcome> {
    const guard = createGrepGuard(locations);
    const result = (await guard(
        { type: "tool_call", toolName: "grep", toolCallId: "test", input: { pattern: "needle", ...input } } as never,
        { cwd } as never,
    )) as { block?: boolean; reason?: string } | undefined;
    return { block: result?.block === true, reason: result?.reason ?? "" };
}

describe("deny-mnemopi-grep", () => {
    test("拒绝直接搜索 Mnemopi 目录", async () => {
        const f = fixture();
        const out = await grep(f, { path: f.mnemopi });
        expect(out.block).toBe(true);
        expect(out.reason).toMatch(/Mnemopi|记忆/i);
    });

    test("拒绝从 agent 目录解析的受保护相对路径", async () => {
        const f = fixture();
        expect((await grep(f, { path: "memories/mnemopi" }, f.agent)).block).toBe(true);
    });

    test("启用忽略规则时仍拒绝直接搜索 history.db 及其附属文件", async () => {
        const f = fixture();
        for (const target of [f.historyDb, `${f.historyDb}-wal`, `${f.historyDb}-shm`]) {
            expect((await grep(f, { path: target, gitignore: true })).block, target).toBe(true);
        }
    });

    test("关闭忽略规则时拒绝包含受保护文件的父目录搜索", async () => {
        const f = fixture();
        touch(path.join(f.agent, ".gitignore"), "memories/\nhistory.db\nhistory.db-wal\nhistory.db-shm\n");
        expect((await grep(f, { path: f.agent, gitignore: false })).block).toBe(true);
    });

    test("忽略规则排除全部受保护文件时允许父目录搜索", async () => {
        const f = fixture();
        touch(path.join(f.agent, ".gitignore"), "memories/\nhistory.db\nhistory.db-wal\nhistory.db-shm\n");
        expect((await grep(f, { path: f.agent })).block).toBe(false);
    });

    test("多个搜索根中包含受保护目录时拒绝搜索", async () => {
        const f = fixture();
        expect((await grep(f, { path: `${f.repo};${f.mnemopi}` })).block).toBe(true);
    });

    test("允许仅选择安全文本文件的 glob", async () => {
        const f = fixture();
        expect((await grep(f, { path: "**/*.ts" })).block).toBe(false);
    });

    test("glob 候选包含受保护数据库时拒绝搜索", async () => {
        const f = fixture();
        expect((await grep(f, { path: "**/*.db" })).block).toBe(true);
    });

    test("允许明确指定的配置与源码文本文件", async () => {
        const f = fixture();
        for (const target of [
            path.join(f.agent, "config.yml"),
            path.join(f.agent, "extensions", "deny.ts"),
            path.join(f.agent, "rules", "rule.md"),
            path.join(f.agent, "logs", "omp.log"),
        ]) {
            expect((await grep(f, { path: target })).block, target).toBe(false);
        }
    });

    test("允许搜索 extensions、rules 与 logs 目录", async () => {
        const f = fixture();
        for (const target of [
            path.join(f.agent, "extensions"),
            path.join(f.agent, "rules"),
            path.join(f.agent, "logs"),
        ]) {
            expect((await grep(f, { path: target })).block, target).toBe(false);
        }
    });

    test("父目录只排除 Mnemopi 时仍拒绝搜索 history.db", async () => {
        const f = fixture();
        expect((await grep(f, { path: `${f.agent};!**/mnemopi/**` })).block).toBe(true);
    });

    test("父目录排除 Mnemopi 与 history.db 系列后允许搜索", async () => {
        const f = fixture();
        expect((await grep(f, { path: `${f.agent};!**/mnemopi/**;!history.db*` })).block).toBe(false);
    });

    test("排除表达式不能允许直接搜索受保护文件", async () => {
        const f = fixture();
        expect((await grep(f, { path: `${f.dbFile};!**/mnemopi/**` })).block).toBe(true);
    });

    test("允许关闭忽略规则后搜索普通外部仓库", async () => {
        const f = fixture();
        touch(path.join(f.repo, ".gitignore"), "*.log\n");
        expect((await grep(f, { path: f.repo, gitignore: false })).block).toBe(false);
    });

    test("拒绝指向受保护目录的 symlink 搜索根", async () => {
        const f = fixture();
        const link = path.join(f.root, "memories-link");
        symlinkSync(f.mnemopi, link, "dir");
        expect((await grep(f, { path: link })).block).toBe(true);
    });

    test("父目录搜索遵循 Grep 不进入嵌套 symlink 的行为", async () => {
        const f = fixture();
        const aliasAgent = path.join(f.root, "alias-agent");
        mkdirSync(path.join(aliasAgent, "memories"), { recursive: true });
        const linkedMemories = path.join(aliasAgent, "memories", "mnemopi");
        symlinkSync(f.mnemopi, linkedMemories, "dir");
        const locations: ProtectedLocation[] = [{ path: linkedMemories, kind: "directory" }];

        expect((await grep(f, { path: linkedMemories }, f.root, locations)).block).toBe(true);
        expect((await grep(f, { path: aliasAgent }, f.root, locations)).block).toBe(false);
    });

    test("允许搜索名称相似的同级目录", async () => {
        const f = fixture();
        expect((await grep(f, { path: path.join(f.memories, "mnemopi-notes") })).block).toBe(false);
    });

    test("拒绝原因提供安全替代操作与 SQLite 风险说明", async () => {
        const f = fixture();
        const reason = (await grep(f, { path: f.mnemopi })).reason;
        expect(reason).toContain("安全替代操作");
        expect(reason).toMatch(/recall/);
        expect(reason).toMatch(/SQLite/);
        expect(reason).toMatch(/副本/);
        expect(reason).toMatch(/WAL/);
        expect(reason).toMatch(/列目录|glob/);
    });

    test("保持其他工具调用原有行为", async () => {
        const f = fixture();
        const guard = createGrepGuard(defaultLocations(f));
        const result = await guard(
            { type: "tool_call", toolName: "read", toolCallId: "t", input: { path: f.mnemopi } } as never,
            { cwd: f.root } as never,
        );
        expect(result).toBeUndefined();
    });

    test("无法确认本地目标的 URI 别名不能绕过防护", async () => {
        const f = fixture();
        expect((await grep(f, { path: "db-alias://history.db" })).block).toBe(true);
    });

    test("允许明确的 MCP 资源 URI", async () => {
        const f = fixture();
        expect((await grep(f, { path: "mcp://guard-fixture" })).block).toBe(false);
    });

    test("file URI 的受保护文件被拒绝且安全日志被允许", async () => {
        const f = fixture();
        expect((await grep(f, { path: `file://${f.dbFile}` })).block).toBe(true);
        expect((await grep(f, { path: `file://${f.repo}/debug.log` })).block).toBe(false);
    });

    test("独立进程按自己的 HOME 解析受保护路径与安全路径", async () => {
        const f = fixture();
        const script = `
const { loadLegacyPiModule } = await import(${JSON.stringify(LOADER_PATH)});
const { createGrepGuard } = await loadLegacyPiModule(${JSON.stringify(EXTENSION_PATH)});
const guard = createGrepGuard([{ path: ${JSON.stringify(f.mnemopi)}, kind: "directory" }]);
const ctx = { cwd: ${JSON.stringify(f.root)} };
const blocked = await guard(
    { type: "tool_call", toolName: "grep", toolCallId: "tilde-data", input: { pattern: "needle", path: "~/.omp/agent/memories/mnemopi" } },
    ctx,
);
const safe = await guard(
    { type: "tool_call", toolName: "grep", toolCallId: "tilde-safe", input: { pattern: "needle", path: "~/repo" } },
    ctx,
);
process.stdout.write(JSON.stringify({ blocked: Boolean(blocked && blocked.block), safe: Boolean(safe && safe.block) }));
`;
        const child = Bun.spawnSync([process.execPath, "-e", script], {
            cwd: f.root,
            env: { ...process.env, HOME: f.root },
            stdout: "pipe",
            stderr: "pipe",
        });
        expect(child.exitCode, child.stderr.toString()).toBe(0);
        expect(JSON.parse(child.stdout.toString())).toEqual({ blocked: true, safe: false });
    });
});
