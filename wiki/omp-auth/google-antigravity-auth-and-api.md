# OMP Antigravity 认证与社区 API

> Sources: Google Antigravity FAQ，2026-11-14 采集；Google Gemini CLI 维护者公告，2026-02-27；NoeFabris `opencode-antigravity-auth` 社区 API 文档，2026-10-21；CLIProxyAPIBusiness quota 源码；本机 OMP `pi-catalog`、`pi-ai` 18.20.0 源码及版本说明，2026-11-14 读取
> Raw: [API 与第三方工具政策](../../raw/ai-coding-agents/google-antigravity-api-policy-2026-11-14.md); [OMP 认证、版本与请求头](../../raw/omp-auth/omp-antigravity-auth-headers-2026-11-14.md)
> Updated: 2026-11-14

## 账号风险

Google FAQ 称，使用第三方软件、工具或服务访问 Antigravity 违反其服务条款，可能导致账号被暂停或终止。Google 建议第三方 coding agent 使用 Gemini Enterprise 或 Google AI Studio API key。消费级套餐的 Antigravity CLI headless 模式面向直接脚本和 CI；把 CLI 包装进第三方 coding agent 或自动轮换账号不受支持。

Google Gemini CLI 维护者 **2026-02-27** 说明，针对第三方工具或代理使用 Antigravity 资源和额度的封禁，也使受影响账号无法访问 Gemini CLI 与 Gemini Code Assist；维护者同时宣布对近期受影响账号进行自动解除封禁。

## OMP 内置认证的版本变化

| 版本 | 日期 | 内置 Google Antigravity 行为 |
|---|---|---|
| 18.18.4 | 2026-11-09 | 使用 `disabled` 规则暂停：登录列表隐藏，登录、刷新、用量探测和请求被拒；已保存的登录保留 |
| 18.18.7 | 2026-11-10 | 恢复 provider，新登录先显示风险提示，用户输入 `yes` 后才开始登录 |
| 18.20.0 | 2026-11-12 发布；2026-11-14 查看本机包 | 安装包的 `google-antigravity.kdl` 包含 `login-warning` 和 `oauth-code` 登录规则，未包含 `disabled` 规则 |

18.20.0 的登录提示写明，Google 可能限制从 OMP 等第三方工具使用 Antigravity 的账号。源码与版本说明表明内置规则的内容；本次未执行登录、刷新或模型请求，也未检查用户扩展对规则的覆盖。

## 社区文档记录的接口

`opencode-antigravity-auth` 的 `ANTIGRAVITY_API_SPEC.md` 是社区维护的协议记录，标记为 **2.0**、更新于 **2026-10-21**，并提示需要验证实际账号访问。它将以下路径列为个人 Antigravity 的接口：

| 用途 | 文档中的方法和地址 |
|---|---|
| 非流式生成 | `POST https://daily-cloudcode-pa.googleapis.com/v1internal:generateContent` |
| 流式生成 | `POST https://daily-cloudcode-pa.googleapis.com/v1internal:streamGenerateContent?alt=sse`，使用 SSE |
| 项目发现 | `/v1internal:loadCodeAssist` |
| 用户 onboarding | `/v1internal:onboardUser` |
| 模型与额度发现 | `/v1internal:fetchAvailableModels` |

文档描述的生成请求使用 Gemini 风格的 `project`、`model` 和 `request`，其中 `request` 包含 `contents`、`generationConfig`、`systemInstruction` 和 `tools`；文档指出 Anthropic 风格的 `messages` 数组不适用于该请求格式。以上字段和路径来自社区文档，本次未对 Gemini 或 Claude 模型发起真实调用。

### 地址的来源差异

社区文档的端点章节将 `daily-cloudcode-pa.googleapis.com` 标为 Antigravity Hub、将 `cloudcode-pa.googleapis.com` 标为 Gemini CLI；同一文档末尾的对照表却把 Antigravity endpoint 写成 `cloudcode-pa.googleapis.com`。这两处写法有冲突。

OMP 18.20.0 的模型发现源码列出 `daily-cloudcode-pa.googleapis.com` 和 `daily-cloudcode-pa.sandbox.googleapis.com`，用于 `fetchAvailableModels` 的默认发现端点；CLIProxyAPIBusiness 的 quota 源码还列出 `cloudcode-pa.googleapis.com`。这些记录分别涉及社区文档和模型／额度发现，本次没有验证模型生成时的备用地址或权限。

## See Also

- [Google Antigravity：套餐、模型、额度与地区](../ai-coding-agents/google-antigravity-plans-and-regions.md) — 个人与企业套餐、支持地区和用量报告
- [OMP 环境变量全量参考](../omp/env-variables-reference.md) — `PI_AI_ANTIGRAVITY_*` 的请求头覆盖与版本变化
