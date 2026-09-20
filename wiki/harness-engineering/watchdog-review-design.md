# watchdog-review-design

> Sources: raw/harness-engineering/2026-09-20-watchdog-review-design.md
> Raw: [watchdog 审查设计笔记摘录](../../raw/harness-engineering/2026-09-20-watchdog-review-design.md)
> Updated: 2026-09-20

Advisor 自审需要结构化框架，以区分可观测的会话数据、Advisor 的明确断言以及其无法证明的推断。

## 设计依据

来自会话调查（2026-09-20），Advisor 的输出常将证据与结论混合（“这是错误的”、“那是个 bug”）而不指向具体的 JSONL 行或会话状态。为有效审查，审查者应先陈述：

- 会话数据本身说了什么？
- Advisor 声称了什么？
- Advisor 无法从自身上下文证明什么？

## 三桶审查思路

根据 `watchdog-improvement-input.md`（2026-09-19）第 135 行：“三桶是结构化、可审计的 inferential step，不是软件意义上的 deterministic check；自然语言抽取仍可能出错。” 这一原则提醒审查者在评估 Advisor 时应区分三类信息，尽管具体桶名未在源文件给出，我们在此仅保留其结构化思路的启示。

## 证据链

- `unified-timeline.md` 第 3 行明确“时间为 JSONL 中的 UTC”；跨时区关联以 UTC 为准。
- `advisory-correlation.json`（2026-09-20）把 Advisor 的 `advise` 工具调用（共 21 次，包含 advisorLine/advisorEntryId/advisorTime）映射到主会话线（mainLine）。
- 有界 transcript 中的 `[shaken ~N tokens — recover: artifact://…]` 标记表示原文可回收（如 advisor-bounded.md:3373 的 ~163 tokens 示例），而非内容不存在。

这些证据把原始会话数据与审查结论连接起来，避免对单行进行孤立解读。

## 相关

- reviewer-blind-spots.md（harness-engineering/） — Advisor 自审的常见盲区，本设计旨在减少此类错误
- advisor-context-markers.md（omp-config/） — 证明角色与来源嵌入在会话更新中
- omp-sessions/jsonl-format-and-third-party-parsers.md — 第三方解析器对 JSONL 格式的兼容性

---

文章遵循 karpathy-llm-wiki 模板；新证据（2026-09-20）通过 `Raw:` 字段加入；冻结的 2026-09-03 raw 已在 `reviewer-blind-spots.md` 中通过分号并列引用；文章仅在新证据迫使结论变更时更新。