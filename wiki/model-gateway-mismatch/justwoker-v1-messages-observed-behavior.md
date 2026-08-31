# JustWoker `/v1/messages` 实测行为

> Sources: JustWoker API 实测, 2026-09-01
> Raw: [JustWoker `/v1/messages` 脱敏实测摘录](../../raw/model-gateway-mismatch/2026-09-01-justwoker-v1-messages-observations.md)
> Updated: 2026-09-01

## Overview

本页只记录 JustWoker Anthropic Messages 端点的客户端可观察事实：请求和响应的模型字段、usage、响应头，以及响应自己给出的身份和环境文字。服务端进程、上游调用路径、账号来源和商业模式均未被本次实验观测。

## 测试条件

测试请求发送到 `https://api.justwoker.icu/v1/messages`，使用 `anthropic-version: 2023-06-01`。最小重复请求的用户消息为 `Reply exactly OK.`，`max_tokens` 为 `16`，请求体没有 `system` 或 `tools` 字段。

## 四个请求模型名返回同一模型字段

四个模型名称都至少有一次 HTTP 200 响应将返回的 `model` 写为 `claude-opus-5`：

- `claude-opus-4-8`
- `claude-opus-4-8-thinking`
- `claude-opus-5`
- `claude-opus-5-thinking`

`claude-opus-4-8` 的三次最小重复请求均返回文本 `OK`，并记录 6844 input tokens、1 output token、`cost: 0.0006104893320066336` 和 `kiro_credits: 0.03052446660033168`。

两条保留的 `claude-opus-5-thinking` 最小请求均返回文本 `OK`，并记录 6935 input tokens、1 output token、`cost: 0.0006270531794361527` 和 `kiro_credits: 0.03135265897180763`。

## 响应包含请求中没有提供的身份与环境文字

身份探针的请求没有 `system` 或 `tools` 字段。响应的可见文本表示消息前已有关于角色、响应约定、操作规则和当前时间的上下文。

同一响应自述为 Claude，运行于 `claude` CLI、Linux，工作目录为 `/`。另一条身份探针的可见 JSON 将 `assistant_name` 写为 `Kiro`；指纹探针还将 `called_kiro`、`kiro_cli_or_ide`、`coding_agent_role`、`filesystem_tools` 和 `shell_tools` 写为 `true`。

这些是响应内容本身。它们不能证明服务端实际启动了 `kiro-cli` 或 `claude` 进程。

## 证据强度

### 强信号：Kiro 相关 Agent 上游或上下文

以下观测同时出现：

- usage 字段名为 `kiro_credits`。
- 身份探针输出 `assistant_name: Kiro`。
- 四个请求模型名的响应 `model` 均为 `claude-opus-5`。
- 未提供 `system` 的最小请求被记录为 6844 或 6935 input tokens。
- 响应表示用户消息之前已有角色、操作规则和时间上下文。

这组相互独立的响应字段构成 Kiro 相关 Agent 上游或 Agent 上下文的强信号。

### 中等信号：CLI 形态的 Agent runtime

响应自述运行于 `claude` CLI，并给出 Linux、工作目录 `/`、文件系统和 shell 工具能力。这是 CLI 形态 Agent runtime 的信号，但同样的文字也可能由上游 Agent API 或兼容层提供，因此不足以确认服务端实际启动了 CLI 进程。

### 证据不足

当前响应没有给出可验证的服务端进程、上游网络、账号或财务记录，因此无法确认：

- 是否实际启动 `kiro-cli` 或 `claude` 进程。
- 是否使用账号池。
- 是否直接调用某条 AWS API。
- 服务的成本、收入或利润。

## 可观察的协议字段

非流式成功响应使用 `Content-Type: application/json`。一次流式请求使用 `Content-Type: text/event-stream`，其 `message_start` 事件同样将 `model` 写为 `claude-opus-5`。

成功响应由 Cloudflare 返回，并出现 `x-oneapi-request-id`；部分记录还包含 `x-request-id`。

## 站点侧矛盾（客户端可观察，未解释）

以下三组观测彼此冲突，均为已记录的客户端事实，但本次实验无法给出解释。

### `supported_endpoint_types` 声明与 OpenAI 路径实测不符

`/v1/models` 响应中四个模型均声明 `supported_endpoint_types: ["anthropic", "openai"]`。但早前对 OpenAI 路径 `POST /v1/chat/completions` 的实测结果为三个模型 HTTP 503 `all nodes exhausted`、一个模型 HTTP 403。声明来自面板配置，与上游该路径的实际可用性不一致。

### 站点 `usage.cost` 与面板倍率换算不一致

一次最小请求（`claude-opus-4-8`，6844 input / 1 output）的响应 `usage.cost` 为 `0.0006104893320066336` USD，折算约 0.089 USD/M input token。已认证的 `/api/pricing` 给出的倍率（`model_ratio: 0.25`，`completion_ratio: 5`，`group_ratio: 1`）按 New API 公式换算为约 0.50 USD/M input。两者相差约 5.6 倍。`usage.cost` 字段的计费口径未验证，该矛盾未解释。

### `claude-opus-4-8-thinking` 在 `/v1/messages` 返回 403

该模型在 `/v1/models` 中列出，且早期冒烟测试中 `/v1/messages` 返回 HTTP 200；但另一次 Anthropic 路径实测返回 HTTP 403。同一模型同一端点出现 200 与 403 两种结果，条件差异（例如账户额度、并发、上游路由状态）未确认。

## See Also

- [开源 Harness 与托管推理不是一回事](../ai-coding-agents/open-harness-vs-hosted-inference.md) — 客户端、Agent runtime、Provider 路由和模型是不同层。
- [模型 capability 声明与 gateway wire 参数不一致](reasoning-capability-vs-wire-parameter.md) — capability 与传输参数也需要分别验证。
