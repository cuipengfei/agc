# OMP judgment 对 chat 类 judge 的无 schema 文本解析机制

> Sources: omp 18.8.0 pi-ai 缓存源码核验, 2026-10-07
> Raw: [judgment-chat-llm-bridge](../../raw/omp/2026-10-07-judgment-chat-llm-bridge.md)
> Updated: 2026-10-07

## Overview

OMP 的 judgment 子系统用普通 chat 模型充当 judge 时，刻意**不依赖任何厂商的结构化输出扩展**（`response_format` / `json_schema` / `text.format`）。首次调用是裸文本补全，靠一份强约束 prompt 让模型只吐受限关键词，再由三组确定性解析器从返回文本里抠答案；解析失败后的重试才挂一个 function-call 工具强制交答案。jev 走的是独立的 `/v1/systemone` 判断路由，与 chat 协议完全分离。本机当前 `judge` 实配 `typesafe-zen/jev-1.13`，chat 类 judge 是回退路径。

## 机制：prompt 约定 + 关键词启发式解析

**不要把它理解成"输出空间被强制收窄"。** `text-judge.md` 模板只是提示词约定，首轮 `chat.ts` 并未发送 schema 或启用 constrained decoding。模型仍可能附带解释文字，解析器会**扫描整段文本**取第一个合法关键词——所以解释里若含多个选项词或否定句，存在误判空间。准确描述是"prompt 约定 + 关键词启发式解析"。

### 请求构造（`judgment/chat.ts` chatTextBackend）

- 普通 `completeSimple` chat 调用，`temperature: 0`、`disableReasoning: true`、`maxTokens: 4096`（`JUDGMENT_CHAT_MAX_TOKENS`，注释解释是为兼容仍吐 thinking 前导的后端与 Anthropic 的 `max_tokens > thinking.budget_tokens` 约束）。
- **首次调用不带 tools，不带任何 schema**（`tools: prompt.retry ? [SUBMIT_JUDGMENT] : undefined`）。
- transport 由该模型的 `model.api` 字段决定（`stream.ts` 按 `api` 分发，含 `openai-responses` 分支）；本 raw 只确认"不发 schema"，具体模型走哪个 transport 依配置而定。

### 三个解析器（`judgment/text.ts`）

| 题型 | 解析器 | 抠法 |
|---|---|---|
| `choice` | `parseChoiceReply` | `indexOfWord` 整词、大小写不敏感匹配，返回**最早出现**的合法 label；同位置更长 label 优先（`xhigh` 压过 `high`） |
| `noul` | `parseNoulReply` | 找 `yes`/`true` 与 `no`/`false` 的最早位置，谁在前取谁 |
| `score` | `parseScoreReply` | `INTEGER` 正则抓第一个独立整数（排除 `v2`、`1.5`），必须 `< levels` |

抠到→包装成 `Answer`（choice/score 附 one-hot 概率表 + `confidence: 1`；noul 给 `noul: 1|0`）。抠不到→`throw new JudgmentParseError`。**已匹配到错误关键词会直接接受**，不校验语义。

多题批量先 `splitAnswerLines` 按 `<id>: <answer>` 切成 `id→answer` map，未知 id 行忽略，所以模型加废话开场白通常不污染解析。

### 兜底：重试才挂 tool

`parseRetries: 2`。重试时挂 `submit_judgment` 工具（`parameters: {answer: string}, strict: true`），用 `toolChoice: {type:"function", name:"submit_judgment"}` 强制模型交字符串答案，回来仍走同一组解析器。这是 function calling，不是 OpenAI 的 `text.format` structured output。

### 与 jev 路由的分界

jev 命中时走 TypeSafe System One 兼容端点（本机 zen 后端 `/zen/v1/systemone`），POST `{state, model, questions}`，返回带类型的 `answers` map——一套独立判断 API，与 chat 协议无关。协议面细节见 [OMP judgment /v1/systemone 协议面](judgment-systemone-protocol.md)。

## 已知边界

- **无法可靠理解任意散文**：解析器只找关键词，模型若在答案里同时提到多个选项或含否定词，可能取错。这是设计取舍（vendor-neutral、不依赖具体厂商扩展），不是完备的自然语言理解。
- chat 类 judge 的 transport 依 `model.api` 配置而定；本 raw 未读取 `models.yml` 里 c8787 provider 的具体 `api` 值。
- 源码版本 omp 18.8.0；其他版本可能不同。

## See Also

- [OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界](judgment-provider-and-eval-judge.md)
- [OMP judgment /v1/systemone 协议面：题型 schema、传输参数、观测点与兼容端点](judgment-systemone-protocol.md)
- [OpenAI Decisions API beta schema](../ai-coding-agents/jev-host-integrations.md) — Decisions API 用服务端原生类型化答案，与本文的"文本解析"路线形成对照
