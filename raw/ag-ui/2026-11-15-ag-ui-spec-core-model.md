# AG-UI 1.0 行为规范摘录：事件模型、run 生命周期、工具调用、状态

> Source: https://docs.ag-ui.com/spec/1.0/basic/index.md, https://docs.ag-ui.com/spec/1.0/events/lifecycle.md, https://docs.ag-ui.com/spec/1.0/events/tool-calls.md, https://docs.ag-ui.com/spec/1.0/events/state.md, https://docs.ag-ui.com/spec/1.0/basic/processing.md, https://docs.ag-ui.com/spec/1.0/basic/versioning.md, https://docs.ag-ui.com/spec/1.0/basic/patterns/interrupt-resume.md, https://docs.ag-ui.com/spec/1.0/basic/transports/http-sse.md
> Collected: 2026-11-15
> Published: Unknown（站点持续更新）

## 事件模型（index.md）

- 事件为 JSON 对象，共享 BaseEvent 信封：`type`（REQUIRED，31 个 `EventType` 枚举值之一）、`timestamp`（OPTIONAL，Informational，「By convention the unit is milliseconds since the Unix epoch」，消费者 MUST NOT 用它排序事件——「arrival order is the protocol's order」）、`rawEvent`（OPTIONAL，原样携带被翻译的 provider 原生事件，消费者 MUST NOT 从它推导协议行为）、`metadata`（OPTIONAL）。
- 属于子 agent 工作的事件可携带 OPTIONAL `subagentRunId`；run 级事件（`RUN_STARTED`、`RUN_FINISHED`、`RUN_ERROR`、`MESSAGES_SNAPSHOT`）不带归属。
- 「An optional field that has no value MUST be omitted rather than sent as `null`.」
- 31 个事件类型，8 个族（family）：Runs and steps（5）、Text messages（4）、Tool calls（5）、Reasoning（8）、State（3）、Activity（2）、Subagents（3）、Passthrough（2）。
- 标识符：`threadId`（会话，跨 run 稳定）、`runId`（单次 run，同 thread 不复用）、`messageId`（消息，跨 run 边界，thread 内唯一）、`toolCallId`（绑定调用与结果、中断）、`subagentRunId`（一次子 agent 调用的不透明句柄，两次调用两个值）。所有标识符是不透明字符串，消费者 MUST NOT 解析其结构。

## run 生命周期（lifecycle.md）

- 流 MUST 以 `RUN_STARTED` 或 `RUN_ERROR` 开头（`RUN_ERROR` 先行被允许，因为 run 可能在开始前失败）。
- `RUN_FINISHED.outcome` 的取值：success（缺席即 success，「an absent outcome means success」）、interrupt、cancelled 三种；规范原文：「Its `outcome` distinguishes a run that completed from one interrupted awaiting outside input, and from one stopped before it completed; an absent outcome means success.」
- `RUN_ERROR` 是独立的终止事件（message REQUIRED、code OPTIONAL 开放字符串、usage MAY），与 `RUN_FINISHED` 平行。
- 消费者侧截断（truncation）：「A consumer that abandons a stream — closes the connection, stops reading — has a truncated run, not a cancelled one: it MUST NOT synthesize a `RUN_FINISHED`, cancelled or otherwise, for a run whose ending it never received.」截断是消费者侧判定，不是 outcome 取值。
- cancelled run：「A producer that stops a run before completion, for a reason that is not a failure, MUST close it with `RUN_FINISHED` carrying the cancelled outcome. It MUST NOT report a stopped run as success」。生产方必须先关闭 run 打开的一切（消息、工具调用、步骤、子 agent）；无法有序关闭时改报 `RUN_ERROR`。
- 消费者「MUST NOT present a cancelled run as having succeeded, and MUST NOT present it as having failed — a stop the user asked for is not an error to show them」。
- run 关闭后：生产方不得再发该 run 事件，但 MAY 发 `RUN_STARTED` 开新 run，MAY 在 `RUN_FINISHED` 后补发 `RUN_ERROR`（成功后浮现的失败，消费者 MUST 视 run 失败）；`RUN_ERROR` 之后只允许 `RUN_STARTED`。消费者 MUST 拒绝其他到达的事件。
- 一条流可顺序携带多个 run（重放线程的常见场景）；跨 run 消息累积、状态持续直到被事件替换；重放历史 MUST 以快照重述（`MESSAGES_SNAPSHOT` 按 id 调解、`STATE_SNAPSHOT` 替换），重放消费者已有的材料是幂等的。
- token usage：`usage` 按 provider+model 每调用一条 `TokenUsage`；`inputTokens` 含缓存与否、写入缓存与否的全部 prompt token；`cachedInputTokens`、`cacheWriteInputTokens`、`reasoningTokens` 是总数的组成部分，「never additions to them」，两个缓存计数不相交；`totalTokens` = `inputTokens` + `outputTokens`；缺席计数＝provider 没报，零＝报了零，生产方 MUST NOT 为无数据的计数发零。run 是记账边界：子 agent 的调用计入 run；`parentRunId` 独立 run 自报；恢复 run 只报自己。
- 「A producer MUST NOT send an outcome value the schema does not describe.」不认识的 outcome 走剥离规则，剥离后缺席即 success。

