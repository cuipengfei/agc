import { expect, test } from "bun:test";
import { watch, type FSWatcher } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cli = join(import.meta.dir, "cli.ts");
const fixtures = join(import.meta.dir, "fixtures");

async function run(extra: string[] = [], extraEnv: Record<string, string> = {}, interrupt = false, invalidOmp = false) {
    const existing = new Set(interrupt || invalidOmp ? await readdir("/dev/shm") : []);
    const root = await mkdtemp(join(tmpdir(), "agy-diagnose-test-"));
    let watcher: FSWatcher | undefined;
    try {
        const gemini = join(root, "gemini");
        await mkdir(join(gemini, "antigravity-cli"), { recursive: true });
        await mkdir(join(gemini, "config/agents"), { recursive: true });
        await writeFile(join(gemini, "antigravity-cli/antigravity-oauth-token"), "SENSITIVE_TOKEN_SENTINEL");
        await writeFile(join(gemini, "config/agents/bridge.md"), "synthetic agent configuration");
        if (invalidOmp) await writeFile(join(root, "omp"), "#!/no-such-interpreter\n", { mode: 0o700 });
        else await symlink(join(fixtures, "omp.ts"), join(root, "omp"));
        const ready = Promise.withResolvers<void>();
        if (interrupt) watcher = watch(root, (_event, name) => { if (name === "ready") ready.resolve(); });
        const child = Bun.spawn([process.execPath, cli, "diagnose", ...extra], {
            stdout: "pipe", stderr: "pipe", timeout: invalidOmp ? 1000 : 10_000, killSignal: "SIGTERM",
            env: { ...process.env, PATH: `${root}:${process.env.PATH}`, PI_AGY_PATH: join(fixtures, "agy.ts"), FAKE_GEMINI_DIR: gemini, ...extraEnv, ...(interrupt ? { FAKE_HANG: "1", FAKE_READY_PATH: join(root, "ready") } : {}) },
        });
        if (interrupt) {
            try { await Promise.race([ready.promise, child.exited.then(() => { throw new Error("diagnostic exited early"); })]); }
            finally { watcher?.close(); }
            child.kill("SIGINT");
        }
        const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
        const leftovers = interrupt || invalidOmp ? (await readdir("/dev/shm")).filter(name => name.startsWith("agy-diagnose-") && !existing.has(name)) : [];
        return { stdout, stderr, code, leftovers };
    } finally {
        watcher?.close();
        await rm(root, { recursive: true, force: true });
    }
}

const live = ["--live", "--max-requests", "3", "--model", "antigravity-cli/fixture-model", "--thinking", "medium"];

test("未授权的诊断不发起模型请求", async () => {
    const result = await run(["--max-requests", "3", "--model", "antigravity-cli/fixture-model", "--thinking", "medium"]);
    expect(result.code).not.toBe(0);
    expect(result.stdout).not.toContain("baseline");
});

test("OMP 启动失败时释放临时资源并退出", async () => {
    const result = await run(live, {}, false, true);
    expect(result.code).toBe(1);
    expect(result.leftovers).toEqual([]);
});

test("请求预算、模型和 thinking 参数无效时拒绝诊断", async () => {
    for (const args of [
        ["--live", "--max-requests", "2", "--model", "antigravity-cli/fixture-model", "--thinking", "medium"],
        ["--live", "--max-requests", "65", "--model", "antigravity-cli/fixture-model", "--thinking", "medium"],
        ["--live", "--max-requests", "3.5", "--model", "antigravity-cli/fixture-model", "--thinking", "medium"],
        ["--live", "--max-requests", "3", "--model", "other/model", "--thinking", "medium"],
        ["--live", "--max-requests", "3", "--model", "antigravity-cli/fixture-model", "--thinking", "auto"],
    ]) {
        const result = await run(args);
        expect(result.code).not.toBe(0);
        expect(result.stdout).toBe("");
    }
});

test("固定账号和选项运行三组单变量对照，输出不包含输入内容", async () => {
    const result = await run(live);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    for (const secret of ["SENSITIVE_SYSTEM_SENTINEL", "SENSITIVE_TOOL_SENTINEL", "SENSITIVE_TOKEN_SENTINEL"]) {
        expect(result.stdout).not.toContain(secret);
        expect(result.stderr).not.toContain(secret);
    }
    const report = JSON.parse(result.stdout);
    expect(report.probes.map((probe: { label: string; status: string; tools: number }) => [probe.label, probe.status, probe.tools])).toEqual([
        ["neutral-no-tools", "ok", 0],
        ["captured-no-tools", "429", 0],
        ["neutral-captured-tools", "400", 1],
    ]);
    expect(report.requests).toBe(3);
});

test("503 使本轮对照无效并停止后续请求", async () => {
    const result = await run(live, { FAKE_BASELINE_503: "1" });
    const report = JSON.parse(result.stdout);
    expect(result.code).not.toBe(0);
    expect(report.probes.map((probe: { status: string }) => probe.status)).toEqual(["503"]);
    expect(report.requests).toBe(1);
});

test("网络错误使本轮对照无效并停止后续请求", async () => {
    const result = await run(live, { FAKE_BASELINE_NETWORK: "1" });
    const report = JSON.parse(result.stdout);
    expect(result.code).not.toBe(0);
    expect(report.probes.map((probe: { status: string }) => probe.status)).toEqual(["network"]);
    expect(report.requests).toBe(1);
});

test("二分定位报告行号并遵守请求预算", async () => {
    const limited = await run([...live, "--bisect"]);
    const limitedReport = JSON.parse(limited.stdout);
    expect(limited.code).not.toBe(0);
    expect(limitedReport.status).toBe("budget_exhausted");
    expect(limitedReport.requests).toBe(3);

    const complete = await run(["--live", "--max-requests", "4", "--model", "antigravity-cli/fixture-model", "--thinking", "medium", "--bisect"]);
    const report = JSON.parse(complete.stdout);
    expect(complete.code).toBe(0);
    expect(report.requests).toBe(4);
    expect(report.narrowed).toEqual({ startLine: 1, endLine: 1, characters: 25 });
    expect(complete.stdout).not.toContain("SENSITIVE_SYSTEM_SENTINEL");
});

test("探测时拒绝工具执行并停止请求", async () => {
    const result = await run(live, { FAKE_TOOLCALL: "1" });
    const report = JSON.parse(result.stdout);
    expect(result.code).not.toBe(0);
    expect(report.probes.at(-1).status).toBe("unexpected_tool_call");
    expect(report.requests).toBe(3);
});

test("中断时终止子进程并删除临时内存目录", async () => {
    const result = await run(live, {}, true);
    expect(result.code).toBe(130);
    expect(JSON.parse(result.stdout).status).toBe("interrupted");
    expect(result.leftovers).toEqual([]);
});
