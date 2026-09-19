# OMP Advisor Concern 投递策略

> Sources: 本机 OMP 18.2.6 安装包源码直读, 2026-09-19; oh-my-pi git 历史（本地 clone）, 2026-09-19; can1357/oh-my-pi upstream issues, 2026-09-19
> Raw: [OMP advisor concern 投递策略证据摘录](../../raw/omp-config/2026-09-19-omp-advisor-concern-delivery-policy.md)
> Updated: 2026-09-19

## Overview

当前 OMP（18.2.6）中，advisor 在主 agent mid-turn 时提出的非 blocker concern 不会立即打断：admission 层把它暂存进 `deferredNotes`，直到 terminal primary boundary 才统一 flush；blocker 例外，立即 steering。这是有意设计，不是 bug；用户侧没有配置能把 concern 恢复为 mid-turn 投递——`interruptMode` 属消费层，管不到上游 admission 闸门。upstream 已有 opt-in 变更请求（#9074/#9576，默认仍保持 blocker-only 行为）。

## 现状（18.2.6，源码直读）

- **延迟进 deferredNotes，不进 steering**：`AdviseTool.execute` 在 `#inProgressUpdate && severity !== "blocker"` 时把 note 推入 `#deferredNotes`，返回 deferred ack，不调用 `onAdvice`；只有 completed update 或 blocker 才走 live path 立即 `onAdvice`。
- **terminal-only flush**：flush 只有两条触发路径——`beginUpdate(false)` 的 completed-update 转换，以及 terminal boundary 的 `flushDeferredNotes()`；后者由 session 层在 `willContinue !== true` 时调用，"Only the terminal primary boundary owns the deferred flush. Continuing tool turns must keep partial-work critiques withheld."
- **blocker bypass**：blocker 不受延迟约束，mid-turn 也立即以 blocker 严重度 interrupt（含从 deferred 队列提级的 re-raise）。
- **`interruptMode` 不能绕过**：`interruptMode`（immediate/wait）描述的是"已有 steering 消息何时打断工具执行"，是消费层语义；延迟闸门在更上游的 admission（`AdviseTool.execute`）执行，mid-turn concern 在任何 interruptMode 下都不会先变成 steering 消息。

## 历史沿革（git 提交历史，日期为 committer time）

| 阶段 | 行为 | 关键 commit（首个包含 tag，committer time） |
|------|------|--------------------------------------------|
| v16.0.0（2026-06-15）– v17.2.3（2026-08-01） | dedupe 后直接 `onAdvice`，concern 可 mid-turn 直达 steering | — |
| v17.2.4（2026-08-02）起 | 26e422a intentional withholding：in-progress 非 blocker 返回 "Recorded." 但不投递——silent drop 是 bug | 26e422a（2026-07-30） |
| v17.4.1（2026-08-21）起 | 5442a09 用确定性 deferredNotes 队列替换 drop-and-hope，ack 改为如实 "Deferred" | 5442a09（2026-08-19） |
| v18.1.15（2026-09-08）起 | 147f2b/fc91e5d 修 deferred 生命周期：quota-paused 也在 turn 完成时 flush（#11062），并有意收窄为仅 terminal boundary flush | 147f2b、fc91e5d（均 2026-09-08） |

注：上表 tag 日期均为 lightweight tag 指向 commit 的 committer time，非 GitHub release published_at。

## Upstream 变更请求

- **#9074**（open，2026-08-20，@daandden）：可配置 steering severity threshold 的 opt-in spec。
- **#9576**（open，2026-08-24，@daandden）：同一方向的实现 PR。
- **#10600**（open，2026-09-02，@skeet70）：default/evidence thread——concern 延迟到 turn 完成在 autonomous session 中过时并倒逼 advisor 升级 blocker；44 session 测量：61 条 deferred concern、中位 236 s、26 条从未送达；38 次 tool-call abort 全是 blocker，若干由被吞 concern 升级而来。
- **#10738**（open，2026-09-03，@rthiago）：next model step 投递的 default 变更变体。
- 已发布支持评论（https://github.com/can1357/oh-my-pi/issues/9074#issuecomment-5739930827）：defer-to-terminal 是有意设计（#8960 保留、#11066 收窄 flush 到 terminal boundary），属 delivery-policy 请求而非 bug；threshold 默认 `blocker` 即保持今日 blocker-only 行为；`interruptMode: immediate` 与 `advisor.immuneTurns: 0` 都不能替代该 knob。

## 证据分层

1. **直读源码**（最强）：18.2.6 本机安装包 `advisor/advise-tool.ts`、`session/session-advisors.ts`、`config/settings-schema.ts`。
2. **git 历史**：本地 oh-my-pi clone 提交与 lightweight tag committer time。
3. **upstream 元数据**：gh 读取的 issue 状态/标题/日期与已发布评论原文。

## See Also

- [OMP Advisor 防过时三旋钮](advisor-freshness-knobs.md)
