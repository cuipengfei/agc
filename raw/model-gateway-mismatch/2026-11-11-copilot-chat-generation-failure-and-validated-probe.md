# Copilot Chat 生成失败的跨协议传递与 gemini-4-argon 的 validated 取值取证

> Source: 本机仓库 `/home/cpf/code-inside/copilot-api` 源码、测试与 CI 输出；`microsoft/vscode` 现役源码与 Issue；`https://api.business.githubcopilot.com` 直连实测；已安装 `@oh-my-pi/pi-ai` 源码；Google Gemini API 文档，2026-11-11
> Collected: 2026-11-11
> Published: Unknown（仓库内部改动与探测记录）

证据形态标注：**一手直读**＝逐字读取仓库或依赖源码、直接执行命令；**文档声明**＝官方文档页面原文；**推断**＝由已读证据推得但未直接证实。

## ① 故障现象与来源

另一台机器在 2026-11-10 约 11:12–11:17（UTC+08:00）记录到 OMP 使用 `copilot-api-chat/gemini-4-argon` 连续报错：

```text
Error: Provider returned error finish_reason
```

失败的 assistant 消息内容为 `content: []`，没有回答文本或工具调用；用量仍记录约 58–62 个输出 token。OMP 自动重试后继续遇到同类错误。会话记录随后显示于 11:19:17 使用 `copilot-api/gpt-6.1-sol` 恢复成功。

本机会话 `2026-10-26`（记录文件 `2026-10-26T13-39-43-720Z_01a17870-3be8-77f8-8e03-60e7be2bb1a0.jsonl` 第 355–363 行）出现同类形态：

1. 15:02:10 调用 `read` 读取不存在的文件，工具返回 `isError: true`。

2. 15:02:32 首次请求：`content: []`、`stopReason: "error"`、`errorMessage: "Provider returned error finish_reason"`，输出 142 个 token。
3. 15:02:55、15:03:21、15:03:49 三次自动重试，均记录 `retryRecovery.recovery: "plain"`，输出分别为 142、144、142 个 token，全部同类失败。
4. 15:03:55 追加一条 `<system-notice>` 消息后再次请求，成功返回 `glob` 工具调用。

交接记录另有两条：对应时间的代理终端显示 `POST /v1/chat/completions` 返回 HTTP 200 并打印完成标记；同一请求在 SQLite 中的 `request_outcome` 为 `completed`。这两条说明 HTTP 状态与「响应已建立」不构成生成成功的证据。

## ② 本机路由复现（一手直读与实测）

用 Hono 路由与内存 SQLite 构造离线输入，覆盖五种场景：

| 场景 | HTTP | 终端完成标记 | `request_outcome` | 用量记录条数 |
|---|---:|---|---|---:|
| `finish_reason: "error"` + usage + `[DONE]` | 200 | 打印 | `completed` | 1 |
| 显式 `event: error` | 200 | 不打印 | `error` | 1 |
| 正常空内容 `stop` | 200 | 打印 | `completed` | 1 |
| `length` | 200 | 打印 | `completed` | 1 |
| `tool_calls` | 200 | 打印 | `completed` | 1 |

结论（一手直读）：`src/lib/chat-completions-stream.ts` 的 `guardChatCompletionsStream` 把任意字符串形式的 `finish_reason` 视为终止事件，只有 SSE `event: error` 或 JSON `error` 才算失败；错误分支返回 `completion: null`，同一帧携带的 `usage` 因此丢失。

## ③ CAPI 流内错误协议（一手直读官方现役源码）

`microsoft/vscode-copilot-chat` 已于 2026 年 2 月归档，Copilot 正式源码位于 `microsoft/vscode` 主仓库 `extensions/copilot/`。

- `extensions/copilot/src/platform/networking/node/stream.ts` 定义 `FinishedCompletionReason.ServerError = 'error'`，注释说明其为服务端无法完成流时终止响应的原因。
- 无 `choices` 但带顶层 `json.error` 的 chunk 同样按服务端错误处理；`json.copilot_errors` 通过回调向上层报告。
- 该仓库源码中不存在 `native_finish_reason` 字段的定义或读取。`native_finish_reason` 是 OpenRouter 的扩展字段。
- 官方 VS Code 用户在 Gemini 模型下同样会遇到 `Reason: Server error. Stream terminated`（`microsoft/vscode` Issue #278509），重试同样连续失败。
- `extensions/copilot/src/platform/networking/common/fetch.ts` 的通用请求类型对 `tool_choice` 的声明为 `'none' | 'auto' | { type: 'function'; function: { name: string } }`，并带注释 `Note: 'required' is not supported`。

## ④ 官方三项 Gemini 请求预处理的核验（一手直读与实测对照）

