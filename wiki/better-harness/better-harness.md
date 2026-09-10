# Better Harness

> Sources: Better Harness 官方文档，2026-08-30; DEV Community，2026-08-30; DevGENT，2026-08-30; HVTracker，2026-08-30; Claude Code 官方文档，2026-08-30
> Raw: [Better Harness 官方材料](../../raw/better-harness/2026-08-30-overview.md); [Better Harness 第三方评价](../../raw/better-harness/2026-08-30-third-party-reception.md); [Better Harness vs Claude Code Insights](../../raw/better-harness/2026-08-30-vs-claude-insights.md); [BH 确定性分析器边界](../../raw/better-harness/2026-09-03-deterministic-analyzer-boundary.md)
> Updated: 2026-09-03

## 是什么

Coding agent 工作流审计工具。分析项目配置和 session 日志，生成五维健康度报告和修复建议。

**不是** coding agent 运行时，是**分析工具**。

## 支持矩阵

| Host | Shell | Configured Assets | Session Evidence | Lifecycle | Output |
|---|---|---|---|---|---|
| Claude Code | `.claude-plugin/` | ✅ | ✅ | ✅ marketplace | HTML+MD |
| Codex | `.codex-plugin/` | ✅ | ✅ | ✅ marketplace | HTML+MD |
| Qoder | `.qoder-plugin/` | ✅ | ✅ | ✅ bundled | Canvas |
| Cursor | `.cursor-plugin/` | ✅ | ✅ | ❌ source-local | Canvas |
| GitHub Copilot | `.github/plugin/` | ✅ | ✅ | ✅ marketplace | HTML+MD |
| Qwen Code | `qwen-extension.json` | ✅ | ✅ | ✅ native CLI | HTML+MD |
| Pi / OMP | `package.json` manifest | ✅ | ✅（需剥 title 首行） | ✅ native | HTML+MD |
| Kimi Code | `.kimi-plugin/` | ✅ | ✅ | ❌ manual | HTML+MD |
| WorkBuddy | 无 | ✅ | ✅ | ❌ manual | HTML+MD |
| Grok | 无 | ✅ | ✅ | ❌ manual | HTML+MD |
| Augment/Auggie | 无 | ❌ | ✅ | ❌ | HTML only |
| DeepSeek Harness | 无 | ✅ | ✅ | ❌ | HTML+MD |

**OMP 无原生 adapter，但 pi adapter 经处理可用；Prime Agent 未验证。**

## 五维模型

1. **Task Understanding** — agent 知道要做什么吗？
2. **Controlled Execution** — agent 在受控路径上执行吗？
3. **Change Validation** — 改动有测试/验证吗？
4. **Reliable Delivery** — 交付有审查/回滚吗？
5. **Learning Capture** — 经验被沉淀了吗？

## 与 Claude Code Insights 对比

| | Claude Code `/insights` | Better Harness |
|---|---|---|
| 输入 | 过去 30 天本地会话日志 | 项目配置 + session 日志 |
| 输出 | 使用习惯、friction points | 五维评分、findings、repair plan |
| 修复 | 建议复制到 CLAUDE.md | scoped repair action |
| 多 agent | 只支持 Claude Code | 支持 12 个 |
| 本质 | 使用分析工具 | 工作流审计工具 |

都是"分析历史、给建议、不改变运行时"。`/insights` 分析"你怎么用 Claude"，Better Harness 审计"agent 工作流是否健康"。

## 与执行 Harness 的关系

| | Better Harness | OMP | Prime Agent |
|---|---|---|---|
| 类型 | 分析工具 | 执行 harness | 执行 harness |
| 时机 | 事后 | 运行时 | 运行时+持久 |
| 能力 | 诊断、建议、报告 | TTSR、extensions、Prewalk | RLM、Continual Harness |
| 改变行为 | ❌ | ✅ | ✅ |
## 确定性分析器的产出边界

Better Harness 的确定性采集层（`session-analysis` 下的 `.mjs`）产出证据 envelope，**不自动产出缺陷**。本次对 AGC 仓库的三条 finding 全部来自 sub-agent 读源码 + fixture 复现；analyzer 侧三个 envelope 全 `available` 但 findings 均为 0。

真正约束判断质量的是 prose（`SKILL.md:71` 的 exactly three、`findings-review.md` 的质量门、五维天花板模型），不是代码。代码只保证产物格式（renderer 的四类 schema 校验）。

> 证据：[BH 确定性分析器边界](../../raw/better-harness/2026-09-03-deterministic-analyzer-boundary.md)

## 限制

- 不改变 agent 运行时行为——只诊断 + 建议，无自动 apply
- 无原生 adapter 的 host 需手动处理 session 格式（OMP 的 JSONL 首行为 `{"type":"title"}`，pi parser 会跳过）
- Cursor 无 marketplace 安装——source-local only
- 部分 host 需手动安装——WorkBuddy、Grok 无 shell，skills 需手动复制或 symlink；DSH 需绝对 `customSkillDirs` 路径指向 Better Harness 根（拒绝 copies/symlinks/相对路径）；Augment/Auggie 仅 session 读取，无 Skill/install

## See Also

- [Harness 格式与上下文载体](../harness-engineering/harness-formats-and-context-carriers.md) — Harness 编辑格式与上下文载体的通用设计模式
- [OMP TTSR 与 /omfg：流式行为护栏](../omp-ttsr/ttsr-and-omfg.md) — OMP 的实时护栏
- [Prime Agent 技术实质](../prime-agent/prime-agent-technical-reality.md) — Prime Agent 的执行 harness 实现
