# omo native 合法 agent 名册与配置三层（会话实证）

- Source: 本地会话调查（omo native 会话 2026-09-27T07-33-33Z，cwd=/home/cpf/code-inside/agc）
- Collected: 2026-09-27
- Published: 2026-09-27（同日会话实录摘录）

## 运行时注册表（本会话 task 工具枚举 + omo doctor）

- `omo doctor` 输出：`Edition: Native · Installed: 5.0.1 (engine: senpi 2026.9.27)`；`PASS task categories: all 10 usable with your connected providers`。
- 10 categories：quick、deep-low、deep-high（升级通道，门控）、ultrabrain、architect、artistry、unspecified-low、unspecified-high、visual-engineering、writing。
- subagent_type：explore、librarian、omo-native-code-reviewer、omo-native-gate-reviewer、omo-native-qa-executor、plan-consultant（plan-gated）、plan-reviewer（plan-gated，一次性）。
- 不存在的标识符：`git`（仅 ulw-plan skill 文档提及）、metis/momus/sisyphus/atlas/prometheus/hephaestus（插件版残留）。

## 三个 omo-native-* agent 的 categories 绑定（omo-task.js 定义原文）

- `omo-native-code-reviewer`：`categories:["unspecified-high"]`
- `omo-native-gate-reviewer`：`categories:["deep-high","unspecified-high"]`
- `omo-native-qa-executor`：`categories:["deep-low","unspecified-low"]`
- plan-consultant / plan-reviewer：定义无 categories/model 字段。
- 含义：改 category 的模型会连带改绑定的 reviewer 的模型（实测：deep-high 改后 gate-reviewer 从内置默认 gpt-6-astra 改走 4140/gpt-6-luna）。

## 上游内置默认模型（omo.js 内置表提取）

| category | 默认模型 (variant) |
|---|---|
| quick | gpt-6-luna-fast (low) |
| deep-low | gpt-5.6-sol-fast (medium) |
| deep-high | gpt-6-astra (xhigh) |
| ultrabrain | gpt-6-astra (max) |
| architect | claude-fable-5-1 (max) |
| artistry | claude-fable-5-1 (max) |
| visual-engineering | claude-fable-5-1 (max) |
| writing | claude-opus-5-5 (low) |
| unspecified-low | xiaomi/mimo-v2.6-pro (max) |
| unspecified-high | claude-opus-5-5 (medium) |

## omo.jsonc [native] 实配（2026-09-27 改后原文摘录）

- 修改前实配 8 条 categories（artistry、deep-low、quick、ultrabrain、unspecified-high、unspecified-low、visual-engineering、writing，均 4140/gpt-5.6-terra|luna + reasoning 档位），architect 与 deep-high 未覆盖。
- 2026-09-27 新增两条（edit 工具写入，omo doctor 验证 all 10 usable）：

```json
"architect": { "models": ["4140/gpt-6-luna"], "reasoning": "high" },
"deep-high": { "models": ["4140/gpt-6-luna"], "reasoning": "high" }
```

- agents：explore、librarian（均 `4140/gpt-5.6-luna|terra`，reasoning low）。
- models.json 验证：4140 provider 含 `gpt-6-luna`（同 provider 另有 claude-fable-5、gpt-5.4/5.5、gpt-5.6-sol/terra/luna、gpt-6-sol 等 10 个模型）；c8787 provider 同样含 gpt-6-luna。

## 官方 schema（omo.jsonc $schema URL 拉取）

- categories/agents 的 propertyNames 开放（可自定义）；agents 条目支持 description、prompt、model/models、reasoning、tools、execution_mode（in-process|process）、background、max_depth、allowed_subagents、disallowed_tools、max_turns、disable。
- 引擎读取证据：omo-task.js 中 `.agents,config:e.engine.omoConfig`。
- 另有顶层 teams（members 1-8，kind=category|subagent_type）、task（并发默认 5/全局 8、team 8 成员/4 并行/120 分钟）、memory（reflection step_count 25、dream idle 30min/间隔 24h、nudge 10 回合）、models、model_profiles。

## 配置三层分工

- models.json = provider 目录；settings.json = 主会话默认模型/thinking/TUI；omo.jsonc = 一切 agent 结构（另两层无 agent 概念）。

## 未验证事项

- 自定义新 agent 名能否直接作 subagent_type 派遣（引擎读配置有代码证据，派遣路径未实测）。
- plan-consultant/plan-reviewer 的模型回退路径。
- 已运行会话是否热加载 [native] 配置改动（新会话确定生效）。
