# OMP Codex WebSocket 传输判定与回退

> Sources: 本机 @oh-my-pi 包 18.12.6 源码, 2026-10-24
> Raw: [omp-codex-websocket-transport](../../raw/omp-config/2026-10-24-omp-codex-websocket-transport.md)
> Updated: 2026-10-24

## Overview

OMP 按 `models.yml` 中 provider 的 `api` 字段选择流式实现。三种 OpenAI 兼容的 `api` 里，只有 `openai-codex-responses` 带 WebSocket 路径；`openai-responses` 与 `openai-completions` 只有 HTTP 与 SSE。WebSocket 是否启用由全局设置、模型字段、进程环境变量三者共同决定，判定顺序与展示用的偏好函数并不一致。

## 按 api 分实现

| `api` | 实现函数 | WebSocket 路径 |
|---|---|---|
| `openai-codex-responses` | `streamOpenAICodexResponses` | 有，失败后可转入 SSE |
| `openai-responses` | `streamOpenAIResponses` | 无，经 `postOpenAIStream` 走 HTTP 与 SSE |
| `openai-completions` | `streamOpenAICompletions` | 无，经 `postOpenAIStream` 走 HTTP 与 SSE |

`openai-responses.ts`、`openai-completions.ts`、`openai-http.ts` 三个文件检索 `WebSocket` 与 `websocket` 均为零命中；`postOpenAIStream` 发送 HTTP POST，带 `Accept: text/event-stream`，再用 `decodeStream` 解析事件。同一 `baseUrl` 可以对应不同 `api`，传输能力因此不同。

## 三处开关

| 开关 | 位置 | 取值与作用 |
|---|---|---|
| `providers.openaiWebsockets` | `config.yml` | `auto`（默认）、`off`、`on`；描述限定为 OpenAI Codex models |
| `preferWebsockets` | 模型条目 | 布尔值；`false` 表示该模型不走 WebSocket |
| `PI_CODEX_WEBSOCKET` | 进程环境变量 | 布尔覆盖；经 `$flag` 解析 |

全局设置到调用级偏好由 `resolveOpenAIWebsocketPreference` 完成：`on` 映射 `true`，`off` 映射 `false`，`auto` 映射 `undefined`（交给模型默认）。

## 实际判定次序

`shouldUseCodexWebSocket` 的判定顺序：

| 次序 | 条件 | 结果 |
|---|---|---|
| 1 | 模型 `preferWebsockets === false` | 否 |
| 2 | 无会话状态，或会话状态 `disableWebsocket` 为真 | 否 |
| 3 | `PI_CODEX_WEBSOCKET` 已设置 | 取该值 |
| 4 | 调用级 `preferWebsockets === false`（全局 `off` 由此进入） | 否 |
| 5 | 以上皆不成立 | 是 |

由此得到两条方向相反的结论：

- 模型级 `false` 排在第一，能挡住环境变量 `true`。
- 全局 `off` 排在环境变量之后，环境变量 `true` 能盖过它。

## 状态展示与实际传输

`isOpenAICodexWebSocketPreferred` 采用另一套次序：环境变量、调用级 `false`、调用级 `true` 或模型 `true`，没有模型级否决项。它服务于偏好展示，不能用来推断实际连接。

`OpenAICodexTransportDetails` 同时暴露两类字段：

| 字段 | 含义 |
|---|---|
| `websocketPreferred` | 由上面的偏好函数得到，表示倾向 |
| `lastTransport` | 最近一次实际使用的传输，取 `sse` 或 `websocket` |
| `websocketDisabled` | 会话是否已禁用 WebSocket |
| `websocketConnected` | 当前是否保持连接 |
| `fallbackCount` | 已发生的回退次数 |
| `canAppend` | 是否具备增量追加条件 |
| `prewarmed` | 是否已预热 |
| `hasSessionState`、`hasTurnState` | 是否持有会话状态与轮次状态 |

判断某次请求实际走了哪条传输时看 `lastTransport`，`websocketPreferred` 只说明倾向。

## 传输细节

URL 由 `toWebSocketUrl` 从请求地址改写：`https` 换成 `wss`，`http` 换成 `ws`。

`openai-beta` 头按传输取不同值：WebSocket 用 `responses_websockets=2026-02-06`，SSE 用 `responses=experimental`。

WebSocket 帧无法携带单请求 HTTP 头，因此每次 `response.create` 通过 `client_metadata` 携带会话相关信息，Responses Lite 标记也映射到该键下。服务端侧的回传走另一种事件：`response.metadata` 事件的 `headers` 字段承载 `x-codex-turn-state`，客户端从中读取并保留首个非空值，使同轮后续请求在两种传输上维持同一粘性路由标记。

## 失败后转入 SSE

连接级致命错误命中 `CODEX_WEBSOCKET_FATAL_PATTERNS`（`websocket error:`、`websocket closed before open`、`connection timeout`）时立即回退；其他连接错误按重试预算重试，预算用尽后再回退。回退时调用 `recordCodexWebSocketFailure` 并传入 `activateFallback`，会话状态写入 `disableWebsocket`，后续请求直接走 SSE。未选中 WebSocket 时会关闭空闲连接，避免保留半开套接字。

## 本机 8787 三个 provider

| provider | `api` | `gpt-5.6-luna` 的 `preferWebsockets` | 结论 |
|---|---|---|---|
| `openai-codex` | `openai-codex-responses` | `false` | 走 SSE，环境变量 `true` 无法改变 |
| `c8787` | `openai-responses` | 未设置 | 没有 WebSocket 路径可关闭 |
| `c8787-chat` | `openai-completions` | 该 provider 下无此模型条目 | 没有 WebSocket 路径可关闭 |

`providers.openaiWebsockets` 当前为 `auto`。全局改为 `off` 只影响 Codex 类型模型，对后两个 provider 没有作用。

## 证据边界

本篇描述 OMP `openai-codex-responses` 的实现，包含 `responses_websockets=2026-02-06` 这一 Codex 专用标记。这些行为用于 OMP 客户端，不能读作 OpenAI 平台通用规则；通用机制见 [Responses API WebSocket 模式](../openai-api/responses-websocket-mode.md)。

结论来自 18.12.6 源码静态阅读。未抓取网络帧，未确认 `PI_CODEX_WEBSOCKET` 的当前环境值。升级后行号与字段可能位移。

## See Also

- [Responses API WebSocket 模式](../openai-api/responses-websocket-mode.md)
- [OMP 环境变量全量参考](../omp/env-variables-reference.md)
- [GPT-6 Luna 与 Sol（8787 Copilot 网关）三宿主接入记录](../copilot-gateway/gpt-6-luna-sol-config.md)
