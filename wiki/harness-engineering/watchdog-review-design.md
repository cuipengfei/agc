# watchdog-review-design

> Sources: raw/harness-engineering/2026-09-20-watchdog-review-design.md, 2026-09-20; 本会话 WATCHDOG.md 重构记录, 2026-09-26; WATCHDOG.md 免责句式禁令与共用反免责清单, 2026-10-25, 2026-11-05
> Raw: [watchdog 审查设计笔记摘录](../../raw/harness-engineering/2026-09-20-watchdog-review-design.md); [WATCHDOG.md 重构与 jevify 盘点](../../raw/harness-engineering/2026-09-26-watchdog-md-restructure.md); [「不能证明」免责句式的禁令与 Best Guess 替代规则](../../raw/harness-engineering/2026-10-25-cannot-prove-ban-and-best-guess-rules.md); [防御式免责表达的治理与规则强化](../../raw/harness-engineering/2026-11-05-anti-cya-disclaimer-governance.md); [主代理与 Advisor 共用的反免责表达标准](../../raw/harness-engineering/2026-11-05-shared-anti-cya-checklist.md)
> Updated: 2026-11-05

Advisor 自审需要结构化框架，以便区分可观测的会话数据、Advisor 的明确断言，以及缺少可核对证据的部分。

## 设计依据

来自会话调查（2026-09-20），Advisor 的输出常将证据与结论混合（“这是错误的”、“那是个 bug”）而不指向具体的 JSONL 行或会话状态。为有效审查，审查者应先陈述：

- 会话数据本身说了什么？
- Advisor 声称了什么？
- Advisor 的说法里，哪些部分能对上具体的 JSONL 行或会话状态？

## 三桶审查思路

根据 `watchdog-improvement-input.md`（2026-09-19）第 135 行：“三桶是结构化、可审计的 inferential step，不是软件意义上的 deterministic check；自然语言抽取仍可能出错。” 这一原则提醒审查者在评估 Advisor 时应区分三类信息，尽管具体桶名未在源文件给出，我们在此仅保留其结构化思路的启示。

## 证据链

- `unified-timeline.md` 第 3 行明确“时间为 JSONL 中的 UTC”；跨时区关联以 UTC 为准。
- `advisory-correlation.json`（2026-09-20）把 Advisor 的 `advise` 工具调用（共 21 次，包含 advisorLine/advisorEntryId/advisorTime）映射到主会话线（mainLine）。
- 有界 transcript 中的 `[shaken ~N tokens — recover: artifact://…]` 标记表示原文可回收（如 advisor-bounded.md:3373 的 ~163 tokens 示例），而非内容不存在。

这些证据把原始会话数据与审查结论连接起来，避免对单行进行孤立解读。

## 发送条件有序散文列表（2026-09-26 重构）

WATCHDOG.md 原有发送时机规则散在三处（重复提醒限制、系统标记语义、完成轮发送时机），判级与时机混在一起。重构后合并为唯一「发送条件」有序散文列表，按顺序逐条评估，先命中的生效。

规则形式选散文短句而非表格：读者是 LLM，表格/决策树伪装的可执行逻辑不增加遵从度。次序仍写清（先命中生效），防止宽规则吞掉升级路径。

重构过程中两条漏网分支被逮到：advisor 连抓两次「非高危 blocker 在完成态没有发送路径」（原表只有高危和 concern/nit 行，blocker 掉进缝隙）；jevify 54 块盘点逮到「用户直接呼叫」在发送条件里没有去处。两条都补进了列表。

## jevify 盘点作为重构验证方法（2026-09-26）

用 jevify 对 WATCHDOG.md 全文 54 个内容块做逐块盘点：冻结 rubric（四项改动作为 framing），每个块判定去处（keep / rewrite_facts / consolidate_send / consolidate_highrisk / prune / mixed / other）。

升级规则：top_p < 0.75、mixed、error、send_timing=true 但 dest 非 consolidate_send/highrisk/keep 的块触发人工复核。32 块触发升级，人工推翻 8 处、拆分 2 处、逮漏网 1 处。

