# pstack 在 OMP 的角色模型配置与档位边界：本机原文与会话证据

> Source: 本机 `/home/cpf/.agents/skills/` 下 pstack SKILL.md；本会话 `history://Main` 与已保留输出 `local://0.log`；最终 `/home/cpf/.agents/pstack-models.md`；历史快照 `raw/ai-coding-agents/2026-10-29-pstack-skill-behaviors.md`
> Collected: 2026-11-24
> Published: Unknown

本文件只保存新文所需的必要原文、命令输出摘录和会话证据，不保存完整 transcript。各段标明真实来源与行号。会话中的交互选择只描述本次配置过程，不构成长期偏好。

## 1. 配置文件位置、探测与读取方式

来源：`/home/cpf/.agents/skills/setup-pstack/SKILL.md:10-14`：

```text
- **Cursor:** `~/.cursor/rules/pstack-models.mdc`, an always-applied rule.
- **Claude Code:** `~/.claude/rules/pstack-models.md`. Claude Code loads every file in `~/.claude/rules/` into each new session.
- **Every other harness** (Codex, Pi, OpenCode, and others): `~/.agents/pstack-models.md`. These harnesses don't load it on their own, so pstack skills read this file when they pick a model.

"The settings file" below means the file for your harness. In Claude Code, if that file is missing, read `~/.agents/pstack-models.md` instead, where older versions of this skill wrote it.
```

来源：`/home/cpf/.agents/skills/setup-pstack/SKILL.md:20`：

```text
Enumerate the model slugs you can pass to a subagent in this session (Cursor `Task`, Claude Code `Agent`, OpenCode `task`, Codex `spawn_agent`). That is the dependable source. If your harness also has a command that lists the user's models, prefer it for completeness (for example `opencode models` or `pi --list-models`). If you cannot detect any, ask the user to paste the slugs they have access to. Never write a real slug you have not confirmed is available. The aliases `inherit-parent` and `auto` are always valid even though they are not detected slugs.
```

来源：`/home/cpf/.agents/skills/poteto-mode/SKILL.md:108`：

```text
- **Model settings.** Cursor loads `~/.cursor/rules/pstack-models.mdc` and Claude Code loads `~/.claude/rules/pstack-models.md` automatically. Elsewhere, `/setup-pstack` writes `~/.agents/pstack-models.md`. Read it at task start if it exists. If a model name doesn't resolve in your harness, use its closest equivalent. Cursor puts the reasoning level and speed in the model name (`-xhigh`, `-fast`). Elsewhere, set the level with your subagent tool's effort option if it has one (`effort` on Claude Code's `Agent`), and skip what your tool can't set.
```

来源：`/home/cpf/.agents/skills/poteto-mode/SKILL.md:106-107`，跨宿主 subagent 与 agent 类型映射：

```text
- **Subagents.** `Task` means your subagent tool: `Agent` in Claude Code (`subagent_type: general-purpose`), `task` in OpenCode (`subagent_type: general`), `spawn_agent` in Codex. Drop parameters your tool doesn't have. `environment: "cloud"` means a Cursor cloud agent. Elsewhere, run that agent locally in its own worktree. If your harness has no subagent tool, as in Pi without an extension, do each delegated step yourself, one after another.
- **`poteto-agent`.** Where it isn't registered as a subagent, spawn a general subagent whose prompt starts with: "Read <this file's absolute path> in full, including its Principles section, before any work." Then give the task.
```

## 2. `defaults: 3`、旧预算迁移与三档预算

来源：`/home/cpf/.agents/skills/setup-pstack/SKILL.md:28-34`：

```text
A settings file without the `# defaults: 3` line comes from an older setup. That setup wrote a line for every role, so some of its values are old defaults, not choices. Before step 3, replace these values:

