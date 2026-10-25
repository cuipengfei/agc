# OpenAI Decisions API 正式 GA 核验（2026-10-25 会话实测）

> Source: OpenAI Decisions guide（https://developers.openai.com/api/docs/guides/decisions，2026-10-25 直读）；OpenAI API changelog（https://developers.openai.com/api/docs/changelog.md，2026-10-25 直读）
> Collected: 2026-10-25
> Published: 2026-10-22（changelog 条目日期）

证据分级标签：**文档原文**＝逐字引用；**实测**＝本会话实际抓取；**推断**＝由证据推得但未直接证实。

## ① GA 宣告（文档原文）

Changelog 条目，日期 Oct 22，分类 `Update · Model: gpt-6-luna · API: v1/decisions`：

> "The Decisions API is now generally available with `gpt-6-luna`. Cache shared input across requests for prompt-cache discounts, include images in individual question instructions, and pass structured data directly with `input_json`. Each request now supports up to 400 questions, increased from 200 in public beta."

Decisions guide 页首段，2026-10-25 直读：

> "The Decisions API is now generally available. Review what's new since the public beta."

> "The Decisions API evaluates text, images, and JSON and returns typed answers about 10x faster than the Responses API. Get the probability that a condition is true, a choice from a fixed set, or a score against a rubric."

> "Send requests to `POST /v1/decisions` using `gpt-6-luna`, the only currently supported model."

## ② GA 后新增能力（文档原文，guide "What's new" 节逐条）

> "Since the public beta launched, the Decisions API has added these capabilities:
>
> - Prompt caching. Reuse shared input across requests and receive cache discounts.
> - Images in question instructions. Give each question its own images to compare against shared evidence.
> - JSON input. Pass structured data directly with an `input_json` content part.
> - More questions per request. Ask up to 400 questions per request, up from 200 during the public beta.
> - Hosted image inputs. Pass publicly accessible HTTP or HTTPS image URLs as well as inline base64 data URLs.
> - Conversation history. Evaluate messages alongside function calls, custom tool calls, and their outputs.
> - Organization usage reporting. Track token usage and request counts.
> - Native GPT-Live integration. Let Live call Decisions directly, or trigger decisions as input or output transcripts arrive.
> - Private Link. Send Decisions requests over a private connection."

## ③ 三种题型的返回形状（文档原文）

| 类型 | 用途 | 主要结果 |
|---|---|---|
| `predicate` | 检查条件（如可见损坏、段落相关性） | `probability`：0 到 1 的估计值 |
| `choice` | 从固定选项选一个（如部门、内容类别） | `choice`：用户提供的某个值 |
| `score` | 按有序档位评分（如问题严重程度） | `score`：档位序号的概率加权平均 |

> "Both `choice` and `score` return probabilities over discrete options. Use `choice` for categories without an order, such as departments. Use `score` for ordered levels, such as severity; it takes the probability-weighted average of their numeric indices to produce a score that can fall between levels."

## ④ 请求三要素（文档原文）

| 字段 | 用途 |
|---|---|
| `model` | 执行评估的模型，当前仅支持 `gpt-6-luna` |
| `input` | 题目共享的证据：文本字符串，或消息/工具调用/工具输出的有序数组 |
| `questions` | 要评估的内容，含每题类型、指令及允许选项或评分档位 |

> "The response contains an `answers` array. Give each question a unique `name` to identify its answer; the API echoes that name in the response."

## ⑤ 三次状态对照

| 日期 | 官方状态 | 依据 |
|---|---|---|
| 2026-10-15 | public beta，"expect to GA in the coming weeks" | guide 直读 |
| 2026-10-18 | 同上，逐字一致 | guide 直读 |
| 2026-10-22 | **GA** | changelog 条目 |
| 2026-10-25 | GA（guide 首句已改） | guide 与 changelog 直读 |

## ⑥ 相关但独立的条目

Changelog Oct 15，`Feature · Model: gpt-live-1 · Model: gpt-6-luna · API: v1/live/sessions`：

> "Added native Decisions integration in GPT-Live. Your app can act while your user is speaking or react to what Live says. Let Live call Decisions directly through native delegation, or trigger decisions as input or output transcript deltas arrive."

## ⑦ 证据边界

- 本 raw 只记录官方文档所述状态与能力，未在 OpenAI 端执行任何推理调用。
- guide 页对 Decisons 与 Responses API 的定位表述属厂商自述（"about 10x faster"），未独立验证。
- changelog 的 `.md` 版本与页面渲染版本内容一致；Oct 22 是 Decisions GA 条目所在日期。
