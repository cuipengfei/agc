import { chmod, copyFile, mkdir, mkdtemp, rm, statfs } from "node:fs/promises";
import { join } from "node:path";
import { captureRequest, type CaptureSession } from "./capture";
import { probe } from "./probe";
import type { CapturedRequest, ProbeResult, ToolDeclaration } from "./types";

const neutral = "You are a helpful coding assistant.";
const tmpfsMagic = 0x01021994;

async function stageAccount(source: string, root: string): Promise<void> {
    const destination = join(root, "gemini");
    await mkdir(join(destination, "antigravity-cli"), { recursive: true, mode: 0o700 });
    await mkdir(join(destination, "config/agents"), { recursive: true, mode: 0o700 });
    const token = join(destination, "antigravity-cli/antigravity-oauth-token");
    await copyFile(join(source, "antigravity-cli/antigravity-oauth-token"), token);
    await chmod(token, 0o600);
    await copyFile(join(source, "config/agents/bridge.md"), join(destination, "config/agents/bridge.md"));
}

export async function diagnose(options: { model: string; thinking: string; maxRequests: number; bisect: boolean }, signal: AbortSignal) {
    signal.throwIfAborted();
    if ((await statfs("/dev/shm")).type !== tmpfsMagic) throw new Error("tmpfs required");
    const binary = process.env.PI_AGY_PATH || Bun.which("agy");
    if (!binary) throw new Error("agy unavailable");
    const root = await mkdtemp("/dev/shm/agy-diagnose-");
    let capture: CaptureSession | undefined;
    try {
        capture = await captureRequest(root, options.model, options.thinking, signal);
        const request = capture.captured;
        signal.throwIfAborted();
        await stageAccount(request.geminiDir, root);
        const probes: ProbeResult[] = [];
        let requests = 0;
        const run = async (label: string, system: string, tools: ToolDeclaration[]) => {
            if (requests >= options.maxRequests) return undefined;
            requests++;
            const result = await probe(binary, root, request, label, system, tools, signal);
            probes.push(result);
            return result.status;
        };
        const result = await runComparisons(request, run, options.bisect);
        return { ...result, status: signal.aborted ? "interrupted" : result.status, model: request.model, thinking: request.thinking, requests, probes };
    } finally {
        try { await capture?.close(); } finally { await rm(root, { recursive: true, force: true }); }
    }
}

type Runner = (label: string, system: string, tools: ToolDeclaration[]) => Promise<ProbeResult["status"] | undefined>;
async function runComparisons(request: CapturedRequest, run: Runner, bisect: boolean) {
    const baseline = await run("neutral-no-tools", neutral, []);
    if (baseline !== "ok") return { status: "non_comparable" };
    const systemResult = await run("captured-no-tools", request.system, []);
    if (!systemResult || !["ok", "429", "400"].includes(systemResult)) return { status: "non_comparable" };
    const toolResult = await run("neutral-captured-tools", neutral, request.tools);
    if (!toolResult || !["ok", "429", "400"].includes(toolResult)) return { status: "non_comparable" };
    if (bisect && systemResult === "429") return bisectSystem(request, run);
    return { status: "complete" };
}

async function bisectSystem(request: CapturedRequest, run: Runner) {
    const lines = request.system.split("\n");
    let start = 0;
    let end = lines.length;
    while (end - start > 1) {
        const middle = start + Math.ceil((end - start) / 2);
        const left = await run("bisect-left", lines.slice(start, middle).join("\n"), []);
        if (left === undefined) return { status: "budget_exhausted" };
        if (left === "429") { end = middle; continue; }
        if (left !== "ok") return { status: "non_comparable" };
        const right = await run("bisect-right", lines.slice(middle, end).join("\n"), []);
        if (right === undefined) return { status: "budget_exhausted" };
        if (right === "429") { start = middle; continue; }
        return { status: right === "ok" ? "interaction" : "non_comparable" };
    }
    return { status: "complete", narrowed: { startLine: start + 1, endLine: end, characters: lines.slice(start, end).join("\n").length } };
}