- An `arena cross-judge pool` list of exactly one `claude-fable-*` entry, one `claude-opus-*` entry, and one `gemini-*` entry, in any order, takes the role's step 5 list. Fable and Opus are one vendor, so the Fable entry could judge only where the Opus entry also could.
- A `# budget: unlimited` line becomes `large`, because no role runs above `xhigh`.
- If the settings file has no `# defaults: 2` line either, an old slug is one that matches `grok-*`. An old slug in `feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, or `swarm workers` takes the role's step 5 default. In a panel role (`arena runners`, `arena cross-judge pool`, `interrogate reviewers`), a list of exactly one `claude-opus-*` entry and one old slug, in either order, takes the role's step 5 list. In any other list, each old slug becomes `claude-opus-5-5-high-fast`.

Every other value is the user's choice and stays, including an old slug in any other role and every `inherit-parent` or `auto` value. Tell the user which values you replaced.
```

来源：`/home/cpf/.agents/skills/setup-pstack/SKILL.md:38-42`：

```text
**(a) Ask for a budget.** Prefer your structured-question tool (`AskQuestion` in Cursor, `AskUserQuestion` in Claude Code, `question` in OpenCode) over free text. Offer these three options with these exact labels, and name the current budget when the rule records one. With no rule, say that `large` matches the skill defaults.

- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`
```

历史对照来源：`/home/cpf/code-inside/agc/raw/ai-coding-agents/2026-10-29-pstack-skill-behaviors.md:139-144`，旧快照的四档原文：

```text
- `unlimited — max reasoning`
- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`
```

## 3. 每角色逐级降档、`xhigh` 上限与确认规则

来源：`/home/cpf/.agents/skills/setup-pstack/SKILL.md:44`：

```text
**(b) Apply it.** Build the working table from the skill defaults, and on a re-run keep any role you changed by family, list, or alias (`inherit-parent`, `auto`). Families are the ones Phase A of the **arena** skill defines, so Fable is its own family. Each role has a target effort, which is its default's effort moved by the budget. `large` keeps it, `medium` lowers it one step, and `small` lowers it two steps, on the ladder `xhigh` > `high` > `medium` > `low`. No role runs above `xhigh`, and a target at the bottom of the ladder stays there. Most defaults are at `xhigh`, and each budget label names where those land. Set the effort token of every real slug in the role, panel entries included, to the role's target. The effort token is the last token, or the one before a trailing `fast`. If the result is not a detected slug, use the same family's detected slug with the highest effort at or below the target, else mark the role as needing a choice. `inherit-parent` and `auto` do not change. So `medium` turns `claude-opus-5-5-xhigh-fast` into `claude-opus-5-5-high-fast` and `claude-opus-5-5-high-fast` into `claude-opus-5-5-medium-fast`, and `small` turns them into `claude-opus-5-5-medium-fast` and `claude-opus-5-5-low-fast`. Opus 5.5 always runs its `-fast` slug, so every Opus 5.5 value ends in `-fast`. Fable 5.2 and Gemini have no fast slug, so never write one. Gemini 4 Neon slugs run from `low` to `xhigh` with no `max` or `fast` slug, so its seat runs at `gemini-4-neon-xhigh`, its top slug. A Gemini 4 Neon entry in a panel role takes its own target, `xhigh` moved by the budget, so `large` keeps `gemini-4-neon-xhigh`, `medium` writes `gemini-4-neon-high`, and `small` writes `gemini-4-neon-medium`.
```

来源：`/home/cpf/.agents/skills/setup-pstack/SKILL.md:46`：

```text
**(c) Show the roles and confirm.** Show every role with its model, marking any real slug not in the detected set as needing a choice. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the detected models at `xhigh` or below plus `inherit-parent` and `auto` (both mean: this role runs on the parent chat model, which is how Auto users stay on Auto) as the options. Prefer your structured-question tool over free text. For panel roles (arena runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena runs one judge. It tries only values from a vendor other than the parent's, in list order, so order it by preference. Fable and the other Claude models are one vendor. An `inherit-parent` or `auto` value never judges. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.
```

来源：`/home/cpf/.agents/skills/setup-pstack/SKILL.md:50`：

```text
Every real slug written must be in the detected set and at `xhigh` or below. `inherit-parent` and `auto` always pass. If a chosen real slug is not available, stop and ask again.
```

## 4. 九个角色标签与默认档位模板

来源：`/home/cpf/.agents/skills/setup-pstack/SKILL.md:54,61-73`：