## 工具调用（tool-calls.md）

- `TOOL_CALL_START`（toolCallId、toolCallName、OPTIONAL parentMessageId）、`TOOL_CALL_ARGS`（delta 逐段拼接，协议作为文本携带、不校验——「providers emit malformed argument strings, and the application deciding what to do with one beats the transport killing the run」）、`TOOL_CALL_END`（关闭只确立完整性、不确立有效性）、`TOOL_CALL_CHUNK`（紧凑拼写，首 chunk MUST 带 toolCallId 和 toolCallName）、`TOOL_CALL_RESULT`（本身是一条消息，有自己的 messageId，可携带字符串或 ContentPart 列表）。
- `TOOL_CALL_ARGS` 后消费者 MUST NOT 在 `TOOL_CALL_END` 前动用参数。
- 已关闭的调用 MAY 被同 toolCallId 的新 `TOOL_CALL_START` 重开，后续参数追加。
- 前端工具回合（frontend tools）：协议没有运行中来自消费者的通道；生产方调用前端工具时 MUST NOT 自己回答（无 `TOOL_CALL_RESULT`、无伪造 tool message）；run 以 success outcome（或无 outcome）收尾，SHOULD 在 `pendingToolCallIds` 里按发起顺序列出未答调用；继续线程 MUST 先回答每个未答调用（下一轮 `messages` 里按 `toolCallId` 带 tool message；失败也是回答，拒绝也是回答）；「Abandoning the thread answers nothing and violates nothing」。
- 停在前端工具调用的 run 是完成的 run，MUST NOT 报告为 interrupted；「an interrupt is the producer explicitly stopping to ask, answered by resume entries; a frontend tool call rides the ordinary message loop, answered by conversation history」。
- 安全考虑：参数是模型生成的不可信输入；应用 SHOULD 在执行有副作用的工具调用前获得用户同意。

## 状态（state.md）

- `STATE_SNAPSHOT` 全量替换（「A consumer MUST replace its state with `snapshot` — no merging」）；`STATE_DELTA` 用 RFC 6902 补丁修订（「Amends the current state with an RFC 6902 patch」，基线是消费者当前状态：run 开始时是输入的 `state`，之后是本 run 快照与补丁的结果）。
- `MESSAGES_SNAPSHOT`：生产方拥有的完整消息集合。同 id 消息原地替换；新消息按快照顺序追加；消费者持有而快照缺席的消息被丢弃——除了生产方无法知晓的客户端材料（activity 消息与大多 producer 不追踪的 reasoning 消息），但该例外按 role 自撤销（快照自己带了任何 activity 消息即声明完整集合）。
- 跨 run：状态持续到被事件替换，下一轮输入作为起始值带回——「the loop that keeps both sides agreed」。
- 错误处理：结构畸形的补丁致命；良构但应用失败的补丁警告并跳过。

