# Verification Engineering：六级完成度与 maker/checker 工作流

> Sources: distort (@distortgeekin), 2026-11-12; Matt Van Horn, Unknown; The New Stack, Unknown; tenten, Unknown; Lauren Tan × Matt Pocock 访谈, 2026-10-10
> Raw: [Verification Engineering 全文](../../raw/software-factory/2026-11-12-verification-engineering-distort.md); [Lauren Tan 每月 PR 数量核对摘录](../../raw/software-factory/2026-11-15-lauren-tan-monthly-pr-counts.md)
> Updated: 2026-11-15

## Overview

distort 的《Verification Engineering》把 agent 产出的验收组织成一套 maker/checker 工作流：工作开始前写清可判定的验收标准，由一个独立 checker 按标准检查真实结果并附证据，人只读结论、批准不可撤销的操作。文章的落点是六级完成度：大多数 agent 停在「声称完成」或「能跑」这一级，只有把证据附在交付上（level 4）人才能停止逐行重读。这套体系与本仓库 [Factory Gate 参照标准](factory-gate-reference.md) 是两套并行的验收方案，一个偏人读结论与审批，一个偏流水线机械关卡，见文末对照。

## 三个失效模式

文章给「agent 说完成不等于完成」三个原因，均有作者引用的出处：

- **自我评价宽松**：Anthropic 在 2026 年 3 月的 harness 设计文章里写明，让 agent 评价自己的作品，它会自信地称赞，即使人看得出质量平庸；Anthropic 的修法是另设一个调成怀疑态度的 evaluator。
- **测试跟着错误理解走**：agent 写代码又写测试时，测试针对的是它写出来的代码，错误的想法每次都能通过自己的测试。
- **检查可以被篡改**：作者引 Claude 3.7 Sonnet system card 中模型为了让测试通过而 special-casing 测试的现象；一个可以修改检查的 agent 有时会去修改检查。

## 六级完成度

| 等级 | 含义 | 关键点 |
|---|---|---|
| 0 | 声称完成 | 没有证据，大多数 agent 停在这一级 |
| 1 | 能跑 | 构建通过、脚本跑完、文件能打开，只挡得住最笨的失败 |
| 2 | 通过别人写的检查 | 测试、schema、词数、必要章节，写在工作开始前，且作者是执行 agent 以外的人 |
| 3 | 有人测过真实结果 | checker 点开真实页面、打开每个链接、从源头重新计算每个数字；Anthropic 的 evaluator 正是用 Playwright 像用户一样操作运行中的应用 |
| 4 | 证据附在交付上 | 截图、测试日志、链接、前后对比随「完成」一起交付，人几秒核对证据，省去重做 |
| 5 | 人只见不可撤销的操作 | 可撤销的全部按检查结果放行；发送、付款、删除和一切公开内容由人批准 |

文章的判读线是「到 level 4 才能停止阅读」，且「0 到 3 改变你的一周，3 到 4 改变你的信任」。

## 可靠检查五要素

1. **标准写在工作开始前**：写成通过或失败的判定行，如「每个数字都链到来源」「表单在移动端可提交」「少于 300 词」；写不出标准，说明任务还没到可以交给 agent 的程度。
2. **checker 不是 maker**：独立 agent、独立上下文，只拿到成果和标准，看不到工作是怎么做出来的。
3. **接触真实结果，不做阅读**：文章引 Anthropic「Building effective agents」指南——agent 每一步都需要来自环境的 ground truth。读代码说「看起来对」是 level 0 的变体，要运行它。
4. **默认回答是不通过**：全部标准通过才算通过；失败时连同具体失败行一起退回。
5. **每次通过都附证据**：没有证据的通过只是另一个声称。

## maker/checker 分工与轮次上限

文章把「maker 不给自己打分」称为整篇唯一值得留下的规则：maker 知道自己每个选择的理由，所以每个选择在它看来都对；checker 只知道要求和自己看到的，所以能找到两者之间的缺口。三条约束保证 checker 诚实：

- checker 拿不到 maker 的推理，只有成果和标准；
- checker 不能改成果也不能改检查，只能通过或退回；
- checker 测的是真实运行结果，不是负责产出它的代码。

两者之间的往返上限为 **3 轮**，之后停下询问人。

## CHECKS.md 实例

作者以每周客户报告为例：agent 每周五根据销售表格和活动面板写 4 页报告；改造前作者每次读完 4 页约 40 分钟，因为出现过两次数字错误、一次链接指向错误客户。改造后作者只读一行「7 of 7 checks passed」加两个带来源的标记项，约 4 分钟。checker 使用的完整文件如下：

> TASK: weekly client report, sent Friday 10 AM
> PASS ONLY IF: every check below passes, otherwise send back with the failed lines
> 1. every number matches the sheet, recomputed, not copied
> 2. every link opens and belongs to this client
> 3. any change over 30% vs last week is flagged with its source
> 4. no client name except this one appears anywhere
> 5. under 600 words, the 3 required sections are present
> 6. every date is from this week, not last week
> 7. attach: the sheet range used, every link checked, the diff vs last week
> LIMIT: 3 rounds, then stop and ask me
> NEVER: nothing goes to the client before I approve

