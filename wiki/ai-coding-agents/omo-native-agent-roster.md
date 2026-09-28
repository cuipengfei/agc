# omo native 合法 agent 名册与配置三层

> Sources: 本会话实证调查（omo native 5.0.1 / senpi 2026.9.27，2026-09-27）
> Raw: [2026-09-27-omo-native-agent-roster](../../raw/ai-coding-agents/2026-09-27-omo-native-agent-roster.md)
> Updated: 2026-09-27

## 一句话

omo native 的一切 agent 结构（category、具名 subagent、团队、关键词触发）都定义在 omo.jsonc 统一 schema 里；models.json 只管 provider 目录，settings.json 只管主会话默认值——另两层没有 agent 概念。

## 派发通道：10 个 categories（task 工具的 category 参数）

| 名称 | 用途 | 上游内置默认 (variant) | 本机实配（2026-09-27 改后） |
|---|---|---|---|
| quick | 琐碎改动 | gpt-6-luna-fast (low) | 4140/gpt-5.6-luna\|terra @low |
| deep-low | 默认深通道 | gpt-5.6-sol-fast (medium) | 4140/gpt-5.6-luna\|terra @medium |
| deep-high | 升级深通道（门控） | gpt-6-astra (xhigh) | 4140/gpt-6-luna @high（本次新增） |
| ultrabrain | 硬核逻辑重活 | gpt-6-astra (max) | 4140/gpt-5.6-luna\|terra @medium |
| architect | 大局设计 | claude-fable-5-1 (max) | 4140/gpt-6-luna @high（本次新增） |
| artistry / visual-engineering | 创意 / 前端 UI | claude-fable-5-1 (max) | 4140/gpt-5.6-terra\|luna @medium |
| writing | 文档文字 | claude-opus-5-5 (low) | 4140/gpt-5.6-luna\|terra @low |
| unspecified-low / -high | 兜底低/高工作量 | xiaomi/mimo-v2.6-pro (max) / claude-opus-5-5 (medium) | 4140/gpt-5.6 系列 @low / @high |

改前实配只有 8/10（architect、deep-high 走内置默认），omo doctor 报 `all 10 usable` 掩盖了这个缺口——doctor 只验证可解析，不验证是否符合"全走 4140"的预期。新增两条后 10/10 覆盖，doctor 复验通过。

## 具名 subagent（task 工具的 subagent_type 参数）

- explore / librarian：本机已钉 4140/gpt-5.6-luna|terra @low。
- omo-native-code-reviewer → 绑定 unspecified-high；omo-native-gate-reviewer → 绑定 deep-high+unspecified-high；omo-native-qa-executor → 绑定 deep-low+unspecified-low。**绑定的 agent 模型随 category 走**——本次改 deep-high 连带把 ulw-loop 闸门评审从 gpt-6-astra 切到 4140/gpt-6-luna。
- plan-consultant / plan-reviewer：无绑定、无模型钉，plan-gated（仅 plan 工件存在时可派；plan-reviewer 一次性）。模型回退路径未验证。
- 不存在的标识符：`git`（仅 ulw-plan skill 文档提及）、metis/momus/sisyphus/atlas/prometheus/hephaestus（插件版残留）。

## schema 开放点与团队

- categories/agents 键名开放可自定义；agents 条目支持 prompt（完整人格）、tools、allowed_subagents、execution_mode 等；引擎读 omoConfig.agents（代码证据）。自定义新 agent 名直接派遣未实测。
- teams（members 1-8，kind=category|subagent_type）、task 并发默认 5/全局 8、team 上限 8 成员/4 并行/120 分钟、memory 块（reflection 25 step / dream idle 30min 间隔 24h / nudge 10 回合）。

## 三层分工

| 层 | 管什么 | 不管什么 |
|---|---|---|
| models.json | provider 目录与模型 id 池 | agent 概念 |
| settings.json | 主会话默认模型/thinking/TUI | agent 概念 |
| omo.jsonc | categories/agents/teams/task/memory/profiles 一切 agent 结构 | — |

omo doctor 做跨层校验（category 引用的模型必须在 models.json 可解析）。

## 未验证

自定义 agent 派遣路径；plan 顾问模型回退；会话热加载 [native] 改动。

See Also: [omo native 与插件版](omo-native-vs-plugin.md)
