# OMP 状态栏 cost 段的三段金额组成

> Sources: OMP 18.22.2 (@oh-my-pi/pi-tui / @oh-my-pi/pi-coding-agent) 源码实测，2026-11-18
> Raw: [OMP 状态栏 cost 段计费三元组源码与会话记录摘录](../../raw/omp/2026-11-18-omp-status-line-cost-segments-source.md)
> Updated: 2026-11-18

## Overview

OMP 的状态栏在 `default` 预设下（`presets.ts:4-9`），将 `cost` 段配置在左侧段的最末尾。其典型呈现形式为三项并列的花费数据：

```text
$40.60 (+0.19) +  1.52
```

这三个数字分别对应主会话自身开销、子代理树整体开销以及独立顾问（Advisor）开销。

## 三项金额的计算来源

状态栏计费段由 `costSummary`（`segments.ts:792-842`）组织三笔数值并传入 `formatBillingSummary`：

| 呈现项 | 对应变量 | 源码计算公式 | 业务含义 |
|---|---|---|---|
| `$40.60` | `ownCost` | `Math.max(0, cost - taskResultCost)` | 主会话自身的花费。从总计费 `cost` 中扣除已完成的子代理任务结果部分（`taskResultCost`） |
| `(+0.19)` | `subagentCost` | `Math.max(ctx.subagentTreeCost ?? 0, taskResultCost)` | 子代理树花费。取 Agent Hub 投影的子代理整树开销（含孙代理及运行中代理）与已完成任务花费中的较大值 |
| `+ 1.52` | `advisorCost` | `ctx.session.getAdvisorCost?.() ?? 0` | 顾问花费。由独立 session 统计累计开销，单位符号默认省略 |

在焦点切换到具体子代理时（`component.ts:2752-2754`），`subagentTreeCost` 会被置为 0，视图回退为其自身的任务结果统计；非焦点状态下由 Agent Hub 提供整树投影（`types.ts:133-162`）。

## 排版规则与单位控制

`formatBillingSummary`（`metrics.ts:7-104`）约束了计费符号与间距：

1. **单位只输出一次**：计费单位（如 `$`）在主花费处打印一次（`formatSpend`），后续同类开销均不再重复打印美元符号。
2. **子代理括号包裹**：紧随主花费输出 `(+…)`，保留两位小数。
3. **顾问分隔与图标**：当存在顾问费用时，以 `+ ` 为前缀连接。后接主题图标：
   - `nerd` 模式：使用私有区码位 `\uea70`（`icon.advisor`，对应 nf-cod-eye）。
   - `unicode` 模式：使用 `👁`。
   - `ascii` 模式：使用 `(adv)`。

在终端环境中，私有区字符 `\uea70` 复制到外部剪贴板时若被过滤丢弃，在 `+ ` 与金额之间会留出双空格，呈现为 `+  1.52`。

## 账本独立性与可加性

三项花费在数据结构上互不重叠：

1. **主会话与子代理防重复**：主会话的 `ownCost` 已通过减去 `taskResultCost` 剥离了子代理的消耗。
2. **Advisor 独立文件与隔离**：Advisor 的轮次写入 `<session>/__advisor.jsonl` 或 `<session>/__advisor.<slug>.jsonl`（`transcript-recorder.ts:15-27`、`session-advisors.ts:1641-1647`），并在 `session-advisors.ts:2010-2015` 中通过 `#advisorCosts.set` 累加，从未写入主会话 JSONL transcript 的 `model_usage` 账本中。
3. **数值可相加性**：将这三笔金额相加，即得到主会话、整棵子代理树与顾问全部组件的消耗总和。当有子代理正在运行时，Agent Hub 投影的 `subagentTreeCost` 包含实时动态估算，可能略高于已经完成的静态账目总额。

## See Also

- [OMP 界面图标：三档 symbolPreset 与 Glyph Protocol](symbol-presets-and-glyph-protocol.md) — 状态栏涉及的 Nerd 图标与编码映射机制
- [OMP advisor/watchdog 机制](../omp-config/advisor-concern-delivery-policy.md) — Advisor 运行触发与介入规则
