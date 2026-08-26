---
source-url: https://github.com/can1357/oh-my-pi/blob/b4e8e856ad40294167679a3f88417c07429fe59b/docs/vibe-mode.md
collected: 2026-08-26
published: 2026-08-26
---

# OMP Vibe vs 普通模式 + Task/Hub 对比分析（本次研究结论）

## 研究背景

用户质疑：普通模式 `task` 工具已经可以调用任意 agent、后台运行、通过 `hub send` 持续通信。Vibe 的 `fast/good` workers 似乎只是子集，没有新能力。

## 核心发现

### 普通模式 + task/hub 的能力

- 可以调用任意 discovered agent（`sonic`、`task`、`scout`、`reviewer` 等）。
- 可以为不同 agent 配置不同 role/model。
- 可以 batch 并行运行多个 subagent。
- 完成后 agent 进入 idle/parked，保留 child session。
- `hub send` 可以唤醒 idle/parked agent，继续使用原上下文。
- 主 agent 保留完整工具集：`edit`、`write`、`bash`、`task`、`eval` 等。

### Vibe 的限制

- 主 agent 被强制变成只读导演：只有 `read`、`todo`、五个 `vibe_*` 工具。
- 没有普通 `task`、`eval`、`hub`、`edit`、`bash`。
- Worker 只有 `fast`（`sonic`/`@smol`）和 `good`（`task`/`@task`）两档。
- `vibe_send` 替代 `hub send`，但只作用于当前 Vibe scope 的 workers。
- 退出 Vibe 时统一终止该 scope 的 workers。

### 结论

**Vibe 没有新的 subagent 能力。它是普通 `task + hub` 的强制收窄和专用包装。**

普通模式是能力超集；Vibe 通过剥夺主 agent 的实现工具，强制“导演只调度、不干活”的纪律。

### IRC 澄清

- `hub send` 底层就是 OMP 的 IRC mailbox 机制。
- `irc`、`job`、`launch` 已合并为统一的 `hub` 工具。
- Vibe director 没有 `hub`，只能用 `vibe_send` 控制 workers。

### 命名反直觉

“Vibe”通常暗示松散、随意，但 OMP 的 Vibe Mode 实际是**更严格的内部组织**：对人宽松（高层指令），对 agent 严格（只读导演 + 固定 worker 池）。

## 源码印证

- `docs/vibe-mode.md`：Vibe 定义和行为。
- `packages/coding-agent/src/slash-commands/builtin-modes.ts`：`vibe` 命令注册。
- `packages/coding-agent/src/modes/interactive-mode.ts`：Vibe 工具集缩减、worker 创建、scope 生命周期。
- `packages/coding-agent/src/session/agent-session.ts`：`hub` 与 IRC 合并的注释。

## 实践建议

- 需要最大灵活性、任意 agent/model 选择：普通模式 + `task` + `hub`。
- 需要强制主 agent 不碰实现、只管理固定 worker pool：Vibe。
- 如果主 agent 经常自己乱改、派工重叠、忘记管理 workers：Vibe 的约束有价值。
- 如果能自律地使用 `task` + `hub`：不需要 Vibe。