```text
Write the settings file with the `# defaults: 3` line, a `# budget` line with the chosen label and the effort that label names, and one line per role, using the same labels poteto-mode uses. In Cursor, include the frontmatter below with `alwaysApply: true`. In other harnesses, write the settings file without the frontmatter (start at the first `#` line). Overwrite the whole file so re-runs stay idempotent. Shape:

# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit the subagent `model` and spawn a general-purpose subagent). Alias entries in a panel list still count toward its fan-out.
# defaults: 3
# budget: large (xhigh)
feature, refactoring: claude-opus-5-5-xhigh-fast
bug-fix: claude-opus-5-5-xhigh-fast
perf-issue: claude-opus-5-5-xhigh-fast
hillclimb: claude-opus-5-5-xhigh-fast
judgment and prose: claude-opus-5-5-xhigh-fast
arena runners: claude-fable-5-2-high, claude-opus-5-5-high-fast, gemini-4-neon-xhigh
arena cross-judge pool: claude-opus-5-5-high-fast, gemini-4-neon-xhigh
swarm workers: claude-opus-5-5-high-fast
interrogate reviewers: claude-fable-5-2-high, claude-opus-5-5-high-fast, gemini-4-neon-xhigh
```

## 5. poteto-mode 的消费、起始档位与调档规则

来源：`/home/cpf/.agents/skills/poteto-mode/SKILL.md:88,90-92`：

```text
**Defaults for every `Task` call.** `run_in_background: true`, agent mode (readonly strips MCP), file pointers not inlined context, and an explicit model per role, Project workers included. `/setup-pstack` writes the pstack settings file (`~/.cursor/rules/pstack-models.mdc` in Cursor, `~/.claude/rules/pstack-models.md` in Claude Code, `~/.agents/pstack-models.md` in other harnesses), whose per-role lines override the defaults below and the role models in the routed skills (`arena`, `swarm`, `interrogate`). A role with no line keeps its default. A line of `inherit-parent` or `auto` runs the role on the parent model, so omit `model` and spawn a general-purpose subagent (`generalPurpose` in Cursor), because `poteto-agent` defaults to Opus 5.5. Each code playbook reads its own line (`feature, refactoring`, `bug-fix`, `perf-issue`, or `hillclimb`), prose and judgment read `judgment and prose`, and trivial mechanical edits read `swarm workers`. If the settings file has no `# defaults: 3` line, an older setup wrote it. Keep honoring its lines, and tell the user once per session to rerun `/setup-pstack`.

