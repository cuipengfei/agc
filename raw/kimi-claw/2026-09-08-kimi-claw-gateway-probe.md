# Kimi Claw 网关探测与会员档位证据

> Source: 直接 API 探测 + 官方文档 + GitHub 代码搜索
> Collected: 2026-09-08
> Published: 2026-09-08

## API 探测（agent-gw.kimi.com）

- **端点**: `GET https://agent-gw.kimi.com/coding/v1/models`
- **认证头**: `x-api-key` + `anthropic-version: 2023-06-01`
- **结果**: 200 OK，返回 2 个模型，`has_more: false`

| ID | 标称 context | 默认 effort | 图像/视频 |
|---|---|---|---|
| `k3-agent` | 1,000,000 | HIGH | ✓/✓ |
| `k2d6-agent` | 262,144 | LOW | ✓/✓ |

- `k3-agent` 的 `contextLengthOptions`: `L`(Standard) / `XL`(Allegro plan only, LEVEL_ADVANCED)
- `supported_reasoning_efforts`: LOW / HIGH / MAX
- 响应头含 `x-msh-track-id`、`x-trace-id`、`x-internal-adhoc-canary`，server 为 nginx

## 会员档位（官方帮助中心）

- URL: `https://www.kimi.com/help/membership/membership-pricing`
- 四档：Andante(¥49) → Moderato(¥99) → Allegretto(¥199) → Allegro(¥699)
- Kimi Code 1M 上下文：Allegretto 起
- Kimi Claw 1M 上下文（XL）：仅 Allegro
- 三产品线（开放平台/Code/Claw）共享同一额度池

## 三产品线对照

| 产品线 | 端点 | 模型 ID | 计费 |
|---|---|---|---|
| 开放平台 | api.moonshot.ai/v1 | `kimi-k3` | 按 token |
| Kimi Code | api.kimi.com/coding/v1 | `k3`, `k3-256k` | 订阅（共享额度池） |
| Kimi Claw | agent-gw.kimi.com/coding | `k3-agent`, `k2d6-agent` | 订阅（共享额度池） |

- Claw 帮助中心（`kimi.com/help/kimi-claw/overview`）：切 K3 后显示 `model: kimi-coding/k3`，context 1.0m
- 官方文档无 `k3-agent` 名称（仅 Claw 网关 API 返回中出现）

## k3-agent 身份间接证据

- tokscale `pricing/aliases.rs:12-21`：硬映射 `k3-agent → kimi-k3`（https://github.com/junhoyeo/tokscale/pull/1147）
- tokscale issue #1145：Kimi Work/Claw 与 Kimi Code CLI 共享 `wire.jsonl` 协议和 `usage.record` 计量格式（https://github.com/junhoyeo/tokscale/issues/1145）
- 官方 SDK manifest 托管在 `cdn.kimi.com/agentgw/pysdk/manifest.json`（https://github.com/MoonshotAI/kimi-cli/issues/2505）

## CONTEXT_LENGTH_L token 数

- 无官方文档；所有客户端仅透传枚举字符串，数字映射在服务端
- 唯一第三方硬编码：codex-spur `kimi_target.rs` 写 `maxContextSize: 262144`
- kimi-cli 官方源码直接取 API `context_length` 字段，不做本地映射
- **未证实推断**: L ≈ 262,144（256K）

## 用户配置实测（2026-09-08）

- OMP `~/.omp/agent/models.yml` → `kimi-claw/k3-agent`: `contextWindow: 262144`
- OpenCode `~/.config/opencode/opencode.jsonc` → `kimi-claw.k3-agent`: `limit.context: 262144`

## 社区反馈（非官方）

- https://github.com/MoonshotAI/kimi-cli/issues/2077：付费会员报 "engine overloaded"
- https://www.v2ex.com/t/1199411：付费会员报 "AI应用繁忙"
- 无社区成员声称 k3-agent 是缩水/蒸馏版
