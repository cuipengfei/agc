# OpenCode 与 Kilo 免费模型池规则及最小实测

> Source: https://opencode.ai/docs/console/models/；https://opencode.ai/docs/models/；https://kilo.ai/docs/gateway/models-and-providers；https://kilo.ai/docs/getting-started/using-kilo-for-free；本会话对模型目录与推理端点的最小实测，2026-11-25
> Collected: 2026-11-25
> Published: Unknown

## OpenCode 官方规则

`https://opencode.ai/docs/console/models/` 原文：

> Free-tier chat models require OpenCode; use paid models or Go from other clients.

同页「Pricing」段原文：

> Console uses pay-as-you-go pricing. Below are the prices **per 1M tokens**, with image models priced per image where noted.

同页模型价格表原文摘录：

> | 模型 | 输入 | 输出 | 缓存读取 | 缓存写入 |
> | --- | --- | --- | --- | --- |
> | DeepSeek V4.1 Flash Free | Free | Free | Free | - |
> | Kimi K3.1 Pro | $2.00 | $10.00 | $0.20 | $2.00 |
> | Kimi K3 | $3.00 | $15.00 | $0.30 | $3.00 |
> | DeepSeek V4.1 Flash (60% off) | ~~$0.30~~ $0.12 | ~~$1.20~~ $0.48 | ~~$0.006~~ $0.0024 | - |

同页「Free models」段原文：

> - DeepSeek V4.1 Flash Free is free on OpenCode for a limited time. Its provider follows a zero-retention policy and does not use your data for model training.
> - MiMo-V2.6-Flash Free is available on OpenCode for a limited time. The team is using this time to collect feedback.
> - Nemotron 3.5 Lightning Free is available on OpenCode for a limited time. The team is using this time to collect feedback and improve the model.
> - Nemotron 3.5 Super VL Free is available on OpenCode for a limited time. The team is using this time to collect feedback and improve the model.
> - Big Pickle is a stealth model that's free on OpenCode for a limited time. The team is using this time to collect feedback and improve the model.
> - Tidepool Alpha Free is a stealth model that's free on OpenCode for a limited time.
> - Iceman Free is a stealth model that's free on OpenCode for a limited time.
> - Beam Free is free on OpenCode for a limited time. Its provider does not use your data for model training and retains it for 30 days for safety reasons.
> - Flint 40B Free is free on OpenCode for a limited time.
> - Hy4 flash Free is free on OpenCode for a limited time. Its provider follows a zero-retention policy and does not use your data for model training.
> - Jev 1.13 Free is available on OpenCode for a limited time.

同页「Privacy」段原文开头：

> All our models are hosted in the US and EU. Our providers follow a zero-retention policy and do not use your data for model training, with the following exceptions:
>
> - Big Pickle: During its free period, collected data may be used to improve the model.
> - Tidepool Alpha Free: During its free period, collected data is retained and used to improve the model.
> - Iceman Free: During its free period, collected data is retained and used to improve the model.
> - Flint 40B Free: During its free period, collected data may be used to improve the model. Data is retained for 30 days.
> - Nemotron 3.5 Lightning Free (NVIDIA free endpoints): Trial use only — do not submit personal or confidential data. Your use is logged for security purposes and to improve NVIDIA products and services.
> - Nemotron 3.5 Super VL Free (NVIDIA free endpoints): Trial use only — do not submit personal or confidential data. Your use is logged for security purposes and to improve NVIDIA products and services.

`https://opencode.ai/docs/models/` 原文：

> Set `OPENCODE_DISABLE_FREE_MODELS=1` (or `true`) on the server process to hide free OpenCode models
>
> Free means an `opencode` or `opencode-go` model with no input price.

## Kilo 官方规则

`https://kilo.ai/docs/gateway/models-and-providers` 原文：

> You can browse the full list of available models via the models endpoint:
>
> `GET https://ai-gateway.kilo.ai/api/v1/models`
>
> This returns model information including pricing, context window, and supported features. No authentication is required.

同页「Free models」段原文：

> Several models are available at no cost, subject to rate limits. Availability changes; check the live model catalog for current free options and model IDs.
>
> Free models are available to both authenticated and anonymous users. Anonymous users are rate-limited to 200 requests per hour per IP address.

同页「Auto Free」数据说明原文：

> Auto Free may route your requests to providers that log prompts and outputs and use them to improve their services. Do not submit personal or confidential data when using Auto Free. In particular, it may route to NVIDIA's free endpoints (see NVIDIA Trial Terms of Service above).

## 2026-11-25 目录观测

### OpenCode 模型目录

请求：

```text
GET https://opencode.ai/inference/v1/models
Authorization: Bearer public
```

观测结果：HTTP 200，返回可解析的模型清单。

`deepseek-v4.1-flash-free` 条目的相关字段：

