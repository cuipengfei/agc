# OMP Experimental Context Management vs OpenCode DCP

> Sources: can1357/oh-my-pi source code at `/home/cpf/code-inside/oh-my-pi` (`61a692cf98`), 2026-09-11; OpenCode DCP official repository, 2026-09-11
> Raw: [experimental context management](../../raw/omp-config/2026-09-11-experimental-context-management.md); [OpenCode DCP 官方项目摘录](../../raw/omp-config/2026-09-11-opencode-dcp-project.md); [OpenCode DCP 本地配置摘录](../../raw/omp-config/2026-09-11-opencode-dcp-config.md)
> Updated: 2026-09-11

## 一句话结论

两者都在处理“context 太长怎么办”，但机制不同：

- **OMP 这套实验机制**：接近要换 context 时，先让主 LLM 维护短 notes，再 rollover 到新 context。
- **OpenCode DCP**：不改 session history，而是在 outbound request 前把可裁剪的旧内容替换/压缩成 summary 或 placeholder。

## 机制对比

| 问题 | OMP experimental context management | OpenCode DCP |
|---|---|---|
| 主要动作 | `context_notes` + `new_context` rollover | outbound message transform |
| 原 session history | 保留，提供 `history://current/full` 按需读取 | 不直接删除；裁剪的是这次发给模型的视图 |
| notes/摘要从哪来 | LLM 自己根据提醒调用 `context_notes` 写 notebook | DCP 对旧 tool output / messages 做 summary/placeholder |
| 新 context 自动拿到什么 | notebook、保留的 recent tail、最新 user request | 当前请求中被保留的 trimmed context |
| 何时可启用 | 开关为 true、实验 tool surface 可用、调用者是 owner | 插件在 OpenCode 运行链中实际加载 |
| 主要风险 | notes 没写好时，新 context 接不上工作状态 | 被压缩掉的内容仍有价值时，模型当前请求里看不到细节 |

## OMP 的实际流程

1. 接近 rollover 阈值时，OMP 最多每个 compaction/reset boundary 注入一次提醒。
2. 主 LLM 应调用 `context_notes` 记录任务状态、决定、改动文件、证据、阻塞点、下一步。
3. 然后 LLM 可调用 `new_context` 请求 fresh window。
4. 新 context 从 notebook + recent tail + 最新 user request 开始；若需要旧细节，再读 `history://current/full`。

`context_notes` 会写入当前 session branch 的 custom journal entry，并 flush 到 session JSONL 写入队列；这不是纯 RAM-only，但也不是 power-loss durable。

## OMP 的启用条件

不是 `experimentalContextManagement: true` 就必然出现这套工具。当前 fork 还要求：

- `context_notes` 可用且实例可取；
- `new_context` 可用且实例可取；
- `read` 可用且实例可取；
- `grep` 可用且实例可取；
- 调用者是该 session 的 owner；
- 改开关后要 restart，available tools 才会刷新。

## DCP 的实际机制

DCP 的公开定位是 OpenCode 的 dynamic context pruning plugin。它做的是 outbound transform：

- `turnProtection.turns` 保护 tool invocation 后最近若干 message turns 的 tool outputs；
- `protectUserMessages: true` 单独保护 user messages；
- `minContextLimit` 是提醒下限；`maxContextLimit` 是 soft upper limit / compression nudge 条件；
- `deduplication`、`purgeErrors` 是“发给模型的视图被裁剪”，不是删除用户历史本身。

本机已写入 DCP 配置：

- `turnProtection.enabled: true`
- `turns: 4`
- `protectUserMessages: true`
- `minContextLimit: 55%`
- `maxContextLimit: 65%`

这只证明配置已写入，不证明运行时已加载该插件。

## 选型判断

| 场景 | 更贴近的机制 |
|---|---|
| 你想让 agent 在跨 context 时保留工作状态，并可回查原始 history | OMP experimental context management |
| 你只想让长会话发给模型的上下文变轻，旧 tool output 不再占住当前请求 | OpenCode DCP |
| 你想在 OpenCode 侧减少旧内容干扰，但不删除历史本身 | OpenCode DCP |
| 你更关心 OMP 内部把“换新 context”做成显式工具链 | OMP experimental context management |

## 证据边界

OMP 部分来自本机 fork 源码与 prompt 文件；DCP 部分来自官方仓库 README 与本地配置摘录。本轮未运行 DCP 的实际 transform，也未交互实测 OMP rollover UI。

## See Also

- [OMP Config Semantics](config-semantics.md) — 24 项普通设置的触发、行为与取舍
- [OMP Runtime Controls](runtime-controls.md) — steering / follow-up / interrupt 与 parse regression tooling