- Code, prose, and judgment: `claude-opus-5-5-xhigh-fast`.
- Trivial mechanical edits: `claude-opus-5-5-high-fast`.
- Diverse review and design panels: one runner each on `claude-fable-5-2-high`, `claude-opus-5-5-high-fast`, and `gemini-4-neon-xhigh`.
```

来源：`/home/cpf/.agents/skills/poteto-mode/SKILL.md:96`：

```text
**Match the model to the job.** Start from the role's line or default, keep its family, and set the level the job needs. The `/setup-pstack` budget sets each role's starting level. Panel seats keep their listed level. Raise any other role one step, up to xhigh, for the hardest or subtlest work, lower it one step for judgment, and two or more steps for routine work. No role runs above xhigh. Opus 5.5 always runs its `-fast` slug. Verification always runs on the `swarm workers` model, `claude-opus-5-5-high-fast` by default. A Gemini seat runs at `gemini-4-neon-xhigh` unless its line names another level. If your subagent tool rejects a slug, never pass it again. Fall back to the role's line or default, then the calling skill's fallback, then the closest valid slug of the same family, then omit `model`. Say so.
```

## 6. arena、swarm、interrogate 的对应消费行

来源：`/home/cpf/.agents/skills/arena/SKILL.md:17`：

```text
3. Pick the runners from the `arena runners` line in the pstack settings file (`~/.cursor/rules/pstack-models.mdc` in Cursor, `~/.claude/rules/pstack-models.md` in Claude Code, `~/.agents/pstack-models.md` in other harnesses), by default `claude-fable-5-2-high`, `claude-opus-5-5-high-fast`, and `gemini-4-neon-xhigh`. An `auto` or `inherit-parent` entry is the parent model, so omit `model` and spawn a general-purpose subagent (`generalPurpose` in Cursor). If your subagent tool rejects a slug, use the nearest valid slug of the same family from its error message or your harness's model list, or drop the seat, keep at least two runners, and say so. Families go by prefix, and the longest match wins: `claude-fable-*`, `claude-*`, and `gemini-*`, after dropping a leading `cursor-`. Any other slug's family is its text before the first hyphen. Spawn more for multiple design directions, and repeat one model when the work is generation-bound, not judgment-sensitive. Pick each subagent's reasoning level per the Subagents section of the **poteto-mode** skill.
```

来源：`/home/cpf/.agents/skills/arena/SKILL.md:28`：

```text
After all Phase B candidates complete, spawn one readonly judge from the `arena cross-judge pool` line in the pstack settings file (`~/.cursor/rules/pstack-models.mdc` in Cursor, `~/.claude/rules/pstack-models.md` in Claude Code, `~/.agents/pstack-models.md` in other harnesses), by default `claude-opus-5-5-high-fast`, `gemini-4-neon-xhigh`. The judge is never from the parent's vendor, and Fable counts as Claude for that check, so use the first entry from another vendor. An `auto` or `inherit-parent` entry is the parent model. If you do not know the parent's model, use the first real slug and say that the vendor check did not run. If your subagent tool rejects a slug, use the nearest valid slug of the same family from its error message or your harness's model list, then the next such entry, or skip the judge, and say so. While you read in Phase D, the judge scores each candidate, by path label, on each rubric criterion and recommends a base.
```

来源：`/home/cpf/.agents/skills/swarm/SKILL.md:22`：

```text
3. Pick the worker model from the `swarm workers` line in the pstack settings file (`~/.cursor/rules/pstack-models.mdc` in Cursor, `~/.claude/rules/pstack-models.md` in Claude Code, `~/.agents/pstack-models.md` in other harnesses). If the file or that line is missing, use `claude-opus-5-5-high-fast`. For `auto` or `inherit-parent`, omit `model` so the workers run on the parent model. If your subagent tool rejects a slug, use the default and say so. If it rejects the default, use the closest valid slug of the same family from its error message or your harness's model list. For a model race, name each arm's model up front. Pick each subagent's reasoning level for the job, per the Subagents section of the **poteto-mode** skill.
```

来源：`/home/cpf/.agents/skills/interrogate/SKILL.md:17`：

```text
Run Phase A steps 3 and 4 and Phase B of the **arena** skill, with four changes. Read the `interrogate reviewers` line in place of `arena runners`. Copy the scope's uncommitted changes into each worktree. Spawn each adversary as a general-purpose subagent (`generalPurpose` in Cursor). In place of the arena task and rationale, give each adversary the scope, the intent, and this brief:
```

## 7. 本会话 operator 批准的 7 个 task slug

以下来源是主会话根据当时 `task` 工具说明展示的清单，`history://Main:634-641`。它只代表本会话的 operator 批准结果，不是跨会话、跨宿主或永久清单：

```text
本会话 `task` 工具允许传给 subagent 的精确模型清单共 7 个：
1. `c8787/gpt-6.1-sol:high`
2. `c8787/gpt-6-luna:low`
3. `kimi-code/k3.1-pro:max`
4. `opencode-go/deepseek-v4.1-flash:max`
5. `sensenova/glm-5.3:max`
6. `sensenova/kimi-k3:max`
7. `kimi-code/kimi-for-coding:max`
```

## 8. 本会话已有的 `omp models` 档位目录证据

初始命令记录来源：`history://Main:189`：

```text
omp models 2>&1 | head -40; echo ---PI---; pi --list-models 2>&1 | head -40
```

该次输出仍可读的两行原文，来源：`local://0.log:388,390`：

```text
│ gpt-6-luna    │      1M │    128K │ low,medium,high,xhigh,max │ no     │
│ gpt-6.1-sol   │    400K │     55K │ low,medium,high,xhigh,max │ no     │
```

后续过滤命令来源：`history://Main:1404`：

