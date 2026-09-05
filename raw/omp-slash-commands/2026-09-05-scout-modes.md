
# OMP 内置 Mode 层 Slash 命令清单

> 源码根：/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/
> 调查范围：仅 builtin-modes.ts 注册的 17 条顶层命令，不含扩展/插件/用户命令。

---

## /security
- **描述**: "Plan, run, inspect, import, and compare OMP-native security scans"
- **子命令**:
  - plan — 创建不可变安全扫描计划 (security.ts:314)
  - scan — 启动已计划或新计划的原生扫描 (security.ts:320)
  - status — 显示原生扫描操作状态 (security.ts:327)
  - cancel — 取消运行中的原生扫描 (security.ts:338)
  - scans — 列出项目已存储的安全扫描 (security.ts:347)
  - show — 渲染扫描或 security:// 资源 (security.ts:357)
  - import — 导入 SARIF 或 Codex Security bundle (security.ts:360)
  - export — 导出规范 bundle、SARIF 或报告 (security.ts:363)
  - validate — 用 OMP 原生工具验证单个发现 (security.ts:373)
  - compare — 对比两次扫描的发现谱系 (security.ts:380)
  - cloud — 管理 Codex Security 云端扫描 (scans/start/status/pull) (security.ts:387)
  - disposition — 为发现设置处置状态及理由 (security.ts:390)
- **机制**: 统一入口 handleSecurityCommand (security.ts:286) 按子命令分派。plan 先走 preflight 生成不可变计划；scan 用计划 ID 启动协调器任务；validate 不直接运行，而是渲染 prompt 模板返回给调用方，由 advisor 后续执行；cloud 子命令与 Codex Security Cloud API 交互。整体依赖 settings.get("security.enabled") 开关。
- **场景**: 需要对本仓库做安全审计、导入外部 SARIF、对比两次扫描差异、或验证某个具体 finding 时使用。
- **收益**: 在 OMP 会话内直接管理安全扫描生命周期，无需离开终端。
- **证据**: 源码实证

---

## /settings
- **描述**: "Open settings menu"
- **子命令**: 无
- **机制**: TUI 专属（仅有 handleTui，无 handle）。调用 runtime.ctx.showSettingsSelector() (builtin-modes.ts:178)，最终由 selector-controller.ts:191 打开全屏设置编辑器覆盖层，支持鼠标点击/悬停/滚轮。
- **场景**: 需要修改 OMP 主题、键位、或其他设置项时。
- **收益**: 在交互界面中图形化编辑设置，无需手动改配置文件。
- **证据**: 源码实证

---

## /setup（别名: providers）
- **描述**: "Open provider setup"
- **子命令**:
  - providers — 配置登录与网页搜索 provider (builtin-modes.ts:189)
- **机制**: TUI 专属。无参数或参数为 providers 时调用 runtime.ctx.showProviderSetup() (builtin-modes.ts:193)，进入 provider 设置向导 (runProviderSetupWizard)。其他参数报 Usage 警告。
- **场景**: 初次安装 OMP 或需要增删 API provider、配置鉴权时。
- **收益**: 引导式配置 provider 与搜索后端。
- **证据**: 源码实证

---

## /plan
- **描述**: "Toggle plan mode (agent plans before executing)"
- **子命令**: 无（接受内联 prompt 作为参数）
- **机制**: TUI 专属。调用 runtime.ctx.handlePlanModeCommand() (builtin-modes.ts:217)。该 handler 在 interactive-mode.ts:3965 实现：若当前已在 plan mode，则退出；否则检查 plan.enabled 设置后进入 plan mode。若有内联 prompt，则作为 plan mode 的第一轮用户输入提交。与 vibe/goal 模式互斥。
- **场景**: 希望 agent 在执行任何改动前先写出可审查的计划文件（local://<slug>-plan.md），适合需要人工审批的复杂重构。
- **收益**: 强制先计划、后执行，降低未经审查的破坏性变更风险。
- **证据**: 源码实证

