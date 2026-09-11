# OMP Runtime Controls

> Sources: can1357/oh-my-pi source code at `/home/cpf/code-inside/oh-my-pi` (`61a692cf98`), 2026-09-11
> Raw: [runtime controls](../../raw/omp-config/2026-09-11-runtime-controls.md)
> Updated: 2026-09-11

## 这份说明讲什么

这份只写运行时控制：消息队列、何时打断、出错后的语法修复。

## Message queue：steering 与 follow-up 的区别

两者不是 Enter 和 Ctrl+Enter 的模式名，而是两条不同队列。

| 时机 | 默认按键 | 进入哪个队列 | 何时被消费 | 你对 agent 的预期 |
|---|---|---|---|---|
| agent 正在工作 | Enter | steering | 下一个可消费 boundary：新 turn 前、tool batch 之间、当前 turn 即将结束时 | 你想立刻纠偏当前任务 |
| agent 正在工作 | Ctrl+Q / Ctrl+Enter | follow-up | 当前 turn 自然结束后 | 你想排下一步，但不想打断当前执行 |
| agent 已停止 | Enter / Ctrl+Q / Ctrl+Enter | 都不是 | 直接开始普通新 turn | 正常继续对话 |

`Ctrl+Q` 与 `Ctrl+Enter` 是默认绑定，可重映射。

### `steeringMode`

控制一次 steering dequeue 取多少条：

- `one-at-a-time`：FIFO 取队首一条，其余留在队列；
- `all`：取出并清空全部 steering queue，按原顺序一起注入。

`one-at-a-time` 只决定每次 dequeue 取一条，不保证一个长 turn 只处理一次 steering。

### `followUpMode`

控制当前 turn 结束、处理 follow-up 时取多少条：

- `one-at-a-time`：FIFO 取一条；
- `all`：一次取出全部 follow-up，按顺序作为后续 pending messages。

### `interruptMode`

这是第三个独立设置，决定正在跑 tool 时 steering 能否更早介入：

- `immediate`：工具执行期约每 250ms 检查 steering queue；interruptible tool 可被 abort，非 interruptible tool 收到 cooperative signal；
- `wait`：不做 mid-batch 检查，工具跑完到正常 boundary 再消费 steering。

关键边界：

- `interruptMode` 只影响 steering，不影响 follow-up；
- 它只 peek 队列，不消费消息；
- `steeringMode: all` 不是“一次打断所有工具”，只是 dequeue 时取多条；
- turn 末尾若同时有 late steering 和 follow-up，先处理 steering。

## 实用选择

| 目标 | 配置方向 |
|---|---|
| 你经常要立刻纠偏正在跑的任务 | `steeringMode: one-at-a-time` + `interruptMode: immediate` |
| 你常一次输入多条连续纠偏，想一起交给 agent | `steeringMode: all` |
| 你常提前排下一步，但不想打断当前任务 | `followUpMode: one-at-a-time` |
| 你一次排一串明确、兼容的后续指令 | `followUpMode: all` |

## Parse regression tooling：记录与自动修复

这两个功能只针对一种情况：**edit 把原本可解析的文件改到 AST parse 失败**。

### `edit.blackbox.enabled` — Record Parse Regressions

- 在 edit 已提交后才记录；
- 记到 `<agentDir>/edit-blackbox.jsonl`；
- 记录包含完整修改前/后源码、模型、variant、原始 edit 参数；
- 只诊断，不改代码；
- 写日志失败不会使 edit 失败。

### `edit.autoRepair.enabled` — Auto-Repair Parse Regressions

- 先确认文件在磁盘上仍 parse 失败；
- 找 smol role 可用模型；
- 用 BEFORE/AFTER 源码提示修复坏区；
- 最多一次初始尝试加一次反馈重试；
- 拒绝“只是把文本改回 edit 前”的候选；
- 通过完整 re-parse 后才写回文件；
- 成功时在 tool result 显示 `Note:` 和 repair diff，agent 被要求 review repaired region；
- 失败时保留原坏 edit，并返回 warning。

### 两者关系

| 配置组合 | 行为 |
|---|---|
| 只开 recorder | 只记录完整前后源码 |
| 只开 auto-repair | 只尝试 smol 语法修复 |
| 两个都开 | 先记录原始坏状态，再尝试修复 |
| 两个都关 | parse regression 只返回普通 warning |

### 重要边界

auto-repair 的 smol 请求**不走**主 agent / Advisor 的 secrets obfuscation 路径。

## See Also

- [OMP Config Semantics](config-semantics.md) — 24 项普通设置的触发、行为与取舍
- [OMP Experimental Context Management vs OpenCode DCP](experimental-context-vs-dcp.md) — 跨 context 机制对比