```text
omp models 2>&1 | grep -E "k3\.1-pro|deepseek-v4\.1-flash|glm-5\.3|kimi-k3|kimi-for-coding|gpt-6\.1-sol|gpt-6-luna"
```

该命令的完整 58 行表格未保留在当前可读的输出工件中，因此这里不重建表格。主会话当时对目录的逐字结论保留如下，来源：`history://Main:1419-1421`：

```text
实测 `omp models` 中这 7 个获批模型各自支持的档位如下：
- `c8787/gpt-6.1-sol` 与 `c8787/gpt-6-luna`：支持 `low, medium, high, xhigh, max`
- `kimi-code/k3.1-pro`、`kimi-code/kimi-for-coding`、`opencode-go/deepseek-v4.1-flash`、`sensenova/glm-5.3`、`sensenova/kimi-k3`：支持 `low, high, max`（这 5 个模型没有 `medium` 档，`high` 下一步就是 `low`）
```

这些目录条目只证明目录列出的 thinking 档位，不证明 provider 当前可用，也不确认 relay 背后的公司 vendor。

## 9. 本次拒绝结构化表单、完整文本提案与逐角色理由

用户原文来源：`history://Main:256-257`：

```text
fuck, stop use the ask me question tool, just fucking show me full proposal, and tell me why was each suggested for what reason
```

最终全 `:high` 提案及逐角色理由来源：`history://Main:1425-1455`。以下是本次审阅所见的必要原文：

```text
### 全部控制在 `xhigh` 以下的 `~/.agents/pstack-models.md` 提案（medium 档）

# defaults: 3
# budget: medium (high)
feature, refactoring: kimi-code/k3.1-pro:high
bug-fix: c8787/gpt-6.1-sol:high
perf-issue: c8787/gpt-6.1-sol:high
hillclimb: c8787/gpt-6.1-sol:high
judgment and prose: sensenova/glm-5.3:high
arena runners: c8787/gpt-6.1-sol:high, kimi-code/k3.1-pro:high, opencode-go/deepseek-v4.1-flash:high
arena cross-judge pool: c8787/gpt-6.1-sol:high, sensenova/glm-5.3:high, kimi-code/k3.1-pro:high
swarm workers: opencode-go/deepseek-v4.1-flash:high
interrogate reviewers: c8787/gpt-6.1-sol:high, kimi-code/k3.1-pro:high, sensenova/glm-5.3:high

### 逐项对比与选型理由

| 角色 | 当前已写入值 | 修正后的提案值（全部 `<= high`） | 选型与档位理由 |
|---|---|---|---|
| `feature, refactoring` | `c8787/gpt-6.1-sol:high` | `kimi-code/k3.1-pro:high` | `medium` 预算下该角色目标档位就是 `high`（原默认 `xhigh` 降一级）。直接用你的 `task` 主力模型 `k3.1-pro` 跑 `:high`，既合规又分流本地 8787 网关压力。 |
| `bug-fix` | `c8787/gpt-6.1-sol:high` | `c8787/gpt-6.1-sol:high` | 目标档位 `high`。根因排查继续使用绑定在 `plan` / `architect` 上的 `gpt-6.1-sol:high`。 |
| `perf-issue` | `c8787/gpt-6.1-sol:high` | `c8787/gpt-6.1-sol:high` | 目标档位 `high`。性能 trace 分析与优化继续使用 `gpt-6.1-sol:high`。 |
| `hillclimb` | `c8787/gpt-6.1-sol:high` | `c8787/gpt-6.1-sol:high` | 目标档位 `high`。迭代优化继续使用 `gpt-6.1-sol:high`。 |
| `judgment and prose` | `c8787/gpt-6.1-sol:high` | `sensenova/glm-5.3:high` | 目标档位 `high`。方案权衡与文档撰写交给 `glm-5.3:high`（与你的 `advisor` / `memory` 同底座，响应快、中文稳）。 |
| `arena runners` | `c8787/gpt-6-luna:low, inherit-parent` | `c8787/gpt-6.1-sol:high, kimi-code/k3.1-pro:high, opencode-go/deepseek-v4.1-flash:high` | 3 席异构候选（GPT + Kimi + DeepSeek），全部跑在 `:high` 档。如果你想严格按 `medium` 预算把前两席再降一档，由于 `k3.1-pro` 和 `deepseek-v4.1-flash` 没有 `medium` 档，也可把 `gpt-6.1-sol:high` 写成 `c8787/gpt-6.1-sol:medium`。 |
| `arena cross-judge pool` | `c8787/gpt-6.1-sol:high, c8787/gpt-6-luna:low` | `c8787/gpt-6.1-sol:high, sensenova/glm-5.3:high, kimi-code/k3.1-pro:high` | 按候选池顺位排列三个不同 provider 的 `:high` 模型。Arena 在 Phase C 会按顺序挑第一个与父会话不同 vendor 的条目当裁判（注：`c8787` 是本地网关，真实上游 vendor 未知，按模型命名推断为 GPT 系）。 |
| `swarm workers` | `c8787/gpt-6-luna:low` | `opencode-go/deepseek-v4.1-flash:high` | `/swarm` 并行扇出与 `/poteto-mode` 的最终验证都读这一行。`deepseek-v4.1-flash` 只支持 `low, high, max` 三档，选 `:high` 保证验证与并行 worker 的代码质量；若想极省成本也可改写为 `opencode-go/deepseek-v4.1-flash:low` 或 `c8787/gpt-6.1-sol:medium`。 |
| `interrogate reviewers` | `c8787/gpt-6-luna:low, inherit-parent` | `c8787/gpt-6.1-sol:high, kimi-code/k3.1-pro:high, sensenova/glm-5.3:high` | 3 个不同底座的模型同时以 `:high` 档做红队对抗审查，不再出现 `:max`，也不需要借用 `inherit-parent`。 |
```

