import { homedir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionContext, ToolCallEvent, ToolCallEventResult } from "@oh-my-pi/pi-coding-agent";
import { normalizePathLikeInput, resolveReadPath, resolveSyscallTarget, splitDelimitedPathEntry, splitPathAndSelPreferringLiteral } from "@oh-my-pi/pi-coding-agent/tools/path-utils";

async function canonical(candidate: string): Promise<string> {
    const resolved = await resolveSyscallTarget(candidate, true);
    if (resolved === null) throw new Error("unable to resolve path");
    return resolved;
}

const protectedPaths = [
    ".omp/agent/mcp.json",
    ".omp/agent/.env",
    ".omp/agent/auth.json",
    ".omp/agent/models.yml",
    ".codex/auth.json",
    ".prime/agent/auth.json",
    ".local/share/opencode/auth.json",
].map(item => path.join(homedir(), item));
const agyMcpCommand = /(?:^|[;&|])\s*(?:env\s+(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*)?(?:[^\s;&|]*\/)?agy\s+mcp\s+(?:list|add)(?=$|[\s;&|])/;
const reason = "已阻断可能输出凭据的操作。查看 OMP MCP 服务状态，请在 AGC 仓库运行 bun tools/agy-acp-diagnose/cli.ts mcp-status。";


async function protectedInput(input: string, cwd: string): Promise<boolean> {
    const targets = await Promise.all(protectedPaths.map(canonical));
    const normalized = normalizePathLikeInput(input);
    const candidates = (await splitDelimitedPathEntry(normalized, cwd)) ?? [normalized];
    for (const candidate of candidates) {
        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate) && !candidate.startsWith("file://")) continue;
        const raw = candidate.startsWith("file://") ? fileURLToPath(candidate) : candidate;
        const clean = (await splitPathAndSelPreferringLiteral(raw, cwd)).path;
        if (targets.includes(await canonical(resolveReadPath(clean, cwd)))) return true;
    }
    return false;
}

function guardCommand(input: unknown): ToolCallEventResult | void {
    if (input && typeof input === "object" && "command" in input && typeof input.command === "string" && agyMcpCommand.test(input.command)) return { block: true, reason };
}

function readInputPath(input: unknown): string | undefined {
    if (!input || typeof input !== "object" || !("path" in input) || typeof input.path !== "string" || !input.path) return;
    return input.path;
}

async function guard(event: ToolCallEvent, ctx: ExtensionContext): Promise<ToolCallEventResult | void> {
    if (event.toolName === "bash") return guardCommand(event.input);
    if (event.toolName !== "read" && event.toolName !== "grep") return;
    const input = readInputPath(event.input);
    if (!input) return;
    try {
        if (await protectedInput(input, ctx.cwd)) return { block: true, reason };
    } catch {
        return { block: true, reason: "无法安全确认读取目标，已阻断该操作。" };
    }
}

export default function agySensitiveGuard(pi: ExtensionAPI): void {
    pi.on("tool_call", guard);
}
