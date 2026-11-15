# AG-UI 协议与生态

> Sources: AG-UI 1.0 行为规范（docs.ag-ui.com/spec/1.0）；AG-UI 仓库 README 与 spec/（2026-11-15）；CopilotKit 官方产品页与 Intelligence 文档（2026-11-15）；Vercel AI SDK 官方文档（2026-11-15）；LangChain 官方 LangGraph 文档（2026-11-15）
> Raw: [核心模型摘录](../../raw/ag-ui/2026-11-15-ag-ui-spec-core-model.md); [客户端与生态摘录](../../raw/ag-ui/2026-11-15-ag-ui-clients-and-ecosystem.md); [机器定义与分歧摘录](../../raw/ag-ui/2026-11-15-ag-ui-maturity-and-divergences.md); [基线协议摘录](../../raw/ag-ui/2026-11-15-ag-ui-baselines-comparison.md)
> Updated: 2026-11-15

## Overview

AG-UI 是 agent 后端与用户界面之间的事件线协议：一次 run 里，生产方（agent 端点）向消费者（应用前端）流式发送 31 种事件（8 个族），消费者反向发送一个 `RunAgentInput`。它由 CopilotKit 发起并维护（MIT、17419 stars、双周工作组），有 JSON Schema 机器定义、行为规范、fixtures 验收套件与 Dojo 端到端演示；客户端覆盖 React/Angular/Vue/React Native、Slack/Teams、终端与八种社区 SDK。定位上与 MCP（工具）、A2A（agent 间）互补：AG-UI 管 agent 进用户界面这一段。

## 定位与解决的问题

agent 后端跑长任务、流式输出中间过程、不确定性地控制界面、调用子 agent——这些行为放在 REST/GraphQL 的请求-响应模型里都要自己发明。AG-UI 把这段线协议标准化：事件格式、顺序约束、结束语义、兼容规则。它的直接收益是后端写一次（或用一个适配器）、前端随便换；一个 agent 端点同时服务网页、手机、Slack、终端多种客户端形态。

## 事件模型与 run 生命周期

一次交互：消费者 POST `RunAgentInput`（threadId、runId、messages、tools、state、context、forwardedProps、protocolVersion），生产方以 SSE 流返回事件流。事件共享 `BaseEvent` 信封（`type` 判别、`timestamp` 约定毫秒但不作排序依据、`rawEvent` 原样携带 provider 原生事件、`metadata` 开放通道）。

run 的结束状况有五种，分三层记录：`RUN_FINISHED` 携带三个 outcome 值——success（缺席即 success）、interrupt（等外部输入）、cancelled（被主动停止）；`RUN_ERROR` 是独立的失败终止事件；截断（truncated run）是消费者侧判定（连接断了没收到终端事件），消费者不得为它合成 `RUN_FINISHED`。前端必须区分这五种：把截断当成功、或把用户主动取消当失败，用户看到的都是错误结论。

cancel 的语义被专门规定：生产方 MUST 先关闭 run 打开的一切（消息、工具调用、步骤、子 agent）再发 cancelled outcome；无法有序关闭就报 `RUN_ERROR`。cancelled run 无返回值、不等任何东西、下一个 run 是普通新 run 而非 resume。

usage 按 provider+model 每模型调用一条记账：三个分量（缓存读、缓存写、reasoning）是总体的组成部分，不得重复计入；run 是记账边界，子 agent 的调用计入 run，独立 run（parentRunId）自报，resume 的 run 只报自己。

## 交互模式

**工具调用与前端工具。** 工具调用五事件（START/ARGS/END/CHUNK/RESULT）按 `toolCallId` 匹配；参数按文本流式拼接、协议不校验（provider 会发畸形参数串，应用处置优于传输层杀死 run）。前端工具走消息循环：协议没有运行中来自消费者的通道，生产方调用前端工具后以 success 收尾、在 `pendingToolCallIds` 列出未答调用，应用在 run 结束后执行并以下一轮 `messages` 里的 tool message 回答（失败与拒绝也是回答，弃线不算违规但继续线程必须全答）。前端工具回合与中断是两条不同的路：前者乘普通消息环，后者由 resume 条目回答。

**共享状态。** `STATE_SNAPSHOT` 全量替换、`STATE_DELTA` 用 RFC 6902 补丁修订、跨 run 持续并在下一轮输入回传——agent 与界面共用一份数据（表单、购物车、行程），界面上的修改随下一轮回到 agent。补丁失败警告并跳过，畸形补丁致命。

**中断与恢复。** 需要外部输入的 run 以 interrupt outcome 结束并携带 `Interrupt` 对象（id、开放字符串 reason、可读 message、toolCallId、responseSchema——消费者据后者生成表单）。恢复走新 run：输入的 `resume` 列表每中断一条（answered 或显式 abandoned，省略不算放弃），覆盖校验由消费者在 run 开始前强制；`expiresAt` 格式故意不约束（生产方已不一致，收紧会拒绝今天能用的流），过期与否由判定方自读。生产方无需跨 run 记住中断即可合规。

**子 agent。** `SUBAGENT_*` 事件族加 `subagentRunId` 归属；独立调用的另一个 agent 用 `parentRunId` 表示血缘。Dojo 的 `deepagents_subagents` 特征只在 Python 集成暴露（平台 TS 客户端无 subagent 支持）。

## 客户端与 SDK 生态

