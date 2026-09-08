# Kimi Claw 专用网关（agent-gw.kimi.com）

> Sources: 直接 API 探测 + 官方文档 + GitHub 代码搜索，2026-09-08
> Raw: [2026-09-08-kimi-claw-gateway-probe](../../raw/kimi-claw/2026-09-08-kimi-claw-gateway-probe.md)
> Updated: 2026-09-08

## 定位

Kimi Claw 的 agent 专用网关，与 Kimi Code（`api.kimi.com/coding`）和开放平台（`api.moonshot.ai`）是三条独立产品线，共享会员额度池。

## 模型目录（2026-09-08 实测）

| ID | 标称 context | 默认 effort | 备注 |
|---|---|---|---|
| `k3-agent`（默认） | 1,000,000 | HIGH | XL 档标 "Allegro plan only" |
| `k2d6-agent` | 262,144 | LOW | |

- `k3-agent` 的 `contextLengthOptions`：`L`(Standard) / `XL`(仅 Allegro)
- 官方文档中无 `k3-agent` 名称；Claw 帮助中心内部标识为 `kimi-coding/k3`

## 会员档位与 1M 门槛

| 档位 | 价格/月 | Kimi Code 1M | Kimi Claw 1M |
|---|---|---|---|
| Andante | ¥49 | ✗ | ✗ |
| Moderato | ¥99 | ✗ | ✗ |
| Allegretto | ¥199 | ✓ | ✗ |
| Allegro | ¥699 | ✓ | ✓ |

来源：`kimi.com/help/membership/membership-pricing` + Claw /models 探测。

## k3-agent 身份

**未证实推断：最可能是真 K3，非缩水/蒸馏版。** 证据：

1. tokscale 定价层硬映射 `k3-agent → kimi-k3`（`pricing/aliases.rs:12-21`）
2. Kimi Work/Claw 与 Kimi Code CLI 共享 `wire.jsonl` 协议和 `usage.record` 计量格式（tokscale issue #1145）
3. 官方 SDK manifest 托管在 `cdn.kimi.com/agentgw/`
4. 社区无缩水指控

**未知**：是否同一推理集群；是否有额外提示词改写层；`CONTEXT_LENGTH_L` 确切 token 数（推断 256K，未证实）。

## 已知问题

- 429 "engine overloaded" 频繁（github.com/MoonshotAI/kimi-cli/issues/2077）
- 付费会员报服务不稳定（v2ex.com/t/1199411）
- Allegretto 档无法使用 XL/1M 上下文

## See Also

- [Kimi Code 模型配置](https://www.kimi.com/code/docs/en/kimi-code/models.html)
- [Kimi 会员价格](https://www.kimi.com/help/membership/membership-pricing)
- [Kimi Claw 概览](https://www.kimi.com/help/kimi-claw/overview)
