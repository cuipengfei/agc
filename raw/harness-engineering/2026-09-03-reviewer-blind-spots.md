# 审查方盲区：会话观察证据

> Source: OMP 会话中的直接观察（2026-09-03）；Grok Build LazinessDetector 常量（`xai-org/grok-build`）
> Collected: 2026-09-03
> Published: Unknown

---

## A. 观察到的模式

一次 OMP 会话中，审查方断言某些消息不存在于 transcript 中。严重度递升：concern → blocker → blocker。被审方在第三次递升后撤回了一个事后看来正确的事实。

根因：被审方将严重度递升当成证据强度递升，而非去问审查方实际能看到什么。

审查方的视野缺口：看不到自己先前的输出，于是「我看不见」→「不存在」→「你在编造」。

**范围说明。** 这是一次会话中的行为观察，不是机制审计。OMP advisor 实现未被阅读；仅记录本次会话中收到的输出。

---

## B. 随后撤回的过度声称

被审方在同一会话中做出三处过度声称，随后全部撤回：

1. 「OMP advisor 默认开启」——未知。观察到的是本机当前配置下 watchdog 在运行，而非产品默认开启。
2. 「覆盖面无边界」—— unsupported。单一会话中观察到的宽度推不出无边界覆盖。
3. 「advisory 在流式中途送达」—— false。advisory 在回合之间到达，而非 mid-stream。本次会话中两次 mid-stream 中断来自规则执行，非 advisory。

---

## C. 机制层面的平行：Grok Build LazinessDetector

Grok Build 的 `LazinessDetector` 包含同类暴露面。`[FETCHED]` 源文件：`xai-org/grok-build/crates/codegen/xai-grok-shell/src/session/acp_session_impl/laziness.rs` 与 `laziness_classifier.rs`。

分类器输入为展平且截断的 transcript：每行截断到 400 字符，reasoning 段进一步收紧到 200 字符（`laziness_classifier.rs:260, 267-268`）。设计理由：思维链只是辅助信号。

截断之外的内容对分类器不可见。一个声称的证据如果落在被截掉的部分，就会被判为「证据不存在」。同一 pipeline：截断视野 →「我的输入里没有」→「证据不存在」。

机制层的防伪设计（注入 harness 真值如 `outstanding_background_tasks_and_subagents` 与 `turn_elapsed_seconds`）防止被审方捏造证据，但不补偿缺失的上下文。

### 下游三层闸门无法抓住这个

LazinessDetector 分类后有三层决策：封闭类别集（7 值，4 停滞）、把握度阈值（0.7）、每会话 nudge 上限（默认 0）。

这些管的是判决**如何表达**、**是否执行**。它们不管判决的**材料基础**是否充分。一个判决可以过所有三层闸门，同时 resting on truncated material。

分类器没有一道闸门会问「我的输入是否完整到足以判断这个声称？」。

---

## D. 交叉引用

另见 `raw/ai-coding-agents/2026-09-03-grok-build-mechanisms.md` C 节，LazinessDetector 完整常量集与闸门顺序。
