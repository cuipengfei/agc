# Gemini 3.x 缓存问题社区报告摘录

> Source: GitHub issues / Google 开发者论坛 / OmniRoute / Cursor 论坛（逐条标注 URL）
> Collected: 2026-10-19
> Published: 逐条标注

以下为各来源的关键摘录与限定（非全文，观点保留原意）。

## python-genai #2064（隐式缓存随输入长度归零）

- Source: https://github.com/googleapis/python-genai/issues/2064
- Published: Unknown（issue 起始）
- 原始报告模型为 `gemini-3-flash-preview`：稳定前缀下 `cache_read_token_count` 从约 16k 变为 0，随后恢复。
- 评论 `https://github.com/googleapis/python-genai/issues/2064#issuecomment-4548777176`（2026-05-26）：报告者改用 `gemini-3.5-flash` GA、绕过 SDK 直接 HTTP 调用 `generativelanguage.googleapis.com`、连续请求间隔 3 秒；约 5,915 与 6,453 tokens 输入命中，约 9,423 与 10,686 tokens 输入归零；核对前缀未变。
- 同 issue 另一评论称在 Vertex AI 上未复现该问题（与 #1880 中 Vertex 更差的报告方向相反）。
- 项目讨论中的回复把该现象解释为隐式缓存内部机制切换的限制，并展示显式缓存对照。

## python-genai #2508（streaming 工具历史结构嫌疑）

- Source: https://github.com/googleapis/python-genai/issues/2508
- Published: Unknown
- 报告者怀疑 `google-genai` SDK 的 streaming 响应把思考片段与 tool call 保存为多个连续 `model` 消息，破坏前缀；其自行合并这些消息后表示缓存问题解决。
- 该 issue 后被以 stale/not planned 关闭，属客户端机制线索，非平台缺陷确认。

## python-genai #1880（Vertex 零命中报告）

- Source: https://github.com/googleapis/python-genai/issues/1880
- Published: Unknown
- Vertex AI 用户报告长公共前缀连续请求间“高命中 → 零命中 → 恢复”。
- 评论 `https://github.com/googleapis/python-genai/issues/1880#issuecomment-3695780481`：回复称已观察到 Vertex AI 零命中、Gemini API 命中不一致，将提交内部 bug。
- 评论 `https://github.com/googleapis/python-genai/issues/1880#issuecomment-4459491859`：具体测试模型为 `gemini-3.1-flash-lite-preview`，按调用列出缓存命中细节。

## Google 开发者论坛：3.7 Flash 工具工作流反馈

- Source: https://discuss.ai.google.dev/t/has-anyone-gotten-implicit-caching-to-work/142699/4
- Published: 2026-08-28（Google 开发者论坛第 4 帖）
- 使用 Gemini 3.7 Flash：输入超过约 12k tokens 才开始出现隐式缓存；后续工具调用并非每次命中；同一应用切到 GPT 后每轮与工具调用约 70%+ 缓存读取。
- 同线程中的限定：Google 回复称隐式缓存是 best-effort；4 次请求的样本往往太小、不足以判断；部分报告针对 3.0/3.1 模型的低于门槛提示词。

## OmniRoute #13305（同一 3.8 模型不同代理 0% vs 92%）

- Source: GitHub `OmniRoute` 项目 issue #13305（owner 个人账号名按 no-PII 要求不记录；按仓库名 `OmniRoute` 加 issue 号 13305 可在 GitHub 检索定位）
- Published: 2026-09-11
- 模型 `agy/gemini-3.8-flash-medium`，同一 Google 账户：经 OmniRoute → Antigravity 的 5 次约 40k tokens 请求全部无缓存复用；经 CLIProxyAPI 的同账户同模型同 payload 请求从第 2 次起约 92% 缓存读取。
- 报告者怀疑 OmniRoute 为每次请求生成随机上游 `sessionId`；但后续评论称仅改 sessionId 未解决问题（根因未确认）。
- 另有评论指出 Antigravity 按请求计费，缓存复用对该入口的计费价值有限（计费机制与缓存正确性是两件事）。

## CLIProxyAPI #592（随机 sessionId 归因）

- Source: https://github.com/router-for-me/CLIProxyAPI/issues/592
- Published: Unknown
- issue 的结论把 Antigravity 缓存未命中归因为代理生成的随机 `sessionId`；一条后续评论认为该入口按请求计费、缓存命中对账单影响很小。

## Cursor 论坛：3.7 Flash 缓存讨论

- Source: https://forum.cursor.com/t/gemini-3-7-flash-has-caching-issues/168891
- Published: 2026-10-16
- 主帖称 Gemini 3.7 Flash 存在缓存问题。
- 维护者/后续澄清：截图中的 855K 是 123 次调用的累计值，其中 95.3% 由缓存提供（95.3% of your input tokens were served from cache），属累计口径，非单请求下降证据。

采集备注：以上均为社区一手报告与官方论坛回复；没有一条把“Copilot 通道上的 Gemini 3.8 Flash 暂停后归零”登记为已确认缺陷。
