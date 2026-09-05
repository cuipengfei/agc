# 本机 Copilot 网关 `/v1/models` 的 Claude-facing 与计费字段摘录

> Source: 本会话对 `http://localhost:4140/v1/models`（本机 copilot-api 网关实例）的实测记录
> Collected: 2026-09-05
> Published: Unknown

## 取证边界

- 请求为无认证的本机 `GET /v1/models`，返回 JSON。
- 本文件记录的字段只来自这一个本机 Copilot 网关实例。Anthropic 兼容 relay 的目录形态另见 `2026-09-05-anthropic-relay-catalog-and-ua.md`。
- 未记录认证值。

## `gpt-5.4` 单条目关键字段

```json
{
  "claude_model_id": "gpt-5.4[1m]",
  "billing": {
    "token_prices": {
      "batch_size": 1000000,
      "default": {
        "cache_price": 25,
        "cache_write_price": 0,
        "context_max": 272000,
        "input_price": 250,
        "output_price": 1500
      },
      "long_context": {
        "cache_price": 50,
        "cache_write_price": 0,
        "context_max": 922000,
        "input_price": 500,
        "output_price": 2250
      }
    }
  },
  "capabilities": {
    "family": "gpt-5.4",
    "limits": {
      "max_context_window_tokens": 1050000,
      "max_output_tokens": 128000,
      "max_prompt_tokens": 922000
    },
    "tokenizer": "o200k_base",
    "type": "chat"
  },
  "id": "gpt-5.4",
  "name": "GPT-5.4",
  "vendor": "OpenAI",
  "supported_endpoints": [
    "/responses",
    "/chat/completions",
    "ws:/responses"
  ]
}
```

同一条目里 `id` 是 `gpt-5.4`，`claude_model_id` 是 `gpt-5.4[1m]`；两者是不同字段。

## 全部有 `capabilities.limits` 的条目

`default_ctx` 取自 `billing.token_prices.default.context_max`，`long_ctx` 取自 `billing.token_prices.long_context.context_max`，`window` 取自 `capabilities.limits.max_context_window_tokens`，`max_output` 取自 `capabilities.limits.max_output_tokens`。`-` 表示该字段在条目中不存在。

| `id` | `claude_model_id` | `default_ctx` | `long_ctx` | `window` | `max_output` |
|---|---|---:|---:|---:|---:|
| `gemini-3.7-flash` | `gemini-3.7-flash[1m]` | 200000 | 936000 | 1000000 | 64000 |
| `gpt-5.4` | `gpt-5.4[1m]` | 272000 | 922000 | 1050000 | 128000 |
| `gpt-5.5` | `gpt-5.5[1m]` | 272000 | 922000 | 1050000 | 128000 |
| `gpt-5.6-luna` | `gpt-5.6-luna[1m]` | 200000 | 922000 | 1050000 | 128000 |
| `gpt-5.6-sol` | `gpt-5.6-sol[1m]` | 272000 | 922000 | 1050000 | 128000 |
| `gpt-5.6-terra` | `gpt-5.6-terra[1m]` | 272000 | 922000 | 1050000 | 128000 |
| `gpt-5.3-codex` | `gpt-5.3-codex` | 272000 | - | 400000 | 128000 |
| `gpt-5.4-mini` | `gpt-5.4-mini` | 272000 | - | 400000 | 128000 |
| `kimi-k2.7-code` | `kimi-k2.7-code` | 224000 | - | 256000 | 32000 |
| `gpt-5-mini` | `gpt-5-mini` | - | - | 264000 | 64000 |
| `mai-code-1.1-flash` | `mai-code-1.1-flash` | 128000 | - | 256000 | 128000 |
| `mai-code-1-flash-picker` | `mai-code-1-flash-picker` | 128000 | - | 256000 | 128000 |

12 个条目中 6 个的 `claude_model_id` 以 `[1m]` 结尾，另外 6 个与 `id` 相同。带 `[1m]` 的 6 个的 `window` 分别是 1000000 与 1050000。

`gpt-5-mini` 条目没有 `billing` 字段，因此没有 `default_ctx`。

同一次请求中另有若干条目没有 `capabilities.limits`（例如 `text-embedding-3-small`），未列入上表。

## 直接向 `/v1/messages` 发送两种 `model` 值

请求体为 `{"model":"<值>","max_tokens":8,"messages":[{"role":"user","content":"hi"}]}`，请求头含 `x-api-key: dummy` 与 `anthropic-version: 2023-06-01`：

| 请求中的 `model` | HTTP | 响应片段 |
|---|---:|---|
| `gpt-5.4-mini` | 200 | `{"id":"oCnvCegIHqPBnB1WK1BqRJO1K8ZQMvF6FH4MK6vMydRgQU64uHnxRgXQz3Fh+quUKq/ZWpTDMgvLh7nTuFsRxTc2nKL4vo1QNXf5YT8` |
| `gpt-5.4-mini[1m]` | 502 | `{"error":"no instance serves model: gpt-5.4-mini[1m]"}` |
