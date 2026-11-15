# 基线协议摘录：Vercel AI SDK UI message stream 与 LangGraph 流

> Source: https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol.md, https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage.md, https://docs.langchain.com/oss/python/langgraph/streaming.md, https://docs.langchain.com/oss/python/langgraph/interrupts.md
> Collected: 2026-11-15
> Published: Unknown（文档持续更新）

## Vercel AI SDK：UI message stream（stream-protocol.md）

- 两种协议：text stream（纯文本 chunk 追加）与 data stream（SSE 格式，「For improved standardization, keep-alive through ping, reconnect capabilities, and better cache handling」）。data stream 需设置 header `x-vercel-ai-ui-message-stream: v1`。
- 流分片（part）类型清单（data stream）：`start`（消息开始）、`text-start`/`text-delta`/`text-end`（文本块三段式、按 id）、`reasoning-start`/`reasoning-delta`/`reasoning-end`（推理块三段式）、`reasoning-file`、`source-url`/`source-document`、`file`、`custom`（`kind` 字段形如 `openai.compaction` 的 provider 专属内容）、`data-*`（自定义结构化数据）、`error`、`tool-input-start`（可选 `inputEncoding`：`'json'` 或 `'text'`）、`tool-input-delta`、`tool-input-available`、`tool-approval-request`、`tool-approval-response`、`tool-output-available`、`tool-output-denied`、`steering-message`（实验性，用户中途加入 run 的消息，「It is sent before the `start-step` part of the step that received it」）、`start-step`、`finish-step`、`reset-step`（撤销最近 `start-step` 以来的所有分片，用于步骤重试）、`abort`、`finish`。
- 流终止：SSE 字面 `data: [DONE]`。
- 工具调用与审批已入协议：`tool-approval-request` 携带 `approvalId`、`approvalDescriptor`（不透明元数据）、`reason`；`isAutomatic` 缺席时表示期望客户端显式响应；`tool-approval-response` 记录决定（`approved`、`reason`，provider 执行的工具可带 `providerExecuted: true`）；`tool-output-denied` 表示审批流程后执行被拒。

## Vercel AI SDK：工具使用与审批（chatbot-tool-usage.md）

- 三种工具执行模式：服务端自动执行、客户端自动执行（`onToolCall` 回调内调用 `addToolOutput`）、需要用户交互的工具（UI 渲染，交互完成后 `addToolOutput` 回填）。
- 「The chat can be configured to automatically submit when all tool results are available using `sendAutomaticallyWhen`.」配 `lastAssistantMessageIsCompleteWithToolCalls` helper。
- 工具分片状态机：`input-streaming`、`input-available`、`approval-requested`、`approval-responded`、`output-available`、`output-error`、`output-denied`。
- Tool Execution Approval：「lets you require user confirmation before a server-side tool runs. Unlike client-side tools that execute in the browser, tools with approval still execute on the server—but only after the user approves.」服务端以 `toolApproval` 配置（如 `getWeather: 'user-approval'`）；「The older `needsApproval` property on tools is deprecated.」客户端 `addToolApprovalResponse({ id, approved })` 回答。
- 客户端工具执行出错：`addToolOutput` 带 `state: 'output-error'` 与 `errorText`。

## LangGraph：stream modes（streaming.md）

- `stream`/`astream` 按 stream mode 产出：`values`（每步后全量状态）、`updates`（每步后变更的键）、`messages`（LLM token 二元组 (message_chunk, metadata)）、`custom`（节点内 `get_stream_writer()` 自发数据）、`checkpoints`、`tasks`、`debug`。
- v2 输出格式（LangGraph 1.1+）：每个 chunk 是统一 `StreamPart` dict：`{"type": ..., "ns": ..., "data": ...}`，`ns` 命名空间元组标记子图事件；v1 格式随选项变化（单模式裸数据、多模式 `(mode, data)` 元组、子图 `(namespace, data)` 元组）。
- 每个模式对应 TypedDict；`StreamPart` 是按 `part["type"]` 的不相交联合，支持编辑器类型收窄。

## LangGraph：interrupts（interrupts.md）

- `interrupt()` 可置于节点任意处，接受任意可 JSON 序列化值；触发时保存图状态（checkpointer）并无限等待，`thread_id` 是持久指针。
- 恢复：再次调用图并以 `Command(resume=...)` 作为输入；resume 值成为 `interrupt()` 调用的返回值。「The node restarts from the beginning of the node where the `interrupt` was called when resumed, so any code before the `interrupt` runs again」。
- 事件流 v3（`graph.stream_events(..., version="v3")`）：`stream.interrupts` 携带 payload、`stream.interrupted` 为 True 表示暂停等待输入；默认 `invoke()` API 在 `result["__interrupt__"]` 下暴露中断。
- `response_schema` 参数（langgraph>=1.2.12）：传 Pydantic model / TypedDict / dataclass，转成 JSON Schema 附在 `Interrupt.response_schema` 上，验证 resume 值（Pydantic 校验与强制转换规则适用，无效输入抛 `pydantic.ValidationError`）；传 JSON Schema dict 时不验证（「LangGraph exposes that dictionary unchanged but does not validate resume values against it」）；缺省为 None、resume 值不经验证直接通过。「Studio renders interrupt response schemas as typed input fields instead of a JSON editor.」
- 并行分支多中断：resume map 把每个 interrupt id 映射到答案。
- 恢复必须用同 thread_id；「`Command(resume=...)` is the only `Command` pattern intended as input to `invoke()`/`stream()`/`stream_events()`」。

## 手写 SSE 基线（无协议，作对照空基线）

- 自定义 JSON 行格式、自有事件命名、自有错误与取消约定；无 schema、无 fixtures、无行为规范；N 个后端 × M 个前端各自维护映射。
