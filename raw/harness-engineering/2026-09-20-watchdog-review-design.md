> Sources: OMP 会话调查, 2026-09-20
> Collected: 2026-09-20
> Published: Unknown
>
> ## watchdog 审查设计笔记
>
> ### 三桶审查框架
> 来自 `watchdog-improvement-input.md`（2026-09-19）：
> - 第 135 行：「三桶是结构化、可审计的 inferential step，不是软件意义上的 deterministic check；自然语言抽取仍可能出错。」
> 该术语指 advisor 审查时应分桶处理，但源文件未给出桶的命名或具体定义；故本笔记只引用该原则，不杜撰桶标签。
>
> ### 去痕与事实边界
> 来自 `main-bounded.md`（AGENTS.md 原文）：
> - 第 59 行定义「番茄炒蛋加东坡肉」反面模式：输出不许留任何多余东西和错误痕迹。
> - 第 783 行记录「东坡肉模式（输出不留错误痕迹、clean final-state）」并指出其与 `restating-complete-answers` 同源。
>
> 这些是写作规则，跟 watchdog 审查设计无关；此处只记录以便归档，不作为审查方法论。
>
> ### 证据链
> 来自 `unified-timeline.md`、`advisor-bounded.md`、`advisory-correlation.json`（2026-09-20）：
> - 第 3 行明确「时间为 JSONL 中的 UTC」；跨时区关联以 UTC 为准。
> - advisory-correlation.json 把 advisor 的 `advise` 工具调用（共 21 次，advisorLine/advisorEntryId/advisorTime）映射到主会话线（mainLine）。
> - 工具结果在 bounded transcript 中被 `[shaken ~N tokens — recover: artifact://…]` 标记替代，原文可回收（ advisor-bounded.md:3373 为 ~163 tokens 的真实示例）。
>
> 这些是 watchdog 审查流程的证据骨干。
>
> ### frozen-raw 边界
> 来自 agc AGENTS.md 规则：raw/ 提交后冻结；文章更新必须通过 `Raw:` 字段（分号分隔）引用新 raw。`reviewer-blind-spots.md` 现有 raw 为 2026-09-03（已冻结）。新结论（共享错误框架）必须进入新 raw，再由文章 Update 引用两者。
>
> ### 共享错误框架
> 来自 advisor A1111 审查意见（advisory-correlation.json）：将反复出现的 advisor 错误（fidelity suspect 假阳性、New/Update 误判、重叠检查遗漏）归入可复用分类法，作为未来扩展，目前不实现。