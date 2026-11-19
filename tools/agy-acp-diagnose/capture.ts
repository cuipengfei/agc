import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { createServer, type Socket } from "node:net";
import { join, isAbsolute, resolve } from "node:path";
import { socketStream } from "./bridge";
import type { CapturedRequest } from "./types";
import { parseTools, record, text } from "./validation";

export interface CaptureSession {
    captured: CapturedRequest;
    close(): Promise<void>;
}

function parseCapture(value: unknown): CapturedRequest {
    const message = record(value);
    if (message.method !== "captured") throw new Error("invalid capture");
    const params = record(message.params);
    const geminiDir = text(params.geminiDir);
    if (!isAbsolute(geminiDir)) throw new Error("invalid capture directory");
    return { system: text(params.system), cwd: text(params.cwd), model: text(params.model), thinking: text(params.thinking), geminiDir, tools: parseTools(params.tools) };
}

function readProfile(): string | undefined {
    const profile = (process.env.OMP_PROFILE ?? process.env.PI_PROFILE ?? "").trim();
    if (!profile || profile === "default") return;
    if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(profile)) throw new Error("invalid OMP profile");
    return profile;
}

async function isolateState(root: string): Promise<string> {
    const namedProfile = readProfile();
    const agentDir = process.env.PI_CODING_AGENT_DIR;
    const defaultDir = join(homedir(), process.env.PI_CONFIG_DIR || ".omp", "agent");
    if (!namedProfile && agentDir && resolve(agentDir) !== defaultDir) throw new Error("custom agent directory cannot isolate state");
    await mkdir(namedProfile ? join(root, "state/omp/profiles", namedProfile) : join(root, "state/omp"), { recursive: true, mode: 0o700 });
    return agentDir ?? defaultDir;
}

export async function captureRequest(root: string, model: string, thinking: string, signal: AbortSignal): Promise<CaptureSession> {
    signal.throwIfAborted();
    const agentDir = await isolateState(root);
    const path = join(root, "control.sock");
    const server = createServer();
    const accepted = Promise.withResolvers<Socket>();
    server.once("connection", socket => accepted.resolve(socket));
    server.listen(path);
    await once(server, "listening");
    const executable = Bun.which("omp");
    if (!executable) {
        server.close();
        throw new Error("OMP unavailable");
    }
    let child;
    try {
        child = Bun.spawn([executable, "--no-session", "--no-title", "--no-judge", "--no-spotlight", "--model", model, "--thinking", thinking, "-p", "Say OK only."], {
            cwd: process.cwd(), stdin: "ignore", stdout: "ignore", stderr: "ignore",
            env: { ...process.env, PI_CODING_AGENT_DIR: agentDir, PI_AGY_PATH: join(import.meta.dir, "capture-agent.ts"), AGY_DIAG_SOCKET: path, XDG_STATE_HOME: join(root, "state") },
        });
    } catch (error) {
        server.close();
        throw error;
    }
    const timeout = setTimeout(() => accepted.reject(new Error("capture timeout")), 60_000);
    void child.exited.then(() => accepted.reject(new Error("OMP exited before capture")));
    const cancellation = Promise.withResolvers<never>();
    const interrupt = () => cancellation.reject(new Error("capture interrupted"));
    signal.addEventListener("abort", interrupt, { once: true });
    if (signal.aborted) interrupt();
    let socket: Socket | undefined;
    try {
        socket = await Promise.race([accepted.promise, cancellation.promise]);
        clearTimeout(timeout);
        const stream = socketStream(socket);
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        const deadline = Promise.withResolvers<never>();
        const captureTimeout = setTimeout(() => deadline.reject(new Error("capture timeout")), 60_000);
        const response = await Promise.race([
            reader.read(),
            child.exited.then(() => { throw new Error("OMP exited before capture"); }),
            deadline.promise,
            cancellation.promise,
        ]).finally(() => clearTimeout(captureTimeout));
        if (response.done) throw new Error("capture ended early");
        const captured = parseCapture(response.value);
        return {
            captured,
            async close() {
                try { await writer.write({ jsonrpc: "2.0", method: "release" }); } catch { /* 进程退出时仍需释放资源。 */ }
                writer.releaseLock();
                reader.releaseLock();
                socket?.destroy();
                server.close();
                const deadline = setTimeout(() => child.kill("SIGKILL"), 2000);
                try { await child.exited; } finally { clearTimeout(deadline); }
            },
        };
    } catch (error) {
        clearTimeout(timeout);
        socket?.destroy();
        server.close();
        child.kill();
        await child.exited;
        throw error;
    } finally {
        signal.removeEventListener("abort", interrupt);
    }
}