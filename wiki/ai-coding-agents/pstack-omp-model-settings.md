# pstack 在 OMP 的角色模型配置与档位边界

> Sources: 本机 pstack SKILL.md 与 OMP 会话证据，2026-11-24；最终 `~/.agents/pstack-models.md`，2026-11-24
> Raw: [pstack-omp-model-settings](../../raw/ai-coding-agents/2026-11-24-pstack-omp-model-settings.md)
> Updated: 2026-11-24

## Overview

本机 pstack 的角色模型配置是纯文本，最终写在 `~/.agents/pstack-models.md`，头部为 `# defaults: 3` 和 `# budget: medium (high)`，九个角色行当前全部使用 `:high`。OMP 不会自动加载这个文件；调用 `poteto-mode`、`arena`、`swarm` 或 `interrogate` 时，由执行这些技能文本的 agent 按需读取，再把角色行映射为 OMP `task` 工具的模型参数。这里记录的是 pstack 的九行角色标签，不是 OMP 原生角色。`:max` 被排除是 pstack 的档位政策；OMP 的批准身份与 ceiling 细节见 [OMP per-call model 与许可机制](../omp-config/per-call-model-and-allowlist.md)。

## 配置文件位置与消费链

`setup-pstack` 的三个目标位置是：

- Cursor：`~/.cursor/rules/pstack-models.mdc`。
- Claude Code：`~/.claude/rules/pstack-models.md`。
- 其他 harness（原文点名 Codex、Pi、OpenCode 等）：`~/.agents/pstack-models.md`。

前两类由相应宿主自动加载；其他 harness 不会自动加载，靠 pstack 技能自己在挑模型时读取。OMP 按其他 harness 桶消费 `~/.agents/pstack-models.md`。`poteto-mode` 明确要求任务开始时存在即读取；`arena` 读 `arena runners` 与 `arena cross-judge pool`，`swarm` 读 `swarm workers`，`interrogate` 复用 arena 的扇出步骤并改读 `interrogate reviewers`。文件中的角色行覆盖技能默认，删行才回退默认。

这份文件没有独立执行器。若运行入口没有读取技能正文，或 subagent 工具无法设置模型，写文件本身不能保证实际运行档位。

## 当前九角色配置快照

`/home/cpf/.agents/pstack-models.md` 当前全文为：

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

`arena runners` 与 `interrogate reviewers` 是面板列表，一个条目起一名 subagent，列表长度决定并发席数。`arena cross-judge pool` 也是列表，但只跑一名 judge；Arena 按列表顺序尝试与父会话不同 vendor 的条目，`inherit-parent` 与 `auto` 不担任 judge。当前没有运行过真实的 arena 或 interrogate，所以这里没有已验证的裁判选择结果。

## 预算是起始降档规则，不是输出证明

现行预算只有三档：

- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

`setup-pstack` 按每个角色自己的默认档位计算目标：`large` 保持默认，`medium` 在 `xhigh > high > medium > low` 阶梯上降一档，`small` 降两档；封顶 `xhigh`，封底 `low`。因此 `# budget: medium` 只记录本次预算选择，不证明文件里每行都由算法自动生成。事实上，九个默认角色并不全在 `xhigh`：五个单模型角色默认在 `xhigh`，`swarm workers` 模板默认是 `high`，面板也含默认 `high` 席位。按 `setup-pstack` 的逐角色规则，`swarm workers` 在 `medium` 下的目标是 `medium`；当前文件仍写 `:high`。面板中的默认 `high` 席位也高于 `medium` 规则目标。当前全部 `:high` 是用户在完整提案中逐角色审阅并批准后的显式配置，不能改写成 medium 算法的机械结果。

`poteto-mode` 也写明预算只是每个角色的 starting level；面板席位保留文件列出的档位，其他角色仍可按任务需要上调或下调，但不得超过 `xhigh`。

## `:max` 为何被排除

本会话的 OMP `task` 工具说明列出七个 operator 批准 slug，其中五个带 `:max`。`setup-pstack` 的写入校验要求真实 slug 在探测集合内且不高于 `xhigh`，并要求可用模型缺失时停下重新询问；技能正文同时规定没有角色运行超过 `xhigh`。因此 `:max` 的排除是 pstack 政策，不表示 OMP 目录不支持 max。本会话已读的 `omp models` 目录明确显示若干模型支持到 `max`，也显示部分模型只支持 `low, high, max`。目录只说明支持档位，不说明 provider 当前可用，也不确认 relay 背后的公司 vendor。

`inherit-parent` 与 `auto` 是例外别名：技能定义它们恒合法，实际行为是省略 subagent 模型参数并让该席跑父会话模型。当前最终配置没有使用这两个别名。

## 本次交互选择与授权边界

本次流程中，用户明确拒绝继续用结构化表单，要求先在聊天里看到完整文本提案和逐角色理由；之后对全 `:high` 方案给出「写吧」，配置实际写入 `~/.agents/pstack-models.md` 并复读一致。这里只把这一交互记录为本次 pstack 配置流程的选择，不把它提升为用户在所有任务中的长期偏好。

## 未验证边界

- 本次没有真实派发 pstack subagent，不能宣称 arena、swarm 或 interrogate 的运行时模型派发已验证。
- `omp models` 只证明目录中的模型档位，不证明 provider 当前可用。
- 没有确认 relay 或 provider 背后的公司 vendor；面板与 judge 的 vendor 过滤只有技能规则，没有本机运行结果。
- 这份纯文本靠 agent 遵循技能指令消费，不是 OMP 内置的九角色硬限制器。

## See Also

- [pstack 技能地图与行为](pstack-skill-map-and-behaviors.md)
- [OMP per-call model 与许可机制](../omp-config/per-call-model-and-allowlist.md)
