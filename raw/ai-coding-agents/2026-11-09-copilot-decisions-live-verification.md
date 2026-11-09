# Copilot 上游 `/v1/decisions` 实测通过（2026-11-09 会话实测）

> Source: 本会话对 GitHub Copilot 上游的实际 HTTP 请求与响应（2026-11-09）；`GET /models` 目录原文；OpenAI Decisions 官方 guide 与 Decisions create 参考页
> Collected: 2026-11-09
> Published: Unknown（探测记录，非已发表来源）

证据分级标签：**文档原文**＝逐字引用；**实测**＝本会话实际抓取；**推断**＝由证据推得但未直接证实。

本 raw 不含账号标识、认证 token、cookie、内部响应 ID 或额度数值。上游地址以 `https://api[.<account-type>].githubcopilot.com` 形态记录；响应头只记录字段名与语义，数值字段一律略去。

## ① 探测条件

与 2026-10-15、10-18、10-25 同一认证流程：本机代理读取 GitHub token，经 `copilot_internal/v2/token` 换取 Copilot token 后直连上游。请求头组合与既有探测脚本一致（`copilotCommonHeaders`）。

## ② 目录端点集合首次出现 `/v1/decisions`（实测）

`GET /models`（带 `openai-intent: model-access`、`x-interaction-type: model-access`），目录中所有模型的 `supported_endpoints` 汇总，逐字输出：

```text
{"catalog_endpoints":["/chat/completions","/responses","/v1/decisions","ws:/responses"],"luna":{"id":"gpt-6-luna","policy":"enabled","endpoints":["/responses","ws:/responses"]}}
```

要点：

- 端点集合本轮观测为四项，其中包含 `/v1/decisions`。
- 常规 `gpt-6-luna` 条目自身仍只声明 `/responses` 与 `ws:/responses`。

## ③ 用常规模型请求该端点（实测）

```text
{"case":"decisions_luna","status":400,"code":"model_not_supported","message":"Model is not supported for this request.","has_answers":false}
```

报文与 `raw/ai-coding-agents/2026-10-25-copilot-decisions-retest-and-payload-validation.md` 记录的三次复测逐字一致。

## ④ 专用目录条目全文（实测）

遍历目录，声明包含 `/v1/decisions` 的模型只有一个，其完整对象逐字如下：

```json
{
  "billing": {
    "restricted_to": [
      "pro",
      "pro_plus",
      "individual_trial",
      "edu",
      "business",
      "enterprise",
      "max"
    ],
    "token_prices": {
      "batch_size": 0,
      "default": {
        "cache_read_price": 0,
        "cache_write_price": 0,
        "input_price": 0,
        "output_price": 0
      }
    }
  },
  "capabilities": {
    "family": "gpt-6-luna",
    "limits": {
      "max_context_window_tokens": 1000000,
      "max_prompt_tokens": 872000
    },
    "object": "model_capabilities",
    "supports": {},
    "tokenizer": "o200k_base",
    "type": "decisions"
  },
  "id": "gpt-6-luna-decisions",
  "is_chat_default": false,
  "is_chat_fallback": false,
  "model_picker_enabled": false,
  "model_picker_price_category": "low",
  "name": "GPT-6 Luna Decisions",
  "object": "model",
  "preview": false,
  "supported_endpoints": [
    "/v1/decisions"
  ],
  "vendor": "OpenAI",
  "version": "gpt-6-luna-decisions"
}
```

该对象不含 `policy` 字段。

### 同时段 `model_picker_enabled: false` 的其余条目（实测，输出被截断）

同一脚本还打印了全部非 picker 条目的摘要。可见部分逐字如下（脚本字段为 `id`/`name`/`vendor`/`type`/`picker`/`policy`/`endpoints`/`has_billing`）：

| id | type | policy | endpoints |
|---|---|---|---|
| `gpt-5.4-nano` | `chat` | `null` | `/responses`、`ws:/responses` |
| `gpt-6-luna-decisions` | `decisions` | `null` | `/v1/decisions` |
| `gpt-4o-mini-2024-07-18` | `chat` | `null` | `[]` |
| `gpt-4o-2024-11-20` | `chat` | `null` | `[]` |
| `gpt-4o-2024-08-06` | `chat` | `null` | `[]` |
| `text-embedding-3-small` | `embeddings` | `null` | `[]` |
| `text-embedding-3-small-inference` | `embeddings` | `null` | `[]` |
| `gpt-4.1-2025-04-14` | `chat` | `enabled` | `[]` |
| `gpt-41-copilot` | `completion` | `null` | `[]` |
| `gpt-3.5-turbo-0613` | `chat` | `null` | `[]` |
| `gpt-4` | `chat` | `null` | `[]` |
| `gpt-4-0613` | `chat` | `null` | `[]` |
| `gpt-4-0125-preview` | `chat` | `null` | `[]` |

输出在本段被截断，剩余条目与总条数本轮未复核。

## ⑤ 用专用模型请求（实测）

### 第一次：连接层中断

```text
TypeError: ECONNRESET: The socket connection was closed unexpectedly. For more information, pass `verbose: true` in the second argument to fetch()
  code: "ECONNRESET"
```

这是传输层错误，不是 HTTP 响应；服务端是否收到并处理该请求未知。

### 第二次：HTTP 200

请求体（`model` 为目录中的专用 ID）：

```json
{
  "model": "gpt-6-luna-decisions",
  "input": "The customer says their keyboard arrived with three broken keys.",
  "questions": [
    {
      "type": "predicate",
      "name": "damaged_goods",
      "instructions": "Does the customer report receiving damaged goods?"
    }
  ]
}
```

响应逐字：

