import { expect, test, vi } from "bun:test";
import { watch } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { probe } from "./probe";

const fixture = join(import.meta.dir, "fixtures/agy.ts");

test("超时单独报告并终止 agy 进程", async () => {
    const root = await mkdtemp("/dev/shm/agy-probe-test-");
    const ready = Promise.withResolvers<void>();
    const watcher = watch(root, (_event, name) => { if (name === "ready") ready.resolve(); });
    const previousHang = process.env.FAKE_HANG;
    const previousReady = process.env.FAKE_READY_PATH;
    const controller = new AbortController();
    process.env.FAKE_HANG = "1";
    process.env.FAKE_READY_PATH = join(root, "ready");
    vi.useFakeTimers();
    const pending = probe(fixture, root, { cwd: process.cwd(), geminiDir: root, model: "fixture-model", thinking: "medium", system: "", tools: [] }, "timeout", "You are a helpful coding assistant.", [], controller.signal);
    try {
        await ready.promise;
        vi.advanceTimersByTime(45_000);
        const result = await pending;
        expect(result.status).toBe("timeout");
    } finally {
        controller.abort();
        await pending.catch(() => {});
        vi.useRealTimers();
        watcher.close();
        if (previousHang === undefined) delete process.env.FAKE_HANG; else process.env.FAKE_HANG = previousHang;
        if (previousReady === undefined) delete process.env.FAKE_READY_PATH; else process.env.FAKE_READY_PATH = previousReady;
        await rm(root, { recursive: true, force: true });
    }
});
