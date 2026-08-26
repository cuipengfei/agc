---
source-url: https://github.com/can1357/oh-my-pi/blob/b4e8e856ad40294167679a3f88417c07429fe59b/docs/vibe-mode.md
collected: 2026-08-26
published: 2026-08-26
---

# OMP Vibe Mode 官方文档（pinned at b4e8e856）

## 原文摘录

> # Vibe Mode
>
> A built-in workflow mode that turns the parent session into a persistent director: it stays read-only, spawns named worker subagents in two capability tiers, and keeps those workers alive between turns so you can send follow-up work to the same worker without losing its context.
>
> ## What It Does
>
> - Parent becomes read-only director
> - Spawns named workers: `fast` (default `sonic` / `@smol`) and `good` (default `task` / `@task`)
> - Workers keep their own sessions and contexts
> - Director uses `vibe_spawn`, `vibe_send`, `vibe_wait`, `vibe_list`, `vibe_kill`
> - Workers persist between turns until `vibe_kill` or mode exit
>
> ## Usage
>
> ```text
> /vibe
> /vibe fix the flaky tests in packages/tui
> ```
>
> ## Behavior
>
> - The director receives a stripped tool set: `read`, `todo`, and the five `vibe_*` tools.
> - `fast` workers default to `sonic` agent / `@smol` role; `good` workers default to `task` agent / `@task` role.
> - Worker selection order: explicit `agent=` argument, then `task.agentModelOverrides`, then `modelRoles`, then parent model.
> - Exiting Vibe mode terminates remaining workers in that scope.

## 源码印证

- `packages/coding-agent/src/slash-commands/builtin-modes.ts`：`vibe` slash command 注册。
- `packages/coding-agent/src/modes/interactive-mode.ts`：Vibe 父 session 工具集缩减为 `read`/`todo`/`vibe_*`；worker 默认 role 映射；退出时终止 workers。

## 关键结论

1. Vibe 不是“让主 agent 自动执行”，而是**强制主 agent 只当只读导演**。
2. `fast/good` 不是固定模型名，而是 capability tier 到 agent/role 的映射。
3. Workers 是 persistent child sessions，有独立 transcript 和上下文。
4. `vibe_send` 可以唤醒 idle worker 继续工作；`vibe_wait` 等待完成；`vibe_kill` 终止。
