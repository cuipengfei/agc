# OMP advisor concern 投递策略证据摘录（deferredNotes / terminal-only flush / upstream 请求）

> Source: 本机 @oh-my-pi/pi-coding-agent 18.2.6 安装包源码逐字摘录（~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/）+ 本地 oh-my-pi git clone（/home/cpf/code-inside/oh-my-pi）提交/标签记录 + can1357/oh-my-pi GitHub issue/comment 元数据（gh 在线读取），2026-09-19 会话
> Collected: 2026-09-19
> Published: Unknown

## 摘录 1：18.2.6 admission 层延迟（advisor/advise-tool.ts:266-302 逐字选）

安装包版本 18.2.6。

```ts
if (this.#inProgressUpdate && args.severity !== "blocker") {
    // Withheld, not delivered: reserve for the deterministic flush at the
    // completed-update transition / terminal boundary.
    ...
    this.#deferredNotes.push({ key, note: args.note, severity: args.severity });
    return this.#result(ADVISOR_ACK_DEFERRED, args);
}
// Live path (completed update, or a blocker that must interrupt now). A
// blocker re-raise of a still-queued note pulls the reservation first:
...
this.onAdvice(args.note, args.severity);
return this.#result(ADVISOR_ACK_SENT, args);
```

即：in-progress 时非 blocker（nit/concern）进入 `#deferredNotes`，返回 deferred ack，不调用 onAdvice；blocker 走 live path 立即 `onAdvice`。

## 摘录 2：18.2.6 flush 路径（advisor/advise-tool.ts:229-246、305-316 逐字选）

```ts
beginUpdate(inProgress: boolean): void {
    const wasInProgress = this.#inProgressUpdate;
    this.#inProgressUpdate = inProgress;
    this.#guard.beginUpdate();
    if (wasInProgress && !inProgress) this.#flushDeferred();
}
...
flushDeferredNotes(): void {
    this.#inProgressUpdate = false;
    this.#flushDeferred();
}
```

即：flush 只有两条触发路径——`beginUpdate(false)` 的 completed-update 转换，以及 terminal boundary 的 `flushDeferredNotes()`。

## 摘录 3：18.2.6 terminal-only flush 调用点（session/session-advisors.ts:494-499 逐字）

```ts
// Only the terminal primary boundary owns the deferred flush. Continuing
// tool turns must keep partial-work critiques withheld. The flush never
// resets the per-update budget — no new advisor update starts here.
if (willContinue !== true) advisor.adviseTool.flushDeferredNotes();
```

调用点上方原注释的连续两句逐字为："Only the terminal primary boundary owns the deferred flush. Continuing tool turns must keep partial-work critiques withheld."

## 摘录 4：18.2.6 消费层投递（session/session-advisors.ts:1363-1385 逐字选）

```ts
/** Route an already-accepted advice note to the primary. Never re-runs
 *  admission — the note cleared the emission guard inside AdviseTool when it
 *  was emitted, so a deferred flush replays the backlog without
 *  re-filtering. */
#routeAdvice(advisor: ActiveAdvisor, note: string, severity?: AdvisorSeverity): void {
    ...
    const channel = resolveAdvisorDeliveryChannel({ severity, ... });
```

即：消费层（routeAdvice/resolveAdvisorDeliveryChannel）只处理"已经 admitted"的 note；延迟发生在更上游的 admission。

## 摘录 5：18.2.6 interruptMode schema（config/settings-schema.ts:1898-1907 逐字）

```ts
interruptMode: {
    type: "enum",
    values: ["immediate", "wait"] as const,
    default: "immediate",
    ui: {
        tab: "interaction",
        group: "Input",
        label: "Interrupt Mode",
        description: "When steering messages interrupt tool execution",
    },
},
```

即：interruptMode 描述的是"已有 steering 消息何时打断工具执行"，属消费层；上游 admission 已把 mid-turn concern 挡在 steering 之外。