Clients 表五项：CopilotKit（一等）、Terminal + Agent（社区）、Slack/Teams 聊天平台（Channels SDK，一等）、React Native（一等）、OpenBot（一等）。Web 框架官方客户端四个：React、Angular、Vue、React Native；Svelte 与 Solid 没有（npm 上 `@copilotkit/svelte`、`@copilotkit/solid` 均 404）。社区 SDK 八种语言已发布（Kotlin、Go、Dart、Java、Rust、Ruby、C++、.NET），Nim/Flowise/Langflow 进行中。协议明说客户端不必是网页：「The protocol describes an event stream rather than a rendering target」。

框架集成三层：Partnership（LangChain/LangGraph、CrewAI）、一等（Microsoft Agent Framework、Google ADK/Antigravity、AWS Strands/AgentCore、Mastra、Pydantic AI、Agno、LlamaIndex、AG2）、社区（Claude Agent SDK、Claude Managed Agents、Langroid、Omnara、OpenAI Agents SDK、Cloudflare Agents）。

## 协议边界

不属于 AG-UI 的能力各自归处：渲染由客户端决定；认证授权由传输绑定与应用决定；线程存储可以保留自己的（Intelligence 文档明说不需要替换）；跨设备重连与追赶、记忆托管等是 CopilotKit Intelligence 的产品能力（AG-UI Streams、User Memories、Channels 等），云托管或 self-hosted；界面形状生成（declarative generative UI）由 A2UI、MCP Apps 独立规范定义，AG-UI 只承载事件。

## 成熟度

1.0 有正式的机器定义与行为规范：schema 闭合每个对象、fixtures 带 `.expect.json` 指名拒绝规则、harness 校验 anchor/枚举一致性/闭合性；行为规范写明处理模型（未知材料剥离并警告、畸形已知值致命）、版本协商（带内、双方各报自己的）、降级规则（lossless 可静默、lossy 必须警告）与退役形状注册表。已知的实况分歧集中在 `spec/README.md` 的 Known divergences：`Interrupt.responseSchema` 只收对象、媒体部件 metadata 不受约束、`Tool.parameters` 接受非 JSON Schema 值、`expiresAt` 格式不受约束（TS 读不可解析值为永不过期、Python 直接抛异常）、`toolCallId` 在有审批理由时仍可选、`timestamp` 单位未规范写明。处理模型自述两个缺口：Python 与 .NET 的模型只解析、没有剥离阶段；参考实现对闭合枚举类字段的未知值直接判致命。README 仍写「~16 standard event types」而规范是 31 种/8 族，属文档分层留下的差异。RECONCILIATION.md 显示 TypeScript 与 Python 两个 SDK 与 schema 在 required-ness 上零分歧。

## 基线对比

| 维度 | AG-UI | Vercel AI SDK UI message stream | LangGraph 流模式 | 手写 SSE |
| - | - | - | - | - |
| 面向对象 | 框架无关的前后端线协议 | `ai` 包的 UI 层协议 | LangGraph 运行时投影 | 自家私有约定 |
| 工具调用参数流 | `TOOL_CALL_*` 五事件 | `tool-input-*` 三分片 | `messages` 模式（随框架消息形状） | 自己定 |
| 前端执行工具回合 | 协议定义（`pendingToolCallIds` + 下一轮 tool message） | `onToolCall`/`addToolOutput` + `sendAutomaticallyWhen` 自动续跑 | 无统一形状 | 自己定 |
| 人工审批 | interrupt outcome + `responseSchema` + `resume` 覆盖校验 | `tool-approval-request/response` 分片、`addToolApprovalResponse`（`needsApproval` 已废弃，改 `toolApproval`） | `interrupt()` + `Command(resume=...)`（同 thread_id；node 从头重跑） | 自己定 |
| 共享状态 | 快照 + RFC 6902 补丁、跨 run 回传 | `data-*` 部件 | `values`/`updates` 模式（全量/增量） | 自己定 |
| 子 agent | `SUBAGENT_*` + `subagentRunId`/`parentRunId` | 无 | 子图 `ns` 命名空间 | 自己定 |
| 取消 | cancelled outcome（与失败、截断三分） | `abort` 部件 + `[DONE]` | 依赖运行时 | 自己定 |
| 断线 | 截断；无续传（`Last-Event-ID` 不用），重跑是新 run | SDK 自带重连能力 | 无统一 | 自己定 |
| 中途引导 | 无运行中上行通道（经下一轮输入） | `steering-message`（实验性） | 无统一 | 自己定 |
| 规范与验收 | schema、fixtures、行为规范、Dojo 周流水线（1.0 门槛） | SDK 文档 | 运行时文档 | 无 |
| 复用范围 | 30+ 集成、多客户端、八语言 SDK | 仅 `ai` 生态 | 仅 LangGraph | 零 |

## 判断

值得接入：前端要统一接多个 agent 后端或准备换框架；需要审批、取消、子 agent、状态同步这些语义且不想各自发明；有多个客户端形态；想用 fixtures 与 Dojo 做验收。接入成本是写或用一个适配器（LangGraph Python 适配器 4,881 行，覆盖推理、子 agent、中断、用量映射）加跟进 0.x→1.0 类破坏性版本变更。单一框架且其官方前端方案够用、纯文本聊天、无中断与状态需求时，接入收益有限。中间路线：只用事件模型与 JSON Schema 当共同词汇表，传输与渲染自己写。

## See Also

- [视觉人机交互全景](../agent-interaction/visual-canvas-interaction-landscape.md) — AG-UI 在那里的判定里是「造界面的材料」而非交互方式本身
