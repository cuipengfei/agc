---
source-url: https://github.com/can1357/oh-my-pi/blob/b4e8e856ad40294167679a3f88417c07429fe59b/packages/coding-agent/src/slash-commands/builtin-modes.ts
collected: 2026-08-26
published: 2026-08-26
---

# OMP 工作模式总览（源码与文档综合）

## 工作流模式（改变 agent 组织方式）

### 普通模式

默认状态。主 agent 拥有完整工具集，可自己调查、编辑、执行，也可调用 `task` subagents。

### `/plan`

- 只调查并写计划，不修改工作树。
- 计划通过 `xd://propose` 进入 review。
- 用户批准后才执行。
- 与 Goal、Vibe 互斥。

### `/vibe`

- 主 agent 变成只读导演。
- 派生 persistent `fast`/`good` workers。
- 导演用 `vibe_*` 工具管理 workers。
- 与 Plan、Goal 互斥。

### `/goal`

- 保存跨 turns 的 objective 和 budget。
- 维护完成状态，验证后才能结束。
- 支持 `pause`、`resume`、`drop`。
- 与 Plan、Vibe 互斥。

### `/guided-goal`

- Goal Mode 的启动向导，不是独立模式。
- 先采访用户明确目标，再进入普通 Goal。

### `/loop`

- 重复提交同一 prompt。
- 可限制次数或时长。
- 每次 yield 后自动重新提交。

### `/prewalk`

- 强模型规划，便宜模型执行。
- todo gate 打开后，第一次 `edit/write` 时一次性切换模型。
- 只发生一次，不自动切回。

### `--plan-yolo`

- 启动参数，不是 slash command。
- 自动完成 Plan、自动批准、切换模型执行。
- 用于可信的无人值守任务。

## Codex Code Mode（不属于工作流模式）

- `openai-codex` provider 的工具传输优化。
- 模型直接看到 `eval/ask/todo`，其他工具从 `eval` 内调用。
- 减少 model/tool round trips。
- 不提供 Plan/Goal/Vibe 的工作生命周期。

## 能力开关（不改变工作流）

| 命令 | 作用 |
|---|---|
| `/fast` | provider 的 priority/fast service tier；不是换成便宜模型 |
| `/extended-context` | 启用 premium 长上下文窗口 |
| `/computer` | 开关桌面操作工具 |
| `/vision auto\|on\|off` | 控制图片分析委托 |

## Approval Modes（权限策略）

| Mode | 自动批准 | 仍会询问 |
|---|---|---|
| `always-ask` | read | write、exec |
| `write` | read、write | exec |
| `yolo`（默认） | read、write、exec | 通常不询问 |

## 源码位置

- `packages/coding-agent/src/slash-commands/builtin-modes.ts`：所有 mode slash commands 注册。
- `packages/coding-agent/src/slash-commands/builtin-lifecycle.ts`：`/loop`、`/prewalk` 等生命周期命令。
- `packages/coding-agent/src/modes/interactive-mode.ts`：Plan、Goal、Vibe 的核心实现。
