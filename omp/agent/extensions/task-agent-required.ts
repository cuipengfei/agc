import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent"

export default function taskAgentReminder(pi: ExtensionAPI) {
  pi.on("tool_call", (event) => {
    if (event.toolName !== "task") return
    if (typeof event.input !== "object" || event.input === null || !("tasks" in event.input)) return

    const tasks = event.input.tasks
    if (!Array.isArray(tasks)) return

    const emptyItems = tasks.flatMap((item, index) => {
      if (typeof item !== "object" || item === null || !("agent" in item)) return []
      return typeof item.agent === "string" && !item.agent.trim() ? [index] : []
    })
    if (emptyItems.length > 0) {
      return {
        block: true,
        reason: `task-agent-policy：tasks[] 中索引为 ${emptyItems.join(", ")} 的 item 使用了空 agent`,
      }
    }

    const genericItems = tasks.flatMap((item, index) => {
      if (typeof item !== "object" || item === null || !("agent" in item)) return []
      return item.agent === "task" ? [index] : []
    })
    if (genericItems.length === 0) return

    pi.sendMessage(
      {
        customType: "task-agent-reminder",
        content: `tasks[] 中索引为 ${genericItems.join(", ")} 的 item 解析为 agent:"task"。调用前先读取 xd://task，仔细查看当前可用 agent 列表与各自描述，为这件工作选择最具体的那个；没有合适的专用 agent 时才保留 task。`,
        display: true,
        attribution: "agent",
      },
      { deliverAs: "nextTurn", triggerTurn: false },
    )
  })
}