双通道验证：同一批 54 个 state 同时用 judge() 循环和 judgeBatch 跑了一遍，dest 判定 53/54 一致。唯一差异块正是人工已裁定进发送条件的那块。

## 禁止「不能证明」式提醒与共用反免责清单

Advisor 的提醒曾反复使用「X 不能证明 Y」这类句式，并把同样的话术传导给主代理，要求它在回给用户的正文里补「但这不代表所有场景/客户端/未来调用都成立」。为此，`~/.omp/agent/WATCHDOG.md` 与 `~/.claude/CLAUDE.md` 对齐为同一份 6 条正面清单与 10 项禁用短语：

- 推断与省略判级：主代理基于现有信息给出当前最佳猜测或最佳解释（best guess / best interpretation）属正常且受鼓励的行为，推断在对应判断处说明；上下文有省略标记且读不到原文时，点名缺哪一段与下一步读什么，其余判断照常给。把推断写成已核实事实、编造执行结果，或给出与现有证据冲突的判断时，按具体问题检查和判级。
- 命令覆盖范围改写为「已确认 X；要确认 Y，下一步需运行 Z」：只跑 `check:ts` 已确认类型检查通过；`bun test … | tail` 未开 `pipefail` 时，`⇒ ok` 只确认 `tail` 成功；测试未走管道且显示 `⇒ ok` 才确认测试通过。
- 共用 6 条正面清单（同时约束主代理与 Advisor）：① 回答用户提出的问题，不替用户增加目标、极端场景或没有依据的限制；② 判断旁写清证据出处和具体运行条件，常规操作或命令输出拿到什么就写什么，一次命令或测试只说明它实际覆盖的部分，不写成「这证明了……」；③ 技术前提、操作边界和影响结论的反面事实正常保留；④ 信息不足时仍给出基于现有内容的判断并标明推断，不得用一串免责话代替判断；⑤ 条件没变不重复同一限定，删掉无实质影响的修饰；⑥ 完成报告只围绕当前任务，写清已完成事项、实际执行的检查结果、其中的失败与跳过项；任务要求但尚未执行的检查写明原因及影响，未经验证的解释按推断表述。
- 10 项禁用短语与判级钩子：提醒正文禁止出现「不能证明」「无法证明」「不能直接证明」「不能据此断定」「不意味着」「不能得出」「并不能说明」「不足以说明」「没有单一研究证明」「不代表所有场景、所有客户端、未来调用都成立」这类套话。
- 判级与改写示范：主代理反复追加免责尾巴、用免责话代替当前判断，或缺少当前任务要求的验证结果、把失败与跳过写成通过，判 `concern`；把常规操作写成「这证明了……」、在同一前提下重复同一限定或偶发免责口癖判 `nit`。提醒用文件行号或会话位置定位原句，给出只使用现有证据的替换文本。

信息不完整或验证未完成时，Advisor 只保留两种提法：要求主代理给出有证据支持的最佳猜测或最佳解释，把依据和仍缺部分写在判断旁；点名当前任务所需的验证，写清具体检查、缺少的结果及其影响，代码功能检查相关测试和实际行为，文档与 skill 文案检查内容、格式、引用和示例一致性。对 skill 文案做真实模型调用、付费 API 实验、压力测试或对照抽样，须经用户明确授权。

规则在 `~/.omp/agent/WATCHDOG.md` 生效，通过 `./pull.sh` 同步到本仓库 `omp/agent/WATCHDOG.md`。

## 相关

- reviewer-blind-spots.md（harness-engineering/） — Advisor 自审的常见盲区，本设计旨在减少此类错误
- advisor-context-markers.md（omp-config/） — 表明角色与来源嵌入在会话更新中
- omp-sessions/jsonl-format-and-third-party-parsers.md — 第三方解析器对 JSONL 格式的兼容性

---

文章遵循 karpathy-llm-wiki 模板；新证据（2026-09-20）通过 `Raw:` 字段加入；冻结的 2026-09-03 raw 已在 `reviewer-blind-spots.md` 中通过分号并列引用；文章仅在新证据迫使结论变更时更新。