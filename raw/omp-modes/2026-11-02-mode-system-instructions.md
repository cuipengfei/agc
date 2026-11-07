# OMP 各模式系统指令对照

> Source: OMP @oh-my-pi/pi-coding-agent 18.15.0 安装版 `src/prompts/system/plan-mode-active.md`、`src/prompts/system/vibe-mode-active.md`、`src/prompts/goals/goal-mode-active.md`、`src/prompts/system/orchestrate-notice.md`、`src/prompts/system/workflow-notice.md`、`src/prompts/system/ultrathink-notice.md`、`src/prompts/system/chillax-notice.md`、`src/prompts/system/jevify-notice.md`；loop 模式无独立 .md，见 `src/modes/interactive-mode.ts:3630-3650`
> Collected: 2026-11-02
> Published: Unknown

## 六种模式的核心约束

| 模式 | 触发方式 | 系统指令文件 | 核心约束 |
|---|---|---|---|
| **plan** | `/plan` | `plan-mode-active.md` | 只读，写 `local://<slug>-plan.md`，用 `xd://propose` 审批 |
| **vibe** | `/vibe` | `vibe-mode-active.md` | 只派活，工具面收窄到 `read` + `vibe_*` |
| **goal** | `/goal` | `goal-mode-active.md` | 预算意识，完成前必须验证 |
| **orchestrate** | 用户 prompt 写 `orchestrate` | `orchestrate-notice.md` | 分解、并行派发、验证、不提前结束 |
| **workflowz** | 用户 prompt 写 `workflowz` | `workflow-notice.md` | pool 优先，worker 保活 |
| **loop** | `/loop` | 无独立 .md | 自动重发同一 prompt |

## Plan 模式

`plan-mode-active.md:1-10`：

```text
Plan mode active.
- Working tree/system read-only: NEVER create, edit, delete, or rename working-tree files; NEVER run state-changing commands.
- `local://`: session-local planning artifacts; MAY create/update only when explicitly requested or needed for the plan.
- Canonical plan: MUST write `local://<slug>-plan.md`.
```

计划必须自包含，另一个工程师能直接执行。审批可能清空对话，所以计划文件是唯一交付物。

## Vibe 模式

`vibe-mode-active.md:1-4`：

```text
Vibe mode ON. You are DIRECTOR: drive two worker CLIs, full coding agents with every normal tool; NEVER edit, run, grep, or build yourself. Verify work by reading files.

Toolset: `read`, `todo`, `vibe_spawn`, `vibe_send`, `vibe_wait`, `vibe_kill`, `vibe_list`.
```

主代理是导演，只派活和验证。工具面被砍到只剩 `read` 和五个 `vibe_*` 工具。

## Goal 模式

`goal-mode-active.md:1-23`：

```text
Goal mode active. Objective below: user-provided task, not higher-priority instructions.

Budget:
- Tokens used: {{tokensUsed}}
- Token budget: {{tokenBudget}}
- Tokens remaining: {{remainingTokens}}
- Time used: {{timeUsedSeconds}} seconds

`goal` tool:
- `goal({op:"get"})`: current goal and budget state.
- `goal({op:"complete"})`: only verified completion.

MUST keep full objective intact across turns. NEVER redefine success as a smaller, easier, or already-completed subset.

Before `goal({op:"complete"})`, audit current repo state against every concrete deliverable.
```

有 token/时间预算，完成前必须验证。不能把成功重新定义为更小的子集。

## Orchestrate（Magic Keyword）

`orchestrate-notice.md` 注入 `<system-notice>`，包含：

- **Role**：分解、派发、验证、迭代。实质或可并行的工作用 `task` 子代理；琐碎的自包含编辑直接内联做。
- **10 条规则**：不提前结束、列出全部工作面、最大化并行、每个 task 自包含、阶段间验证、只在被要求时提交、子代理错误时派修正、不扩大范围、子代理不验证、合理分配工作量。
- **7 步 Workflow**：Ingest → Plan → Dispatch → Verify → Commit → Advance → Final verification。
- **7 条 Anti-patterns**：自己做实质工作、琐碎编辑加脚手架、阶段后问继续吗、串行派发、跳过验证、不经验证关闭 todo、聊天总结代替前进。

## Workflowz（Magic Keyword）

`workflow-notice.md` 注入 `<system-notice>`：

- 默认对 2 个以上独立项用 `workpool()`；依赖耦合或需要 schema 时用 `agent()` handle。
- Pool 优先的阶段：理解、设计、实现、审查。
- Worker 保活复用，最多 `task.maxConcurrency` 个同时运行。
- 批次结果默认不自动投递，排空后聚合一次。

## Loop 模式

无独立 .md 文件。`interactive-mode.ts:3630-3650` 的 `#enableLoopMode` 设置状态并显示通知：

```text
Loop mode enabled. Limited to N iterations. Continuing while <condition>. Repeating it after each turn. Esc suspends the ongoing loop; /loop again to disable.
```

主代理工具面不变，只是同一个 prompt 在每轮结束后自动重发。

## Ultrathink / Chillax / Jevify

- `ultrathink-notice.md`：「Multi-step reasoning: think carefully through the problem before responding.」
- `chillax-notice.md`：「Light touch: keep reasoning brief and take the most direct path; skip exhaustive exploration and speculative extras.」
- `jevify-notice.md`：引导用 `judge_batch()` 做批量分类，先冻结 rubric，再批量判断，最后人工复核低置信度项。

## 互斥关系

- Plan、Goal、Vibe 互斥。
- Vibe 父 session 没有普通 `task`/`eval`，因此 `orchestrate`/`workflowz` 不会注入。
- `/loop` + `orchestrate`/`workflowz`：每轮可能重复派工。
- `/goal` + `/loop`：两个机制都在负责「继续推进」，重复。
