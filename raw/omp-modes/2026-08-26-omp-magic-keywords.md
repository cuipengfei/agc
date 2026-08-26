---
source-url: https://github.com/can1357/oh-my-pi/blob/b4e8e856ad40294167679a3f88417c07429fe59b/docs/magic-keywords.md
collected: 2026-08-26
published: 2026-08-26
---

# OMP Magic Keywords 官方文档（pinned at b4e8e856）

## 原文摘录

> # Magic Keywords
>
> Certain keywords in a user prompt trigger special behavior. Matching is **case-sensitive, whole-word only** (the keyword must be an exact standalone word).
>
> ## Keywords
>
> | Keyword | Effect |
> |---------|--------|
> | `ultrathink` | Injects a system prompt that asks the model to reason deeply and carefully before acting. When automatic thinking is enabled, the current turn also switches to the highest reasoning effort supported by the model. |
> | `orchestrate` | Injects a system prompt that tells the agent to use `task` subagents to parallelize work across the current turn. Only injected when the `task` tool is available in the current tool set. |
> | `workflowz` | Injects a system prompt that tells the agent to use `eval`-based multi-agent orchestration (`agent()`, `parallel()`, `pipeline()`, `completion()`). Only injected when both `eval` and `task` are available. |
>
> ## Matching Rules
>
> - Exact lowercase match required.
> - Whole word only — `Orchestrate`, `orchestrated`, `orchestrate()`, `` `orchestrate` `` do not match.
> - Fenced code blocks, inline code, XML/HTML tags, and file paths are excluded.
> - Only affects the current turn.
> - Multiple keywords can appear in the same prompt.

## 源码印证

- `packages/coding-agent/src/session/agent-session.ts`：`MAGIC_KEYWORDS` registry 只有 `ultrathink`、`orchestrate`、`workflowz`；`orchestrate` 需要 `task`，`workflowz` 需要 `task` + `eval`。
- `packages/coding-agent/src/prompts/system/ultrathink-notice.md`、`orchestrate-notice.md`、`workflow-notice.md`：三个 notice 的实际内容。

## 关键结论

1. 当前 OMP 只有 **三个** magic keywords，没有第四个。
2. `ultrathink` 只影响当前 turn；下一条消息恢复正常。
3. `orchestrate` 和 `workflowz` 依赖工具集：Vibe 父 session 没有普通 `task`/`eval`，因此不会注入。
4. 三者都是“当前 turn 的临时指令”，不是持久模式开关。
