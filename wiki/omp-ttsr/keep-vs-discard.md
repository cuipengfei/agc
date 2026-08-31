# TTSR `keep` vs `discard`

> Sources: OMP 官方 TTSR 生命周期文档，2026-08-26；GitHub Issue #7182，2026-08-26；Contextual Drag 论文，2026-08-26
> Raw: [TTSR keep vs discard 多源研究](../../raw/omp-ttsr/2026-08-26-keep-vs-discard-research.md)
> Updated: 2026-08-26

## 结论

**没有证据证明 keep 或 discard 在所有场景下更好。** OMP 官方默认值和设计偏好是 `discard`，但这不是 A/B 实测结论。

选择取决于你希望优先保护什么：

- 保护后续上下文不被违规输出污染：倾向 `discard`。
- 让模型看到具体违规实例、便于局部诊断和修复：倾向 `keep`。

这两条是基于机制的场景判断，不是已证实的普遍规律。

## 两种模式看到什么

| | `discard` | `keep` |
|---|---|---|
| 规则内容 | 注入的 XML 中仍包含 | 注入的 XML 中仍包含 |
| 具体违规输出 | 后续模型上下文看不到 | 后续模型上下文保留 |
| 上下文污染 | 较少 | 可能保留错误方向 |
| 诊断具体触发点 | 较差 | 较好 |

`discard` 删除的是被中断的 assistant 消息，包括命中前已经生成的正文；它不等于证明 XML occurrence 会永久保留。当前实验只证明注入事件在当前可见上下文中出现过，未验证其跨后续请求或 compaction 的生命周期。

## 证据

### 官方机制

官方 TTSR 生命周期文档把 `discard` 设为默认值：`contextMode: "discard"`。文档描述的 retry 顺序是：丢弃 partial output，构建规则注入，再追加 hidden runtime custom message。

官方文档说明机制，但没有证明 discard 在经验上优于 keep。

### GitHub Issue #7182

Issue #7182 报告了一个 discard 相关的单案例：模型的违规输出被删除后，看不到具体触发实例，随后虚构了错误原因。该案例支持 keep 在需要诊断具体违规内容的场景中有价值，但它是单个报告，不是对照实验。

Issue 同时提出 per-rule `contextMode`，即不同规则分别使用 `keep` 或 `discard`；该功能尚未实现。

### Contextual Drag

《Contextual Drag: The Hidden Cost of AI Mistakes in Agentic Coding》报告：保留错误上下文可能系统性偏置后续生成，论文摘要报告性能下降 10–20%。这支持在错误方向会继续影响工作的场景中倾向 discard，但它研究的是更一般的错误上下文现象，不是 TTSR keep/discard 的直接 A/B 测试。

### 社区证据

针对 TTSR keep/discard 的 Reddit、Hacker News、Twitter/X 搜索未找到公开对比讨论。这个结果不能证明社区没有使用或没有意见，只能说明本次搜索没有找到可用证据。

## 按错误性质选择

这是场景判断，不是已证实结论：

- **方向性或安全污染**：倾向 `discard`。例如错误命令、危险操作、错误工作方向可能被后续继续模仿。
- **局部、可诊断的修复**：倾向 `keep`。例如需要定位具体格式片段、输出片段或触发位置时，原始实例有用。
- **规则误触发排查**：临时使用 `keep`，观察具体触发内容；确认后修复规则，再决定是否恢复 `discard`。

本仓库的 `no-git-commit-without-explicit-request` 和 `verify-before-mechanism-claims` 归入前两类中的方向性/安全约束，是使用场景判断，不是实验已经证明的最佳配置。

## 最小验证方案

不需要大规模研究。对自己的规则做本地 A/B：

1. 固定同一个 prompt、模型、规则和触发位置。
2. 分别运行 `contextMode: discard` 与 `contextMode: keep`。
3. 观察下一 turn 是否能正确说明触发原因、是否重复错误、是否能完成修复。
4. 每种模式重复几个不同的触发位置，记录：修复正确率、错误重复、虚构原因、输出连贯性和 token/turn 成本。
5. 只改变 `contextMode`，不要同时改变规则文本或 prompt。

结论应限定在自己的规则和模型上；不能从一次成功或失败外推到所有 TTSR 规则。

## See Also

- [OMP TTSR 与 /omfg：流式行为护栏](ttsr-and-omfg.md)
- [OMP Extension 与 TTSR 分层防护](extension-and-ttsr-layering.md)
- [OMP 工作模式与 Magic Keywords](../omp-modes/modes-and-magic-keywords.md)
