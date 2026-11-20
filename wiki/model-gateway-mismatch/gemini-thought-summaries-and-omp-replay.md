# Gemini Thought Summaries 与 OMP reasoning_text 回传链路

> Sources: Google AI for Developers 官方文档, 2026-11-21; Google Cloud Vertex AI 官方文档, 2026-11-21; Google AI Developers Forum, 2026-11-21; 本机 `@oh-my-pi/pi-ai`、`@oh-my-pi/pi-catalog`、`copilot-api` 源码与 OMP 会话记录, 2026-11-21
> Raw: [Gemini thinking 官方文档摘录](../../raw/model-gateway-mismatch/2026-11-21-gemini-thinking-docs-thought-summaries.md); [OMP reasoning_text 采集回传取证](../../raw/model-gateway-mismatch/2026-11-21-omp-reasoning-text-replay-forensics.md)
> Updated: 2026-11-21

## Overview

TUI 上看到的英文 thinking block 是 Gemini 服务端生成的 Thought Summary（思考摘要）：完整推理在服务端进行并按完整 thought tokens 计费，API 交给客户端的只有摘要文本与加密 signature。OMP 在 `c8787-chat`（环回 baseUrl 的 Chat Completions 链路）上把摘要存为 assistant 的 thinking 块，并因环回判定自动开启 `replayReasoningContent`，把历史摘要以 `reasoning_text` 字段随后续请求发回 CAPI。文本摘要本身没有签名，而 tool call 级签名被 OMP 采集并回放。用户规则里的「内部推理：中文」对摘要语言没有约束力；CAPI 对无签名配对的 `reasoning_text` 如何处理，公开资料没有说明。

## Thought Summary 与完整推理的分工

Google 官方文档对 thinking 模型的描述：

> Thinking models generate full thoughts to improve the quality of the final response, and then output summaries to provide insight into the thought process. Pricing is based on the full thought tokens the model needs to generate, despite only the summary being output from the API.

thought step 的两个字段分工明确：`signature` 是「An encrypted representation of the model's internal reasoning state. Always present, even when the model performs minimal reasoning」，`summary` 是可选的摘要内容数组。摘要在三种情况下缺席：推理量不足、`thinking_summaries: "none"` 显式关闭、非文本模态。

Gemini 4 Argon 的档位为 `On (medium)`，支持 `low, medium, high`；输入、思考与输出共享 `1,048,576` token 的窗口，`background=False` 时默认输出上限 `65,536`，其中非流式调用在 `gemini-4-carbon` 与 `gemini-4-argon` 上限为 `32,768`。

## 跨轮推理状态的官方延续机制

原生 Gemini 协议下，跨 turn 与跨 step 的推理延续依赖回传加密签名：

> When a Thinking model calls an external tool, it pauses its internal reasoning process. The thought signature acts as a "save state," allowing the model to resume its chain of thought seamlessly once you provide the function's result. Without thought signatures, the model "forgets" its specific reasoning steps during the tool execution phase.

Gemini 3 起强制校验：「If a required thought signature is not returned when using Gemini 3 models, the model will return a `400` error.」Gemini 3.5 Flash 与更新模型默认在服务端保留 thought history。REST 规则要求签名随原 Part 回传、不可合并；无签名的迁移场景可用 `skip_thought_signature_validator`，官方标注为「a last resort as it will negatively impact model performance」。Chat Completions 协议下签名随 tool call 的 `extra_content.google.thought_signature` 携带。

## OMP 的采集与回传链路

以本会话（模型 `c8787-chat/gemini-4-argon`）为例，链路分四段：

