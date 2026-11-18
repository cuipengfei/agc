# Kimi Claw 模型目录与上下文档位探测（2026-11-18）

> Source: GET https://agent-gw.kimi.com/coding/v1/models（认证头 `x-api-key`、`anthropic-version: 2023-06-01`，密钥不记录）; https://www.kimi.com/code/docs/en/kimi-code/error-reference.html; https://docs.openclaw.ai/providers/moonshot; https://www.kimi.com/help/kimi-claw/overview; https://www.kimi.com/en/help/others/chat-issues; https://www.kimi.com/membership/pricing
> Collected: 2026-11-18
> Published: Unknown

## API 响应

`GET https://agent-gw.kimi.com/coding/v1/models` 返回 200，`object: "list"`，`has_more: false`，`default_model_id: "k3-agent"`，`cacheTtlSeconds: 300`，`first_id: "k3d1-agent"`，`last_id: "k3-agent"`。响应头包含 `x-msh-track-id`、`x-trace-id`、`x-internal-adhoc-canary`，server 为 nginx。

### k3d1-agent

- `display_name`: "K3.1 Pro"
- `description`: "Complex tasks and professional work, all-around flagship"
- `created_at`: "2026-08-21T00:00:00Z"
- `legacyIds`: ["k3-agent"]
- `switchableTo`: ["k2d8-preview", "k3-agent"]
- `context_length`: 1000000
- `defaultContextLength`: "CONTEXT_LENGTH_L"
- `defaultReasoningEffort`: "REASONING_EFFORT_HIGH"
- `supports_reasoning`: true，`supports_image_in`: true，`supports_video_in`: true
- `contextLengthOptions`:
  - `CONTEXT_LENGTH_L`，displayName "Standard"，available true
  - `CONTEXT_LENGTH_XL`，displayName "Extra Long"，description "Up to 1M tokens; consumes more credits"，label "Available for Allegro/Max members and above"，available false，minMembershipLevel "LEVEL_ADVANCED"
- `reasoningEffortOptions`:
  - `REASONING_EFFORT_LOW`，displayName "Standard"
  - `REASONING_EFFORT_HIGH`，displayName "High"
  - `REASONING_EFFORT_MAX`，displayName "Max"，description "Consumes more credits"
- `swarm`: enabled true，minMembershipLevel "LEVEL_BASIC"
- `speedOptions`:
  - `standard`，displayName "Standard"，available true
  - `fast`，displayName "High"，description "Switching will result in 2x or more usage"，label "Allegretto/Pro plan and above"，available true，minMembershipLevel "LEVEL_INTERMEDIATE"

### k3-agent

- `display_name`: "K3"
- `description`: "Chat & Agent, flagship all-rounder"
- `created_at`: "2026-08-21T00:00:00Z"
- `legacyIds`: ["k3", "k3-agent-ultra", "k3-agent-swarm"]
- `switchableTo`: ["k3d1-agent", "k2d8-preview"]
- `context_length`: 1000000
- `defaultContextLength`: "CONTEXT_LENGTH_L"
- `defaultReasoningEffort`: "REASONING_EFFORT_HIGH"
- `supports_reasoning`: true，`supports_image_in`: true，`supports_video_in`: true
- `contextLengthOptions`: `CONTEXT_LENGTH_L` available true；`CONTEXT_LENGTH_XL` available false，minMembershipLevel "LEVEL_ADVANCED"
- `reasoningEffortOptions`: `REASONING_EFFORT_LOW` / `REASONING_EFFORT_HIGH` / `REASONING_EFFORT_MAX`
- `swarm`: enabled true，minMembershipLevel "LEVEL_BASIC"
- 无 `speedOptions` 字段

### k2d8-preview

- `display_name`: "K2.8 Preview"
- `description`: "Well-rounded and efficient for everyday tasks"
- `created_at`: "2026-08-21T00:00:00Z"
- `legacyIds`: ["k2d6-agent"]
- `switchableTo`: ["k3d1-agent", "k3-agent"]
- `context_length`: 1000000
- `defaultContextLength`: "CONTEXT_LENGTH_L"
- `defaultReasoningEffort`: "REASONING_EFFORT_HIGH"
- `supports_reasoning`: true，`supports_image_in`: true，`supports_video_in`: true
- `contextLengthOptions`: `CONTEXT_LENGTH_L` available true；`CONTEXT_LENGTH_XL` available false，minMembershipLevel "LEVEL_ADVANCED"
- `reasoningEffortOptions`: `REASONING_EFFORT_LOW` / `REASONING_EFFORT_HIGH` / `REASONING_EFFORT_MAX`
- `swarm`: enabled true，minMembershipLevel "LEVEL_BASIC"
- 无 `speedOptions` 字段

