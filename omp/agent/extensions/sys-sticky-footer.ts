import fs from "node:fs";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const STATUS_URL = "http://127.0.0.1:4139/api/status";
const POLL_MS = 5_000;
const STATUS_KEY = "sys-sticky-footer";

interface StickyInstance {
  headerSnapshot?: {
    premiumUsage?: {
      used?: number;
      total?: number;
    };
  };
}

interface StickyStatusPayload {
  instances?: StickyInstance[];
  totalNanoAiuSinceStart?: number;
}

let prevCpuBusy = 0;
let prevCpuTotal = 0;

function readCpuSnapshot(): { busy: number; total: number } {
  const stat = fs.readFileSync("/proc/stat", "utf8");
  const line = stat.split("\n").find((l) => l.startsWith("cpu "));
  if (!line) return { busy: 0, total: 0 };
  const parts = line.trim().split(/\s+/).slice(1).map(Number);
  const user = parts[0] || 0;
  const nice = parts[1] || 0;
  const system = parts[2] || 0;
  const idle = parts[3] || 0;
  const iowait = parts[4] || 0;
  const irq = parts[5] || 0;
  const softirq = parts[6] || 0;
  const steal = parts[7] || 0;
  const busy = user + nice + system + irq + softirq + steal;
  const total = busy + idle + iowait;
  return { busy, total };
}

async function readCpuRamText(): Promise<{ cpuPct: number; ramPct: number; ramText: string }> {
  let cur = readCpuSnapshot();
  let dBusy = cur.busy - prevCpuBusy;
  let dTotal = cur.total - prevCpuTotal;
  if (dTotal < 5) {
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, 100);
    await promise;
    cur = readCpuSnapshot();
    dBusy = cur.busy - prevCpuBusy;
    dTotal = cur.total - prevCpuTotal;
  }
  prevCpuBusy = cur.busy;
  prevCpuTotal = cur.total;
  const cpuPct = dTotal > 0 && dBusy >= 0 ? Math.round((dBusy * 100) / dTotal) : 0;

  const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
  let memTotalKb = 0;
  let memAvailKb = 0;
  for (const line of meminfo.split("\n")) {
    if (line.startsWith("MemTotal:")) {
      memTotalKb = parseInt(line.replace(/\D+/g, ""), 10) || 0;
    } else if (line.startsWith("MemAvailable:")) {
      memAvailKb = parseInt(line.replace(/\D+/g, ""), 10) || 0;
    }
  }
  const usedKb = Math.max(0, memTotalKb - memAvailKb);
  const ramPct = memTotalKb > 0 ? Math.trunc((usedKb * 100) / memTotalKb) : 0;
  const usedGb = (usedKb / 1048576).toFixed(1);
  const totalGb = (memTotalKb / 1048576).toFixed(0);
  return {
    cpuPct,
    ramPct,
    ramText: `${usedGb}/${totalGb}G(${ramPct}%)`,
  };
}