---

## /plan-review
- **描述**: "Re-open the plan review for the latest plan (plan mode only)"
- **子命令**: 无
- **机制**: TUI 专属。调用 runtime.ctx.openPlanReview() (builtin-modes.ts:228)。在 interactive-mode.ts:4480 实现：扫描 local:// 计划文件，读取最新的一份，打开计划审批覆盖层（handlePlanApproval），允许用户批准、驳回或发送到外部编辑器修改。
- **场景**: plan mode 运行时，agent 写完计划后用户想重新打开审批弹窗；或会话重启后恢复审批。
- **收益**: 随时回到最新计划的审批界面，计划文件跨重启持久化。
- **证据**: 源码实证

---

## /vibe
- **描述**: "Toggle vibe mode (direct persistent fast/good worker sessions; read-only toolset)"
- **子命令**: 无（接受内联 prompt 作为参数）
- **机制**: TUI 专属。调用 runtime.ctx.handleVibeModeCommand() (builtin-modes.ts:246)。在 interactive-mode.ts:4038 实现：进入 vibe mode 时，将工具集削减为 read + 可选 todo，注入 director 上下文，并创建持久的 worker 会话；退出时注销 vibe 工具、恢复先前工具集、杀死所有 worker 会话。与 plan/goal 模式互斥。
- **场景**: 需要让 agent 在受控的只读工具环境下持续执行批量任务（如代码审查、文档生成），利用主管-工人架构提速。
- **收益**: 通过限制工具权限和专用 worker 池，获得更快、更稳定的持续输出；工具集只读，降低误改风险。
- **证据**: 源码实证

---

## /goal
- **描述**: "Toggle goal mode (persistent autonomous objective for this session)"
- **子命令**:
  - set — 设置或替换目标 (interactive-mode.ts:4475)
  - show — 显示当前目标详情 (interactive-mode.ts:4347)
  - pause — 暂停当前目标 (interactive-mode.ts:4393)
  - resume — 恢复暂停的目标 (interactive-mode.ts:4399)
  - drop — 丢弃当前目标 (interactive-mode.ts:4405)
  - budget — 调整 token 预算 (interactive-mode.ts:4411)
- **机制**: TUI 专属。调用 runtime.ctx.handleGoalModeCommand() (builtin-modes.ts:272)。在 interactive-mode.ts:4175 实现：先解析子命令（parseGoalSubcommand），无子命令时根据当前状态打开目标菜单或启动新目标。goal mode 启用后，agent 会在每轮 yield 后自动调度续行（#scheduleGoalContinuation），直到目标完成或预算耗尽。与 plan/vibe 模式互斥，依赖 goal.enabled 设置。
- **场景**: 给 session 设定一个长期自主目标（如把测试覆盖率提升到 80%），让 agent 在后台持续迭代，无需每轮手动催促进度。
- **收益**: 会话级持久自主目标，支持暂停/恢复/预算控制，适合长时间无人值守任务。
- **证据**: 源码实证

---

## /guided-goal
- **描述**: "Have the agent interview you in chat, then set up goal mode"
- **子命令**: 无（接受粗略目标作为参数）
- **机制**: TUI 专属。调用 runtime.ctx.handleGuidedGoalCommand() (builtin-modes.ts:287)。在 interactive-mode.ts:4179 实现：临时注入 goal 工具，以隐藏的 developer message 启动一次访谈对话，agent 通过普通聊天向用户提问澄清需求，最终由 agent 调用 goal create 正式建立 goal mode。访谈期间若 session 正在流式输出，则排队在 yield 后跟进。
- **场景**: 用户只有一个模糊想法（如优化性能），不确定如何写成精确目标时，让 agent 通过问答帮你细化。
- **收益**: 降低 goal mode 启动门槛，把目标定义从写需求变成聊天澄清。
- **证据**: 源码实证