这段提案与后续批准共同证明：当前全 `:high` 是用户逐角色审阅后的显式选择。尤其 `swarm workers` 模板默认 `high` 在 `medium` 预算下目标为 `medium`，最终仍为 `:high`；面板也含默认 `high` 席位。不能把最终文件说成 `medium` 算法自动产出的机械结果。

## 10. 最终「写吧」授权、写入与复读证据

用户通过 Plannotator 对全 `:high` 提案给出的批准原文，来源：`history://Main:1495-1499`：

```text
# Feedback for Message 1

I've reviewed this message and have 1 piece of feedback:

## 1. (line 50) [👍 Looks good] Feedback on: "写吧"
```

随后实际工具调用与结果，来源：`history://Main:1507-1514`：

```text
→ write(/home/cpf/.agents/pstack-models.md) ⇒ ok · 1 line
→ read(/home/cpf/.agents/pstack-models.md:raw) ⇒ ok · 14 lines

已将全 `:high` 版的配置写入 `/home/cpf/.agents/pstack-models.md` 并复读核对一致。
```

来源：`history://Main:1536`，明确的未验证边界：

```text
跳过了真实 subagent 派生实测；风险是各 provider 端点的实时连通性取决于运行时网络与本地 8787 网关状态。
```

## 11. 最终 `/home/cpf/.agents/pstack-models.md` 全文

以下来源：`/home/cpf/.agents/pstack-models.md:1-13`，本次入库前复读：

```text
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit the subagent `model` and spawn a general-purpose subagent). Alias entries in a panel list still count toward its fan-out.
# defaults: 3
# budget: medium (high)
feature, refactoring: kimi-code/k3.1-pro:high
bug-fix: c8787/gpt-6.1-sol:high
perf-issue: c8787/gpt-6.1-sol:high
hillclimb: c8787/gpt-6.1-sol:high
judgment and prose: sensenova/glm-5.3:high
arena runners: c8787/gpt-6.1-sol:high, kimi-code/k3.1-pro:high, opencode-go/deepseek-v4.1-flash:high
arena cross-judge pool: c8787/gpt-6.1-sol:high, sensenova/glm-5.3:high, kimi-code/k3.1-pro:high
swarm workers: opencode-go/deepseek-v4.1-flash:high
interrogate reviewers: c8787/gpt-6.1-sol:high, kimi-code/k3.1-pro:high, sensenova/glm-5.3:high
```
