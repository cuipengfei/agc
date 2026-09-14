# OMP streaming edit 预览失败守卫：abort 结算、F5 manual-retry 与自动 retry 排除范围

> Source: 本机安装的 @oh-my-pi/pi-coding-agent@18.1.21 源码阅读
> Collected: 2026-09-14
> Published: 2026-09-14

固化 2026-09-14 会话中核验的运行时行为事实。所有机制断言带 18.1.21 安装包的 `文件:行号`；推断均已显式标注。

## streamingAbort 触发与结算

- `src/session/stream-guards.ts:94-100`：`streamingAbort: true` 且 edit 工具流式补丁预览（`#isEditPreviewErrorEvent`）报 error 时，`maybeAbort` 置 `#previewFailure` 并触发 `#abortPatch`。`streamingAbort: false` 时预览报错不中断，编辑照常走完。
- `src/session/stream-guards.ts:171-180` `#abortPatch`：调用 `agent.abort()`，携带 `createToolScopedAbortReason` 构造的 tool-scoped reason，把诊断 `{ [toolCallId]: "Streaming edit preview failed for <path>: <error>" }` 精确标注到对应 edit tool call；随后重置 guard 状态。
- `pi-agent-core/src/agent-loop.ts:1346-1385`：循环收到 `stopReason === "aborted"` 后，为被中断的 tool call 生成占位 aborted tool result（维持 tool_use/tool_result 配对；只有被标注的 call 背诊断错误，同消息其他 call 保持中性），然后 `stream.end(newMessages); return;` —— 循环退出，无自动重试、无自动 continue。

## guard abort 与自动 retry 的排除关系（精确分支范围）

- `src/session/turn-recovery.ts:1198-1205`（`isRetryableReasonlessAbort` docstring 原文核验）：streaming-edit guard abort（auto-generated-file guard 或 failed-patch preview）被定性为 deliberate，「MUST settle the turn instead」；给出的工程理由：routing through retry would orphan `#retryPromise` on a continuation the guard skips (hanging the in-flight `prompt()`) or silently undo the guard's intended abort。注释未展开「silently undo」的精确机制，不做进一步具体化。
- `src/session/turn-recovery.ts:1206-1215`：`isRetryableReasonlessAbort` 显式检查 `this.#host.streamingEditAbortTriggered()`，guard 拦过的 turn 返回 false。
- `src/session/turn-recovery.ts:1330-1363`（`classifyResolvedInterruptedToolTurn`）逐分支核验：

| 分支 | 行号 | 查 `streamingEditAbortTriggered()`？ |
|---|---|---|
| `reasonlessAbort` | 1334-1339 | 是（显式排除） |
| `streamStall` | 1341 | 否（无此检查；条件为 `stopReason === "error"` + STREAM_STALL_ERROR_RE + retriable） |
| `transportReset` | 1343-1350 | 是（显式排除） |
| `prematureClose` | 1355-1362 | 是（显式排除） |

streamStall 为何不查该标志：源码无注释，不做推断。

## F5 manual-retry 的两条路径

- `src/session/turn-recovery.ts:2686-2719` `retry()`：剥失败尾巴后 `scheduleAgentContinue({source: "manual-retry"})`（`:2716`）。按失败尾巴形态分流：
  - 完整但失败的工具批次（锚定 assistant turn 参数完整、以 toolUse/stop 正常收尾）：`toolReplayStart`（`:121-133`）判定合格后只剥 tool result 尾巴，`Agent.continue()` 直接重放原 tool calls，不付模型调用（`:2677-2683` 注释：省一次模型调用、直接重发同一批调用）。
  - 参数不完整/被截断批次：剥掉整个失败 turn，continue 后由模型重新生成。
  - 部分成功的批次永远不合格（`:130-133`）：重跑已完成调用会重复副作用。
- 对 streaming edit preview failure 这个具体 case：guard abort 的 turn 已由 `agent-loop.ts:1346-1385` 补过 synthetic placeholder tool results，`turn-recovery.ts:121-133,2689-2716` 的 synthetic-placeholder tail 不走 tool replay，而是剥掉失败 turn 后 continue 让模型重发。即此 case 下 F5 的意义是「人确认后再让 LLM 试一次」，不是确定性重放。

## 自动重试与 F5 的上下文等价性

F5 按下时模型相同、上下文近似相同（只剥掉失败 turn 本身）。「同模型同上下文立即自动重试会再生同样的坏补丁」这一论证同样适用于 F5 手动重试，不能作为「自动不行、手动行」的理由；源码注释也未包含此类成功率论证。两者实际差异：F5 前的时间窗口里人可读诊断、改提示或放弃（上下文不同是因为人可能改了它）；人按键天然限速，自动循环需预算上限兜底。设计定位（推断）：F5 是速率限制器 + 可选干预点，面向「人在看」场景；无人值守长跑的对应配置是 `streamingAbort: false`。

## read 两个开关与 provider 上送内容的边界

- `src/session/messages.ts:238-243`：provider-bound toolResult 序列化只含 `role/toolName/toolCallId/isError/content` 五个字段；工具结果的 `details`（含 `contentType`）不上送。`:1308-1314` 确认 toolResult 走 `convertMessageToLlm` 统一转换。
- `src/tools/read-format.ts:612-628`：`read.renderMarkdown: true` 且读取 `.md` 时给本地 read 结果 details 打 `contentType: "text/markdown"` 标签；`src/tools/read.ts:1871-1875` 同机制用于文档选择器路径。该标签由 TUI 渲染器消费（`read-renderer.ts` 的 `renderMarkdownCell`）。按当前源码未见其改变 LLM 收到的正文。
- `read.toolResultPreview`：只作为 `showContentPreview` 传给 TUI transcript 组件（`src/modes/components/chat-transcript-builder.ts:222` 等），控制 read 结果展开/摘要显示；纯 TUI 展示层。

## 本机配置决策（2026-09-14）

- `edit.streamingAbort: false`（无人值守长跑取向：预览报错走正常 tool result 通道，模型下一轮自动处理，无需 F5）。
- `read.renderMarkdown: true`、`read.toolResultPreview: true`（展示层偏好，不影响 LLM 输入）。
