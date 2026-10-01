# OMP Compaction 阈值解析机制

> Sources: OMP upstream source code（本地树 HEAD 73a11421fe，v18.2.11-58）
> Raw: [Compaction 阈值与 Shake 机制源码取证](../../raw/omp-config/2026-10-01-compaction-threshold-and-shake-mechanics.md); [8787 实测 limits 与 maxTokens 调整](../../raw/copilot-gateway/2026-10-01-v1-models-live-limits.md)
> Updated: 2026-10-01

## 结论

auto-compact 阈值的基数只有模型的 `contextWindow`。自定义 provider 模型定义里的 `maxTokens`（输出上限）不进阈值计算；它只约束单次响应长度。

## 阈值三模式（resolveThresholdTokens，compaction.ts:389-413）

入参是 `(contextWindow, settings)`，按优先级：

1. `compaction.thresholdTokens > 0`：固定值，clamp 到 `[1, contextWindow - 1]`。
2. `compaction.thresholdPercent > 0`：`floor(contextWindow × percent/100)`，percent clamp 到 [1, 99]。
3. 两者均为默认 -1：`contextWindow − resolveBudgetReserveTokens(...)`。

reserve 规则：`max(floor(contextWindow × 0.15), reserveTokens ?? 16384)`；reserve 未显式配置且默认值相对小窗口不可行时退回比例 reserve `max(1, floor(contextWindow × 0.15))`。`DEFAULT_RESERVE_TOKENS = 16384`。

## 默认值变迁

settings-schema 当前默认 `thresholdPercent: -1`、`thresholdTokens: -1`（默认走 reserve 模式）。2026-09-06 的取证记录 thresholdPercent 默认 85；该默认值已被 -1 取代（见 [内置 slash 命令](builtin-slash-commands.md) 十问补遗第 2 条的 Outdated 标注）。

## `maxTokens` 在 compaction 里的唯一角色

`compaction.ts` 中出现的 `maxTokens` 全部是**摘要生成自身的输出预算**：`min(floor(0.8 × reserveTokens), MAX_SUMMARY_TOKENS)`，`MAX_SUMMARY_TOKENS = 16384`（与 DEFAULT_RESERVE_TOKENS 同值）。摘要输入预算按 `floor(model.contextWindow × 0.8) − 摘要预算` 计算，同样不读 `model.maxTokens`。

## 配置含义

- `contextWindow` 配小了，阈值基数、可用性判断整体偏小。例：实际 1050000 的窗口配成 272000，reserve 模式下 reserve = max(floor(272000×0.15), 16384) = 40800，阈值 = 272000 − 40800 = 231200，窗口约四分之一处就开始压。
- `maxTokens` 配错不影响何时压，只影响单次输出上限与摘要预算等派生值。

## See Also

- [OMP Compaction Model 与 Thinking Level](compaction-model.md) — 谁压、thinking 从哪来
- [OMP Shake 机制](../omp-slash-commands/shake-mechanics.md) — 无 LLM 的外科式裁剪
- [OMP 配置语义手册](config-semantics.md) — compaction 各开关的触发条件
- [GPT-5.6 Luna 真实规格](../copilot-gateway/gpt-5.6-luna-specs.md) — contextWindow 配总窗口的教训出处