### 与 2026-09-08 探测的对比

2026-09-08 的 raw 记录 `k2d6-agent` 标称 context 为 262,144；本次目录中 `k2d8-preview` 的 `legacyIds` 为 ["k2d6-agent"]，`context_length` 为 1000000。`k3d1-agent` 为新增条目，`k3-agent` 仍为 `default_model_id`。

## 官方文档摘录

### Kimi Code 错误参考（No 1M Access）

- "error, status code: 403, message: Your current plan supports only k3 up to 256K context. 1M context is available on higher-tier Kimi Code plans."
- "Your current plan only supports up to 256K context when calling `k3`. The 1M context window for K3 requires an Allegretto / Pro plan or above; Moderato / Plus only supports up to 256K context."
- "error, status code: 403, message: Your current plan supports only k3.1-pro up to 256K context. 1M context is available on higher-tier Kimi Code plans."
- "Your current plan only supports up to 256K context when calling `k3.1-pro`. To use up to 1M context, upgrade to a Pro / Allegretto plan or above. Plus / Moderato only supports up to 256K context."

### OpenClaw 的 Moonshot provider 目录

| Model ref | Context | Max output |
|---|---|---|
| `kimi/k3.1-pro` | 1,048,576 | 131,072 |
| `kimi/k3` | 1,048,576 | 131,072 |
| `kimi/k3-256k` | 262,144 | 131,072 |

- "The catalog reports K3's maximum context; your Kimi membership may enforce a lower live limit."
- "Kimi Code rejects disabled thinking for K3.1 Pro, so the K3.1 refs do not offer `off` and default to `high`."

### Kimi Claw 帮助中心（overview）

- "Kimi Claw 默认使用 Kimi K2.6 模型。"
- "执行后请确认 `session_status` 输出中 `model` 显示为 `kimi-coding/k3`，且 `context` 上限为 `1.0m`。"
- "一键部署仅支持 Allegretto 及以上计划"

### Kimi 帮助中心聊天问题 FAQ

- "For very long documents, K3 offers a 1M-token context (available with the top-tier membership); when composing, select Conversation length: Extra long."

### Kimi 会员价格页

- 计划名：Free / Plus / Pro / Max / Ultra。
- 计划权益表包含 "K3 Extra Long chat capacity (up to 1M tokens)"。
- 计划特性列表包含 "Up to 1M tokens of context for ultra-long conversations" 与 "Deploy your Kimi Claw in one click"。

## 本机配置（2026-11-18 改动后）

`~/.omp/agent/models.yml` 的 `kimi-claw` provider（`api: anthropic-messages`，`baseUrl: https://agent-gw.kimi.com/coding`，`apiKey` 省略）配置三个模型，均取 `contextWindow: 262144`：

```yaml
  kimi-claw:
    api: anthropic-messages
    baseUrl: https://agent-gw.kimi.com/coding
    models:
      - id: k3d1-agent
        compactionModel: c8787/gpt-6-luna
        name: K3.1 Pro
        reasoning: true
        input:
          - text
          - image
        contextWindow: 262144
      - id: k3-agent
        compactionModel: c8787/gpt-6-luna
        name: K3
        reasoning: true
        input:
          - text
          - image
        contextWindow: 262144
      - id: k2d8-preview
        compactionModel: c8787/gpt-6-luna
        name: K2.8 Preview
        reasoning: true
        input:
          - text
          - image
        contextWindow: 262144
```

`./pull.sh` 将该文件同步到仓库 `omp/agent/models.yml`（`updated=1`）。

## 取值判断（推断）

- API 的 `context_length: 1000000` 是模型上限；`defaultContextLength` 为 `CONTEXT_LENGTH_L`，XL 项对本次 key `available: false`，`minMembershipLevel` 为 `LEVEL_ADVANCED`。
- Kimi Code 官方错误参考把非 1M 档的上限写为 256K。Claw 网关沿用同一套 `CONTEXT_LENGTH_L` / `CONTEXT_LENGTH_XL` 命名，按此推断 L 档为 256K，客户端 `contextWindow` 取 262,144。
- XL 变为可用后，`contextWindow` 可改为 1,000,000；XL 的描述为 "Up to 1M tokens; consumes more credits"。