1. **摘要流式采集**：`pi-ai` 的 `openai-completions.ts`（第 1489–1536 行）按 `["reasoning_content", "reasoning", "reasoning_text"]` 顺序取首个非空字段；`openThinkingBlock`（第 1189–1204 行）把流式摘要存为 `{ type: "thinking", thinkingSignature: <字段名>, summary: false }`。会话记录第 19、28、30、33 行的 thinking 块均带 `thinkingSignature: "reasoning_text"`，内容为 `**Responding with Chinese**`、`**Considering User Input**` 一类英文动名词标题格式。
2. **tool call 签名的采集与回放**：同一文件第 165–195 行定义 `extra_content.google|vertex.thought_signature` 的解析；第 1660–1665 行在 tool call delta 上把签名存入 `block.thoughtSignature`，第 1724–1733 行解析 `reasoning_details` 中 `type === "reasoning.encrypted"` 的条目并按工具调用 id 合并；第 2799–2808 行在回放时把 `stored?.perCall` 写回 `replayedToolCall.extra_content`、消息级签名写回 `assistantMsg[messageSignature.field]`。与 Google 文档一致，签名挂在 tool call 上；文本 thinking 摘要没有签名，其 `thinkingSignature` 只是字段名标记。
3. **环回判定开启重放**：`pi-catalog` 的 `resolve.ts`（第 365–367 行）以 `hasLocalLoopbackBaseUrl(baseUrl)` 判定本地后端，第 560 行据此设 `replayReasoningContent: d.isLocalOpenAICompatBackend`。本机 `models.yml` 的 `c8787-chat` 条目 `baseUrl` 为 `http://localhost:8787/v1`，环回命中，该标志自动为 `true`。该标志自 pi-catalog `[16.1.22] - 2026-06-26` 引入，启用范围即「内置本地 OpenAI 兼容 provider 与任何指向 loopback / RFC1918 / `*.local` baseUrl 的 provider」。
4. **摘要回传与转发**：`convertMessages`（第 2662–2685 行）在 `replayReasoningContent` 分支按已存块的 `thinkingSignature` 选字段，把历史 thinking 块以 `reasoning_text` 写回 assistant 消息；`copilot-api` 的 `create-chat-completions.ts`（第 119–141 行）把该请求体转发至 `${copilotBaseUrl(state)}/chat/completions`。

`AGENTS.md` 的语言要求一节写有「以下语言规则包括：思考、回答等自然语言内容。」与「**内部推理**: 中文」；本会话全部 thinking 块仍为英文摘要格式，该规则对这条链路的 TUI thinking block 语言未产生可见约束。正文语言遵循规则，与摘要语言互不干涉。

## prompt 控制 thinking 语言的能力分层

- **直出推理文本的模型**：thinking 文本与正文处于同一生成流（`reasoning_content` 类字段），提示词约束其语言在机制上直接可达；该判断为机制推断，未逐一实测。
- **服务端摘要型接口**：客户端拿到的只有服务端生成的摘要，摘要语言跟随服务端生成器。社区的做法是在单轮用户消息末尾显式要求，例如 `Generate Answer and Thought summary in Russian`；该写法需逐条消息声明，长系统提示与工具调用场景下无公开验证，对多轮会话没有稳定约束力。

## 证据边界

- 文本 thinking 摘要无签名可回传；OMP 采集并回放的是 tool call 级签名。CAPI 收到仅有 `reasoning_text`、无 tool call 签名配对的请求时，是否将摘要文本注入后端 Gemini 上下文并影响生成：公开资料无说明；本机 `copilot-api` 源码中 `reasoning_opaque` 只出现在类型定义、流式转发、thinking 错误重试的剥离与 Claude 协议翻译路径中，未见赋予生成语义的处理。
- 「后续请求携带 `reasoning_text`」由 `convertMessages` 代码路径与环回判定共同推出，本会话未抓包核对出站请求体的实际字段值。
- `pi-ai` 的 `demotion.ts`（第 7–9 行）记录了原生 Gemini 3 上「a replayed unsigned `thought` part is schema-accepted but silently discarded — neither recalled nor influencing generation」的端到端实测；该结论针对原生协议的 `thought` part，本页链路走 Copilot `/chat/completions` 的 `reasoning_text` 字段，字段与协议均不同，不能直接平移。

## See Also

- [Copilot Chat 生成失败：跨协议传递、用量保留与 OMP 重试边界](copilot-chat-generation-failure-and-omp-retry.md) — 同一条 CAPI 链路的生成失败收尾与 `validated` 取值边界
- [OMP Shake 机制](../omp-slash-commands/shake-mechanics.md) — Responses 协议的 reasoning 条目重放，与本页的 Chat Completions `reasoning_text` 分属两条协议路径
