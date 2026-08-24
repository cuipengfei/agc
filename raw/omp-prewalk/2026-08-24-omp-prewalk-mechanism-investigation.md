# OMP Prewalk 机制调研（源码 + 上游 issue）

> Source: https://github.com/can1357/oh-my-pi/blob/main/docs/prewalk.md 及本机源码 checkout /home/cpf/code-inside/oh-my-pi @ 9892714499 (v18.0.4+11)
> Collected: 2026-08-24
> Published: 2026-08-24

以下为本会话 prewalk 机制调研的定稿论断与证据指针摘录。调研方式：3 wide scout（lo）定 aspects → 4 deep scout（med）取证 → 主 agent 综合 → 多轮 advisor 校正（5 采纳、1 核验驳回后对方撤回）。

## 功能定位

Prewalk 是 OMP 的一次性规划后模型降级机制：规划阶段用当前（贵的）模型，规划落地为 todo 列表后，首个 edit/write 调用返回时（不检查其结果是否 error）自动把会话切换到便宜模型（默认 @smol 角色）执行实现。默认关闭。

## 核心状态机（PrewalkCoordinator, prewalk.ts:90-245）

arm(target) → 注入隐藏 plan nudge → turn 结束: todo 门控（成功的 todo 结果 [!isError] 或会话无 todo 工具）→ 等待首个 edit/write 调用返回（含 xd tier=write/exec；不检查 isError）→ 持久化消息 + scrub plan nudge → setModelTemporary(target, {ephemeral:true}) → 清空全部状态（one-shot）+ 注入 checklist。

关键细节（源码已验证）：

- 动作分类器（prewalk.ts:28-53）：输入 ToolResultMessage，只查 toolName 和 xd tier，不检查 result.isError，失败的编辑同样触发 handoff；直接 edit/write 恒算实现动作；xd:// 设备调用按 approval tier 判定——write/exec 触发、read 或 tier 缺失/畸形不触发。
- todo 门控：prewalk.ts:146 `toolName === "todo" && !result.isError` 才置 todoSeen——全流程只有这一处检查成功性；:162-164 门控放开后才在 toolResults 里 find 实现动作。
- no-op 短路：目标与当前模型相同则不切换、清理并提示；同模型但 effort 不同会真实切换（thinking.ts:171-183）。
- 切换持久性（model-controls.ts:263-292）：model 以 EPHEMERAL_MODEL_CHANGE_ROLE 记入 session transcript（:279-282），不持久化到 settings；但 ephemeral 路径仍调用 settings.getStorage()?.recordModelUsage(...)（:283），即 usage 统计写入 settings storage，写回的只是使用记录而非模型配置。
- arm 不覆盖（prewalk.ts:211-245）；无显式 disarm API，自动清理只发生在切换后或 no-op 时。
- 切换时序：agent-loop.ts:1434-1436 在每个 assistant 消息及其工具结果后发 turn_end（willContinue=true 也发）；agent-session.ts:1248 随即调 advanceAtTurnEnd。同一消息中已批量生成的工具调用仍归当前模型，后续模型请求才用便宜模型。

## 启用路径与优先级

优先级（高到低）：① --no-prewalk（强制关，与其他 prewalk flag 同用报错）② --prewalk / --prewalk-into（显式开）③ config prewalk.enabled（仅新会话；恢复会话不自动 arm——main.ts:1039 定义 restoringSession，:1192 消费）④ 默认关。

- 目标解析链：--prewalk-into ?? @smol → role alias 展开 → resolveCliModel → 显式 hasConfiguredAuth 检查；解析失败或无凭证只黄色 warning + 不 arm，不报错退出（main.ts:1193-1214）。
- /prewalk slash：运行时 arm，固定 @smol，忽略参数，无 off/status/toggle（builtin-modes.ts:596-616）。issue #6174 抱怨属实。
- 未发现 prewalk 专属环境变量；PI_SMOL_MODEL 可间接改默认目标（help-extra.ts:59-61）。
- SDK：Prewalk { target: Model; thinkingLevel? }，调用方须传已解析的 Model 对象（agent-session-types.ts:77-83）。

## Subagent 与边界

