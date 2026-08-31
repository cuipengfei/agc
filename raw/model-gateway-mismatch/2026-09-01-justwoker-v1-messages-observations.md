# JustWoker `/v1/messages` 脱敏实测摘录

> Source: 本会话对 `https://api.justwoker.icu/v1/messages` 的脱敏实测记录
> Collected: 2026-09-01
> Published: Unknown

## 测试边界

- 请求使用 Anthropic Messages 形态：`POST /v1/messages`。
- 请求头包含 `anthropic-version: 2023-06-01`；认证值已删除，不在本文件保存。
- 下列重复测试的用户消息为 `Reply exactly OK.`，`max_tokens` 为 `16`。
- 重复测试请求体没有 `system` 字段，也没有 `tools` 字段。

## 模型字段与 usage

以下均为 HTTP 200 响应中的原始字段摘录：

| 请求中的 `model` | 观测次数 | 响应中的 `model` | `input_tokens` | `output_tokens` | `cost` | `kiro_credits` |
|---|---:|---|---:|---:|---:|---:|
| `claude-opus-4-8` | 3 | `claude-opus-5` | 6844 | 1 | 0.0006104893320066336 | 0.03052446660033168 |
| `claude-opus-5` | 1 条保留记录 | `claude-opus-5` | 6844 | 1 | 0.0006104893320066336 | 0.03052446660033168 |
| `claude-opus-5-thinking` | 2 条保留记录 | `claude-opus-5` | 6935 | 1 | 0.0006270531794361527 | 0.03135265897180763 |

`claude-opus-4-8-thinking` 的另一条身份探针记录：

```json
{
  "requested_model": "claude-opus-4-8-thinking",
  "status": 200,
  "response_model": "claude-opus-5",
  "usage": {
    "cost": 0.0021454756888888886,
    "input_tokens": 7324,
    "kiro_credits": 0.10727378444444444,
    "output_tokens": 235
  }
}
```

重复测试的响应文本为 `OK`。三个 `claude-opus-4-8` 响应的 usage 数值完全相同；两条保留的 `claude-opus-5-thinking` 响应的 usage 数值也完全相同。

## 响应中的身份与环境文字

身份探针的请求仍未提供 `system` 或 `tools` 字段。`claude-opus-4-8-thinking` 请求返回的可见文本包含：

> There was prior context before your message — system setup covering my role, response conventions, operating guidelines, plus a context entry for the current time.

同一响应还包含：

> I'm Claude, running in the `claude` CLI, working in `/` on Linux.

另一条身份探针的可见响应包含 JSON 字段：

```json
{
  "assistant_name": "Kiro"
}
```

另一条指纹探针的可见响应包含：

```json
{
  "called_kiro": true,
  "kiro_cli_or_ide": true,
  "coding_agent_role": true,
  "filesystem_tools": true,
  "shell_tools": true,
  "aws_or_bedrock_context": "unknown",
  "steering_files": false,
  "spec_workflow": "unknown",
  "workspace_path_known": true
}
```

这些段落只记录服务返回的文字，不证明服务端实际启动了名为 `kiro-cli` 或 `claude` 的本地进程。

## 响应头

成功的非流式响应包含：

- `Content-Type: application/json`
- `Server: cloudflare`
- `x-oneapi-request-id`
- `x-request-id`
- `CF-RAY`

一次流式请求返回：

- HTTP 200
- `Content-Type: text/event-stream`
- `Server: cloudflare`
- `x-oneapi-request-id`
- `CF-RAY`

该 SSE 的 `message_start` 事件中，响应 `model` 为 `claude-opus-5`。
