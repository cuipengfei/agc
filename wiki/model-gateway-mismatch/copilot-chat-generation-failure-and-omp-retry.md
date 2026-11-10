# Copilot Chat 生成失败：跨协议传递、用量保留与 OMP 重试边界

> Sources: 本机仓库 copilot-api 源码、测试与 CI，2026-11-11; microsoft/vscode 现役 Copilot 源码与 Issue，2026-11-11; Copilot CAPI 直连实测，2026-11-11; Google Gemini API 函数调用文档，2026-11-11; 已安装 @oh-my-pi/pi-ai 源码，2026-11-11
> Raw: [生成失败传递与 validated 取值取证](../../raw/model-gateway-mismatch/2026-11-11-copilot-chat-generation-failure-and-validated-probe.md)
> Updated: 2026-11-11

## Overview

Copilot 后端（CAPI）在流中途无法完成生成时，用 `finish_reason: "error"` 结束该次响应，HTTP 状态仍是 200。代理若把任意结束原因当成正常终止，就会把一次生成失败记录成成功。本页记录 CAPI 的失败信号形态、三条下游协议各自的正确收尾方式、用量必须排在错误之前的顺序约束，以及 OMP 在识别这类失败时的分类与恢复边界。

另一个相关事实：Google 的 Gemini 原生 API 有 `validated` 函数调用模式，Copilot 客户端只在 Gemini 3 上按配置改写 `tool_choice`。`gemini-4-argon` 实测接受该取值，但两者能否等价映射未确认。

## CAPI 的流内失败信号

现役源码在 `microsoft/vscode` 的 `extensions/copilot` 目录。`microsoft/vscode-copilot-chat` 已在 2026 年 2 月归档。

- 服务端无法完成流时，CAPI 下发 `choice.finish_reason === "error"`；官方枚举写作 `FinishedCompletionReason.ServerError = 'error'`。
- 另一形态是没有 `choices`、但带顶层 `json.error` 的 chunk；`json.copilot_errors` 通过回调向上层报告。
- CAPI 不存在 `native_finish_reason` 字段。该字段属于 OpenRouter 扩展，OMP 读取它是为了兼容那类网关。
- 官方 VS Code 用户在 Gemini 模型下同样遇到 `Server error. Stream terminated`（Issue #278509），重试同样连续失败。这条否定了「官方客户端不会崩」的假设。
- 通用请求类型对 `tool_choice` 的声明是 `'none' | 'auto' | { type: 'function'; function: { name: string } }`，并注明 `'required'` 不受支持。

失败形态的判定要点：`copilot_errors` 字段存在本身不算失败；只有结束原因或顶层错误说明生成没有完成。

## 三种失败形态与既有误判

本机离线复现覆盖五种输入，只有显式 `event: error` 被记为失败：

| 输入 | HTTP | 终端完成标记 | `request_outcome` |
|---|---:|---|---|
| `finish_reason: "error"` + usage + `[DONE]` | 200 | 打印 | `completed` |
| 显式 `event: error` | 200 | 不打印 | `error` |
| 正常空内容 `stop` | 200 | 打印 | `completed` |
| `length` | 200 | 打印 | `completed` |
| `tool_calls` | 200 | 打印 | `completed` |

共享守卫把任意字符串 `finish_reason` 视为终止事件，错误分支又返回 `completion: null`，同一帧携带的用量随之丢失。两条下游转换路径各自把失败改写成成功：Responses 的 Chat 转换把 `"error"` 归入 `completed`；Messages 的结束原因映射没有 `"error"` 项，`stop_reason` 变成 `undefined`。

## 用量必须排在错误之前

OMP 使用自有 HTTP 与 SSE 解析路径，读到流内错误事件时立即抛错，后续 chunk 不再消费。这个消费顺序决定了代理的输出顺序：

1. 发现首个失败后锁存，同一帧里已经产生的 delta 仍要发出。
2. 继续读完上游，收集失败消息与后续消息的 `usage` 与 `copilot_usage`，按累计快照覆盖合并，保留已有的 token 明细。
3. 流结束时先发一条带汇总用量的 `choices: []` chunk。
4. 最后只发一次 `event: error`。

失败之后再转发内容、成功终态或第二个错误，都会让下游看到自相矛盾的流。

## 三条下游协议各自的收尾

Chat Completions 的共享守卫接受第二参数 `reportPostFinishErrors`。默认 `false` 保留既有行为：正常 `finish_reason` 之后连接断开仍按完成处理。Responses 与 Messages 转换路径传 `true`，因为这两条路径在收到 `[DONE]` 之前的连接异常本来就算失败。

| 入口 | 流式失败 | 非流式失败 |
|---|---|---|
| Chat Completions | 用量后单次 `event: error` | HTTP 502 错误 JSON |
| Responses 的 Chat 转换 | 已开启的输出项标 `incomplete`，补齐关闭事件，单次 `response.failed` | HTTP 502 且 `status: "failed"` |
| Messages 的 Chat 转换 | 见下方分支 | HTTP 502 的 Anthropic `api_error` |

Messages 分支取决于 `message_start` 是否已经发出。未发出时只发一次 `error`，服务端仍保存已收到的用量；已发出时先关闭未完成的内容块，在有累计用量时发一条 `stop_reason: null` 的 `message_delta`，最后发一次 `error`，不发 `message_stop`。

同一份转换逻辑有两条生产调用方：Copilot 主路径与配置的 OpenAI-compatible provider 路径。后者漏改会重复发送 `error`、丢失尾随用量，非流式失败还会落入通用 500。

## 可重试文案是硬约束

OMP 把 `finish_reason: "error"` 渲染成 `Provider returned error finish_reason`，并据此挂上 `ProviderFinishError`。下游的分类依赖这段文本，改写它等于改变重试资格。

