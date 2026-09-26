# Jev 语义回归检查方法

> Sources: OMP eval judge() 会话实测, 2026-09-20; 本会话 jevify 54 块盘点实测, 2026-09-26
> Raw: [eval-judge-jev-semantic-testing](../../raw/omp/2026-09-20-eval-judge-jev-semantic-testing.md); [WATCHDOG.md 重构与 jevify 盘点](../../raw/harness-engineering/2026-09-26-watchdog-md-restructure.md)
> Updated: 2026-09-26

## Overview

OMP eval 的 `judge(state, questions)` 适合检查清晰度、完整性、自洽性、案例质量和文风等语义属性。本次实测表明，结果质量主要取决于 state 是否完整、question 是否保持单一目标、criteria 是否要求具体证据。它应与确定性检查配合使用，不能替代文件、结构、解析和退出码验证。

## 先分配检查职责

确定性工具负责可以直接计算的事实：

- 文件是否存在；
- JSON 能否解析；
- 必需字段是否出现；
- Markdown 围栏是否成对；
- Git 状态和 diff 是否符合要求；
- 测试命令是否以零状态码结束。

`judge(...)` 负责需要理解文本含义的判断：

- 职责边界是否清楚；
- 案例是否覆盖预期流程；
- 规则是否表达触发条件、动作和例外；
- 章节之间是否自洽；
- 文风是否直接、自然。

## 一项 question 检查一个目标

聚合问题容易掩盖局部缺项。检查六项操作是否都包含进入信号、操作、产物和通过条件时，应将六项分别提问。这样，返回结果可以定位具体缺项，也能减少一个局部问题影响整组判断。

同一份 state 可以包含多项 question。System One 会独立评估同一请求里的各题，因此一个问题的答案不会成为另一个问题的上下文。

## Criteria 要求具体证据

较弱的 criteria：

```text
complete：有明确结论和理由
```

本次实测中，state 只是声称自己“给出了一个明确结论和两条理由”，没有实际给出结论和理由；Jev 仍以 0.97 的概率选择 `complete`。这个结果说明该 criteria 接受了自我声明。

更可检查的 criteria：

```text
complete：能从 state 中引用一个具体结论，并能分别引用至少两条内容不同的具体理由
partial：能引用具体结论，但只能引用一条具体理由
missing：无法引用具体结论，或没有具体理由
```

需要时在 instructions 中明确写明：

```text
只检查 state 实际提供的内容。state 声称自己包含某项内容，不能证明该内容存在。
```

## 基线与修改后复用同一 rubric

语义回归检查需要保持问题和 criteria 不变，只替换被检查的 state。修改文本与修改 rubric 同时发生时，前后分数没有直接可比性。

结果应按两个层次阅读：

1. 分类是否改变；
2. 概率分布是否明显接近边界。

本次相同输入连续三次调用中，choice 都是 `complete`，其概率为 0.96 至 0.97；score 为 2.78 至 2.81。单次小数不是稳定常量。关键判断可重复少量次数，观察分类和概率范围是否稳定。

## 保存完整输入与输出

一次可复查的记录应同时保存：

```text
state
questions
output
```

只展示 questions 会隐藏被判断的材料，读者无法解释结果。对输入存在争议时，重新运行并在调用前打印两个实参，再打印完整输出；不要根据记忆重建输入。

返回结构可以说明题型和概率，不能确认实际后端。本次调用由用户根据 API 服务端日志确认是 Jev；其他调用需要单独查看配置、服务端日志或其他运行证据。

## 最小使用流程

1. 用确定性检查验证文件、结构和格式。
2. 为每个语义目标写一个 question。
3. 在 criteria 中要求可定位的具体证据。
4. 保存修改前的 state、questions 和 output。
5. 修改文本后复用同一 questions。
6. 对接近边界或重要的结果重复少量次数。
7. 报告分类、概率范围、样本限制和实际后端证据。

## 证据边界

本文方法来自一次 OMP 会话中的 skill 文本检查和题型实测。高概率假阳性证明该 rubric 有缺陷，不能据此推断 Jev 在其他 rubric 或任务上的整体准确率。三次重复调用只说明本次输入的分类稳定且小数有轻微变化，不能建立一般性的方差范围。

## 批量分类工作流（jevify 盘点）

`jevify` magic keyword 引导 agent 在 eval kernel 中调用 `judge()` 做批量分类。适用场景：对一份文档的每个内容块判定去处（重构时逐块盘点旧规则有没有丢）。

步骤：

1. 冻结 rubric：把重构方案写成 framing，每个块按固定 choice 集判定去处。rubric 在数据加载前定稿，后续不改。
2. 切块：按空白行分隔内容块，每块带所属章节路径。
3. 批量判定：每个块作为一个 state，同一 rubric 的 questions 一次提交。单状态用 `judge()`，多状态用 `judgeBatch`（await 后 drain 收取）。
4. 升级规则：top_p < 0.75、mixed、error、或 send_timing=true 但 dest 与预期不符的块触发人工复核。
5. 人工复核：推翻 judge 误判、拆分跨类块、逮漏网分支。本次 54 块里 32 块触发升级，推翻 8 处、拆分 2 处、逮漏网 1 处。
6. 双通道验证：同一批 state 同时用 judge() 循环和 judgeBatch 跑一遍，比较 dest 判定一致性。本次 53/54 一致，唯一差异块是人工已裁定的那块。

与单状态 judge() 的区别：单状态适合修改前后比较（同一 rubric 复用，关注分类是否改变）；批量分类适合全文盘点（每个块独立判定去处，关注覆盖完整性）。两者共用同一 judge 引擎，批量形态只是传输层差异。

## See Also

- [OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界](../omp/judgment-provider-and-eval-judge.md)
- [OMP judgment /v1/systemone 协议面](../omp/judgment-systemone-protocol.md)
