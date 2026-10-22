# Kiro 认证凭据路径速查（免费 vs 付费）

> Sources: kiro.dev 官方文档直读 + 插件源码, 2026-10-22
> Raw: [Kiro 认证与 SoT](../../raw/model-gateway-mismatch/2026-10-22-kiro-auth-paths-billing-sot.md)
> Updated: 2026-10-22

## Overview

写给要给本地 agent（OMP/Claude Code 等）接 Kiro 的人：哪种身份走哪条认证路径、免费和付费差距在哪、凭据实际落在哪个文件。

## 认证矩阵

| 身份 | 免费账号 | 付费（Pro/Pro+/Pro Max/Power） | 无需官方客户端 |
|---|---|---|---|
| GitHub/Google 社交登录 | ✓ | ✓ | 需要 kiro-cli 留下的会话 |
| AWS Builder ID / IAM IdC | ✓ | ✓ | pi-provider-kiro / ns-kiro-core 支持 device-code 原生登录 |
| `ksk_` API Key | ✗ | ✓（{{生成页 https://app.kiro.dev/settings/api-keys}}）| ✓ |

> 注：`ksk_` Key 的官方用途只在 CLI headless 文档中指定；`ns-bridge` 等第三方包复用它属非官方路径。

## 凭据落点

| 文件 | 来源 |
|---|---|
| `~/.omp/agent/agent.db` | `ns-omp-provider-kiro` 登录写入 |
| `~/.local/share/kiro-cli/data.sqlite3` | kiro-cli 凭据库存 `kirocli:social:token`、`kirocli:odic:token`、`kirocli:external-idp:token` |
| `~/.aws/sso/cache/kiro-auth-token.json` | Kiro IDE 缓存，pi-provider-kiro 兼容读取 |

## SoT 与风控

- Billing FAQ 禁止第三方 automation harness 把请求路由到非 Kiro 原生接口 —— 第三方直连属允许范围之外。
- 风控实证：AIClient2API issue #395 记录 AWS 检测反代流量 → 警告邮件 → 临时限号；2026-08-25 全站 403 后 9 月修复。

## See Also

- [OMP 内建工具全集与内部地址空间](../omp-tools/builtin-tools-and-internal-urls.md)
- [Kiro 后端 API 给任意 agent 用：仓库生态与 OMP 视角排名](../ai-coding-agents/kiro-backend-api-for-agents.md)