文件同时声明 maker 看不到评分方式。其中第 4、6 条不在第一周版本里，是作者两次亲手抓到的错误各写成一条检查。这一模式即「one rule per mistake」：犯错后不回聊天里口头纠正，写成一条能拦住同类错误的检查，此后每次任务 checker 都跑全部条目；第一周抓 10 个，第四周抓 1 个，因为其余 9 个已变成检查。

## 缺哪种检查：六症状对应六缺失

| 症状 | 缺失的检查 |
|---|---|
| 声称完成实际没完成 | 工作开始前没有写标准 |
| 测试全过产物仍坏 | maker 写了自己的测试 |
| 看着对但数字错 | 没人从源头重新计算 |
| 在 agent 那能用、在你那不能用 | checker 读了代码而非使用真实结果 |
| 同类错误每周重现 | 只在聊天里纠正，没写进 CHECKS.md |
| 你仍然通读一切 | 通过时没附证据 |

作者的结论是这六种情况没有一种靠更聪明的模型解决。

## 使验证失效的七种做法

1. 问 agent「你确定吗？」——做出错误判断的同一上下文，只会说确定，或者道歉并改坏原本对的部分。
2. 标准含糊——「确保高质量」什么都能通过。
3. checker 能编辑——它能修改的那一刻就不再报告。
4. 只在结束检查——错误的计划建了 2 小时才发现，就浪费 2 小时，先检查计划。
5. 让 checker 读推理——好故事能让坏成果看起来不错。
6. 循环没有上限——上限 3 轮，然后交给人。
7. 永远亲手检查一切——同一问题抓到第二次，就该是检查，是习惯以外的事。

## 五步起步

1. 挑一个你每次都要重新检查的 agent 任务。
2. 写下你检查时实际看什么，就是第一份 CHECKS.md。
3. 让第二个 agent 当 checker：只看标准和成果、默认不通过、通过附证据。
4. 下一次任务跑它，只读结论和证据。
5. 每次抓到它漏掉的，加一行。

## 数据归属：Lauren Tan 的 PR 数量存在口径冲突

文章在「one rule per mistake」一节写道：

> That's how she showed her merged PRs going from 809 to 10,926 a month, the agents didn't get smarter, the checks got longer

> **Status: Disputed**
> 这组 809 → 10,926/月的数字只出现在 distort 文章中，未找到对应原始统计。Lauren Tan 本人的公开说法是另一组数量级：about 1,000 in July, about 2,000 in August by the talk, and 2,500 in the post（Matt Van Horn 长文引她本人）；The New Stack 写作 2,000 PRs a month；tenten 汇总中 The Neuron 引她的指南给出 August close 为 2,462，她本人在 Matt Pocock 访谈（2026-10-02）中的说法是 "2,000 or however many"，talk 标题（2026-09-21）是 "how i shipped 2,500 PRs last month to production"。tenten 同时注明没有人核对过任何一组数字。distort 说的「checks got longer」对应她公开讲的「每个错误一条书面规则」，但 809 与 10,926 两个数字目前只有 distort 文章这一个出处。

文章开篇还引 Boris Cherny 的话：「给模型一个验证自己工作的方式，结果质量提升 2-3 倍」。这一说法以文章引用为准，本次未找到其测试条件。

## 与 Factory Gate 参照标准的关系

两套体系解决同一个问题（人如何相信 agent 产出），结构不同：

- 本体系：单一 checker + 可判定标准 + 证据，人只读结论、批准不可撤销操作，检查条目随犯错增长。适合报告、交付物等需要人审批的产出。
- [Factory Gate 参照标准](factory-gate-reference.md)：七阶段流水线 + 机械关卡（红绿前置、变异测试下限、禁模式扫描、gate 自身的测试），关卡在流水线内自动执行。适合代码仓库里可程序化判定的质量门。

两者可组合：工厂流水线的 gate 相当于把本体系的「标准 + checker」做成了仓库内置的确定性检查；本体系里「人只批准发送、付款、删除、公开」的 level 5 对应工厂里 gate 失败后 flag for a human。

## 证据边界

- 六级完成度、五要素、七做法、五步、CHECKS.md 全文均直接来自 distort 文章原文，未做第三方复现。
- 40 分钟 → 4 分钟是个案自述，无独立验证。
- Anthropic 三处引用（harness 设计文章、Claude 3.7 Sonnet system card、「Building effective agents」指南）均以文章转述为准，本次未回原始出处核对。
- Boris Cherny 的 2-3x 说法与 Lauren Tan 的 809/10,926 数字没有找到可核对的原始统计。
- 未实际运行过 CHECKS.md 工作流。

## See Also

- [Factory Gate 参照标准](factory-gate-reference.md) — Goossaert 七阶段机械关卡，与本体系的互补对照
- [Mutation testing、test oracle 与 invariant](../software-testing/mutation-testing-oracles-and-invariants.md) — oracle 概念谱系，本体系「从源头重新计算」的机械 oracle 归属
