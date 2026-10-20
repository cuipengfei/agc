# Gemini 4 Argon 缓存问题社区报告与官方回应摘录

> Source: Google AI Developers Forum / GitHub `googleapis/python-genai` / GitHub `anomalyco/opencode`（逐条标注 URL）
> Collected: 2026-10-20
> Published: 逐条标注

以下为各来源的关键摘录与限定（非全文，观点保留原意）。

## Google 开发者论坛 #189019（Argon 直连 AI Studio 与 Vertex Global 零命中）

- Source: https://discuss.ai.google.dev/t/gemini-4-argon-returns-no-context-cache-hits-explicit-caching-returns-400-gemini-3-7-flash-caches-the-same-prefix/189019
- Published: 2026-10-14（主帖），2026-10-15 至 2026-10-16（跟帖与官方回复）
- 报告者 the reporter：用相同的约 3.6 万 tokens 固定前缀分别连续调用 AI Studio 与 Vertex AI Global 各 3 次，所有请求的缓存命中均为 0。尝试手动创建显式缓存直接报错 `400: Explicit caching is not supported for models/gemini-4-argon`。
- 跟帖用户：测试 30 万 tokens 固定输入连发 12 次，缓存命中也全部为 0；另有用户报告经 LiveKit 调用 Argon 时遇到同样问题。
- Google 官方人员 a Google staff member（2026-10-15）回复确认：Argon 按设计不支持显式缓存，团队正在排查所报告的隐式缓存行为问题。

## python-genai #1880（Vertex 与 AI Studio 隐式缓存命中率差异与成本影响）

- Source: https://github.com/googleapis/python-genai/issues/1880
- Published: 2025-12-17（起始），2026-09-24（最后更新）
- Vertex AI 用户报告：长公共前缀连续请求间“高命中 → 零命中 → 恢复”，且系统提示词不变时也会发生。
- 评论 `https://github.com/googleapis/python-genai/issues/1880#issuecomment-3695780481`：Google 维护者回复称已观察到 Vertex AI 零命中、Gemini API 命中不一致，将提交内部 bug。
- 评论 `https://github.com/googleapis/python-genai/issues/1880#issuecomment-4459491859`：具体测试模型为 `gemini-3.1-flash-lite-preview`，报告者按调用列出缓存命中细节。
- 2026-09-24 更新评论（a developer）：生产系统日均 10 万+ 请求，用固定大系统提示词做 A/B 测试，一半发给 Vertex AI 一半发给 Google AI Studio。Vertex 端缓存只命中 1.6 万 tokens（未命中 53.9 万），AI Studio 端命中 34.4 万（未命中 22.4 万）。按其自身账单测算，在 Vertex 上运行的实际成本是 AI Studio 的 2.1 倍。评论中提到这种因缓存命中不稳定而多付的费用被社区称为 "Gemini Tax"。

## python-genai #2064（隐式缓存死区与 Vertex / Global 端点差异）

- Source: https://github.com/googleapis/python-genai/issues/2064
- Published: 2026-02-16（起始），2026-09-24（最后更新）
- 报告者 the reporter：`gemini-3-flash-preview` 上稳定前缀下 `cache_read_token_count` 从约 16k 变为 0，随后恢复；约 9k–17k tokens 输入区间存在隐式缓存死区。
- 评论 `https://github.com/googleapis/python-genai/issues/2064#issuecomment-4548777176`（2026-05-26）：报告者改用 `gemini-3.5-flash` GA、绕过 SDK 直接 HTTP 调用 `generativelanguage.googleapis.com`、连续请求间隔 3 秒；约 5,915 与 6,453 tokens 输入命中，约 9,423 与 10,686 tokens 输入归零；核对前缀未变。
- 评论 `https://github.com/googleapis/python-genai/issues/2064#issuecomment-3725080267`：另一位用户（another user）报告用 Vertex AI 与 Global 端点测试，两端点表现不一致。
- Google 维护者（a Google maintainer、a Google maintainer）亲自运行用户脚本，复现了 Vertex 命中率为 0% 以及多轮对话中途缓存掉到 0 的现象，确认为服务端隐式缓存逻辑的内部限制，并提交了内部 bug 单。
- 评论 `https://github.com/googleapis/python-genai/issues/2064#issuecomment-4867752246`（one user）：反馈自己在 `gemini-3.5-flash` 上调用 Vertex API 时未遇到 9k–17k 死区，说明不同模型、区域或时段的表现存在差异，并非所有请求每次都失败。

## OpenCode #55449（Argon 命中率随时间段波动）

- Source: https://github.com/anomalyco/opencode/issues/55449
- Published: 2026-10-14
- 报告者 the reporter：用逐字节相同的长对话请求调用 `gemini-4-argon-contributor`（经 OpenCode Go），在 14:18–15:07 UTC 时段 32 轮命中 30 轮（偶发单轮掉到 0），而在 12:15–13:47 UTC 时段 6 轮仅命中 1 轮，且空闲 16 分钟后缓存完全消失。
- 报告者附上了逐轮字节级 diff 验证表与不同时段命中率对照，排除了客户端请求体变化的可能。

## OpenCode #43628（Vertex 直连 Gemini 3.8 Flash 掉缓存）

- Source: https://github.com/anomalyco/opencode/issues/43628
- Published: 2026-08-20（起始），2026-10-09（最后更新）
- 报告者 the reporter：通过官方 ADC 认证直连 `google-vertex/gemini-3.8-flash`，贴出 29 轮会话数据库记录：22 轮正常命中，7 轮突然掉为 0 缓存（间隔仅 3 秒也会掉，间隔 297 秒反而命中）。
- 其数据库统计显示 Vertex Gemini 3.8 / 3.7 的缓存未命中率为 29% 和 21%，同库其他提供商模型（OpenAI、Anthropic 等）仅为 0.3%～2.8%。

## Google 开发者论坛 #176445（Vertex 与 Gemini API 端点缓存不一致与迁移决定）

- Source: https://discuss.ai.google.dev/t/issues-with-inconsistent-caching-between-vertex-endpoints-and-gemini-api-endpoints/176445
- Published: 2026-07-28（起始），2026-08-14（最后更新）
- 报告者 the reporter：最新 Gemini 模型强制走 `global` 端点，导致 Vertex 缓存命中率极差；声称由于缺少 90% 的缓存折扣（接近 10 倍单价差距），他们已将整套生产服务迁离 Vertex，并要求 Google 排查后台路由。
- 另一报告者 another reporter：同样报告了 Vertex 与 Gemini API 端点之间缓存命中率不一致的问题。

采集备注：以上均为社区一手报告与官方论坛回复；Argon 个案（#189019、#55449）为 2026-10-14 后新报告，与 3.x 系列个案（#1880、#2064、#43628、#176445）模型与入口不同，不可互相外推。Google 未公布全局隐式缓存命中率统计，总体发生比例无法确认。
