# OMP Compaction Model 与 Thinking Level

> Sources: OMP upstream source code
> Raw: [OMP Compaction Model 与 Thinking Level 源码取证](../../raw/omp-config/2026-09-09-compaction-model-thinking-level.md)
> Updated: 2026-09-09

## 结论

`compactionModel` 只决定**哪个模型来压**，不决定**压的时候用多少 thinking**。compact 的 reasoning effort 继承自当前 session 的 `thinkingLevel`。

## 数据流

1. `session-maintenance.ts:2706-2710` / `:4067-4071` 把 `this.#host.thinkingLevel()` 传入 compact 选项
2. `compaction.ts:632-637` 的 `resolveCompactionEffort` 接收该值：
   - `Off` → `undefined`（禁用 reasoning）
   - `undefined` / `Inherit` → `Effort.High`
   - 显式值 → `effortFromThinkingLevel()` 转换
3. 最终经 `clampThinkingLevelForModel(compactionModel, requested)` 按模型能力 clamp

## 谁说了算

| 来源 | 作用 |
|---|---|
| `defaultThinkingLevel` | 初始化默认值 |
| **shift+tab** | 直接改当前 session，即时生效 |
| `/model` 带 `:level` 后缀 | 用显式值 |
| `/model` 不带 level | 重应用目标模型的 `thinking.defaultLevel`；无则保留当前值 |

`role-models.ts:34-51` / `:61-64` 确认 `resolveConfiguredModelTarget()` 和 `resolveCompactionConfiguredTarget()` 只返回 `Model`，不传播 `thinkingLevel`。

## 没有独立配置

不存在 `compactionModel: provider/model:high` 这种写法。compact 的 effort 不来自 `compactionModel` 字符串。
