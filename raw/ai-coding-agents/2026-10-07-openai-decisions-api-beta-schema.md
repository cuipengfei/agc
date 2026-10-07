# OpenAI Decisions API beta 发布与字段级 schema（2026-10-07 核验）

> Source: OpenAI API changelog（https://developers.openai.com/api/docs/changelog，2026-10-06 条目，经网络搜索核验）；OpenAI Decisions guide（https://developers.openai.com/api/docs/guides/decisions）；OpenAI API reference Create a decision（https://developers.openai.com/api/reference/resources/decisions/methods/create）；后两页经 Tavily advanced 抽取逐字获取（直连 HTTP 403）
> Collected: 2026-10-07
> Published: 2026-10-06（changelog beta 条目）

证据分级标签：**文档原文**＝逐字引用；**实测**＝本会话实际抓取；**推断**＝由证据推得但未直接证实。

## ① 发布状态（文档原文，逐字）

OpenAI API changelog 2026-10-06 条目（网络搜索核验）：

> "Released the Decisions API in beta with `gpt-6-luna`."

Decisions guide 页原文：

> "The Decisions API is in public beta, and we expect to GA in the coming weeks. `gpt-6-luna` is the only model currently available. Use the dedicated `POST /v1/decisions` endpoint."

> "The Decisions API evaluates text, images, or both and returns typed answers about 10x faster than the Responses API."

API reference 侧栏把 Decisions 列在 "Beta APIs" 下。

## ② 请求体字段（API reference Create a decision 页，逐字）

顶层参数：

- `model`：当前只支持 `gpt-6-luna`。
- `input`：共享证据。纯文本字符串，或 user 消息数组（content 可含 `input_text` + `input_image`）。
- `questions`：数组，每题一个 variant，三选一 + 共有字段。
- `safety_identifier`：optional string or null。"Opaque caller-provided end-user identifier, scoped by the verified org."

questions 三 variant（逐字字段名）：

- **Predicate**：`{type: "predicate", name?: string, instructions: string}`。无额外字段。
- **Choice**：`{type: "choice", name?: string, instructions: string, choices: array of {value, description?}}`。`value` 是 string or boolean（"Choice values are typed: a string and a boolean with the same text are distinct."）。
- **Score**：`{type: "score", name?: string, instructions: string, levels: array of {label, description?}}`。levels 有序，索引从 0 开始。

图像输入限制（guide 页原文）：

> "Images must be inline base64 data URLs. Hosted HTTP or HTTPS image URLs and `file_id` inputs aren't supported by this endpoint."

## ③ 响应体字段（API reference Decision object，逐字）

`Decision object {answers, model, usage}`。answers 数组按题型回四类之一：

- **Predicate**：`{type: "predicate", name: string|null, probability: number}`。
- **Choice**：`{type: "choice", name: string|null, choice: string|boolean, confidence: number, probabilities: array of {value, probability}}`。
- **Score**：`{type: "score", name: string|null, score: number, confidence: number, probabilities: array of {value: number(int64), label, probability}}`。"The returned `score` is a probability-weighted average, so it can fall between levels."（guide 页示例：概率 0.1/0.7/0.2 → score 1.1）
- **Refusal**：`{type: "refusal", name: string|null}`。"The host may decline one question without disclosing its refusal score."

`usage`：`{input_tokens, input_tokens_details: {cache_write_tokens, cached_tokens}, output_tokens, output_tokens_details: {reasoning_tokens}, total_tokens}`。

## ④ 定价与可用性（guide 页原文）

> "With `gpt-6-luna`, input costs **$0.10 per 1M tokens**. You pay only for input tokens: there are no cache-read, cache-write, or output-token charges. Regional processing premiums and long-context input pricing multipliers apply."

> "The Decisions API supports Zero Data Retention (ZDR) and HIPAA use for eligible customers."

> "Use Decisions when your application needs one of these answer types. Use Structured Outputs with the Responses API when you need to generate an object that follows your own JSON schema ... or function calling when you need a model to request a tool call with arguments."

## ⑤ 访问门槛（第三方实测，单账号）

eesel AI 实操帖贴出对该账号的真实报错：

```json
{"error":{"message":"Decision API is not enabled for this user.","type":"invalid_request_error","param":null,"code":null}}
```

此证据仅说明该第三方账号未获启用，**不能推广到所有普通 API key 的默认状态**（推断）。

## ⑥ 与 2026-09-30 记录的差异

2026-09-30 记录（raw/ai-coding-agents/2026-09-30-openai-decisions-api-announcement.md）当时确认端点与 wire 格式未公开：API reference 索引无 Decisions 条目、`resources/decisions*.md` 路径 404、changelog 无条目、openai-python/openai-node/openai-openapi/openai-cookbook 四仓库均无 decisions 资源定义。2026-10-06 changelog beta 条目 + 官方 guides/decisions 指南页 + API reference create 方法页三处公开后，旧记录的"端点未公开 / Jev 仍是唯一有可验证公开 API 的决策模型产品"结论已被取代：截至 2026-10-07，OpenAI 已有公开 beta Decisions API（端点 + 字段级 schema + 定价均已公开），Jev 的唯一性结论不再成立。本 raw 不作 Jev GA 等级判断。
