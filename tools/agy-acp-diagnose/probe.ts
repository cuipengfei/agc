import { join } from "node:path";
import { acp, bunInstall, McpBridge } from "./runtime";
import type { CapturedRequest, ProbeResult, ProbeStatus, ToolDeclaration } from "./types";

function classify(text: string): ProbeStatus | undefined {
    if (/RESOURCE_EXHAUSTED|\b429\b/i.test(text)) return "429";
    if (/INVALID_ARGUMENT|\b400\b/i.test(text)) return "400";
    if (/No capacity|\b503\b|UNAVAILABLE/i.test(text)) return "503";
    if (/ECONNRESET|ECONNREFUSED|ETIMEDOUT|network error|fetch failed|\bEOF\b/i.test(text)) return "network";
}

function sessionUpdates(finish: (status: ProbeStatus) => void) {
    let recent = "";
    return (notice: { update: { sessionUpdate?: string; content?: { type?: string; text?: string } } }) => {
        const update = notice.update;
        if (update.sessionUpdate !== "agent_message_chunk" || update.content?.type !== "text" || typeof update.content.text !== "string") return;
        recent = (recent + update.content.text).slice(-4096);
        const status = classify(recent);
        if (status) finish(status);
    };
}

async function runSession(connection: InstanceType<typeof acp.ClientSideConnection>, request: CapturedRequest, system: string): Promise<ProbeStatus> {
    await connection.initialize({ protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false }, clientInfo: { name: "bridge", title: "Host tool bridge", version: "1" } });
    const session = await connection.newSession({ cwd: request.cwd, mcpServers: [], _meta: { antigravity: { systemPrompt: { append: system } } } });
    await connection.setSessionConfigOption({ sessionId: session.sessionId, configId: "model", value: request.model });
    await connection.setSessionConfigOption({ sessionId: session.sessionId, configId: "thought_level", value: request.thinking });
    const response = await connection.prompt({ sessionId: session.sessionId, prompt: [{ type: "text", text: "Say OK only." }] });
    return response.stopReason === "end_turn" ? "ok" : "protocol_error";
}

export async function probe(binary: string, root: string, request: CapturedRequest, label: string, system: string, tools: ToolDeclaration[], signal: AbortSignal): Promise<ProbeResult> {
    const started = Date.now();
    const completed = Promise.withResolvers<ProbeStatus>();
    let settled = false;
    let killChild: (() => void) | undefined;
    let exited: Promise<number> | undefined;
    const finish = (status: ProbeStatus) => {
        if (settled) return;
        settled = true;
        completed.resolve(status);
        if (status !== "ok") killChild?.();
    };
    const bridge = new McpBridge(tools, async () => {
        setTimeout(() => finish("unexpected_tool_call"), 0);
        return { content: [{ type: "text", text: "Tool execution is disabled during diagnosis." }], isError: true };
    });
    const interrupt = () => finish("interrupted");
    signal.addEventListener("abort", interrupt, { once: true });
    if (signal.aborted) interrupt();
    const timer = setTimeout(() => finish("timeout"), 45_000);
    try {
        if (settled) return { label, status: "interrupted", tools: tools.length, milliseconds: Date.now() - started };
        const proc = Bun.spawn([binary, "acp", "--agent", "bridge", "--gemini-dir", join(root, "gemini"), "--ide-mcp-port", String(bridge.port), "--dangerously-skip-permissions"], {
            cwd: request.cwd, stdin: "pipe", stdout: "pipe", stderr: "ignore",
            env: { ...process.env, HOME: root, TMPDIR: root, XDG_CONFIG_HOME: join(root, "config"), XDG_CACHE_HOME: join(root, "cache"), XDG_STATE_HOME: join(root, "state"), BUN_INSTALL: bunInstall, SSH_TTY: "omp-agy-file-auth", AGY_CLI_DISABLE_AUTO_UPDATE: "1" },
        });
        killChild = () => { proc.kill("SIGKILL"); };
        exited = proc.exited;
        const input = new WritableStream<Uint8Array>({
            async write(chunk) { proc.stdin.write(chunk); await proc.stdin.flush(); },
            async close() { await proc.stdin.end(); },
        });
        const connection = new acp.ClientSideConnection(() => ({
            requestPermission: () => ({ outcome: { outcome: "cancelled" } }),
            sessionUpdate: sessionUpdates(finish),
        }), acp.ndJsonStream(input, proc.stdout));
        void runSession(connection, request, system).then(finish, (error: unknown) => finish(classify(error instanceof Error ? error.message : "") ?? "protocol_error"));
        void proc.exited.then(() => finish("network"));
        const status = await completed.promise;
        return { label, status, tools: tools.length, milliseconds: Date.now() - started };
    } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", interrupt);
        killChild?.();
        bridge.close();
        await exited;
    }
}