## 中断与恢复（interrupt-resume.md）

- 「A run sometimes needs something only the outside world can give it — an approval, a credential, a choice. The protocol has no mid-run channel from the consumer, so the run does not wait: it ends, saying what it is waiting for, and the run that continues from it carries the answers.」
- 中断以 run 结束收尾：`RUN_FINISHED` outcome 为 interrupt，携带至少一个 `Interrupt` 对象（id run 内唯一、reason 开放字符串、message 人类可读、toolCallId 标记审批涉及的调用、responseSchema 描述答案形状「carried opaquely so a consumer can build a form for it」）。
- 生产方 MUST NOT 把停下来请求的 run 报成 success。
- 恢复：下一轮输入的 `resume` 列表，每 `ResumeEntry` 一个（interruptId MUST 命中被继续 run 的中断，status answered/abandoned，payload 任意 JSON）。覆盖规则由消费者强制：resume 列表 MUST 覆盖每个中断（回答或显式 abandoned；省略不算放弃）；消费者 MUST 在 run 开始前拒绝留下未覆盖中断的恢复输入。
- `expiresAt` 故意不约束格式：是否过期由判定中的消费者自己解读（参考实现读作日期、now-or-earlier 算过期）；过期中断不能再被 answer，但可以（且覆盖规则要求）被 abandon。
- 线程与状态连续性跨 gap 保持；token usage 不跨 gap（恢复 run 只报自己的调用）。
- 生产方无需为合规记住上一轮的中断——「A producer that carries nothing across the gap is conformant」。生产方的两条兜底：不认识的 resume 条目 SHOULD 继续并警告；能察觉的未覆盖中断 MUST NOT 擅自执行被中断的动作、MUST NOT 把省略当放弃、MUST NOT 在明知有开着的中断时以 success 收尾。
- 子 agent 内升起的中断 MAY 带 `subagentRunId`。

## 处理模型（processing.md）

- 「Unrecognised material is not an error. A malformed known value is.」不认识的事件类型/属性/联合成员 MUST NOT 中止 run；协议描述过的字段带 schema 拒绝的值 MUST 致命（不修复、不强制转换、不忽略）。
- 消费者对未识别材料的处置：整个事件类型不认识→drop + SHOULD 警告；有效事件上的未知属性或未识别联合成员→strip + SHOULD 警告；被剥离的属性 MUST NOT 存活到应用代码收到的值里。
- 快照补丁例外：RFC 6902 要求操作忽略未定义成员，故 `remove` 带残留 `value` 是有效补丁，整体到达。
- 剥离的深度规则：optional 位置→只移除该字段；required 位置→移除包含它的值；list 里→丢该元素保留列表。
- 中间件次序：「producer → compatibility boundary → middleware → enforcement → chunk expansion → verification → application」。中间件 MUST 在 enforcement 之前运行；enforcement MUST 在 verification 与应用代码之前。重连与重放路径同样必须经过 enforcement——「A path that skips enforcement is a hole in the guarantee, not an optimisation」。
- 已知缺口（规范自述）：「today that is Python and .NET, whose models parse leniently with no stage that strips before application code」；参考实现对闭合枚举串（如 role）：「a field whose schema is a closed set of string values — a message `role`, for instance — is checked as a leaf, so an unrecognised value there is fatal rather than stripped. The .NET converters reject an unknown role or outcome the same way」。两者都被规范标记为与规则的差距。
- 出站同样适用：发送前消费者 MUST 从 run input 移除未识别材料并 SHOULD 警告；畸形已知字段致命。生产方 MUST NOT 发协议未描述的事件类型来走私私有信号——`CUSTOM` 和 `RAW` 是干这个的合法通道。

