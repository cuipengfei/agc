# OMP 运行时控制 源码取证

> 来源：can1357/oh-my-pi 源码 `/home/cpf/code-inside/oh-my-pi` (`61a692cf98`)，读取日期 2026-09-11
> 采集日期：2026-09-11

## `edit.recordParseRegressions` = `edit.blackbox.enabled`

- Schema 标签：`edit.blackbox.enabled`，默认 `false` — `settings-schema.ts:3737-3745`
- 注入时机：edit 已提交后；`EditFileOutcome.parseRegressed === true` 且完整前后文本可取 — `edit/index.ts:506-516`
- 输出到 `<agentDir>/edit-blackbox.jsonl`，记录含完整 `prev` 与 `new` 源码、模型、variant、原始 edit 参数 — `edit/blackbox.ts:7-17,22-35`
- 写入失败静默吞掉，不使 edit 失败 — `edit/blackbox.ts:33-42`

## `edit.autoRepairParseRegressions` = `edit.autoRepair.enabled`

- Schema 标签：`edit.autoRepair.enabled`，默认 `false` — `settings-schema.ts:3747-3756`
- 前置条件：edit 已提交；native edit 检测到 AST parse regression；文件在磁盘上仍 parse 失败；`smol` role 模型可用 — `edit/auto-repair.ts:278-311`
- 修复流程：定位坏区；用 BEFORE/AFTER prompt 请求 smol 修复；反馈重试一次；拒绝仅回退到 edit 前文本的候选；将候选 splice 回完整文件并重新 parse 全文件后才写回 — `edit/auto-repair.ts:223-265`
- 成功修复经 edit-tool LSP writethrough 写回，tool result 显示 `Note:` 与 repair diff；失败保留原坏 edit 并返回 warning — `edit/auto-repair.ts:337-348`、`edit/index.ts:521-542`
- 编排顺序：先 record，再 repair — `edit/index.ts:506-543`
- Secret-redaction 边界：repair prompt 直接构建并通过 `completeSimple` 发送，不经过 session obfuscation 边界 — `edit/auto-repair.ts:315-327`

## `steeringMode`

- Schema 枚举：`all | one-at-a-time`，默认 `one-at-a-time` — `settings-schema.ts:1989-1999`
- Agent 工作时按 Enter 进入 steering；Ctrl+Q/Ctrl+Enter 进入 follow-up — `modes/controllers/input-controller.ts:1530-1551`
- 从 `#steeringQueue` 逐条 dequeue；`all` 清空并注入全部队列内容 — `packages/agent/src/agent.ts:1055-1067`
- 在 pre-turn、tool-batch、turn-end boundary 消费，不保证中断当前 token 生成 — `packages/agent/src/agent-loop.ts:1071,1513,1542-1545`
- `interruptMode: immediate` 在工具执行期约每 250ms 检查 steering queue；`wait` 跳过 mid-batch 检查 — `packages/agent/src/agent-loop.ts:81,2459`

## `followUpMode`

- Schema 枚举：`all | one-at-a-time`，默认 `one-at-a-time` — `settings-schema.ts:2000-2008`
- Agent 工作时按 Ctrl+Q 或 Ctrl+Enter 进入 follow-up — `modes/controllers/input-controller.ts:1469-1555`
- 仅在当前 turn 自然结束后消费 — `session/agent-session.ts:6794-6813`
- `one-at-a-time` 取一条；`all` 清空队列 — `packages/agent/src/agent.ts:1069-1080`
- 默认绑定：Ctrl+Q 与 Ctrl+Enter — `config/keybindings.ts:137-143`

## Agent 已停止时的输入

- Enter 或 Ctrl+Q / Ctrl+Enter 直接走普通 turn 路径，不进入 steering/follow-up 队列 — `session/agent-session.ts:6169-6180`

## `interruptMode` 与队列的关系

- `interruptMode` 只影响 steering 的中断时机，不消费队列，不影响 follow-up — `packages/agent/src/agent-loop.ts:81,2459`
- Turn 末尾同时存在 late steering 与 follow-up 时，先处理 steering — `packages/agent/src/agent-loop.ts:1542-1545`
