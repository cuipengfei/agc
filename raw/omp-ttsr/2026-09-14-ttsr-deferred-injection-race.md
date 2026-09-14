# OMP TTSR deferred 注入竞态：repeatGap 被绕过（#12057）与 once 被 compaction 架空（#10204）

> Source: 本机安装的 @oh-my-pi/pi-coding-agent@18.1.21 源码阅读 + 内存级复现脚本输出；GitHub issue can1357/oh-my-pi#12057 与 #10204
> Collected: 2026-09-14
> Published: 2026-09-14

本记录固化 2026-09-14 会话中验证的事实：TTSR 的 deferred（非打断）注入路径存在一个时间窗口，窗口内同一条规则可以在 repeatGap 未满足的情况下被第二次排队注入。所有机制断言均带本机 18.1.21 安装包的 `文件:行号`。

## 竞态机制（18.1.21 源码）

1. `src/export/ttsr.ts:88-100` `#canTrigger()` 只查 `#injectionRecords`：`record` 不存在 → true；`repeatMode === "once"` 且有 record → false；否则判定 `messageCount - record.lastInjectedAt >= repeatGap`。无任何 pending/in-flight 概念。
2. `src/session/ttsr-coordinator.ts:427-436` `#handleMatches()`：`shouldInterrupt === false` 时走 `#addPendingInjections()` 入队，不 abort。
3. assistant message 结束时 deferred 路径 `#getInjectionContent()` 取走并清空 `#pendingInjections` 并调用 `agent.followUp()`；此时不标记。
4. 标记发生在 `src/session/agent-session.ts:2856-2857`：custom `ttsr-injection` 消息持久化（`#persistMessageEnd`）时才调 `markInjectedFromDetails`。

窗口：pending 已清空、followUp 已入队、登记簿未更新三者同时为真期间，同规则再次命中会第二次入队。

## 复现（内存级，真实类 + mock host）

用安装包真实的 `TtsrManager` + `TtsrCoordinator` 类、mock host（记录 followUp 调用、不模拟持久化），配置 `interruptMode=never, repeatMode=after-gap, repeatGap=6`，规则匹配 text scope 的 `hello`。两轮「匹配 + assistantMessageEnd」的实际输出：

```
after round ts=111: followUps=1 persists=0 injected=[]
after round ts=222: followUps=2 persists=0 injected=[]
REPRO CONFIRMED: second injection queued while first still in flight
```

## 受影响面（18.1.21 实测/源码核验）

| interruptMode | 匹配对象 | 路径 | 间隔是否可靠 |
|---|---|---|---|
| `always`（默认） | 任意 | 同步 abort；postPrompt 任务中先 appendMessage + `#markInjected`（`ttsr-coordinator.ts:492`）再 `continue()` | 可靠 |
| `tool-only` | tool 调用 | 同步打断 | 可靠 |
| `tool-only` | text/thinking | deferred | 有窗口 |
| `never` | 任意 | deferred | 有窗口 |

`once` 模式在 deferred 通道下是否同样会双投递：**未实测的推断**（窗口内登记簿同样为空，理论上可重复排队，但本次实验只验证了 after-gap）。

## 计数单位

`repeatGap` 数的是已结束 turn 而非 assistant message：`ttsr.ts:581-583` `incrementMessageCount()` 注释「call after each turn」；`ttsr-coordinator.ts:89-91` 只有 `onTurnEnd()` 调用它；`ttsr.ts:98-99` 间隔判定用该计数。同一 turn 内重复命中永被拦（计数不变，gap 恒 0）。

## 上游 issue

- **#12057**（本次提交，2026-09-14）："TTSR deferred injection path lets the same rule re-queue before it is marked injected, bypassing repeatGap"。含机制走查、复现、修复方向（出队时建立 in-flight 占位，持久化后转正，followUp 丢失时回滚）。
- **#10204**（他人已报，OPEN，标 enhancement）：once 规则的注入提醒被 compaction 摘要出模型上下文后，运行时登记簿仍视规则为已用完，模型已看不见提醒、规则却永久不再触发。
- 共同根因归纳：「已提醒」登记记录与提醒内容是否真实存在于模型上下文，两者各自为政。

## 查重记录（2026-09-14，gh CLI）

`ttsr` 全量、`repeatGap`、`ttsr duplicate`、`ttsr deferred injection` 四组搜索；最接近的是 #7158（per-rule repeatGap 覆写，增强）与 #10204，无重复。仓库无 issue 模板；CONTRIBUTING.md 的约束是「正打算自己提 PR 的事不要开 issue」，本次仅报告问题，符合。