三级 precedence（高到低）：task.agentPrewalk（settings，支持 off/自定义 pattern）> agent frontmatter prewalk（boolean|string）> task.prewalk（仅 bundled generic task 的 fallback）（model-resolver.ts:1208-1237；task/prewalk.ts:3-5）。

- 目标不可解析/无凭证/same-model-no-op → warn 跳过，不影响 spawn（executor.ts:3016-3047）。
- security-reviewer 被强制关闭 prewalk：settings override 'security-reviewer':'off'（security/coordinator.ts:231-240）。
- plan-mode 子代理 clone 时清空 frontmatter prewalk（structured-subagent.ts:190-198）；推断：bundled task + task.prewalk fallback 可能绕过此清理，源码未见专门 guard。
- plan-yolo 与 prewalk 两条状态机独立，无互斥/排序 guard（prewalk.ts:251-321）。
- plan nudge 永不持久化、context rebuild 时过滤（agent-session.ts:2440-2458；session-context.ts:343-349）。
- UI：status line 只显示通用 "Prewalk" 标签，不显示目标模型（segments.ts:260-264）。

## 历史时间线（packages/coding-agent/CHANGELOG.md:249-269,704-734,877-917,1259-1274,1431-1517）

v16.5.0 首次引入 → v17.0.8 footer/auth 修复 → v17.1.4 同模型 effort-only 也切换 → v17.2.5 只读 xd:// 不再误触发（PR #7314）→ v17.2.11 one-shot 生命周期修复（PR #7785）→ v17.2.13 DeepSeek reasoning_text 修复（#8248）→ v17.4.2 文档化 + legacy boolean override。

## Issue 现状（截至 2026-08-24 快照）

- #5551（commit 任务重复循环）：已修复（PR #5553）。
- #6075（Cursor provider 下 prewalk 永不切换）：GitHub API state:"open"、closed_at:null，带 wontfix label；维护者评论中的"closed"未生效。根因经维护者 trace 确认：Cursor 服务端跑整个 agent loop（单个 Run RPC），客户端只在任务结束时收到一次 turn_end，且 exec-resolved 工具结果被 kCursorExecResolved 过滤、不进入 context.toolResults（agent-loop.ts:1312-1321）。与本地 ast_edit 的 tier=read（ast-edit.ts:179-187，internal URL 有意不触发）是两条独立路径，不能互相归因。
- #6174（无 off/status、只读任务持续 armed、nudge 反复）：open；前两项源码证实，PR #7785 明确列为 non-goal。用户评论称无法关闭的 armed 状态为 "terrible user experience"。
- #8248（prewalk+compaction 后 DeepSeek reasoning 丢失）：已修复（commit 54ce9e47fc；packages/ai/CHANGELOG.md:227-244）。
- #6083（handoff 后 footer 显示旧模型）：已修复（PR #6214，servingModel 每事件刷新；executor.ts:1675-1714）。
- #5548（提议持久 modelRoles.prewalk 角色）：closed 未实现；当前源码无 prewalk 内置 role（model-roles.ts:22-67）。
- PR #7314 的 Codex review 警告（extension 改写参数后 tier 按旧 args）：已在 wrapper.ts:246-247 通过对 effectiveParams 重算 tier 修复。

## 未决问题

1. 失败（isError）的 edit/write 也会触发 handoff——源码事实，后续影响未实测；checklist 仅是提示词不构成正确性保证。
2. plan-mode 子代理经 task.prewalk fallback 绕过 frontmatter 清理——推断，需运行时验证。
3. prewalk 与 plan-yolo 同时启用时的交互——源码无 guard，未实测。
4. #6174 的 continuation nudge 反复触发频率——由源码条件推导，非直接观测。
5. handoff 前后 Esc 的行为差异（前：保持贵模型且仍 armed；后：保持便宜模型）——已读代码未见 Esc 触发回切路径，推断。

## 调研方法论教训（供后续调研复用）

- advisor 校正意见必须逐条核验源码再采纳/驳回：本次 6 条中 1 条（main.ts:1039 行号指摘）经 grep + 直读双重核验为错误，对方随后撤回。
- 向用户讲功能时用大白话+用户体验视角，不堆内部实现术语；"自毁""arm 出来的状态"等说法被要求重说。
- 修正长回复必须完整重述，不给增量补丁。