---

## /loop
- **描述**: "Toggle loop mode. While enabled, the next prompt you send re-submits after every yield. Esc cancels the current iteration; /loop again to disable."
- **子命令**: 无（接受 count|duration 和可选内联 prompt）
- **机制**: TUI 专属。调用 runtime.ctx.handleLoopCommand() (builtin-modes.ts:303)。在 interactive-mode.ts:1850 实现：若 loop 已启用则关闭；否则解析参数中的迭代次数（如 10）或时长（如 10m、1h30m），创建 LoopLimitRuntime（loop-limit.ts:58），设置 loopModeEnabled = true。用户随后发送的 prompt 会被记录为 loop prompt，每次 agent yield 后自动重新提交，直到达到限制或用户按 Esc。若有内联 prompt，则立即开始第一轮循环。
- **场景**: 需要让 agent 对同一类任务重复执行多轮（如批量重构、连续审阅多个文件），省去手动反复粘贴相同 prompt。
- **收益**: 自动重复提交，支持次数/时长限制，Esc 可随时打断单轮，适合批量处理。
- **证据**: 源码实证

---

## /queue
- **描述**: "Queue a message for after the agent yields"
- **子命令**: 无（<message> 为必填参数）
- **机制**: TUI 专属。调用 runtime.ctx.handleQueueCommand() (builtin-modes.ts:317)。在 interactive-mode.ts:5840 委托给 input-controller.ts:1316 的 #queueForYield。若当前 session 正在 compaction，则消息排入 compaction 队列；若空闲则立即以 followUp 方式启动。支持多消息（用换行或 -> 分隔）和附带图片。
- **场景**: agent 正在输出中，用户已想好下一轮要说什么，提前排队避免等待。
- **收益**: 零等待连续对话，消息在 yield 后自动投递，不中断当前轮次。
- **证据**: 源码实证

---

## /model（别名: models）
- **描述**: "Switch model for this session"
- **子命令**: 无（可选 [model] 参数）
- **机制**: 同时提供 handle（ACP/文本模式）和 handleTui。无参数时：ACP 输出当前模型名；TUI 打开模型选择器 (showModelSelector)。有参数时：通过 resolveSessionModelSelector (builtin-modes.ts:28) 解析模型 ID、角色别名（@smol）、思考等级（:level），调用 session.setModel() 永久切换（持久化到会话）。
- **场景**: 需要换用不同能力或价格的模型继续当前会话。
- **收益**: fuzzy 选择 + 角色别名 + 思考等级后缀，一条命令完成模型切换。
- **证据**: 源码实证

---

## /switch
- **描述**: "Switch model for this session (same as alt+p); accepts fuzzy ids, provider/id, @role, :level"
- **子命令**: 无（可选 [model] 参数）
- **机制**: 同时提供 handle 和 handleTui。解析逻辑与 /model 相同，但调用 session.setModelTemporary() (builtin-modes.ts:389)，仅对当前会话生效，不持久化。TUI 无参数时打开临时模型选择器 (showModelSelector({ temporaryOnly: true }))。
- **场景**: 只想临时试一下某个模型，不想改变会话默认配置。
- **收益**: 临时切换，重启或新会话后恢复原先模型，降低试错成本。
- **证据**: 源码实证

---

## /fast
- **描述**: "Toggle priority service tier (OpenAI service_tier=priority, Anthropic speed=fast)"
- **子命令**:
  - on — 启用 fast mode (builtin-modes.ts:423, 441)
  - off — 禁用 fast mode (builtin-modes.ts:423, 441)
  - status — 显示 fast mode 状态 (builtin-modes.ts:423, 441)