| 预处理项 | 官方加入的原因 | 对照本机失败现场 | 核验结论 |
|---|---|---|---|
| 剥离没有配对 `tool` 响应的 `tool_calls` | `microsoft/vscode` Issue #299295：请求阶段返回 HTTP 400 `INVALID_ARGUMENT` | 失败前序 `assistant` 的 `read` 调用与紧随的 `toolResult` 完全配对 | 与本次报错无关，处理的是请求阶段 400 |
| 工具 JSON Schema 的 `nullable` 转换 | Issue #340350 与 `toolSchemaNormalizer.ts` 注释：请求阶段返回 HTTP 400 `invalid_request_body` | 同一工具表在报错前 10 秒与报错后 14 秒均返回 HTTP 200 并成功调用工具 | 与本次报错无关，处理的是请求阶段 400 |
| `tool_choice: "validated"` | Issue #289874 / PR #3128：针对 Gemini 3 工具调用 | `extensions/copilot/src/platform/endpoint/node/chatEndpoint.ts` 第 476 行起的 `customizeCapiBody` 要求 `hasTools` 且 `this.family.toLowerCase().includes('gemini-3')` | 官方代码未对 `family` 为 `gemini-4-argon` 的模型改写 |

## ⑤ Gemini 函数调用模式（文档声明）

Google Gemini API 文档对 `tool_choice` 模式的定义：

- `auto`：模型自行决定是发起函数调用还是返回普通文字。
- `any`：模型被约束为必须发起函数调用。
- `none`：模型被禁止发起函数调用，等价于请求里不带函数声明。
- `validated`：模型被约束为在函数调用或普通文字之间选择，并保证函数调用符合提供的 schema。

Vertex AI 文档补充：`VALIDATED` 在未提供 `allowed_function_names` 时从全部函数声明中选择；从 Gemini 3 起该模式还会强制必需参数存在。

以上是 Google 原生 API 的语义。Copilot CAPI 是否把 `tool_choice: "validated"` 映射到该模式，没有公开说明。

## ⑥ gemini-4-argon 携带 validated 的直连实测（实测）

使用本机 4142 实例对应的 business 账户，经 `copilot-backend-tester` 直接向 `https://api.business.githubcopilot.com/chat/completions` 发送两次请求。两次的提示、工具定义与其他请求体字段相同，仅 `tool_choice` 不同；提示要求调用 `add`，参数为 `a=2`、`b=3`。

| `tool_choice` | HTTP | `finish_reason` | 实际工具调用 | 输入 token | 输出 token | 缓存读取 token |
|---|---:|---|---|---:|---:|---:|
| `auto` | 200 | `tool_calls` | `add({"a":2,"b":3})` | 114 | 22 | 0 |
| `validated` | 200 | `tool_calls` | `add({"a":2,"b":3})` | 114 | 22 | 0 |

两次均收到 `[DONE]`，没有 `error` 或 `copilot_errors`。共一次 token exchange、两次模型请求，无重试。

本机 `/v1/models` 中 `gemini-4-argon` 的 `family` 为 `gemini-4-argon`，`supported_endpoints` 为 `["/chat/completions"]`。

## ⑦ OMP 侧的识别与恢复边界（一手直读已安装源码）

`@oh-my-pi/pi-ai` 的 `providers/openai-completions.ts` 把上游 `finish_reason: "error"` 映射为错误文本 `Provider returned error finish_reason`；同文件的自有 HTTP 与 SSE 解析路径在读到流内错误事件时立即抛错，排在后面的 chunk 不会被消费。

`error/flags.ts` 中该文本只关联 `ProviderFinishError`，没有 `EmptyResponse` 标志。

`packages/coding-agent/src/session/turn-recovery.ts` 第 1073–1158 行的 `#isRecoverableProviderEmptyOutput` 要求消息同时满足 `stopReason === "error"` 且被归类为 `AIError.Flag.EmptyResponse`，命中后进入 `#handleEmptyAssistantStop`，在重试前注入 `#emptyStopRetryReminder()`。本机三次重试均记录 `recovery: "plain"`，说明未进入该提醒路径。

`providers/openai-shared.ts` 的 `applyOpenAIExtraBody` 用 `Object.assign(params, extraBody)` 把模型配置的 `extraBody` 合并进请求体。调用点在 `providers/openai-completions.ts` 第 2276 行，晚于第 2204 行的「工具列表为空时删除 `tool_choice`」逻辑。因此：

- 静态 `extraBody` 会覆盖单轮传入的 `tool_choice: "none"`。
- 工具列表为空的临时回合（注释记录 `/btw` 与 IRC 后台回复走 `AgentSession.runEphemeralTurn`，该方法设置 `context.tools = []` 与 `toolChoice: "none"`）在删除后仍会被合并回 `tool_choice: "validated"`。
- 该合并绕过 `initialCompat.supportsToolChoice` 判断。

## ⑧ 本机配置改动（一手直读）

`~/.omp/agent/models.yml` 的 `c8787-chat` provider 下，`gemini-4-argon` 条目增加：

```yaml
compat:
  extraBody:
    tool_choice: validated
```

配置校验通过，其他模型与 provider 条目未变。用当前安装版本的 provider 离线捕获请求体，确认最终发送值为 `"validated"`，网络调用为零。当前运行中的 OMP 会话是否已重新加载该配置未验证。

