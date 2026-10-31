# Inbox 桌面通知与铃声实现摘录

> Source: `backnotprop/plannotator` main：`packages/inbox/notify.ts`、`packages/inbox/notifyStatus.ts`、`packages/inbox/sound.ts`（每段标注文件路径与对应常量）
> Collected: 2026-10-31
> Published: Unknown

## notify.ts — 通知什么、如何合并

> Two things notify: a new thread an agent starts (always, the tab in front or not), and a new question in an agent's message (a `Stopped:` line, a `Holds up:` line or any other question), unless it is in the thread the person has open and visible. Plain news in an existing thread never notifies.

> Every Inbox notification shares one tag, so the browser shows one at a time.

> The page keeps the threads of the current burst: with one, the banner names the project, the agent and the subject, and a click opens that thread; with more, the burst becomes one notice, "3 waiting in 2 projects", and a click opens the list.

> Away, a burst lasts until the tab comes to the front; in front, notices within `FRONT_BURST_MS` of each other are one.

`FRONT_BURST_MS = 30_000`（30 秒）。

> Several Inbox tabs raise each item once: a tab in front raises it, else the first tab to claim it (`claimNotices`). A notice is silent only when the Inbox's bell owns its sound (a question, every tab away, the bell on).

> The settings live on the Inbox server (config.json), not in localStorage: the permission is per origin and the Inbox can move to another port, so "Not now" and "on" must not depend on the origin.

标题文案：

> `threadNotificationText`: "billing-svc: Claude Code stopped on you", "… is waiting on you" while it asks, "… started a thread" for a new thread that asks nothing; the subject is the body.

> `burstNotificationText`: "3 waiting in 2 projects", or "2 waiting in billing-svc"; "3 new in …" when a thread in it asks nothing.

权限与提示行（`askKind`）：

> - `moved`: the person allowed notifications at another address of this computer (the Inbox changed port, or was opened at 127.0.0.1) and this one has no permission. …
> - `ask`: the browser has not been asked here. Only once the Inbox holds a thread (`hasThreads`), never on an empty first run.
> - `blocked`: the browser blocked this address. …

标签页休眠：

> The browser put this tab to sleep while it was in the background, so it could not notify: `discarded` (Chrome's Memory Saver closed it and this is the reload) or `frozen` (Chrome froze it for a while).

`FROZEN_NOTICE_MS = 60_000`（冻结超过 60 秒才提示一次）。

测试通知：

> `sendTest` … `new Notification('Plannotator Inbox: test notification', …)`；`TestResult = 'sent' | 'not-allowed' | 'failed'`。

## notifyStatus.ts — 界面上的状态文字

状态种类与文案：

> `notifyStatusKind`: `'on' | 'off' | 'not-allowed' | 'blocked' | 'unsupported'`

> - `on`: `'On for this address'`
> - `off`: `'Off'`
> - `not-allowed`: `Not allowed in ${browser} for this address`
> - `blocked`: `Blocked in ${browser} for this address`
> - `unsupported`: `'This browser cannot show notifications'`

`reachText`（“Notifications reach you”）：

> - `'No: notifications are off.'`
> - `'Yes, through this tab, while it stays open.'`
> - `'No: this tab may not notify.'`
> - `'No: no Inbox tab is open.'`
> - `'No: none of the ${reach.windows} open Inbox tabs may notify.'`
> - `'No: no open Inbox tab may notify.'`

系统层拦截：

> `testMissHint`: mac 上 ``Didn't see it? Check System Settings → Notifications → ${app}, and Focus.``；其他系统检查系统通知设置与 Do Not Disturb。

模块注释列出的静默失败原因：

> - this address has no permission (`default`), maybe because the Inbox moved to another port or another spelling of this computer's name;
> - the browser blocked this address (`denied`);
> - the switch is off;
> - no Inbox tab is open, or none the browser lets notify (the server's `notify_reach`: notifications come only from an open tab);
> - the browser says yes but the system does not show them (macOS Notifications for the browser off, Focus): only a test shows that.

## sound.ts — 铃声

> The Inbox's question sound: a soft two-tone doorbell ("Ding-dong", chosen by the owner from twelve), generated live with Web Audio, so there are no audio files.

> When it rings: a new question in an agent's message (the same items notify.ts notifies about; plain messages never ring), only while no Inbox tab is in front, and once per burst: the first question rings, more within 30 s of the last one stay silent, and the burst ends when a tab comes to the front. It does not depend on notifications.

`RING_BURST_MS = 30_000`（30 秒）。

> Chrome lets a page play sound only after a click or key press in that tab, so the AudioContext is made and resumed on the first gesture ("armed"); before that a ring would be lost without an error, and the Settings line and the sidebar hint say so.

多标签页：

> Several Inbox tabs ring once: they share a BroadcastChannel (who is in front, who rang) and a tab rings only while it holds a short lock (a Web Lock, or localStorage without one).

`RING_LOCK_MS = 3000`；`FRONT_FRESH_MS = 15_000`；`FRONT_REPEAT_MS = 5_000`；`DING_DONG_MS = 1100`。

“在前台”的判定：

> `pageInFront()`: `document.visibilityState === 'visible' && document.hasFocus()`

`decideRing` 的结果：

> - Sound off: nothing, and the burst is left as it was.
> - An Inbox tab in front (this one or another): nothing; the person sees the list, so the burst ends.
> - Within 30 s of the last question of a burst: nothing; the burst goes on from this question.
> - Otherwise: ring, and a burst starts.
