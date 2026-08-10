// win-ntf-notify.ts — OMP extension mirroring Claude Code / Codex / OpenCode win-ntf hooks.
// Forwards lifecycle events to win-ntf WPF popup via POST 127.0.0.1:9876/notify.
//
// Events (aligned with Claude Code / Codex / OpenCode):
//   tool_call(ask) → warning popup "需要你回答问题"
//   agent_end      → info popup "空闲，等待你的输入" (debounced, guarded)
//
// Guards (mirrors herdr-omp-agent-state.ts):
//   - rootSession: only fire in the UI root session
//   - agentActive: prevent duplicate/late agent_end from false-firing idle
//
// Host offline → silent no-op (never blocks session).
// @ts-nocheck

const NOTIFY_URL = "http://127.0.0.1:9876/notify";
const NOTIFY_TIMEOUT_MS = 3000;
const POPUP_DURATION_MS = 20000;
const IDLE_DEBOUNCE_MS = 250;

interface WinNtfPayload {
  title: string;
  text: string;
  variant: "info" | "warning" | "error";
  durationMs: number;
}

async function sendWinNtf(payload: WinNtfPayload): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS);
    timer.unref?.();
    await fetch(NOTIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch {
    // Host offline or unreachable — silent no-op
  }
}

function projectFromCwd(cwd: string | undefined): string {
  if (!cwd) return "omp";
  const parts = cwd.replace(/\/+$/, "").split("/");
  return parts[parts.length - 1] || "omp";
}

export default function (pi: ExtensionAPI) {
  let rootSession = false;
  let agentActive = false;
  let idleTimer: NodeJS.Timeout | undefined;

  function clearIdleTimer() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = undefined;
    }
  }

  pi.on("session_start", (_event, ctx) => {
    if (ctx?.hasUI !== true) return;
    rootSession = true;
  });

  pi.on("agent_start", () => {
    if (!rootSession) return;
    clearIdleTimer();
    agentActive = true;
  });

  pi.on("tool_call", async (event, ctx) => {
    if (!rootSession) return;
    if (event.toolName !== "ask") return;
    clearIdleTimer();
    const project = projectFromCwd(ctx?.cwd);
    await sendWinNtf({
      title: `omp: ${project}`,
      text: "需要你回答问题",
      variant: "warning",
      durationMs: POPUP_DURATION_MS,
    });
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (!rootSession) return;
    if (!agentActive) return;
    agentActive = false;
    clearIdleTimer();
    idleTimer = setTimeout(() => {
      idleTimer = undefined;
      const project = projectFromCwd(ctx?.cwd);
      void sendWinNtf({
        title: `omp: ${project}`,
        text: "空闲，等待你的输入",
        variant: "info",
        durationMs: POPUP_DURATION_MS,
      });
    }, IDLE_DEBOUNCE_MS);
    idleTimer.unref?.();
  });

  pi.on("session_shutdown", () => {
    if (!rootSession) return;
    clearIdleTimer();
    rootSession = false;
    agentActive = false;
  });
}

