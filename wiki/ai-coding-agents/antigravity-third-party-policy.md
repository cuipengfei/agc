# Antigravity 第三方客户端政策、执行范围与计费边界

> Sources: Google Antigravity Additional Terms of Service，2026-11-22 查阅；Google 官方论坛 199753 员工回复（2026-11-12）与 202740 员工回复（2026-11-20）；Google AI Studio「Google AI plans」文档，2026-11-22 查阅；Google Antigravity FAQ 与 Gemini CLI 维护者公告（2026-02-27），2026-11-14 采集
> Raw: [政策与执行官方材料摘录](../../raw/ai-coding-agents/2026-11-22-antigravity-third-party-policy-enforcement.md); [FAQ 与 2026-02-27 封禁公告](../../raw/ai-coding-agents/google-antigravity-api-policy-2026-11-14.md)
> Updated: 2026-11-22

## 禁止边界

条款第 6 条原文：不得「abuse, harm, interfere with, or disrupt the Service」，包括「using the Service in connection with products not provided by us」；「Using third party software, tools, or services to access the Service (e.g. using OpenClaw with Antigravity OAuth) is a breach of this Agreement」，后果是「suspension or termination of your Antigravity and/or Gemini CLI accounts」。FAQ 给出的公开理由是第三方使用「severely degrades the experience for legitimate product users」，并建议第三方 coding agent 改用 Gemini Enterprise 或 Google AI Studio API key。

条款开头规定，通过 Gemini Enterprise、Gemini Enterprise for Business、Workspace 订阅或 Gemini for business 的 API key 访问服务的用户，受管理员接受或签署的相关条款约束；该段没有说明这些条款对第三方接入的具体许可。FAQ 另建议第三方 coding agent 使用 Gemini Enterprise 或 Google AI Studio API key。

## ACP 允许与不允许的分界

2026-11-12 官方论坛回复给出目前最细的分界：

- **允许**：任何交互式 ACP 客户端（Zed、JetBrains、Xcode、T3 Code 或自定义交互界面）在人直接操作会话时，可以启动未修改的 `antigravity-acp` / `agy acp` 二进制。
- **不允许**：把 `antigravity-acp` 注册成第三方 coding agent harness（如 OMP）的模型来源（`antigravity-acp/*`），消费级 `oauth-personal` 下不允许。官方回复对提问者明确「we do not recommend installing or signing in through `omp-antigravity-acp-provider` with consumer `oauth-personal`」。
- **单独不合规的三项**：围绕 `agy` 生成包装脚本；拦截并中继 `127.0.0.1` OAuth 回调（合规入口是原生 `oauth-personal` 或 `agy acp --login`）；用 `--dangerously-skip-permissions` 驱动 harness 工具。
- **模型范围**：支持的 IDE（JetBrains、Android Studio、Zed、Xcode）之外的通用 ACP 客户端限定 Gemini 模型。
- **合规替代**：在 OMP 里用 Gemini，官方建议走 Google AI Studio 的 Gemini API key（`gemini-api-key`）。

2026-11-20 的官方回复把个人使用也明确排除：第三方软件、wrapper、proxy（如 CLIProxyAPI）配合 Antigravity 登录「isn't permitted—even for personal use」。

## 执行范围

处罚对象是 Antigravity 和／或 Gemini CLI 账号。Gemini CLI 维护者 2026-02-27 公告说明，后端反滥用层的 Antigravity 封禁会连带封锁 Gemini CLI 与 Gemini Code Assist 的访问，同批账号随后做了系统级自动解封。封禁是否与 Google 账号其他服务联动，公开资料未说明。

## 用户报告与申诉

2026-11-19 一位发帖者自述：订阅 Ultra 约一年，Antigravity 访问因 ToS 违规被暂停，连续多个窗口用量不到 20%，纯自用、无转卖。这是用户自述，官方没有确认该账号的处置原因或用量。

官方 2026-11-20 回复给出的申诉路径：移除第三方 proxy，在 Google 账号权限页撤销第三方 OAuth 授权，登录受影响账号提交官方申诉表一次；通常 24–72 小时出结果，无邮件通知，批准后在登录时自动恢复，恢复政策为一次性。

## 付费为什么不等于许可

| 入口 | 额度来源 | 给第三方 agent 用 |
|---|---|---|
| Antigravity 产品内（IDE、`agy`） | 套餐订阅额度 | 官方客户端与上文允许的 ACP 方式 |
| Google AI Studio 网页 | 套餐每日额度，只在 AI Studio 内生效 | 否 |
| Gemini API（付费 key） | 按量计费；Pro／Ultra 每月附带 $10/month、$40/month（Ultra 5x）、$100/month（Ultra 20x）Cloud credits，可用于外部应用 | 是，官方推荐路径 |

AI Studio 文档写明：套餐每日额度只在 AI Studio 网页内生效；「Agent access」一条写明 AI 套餐不含 Antigravity 这类 agent 的订阅额度，需要付费 API key（可用 credits 抵扣）；家庭成员与 AI Plus 不发放 credits。

所以订阅付费买到的是指定产品和入口的额度；第三方 agent 接入对应的是另一份按量计费的使用权，或者用套餐附带的 credits 支付。

## Google 公开的理由与推断

官方公开的说法只有一条：第三方使用严重影响其他产品用户的服务体验，违反条款。对额度以内、纯自用的个人用户同样执行禁令，官方没有给出进一步解释。

[INFERENCE] 商业层面上，固定订阅收入不随消耗增长，计算成本随消耗增长，Google 有控制每位订阅用户消耗的动机；把第三方 agent 用户导向按量 API 也可能起分流收入的作用。Google 没有把利润列为封禁理由，本节是推断。

## 证据边界

只读官方页面与官方论坛，无账号实测，无内部成本数据。停号案例（202740）仅发帖者自述，官方未证实。FAQ 与 2026-02-27 公告原文在 2026-11-14 raw。

## See Also

- [OMP Antigravity 认证与社区 API](../omp-auth/google-antigravity-auth-and-api.md) — OMP 侧登录提示与认证行为
- [OMP `antigravity-cli`：Antigravity CLI 的 ACP provider](../omp-auth/antigravity-cli-acp-provider.md) — 接入机制与 429/400 观察
- [Google Antigravity：套餐、模型、额度与地区](google-antigravity-plans-and-regions.md) — 套餐档位、额度与地区资格
