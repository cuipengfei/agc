# 免费模型聚合器的上游额度与客户端门

> Sources: Ebony-Vinyl/dsh-our-free-model repository, 2026-11-25; OpenCode docs, 2026-11-25; Kilo AI docs, 2026-11-25; 本会话目录查询与最小推理请求, 2026-11-25
> Raw: [dsh-our-free-model 的免费通道机制与源码证据](../../raw/model-gateway-mismatch/2026-11-25-dsh-our-free-model-mechanism.md); [OpenCode 与 Kilo 免费模型池规则及最小实测](../../raw/model-gateway-mismatch/2026-11-25-opencode-kilo-free-pool-rules-and-live-checks.md)
> Updated: 2026-11-25

## Overview

`dsh-our-free-model` 把 OpenCode 与 Kilo 的公共免费模型通道接入 DSH，并负责把 DSH 发出的请求整理成上游接受的形式。模型与算力仍由这些上游提供；用户侧看不到登录和 Key，来自上游通道本身的免密规则。这个案例说明，免费模型聚合器能否使用，由三件事共同决定：目标模型是否属于免费层、请求是否符合上游客户端要求、上游是否为该通道保留额度。

## 谁提供模型，谁承担成本

仓库 README 把插件定义为客户端，模型响应由 OpenCode、Kilo 或用户部署的 EAC 网关生成。两条公开通道的接入方式不同：

- OpenCode 免费车道使用公开的 `Authorization: Bearer public`，仓库中不包含用户自己的密钥。
- Kilo 免费池不需要账号、Key 或登录态，插件只按目录中的 `isFree: true` 选择模型。

因此，“无登录、无 Key”描述的是上游免密入口，并非插件提供了自有推理资源。免费推理的服务器成本由上游承担；这是从调用链与官方免费活动推断出的商业安排，公开材料没有给出各家的完整结算方式。

## 模型级免费资格

目录里出现一个模型，不能据此认定它属于免费池。2026-11-25 的目录快照如下。OpenCode 价格按官方表以美元 / 1M tokens 计：

| 模型条目 | OpenCode 目录（美元 / 1M tokens） | Kilo 目录 | 当前判断 |
|---|---|---|---|
| `deepseek-v4.1-flash-free` | Free（输入 0、输出 0）；官方说明为限时免费，提供方零保留且不用于训练 | 未出现同名条目 | 属于 OpenCode 免费层 |
| `deepseek-v4.1-flash` | 输入 $0.12、输出 $0.48 | `deepseek/deepseek-v4.1-flash-1017` 的 `isFree` 为 false | 付费条目 |
| `kimi-k3` | 输入 $3.00、输出 $15.00 | `moonshotai/kimi-k3` 的 `isFree` 为 false | 当前两边都不是免费项 |
| `kimi-k3.1-pro` | 输入 $2.00、输出 $10.00 | `moonshotai/kimi-k3.1-pro` 的 `isFree` 为 false | 当前两边都不是免费项 |

OpenCode 官方页面写明 DeepSeek V4.1 Flash Free 是限时免费，目录元数据没有给出到期时间。仓库简介把 DeepSeek V4.1 Flash 与 Kimi K3 并列写成“前沿模型完全免费”，2026-11-25 的实际目录只支持前者中的免费变体，Kimi K3 仍按付费模型列出。

## OpenCode 的客户端门

OpenCode 官方写明免费聊天模型要求在 OpenCode 客户端内使用；其他客户端应使用付费模型或 Go。仓库的适配文档则记录了另一层做法：插件按 OpenCode v2 客户端生成 User-Agent、会话头、官方系统提示与工具定义，并通过这些特征进入免费车道。文档还记录了旧客户端特征失效时返回 `403 FreeTierError`。

这层适配决定了 OpenCode 车道的稳定性。上游修改客户端版本、提示词、工具定义或会话格式，插件就需要跟随更新；未跟随的请求可能表现为 403、429 或模型不可用。官方文档对免费层的客户端限制与插件跨客户端接入之间存在制度差异，具体使用是否符合上游条款需要单独判断。

## 额度、隐私与“无限”的含义

Kilo 官方允许匿名用户使用免费模型，但给每个 IP 每小时 200 次请求。免费模型集合会随合作提供方变化。OpenCode 的免费模型为限时活动，官方目录还列出了一批在免费期内会记录或使用数据的例外模型。

仓库 README 对“不限量”的解释是不存在充值、套餐和 token 账单，同时承认按会话统计速率、短时间打满会返回 429。按通常的“无限请求”含义，这个说法不成立；Kilo 的固定匿名额度已经给出了明确上限。

OpenCode 的一次裸客户端请求返回了 429 `FreeUsageLimitError`。错误同时包含 `FreeUsageLimitError` 与 `Free models work in OpenCode`，本次观测无法把原因单独归为额度耗尽或客户端形状不符，因此它只作为未分离原因的记录，不用于推导具体额度或重置周期。

数据边界按模型和上游分组。Kilo Auto Free 可能路由到记录 prompt 与输出、并用于改进服务的提供方；OpenCode 多数模型声明零保留，但在免费期内存在列出名称的例外。免费标签无法替代逐模型检查数据政策。

## 长期稳定性判断

“白嫖聚合器”这个描述成立，但两条通道的稳定性基础不同：

- Kilo 的匿名访问有官方文档支持，边界清楚，仍受每 IP 每小时 200 次请求和免费模型轮换约束。
- OpenCode 的 DSH 接入依赖客户端形状适配，而官方把免费聊天模型限定在 OpenCode 内，上游检查规则变化会直接影响插件。
- 免费模型属于限时活动，模型下线、转付费或更换提供方后，聚合器只能跟随目录调整，无法控制供给。

适合临时、非敏感地试用模型或验证接入流程。需要持续可用、可审计额度和明确数据边界的生产流程，应使用官方客户端或自己控制额度的 API。

## 证据边界

- 模型价格与 `isFree` 是 2026-11-25 的上游目录快照，属于上游自述；没有独立验证模型权重身份。
- Kilo 匿名请求返回 HTTP 200、`cost: 0`，但 `max_tokens: 16` 用尽在思考内容上，正文为 `null`；这只证明请求被接受，没有完成完整回答能力验证。
- OpenCode 的 429 来自一次未模拟官方客户端形状的裸请求，原因未分离。
- 本会话没有执行完整插件，也没有审计仓库全部源码；本文结论限定在免费通道机制、目录与额度规则。

## See Also

- [免费强模型 API 候选与尝试排序](free-strong-model-api-candidates.md) — 免费或注册赠额候选的证据完整度与尝试顺序。
- [开源 Harness 与托管推理不是一回事](../ai-coding-agents/open-harness-vs-hosted-inference.md) — 客户端、runtime、provider 路由与模型四层判断框架。
- [Gateway catalog 是客户端配置的权威源](gateway-catalog-as-config-authority.md) — 目录字段决定模型选择与成本边界。
- [OpenCode V2 迁移](../opencode/opencode-v2-migration.md) — 客户端版本变化与跨版本兼容问题。
