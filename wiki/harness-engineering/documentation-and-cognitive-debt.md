# 文档、测验与 AI 代码库的认知债务

> Sources: VONNG, 2026-08-29; Martin Alderson, 2026-08-31
> Raw: [文档驱动 AI 软件工程](../../raw/harness-engineering/2026-08-29-document-driven-ai-engineering.md); [代码库认知债务测验](../../raw/harness-engineering/2026-08-31-codebase-cognitive-debt-quizzes.md)
> Updated: 2026-09-01

## Overview

Coding Agent 提高了代码产出速度，却不会自动提高团队对系统的理解。文档负责保存需求、决策和验收依据；测验负责暴露开发者理解与代码现实之间的偏差。两者结合，才是在降低认知债务，而不是单纯增加文字。

## 文档应处在工作流内部

文档驱动不是完工后补 README，而是在三个阶段提供不同约束：

- 开发前：PRD、用户故事与验收边界约束“做什么”。
- 开发中：Session Log 保存完整过程，`AGENTS.md` 或 `CLAUDE.md` 保存可检索索引和稳定规则。
- 交付时：教程或操作手册成为人工验收路径，检查“是否交付了用户真正需要的东西”。

代码擅长保存 What 与 How，却很难独立保存 Why。被否决的方案、隐含约束和失败路径若不记录，下一位 Agent 很可能重新走一遍。

## Quiz 是认知差异探针

让 Agent 单向解释代码，容易制造“听懂了”的错觉。让 Agent 反过来提问，则先固定开发者当前的理解，再把错误答案与实际代码对照。

一个轻量做法是要求 Agent：

1. 提出 5 个难度递增的问题。
2. 等用户回答完再判卷。
3. 对错误答案指出“你以为是什么”和“代码实际是什么”。
4. 继续追问真正影响修改或验收的误区。

Quiz 也可用于复杂重构计划、文档集或 PR，但它只负责发现认知缺口。

## 三种保护不能互相替代

- 文档保存意图和决策。
- Quiz 检测人的理解。
- 测试与运行结果验证系统行为。

Agent 可能误读代码，因此不能让它既出题、判卷，又成为唯一事实来源。高价值问题应能回到源码、测试、运行结果或设计记录。

## 实用闭环

```text
PRD / design note
→ Agent 实现与记录 Session Log
→ 测试锁定行为
→ Agent 针对关键设计出题
→ 人解释系统并完成教程式验收
→ 将新决策回写稳定文档
```

## See Also

- [Harness 格式与上下文载体](harness-formats-and-context-carriers.md) — 长会话中如何保存和压缩上下文。
- [Better Harness](../better-harness/better-harness.md) — 从会话与配置中诊断工作流缺口。
- [四 AI Coding Agent 对比](../ai-coding-agents/4-agent-comparison.md) — 不同 harness 如何分配规划、执行与审查职责。