- **机制**: 同时提供 handle 和 handleTui。调用 session.toggleFastMode() / setFastMode(true/false) (builtin-modes.ts:423)。状态由 session.isFastModeEnabled() 决定，对应 OpenAI 的 service_tier=priority 或 Anthropic 的 speed=fast。切换后刷新状态栏。
- **场景**: 需要更低延迟的响应，且当前模型支持 priority/fast tier 时。
- **收益**: 一键开启 provider 级优先服务 tier，可能消耗更多额度或按更高价格计费，换取更快响应。
- **证据**: 源码实证

---

## /skillful
- **描述**: "Toggle listing available skills in the system prompt (session only)"
- **子命令**:
  - on — 在会话 prompt 中列出可用 skills (builtin-modes.ts:475, 491)
  - off — 在会话中省略 skills 列表 (builtin-modes.ts:475, 491)
  - status — 显示当前状态 (builtin-modes.ts:475, 491)
- **机制**: 同时提供 handle 和 handleTui。通过 session.setSkillful() / toggleSkillful() (builtin-modes.ts:475) 修改会话级设置覆盖，控制是否在系统提示中附加可用 skills 清单。仅影响当前会话，不写入持久配置。
- **场景**: 当 skills 列表过长挤占上下文，或需要让模型明确知道可用技能时临时开关。
- **收益**: 会话级动态控制 skills 可见性，平衡上下文占用与技能召回率。
- **证据**: 源码实证

---

## /extended-context
- **描述**: "Toggle premium long-context windows"
- **子命令**:
  - on — 启用 premium 长上下文窗口 (builtin-modes.ts:514, 521)
  - off — 使用标准定价上下文窗口 (builtin-modes.ts:514, 521)
  - status — 显示当前状态 (builtin-modes.ts:514, 521)
- **机制**: 同时提供 handle 和 handleTui。调用 settings.set("extendedContext", true/false) (builtin-modes.ts:82)，直接修改持久化设置。状态由 settings.get("extendedContext") 决定。
- **场景**: 需要处理超长代码库或大量历史上下文，且愿意承担更高费用时。
- **收益**: 全局开启模型支持的最大上下文窗口，避免中途 truncation。
- **证据**: 源码实证

---

## /computer
- **描述**: "Toggle the native computer-use eval prelude for this session"
- **子命令**:
  - on — 为本会话启用 computer use (builtin-modes.ts:545, 559)
  - off — 为本会话禁用 computer use (builtin-modes.ts:545, 559)
  - status — 显示 computer use 状态 (builtin-modes.ts:545, 559)
- **机制**: 同时提供 handle 和 handleTui。通过 session.settings.override("computer.enabled", enable) (builtin-modes.ts:100) 做会话级覆盖，不持久化。启用时会检查当前 session 是否支持 computer prelude，然后 refreshBaseSystemPrompt() 重建系统提示。status 输出包含 enabled、prelude active 状态及 display/maxWidth/maxHeight 配置。
- **场景**: 需要让 agent 获得截图、光标控制等计算机使用能力时临时开启。
- **收益**: 会话级开关 computer-use eval prelude，无需改全局配置即可在安全隔离的会话中试用。
- **证据**: 源码实证

---

## /prewalk
- **描述**: "Switch to a fast/cheap model at the next action (works even without --prewalk)"
- **子命令**: 无
- **机制**: 仅有 handle（ACP 文本模式可用，TUI 未实测是否有独立 handler，builtin-modes.ts 只注册 handle）。解析 @smol 角色别名得到廉价模型，检查 API key 可用性后调用 session.armPrewalk(model, thinkingLevel) (builtin-modes.ts:629)。arming 成功后，下一次触发 edit/write 动作（todo-gated）时自动切换到该廉价模型，执行完后再切回。即使启动时未带 --prewalk 参数也能工作。
- **场景**: 希望在思考/规划用贵模型、批量编辑/写文件用便宜模型，自动在动作边界切换，节省费用。
- **收益**: 动作级模型降级，只在做实际编辑时切到 cheap 模型，透明节省 token。
- **证据**: 源码实证

---

*文件生成时间：2026-09-05*
