# Kiro 后端 API 给任意 agent 用：仓库生态与 OMP 视角排名

> Sources: 本会话 GitHub 实测与仓库源码直读, 2026-10-22
> Raw: [Kiro 仓库生态](../../raw/ai-coding-agents/2026-10-22-kiro-api-gateway-landscape.md); [Kiro 认证与 SoT](../../raw/model-gateway-mismatch/2026-10-22-kiro-auth-paths-billing-sot.md); [pi-provider-kiro 兼容断层](../../raw/omp-discovery/2026-10-22-omp-custom-provider-kiro-mismatch.md)
> Updated: 2026-10-22

## Overview

Kiro 订阅用户可以让任何 agent（OMP、Claude Code、OpenCode 等）消费其后端模型，目前有三条实现路径：**OMP 专用 provider**、**Anthropic/OpenAI 兼容本地网关**、**直连 pi 扩展层**。上文整理候选 20 项与最终 4 强。

## 最终 4 强（OMP 视角）

| 排名 | repo | ★ | 形态 | 凭据路径 | 为什么 |
|--:|---|--:|---|---|---|
| 1 | [ngosangns/ns-bridge](https://github.com/ngosangns/ns-bridge) | 3 | OMP 专用 provider | GitHub 登录会话复用 / `ksk_` Key | 唯一实现 OMP 原生钩子 `fetchDynamicModels` 的设计 |
| 2 | [d-kuro/kirocc](https://github.com/d-kuro/kirocc) | 68 | 本地 Anthropic 网关 | kiro-cli SQLite / `KIRO_API_KEY` | 走 OMP 已有 Anthropic 通道，无 pi 扩展层风险 |
| 3 | [ZyphrZero/kiro.rs](https://github.com/ZyphrZero/kiro.rs) | 489 | 多协议网关 | OAuth 浏览器登录 / Key | 需要多客户端或多账号时适合 |
| 4 | [minpeter/kiro-lb](https://github.com/minpeter/kiro-lb) | 31 | OpenAI + Anthropic 网关 | 浏览器 / device-code | 独立 OAuth 登录、多账号 |

完整 20 项筛选表与剔除理由见 raw。**星数与位次弱相关**：有 `pi-provider-kiro` 1963★ 排在中游、`AIClient2API` 8907★ 因 Kiro 风控前科降到第 5。

## 认证与支付边界

- `ksk_` Key 生成页：https://app.kiro.dev/settings/api-keys（免费账号无有效入口）
- 免费计划 50 credits/月，无 Key；GitHub 社交登录 + kiro-cli 会话即可复用
- `ns-omp-provider-kiro` 登录时凭据写入 `~/.omp/agent/agent.db`
- **SoT 约束**：Billing FAQ 禁止第三方 automation harness 绕过 Kiro 原生接口；第三方直连属允许范围之外

## OMP 本机验证结论

- pi-provider-kiro 0.12.1 有 OMP 意向，但钩子（`refreshModels`）与 API Key 引用（`$KIRO_API_KEY`，本机实测不解析）与 OMP 18.12.5 不匹配；PR #170 修复未合并。
- ns-omp-provider-kiro 专门解决了这些差异：注册、认证、目录、流式、工具调用全部走 OMP 原生接口。

## See Also

- [Kiro 认证凭据路径速查（免费 vs 付费）](../model-gateway-mismatch/kiro-auth-paths-cheatsheet.md)
- [OMP 内建工具全集与内部地址空间](../omp-tools/builtin-tools-and-internal-urls.md)
