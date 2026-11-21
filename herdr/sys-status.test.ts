import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectStatus, formatUsage } from "./sys-status";

const originalFetch = globalThis.fetch;
const originalRuntime = process.env.XDG_RUNTIME_DIR;
let directory: string | undefined;

const payload = {
  instances: [{ headerSnapshot: { premiumUsage: { used: 140300, total: 250000 } } }],
  totalNanoAiuSinceStart: 200_000_000_000,
};

async function isolateRuntime() {
  directory = await mkdtemp(join(tmpdir(), "herdr-status-test-"));
  process.env.XDG_RUNTIME_DIR = directory;
}

afterEach(async () => {
  globalThis.fetch = originalFetch;
  if (originalRuntime === undefined) delete process.env.XDG_RUNTIME_DIR;
  else process.env.XDG_RUNTIME_DIR = originalRuntime;
  if (directory) await rm(directory, { recursive: true });
  directory = undefined;
});

test("monthly working-day budget and cumulative dollars match the OMP figures", () => {
  expect(formatUsage(payload, new Date(2026, 10, 20))).toBe("Left $156.71 · Used $2.00");
  expect(formatUsage(payload, new Date(2026, 10, 21))).toBe("Left $182.83 · Used $2.00");
  expect(formatUsage(payload, new Date(2026, 0, 31))).toBe("Left $1,097.00 · Used $2.00");
});

test("incomplete quota reports do not display a partial budget", () => {
  expect(formatUsage({ ...payload, instances: [...payload.instances, {}] })).toBe("Left -- · Used $2.00");
  expect(formatUsage({ ...payload, instances: [] })).toBe("Left -- · Used $2.00");
});

test("invalid cumulative usage is rejected instead of displaying a dollar figure", () => {
  expect(() => formatUsage({ instances: payload.instances })).toThrow("invalid cumulative usage");
  expect(() => formatUsage({ ...payload, totalNanoAiuSinceStart: -1 })).toThrow("invalid cumulative usage");
});

test("a fresh process can reuse CPU counters and recover counters from a prior boot", async () => {
  await isolateRuntime();
  globalThis.fetch = async () => new Response(JSON.stringify(payload));
  const first = await collectStatus();
  expect(first).toMatch(/^Left \$[\d,.]+ · Used \$2\.00 · CPU \d+% · RAM \d+\.\d\/\d+G\(\d+%\)$/);
  expect(first).not.toContain("\x1b");
  await Bun.write(join(directory!, "herdr-sys-status", "cpu.json"), JSON.stringify({ busy: 1e18, total: 1e18 }));
  const recovered = await collectStatus();
  const cpu = Number(/CPU (\d+)%/.exec(recovered)![1]);
  expect(cpu).toBeGreaterThanOrEqual(0);
  expect(cpu).toBeLessThanOrEqual(100);
  expect(recovered).toContain("Used $2.00");
});

test("HTTP and transport failures preserve real CPU and RAM readings", async () => {
  await isolateRuntime();
  globalThis.fetch = async () => new Response("unavailable", { status: 503 });
  expect(await collectStatus()).toMatch(/^Left -- · Used -- · CPU \d+% · RAM \d+\.\d\/\d+G\(\d+%\)$/);
  globalThis.fetch = async () => { throw new Error("connection refused"); };
  expect(await collectStatus()).toMatch(/^Left -- · Used -- · CPU \d+% · RAM \d+\.\d\/\d+G\(\d+%\)$/);
});
