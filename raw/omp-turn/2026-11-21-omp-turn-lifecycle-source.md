# OMP turn 与 run 生命周期源码摘录

> Source: 本机 OMP 19.0.1 源码 /home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-agent-core/src/agent-loop.ts、agent.ts、types.ts；/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/session/agent-session.ts、loop-end-wire.ts
> Collected: 2026-11-21
> Published: Unknown

## agent-loop.ts 中的外层循环结构

```text
async function runLoopBody(...)
  let pendingMessages: AgentMessage[] = [];
  let liveAccepted: AgentMessage[] = [];
  let liveDeferred: AgentMessage[] = [];
  ...
  while (true) {
    let hasMoreToolCalls = true;
    while (hasMoreToolCalls || pendingMessages.length > 0) {
      // 构建 turnMessages，把 pendingMessages 追加到 currentContext.messages
      // 发起 HTTP 请求 streamAssistantResponse
      // 提取 toolCalls，判断 runnableStop
      // 执行 executeToolCalls
      // 发出 emitTurnEnd(stream, currentContext, message, toolResults, config, signal, {willContinue})
      // 更新 hasMoreToolCalls
      // 检查 steering / aside / followUp 队列
    }
    // 内层循环退出，agent 准备停止
    await config.onBeforeYield?.();
    const lateSteering = ...(await config.getSteeringMessages?.(signal)) || [];
    const asideMessages = resolveAsides(await config.getAsideMessages?.("stop"));
    const followUpMessages = ...(await config.getFollowUpMessages?.(signal)) || [];
    if (lateSteering.length > 0 || asideMessages.length > 0 || followUpMessages.length > 0) {
      pendingMessages = [...lateSteering, ...asideMessages, ...followUpMessages];
      continue; // 回到外层 while，开启新一个 turn
    }
    break; // 没有消息，run 结束
  }
  endAgentStream(stream, newMessages, telemetry, stepCounter.count);
```

## turn 定义

pi-agent-core/src/types.ts:1327-1346：

```text
| { type: "turn_start" }
| { type: "turn_end"; message: AgentMessage; toolResults: ToolResultMessage[] }
```

注释（types.ts:1325）：

```text
Events emitted by the Agent for UI updates.
These events provide fine-grained lifecycle information for messages, turns, and tool executions.
```

## stopReason 与工具执行

agent-loop.ts:1677-1701 注释（原文）：

```text
// Run tools whenever the turn carries tool_use blocks AND was not truncated.
// `stop_reason` is provider metadata that never goes back on the wire, so it
// does not gate continuation validity: replaying a tool_use turn with the
// tool_results appended is accepted whether the turn ended on `tool_use` or
// `end_turn` (adaptive/interleaved-thinking Opus routinely emits tool calls
// under `end_turn`; verified against the live Anthropic API). The only
// continuation hazard is a thinking block carrying a stale/invalid signature,
// which `transformMessages` already neutralizes — it strips the signature on
// non-`toolUse` turns and the encoder downgrades the unsigned block to text,
// which the API accepts. So treat `stop` (end_turn/pause_turn) the same as
// `toolUse`. `length` (max_tokens) is the one reason we must NOT run: the
// trailing tool_use may be truncated with incomplete arguments — those calls
// are abandoned below.
```

对应代码（agent-loop.ts:1700-1701）：

```text
const runnableStop = message.stopReason === "toolUse" || message.stopReason === "stop";
hasMoreToolCalls = runnableStop && toolCalls.length > 0;
```

## 工具批次执行中的协作式中断

agent-loop.ts:3375-3392：

```text
// `interruptMode: "wait"` only spares side-effecting work: interruptible
// waits are always cut short, since a pure wait has nothing to finish and
// would otherwise sit out its full window with a message already queued.
const softInterrupts = interruptMode !== "wait";
const steeringAbortController = new AbortController();
// Cooperative channel: aborted when queued steering (or an interrupting
// peer IRC) is detected mid-batch. Tools receive it via tool context
// (`ctx.steeringSignal`) and MAY react — e.g. an auto-backgroundable bash
// backgrounds itself so the message injects promptly — but it never kills
// anything; ignoring it is always safe.
const steeringSoftController = new AbortController();
```

agent-loop.ts:3597-3616：

```text
// A pending interrupt preempts not-yet-started interruptible tools,
// except receivers that drain the wake with an already-aborted signal.
// Non-interruptible work is never skipped, whatever the source: the
// expensive part — generating the call — is already paid, the tool
// itself is cheap, and a skip only makes the model re-emit the same
// call after the steer lands (#10439). The same guarantee is what keeps
// a batched `todo`/`write` queued behind an aborted wait alive (#7493)
// and lets a subagent's already-emitted terminal `yield` commit when
// the parent steers mid-stream (#10645). The steer still injects at the
// batch boundary; the cooperative soft signal lets long-running tools
// step aside on their own.
if (interruptState.triggered && record.interruptible && !record.handlesToolInterrupt) {
  record.skipped = true;
  return;
}
```

