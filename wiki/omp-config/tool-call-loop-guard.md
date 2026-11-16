# OMP 工具调用循环防护与 exemptTools

> Sources: 本机 OMP 18.20.3 源码直读（tool-call-loop-guard.ts、stream-guards.ts、advisor/loop-guard.ts）, 2026-11-16
> Raw: [model.toolCallLoopGuard 与 exemptTools 语义](../../raw/omp-config/2026-11-16-tool-call-loop-guard-exempt-tools.md)
> Updated: 2026-11-16

## Overview

OMP 有两套独立的循环防护。`model.loopGuard.*` 盯单次流式输出内部的重复，`model.toolCallLoopGuard.*` 盯跨连续模型回合完全相同的工具调用集合；后者达到阈值时向模型注入一条不显示在 transcript 的纠偏消息。`exemptTools` 是后者的白名单数组，整体替换默认值，不合并。

## 两族设置的分界

| 设置族 | 检测对象 | 动作 |
|---|---|---|
| `model.loopGuard.enabled` / `checkAssistantContent` / `toolCallReminder` | 单次响应里的 reasoning 与正文重复；Gemini 连续规划不调工具 | 中断该次生成的重复流 |
| `model.toolCallLoopGuard.enabled` / `threshold` / `exemptTools` | 跨回合相同工具调用集合 | 注入隐藏纠偏消息 |

`model.toolCallLoopGuard.enabled` 为 `false` 时，guard 实例被销毁，计数不再运行。

## 匹配与计数

比较的是「回合」而不是单次调用。一个回合里的工具调用按 `[工具名, 规范化参数]` 序列化，整回合的调用串排序后再拼接成哈希：

- 参数对象的键按名称排序，数组递归处理，`INTENT_FIELD` 与旧字段 `__intent` 被跳过。参数键顺序与调用顺序都不影响比较。
- 哈希与上一回合相同则计数加一；不同则替换哈希并把计数设为 `1`。
- 计数达到 `threshold`（默认 `5`，运行时取整且不小于 `1`）时产生检测结果，携带工具名、计数、结果摘要与参数摘要。

结果摘要截到 `200` 字符，参数摘要截到 `400` 字符。

## 豁免回合的两种结局

整回合的工具调用都在豁免名单里时，先判断这个回合是否「无作用」：

- 没有外部注入上下文，且每个调用结果都带 `useless === true`：跳过，不重置计数。这类轮询（到时的 `wait`、没等到东西的 `wait`）与重复调用交替出现时，仍能触发防护。
- 其余情况（结果有效、失败、带注入上下文）：清空哈希与计数。这类回合可能改变了状态（任务结束、收到消息），视为循环中断。

## 注入物

达到阈值后写入一条 `role: "custom"`、`display: false`、`attribution: "agent"` 的消息，同时记录到 session 的 custom message 条目。用户看不到它，模型在下一个请求里看到。

## 设备别名与实例缓存

`write` 工具写入 `xd://<device>` 时，设备名参与豁免判定（`exemptionAlias` 为 `writeDeviceName`）。把设备名写进 `exemptTools` 就能豁免该设备的写入循环，不必豁免整个 `write`。

guard 实例以 `` `${threshold}:${JSON.stringify(exemptTools)}` `` 为缓存键，任一项变化即重建；读取时过滤掉空字符串元素。

## 本机配置与陷阱

本机 `enabled: true`、`threshold: 5`、`exemptTools: ["wait"]`，与默认值一致。

`exemptTools` 是整体替换。写成 `["hub"]` 会同时失去默认的 `wait` 豁免，正常等待后台任务的轮询会被计入重复集合；数组里显式写 `wait` 才能保住默认行为。

## See Also

- [OMP 配置语义手册](config-semantics.md)
- [OMP 近期十个 release 的配置项增量](release-config-changes-18-12-1-to-18-10-1.md)