因此当上游只给了分类码（例如 `copilot_errors` 里只有 `code`）而没有具体 message 时，回退文案必须保持 `Provider returned error finish_reason`。换成自定义措辞会让 OMP 判为不可重试。

用量与收尾的验收不能只看代理日志。把代理产出的 SSE 直接交给当前安装的 OMP 解析函数，才能证明可重试、用量和部分输出都还在：

| 输入形态 | `stopReason` | 可重试 | OMP 输出 token | 用量记录 | 部分文本 |
|---|---|---|---:|---:|---|
| `finish-error` | `error` | true | 60 | 1 条 | — |
| `partial-finish-error` | `error` | true | 60 | 1 条 | 保留 |
| `json-error` | `error` | true | 60 | 1 条 | 保留 |
| `finish-error-code-only` | `error` | true | 60 | 1 条 | — |

## OMP 的空响应恢复缺口

`turn-recovery.ts` 第 1073–1158 行的 `#isRecoverableProviderEmptyOutput` 要求 `stopReason === "error"` 且消息被归为 `AIError.Flag.EmptyResponse`，命中后注入 `#emptyStopRetryReminder()` 再重试。`Provider returned error finish_reason` 只带 `ProviderFinishError`，没有 `EmptyResponse` 标志。

结果是「内容为空 + 通用生成失败」这类回合走无提示的 `plain` 重试。本机三次重试都记录 `recovery: "plain"`，随后追加一条 `<system-notice>` 再请求才恢复。把空内容的 `ProviderFinishError` 接入已有的空响应提醒路径是候选改进，单次样本不足以证明稳定性。

## gemini-4-argon 的 validated 取值

Google 文档对 `validated` 的定义是：模型在函数调用与普通文字之间自行选择，并保证函数调用符合提供的 schema。对照 `any` 的「必须发起调用」与 `none` 的「禁止调用」。Vertex 文档补充，从 Gemini 3 起该模式还会强制必需参数存在。

Copilot 客户端只在 `hasTools` 且 `family` 包含 `gemini-3` 时，按 Gemini 专用配置改写字符串形式的 `tool_choice`；该配置的取值集合包含 `validated`，默认值就是 `validated`。`gemini-4-argon` 的 `family` 为 `gemini-4-argon`，不命中这段条件。

直连 CAPI 用同一提示、同一工具定义只改 `tool_choice` 做了两次请求：

| `tool_choice` | HTTP | `finish_reason` | 工具调用 | 输入 | 输出 |
|---|---:|---|---|---:|---:|
| `auto` | 200 | `tool_calls` | `add({"a":2,"b":3})` | 114 | 22 |
| `validated` | 200 | `tool_calls` | `add({"a":2,"b":3})` | 114 | 22 |

两个取值都被接受，结果完全相同。这只能说明参数被接受，不能说明 CAPI 对 Argon 映射到了 Google 的 `VALIDATED` 模式，也不能说明它能减少空响应失败。

## 客户端配置与网关改写的分工

参数由客户端声明比由代理统一改写更安全。OMP 的 `models.yml` 允许在模型条目上写 `compat.extraBody`，合并时机在 `providers/openai-completions.ts` 第 2276 行，晚于第 2204 行「工具列表为空时删除 `tool_choice`」的判断。由此产生三个确定后果：

- 静态 `extraBody` 覆盖单轮传入的 `tool_choice: "none"`。
- 工具列表为空的临时回合（`runEphemeralTurn` 会设置空工具列表与 `none`）在删除后仍被合并回 `validated`。
- 该合并绕过 `compat.supportsToolChoice` 判断。

因此给某个模型固定写入 `validated` 时，受影响的不只是带工具的主回合。主模型是该模型时，`/btw` 与 IRC 后台回复这类走 `runEphemeralTurn` 的回合也会携带该字段。该条目的 `compactionModel` 指向 `c8787/gpt-6-luna`，摘要回合使用另一个模型；标题生成使用哪个模型未核实。

## 凭据与脱敏

探测响应头里的 `Copilot-Edits-Session` 是会话凭据，出现后按已暴露处理，文件中改写为 `<REDACTED>`。

错误消息脱敏不能只匹配敏感词本身。规则要求敏感词后接键值分隔符（`:`、`=`、`{`、`[`）或命中 Bearer 与 token 字面量才截断。按单词直接匹配会把上游正常的 `Session expired`、`Authorization failed` 与错误码 `invalid_session` 一起清除成通用错误，等于把可用的诊断信息丢掉。

## 证据边界

- CAPI 的失败信号与官方客户端处理方式来自现役源码与 Issue，属于一手证据。
- `validated` 的语义来自 Google 文档，属于文档声明；CAPI 对 Argon 的映射没有公开说明。
- Argon 直连只覆盖简单单工具请求，长上下文与全部工具集下的失败率未测试。
- OMP 的恢复缺口来自源码与一次会话证据，改进效果未验证。
- 代理侧的协议行为已由全量测试与真实 OMP 解析函数覆盖；真实上游的新一轮生成表现未验证。

## See Also

- [模型 capability 声明与 gateway wire 参数不一致](reasoning-capability-vs-wire-parameter.md) — 声明支持某项能力与上游接受该 wire 参数是两个维度
- [SDK 对非标准 responses 帧的解析严格度差异](sdk-strictness-on-nonstandard-responses-frames.md) — 同一 relay 上不同解析器会改变结束状态
- [Gemini 4 Argon 上下文缓存：隐式缓存的掉点现象与社区反馈](../prompt-caching/gemini-4-argon-copilot-cache-drop.md) — 同一模型的缓存侧现象
- [OMP 配置语义手册](../omp-config/config-semantics.md) — `compat.extraBody` 与 provider 协议层设置
