import fs from "node:fs";
import { mkdir, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface CpuSnapshot {
  busy: number;
  total: number;
}

interface StatusPayload {
  instances?: { headerSnapshot?: { premiumUsage?: { used?: number; total?: number } } }[];
  totalNanoAiuSinceStart?: number;
}

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function readCpuSnapshot(): CpuSnapshot {
  const line = fs.readFileSync("/proc/stat", "utf8").split("\n", 1)[0];
  const [name, user, nice, system, idle, iowait, irq, softirq, steal] = line.trim().split(/\s+/);
  const busy = Number(user) + Number(nice) + Number(system) + Number(irq) + Number(softirq) + Number(steal);
  const total = busy + Number(idle) + Number(iowait);
  if (name !== "cpu" || !Number.isFinite(total)) throw new Error("invalid /proc/stat CPU counters");
  return { busy, total };
}

export function formatUsage(payload: StatusPayload, now = new Date()) {
  const nano = payload.totalNanoAiuSinceStart;
  if (typeof nano !== "number" || !Number.isFinite(nano) || nano < 0) {
    throw new Error("invalid cumulative usage");
  }
  const instances = payload.instances;
  let left = "--";
  if (Array.isArray(instances) && instances.length > 0) {
    let used = 0;
    let cap = 0;
    let complete = true;
    for (const instance of instances) {
      const usage = instance?.headerSnapshot?.premiumUsage;
      if (typeof usage?.used !== "number" || !Number.isFinite(usage.used) || usage.used < 0 ||
          typeof usage.total !== "number" || !Number.isFinite(usage.total) || usage.total < 0) {
        complete = false;
        break;
      }
      used += usage.used;
      cap += usage.total;
    }
    if (complete) {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      let workdays = 0;
      for (let day = now.getDate(); day <= lastDay; day++) {
        const weekday = new Date(now.getFullYear(), now.getMonth(), day).getDay();
        if (weekday !== 0 && weekday !== 6) workdays++;
      }
      left = dollars.format(Math.max(0, cap - used) * 0.01 / Math.max(1, workdays));
    }
  }
  return `Left ${left} · Used ${dollars.format(nano / 100_000_000_000)}`;
}

export async function collectStatus() {
  const directory = join(process.env.XDG_RUNTIME_DIR || join(tmpdir(), `herdr-${process.getuid!()}`), "herdr-sys-status");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const cache = Bun.file(join(directory, "cpu.json"));
  let current = readCpuSnapshot();
  let previous: CpuSnapshot = current;
  if (await cache.exists()) {
    previous = await cache.json();
    if (!Number.isFinite(previous.busy) || !Number.isFinite(previous.total)) {
      throw new Error("invalid cached CPU counters");
    }
  }
  if (current.total - previous.total < 5 || current.busy < previous.busy) {
    previous = current;
    await Bun.sleep(100);
    current = readCpuSnapshot();
  }
  const elapsed = current.total - previous.total;
  const cpu = elapsed > 0 ? Math.round((current.busy - previous.busy) * 100 / elapsed) : 0;
  const temporary = `${cache.name}.${process.pid}.tmp`;
  await Bun.write(temporary, JSON.stringify(current));
  await rename(temporary, cache.name!);

  const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
  const total = Number(/^MemTotal:\s+(\d+)/m.exec(meminfo)?.[1]);
  const available = Number(/^MemAvailable:\s+(\d+)/m.exec(meminfo)?.[1]);
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(available)) {
    throw new Error("invalid /proc/meminfo memory counters");
  }
  const used = Math.max(0, total - available);
  const ram = `${(used / 1048576).toFixed(1)}/${(total / 1048576).toFixed(0)}G(${Math.trunc(used * 100 / total)}%)`;

  let usage = "Left -- · Used --";
  try {
    const response = await fetch("http://127.0.0.1:4139/api/status", { signal: AbortSignal.timeout(3_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    usage = formatUsage(await response.json());
  } catch {
    // 额度接口不可用时仍显示本机 CPU 和 RAM。
  }
  return `${usage} · CPU ${cpu}% · RAM ${ram}`;
}

if (import.meta.main) console.log(await collectStatus());
