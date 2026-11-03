# 8787 网关 Responses 通道 prompt_cache_retention 字段实测与 gpt-6-luna 命中探针

> Source URL: http://localhost:8787/v1（本机 GitHub Copilot 网关 headroom pid 1339720）
> Collected: 2026-11-03
> Published: 2026-11-03

## 调用方式

curl + python3 urllib，Authorization: Bearer dummy。dummy bearer 在本次探针请求成功；未保存或分析响应头，未验证其他鉴权方式。

## 字段回显结果（Responses 通道）

POST /v1/responses，body `{"model": "<id>", "input": "Reply with the single word ok.", "max_output_tokens": 16}`。

12 个模型中 7 个返回 200，响应体顶层含 `prompt_cache_retention` 字段：

| 模型 | HTTP | prompt_cache_retention |
|---|---|---|
| gpt-6-astra | 200 | `"24h"` |
| gpt-5.6-terra | 200 | `"24h"` |
| gpt-6.1-sol | 200 | `"24h"` |
| gpt-6-luna | 200 | `"24h"` |
| gpt-6-sol | 200 | `"24h"` |
| gpt-5.3-codex | 200 | `"24h"` |
| mai-code-1.1-flash | 200 | `"in_memory"` |

5 个模型返回错误，响应体无该字段，不纳入字段统计：

| 模型 | HTTP | 错误信息 |
|---|---|---|
| gemini-3.8-flash | 502 | `Chat Completions fallback returned a stream` |
| gemini-4-argon | 502 | `Chat Completions fallback returned a stream` |
| text-embedding-3-small | 400 | `This model does not support the responses endpoint.` |
| text-embedding-3-small-inference | 400 | 同上 |
| text-embedding-ada-002 | 400 | 同上 |


## Chat Completions 通道对照

POST /v1/chat/completions，body `{"model": "<id>", "messages": [{"role": "user", "content": "Reply with ok."}], "max_tokens": 16}`。

| 模型 | HTTP | 是否含 prompt_cache_retention | prompt_tokens_details |
|---|---|---|---|
| gemini-3.8-flash | 200 | 否 | `{"cached_tokens": 0}` |
| gemini-4-argon | 200 | 否 | `{"cached_tokens": 0}` |
| gpt-6-astra 等 7 个推理模型 | 400 | — | —（`model is not accessible via the /chat/completions endpoint`） |
| 3 个 embedding | 400 | — | —（`Model is not supported for this request.`） |

`prompt_cache_retention` 字段是 Responses 通道的字段；Chat 通道的 Gemini 响应不含此字段，缓存计量在 `usage.prompt_tokens_details.cached_tokens`。

## gpt-6-luna 缓存命中探针（单模型）

构造 4856 token 的长前缀请求（重复文本约 26400 字符 + 问题），对 gpt-6-luna 发两次完全相同的请求：

第一次请求响应 usage：
```json
{"input_tokens": 4856, "input_tokens_details": {"cache_write_tokens": 4853, "cached_tokens": 0}, "output_tokens": 21, "output_tokens_details": {"reasoning_tokens": 14}, "total_tokens": 4877}
```

第二次相同请求响应 usage：
```json
{"input_tokens": 4856, "input_tokens_details": {"cache_write_tokens": 0, "cached_tokens": 4853}, "output_tokens": 28, "output_tokens_details": {"reasoning_tokens": 21}, "total_tokens": 4884}
```

两次响应顶层均含 `prompt_cache_retention: "24h"`。

首次写入 4853 token（cache_write_tokens），无命中（cached_tokens=0）。二次写入为 0，4853 token 全部命中（cached_tokens）。数字来自服务端 usage 报告；没有取得实际折扣账单，未验证命中请求的价格。

此探针只验证了 gpt-6-luna 一个模型的命中路径。其余 5 个 GPT 模型（gpt-6-astra、gpt-5.6-terra、gpt-6.1-sol、gpt-6-sol、gpt-5.3-codex）只验证了字段回显（"24h"），未做长前缀双请求命中探针。

## 小输入探测的 cached_tokens

短输入（约 10 token）下，7 个成功响应的 `cached_tokens` 均为 0，与 OpenAI 自动缓存最小前缀门槛（1024 token）一致；本探针没有验证该门槛是未命中的原因。错误响应（502/400）无 usage 字段。

## Gemini Responses 502 说明

两个 Gemini 模型经 Responses 端点返回 502，错误文本为 `Chat Completions fallback returned a stream`。仅记录当次请求的网关错误文本，不推断其背后的模型语义，也不据此判断 Responses 通道的长期可用性。本探针直接发送原始请求，未携带 OMP 的 `cacheRetention` 设置。

## 模型列表

GET /v1/models 返回 12 个模型 id：
gpt-6-astra, gemini-3.8-flash, gemini-4-argon, gpt-5.6-terra, gpt-6.1-sol, gpt-6-luna, gpt-6-sol, gpt-5.3-codex, mai-code-1.1-flash, text-embedding-3-small, text-embedding-3-small-inference, text-embedding-ada-002
