# OMP Antigravity 认证与社区 API

> Sources: Google Antigravity FAQ，2026-11-14 采集；Google Gemini CLI 维护者公告；社区 API 文档、CLIProxyAPIBusiness quota 源码；OMP 18.20.0 与 18.22.2 源码；2026-11-17 至 2026-11-18 本机会话与 agy 1.5.10 至 1.5.11 日志
> Raw: [API 与第三方工具政策](../../raw/ai-coding-agents/google-antigravity-api-policy-2026-11-14.md); [OMP 认证、版本与请求头](../../raw/omp-auth/omp-antigravity-auth-headers-2026-11-14.md); [本机会话接入与错误](../../raw/omp-auth/2026-11-18-antigravity-cli-session-routing-and-errors.md); [本机域名与出口观察](../../raw/proxy-ops/2026-11-18-antigravity-egress-and-domain-routing.md); [2026-11-18 用量与错误实测](../../raw/ai-coding-agents/2026-11-18-antigravity-cli-usage-quota-routing.md); [单句 429 逐词对照实验](../../raw/omp-auth/2026-11-18-antigravity-system-prompt-429-word-probe.md); [提交说明 429 对照](../../raw/omp-auth/2026-11-18-antigravity-commit-line-429-probe.md)
> Updated: 2026-11-18

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

### 本机 `agy` 观察

2026-11-17 至 2026-11-18，`agy 1.5.10` 的日志记录 `daily-cloudcode-pa.googleapis.com` 的账号与模型查询，并记录一次 `streamGenerateContent` 返回 `429`。一次 OMP 最小请求记录账号被路由到 AICode，并请求 `aicode.googleapis.com/v1alpha:fetchConfig`。这两项是本机日志观察；社区文档中的其他地址和备用路径仍以原始来源为准。

## Antigravity 与 Code Assist 的关系

Antigravity 的模型请求、账号资格、配额与许可证都走 Code Assist 后端。`agy` 日志显示 `loadCodeAssist`、`fetchAvailableModels`、`retrieveUserQuotaSummary` 调用 `daily-cloudcode-pa.googleapis.com`；1008 与 1001 错误域均为 `cloudaicompanion.googleapis.com`，许可证错误的帮助链接指向 `https://cloud.google.com/gemini/docs/codeassist/request-license`。`loadCodeAssist` 是 Code Assist 的开通调用，返回档位并分配项目；消费级免费档在后端的产品名是 "Gemini Code Assist for individuals"。详细用量入口与错误分层见 [Antigravity CLI 用量查询与配额/许可证错误分层](../ai-coding-agents/antigravity-cli-usage-and-quota-errors.md)。

## 系统指令文本触发的假 429

除配额与许可之外，还有一类与请求正文相关的 `429`：账号配额充足、响应体只有 `Resource has been exhausted (e.g. check quota).` 与 `RESOURCE_EXHAUSTED`，不含重置时间或限流指标；把命中的系统指令文本改写或去掉即恢复 200。

2026-11-18 的第一组本机对照把身份句的触发点收敛到一个完整句子。15 条记录全部只改 `_meta.antigravity.systemPrompt.append`，模型 `gemini-3.8-flash`、思考等级 `High`、用户消息 `Say OK only.`：

| 系统提示词内容 | 结果 |
|---|---|
| `You are omp's trusted coding assistant.` | 429（两次，5.13 秒与 5.18 秒） |
| `omp` / `omp's` / `omp's trusted` | 均 OK |
| `You are pi's trusted coding assistant.` / `You are omp's helpful coding assistant.` | 均 OK |
| 原句逐个删除 `You`、`are`、`omp's`、`trusted`、`coding`、`assistant` 的六个变体 | 均 OK |
| `You are a helpful coding assistant.`（首尾对照） | 均 OK |

命中需要完整句子组合，不存在单独命中的词。15 条记录的 `role` 全部为 `system`，用户消息槽位未在同一脚本中对照。

同一天的另一组对照把 OMP 系统提示词里的提交说明整行单独放入 `_meta.antigravity.systemPrompt.append`。该行 271 字符，发送两次均返回 `429`；重复轮 5.10 秒。改写为 194 字符的等义说明后返回 `OK`（4.39 秒）。身份句已替换的完整 system 在零工具条件下仍返回 `429`（6.20 秒），中性系统对照返回 `OK`（10.07 秒）。该组没有逐词隔离，不能判定具体命中片段。该组 ACP 配置为 `model=gemini-3.8-flash`、`thought_level=medium`；`503` 文本里的 `gemini-3.8-flash-medium` 是服务端模型变体名；一次整份改写无工具请求返回 `503`，未计入 `429` 对照。

同类报告来自多个客户端与多个时期，触发文本随上游调整更换：`<system-conventions>` 块（2026-09-11）、`RFC 2119 keywords: MUST, REQUIRED, SHOULD, RECOMMENDED, MAY, OPTIONAL.`（2026-11-10）、`Read xd://<tool> for full docs + JSON schema before first use.`（2026-11-15）、工具描述块，以及本机的身份句（2026-11-18）。2026-11-10 的同一份报告里，身份句单独发送返回 200；到 2026-11-18 该句单独发送返回 429。中间没有公开的上游说明，按观测记录为时点差异，不解释为规则内容。

绕过手段的有效性也在变化：2026-11-15 的记录显示 `U+200B`、`U+034F` 零宽字符混淆对若干身份短语已失效，字面替换（如 `DeepSeek Harness` → `Assistant Framework`）可恢复 200。这类改写只是规避当前命中文本，不改变 Google 对第三方客户端的使用条款立场。

## See Also

- [Google Antigravity：套餐、模型、额度与地区](../ai-coding-agents/google-antigravity-plans-and-regions.md) — 个人与企业套餐、支持地区和用量报告
- [OMP 环境变量全量参考](../omp/env-variables-reference.md) — `PI_AI_ANTIGRAVITY_*` 的请求头覆盖与版本变化
- [Antigravity CLI 用量查询与配额/许可证错误分层](../ai-coding-agents/antigravity-cli-usage-and-quota-errors.md) — 打印模式与 TUI 的用量入口、1008/1001/404 分层
- [OMP antigravity-cli：ACP provider](antigravity-cli-acp-provider.md) — 提交说明 429、可空枚举工具声明 400 与本地兼容扩展
