# SkillEvaluator 的效度边界

> Sources: NVIDIA SkillEvaluator metrics-reference 与 grader-validation 文档，2026-11-16 采集；arXiv 2608.20614（2026-08-20）；GitHub discussion #205（2026-10-16）；本会话复算与功效计算，2026-11-16
> Raw: [效度证据材料](../../raw/agent-tooling/2026-11-16-skillevaluator-validity-evidence.md); [计分与门禁源码摘录](../../raw/agent-tooling/2026-11-16-skillevaluator-scoring-and-gating-source.md)
> Updated: 2026-11-16

## Overview

SkillEvaluator 的分数与提升量在什么条件下值得采信。本文用四个证据回答：纸面复现质量分（计分逻辑可精确复现，分数锚定在写作约定上）、缺陷注入推演（静态检查存在明确盲区）、统计功效核算（默认 1 个 case 的 Tier 3 lift 判定接近抛硬币）、grader 自测基线（已知失败任务在 composite 阈值下放行）。机制本身见 [SkillEvaluator 的计分与门禁机制](skillevaluator-scoring-and-gating.md)。

## 88.8 分复现：分数锚定在写作约定上

参考 skill text-analyzer 的文档分数 88.8/100（B）可以按代码规则精确复现。五条扣分：缺 `metadata.tags` −5、脚本没写成表格 −10、没提 `run_script` −10、描述超 200 字符 −5、无 `## Prerequisites` −5；四维 75/95/95/100，按 0.35/0.25/0.25/0.15 加权得 88.75，`round(88.75, 1) = 88.8`，过 70 分门禁。

复现成立的含义是计分逻辑与文档一致，同时暴露分数锚点：被扣的 25 分里 20 分是 SkillEvaluator 自家写作风格（脚本表格、`run_script` 提法），功能完好的 skill 换一种写法就丢约 7 个综合分。加上类型专属扣分块（script-based 与 guide-only 触发不同检查），跨 skill 类型、跨写作风格的分数不可比。

## 缺陷注入推演：静态检查的盲区

对照四个单缺陷变体：

| 缺陷 | 是否被抓住 |
| --- | --- |
| frontmatter 非法 | 抓住（schema 检查，XML 标签 −15 映射 HIGH） |
| 描述没有触发词 | 抓住（discoverability −10） |
| 说明引用不存在的脚本 | **分数无感**（静态扫描最多报一个 reference_resolution incompleteness） |
| 说明与附带代码矛盾 | **分数无感**（只能等 Tier 3 或 rubric judge 概率性发现） |

前两条是确定性扣分；后两条是 Tier 1 的盲区——分数对「文档说了什么」敏感，对「文档说的与目录里实际有什么一致」不敏感。

## 统计功效：默认配置的 Tier 3 lift 接近抛硬币

论文实测（arXiv 2608.20614 摘要）：947 个配对 case、平均 composite Skill Lift 0.2134（95% 配对 CI [0.1967, 0.2301]）、72.8% 的配对 case 为正；静态扫描分与 LLM 判分的相关性 Spearman ρ=0.14——两层分数量的是不同的东西。

由论文 CI 反推单 case 配对差标准差：半宽 0.0167（=（0.2301−0.1967）/2）除以 z=1.959963984540054 得标准误，乘 √947 得 sd≈0.26。据此：

- 80% 功效检测 0.2134 的 lift：配对均值检验约需 12 个 case；保守的符号检验（p=0.728）约需 38 个。
- autopilot 默认 1 个 case 时，即使真实 lift 恰为论文值 0.2134，判定落 NEUTRAL（< +0.05）或 FAIL（≤ −0.10）的概率约 27%。
- dataset_sufficiency 的 Wilson 半宽 ≤0.20 规则：n=10 时半宽 0.26，n=20 时 0.2007，n=21 时 0.1966——最少需 21 个 case 才满足它自己的精度规则；「至少 10 个 case」的下限在最坏情况（p=0.5）下永远达不到。

文档自己承认这些阈值「是文档化的默认值，不是从功效分析推出来的」；小规模 run 的定位也写明了：`--n-attempts 1` 加几个 case 只能证明 harness 跑通了、skill 激活了，支持不了「skill 提升 agent 表现」的结论。

## grader 自测基线：不光彩但照发

内置 16 case 校准套件（14 assessment + 2 tuning）上，两个 judge 模型对已知失败任务在 composite overall 阈值（默认 0.5）下 **15/15 全部放行**——确定性维度干净时，已知失败的 attempt 依然能拿 overall pass；attempt 层的目标闸门（goal_accuracy=1.0）不在这条路径上。accuracy 按 0.2 粒度给部分分：只有 FORMAT_FOLLOWED 为 false 时拿 0.8，恰好过 0.8 的默认阈值。behavior judge 在格式类 case 上误放行 9/12、另一组 20 case 上 15/33。文档明写这些标签不是独立人工标注、套件刻意做小、不是可靠性基准。

约五分之二的 Overall 分（accuracy、goal_accuracy 部分与 behavior_check 部分）来自 LLM 判分，带有模型方差；聚合本身（维度、Overall、lift、区间）是纯算术。人工复核时看三样原始证据：每个 case 的 goal_accuracy 布尔值、accuracy 的五条布尔明细、`judge_mixed_cases` 是否非零。

## 未测量项与外部佐证

文档「What has not been established」节明写：无 judge 与人工标注的一致性研究、维度定义是设计选择、阈值是约定值、无「多给一条指令」本身的对照组、统计区间不是泛化声明。

discussion #205（2026-10-16 发起，截至 2026-11-16 零回复）是外部研究者指出论文第 7 节的 judge 一致性、人工校准、不确定性传播未测量，申请合作研究 judge 分歧对配对 lift 的影响——与上述功效缺口同向。

## 结论与用法

- **Tier 1 分数**当「约定遵循度」用：用 `--quality-config` 把组织不认的风格条目清零后再作门禁；引用存在性靠上游补检查或把 SkillSpector 的 reference_resolution 当阻断信号对待。error 级扣分项（XML 标签、缺脚本目录）默认单独卡死检查，info 级项只影响分数。
- **Tier 3 composite Overall 及衍生判定**需要人工复核：先看 goal_accuracy 布尔值与 accuracy 五条明细，再看 `judge_mixed_cases`；lift 想有分辨力，按 12–38 个 case 准备数据集（论文效应量 0.2134、sd≈0.26 假设下的功效需求）。
- **方法可复用的两点**：复算已知答案分数验证计分逻辑；缺陷注入定位「分数无感区」。功效数字依赖论文 CI 推得的单 case 波动假设，任务结果偏二元时需求更接近符号检验的 38 一档。

## See Also

- [SkillEvaluator 的计分与门禁机制](skillevaluator-scoring-and-gating.md) — 三档机制、扣分表、门禁路径、安装与凭据
