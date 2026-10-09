---
Sources: oh-my-pi 官方文档与源码 (GitHub can1357/oh-my-pi, 2026-10-10 采集): docs/magic-keywords.md, packages/coding-agent/src/modes/magic-keywords.ts, docs/vibe-mode.md
Collected: 2026-10-10
Published: Unknown
---

# OMP Magic Keywords 与 Vibe Mode 官方文档/源码摘录

## 概述（docs/magic-keywords.md）

Magic keywords are standalone prose words in a user prompt that can add hidden, user-attributed instructions for that turn. Notice injection is enabled by default.

The full list — trigger word, gradient, settings copy, required tools, and notice — lives in one table, `packages/coding-agent/src/modes/magic-keywords.ts`; every other surface (settings, notice injection, editor highlighting) derives from it.

## 四个关键词及效果（docs/magic-keywords.md Keywords 表）

- `ultrathink`: "Adds a careful multi-step reasoning notice. When automatic thinking is active, it also selects the highest reasoning effort supported by the current model for that turn, bypassing `providers.autoThinkingMaxEffort`."
- `orchestrate`: "Adds the multi-agent orchestration contract: scope the full task, delegate substantial independent work in parallel, verify each phase, and continue until the request is complete. The notice requires `task` to be enabled and names only the available tools."
- `workflowz`: "Adds a deterministic multi-subagent workflow contract centered on the persistent `eval` kernel's `agent()`, `completion()`, handle, `wait()`, and `workpool()` helpers. It is intended for broad research, reviews, migrations, and adversarial coverage. The notice is injected only when both `eval` and `task` are active."
- `jevify`: "Adds the bulk-classification contract for the `eval` kernel's `judge()` helper: freeze the question, rubric, pre-filter, and escalation threshold before loading any data, judge every item in one batch, then read only what the judge flags. It is intended for commit/PR audits, log triage, and any long homogeneous list with a yes/no or bucket question. The notice is injected only when `eval` is active."

## settings 开关 key 名（docs/magic-keywords.md Configuration + magic-keywords.ts 源码）

文档给出的 shell 命令原文：

```bash
# Disable every magic keyword
omp config set magicKeywords.enabled false

# Disable one keyword while leaving the others enabled
omp config set magicKeywords.ultrathink false
omp config set magicKeywords.orchestrate false
omp config set magicKeywords.workflow false
omp config set magicKeywords.jevify false
```

"The global switch and four per-keyword switches default to `true`. The global switch gates every hidden notice and editor animation; a per-keyword switch gates only that notice (and ultrathink's maximum-auto-thinking override)."

"`workflowz` uses the settings key `magicKeywords.workflow`; its notice adapts to the active task batching, scout availability, and Eval kernel-tool settings."

源码 `MAGIC_KEYWORDS` 表中的 `id` 字段（settings key 后缀为 `magicKeywords.<id>`，notice message type 前缀为 `<id>-notice`）：

| id | word | requires |
| --- | --- | --- |
| `ultrathink` | `ultrathink` | `[]` |
| `orchestrate` | `orchestrate` | `["task"]` |
| `workflow` | `workflowz` | `["task", "eval"]` |
| `jevify` | `jevify` | `["eval"]` |

即 workflowz 的源码 `id` 是 `workflow`，对应开关 key `magicKeywords.workflow`，与文档一致。

源码表注释："This table is the single source of truth. Every downstream surface derives from it: the `magicKeywords.<id>` settings (`modes/settings.ts`), the notice injection and `<id>-notice` message types (agent-session, queued-messages), and the editor/bubble gradients (`setMagicKeywords` in pi-tui)."

## ultrathink 与 providers.autoThinkingMaxEffort

文档原文（见上 Keywords 表 ultrathink 行）：自动思考激活时，ultrathink "selects the highest reasoning effort supported by the current model for that turn, bypassing `providers.autoThinkingMaxEffort`"。

配置节补充："a per-keyword switch gates only that notice (and ultrathink's maximum-auto-thinking override)"。

## 匹配规则原文要点（docs/magic-keywords.md Matching rules）

- "Use the exact lowercase spelling. `Ultrathink`, `Orchestrate`, `Workflowz`, and `Jevify` do not trigger."
- "The keyword must be standalone prose. Sentence punctuation and quotes may touch it, but letters, digits, underscores, slashes, backslashes, hyphens, file extensions, symbol references, and call syntax do not match. For example, `orchestrate,` matches; `orchestrated`, `orchestrate.ts`, `foo::orchestrate`, and `orchestrate()` do not."
- "Fenced code blocks (backticks or tildes), inline code spans, HTML/XML comments/tags/elements, and their contents are ignored."
- "All enabled keywords in one prompt may add their own notice. The visible word remains in the user message; hidden notices are non-displayed custom messages attributed to the user."
- "Matching uses the expanded prompt, after slash-command and prompt-template expansion. Synthetic, agent-initiated prompts do not trigger notices."
- "The instruction applies only to the turn containing the keyword."

## vibe mode（docs/vibe-mode.md）

定义："Vibe mode turns the top-level interactive session into a **director** for persistent background worker sessions instead of letting it edit or execute commands itself. The director's active tools are reduced to `read`, optional parent-owned `todo`, and five worker-control tools."

### 与 plan/goal 互斥及激活期间禁止的操作

- "Vibe mode is mutually exclusive with both active **and paused** plan/goal modes; exit those modes first."
- "Starting, deleting, forking, moving (including `/wt`), or handing off the session is rejected while vibe mode is active. Reset-style `/loop` actions are also blocked."
- 开关："/vibe" slash command；"an inline prompt (`/vibe <prompt>`) enters the mode and submits that prompt as the first directive"。

### worker 控制工具全名（Worker-control tools 表）

- `vibe_spawn`: `{ cli: "fast" | "good", prompt, name? }`. "Starts a blank worker with a complete, self-contained first brief. `name` is sanitized/capped at 48 characters; an id is generated when omitted."
- `vibe_send`: `{ session, message }`. "Steers a streaming turn at its next step; if a turn exists but cannot be steered, queues an automatic next turn; if idle/parked, starts the next turn immediately."
- `vibe_wait`: `{ sessions?, timeout? }`. "Waits for the first watched turn to settle (all in-flight workers when omitted), default 30 seconds. It acknowledges settled jobs so their result is not delivered twice."
- `vibe_kill`: `{ session }`. "Cancels an in-flight turn, clears queued messages, releases the worker, and retains any initialized transcript at `history://<id>`."
- `vibe_list`: `{}`. "Lists sessions in spawn order with tier, state, turn/queue counts, resolved model, and recent activity."

### worker 分层（The two worker tiers 表）

- `fast` tier: bundled agent `sonic`, default role `@smol` — "Mechanical execution, drafts, high-volume work"
- `good` tier: bundled agent `task`, default role `@task` — "Design, judgment calls, and reviewing `fast` output"

"The tier always selects the bundled `sonic` or `task` definition, not a same-named discovered custom agent."
