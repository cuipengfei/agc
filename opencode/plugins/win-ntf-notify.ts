import type { Plugin } from "@opencode-ai/plugin"

// win-ntf-notify — forwards opencode session events to the resident win-ntf
// Windows notification host (POST 127.0.0.1:9876/notify).
//
// Replaces oc-tweaks' built-in notify (disabled via oc-tweaks.json
// notify.enabled=false). Notifies only on moments that need my attention:
//   - session.idle        -> "idle, waiting for input"  (no agent message)
//   - session.error       -> error, with detail if available
//   - permission.asked /
//     permission.updated /
//     question.asked      -> agent is blocked waiting for my approval
//
// Every notification carries project + full directory so parallel sessions
// are distinguishable. Agent hook notifications auto-dismiss after 20 seconds.
// Host offline -> silent no-op (never breaks session).

const NOTIFY_URL = "http://127.0.0.1:9876/notify"

type Variant = "info" | "success" | "warning" | "error" | "tool"

interface NotifyPayload {
  title: string
  text: string
  variant: Variant
  durationMs: number
}

export const WinNtfNotifyPlugin: Plugin = async ({ directory, project, client }) => {
  const projectName = pickProjectName(directory, project)

  async function notify(variant: Variant, headline: string, detail?: string) {
    const text = detail && detail.trim().length > 0
      ? `${headline}\n${detail.trim()}`
      : headline

    const payload: NotifyPayload = {
      title: `oc: ${projectName}`,
      text,
      variant,
      durationMs: 20_000,
    }

    try {
      await fetch(NOTIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000),
      })
    } catch {
      // host offline or slow — silently ignore, never break the session
    }
  }

  return {
    event: async ({ event }: { event: { type: string; properties?: unknown } }) => {
      const type = event?.type
      const props = (event?.properties ?? {}) as Record<string, unknown>

      if (type === "session.idle") {
        if (await isChildSession(client, props)) return
        await notify("info", "空闲，等待你的输入")
        return
      }

      if (type === "session.error") {
        await notify("error", "会话出错", extractErrorDetail(props))
        return
      }

      // Agent blocked waiting for my approval. Match both v1 (permission.updated)
      // and v2 (permission.asked) plus question.asked for version safety.
      if (
        type === "permission.asked" ||
        type === "permission.updated" ||
        type === "question.asked"
      ) {
        await notify("warning", "等待审批 / 需要确认", extractApprovalDetail(props))
        return
      }
    },
  }
}

async function isChildSession(client: { session?: { get?: (options: { path: { id: string } }) => Promise<{ data?: { parentID?: string } }> } }, props: Record<string, unknown>): Promise<boolean> {
  const sessionID = props.sessionID
  if (typeof sessionID !== "string" || sessionID.trim().length === 0) return false

  try {
    const result = await client.session?.get?.({ path: { id: sessionID } })
    return typeof result?.data?.parentID === "string" && result.data.parentID.length > 0
  } catch {
    return false
  }
}

function pickProjectName(directory: string, project: unknown): string {
  const p = project as { id?: string; worktree?: string } | undefined
  const base = p?.worktree ?? directory ?? ""
  const normalized = base.replace(/\\/g, "/")
  const segments = normalized.split("/").filter(Boolean)
  return segments[segments.length - 1] || "opencode"
}

function extractErrorDetail(props: Record<string, unknown>): string | undefined {
  const error = props.error as
    | { name?: string; data?: { message?: string } }
    | undefined
  if (!error) return undefined
  return error.data?.message ?? error.name ?? undefined
}

function extractApprovalDetail(props: Record<string, unknown>): string | undefined {
  // v1 EventPermissionUpdated.properties.title; v2 PermissionRequest.permission
  const title = props.title
  if (typeof title === "string" && title.trim().length > 0) return title
  const permission = props.permission
  if (typeof permission === "string" && permission.trim().length > 0) return permission
  return undefined
}
