# Kimi Claw 专用网关（agent-gw.kimi.com）

> Sources: 直接 API 探测 + 官方文档 + GitHub 代码搜索，2026-09-08; 直接 API 探测 + 官方文档，2026-11-18
> Raw: [2026-09-08-kimi-claw-gateway-probe](../../raw/kimi-claw/2026-09-08-kimi-claw-gateway-probe.md); [2026-11-18-kimi-claw-models-catalog](../../raw/kimi-claw/2026-11-18-kimi-claw-models-catalog.md)
> Updated: 2026-11-18

## 定位

Kimi Claw 的 agent 专用网关，与 Kimi Code（`api.kimi.com/coding`）和开放平台（`api.moonshot.ai`）是三条独立产品线，共享会员额度池。

## 模型目录（2026-11-18 实测）

| ID | 显示名 | 标称 context | 默认长度档 | legacyIds | 备注 |
|---|---|---|---|---|---|
| `k3d1-agent` | K3.1 Pro | 1,000,000 | `CONTEXT_LENGTH_L` | `k3-agent` | 独有 fast 速度档 |
| `k3-agent`（默认） | K3 | 1,000,000 | `CONTEXT_LENGTH_L` | `k3`、`k3-agent-ultra`、`k3-agent-swarm` | |
| `k2d8-preview` | K2.8 Preview | 1,000,000 | `CONTEXT_LENGTH_L` | `k2d6-agent` | |

- 顶层字段：`default_model_id: k3-agent`、`has_more: false`、`cacheTtlSeconds: 300`。
- 三者都支持 `REASONING_EFFORT_LOW` / `REASONING_EFFORT_HIGH` / `REASONING_EFFORT_MAX`，默认 `REASONING_EFFORT_HIGH`；图片与视频输入；`swarm` 开启，最低 `LEVEL_BASIC`。
- `k3d1-agent` 的 `speedOptions` 提供 `fast` 档（显示名 High），最低 `LEVEL_INTERMEDIATE`，描述 "Switching will result in 2x or more usage"。

### 2026-09-08 目录（已过时）

| ID | 标称 context | 默认 effort | 备注 |
|---|---|---|---|
| `k3-agent`（默认） | 1,000,000 | HIGH | XL 档标 "Allegro plan only" |
| `k2d6-agent` | 262,144 | LOW | |

> **Status: Outdated** (2026-11-18)
> 目录已扩为三个模型：`k2d6-agent` 成为 `k2d8-preview` 的 legacy ID，新增 `k3d1-agent`，`k3-agent` 与 `k2d8-preview` 的 `context_length` 均为 1,000,000。旧表中 `k2d6-agent` 的 262,144 只对应当时的标称字段。

## 上下文档位与客户端取值

- `context_length: 1000000` 是模型上限。每个模型另带 `defaultContextLength: CONTEXT_LENGTH_L` 与 `contextLengthOptions`；XL 项对本次 key `available: false`，`minMembershipLevel: LEVEL_ADVANCED`，标签为 "Available for Allegro/Max members and above"。
- Kimi Code 官方错误参考：非 1M 档调用 `k3` 或 `k3.1-pro` 时报 256K 上限，1M 需要 Pro / Allegretto 及以上。Claw 网关沿用同一档位命名，按此推断 L 档为 256K。
- OpenClaw 的 Moonshot 目录把 `kimi/k3-256k` 标为 262,144，`kimi/k3.1-pro` 标为 1,048,576，并注明会员可能施加更低在线上限。
- 本机 OMP 的 `kimi-claw` provider 三个模型统一 `contextWindow: 262144`。XL 变为可用后可改为 1,000,000；XL 的描述为 "Up to 1M tokens; consumes more credits"。
- `k2d8-preview` 的标称 context 已变为 1,000,000，XL 同样不可用，仍取 262,144。

## 会员档位与 1M 门槛

| 档位 | 价格/月 | Kimi Code 1M | Kimi Claw 1M |
|---|---|---|---|
| Andante | ¥49 | ✗ | ✗ |
| Moderato | ¥99 | ✗ | ✗ |
| Allegretto | ¥199 | ✓ | ✗ |
| Allegro | ¥699 | ✓ | ✓ |

来源：`kimi.com/help/membership/membership-pricing` + Claw /models 探测。

> **Status: Outdated** (2026-11-18)
> 当前价格页使用 Free / Plus / Pro / Max / Ultra 计划名，并把 "K3 Extra Long chat capacity (up to 1M tokens)" 列为计划权益。Claw 一键部署要求 Allegretto 及以上；帮助中心切换 K3 后预期 `context` 上限为 `1.0m`。XL 是否可用按账号权益返回，本次 key 的 XL 标记为不可用。

## k3-agent 身份

**未证实推断：最可能是真 K3，非缩水/蒸馏版。** 证据：

1. tokscale 定价层硬映射 `k3-agent → kimi-k3`（`pricing/aliases.rs:12-21`）
2. Kimi Work/Claw 与 Kimi Code CLI 共享 `wire.jsonl` 协议和 `usage.record` 计量格式（tokscale issue #1145）
3. 官方 SDK manifest 托管在 `cdn.kimi.com/agentgw/`
4. 社区无缩水指控

2026-11-18 目录新增 `k3d1-agent`（K3.1 Pro），其 `legacyIds` 为 `["k3-agent"]`；同时 `k3-agent` 仍是独立条目与 `default_model_id`。该字段不宜单独作为改名或路由证据（推断）。`k3-agent` 的 `legacyIds` 还包含 `k3`、`k3-agent-ultra`、`k3-agent-swarm`。

**未知**：是否同一推理集群；是否有额外提示词改写层。`CONTEXT_LENGTH_L` 的数字按 Kimi Code 错误参考推断为 256K，Claw 网关响应没有直接给出。

## 已知问题

- 429 "engine overloaded" 频繁（github.com/MoonshotAI/kimi-cli/issues/2077）
- 付费会员报服务不稳定（v2ex.com/t/1199411）
- Claw 的 XL/1M 是否可用按账号权益返回；本次 key 的 XL 标记为不可用

## See Also

- [Kimi Code 模型配置](https://www.kimi.com/code/docs/en/kimi-code/models.html)
- [Kimi 会员价格](https://www.kimi.com/help/membership/membership-pricing)
- [Kimi Claw 概览](https://www.kimi.com/help/kimi-claw/overview)
