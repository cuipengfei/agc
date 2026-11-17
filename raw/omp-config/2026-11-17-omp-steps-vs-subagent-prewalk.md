# OMP task.steps 与子 Agent Prewalk 的交互机制核查

> Source: OMP @oh-my-pi/pi-coding-agent 18.22.0 本机安装包源码（/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src）；本会话源码阅读记录
> Collected: 2026-11-17
> Published: Unknown

## 用户问题

OMP 的 `task` 工具支持 `steps`（多步骤派发）。在子 Agent 开启自动 Prewalk 的情况下，`steps` 与 Prewalk 如何交互？是每一步都 Prewalk 一次，还是只对整个任务做一次？

## 源码事实（OMP 18.22.0）

1. `task/index.ts:650-652` 的 `spawnAssignment`：spawn 的 `assignment` 为 `item.task` 的全文，或 `renderStepsBrief(item.steps)`（`src/task/steps.ts:92-95` + `src/prompts/system/subagent-steps-brief.md:1-4`，模板为 `## Step N` + 每步原文）。
2. `src/task/structured-subagent.ts:747-758`：`steps = renderStepPrompts(request.steps, policy.structured)` 打包成最多 4 条 prompt；首条 prompt 作为子 Agent 初始用户消息；完整 `steps` 列表另传给执行器；`assignment: request.assignment.trim()` 原样透传。
3. `src/task/executor.ts:5113`：`judgeSubagentAutoPrewalk(assignment?.trim() || task, agent.name, ...)` 将 `assignment` 交给 judge。因此使用 `steps` 时，judge 看到的是包含全部步骤的 `assignment`（来自 `spawnAssignment`），不是首个 `steps[0]`，也不是 `options.steps.join("\n")`。
4. Prewalk arm 生命周期（`src/task/executor.ts:5100-5128` + `src/session/prewalk.ts:345-423`）：judge 在子 Agent 启动时只执行一次；arm 之后状态挂在该子 Agent 会话上。
5. steps 推进（`src/task/executor.ts:2941-2957`）：后续 prompt 逐步投递进同一会话；Prewalk 的 plan nudge 与 checklist 只跟随首个 `edit`/`write` 切换点，后续步骤不再触发新的 judge。
6. 共享 `context` 与 `solutionSpace` 不进入本次 judge 输入。

## 结论

- **不是每一步都 Prewalk 一次**。judge 在一次子 Agent spawn 时基于包含全部步骤的 `assignment` 判一次。
- steps 按序送入同一会话；todo gate 打开后首个合格 `edit`/`write` 结果触发一次切换，后续步骤沿用切换后的模型。
- 主 Agent 若希望影响判断，应把关键约束写进 `steps` 或 `task` 文本本身。

## 证据边界

- 以上行号基于本机 OMP 18.22.0 安装包（/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src），尚未在真实多步 `task` 调用上运行冒烟。
