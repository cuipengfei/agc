# OMP 中途消息投递模式源码摘录

> Source: 本机 OMP 19.0.1 源码 /home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-agent-core/src/agent.ts、agent-loop.ts、types.ts；/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/session/agent-session.ts、messages.ts、prompts/steering/user-interjection.md
> Collected: 2026-11-21
> Published: Unknown

## 三种底层队列

pi-agent-core/src/agent.ts:435-436：

```text
#steeringQueue: AgentMessage[] = [];
#followUpQueue: AgentMessage[] = [];
```

aside 队列在 coding-agent 侧由 #irc.queueAside 管理（agent-session.ts:10762）。

## steering 消息的包装

pi-coding-agent/src/prompts/steering/user-interjection.md:1-4：

```text
<system-notice>
User interjection during work: priority; supersedes conflicting prior instructions. Re-read; ensure current work reflects user intent.
</system-notice>
{{message}}
```

pi-coding-agent/src/session/messages.ts:771-773：

```text
function renderSteeringEnvelope(message: string): string {
  return prompt.render(userInterjectionTemplate, { message });
}
```

## steer 与 followUp 的入队逻辑

pi-coding-agent/src/session/agent-session.ts:10805-10814：

```text
const userMessage: AgentMessage =
  mode === "followUp"
    ? { role: "user", content, attribution, timestamp }
    : { role: "user", content, steering: true, attribution, timestamp };
```

steering 消息带 `steering: true` 标记；followUp 消息不带。

agent-session.ts:10410-10429（steer 方法）：

```text
/**
 * Queue a steering message to interrupt the agent mid-run.
 */
async steer(text: string, images?: ImageContent[], options?: SteerOptions): Promise<void> {
```

agent-session.ts:10483-10502（followUp 方法）：

```text
/**
 * Queue a follow-up message to process after the agent would otherwise stop.
 */
async followUp(text: string, images?: ImageContent[], options?: FollowUpOptions): Promise<void> {
```

## aside 的调用方

pi-coding-agent/src/session/agent-session.ts:10755-10768：

```text
if (mode === "aside") {
  ...
  this.#irc.queueAside(records);
  options?.onPromptAdmitted?.();
  this.#resumeStrandedIrcAsides();
  return true;
}
```

pi-coding-agent/src/advisor/advise-tool.ts:76：

```text
export type AdvisorDeliveryChannel = "aside" | "steer" | "preserve";
```

advise-tool.ts:133-135：

```text
} else if (!isInterruptingSeverity(opts.severity)) return "aside";
if (opts.autoResumeSuppressed && (opts.aborting || !opts.streaming)) return "preserve";
if (opts.interruptImmuneTurnActive && opts.severity !== "blocker") return terminalIdle ? "preserve" : "aside";
return "steer";
```

pi-coding-agent/src/extensibility/extensions/types.ts:2164-2176：

```text
`deliverAs: "aside"` injects the message at the next agent step boundary without interrupting
the in-flight tool batch; when the session is idle it starts a turn regardless of `triggerTurn`
(plan mode folds it into context instead).
```

## steering 与 followUp 在 agent-loop 中的取出时机

pi-agent-core/src/agent-loop.ts:1880-1893：

```text
if (hasMoreToolCalls) {
  // Mid-work: fold any non-interrupting asides into the next turn alongside steering.
  const asides = signal?.aborted ? [] : resolveAsides(await config.getAsideMessages?.("work"));
  pendingMessages = asides.length > 0 ? [...steering, ...asides] : steering;
} else {
  // Stop boundary: only steering (live user input) forces another turn here.
  pendingMessages = steering;
}
```

pi-agent-core/src/agent-loop.ts:1901-1919：

```text
await config.onBeforeYield?.();
const lateSteering = ...(await config.getSteeringMessages?.(signal)) || [];
const asideMessages = ...(await config.getAsideMessages?.("stop"));
const followUpMessages = ...(await config.getFollowUpMessages?.(signal)) || [];
if (lateSteering.length > 0 || asideMessages.length > 0 || followUpMessages.length > 0) {
  pendingMessages = [...lateSteering, ...asideMessages, ...followUpMessages];
  continue;
}
```

## joinActiveTurn 的 admission 边界

pi-coding-agent/src/session/agent-session.ts:10556-10621：

```text
async joinActiveTurn(
  text: string,
  images?: ImageContent[],
  options?: { queue?: "steering" | "followUp" },
): Promise<boolean> {
  if (this.#abortInProgress) return false;
  if (this.#clientPromptInFlightCount === 0) return false;
  ...
  if (!this.agent.state.isStreaming) {
    for (;;) {
      await this.#waitForPromptDispatchLive();
      if (this.#abortInProgress || this.#clientPromptInFlightCount === 0) return false;
      if (this.agent.state.isStreaming) break;
    }
  }
  const mode = options?.queue === "followUp" ? "followUp" : "steer";
  ...
  return await this.#queueUserMessage(queued.text, images, mode, {
    requireActiveRun: true,
    skipIdleDrain: true,
  });
}
```

## 用户键盘入口

pi-coding-agent/src/modes/controllers/input-controller.ts:1431：

```text
() => this.ctx.session.prompt(text, { streamingBehavior: "steer", images }),
```

input-controller.ts:781-783：

```text
for (const key of this.ctx.keybindings.getKeys("app.message.followUp")) {
  this.ctx.editor.setCustomKeyHandler(key, () => void this.handleFollowUp());
}
```

input-controller.ts:2304：

```text
const pending = this.ctx.session.prompt(text, { streamingBehavior: "followUp", images });
```

## steeringMode / followUpMode 配置

pi-agent-core/src/agent.ts:138-140：

```text
/**
 * Steering mode: "all" = send all steering messages at once, "one-at-a-time" = one per turn
 */
steeringMode?: "all" | "one-at-a-time";
```

agent.ts:460-461：

```text
#steeringMode: "all" | "one-at-a-time";
#followUpMode: "all" | "one-at-a-time";
```

## interruptible 工具的协作让位

pi-agent-core/src/types.ts:1217-1228：

```text
/**
 * Whether the agent loop may abort this tool mid-execution — or skip it
 * before it starts — to deliver a queued steering message.
 *
 * Enable only for calls that purely *wait* and observe their abort signal
 * cleanly (e.g. `job` poll), so the abort surfaces the tool's current
 * snapshot rather than corrupting a side effect. Every other call runs to
 * completion even when steering is queued; the message lands at the next
 * batch boundary.
 */
interruptible?: boolean | ((args: Partial<Static<TParameters>>) => boolean);
```

pi-agent-core/src/agent-loop.ts:3375-3392：
steering 到达时，`interruptible` 工具被协作式中断（`steeringSignal`），普通 side-effecting 工具继续执行完毕，消息在批次边界注入。

## agent-loop.ts:3597-3616 跳过条件

```text
// Non-interruptible work is never skipped, whatever the source.
if (interruptState.triggered && record.interruptible && !record.handlesToolInterrupt) {
  record.skipped = true;
  return;
}
```
