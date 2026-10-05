# JustWoker `/v1/messages` 实测行为

> Sources: JustWoker API 实测, 2026-09-01; JustWoker `/v1/models` 目录与 UA 实测, 2026-09-05; JustWoker 流式空响应与工具替换实测, 2026-10-04 至 2026-10-05
> Raw: [JustWoker `/v1/messages` 脱敏实测摘录](../../raw/model-gateway-mismatch/2026-09-01-justwoker-v1-messages-observations.md); [Anthropic 兼容 relay 的 `/v1/models` 目录形态与 UA 门槛](../../raw/model-gateway-mismatch/2026-09-05-anthropic-relay-catalog-and-ua.md); [流式空响应诊断与断路器 shim 设计](../../raw/model-gateway-mismatch/2026-10-05-justwoker-empty-stream-and-breaker-shim.md); [运行时替换 tools 与 system 的实测](../../raw/model-gateway-mismatch/2026-10-05-justwoker-tools-and-system-replacement.md); [claude-quince 是 Bedrock Opus 4.8 的内部代号](../../raw/model-gateway-mismatch/2026-10-05-claude-quince-bedrock-codename.md); [shim 工具仿真层实现](../../raw/model-gateway-mismatch/2026-10-05-shim-tool-emulation-implementation.md)
> Updated: 2026-10-05

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

一次最小请求（`claude-opus-4-8`，6844 input / 1 output）的响应 `usage.cost` 为 `0.0006104893320066336` USD。已认证的 `/api/pricing` 给出的倍率（`model_ratio: 0.25`，`completion_ratio: 5`，`group_ratio: 1`）按 New API 公式换算后与 `usage.cost` 字段不一致。`usage.cost` 字段的计费口径未验证，该矛盾未解释。

### `claude-opus-4-8-thinking` 在 `/v1/messages` 返回 403

该模型在 `/v1/models` 中列出，且早期冒烟测试中 `/v1/messages` 返回 HTTP 200；但另一次 Anthropic 路径实测返回 HTTP 403。同一模型同一端点出现 200 与 403 两种结果，条件差异（例如账户额度、并发、上游路由状态）未确认。

## 目录条目不含能力字段（2026-09-05 观测）

`/v1/models` 的 `data[0]` 键集合只有：

```json
["created_at","display_name","id","type"]
```

没有 `capabilities`、没有 `billing`、没有 `claude_model_id`。因此把 Claude Code 指向该 relay 时，上下文窗口、输出上限一类能力值无法从目录读取，只能来自客户端本地静态配置。

这与本机 Copilot 网关形成对照：后者同一端点会给出 `claude_model_id`、`billing.token_prices` 与 `capabilities.limits`。上文 2026-09-01 记录的 `supported_endpoint_types` 字段属于站点面板配置，与这里说的能力字段不是同一组。

## User-Agent 影响目录响应码（2026-09-05 观测）

同一 URL、同一认证头，只改 `User-Agent`：Python 标准库 `urllib.request` 的默认 UA 得到 HTTP 403，浏览器 UA（`Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36`）得到 HTTP 200。

同期还观测到目录请求间歇失败：同一命令连续执行，部分次数返回可解析 JSON，部分次数因超时或非 200 无结果；失败次数的完整统计未记录。因此把该 relay 目录当作程序化数据源时需要重试。

## 流式 `/v1/messages` 丢内容块（2026-10-04 观测）

`stream: true` 的请求返回 HTTP 200 SSE，但整个流只有信封事件（`message_start`/`message_delta`/`message_stop`），零个内容块事件。非流式同参数请求返回完整内容。OMP 只走流式，因此每个回合都拿到计费空响应，重试 3 次后报 empty stop。

## 运行时替换客户端 Tools 与 System（2026-10-04 至 2026-10-05 观测）

发送带 `xyzzy_` 前缀的假工具，模型报告只看到 `read_tabular` 和 `system_todo_write`。`read` 和 `write` 两个名字原生透传（模型能以 tool_use 块调用），其余全部被替换。运行时不替换客户端 system，而是把自己的指令追加在后；但超长 system（~176K）里注入的内容会被淹没。邻居 OMP session 的模型逐字倒出上下文：头部是通用 invoke 模板，`read_tabular` 的 schema 里内嵌 Snowpark stored procedure 源码（`SnowflakeFile.open` + openpyxl/xlrd），上下文里没有 OMP 的任何规则。

## `served claude-quince` 是 Bedrock Opus 4.8 的代号（2026-10-05 查证）

`claude-quince` 是 Opus 4.8 经 AWS Bedrock 路由时的内部代号，见 protobuf 签名头 field #6 的绑定记录（`MING-ZCH/open-thinking-replay` 实验记录与 `ptr.pet/cliproxyapi` 生产签名校验代码两个独立来源）。模型层未被替换，替换发生在运行时层。

## 本地 shim 绕行方案（2026-10-05 实现）

`~/code-inside/justwoker-shim/shim.ts`：Bun 单文件代理（127.0.0.1:4151），断路器 + 非流式回退 + SSE 合成 + 文本协议工具仿真。OMP 的 models.yml 里 justwoker baseUrl 指向它。详见 [justwoker-shim 设计](justwoker-shim-design.md)。

## See Also

- [justwoker-shim 设计](justwoker-shim-design.md) — 断路器、SSE 合成、文本协议仿真的完整设计。

- [开源 Harness 与托管推理不是一回事](../ai-coding-agents/open-harness-vs-hosted-inference.md) — 客户端、Agent runtime、Provider 路由和模型是不同层。
- [模型 capability 声明与 gateway wire 参数不一致](reasoning-capability-vs-wire-parameter.md) — capability 与传输参数也需要分别验证。
- [Gateway catalog 是客户端配置的权威源](gateway-catalog-as-config-authority.md) — 本机 Copilot 网关的目录字段与本 relay 的对照。