function fmtUsd(n: number): string {
  return (
    "$" +
    Number(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function computePipMetrics(payload: StickyStatusPayload): {
  todayLeft: string;
  todayUsed: string;
  leftVal: number | null;
  usedVal: number;
} {
  const instances = Array.isArray(payload.instances) ? payload.instances : [];
  const reporting = instances.filter((i) => {
    const u = i?.headerSnapshot?.premiumUsage;
    return u && Number.isFinite(Number(u.used)) && Number.isFinite(Number(u.total));
  });
  const quotaComplete = instances.length > 0 && reporting.length === instances.length;
  const totalUsedCredits = reporting.reduce(
    (s, i) => s + Number(i.headerSnapshot!.premiumUsage!.used),
    0,
  );
  const totalCapCredits = reporting.reduce(
    (s, i) => s + Number(i.headerSnapshot!.premiumUsage!.total),
    0,
  );
  const totalUsedUsd = totalUsedCredits * 0.01;
  const totalCapUsd = totalCapCredits * 0.01;
  const histUsd = Number(payload.totalNanoAiuSinceStart || 0) / 100_000_000_000;

  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let workdaysLeft = 0;
  for (let d = now.getDate(); d <= lastDay; d++) {
    const dow = new Date(now.getFullYear(), now.getMonth(), d).getDay();
    if (dow !== 0 && dow !== 6) workdaysLeft++;
  }
  workdaysLeft = Math.max(workdaysLeft, 1);

  const todayBudgetUsd = quotaComplete
    ? Math.max(0, totalCapUsd - totalUsedUsd) / workdaysLeft
    : null;
  const todayUsedUsd = histUsd;

  return {
    todayLeft: todayBudgetUsd === null ? "-" : fmtUsd(todayBudgetUsd),
    todayUsed: fmtUsd(todayUsedUsd),
    leftVal: todayBudgetUsd,
    usedVal: todayUsedUsd,
  };
}

export default function sysStickyFooter(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    if (!ctx.hasUI) return;

    const initCpu = readCpuSnapshot();
    prevCpuBusy = initCpu.busy;
    prevCpuTotal = initCpu.total;

    type FlashKey = "left" | "used" | "cpu" | "ram";
    type Metric = { text: string; color: "success" | "warning" | "error" };
    const FLASH_PHASES = 8;
    const FLASH_MS = 250;
    const lastText: Partial<Record<FlashKey, string>> = {};
    const latest: Partial<Record<FlashKey, Metric>> = {};
    const flashTicks = new Map<FlashKey, number>();
    let flashTimer: Timer | undefined;

    function renderLine(highlighted: ReadonlySet<FlashKey>): string {
      const theme = ctx.ui.theme;
      const styled = (key: FlashKey) => {
        const metric = latest[key]!;
        const value = theme.bold(theme.fg(metric.color, metric.text));
        return highlighted.has(key) ? theme.bg("selectedBg", value) : value;
      };
      const sysPart =
        `${theme.fg("muted", "CPU")} ${styled("cpu")}` +
        ` ${theme.fg("muted", "RAM")} ${styled("ram")}`;
      if (!latest.left || !latest.used) {
        return `󰓅 Left -- · 󰈸 Used -- · ${sysPart}`;
      }
      return (
        `${theme.fg("muted", "󰓅 Left")} ${styled("left")}` +
        ` ${theme.fg("muted", "· 󰈸 Used")} ${styled("used")}` +
        ` ${theme.fg("muted", "·")} ${sysPart}`
      );
    }

    function paint() {
      const highlighted = new Set<FlashKey>();
      for (const [key, ticks] of flashTicks) {
        if (ticks % 2 === 0) highlighted.add(key);
      }
      ctx.ui.setStatus(STATUS_KEY, renderLine(highlighted));
    }

    function ensureFlashTimer() {
      if (flashTimer || flashTicks.size === 0) return;
      flashTimer = ctx.setInterval(() => {
        for (const [key, ticks] of flashTicks) {
          if (ticks <= 1) flashTicks.delete(key);
          else flashTicks.set(key, ticks - 1);
        }
        if (flashTicks.size === 0 && flashTimer !== undefined) {
          ctx.clearTimer(flashTimer);
          flashTimer = undefined;
        }
        paint();
      }, FLASH_MS);
    }

    function track(key: FlashKey, metric: Metric) {
      if (lastText[key] !== undefined && lastText[key] !== metric.text) {
        flashTicks.set(key, FLASH_PHASES);
      }
      lastText[key] = metric.text;
      latest[key] = metric;
    }

    async function refresh() {
      const { cpuPct, ramPct, ramText } = await readCpuRamText();
      track("cpu", {
        text: `${cpuPct}%`,
        color: cpuPct >= 85 ? "error" : cpuPct >= 60 ? "warning" : "success",
      });
      track("ram", {
        text: ramText,
        color: ramPct >= 85 ? "error" : ramPct >= 70 ? "warning" : "success",
      });

      try {
        const res = await fetch(STATUS_URL, { signal: AbortSignal.timeout(3_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = (await res.json()) as StickyStatusPayload;
        const { todayLeft, todayUsed, leftVal, usedVal } = computePipMetrics(payload);

        let usedColor: "success" | "warning" | "error" = "success";
        if (leftVal !== null && leftVal > 0) {
          if (usedVal > leftVal) usedColor = "error";
          else if (usedVal >= leftVal * 0.8) usedColor = "warning";
        }
        track("left", { text: todayLeft, color: "success" });
        track("used", { text: todayUsed, color: usedColor });
      } catch {
        delete latest.left;
        delete latest.used;
      }
      ensureFlashTimer();
      paint();
    }

    void refresh();
    ctx.setInterval(refresh, POLL_MS);
  });

  pi.on("session_shutdown", (_event, ctx) => {
    if (!ctx.hasUI) return;
    ctx.ui.setStatus(STATUS_KEY, undefined);
  });
}
