# OMP 工作模式与 Magic Keywords

> Sources: [OMP Vibe Mode 官方文档](../../raw/omp-modes/2026-08-26-omp-vibe-mode.md); [OMP Magic Keywords 官方文档](../../raw/omp-modes/2026-08-26-omp-magic-keywords.md); [OMP Vibe vs Task 对比分析](../../raw/omp-modes/2026-08-26-vibe-vs-task-comparison.md); [OMP 工作模式总览](../../raw/omp-modes/2026-08-26-omp-modes-overview.md)
> Raw: [OMP Vibe Mode 官方文档](../../raw/omp-modes/2026-08-26-omp-vibe-mode.md); [OMP Magic Keywords 官方文档](../../raw/omp-modes/2026-08-26-omp-magic-keywords.md); [OMP Vibe vs Task 对比分析](../../raw/omp-modes/2026-08-26-vibe-vs-task-comparison.md); [OMP 工作模式总览](../../raw/omp-modes/2026-08-26-omp-modes-overview.md); [OMP Workflowz DAG 修正](../../raw/omp-modes/2026-09-09-workflowz-dag-correction.md)
> Updated: 2026-09-09

## 工作流模式

| 模式 | 适合场景 | 核心机制 |
|---|---|---|
| 普通模式 | 日常开发 | 主 agent 自己调查、编辑、执行；需要时调用 `task` subagents |
| `/plan` | 复杂设计、重构、迁移 | 只调查并写计划，不修改工作树；批准后才执行 |
| `/vibe` | 多条并行工作线 | 主 agent 变只读导演；persistent `fast/good` workers 执行 |
| `/goal` | 长期、明确、必须验收的目标 | 保存 objective、budget；验证后才能结束 |
| `/guided-goal` | 目标不够具体 | 采访用户明确目标后进入普通 Goal；不是独立模式 |
| `/loop` | 重复检查、有界修复循环 | 每次 yield 后重复提交同一 prompt |
| `/prewalk` | 强模型规划、便宜模型实现 | 第一次 `edit/write` 时一次性切换模型 |

Plan、Goal、Vibe 互斥。

## Vibe 的 fast/good 与 persistent

- **fast**：`sonic` agent / `@smol` role；机械修改、大批量工作
- **good**：`task` agent / `@task` role；设计、判断、复杂实现

`fast/good` 不是固定模型名，是 capability tier 到 agent/role 的映射；实际模型受 `task.agentModelOverrides`、`modelRoles` 等配置影响。

**Persistent** 指 worker 有自己的 child session 和上下文；完成一次 turn 后进入 idle，可用 `vibe_send` 继续指导；退出 Vibe 才终止。

## Vibe vs 普通模式 + Task/Hub

| | 普通模式 + `task/hub` | Vibe |
|---|---|---|
| 主 agent 工具 | 完整：edit、bash、task、eval 等 | 只读：read、todo、vibe_* |
| Worker 类型 | 任意 agent、role、model | 只提供 fast/good 两档 |
| 持久通信 | `task` 后用 `hub send` | `vibe_spawn` 后用 `vibe_send` |
| 生命周期 | 每个 agent 独立管理 | 统一绑定 Vibe scope，退出时清理 |
| 灵活性 | 高 | 刻意降低 |

**结论：Vibe 没有新的 subagent 能力。它是普通 `task + hub` 的强制收窄和专用包装。**

普通模式是能力超集。Vibe 的核心价值是**强制主 agent 只当导演，不能碰实现**——把“导演不干活”从 prompt 建议变成工具层约束。

## IRC 澄清

- `hub send` 底层是 OMP 的 IRC mailbox 机制。
- 旧 `irc`、`job`、`launch` 已合并为统一的 `hub` 工具。
- Vibe director 没有 `hub`，只能用 `vibe_send` 控制 workers。

## 命名反直觉

“Vibe”通常暗示松散、随意，但 OMP 的 Vibe Mode 实际是**更严格的内部组织**：对人宽松（高层指令），对 agent 严格（只读导演 + 固定 worker 池）。叫 `Director Mode` 或 `Managed Worker Pool Mode` 会更清楚。

## Magic Keywords：只有三个

| Keyword | 效果 | 条件 |
|---|---|---|
| `ultrathink` | 当前 turn 深度推理；auto-thinking 时提升到最高 effort | 无 |
| `orchestrate` | 用 `task` subagents 并行执行 | 需要 `task` 工具 |
| `workflowz` | 用 `eval` 中的 `agent/parallel/pipeline/completion` 构建 DAG；依赖节点按边等待，独立节点仍可并行 | 需要 `task` + `eval` |

匹配规则：

- 精确小写、独立成词。
- 只影响当前 turn。
- 代码块、inline code、路径、函数名不触发。
- 可多关键词组合。

Vibe 父 session 没有普通 `task`/`eval`，因此 `orchestrate`/`workflowz` 不会注入。

## 实用组合

| 场景 | 推荐 |
|---|---|
| 困难单点问题 | 普通模式 + `ultrathink` |
| 复杂设计 | `/plan` + `ultrathink` |
| 大型端到端实现 | `/goal` + `orchestrate` |
| 多阶段研究、审查 | `/goal` + `workflowz` |
| 长期管理多个 workers | `/vibe`；困难调度判断加 `ultrathink` |
| 强模型规划、便宜模型实现 | `/prewalk` + `ultrathink` |
| 重复检查 | 有界 `/loop`，通常不加 magic keyword |

## 不要这样组合

- `/vibe` + `orchestrate`/`workflowz`：不会注入。
- `/loop` + `orchestrate`/`workflowz`：每轮可能重复派工。
- `/goal` + `/loop`：两个机制都在负责“继续推进”，重复。

## 快速选择

```text
先审方案 → Plan
持续做到验收 → Goal
导演多个长期 worker → Vibe
重复同一动作 → Loop
强模型规划、便宜模型接手 → Prewalk

深思 → ultrathink
普通并行派工 → orchestrate
带依赖关系的多阶段 DAG → workflowz
```

## See Also

- [OMP Prewalk：规划后切换模型](../omp-prewalk/prewalk.md) — `/prewalk` 的触发门槛、模型交接与生命周期细节。
- [OMP TTSR 与 /omfg：流式行为护栏](../omp-ttsr/ttsr-and-omfg.md) — 与 magic keywords 对照的规则匹配、提示注入与流式中断机制。