```json
{
  "id": "deepseek-v4.1-flash-free",
  "object": "model",
  "owned_by": "opencode",
  "name": "DeepSeek V4.1 Flash Free",
  "canonical_id": "deepseek/deepseek-v4.1-flash-1017",
  "cost": {
    "text": {
      "input": {
        "price": 0,
        "cache": {
          "read": 0
        }
      },
      "output": {
        "price": 0
      }
    }
  }
}
```

`kimi-k3` 条目的相关字段：

```json
{
  "id": "kimi-k3",
  "object": "model",
  "owned_by": "opencode",
  "name": "Kimi K3",
  "canonical_id": "moonshotai/kimi-k3",
  "cost": {
    "text": {
      "input": {
        "price": 3,
        "cache": {
          "read": 0.3,
          "write": 3
        }
      },
      "output": {
        "price": 15
      }
    }
  }
}
```

`kimi-k3.1-pro` 条目的相关字段：

```json
{
  "id": "kimi-k3.1-pro",
  "object": "model",
  "owned_by": "opencode",
  "name": "Kimi K3.1 Pro",
  "canonical_id": "moonshotai/kimi-k3.1-pro",
  "cost": {
    "text": {
      "input": {
        "price": 2,
        "cache": {
          "read": 0.2,
          "write": 2
        }
      },
      "output": {
        "price": 10
      }
    }
  }
}
```

同一响应中的 `deepseek-v4.1-flash` 条目价格为输入 `0.12`、输出 `0.48`。目录元数据没有给 `deepseek-v4.1-flash-free` 标注到期时间；到期描述来自上述 Console models 官方页面。

### Kilo 模型目录

请求：

```text
GET https://ai-gateway.kilo.ai/api/v1/models
```

观测结果：首次请求返回可解析的模型清单。按 `isFree` 与模型名称筛出的相关行：

```text
kilo-auto/free	Auto Free	true
inclusionai/ling-3.2-flash:free	inclusionAI: Ling 3.2 Flash (free)	true
nvidia/nemotron-3.5-super-vl:free	NVIDIA: Nemotron 3.5 Super VL (free)	true
moonshotai/kimi-k3	MoonshotAI: Kimi K3	false
moonshotai/kimi-k3.1-pro	MoonshotAI: Kimi K3.1 Pro	false
deepseek/deepseek-v4.1-flash-1017	DeepSeek: DeepSeek V4.1 Flash 1017	false
```

第二次仅读取 HTTP 状态码的请求遇到 TLS `unexpected eof`，因此本文件不把这次失败计入目录内容判断。

## 2026-11-25 最小推理请求

### Kilo 匿名免费池

请求目标：`POST https://ai-gateway.kilo.ai/api/v1/chat/completions`

请求体关键字段：

```json
{
  "model": "kilo-auto/free",
  "messages": [
    {
      "role": "user",
      "content": "Reply with exactly PONG."
    }
  ],
  "max_tokens": 16,
  "stream": false
}
```

响应：HTTP 200。

响应中的相关字段：

```json
{
  "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
  "provider": "Nvidia",
  "choices": [
    {
      "finish_reason": "length",
      "native_finish_reason": "length",
      "message": {
        "role": "assistant",
        "content": null,
        "reasoning": "The user wants me to reply with exactly \"PONG\". I will do just"
      }
    }
  ],
  "usage": {
    "prompt_tokens": 22,
    "completion_tokens": 16,
    "total_tokens": 38,
    "cost": 0
  }
}
```

`max_tokens: 16` 用尽在思考内容上，正文为 `null`。这次请求证明匿名请求被接受且 `cost` 为 0，没有完成完整回答能力验证。

### OpenCode 免密通道

请求目标：`POST https://opencode.ai/inference/openai/v1/chat/completions`

请求头包含：

```text
Authorization: Bearer public
```

请求体关键字段：

```json
{
  "model": "deepseek-v4.1-flash-free",
  "messages": [
    {
      "role": "user",
      "content": "Reply with exactly PONG."
    }
  ],
  "max_tokens": 8,
  "stream": false
}
```

响应：HTTP 429。

响应体原文：

```json
{
  "type": "error",
  "error": {
    "type": "FreeUsageLimitError",
    "message": "Free usage limit reached. Free models work in OpenCode (https://opencode.ai); subscribe to OpenCode Go to keep going: https://opencode.ai/go"
  }
}
```

这次请求没有模拟 OpenCode 官方客户端形状。错误同时提到免费额度限制与“在 OpenCode 内使用”，因此本次观测不能把 429 单独归因于额度耗尽，也不能单独归因于客户端检查；它只作为一条未分离原因的并列记录。

## 证据边界

- 模型价格与 `isFree` 是 2026-11-25 的上游目录快照，属于上游自述；没有独立验证模型权重身份。
- Kilo 的 200 次请求限制来自官方文档；本会话只做了 1 次匿名推理请求，没有测试限制边界。
- OpenCode 的 429 是裸客户端单次观测，不用于推导具体额度数值或重置周期。
- 不写入账号、cookie、API key 或其它私密凭据。`Bearer public` 是上游公开的免密标识。
