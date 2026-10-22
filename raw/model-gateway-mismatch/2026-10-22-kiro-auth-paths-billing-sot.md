# Kiro 认证路径、免费限制与服务条款边界

> Source: kiro.dev 官方文档直读 + 插件源码（2026-10-22 快照）
> Collected: 2026-10-22
> Published: 2026-10-22

## 认证路径

| 身份 | 官方支持 | 无需官方客户端 |
|---|---|---|
| GitHub/Google 社交登录 | IDE + CLI + Web + Mobile | 需要 kiro-cli 常驻或已留下的 SQLite 会话 |
| AWS Builder ID / IAM IdC | IDE + CLI + Web + Mobile | pi-provider-kiro / ns-kiro-core 支持原生 device-code，无需 CLI |
| `ksk_` API Key | **仅 CLI**（CI/headless 场景）| 头部直接携带，无 CLI 依赖 |

来源：https://kiro.dev/docs/getting-started/authentication/（更新到 2026-10-21）

## API Key 生成资格

Kiro 官方认证文档与治理页（https://kiro.dev/docs/enterprise/governance/api-keys/）都说明：**Pro、Pro+、Pro Max、Power** 用户可以在 https://app.kiro.dev/settings/api-keys 生成 API Key；**Enterprise 管理员还可单独关闭**该功能（提示文案 `API key management is disabled for your organization`）。

## 免费账号

https://kiro.dev/pricing/ 写明免费计划 **50 credits/月**，模型与速率有限。免费用户无法生成 `ksk_` Key。

## SoT（服务条款约束）

kiro.dev 的 Billing FAQ（https://kiro.dev/docs/billing/related-questions/，条目 `With which tools can I use my Kiro subscription?`）写明：**禁止通过第三方 automation harness 把请求路由到非 Kiro 原生接口**。官网未点名具体仅会禁哪个工具，但按条文推导，第三方直连属允许范围之外。

## 凭据存储

- `/home/cpf/.omp/agent/agent.db` — `ns-omp-provider-kiro` 实际写入点（登录时打印）
- `~/.local/share/kiro-cli/data.sqlite3` — kiro-cli 凭据库；ns-kiro-core 读它的 `kirocli:social:token` / `kirocli:odic:token` / `kirocli:external-idp:token` 键
- `~/.aws/sso/cache/kiro-auth-token.json` — Kiro IDE 的登录缓存（pi-provider-kiro 兼容读取）

## 风控实证（不代表所有账号）

- justlovemaki/AIClient2API issue **#395**（2026-03 open，53 条评论）：AWS 检测反代流量 → 警告邮件 → 临时限制账号。
- 2026-08-25 该仓全站 403（AWS 收紧 profileArn 校验）；2026-09 修复恢复。
- 丰厚账号风险面 ≠ 通用；ksk_ 直连路径的第三方服务风险未见独立证据。