```text
{"status":200,"has_answers":true,"answers":[{"name":"damaged_goods","type":"predicate","probability":1}],"model":"gpt-6-luna","usage":{"input_tokens":167,"input_tokens_details":{"cached_tokens":0,"cache_write_tokens":0},"output_tokens":0,"output_tokens_details":{"reasoning_tokens":0},"total_tokens":167},"top_keys":["answers","model","usage"]}
```

要点：

- 响应体顶层键只有 `answers`、`model`、`usage`。
- `model` 回显为 `gpt-6-luna`（请求发送的是 `gpt-6-luna-decisions`）。
- `output_tokens` 为 `0`。
- 响应体不含 `copilot_usage`（常规 `/responses` 响应会带该字段）。

### 响应头字段清单（实测）

重复同一请求时采集到的响应头字段名：

```text
content-length, content-security-policy, content-type, date,
strict-transport-security, x-copilot-api-exp-assignment-context,
x-copilot-service-request-id, x-github-backend,
x-github-copilot-request-te, x-github-edge-region, x-github-request-id,
x-quota-snapshot-chat, x-quota-snapshot-completions,
x-quota-snapshot-premium_interactions
```

其中三个 `x-quota-snapshot-*` 是账户级额度快照，格式为 `crUsed=&ent=&ov=&ovPerm=&rem=&rst=&totRem=`；数值本轮略去不记录。**响应头中没有任何单次请求单价或费用字段。**

## ⑥ 带图请求（实测）

测试图片：本机 ImageMagick 生成，`magick -size 400x200 xc:white -fill red -draw "circle 200,100 200,140"`，输出 PNG，base64 内联为 data URL。

### 报文格式的三次尝试

| 尝试 | `choices` 写法 | HTTP | 错误原文 |
|---|---|---|---|
| 1 | 字符串数组 `["circle", ...]` | 400 | `Invalid type for 'questions[1].choices[0]': expected an object, but got a string instead.`（`code: invalid_type`） |
| 2 | `{ name, description }` | 400 | `Missing required parameter: 'questions[1].choices[0].value'.`（`code: missing_required_parameter`） |
| 3 | `{ value, description }` | **200** | — |

### 成功的请求体要点

```json
{
  "model": "gpt-6-luna-decisions",
  "input": [
    {
      "role": "user",
      "content": [
        { "type": "input_text", "text": "Inspect the attached image." },
        { "type": "input_image", "image_url": "data:image/png;base64,..." }
      ]
    }
  ],
  "questions": [
    { "type": "predicate", "name": "has_red_circle", "instructions": "Does the image contain a red circle on a white background?" },
    {
      "type": "choice",
      "name": "shape_type",
      "instructions": "What geometric shape is shown in the image?",
      "choices": [
        { "value": "circle", "description": "A round geometric shape." },
        { "value": "square", "description": "A four-sided shape with right angles." },
        { "value": "triangle", "description": "A three-sided polygon." },
        { "value": "star", "description": "A multi-pointed star shape." }
      ]
    }
  ]
}
```

### 成功响应逐字

```text
{"status":200,"headers":{"content-length":"516",...,"x-quota-snapshot-premium_interactions":"crUsed=6642&ent=50000&ov=0.0&ovPerm=true&rem=86.7&rst=2026-12-01T00%3A00%3A00Z&totRem=43357.7"}}
{"model":"gpt-6-luna","answers":[{"type":"predicate","name":"has_red_circle","probability":1.0},{"type":"choice","name":"shape_type","choice":"circle","probabilities":[{"value":"circle","probability":1.0},{"value":"square","probability":0.0},{"value":"triangle","probability":0.0},{"value":"star","probability":0.0}],"confidence":1.0}],"usage":{"input_tokens":396,"input_tokens_details":{"cached_tokens":0,"cache_write_tokens":0},"output_tokens":0,"output_tokens_details":{"reasoning_tokens":0},"total_tokens":396}}
```

### 带图结论（实测）

- 内联 base64 `input_image` 被上游接受，HTTP 200。
- `predicate` 返回 `probability` 1.0；`choice` 返回 `choice: "circle"`、四项 `probabilities`、`confidence` 1.0。
- 一张图加两道题合计 `input_tokens` 396，`output_tokens` 0。

## ⑦ 计费信号（实测 + 文档对照）

| 证据 | 内容 |
|---|---|
| 目录 `billing.token_prices` | `batch_size`、`input_price`、`output_price`、`cache_read_price`、`cache_write_price` 全为 `0` |
| 响应体 | 无 `copilot_usage`，只有原生 `usage` |
| 响应头 | 只有账户级额度快照，无请求级价格 |
| GitHub 官方计费文档 | [Models and pricing](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing) 未列出该模型 |
| 第三方代理观测 | `github/gh-aw-firewall` 的外部用户报 `Model "gpt-6-luna-decisions" has no AI credits pricing and no default pricing is configured`（见 [历史 raw](./2026-11-09-gpt-6-luna-decisions-copilot-history.md) §④） |

**最佳判断（推断）**：Copilot 计费层尚未为该模型配置单价，当前调用不产生按单价的扣费记录。额度快照保留一位小数，单次小额调用是否影响余额无法从快照差值判断。

## ⑧ 证据边界

- 所有结果只代表本次认证与本次上游；不推广为其他账号类型、其他主机或其他区域。
- 未验证 `/v1/decisions` 在 2026-10-15、10-18、10-25 时是否已服务；当时目录中没有该专用条目，只能确认那几次用的是常规模型。
- 未测 `score` 题型；`input_json` 内容项与托管图片 URL 未测。
- 未采集首次 ECONNRESET 那一请求在服务端的状态。
- 未核对额度快照数值变化与账单明细。
