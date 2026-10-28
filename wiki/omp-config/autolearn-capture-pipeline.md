# Auto-Learn capture 管线与可观测产物

> Sources: oh-my-pi 官方源码 `5d72f5d3f4`，2026-10-28；本机 omp 18.13.1 运行观测，UTC 2026-10-27
> Raw: [Auto-Learn capture 管线源码取证](../../raw/omp-config/2026-10-28-autolearn-capture-pipeline-forensics.md); [Managed Skills 创建门槛与 Auto-Learn 字符串出处取证](../../raw/omp-config/2026-09-30-managed-skills-createif-and-autolearn-prompt.md)
> Updated: 2026-10-28

## Overview

`autolearn.autoContinue` 打开后，回合结束时会启动一次私有 capture：复制父 agent 的消息快照，用 `manage_skill` 与 `learn` 两个工具独立跑一轮，然后自行结束。它不写会话 transcript，独立 sessionId 用完即弃，也不出现在父会话的模型用量里。判断它是否运行、做了什么，只能看它留下的产物。

## 触发判定

`autolearn/controller.ts` 的 `#onAgentEnd`，按顺序检查，任一项命中就不运行：

| 顺序 | 条件 |
|---|---|
| 1 | 回合以 `stopReason: "aborted"` 结束 |
| 2 | `autolearn.enabled` 为 `false` |
| 3 | 本回合工具调用数 < `autolearn.minToolCalls` |
| 4 | plan 模式启用 |
| 5 | 回合开始或结束时处于 goal 模式 |
| 6 | `autolearn.autoContinue` 不为 `true` |

工具调用数按回合统计，回合结束即比较，不跨回合累加。上一次 capture 尚未结束时新触发会被标为 pending，结束后补跑一次，不并发。

## 分离 agent 与不可见性

| 项 | 实现 |
|---|---|
| 构造 | `createAutoLearnCaptureRunner` 直接 `new Agent({...})`，无 `SessionManager` |
| 身份 | `sessionId` 与 `promptCacheKey` 取 `createSessionId?.() ?? Bun.randomUUIDv7()`；接线处没有提供 `createSessionId` |
| 消息 | 复制父 agent 的 system prompt、model、thinkingLevel 与整段 message 快照 |
| 工具 | `manage_skill` 与 `learn`，两者可用时才进入工具集 |
| 提示 | `customType: "autolearn-nudge"`、`display: false`、`attribution: "agent"` 的私有消息 |
| 落盘 | `packages/agent/src/agent.ts` 无 `Bun.write` / `writeFile` / `appendFile` |

对比 subagent：`task/executor.ts` 经 `SessionManager.open` / `inMemory` 再 `createAgentSession`，会话目录下会出现 `<agent>.jsonl`。capture 没有对应文件。

## 提示词原文

`packages/coding-agent/src/prompts/system/autolearn-nudge-autocontinue.md`：

```
Automated capture turn — not a user reply; user has not responded to your previous turn. Do not treat this prompt as their answer, approval to continue, or acceptance of any pending action; only the user can do so.

If your previous turn produced reusable output, capture it now only if it will genuinely help next time: repeatable procedure → managed skill (`manage_skill`); durable fact, convention, or user preference → remember with `learn` when memory enabled. If nothing worth keeping, do nothing.
```

这段文字只发给 capture agent，不进入父会话。

## 三类可能产物

| 产物 | 在哪里看 |
|---|---|
| 记忆行 | Mnemopi 的 `working_memory` 表，`source = 'coding-agent-learn'`，`metadata.session_id` 指向父会话 |
| managed skill | `~/.omp/agent/managed-skills/<name>/SKILL.md` 的文件修改时间 |
| 无产物 | 提示词明文允许：判定没有值得保留的内容时直接结束 |

`learn` 的 `skill` 参数是可选的；只有传入时才会调用 `writeManagedSkill`。记忆记录只保存 `tool: "learn"` 等元数据，不保存调用参数，因此无法从记录反推是否传了 `skill`。

## 查询方法

```sql
SELECT id, source, timestamp, metadata_json, content
FROM working_memory
WHERE source = 'coding-agent-learn'
  AND metadata_json LIKE '%<parent-session-id>%';
```

数据库路径：`~/.omp/agent/memories/mnemopi/banks/<project-bank>/mnemopi.db`。

## 本次运行的观测

| UTC 时间 | 事件 |
|---|---|
| 2026-10-27 16:13:29 | 六次 `bash` 调用的回合以 `stop` 结束 |
| 2026-10-27 16:13:39 | 新增 `coding-agent-learn` 记录 `e928a543333bdc2f` |

正向证据只有这一条记忆：写入时间紧接回合结束，父会话 transcript 内 `learn` 与 `manage_skill` 调用各 0 次，`managed-skills/` 最新修改时间停在 2026-10-10。

## 核验清单

1. 先确认本轮工具调用数达到 `autolearn.minToolCalls`，且不落在 plan 或 goal 模式。
2. 查记忆行：按父会话 id 过滤 `coding-agent-learn`。
3. 查 managed skills 的文件修改时间。
4. 两处都无变化时，结论是“未观测到产物”，属于三种可能中的第三种；要区分“运行了但没存”与“根本没运行”，需要请求侧记录或临时降低门槛并加观测。

不能用的判据：父会话是否收到提示、会话 transcript 里是否有 nudge 消息。这两者在当前实现里都不会出现。

## 产物质量

自动写入的记忆未经过滤。本次记录把“配置变更必须新进程才生效”写成既定事实（本会话没有热重载路径的取证），并把 capture 描述成带 “not a user reply” 头的可见回合（该字符串只存在于 capture agent 的私有消息里）。按回合统计工具调用这一项与 controller 一致。

使用 `coding-agent-learn` 记录作为知识来源前，需要按源码或实测复核其中的机制性结论。

## See Also

- [OMP 配置语义手册](config-semantics.md) — `autolearn.autoContinue` 的跳过条件与并行度闸门。
- [OMP Managed Skills 生命周期](managed-skills.md) — managed skill 的创建通道、门槛与无自动清理。
- [workflowz 运行机制与生命周期](../omp-modes/workflowz-runtime-and-lifecycle.md) — 另一条后台执行路径的产物与投递语义。
