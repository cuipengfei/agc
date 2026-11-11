# pstack 与 ub-mode 的作者归属及原则来源

> Sources: Robert C. Martin, 2026-10-25; Robert C. Martin, 2026-11-02; Lauren Tan / Poteto, 2026-09-07; Lauren Tan / Poteto, 2026-10-15; Alexis King, 2019-11-05; cursor/plugins 与 backnotprop/pstack 仓库文档，2026-11-12 采集
> Raw: [ub-mode 来源、署名与提交记录](../../raw/ai-coding-agents/2026-11-12-ub-mode-origin-and-attribution.md); [pstack 作者、上游与镜像归属](../../raw/ai-coding-agents/2026-11-12-pstack-attribution-and-mirror.md); [Attack the Premise 的提交历史与来源检索](../../raw/ai-coding-agents/2026-11-12-attack-the-premise-provenance.md); [Type System Discipline 与 Parse, don’t validate 对照材料](../../raw/ai-coding-agents/2026-11-12-type-system-discipline-parse-dont-validate.md)
> Updated: 2026-11-12

## Overview

`ub-mode` 官方 README 明确说明，它取材自 @poteto 的 `poteto-mode/pstack`，经过精简并加入确定性质量检查工具。`ub-mode` 的 LICENSE 与初始提交作者记录均为 Robert C. Martin。上游 `cursor/plugins/pstack` 的 README 以 Poteto 第一人称介绍项目，LICENSE 署名 Lauren Tan；`backnotprop/pstack` 是独立使用镜像。原则归属需要分别考察文本作者、概念先例和直接引用证据。

## pstack 与 ub-mode 的来源关系

上游 pstack 位于 `cursor/plugins/pstack`。其 README 写道「i'm poteto」和「pstack is my answer」，LICENSE 则署名 Lauren Tan。`backnotprop/pstack` README 自称 `Mirror of cursor/plugins/pstack by Poteto`，并说明镜像开头之后的正文来自上游 README。

`unclebob/ub-mode` README 使用 `loosely based on portions of @poteto's rules` 描述派生关系。GitHub API 当时返回 5 个提交，最早的提交为 `7d7720cd7a1c51863c32a028f6e987d233bc2ad6`，标题是 `Initial commit of ub-mode skill`，作者记录为 Robert C. Martin，日期为 2026-10-25T16:04:08Z。LICENSE 署名也是 Robert C. Martin。Crapper、Dryer、Mutator 的 LICENSE 同样署名 Robert C. Martin。

这些材料支持的传播关系是：Poteto 的 pstack 提供部分规则文本，Robert C. Martin 的 ub-mode 对这些规则进行精简并配合质量检查工具。

## Attack the Premise 的公开文本历史

[PR #329](https://github.com/cursor/plugins/pull/329) 由 @poteto 创建，于 2026-09-07 新增 `principle-attack-the-premise/SKILL.md`，文件变更为 ADDED (+23 -0)。PR 将 `principle-attack-the-premise` 与 `principle-test-behavior-not-implementation` 称为两个新原则文件，并说它们通过 eval 获得了收录理由。

[PR #633](https://github.com/cursor/plugins/pull/633) 同样由 @poteto 创建，于 2026-10-15 修改这条原则。此次修改把「统计哪些 actor 处于不均衡位置」的具体做法扩展为「寻找一个在该前提不成立时会产生不同结果的观察」。

因此，公开记录支持把 `Attack the Premise` 在 pstack 中的名称、触发条件和具体表述归于 Poteto。提交作者、PR 作者和 LICENSE 是不同证据字段，不应互相替代。

本次在上游 `principle-*` 文件中检索外部链接、`inspired by`、`based on` 和 `credit:`，没有命中。网页查询 `"Attack the Premise" before:2026-09-07` 返回的前 10 条结果没有同名软件工程原则。这次查询未发现更早来源；是否存在更早来源，仍需另行查证。

## 原则文本与早期工程思想

上游 `Type System Discipline` 要求 `Make illegal states unrepresentable`，并要求在外部数据边界把未结构化输入解析为类型模型。

Alexis King 的《Parse, don’t validate》发表于 2019-11-05。文章已经提出 `Use a data structure that makes illegal states unrepresentable`，也建议尽早在系统边界把输入转换成更准确的表示。文章结尾还明确写道 `None of the ideas in this blog post are new`。

两份文本显示相关概念在 pstack 之前已公开存在。pstack 文件没有给出该文章的引用，因此 Poteto 是否直接参考《Parse, don’t validate》仍属未知；概念一致只说明先例存在，直接阅读或引用关系没有公开记录。

## 证据边界

- README 自述记录项目声明的来源；每个思想的最早提出者需要另查来源。
- LICENSE 提供署名字段，提交历史提供实际提交作者和时间；两者用途不同。
- 镜像 README 可以证明镜像声明及其指向的上游，不能与上游算作相互独立的归属证据。
- 本次只详细核查了 `Attack the Premise` 和 `Type System Discipline`，没有逐条考证全部 24 条原则的思想史。

## See Also

- [pstack 移植版生态全景](pstack-ports-landscape.md)
- [pstack 技能地图与行为](pstack-skill-map-and-behaviors.md)