## 摘录 6：git 历史（本地 clone 逐条核验，committer date 以 YYYY-MM-DD 标注）

```
26e422a00a 2026-07-30  fix(coding-agent): suppress WIP advisor non-blockers
```

该 commit 在 AdviseTool 增加 `#inProgressUpdate` 守卫：in-progress 非 blocker 返回 `"Recorded."` 但不调用 onAdvice —— intentional withholding，silent drop 是 bug。committer date 2026-07-30；首个包含它的 tag：v17.2.4。

```
5442a099ed 2026-08-19  fix(advisor): defer in-progress non-blocker advice instead of dropping it
```

提交说明（节选）："When the primary agent is mid-turn, AdviseTool withheld non-blocker advice to avoid derailing partial work — but returned "Recorded." without ever calling onAdvice. ... Replace the drop-and-hope path with a deterministic deferred queue"。committer date 2026-08-19；首个包含它的 tag：v17.4.1。

```
147f2b475c 2026-09-08  fix(advisor): preserved and reported deferred advice
```

提交说明（节选）："Flushed accepted deferred notes at primary turn completion even when the advisor is quota-paused. Fixes #11062"。committer date 2026-09-08。

```
fc91e5d592 2026-09-08  fix(advisor): kept advice deferred across tool turns
```

提交说明（节选）："Flushed deferred notes only after a terminal primary boundary."

147f2b475c 与 fc91e5d592 的 committer date 均为 2026-09-08；首个包含它们的 tag：v18.1.15。

v17.2.3 的 advise-tool.ts execute() 无延迟路径：dedupe 后直接 `this.onAdvice(...)` 并返回 `"Recorded."`，即 v16.0.0–v17.2.3 期间 concern 可 mid-turn 直达 onAdvice。

轻量标签对应日期（YYYY-MM-DD 为 lightweight tag 指向 commit 的 committer time 的日期部分，均非 GitHub release published_at）：

- v16.0.0 = 2026-06-15（committer time 17:27:48+02:00）
- v17.2.3 = 2026-08-01（committer time 08:35:39+02:00）
- v17.2.4 = 2026-08-02（committer time 00:39:53+02:00）
- v17.4.1 = 2026-08-21（committer time 16:26:45+02:00）
- v18.1.15 = 2026-09-08（committer time 20:42:08+02:00）
- v18.2.6 = 2026-09-18（committer time 19:27:51+02:00）

## 摘录 7：upstream feature request 元数据（gh 读取，2026-09-19）

- #9074 [OPEN] 2026-08-20 @daandden: feat(advisor): add configurable steering severity threshold —— opt-in spec。
- #9576 [OPEN] 2026-08-24 @daandden: feat(advisor): add configurable steering severity threshold —— 实现方向。
- #10600 [OPEN] 2026-09-02 @skeet70: advisor: concerns deferred until turn completion arrive stale in autonomous sessions and push the advisor toward blockers —— default/evidence thread。
- #10738 [OPEN] 2026-09-03 @rthiago: feat(advisor): deliver concerns at the next model step —— default 变更变体。
- 已发布支持评论： https://github.com/can1357/oh-my-pi/issues/9074#issuecomment-5739930827 （2026-09-19，@cuipengfei），要点："#9576 implements it; #10738 is the default-changing aside variant"；"The defer-to-terminal behavior is intentional design — #8960 deliberately retained it, and #11066 later narrowed the flush to the terminal boundary — so this is a delivery-policy request, not a bug"；"#10600's 44-session measurements (61 deferred concerns, median 236 s, 26 never delivered; 38 tool-call aborts, all blockers, several escalated from swallowed concerns)"；"A threshold defaulting to `blocker` keeps today's behavior"；"interruptMode: immediate cannot substitute for this knob. It governs how the agent loop consumes steering messages that already exist; the in-progress defer gate runs upstream at admission (AdviseTool.execute), so a mid-turn concern never becomes a steering message in either mode. Setting advisor.immuneTurns: 0 doesn't help either."