## 中途消息队列的取出时机

agent-loop.ts:1880-1893：

```text
} else {
  const steering = signal?.aborted
    ? []
    : [...live, ...((await config.getSteeringMessages?.(signal)) || [])];
  if (hasMoreToolCalls) {
    // Mid-work: fold any non-interrupting asides into the next turn alongside steering.
    const asides = signal?.aborted ? [] : resolveAsides(await config.getAsideMessages?.("work"));
    pendingMessages = asides.length > 0 ? [...steering, ...asides] : steering;
  } else {
    // Stop boundary: only steering (live user input) forces another turn here. Leave
    // asides for the outer drain below so a passive aside can't trigger an extra model
    // turn ahead of a queued follow-up — the outer drain batches asides + follow-ups together.
    pendingMessages = steering;
  }
}
```

agent-loop.ts:1901-1919：

```text
// Agent would stop here. Drain non-interrupting asides + follow-up messages.
await config.onBeforeYield?.();
...
const lateSteering = signal?.aborted ? [] : (await config.getSteeringMessages?.(signal)) || [];
const asideMessages = signal?.aborted ? [] : resolveAsides(await config.getAsideMessages?.("stop"));
const followUpMessages = signal?.aborted ? [] : (await config.getFollowUpMessages?.(signal)) || [];
if (lateSteering.length > 0 || asideMessages.length > 0 || followUpMessages.length > 0) {
  pendingMessages = [...lateSteering, ...asideMessages, ...followUpMessages];
  continue;
}
// No more messages, exit
break;
```

## AgentSession 对 run 生命周期的管理

pi-coding-agent/src/session/agent-session.ts:6175-6317（#endLoop / #checkRun 区域）：
当模型循环停止时，检查唤醒源（wakeSources）：后台作业、排队待投递的异步结果或子代理消息、仍在运行的子代理、子代理通信锁。只要存在唤醒源，发出 `agent_pause`，不结束 run；唤醒源清空后才发出 `agent_end`。

pi-coding-agent/src/session/loop-end-wire.ts:1-53：
作者注释说明保留 `agent_end` 但标记 `isTerminal: false` 的兼容原因：RPC、JSON print、collab 和 extension 在生命周期拆分之前已经习惯了每次模型循环停下都收到 `agent_end`，为兼容既有 wire/extension 契约，对这些外部接口发送 `agent_end` 消息但标记 `isTerminal: false` 代表"中途暂停"；run 真正结束才发送 `isTerminal: true`。

## 上游提交记录

commit 0730879325b611f75a3d1494b0d35c5b260f683b（2026-11-16）：
`fix(coding-agent): kept runs open until nothing can resume them`

```text
- AgentSession alone decides when a run ends: agent_end fires once per run, after no loop,
  scheduled continuation or wake source (owned jobs, queued results/peer messages,
  live child agents) remains; mid-run loop stops emit agent_pause.
- Re-checked the run whenever a wake source changes (job settles, delivery resolves,
  child status/blocks change, IRC holds release), so a source that vanishes without
  waking ends the run.
- Replaced hasPendingAsyncWork/settleAsyncWork/suppressAutoResumeUntilPrompt with
  isRunActive, wakeSources and waitForRunEnd; removed the per-consumer settle watches
  (TUI, RPC, print, executor, /compact, /tan, security scan, idle maintenance).
- Program status, title and registry status stay running through pauses; Esc while
  waiting ends the run via a user-interrupt abort.
- Kept the RPC/JSON print/collab wires and extension agent_end on their per-loop flagged
  shape through a shared loop-end-wire codec.
```

commit 796f963da9123e9923e672bcfc25f76d7163ff44（2026-05-22）：
`feat(coding-agent): added coding-agent follow-up queue with onBeforeYield`

```text
- Added optional `onBeforeYield` configuration and `setOnBeforeYield` in Agent,
  executed before follow-up checks.
- Added `YieldQueue` to `AgentSession`, with setup/teardown and streaming/idle flush
  via `setOnBeforeYield`.
- Replaced immediate async-result follow-up dispatch with queued batch entries,
  including stale-state suppression.
- Added MCP follow-up queueing in SDK, deduplicating updates by `serverName` and `uri`.
```

## 非 Goal 长任务的步数控制

agent-loop.ts:1392-1701：
外层 `while (true)` 循环不预设最大步数。`hasMoreToolCalls` 由模型响应中是否包含 `toolCall` 决定。只要模型继续输出 `toolCall`，内层循环继续，开启下一个 turn。

agent-loop.ts:1901-1919：
`onBeforeYield` 在模型停止后、followUp 检查之前运行。如果 OMP 需要注入续行指令（例如 JEV decision API 判定模型提前停止），通过 `config.onBeforeYield` 或 `followUp` 队列实现。
