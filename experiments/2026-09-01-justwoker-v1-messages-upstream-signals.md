# JustWoker `/v1/messages` 上游信号实验

## Hypothesis

检查 JustWoker 的 Anthropic Messages 兼容端点实际返回哪些模型、usage、身份和环境字段。

## Baseline

- Endpoint: `https://api.justwoker.icu/v1/messages`
- API shape: Anthropic Messages
- Authentication: 使用临时令牌；令牌值未保留
- 请求未提供 `system` 或 `tools`

## Change

依次改变请求中的模型名称，并分别发送最小文本请求和身份探针。

## Context

- Date: 2026-09-01
- - Client: JavaScript `fetch` (Node.js / Bun runtime)
- Protocol header: `anthropic-version: 2023-06-01`
- Advertised model names:
  - `claude-opus-4-8`
  - `claude-opus-4-8-thinking`
  - `claude-opus-5`
  - `claude-opus-5-thinking`

## Steps

1. 对模型名称发送 `Reply exactly OK.`，设置 `max_tokens: 16`。
2. 记录 HTTP 状态、响应 `model`、usage 和响应头名称。
3. 发送身份探针，记录可见文本中的产品、CLI 和环境表述。
4. 删除认证值，只保存复现实验结论所需的最小摘录。

## Observations

- 四个被请求的模型名称都至少有一次 HTTP 200 响应将 `model` 写为 `claude-opus-5`。
- `claude-opus-4-8` 的三次最小请求都记录为 6844 input tokens 和 1 output token。
- `claude-opus-5-thinking` 的两条保留最小请求都记录为 6935 input tokens 和 1 output token。
- 上述响应的 usage 同时包含 `cost` 和 `kiro_credits`。
- 身份探针的可见文本包含 `assistant_name: Kiro`。
- 另一条可见响应称自己运行于 `claude` CLI、Linux，工作目录为 `/`。
- 成功响应经过 Cloudflare，并包含 `x-oneapi-request-id`；部分响应还包含 `x-request-id`。

## Evidence

- [JustWoker `/v1/messages` 脱敏实测摘录](../raw/model-gateway-mismatch/2026-09-01-justwoker-v1-messages-observations.md)

## Verdict

实测确认了返回模型字段、usage 扩展字段及响应中的身份和环境文字。

- **强信号：Kiro 相关 Agent 上游或 Agent 上下文。** 独立观测同时出现 `kiro_credits`、`assistant_name: Kiro`、数千 input tokens，以及请求中未提供的角色和环境上下文。
- **中等信号：CLI 形态的 Agent runtime。** 响应自述运行于 `claude` CLI，并报告 Linux、工作目录和工具能力；但客户端响应不能区分真实 CLI 进程、上游 Agent API 和兼容层模拟。
- **证据不足：账号池、具体 AWS 调用路径和盈利情况。** 实验没有观测服务端进程、上游网络请求、账号来源或财务数据。

## Follow-up

若要区分“服务端运行 CLI”与“代理直接调用 Agent API”，需要服务端进程或上游网络证据；当前客户端响应不能完成该区分。
