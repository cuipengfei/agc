# OMP Notifications、Idle Recap、Unexpected Stops 与 Agent Reactions 源码取证

> Source: can1357/oh-my-pi 已安装包 `@oh-my-pi/pi-coding-agent` v18.1.18（`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/`）
> Published: Unknown

## 版本与范围

本机 OMP 版本 `18.1.18`（`package.json:4`）。
本 raw 覆盖 9 项设置/功能：Completion Notification、Error Notification、Ask Timeout、Ask Notification、Idle Recap、Idle Recap Delay、Unexpected Stops（Mechanical/Smart/None）、Smart 分类器模型、Agent Reactions。

## 源码锚点

### Notifications 区 schema

- `settings-schema.ts:2400` — `completion.notify`：enum `on/off`，默认 `on`
- `settings-schema.ts:2412` — `error.notify`：enum `on/off`，默认 `off`
- `settings-schema.ts:2424` — `ask.timeout`：number，默认 `0`
- `settings-schema.ts:2442` — `ask.notify`：enum `on/off`，默认 `on`
- `settings-schema.ts:2454` — `recap.enabled`：boolean，默认 `true`
- `settings-schema.ts:2465` — `recap.idleSeconds`：number，默认 `240`，UI 离散值 `60/120/240/300/600`，代码 clamp 到 `1-3600`

### Notifications 发送机制

- `event-controller.ts:1979-1982` — `#handleAgentEnd` 中 `this.sendErrorNotification(event)` / `this.sendCompletionNotification(event)` 调用
- `event-controller.ts:2404` — `sendErrorNotification()` 定义：检查 retry pending、读 `error.notify`、从 messages 取最后 assistant 确认 `stopReason === "error"`，构造 `TERMINAL.sendNotification()`
- `event-controller.ts:2448` — `sendCompletionNotification()` 定义：读 `completion.notify`，构造 `TERMINAL.sendNotification()`
- `ask.ts:858` — Ask Notification：每次 `ask` 执行时，读 `settings.get("ask.notify")`，若 `method !== "off" && hasUI`，调用 `TERMINAL.sendNotification()`
- `ask.ts:970` — Ask Timeout 读取：`settings.get("ask.timeout")` returns seconds (0 = disabled), convert to ms
- `ask.ts:183-186` — `getAutoSelectionOnTimeout()`：取 recommended 索引对应选项，无推荐则首项
- `ask.ts:713,721` — 超时选择调用点：无用户选择且无自定义输入时调用 `getAutoSelectionOnTimeout()`

### 通知路由

- `pi-tui/src/terminal-capabilities.ts:214` — `TERMINAL.sendNotification` 定义
- `pi-tui/src/desktop-notify.ts:14-16,32,57,86-99` — Linux D-Bus 桌面通知兜底：`notify-send` 优先，`gdbus` fallback

### Idle Recap

- `event-controller.ts:1980` — `#handleAgentEnd` 中 `this.#scheduleIdleRecap()` 调用
- `event-controller.ts:2293` — `#cancelIdleRecap()` 定义
- `event-controller.ts:2334-2335` — `#scheduleIdleRecap()` 定义：先 cancel 再设 setTimeout
- `event-controller.ts:2334-2382` — `#scheduleIdleRecap()` / `#runIdleRecap()` 完整逻辑：空闲检查 → `runEphemeralTurn` 生成摘要 → TUI status line 显示 `※ recap: <text>`
- `event-controller.ts:350,757,881,2027,2062` — `#cancelIdleRecap()` 各调用点（打字、新 agent 开始等）

### Unexpected Stops

- `settings-schema.ts:5802` — `features.unexpectedStopDetection`：enum `none/mechanical/smart`，默认 `mechanical`
- `settings-schema.ts:5827` — `providers.unexpectedStopModel`：enum，默认 online TINY/smol
- `turn-recovery.ts:72` — `UNEXPECTED_STOP_MAX_RETRIES = 3`
- `turn-recovery.ts:73` — `UNEXPECTED_STOP_TIMEOUT_MS = 4000`
- `turn-recovery.ts:903` — `#handleUnexpectedAssistantStop()` 定义
- `turn-recovery.ts:908` — `isUnexpectedStopCandidate(assistantMessage)` 调用
- `turn-recovery.ts:921` — 注释：`isUnexpectedStopCandidate` 排除含 toolCall 的消息
- `turn-recovery.ts:935-947` — Smart 分类器：`setTimeout(() => controller.abort(), UNEXPECTED_STOP_TIMEOUT_MS)` 超时 4s
- `turn-recovery.ts:957-965` — 重试上限检查：`#unexpectedStopRetryCount > UNEXPECTED_STOP_MAX_RETRIES` 时放弃
- `unexpected-stop-classifier.ts:44` — `isUnexpectedStopCandidate()` 定义：要求 `stopReason === "stop"`、无 `toolCall`、且有可见 text 或 signed thinking

### 独立空输出恢复

- `turn-recovery.ts:74` — `EMPTY_STOP_MAX_RETRIES = 3`
- `turn-recovery.ts:818` — `#handleEmptyAssistantStop()` 定义
- `turn-recovery.ts:832-878` — 空输出重试检查与 terminal 分支：`#emptyStopRetryCount > EMPTY_STOP_MAX_RETRIES` 时停止并报错
- `turn-recovery.ts:489-490` — `handleEmptyAssistantStop()` 公开方法
- `agent-session.ts:3453` — `agent-session` 调用 `#recovery.handleEmptyAssistantStop(msg)`

### Agent Reactions

- `settings-schema.ts:1233` — `tui.reactions`：boolean，默认 `true`
- `sdk.ts:3215` — `reactions: agentKind === "main" && options.hasUI === true && settings.get("tui.reactions")`
- `system-prompt.ts:661` — `reactions?: boolean` 参数定义
- `system-prompt.ts:1026` — `reactions` 参数注入系统提示
- `prompts/system/system-prompt.md:19` — `{{#if reactions}}` 条件模板
- `reaction.ts:14-15` — `ReactionTarget` 接口：`setReaction(emoji: string)`
- `reaction.ts:48` — `splitReaction(text: string)` 提取开头 emoji
- `assistant-message.ts:314` — `pickReactionTarget()` 定义
- `assistant-message.ts:335` — `splitReaction(block.text)` 调用
- `assistant-message.ts:343` — `#displayMessage()` 定义
- `assistant-message.ts:351` — `this.#reactionTarget?.setReaction(split.emoji)` 渲染器设置 badge

## 当前配置值（`~/.omp/agent/config.yml`）

| Key | 当前值 | 默认值 |
|---|---|---|
| `completion.notify` | `on` | `on` |
| `error.notify` | `on` | `off` |
| `ask.timeout` | `0` | `0` |
| `ask.notify` | `on` | `on` |
| `recap.enabled` | `true` | `true` |
| `recap.idleSeconds` | `300` | `240` |
| `features.unexpectedStopDetection` | `mechanical` | `mechanical` |
| `tui.reactions` | `true`（显式） | `true` |

## 未验证项

1. Smart 分类器实际准确率 — 未做 A/B 测试
2. 截图中出现的 per-prompt None/Mechanical/Smart 配置 — 本机不存在该结构
3. `tui.reactions: false` 后渲染器是否仍处理偶然 emoji — 源码显示渲染层无 setting gate，但未实测
