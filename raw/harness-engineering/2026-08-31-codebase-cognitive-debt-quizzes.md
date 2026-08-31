# Reducing codebase cognitive debt through quizzes

> Source: https://martinalderson.com/posts/codebase-cognitive-debt-quizzes/
> Collected: 2026-09-01
> Published: 2026-08-31

## 原文关键段落

> One remarkably effective technique I stumbled on is asking the agent to quiz you on the code base.

作者给出的提示要求 Agent 提出 5 个难度递增的问题，在回答结束后解释用户对代码库理解错误的地方。

> The best bit is chatting to the agent about the ones you got wrong. It has the context of what you thought versus what the code actually does.

作者还把这种方法用于复杂重构计划、电子表格和大型文档集，并提出可以进一步要求开发者通过某个 PR 的测验后才能创建 PR。

## 证据边界

- 文章是个人经验短文，没有对照实验或效果数据。
- 测验能暴露“用户理解”和“Agent 所读代码”之间的差距，但不能证明 Agent 的判卷必然正确。
- 源码、测试与运行结果仍是事实依据；Quiz 是认知诊断工具。