## 版本与兼容（versioning.md）

- 版本带内协商：消费者在 `RunAgentInput.protocolVersion` 声明、生产方在 `RUN_STARTED.protocolVersion` 声明自己的版本（非回声）。字段 OPTIONAL 因为缺席有意义（早于版本字段的 peer）。
- 「additions are safe」：新事件类型、新 optional 字段、开放联合的新成员对旧方安全。生产方 MUST NOT 把 run 结果、消息内容、工具调用身份、工具结果只放进新增通道。
- 降级：lossless MAY silent；lossy MUST 警告（指名丢了什么、为什么）。降级 MUST NOT 修复畸形值、MUST NOT 发明意义（空值替换算重塑、非空捏造算发明）。
- 退役形状：记入 deprecation registry（含替代物、翻译所在、翻译本身过期时间）；翻译 MUST 作为中间件在 enforcement 之前运行。
- 「A producer meeting a newer minor of a line it implements MUST serve the run — additions are safe, by the rules above — answer with its own version, and SHOULD warn. It MAY reject, before RUN_STARTED, only a declaration from a major line it does not implement; a newer minor of its own line is serveable by construction and MUST NOT be rejected for its version.」
- 版本比较按数字逐段：MAJOR.MINOR，「so 1.10 is newer than 1.9」。

## HTTP+SSE 传输绑定（http-sse.md）

- 请求：POST run input（单个 JSON 对象、UTF-8、`Content-Type: application/json`），`Accept: text/event-stream`。
- 响应：run 启动则 200 + `text/event-stream`；每个 SSE 事件的 `data` 恰好一个协议事件 JSON；生产方 MUST 用 LF 帧定；消费者 MUST 忽略 `data` 以外的 SSE 字段、MUST 容忍注释行。
- 错误分流：「Input rejected before the run starts — malformed JSON, failed validation, refused auth — is an HTTP error status with no event stream. The run never started.」「A failure after the stream opens travels in-stream, as `RUN_ERROR`. The HTTP status is already sent and cannot change; a consumer MUST NOT infer success from `200` alone.」
- 断线无终端事件→截断 run。
- 「The binding has no stream resumption: SSE's `Last-Event-ID` mechanism is not used, and a broken stream cannot be re-entered. Re-running is a new run with a new `runId`, whose input carries whatever the consumer retained.」

## 规范原文的补充定位

- 三层「结束」结构：`RUN_FINISHED` 携带三个 outcome 值（success 缺席即 success / interrupt / cancelled）+ 独立终止事件 `RUN_ERROR` + 消费者侧截断（truncated run，非 outcome 取值）。消费者需区分的结束状况共五种：成功、中断、取消、错误、截断。
- Dojo 演示特征（apps/dojo/src/menu.ts）：`agentic_chat`、`v1_agentic_chat`、`agentic_chat_reasoning`、`agentic_chat_multimodal`、`backend_tool_rendering`、`human_in_the_loop`、`agentic_generative_ui`、`predictive_state_updates`、`shared_state`、`tool_based_generative_ui`、`subgraphs`、`deepagents_subagents`、`a2ui_fixed_schema`、`a2ui_dynamic_schema`、`a2ui_advanced`、`a2ui_recovery`、`generative_ui_markdown`、`generative_ui_tool`、`interrupt`、`tool_approval`、`background_agents`、`multi_agent`、`observational_memory`。langgraph（平台集成走 TypeScript `@ag-ui/langgraph` 客户端）注释明说无 subagent 支持，`deepagents_subagents` 只在 langgraph-fastapi 暴露。
- LangGraph Python 适配器 `integrations/langgraph/python/ag_ui_langgraph/agent.py` 共 4,881 行（2026-11-15 统计，curl 主分支原文 wc -l）。
