# OMP Advisor 防过时三旋钮：syncBacklog / immuneTurns / maxNotesPerUpdate

> Sources: 本机 OMP 18.1.21 源码核验, 2026-09-14
> Raw: [OMP advisor 三旋钮源码核验摘录](../../raw/omp-config/2026-09-14-omp-advisor-freshness-knobs.md)
> Updated: 2026-09-14

## Overview

OMP advisor 有三个常被混淆的旋钮。它们分属 advisor 管道的两个不同阶段：**输入侧 backlog 是否让主 agent 停等**（syncBacklog），**产出侧 notes 的投递方式与数量**（immuneTurns、maxNotesPerUpdate）。想让主 agent 不收到过时的 advisor 意见，两个阶段的滞后都要管。

## 管道模型

```text
① 主 agent 每轮对话增量
     ↓ 排队（输入侧 backlog，会积累、不过期）
② advisor 异步逐批处理
     ↓ 产出 notes
③ 注入主会话（steer 打断 / aside 降级 / preserve 保留）
```

## syncBacklog：主 agent 等不等（生成侧滞后）

- enum：`off` / `1` / `3` / `5`，默认 `off`。
- 语义（官方描述逐字）："Pause the main agent for up to 30 seconds if the advisor falls behind by this many turns. Off disables catch-up delays."
- `off` 不丢东西：backlog 照样排队被处理，意见晚到但会到。
- 但 backlog 有独立丢弃路径，与 syncBacklog 无关：**配额耗尽丢新 delta（直到 `/new`/配置重建/重启 reset）、连续失败 3 次丢整个 backlog、halted 丢**。
- 安全网：advisor 处于失败/配额耗尽/halted 状态时 `waitForCatchup` 立即放行，主 agent 不会被卡死。

## immuneTurns：打断后的免疫窗口（投递侧滞后）

- 数字默认 3。**方向反直觉：数字是主 agent 的保护时长，越小 advisor 越自由。**
- 语义：advisor 打断一次后，接下来 N 轮内后续 concern/blocker 降级为非打断投递（aside）。`0` = 无窗口，每条都可打断。
- **与过时的关系**：免疫期内的 concern 不是不投递，是降级等下一个 flush 点——降级就是投递延迟，投递延迟就是过时。所以 `0` 确实防投递侧过时。
- 但 `0` 不是绝对保证立即打断：例外通道（`preserveOnly`、`autoResumeSuppressed`、主 agent 已终答且无排队工作）仍走 preserve/aside；blocker 不受免疫窗口约束（源码注释：blocker 意味着 agent 交付了坏工作，刚打断过也照样再打断）。

## maxNotesPerUpdate：每次 update 的产出上限（产出限流）

- 语义（官方描述逐字）："Maximum non-blocker advice notes accepted per advisor prompt update (1–32; UI offers 1–5 quick picks). Blockers are exempt."
- 预算按次清零（每个 advisor prompt 周期 `beginUpdate()` 重置计数）。
- 超额 note **当场丢弃，不排队、不延迟到下次**；但 reject 的 note 不进 dedupe 历史，advisor 后续 update 重新提出同一问题时仍可通过。

## 防过时的最强组合与代价

`syncBacklog: "1"` + `immuneTurns: 0` 是防过时的最强组合：生成侧强制追上，投递侧取消降级窗口。代价：

| 代价 | 触发条件 |
|---|---|
| 轮末停等最多 30s | advisor 比主 agent 慢时 |
| 每条 concern/blocker 都可能打断 | advisor 意见多时 |

advisor 是快模型时代价小；advisor 慢时更优解是换快 advisor 模型，而不是让主 agent 等。`maxNotesPerUpdate: 1` 与此正交，只收敛话痨程度。

## See Also

- [OMP 配置语义手册](config-semantics.md)
- [OMP 动态 Session Identity 与 Sticky Routing](dynamic-session-identity-sticky-routing.md)