该条目同时配置 `compactionModel: c8787/gpt-6-luna`，摘要回合使用另一个模型。标题生成使用哪个模型未核实。

## ⑨ copilot-api 修复与验收（一手直读与实测）

提交 `7c6eb1289cdd2061eecfbb005be60a28f544ced5`（短 `7c6eb12`），标题 `fix: propagate generation failures and preserve usage`，共 24 个文件，推送到 `origin/dev`。GitHub Actions Run #42851391164 的 `test` 作业结论为 success。

本地检查结果：

- 全量 `bun run test`：4332 pass、0 fail、232 个文件。
- 目标回归（含覆盖）：397 pass、0 fail、12 个文件。
- 新增且被 LCOV 记录的 `src` 代码行：573 / 633，占 90.52%。
- `lint:all`、`build`、`typecheck:all` 均通过。

行为要点：

1. `src/lib/chat-completions-stream.ts` 新增 `ChatCompletionFailure { message; type; code }`、`getChatCompletionFailure`，并扩展 `guardChatCompletionsStream(source, options?: { reportPostFinishErrors?: boolean })`。默认 `false` 保留 Chat 路径在正常 `finish_reason` 之后忽略连接 late-close 的既有行为；Responses 与 Messages 传 `true`。
2. 首个失败被锁存，保留该帧内的实际 delta，继续排空上游以收集并覆盖合并 `usage` 与 `copilot_usage`，在流结束时先输出一条带汇总用量的 `choices: []` chunk，最后只输出一次 `event: error`。顺序由 OMP 的解析行为决定：错误事件之后的 chunk 不会被读取。
3. 仅带 `copilot_errors` 分类码、缺少具体 message 时仍保留 `Provider returned error finish_reason` 文案，否则 OMP 会判为不可重试。
4. Responses 的 Chat fallback 在流式失败时将已开启的输出项标为 `incomplete` 并补齐关闭事件，最后发一次 `response.failed`；非流式返回 HTTP 502 与 `status: "failed"`。
5. Messages 的 Chat fallback 在 `message_start` 之前失败时只发一次 Anthropic `error`；已发送 `message_start` 时先关闭未完成的内容块，在有累计用量时发一条 `stop_reason: null` 的 `message_delta`，最后发一次 `error`，不发 `message_stop`。非流式返回 HTTP 502 的 Anthropic `api_error`。
6. 配置的 OpenAI-compatible provider 的 Messages 入口同样接入共享守卫与非流式 502：`src/routes/provider/messages/handlers/openai-compatible.ts`。修复前该路径会重复发送 `error` 并丢失尾随用量，非流式失败落入通用 500。
7. 失败请求记录 `request_outcome: "error"`，终端不打完成标记，错误日志记录已脱敏的 `message`、`type`、`code`。

## ⑩ OMP 离线互操作验收（实测）

使用真实 `streamOpenAICompletions` 与 `AIError` 分类函数，输入为本机 Hono 路由产生的 SSE 流；`fetch` 只允许 `http://offline-omp.local` 这一目标，`maxHttpAttempts: 1`，上游网络调用为 0。

| 输入形态 | `stopReason` | 可重试 | OMP 输出 token | 用量记录 | 部分文本保留 |
|---|---|---|---:|---:|---|
| `finish-error` | `error` | true | 60 | 1 条 | — |
| `partial-finish-error` | `error` | true | 60 | 1 条 | 是 |
| `json-error` | `error` | true | 60 | 1 条 | 是 |
| `finish-error-code-only` | `error` | true | 60 | 1 条 | — |

四组均记录 `request_outcome: "error"`、代理 `output_tokens` 为 60、`total_nano_aiu` 为 123。

## ⑪ 脱敏与凭据边界

探测结果文件中曾出现响应头 `Copilot-Edits-Session` 的原值，随后改为 `<REDACTED>`，并确认未脱敏值数量为 0。后续输出不再读取或打印该值。

错误消息脱敏规则要求敏感词（`session`、`authorization`、`secret`、`cookie`、`api-key`、`request`、`headers` 等）后接键值分隔符（`:`、`=`、`{`、`[`）或命中 Bearer 与 token 字面量才截断。只按单词本身匹配会把上游正常的 `Session expired`、`Authorization failed`、`invalid_session` 也清除成通用错误。

## ⑫ 证据边界

- 已确认 CAPI 的流内失败信号与官方客户端的处理方式，来源为现役源码与 Issue。
- 已确认 `gemini-4-argon` 在简单单工具请求中接受 `auto` 与 `validated` 两个取值，结果相同。
- 未确认 CAPI 对 `gemini-4-argon` 是否把 `validated` 映射为 Google 的 `VALIDATED` 模式。
- 未确认 `validated` 对长上下文、全部工具集下的空响应失败率有无影响；历史故障未在本次重现。
- 未确认无 `tools` 时携带 `tool_choice: "validated"` 的返回结果。
- 未确认当前运行实例是否已加载本轮配置改动与新代码。
- 未验证真实上游模型的新一轮生成表现。
