# Stencil.so：The Harness Problem

> Source: https://stencil.so/blog/the-harness-problem
> Author: Can Bölük (OMP 创始人)
> Published: 2026-02-12
> Collected: 2026-08-30

## 核心论点

Agent 表现差异很大程度上不是模型本身，而是 **harness（编辑工具格式）**。

同一任务用三种编辑格式跑 16 个模型，只改格式就能让某些模型 pass rate 从 6.7% 涨到 68.3%。

## 三种编辑格式的缺陷

| 格式 | 使用者 | 问题 |
|---|---|---|
| `apply_patch` / OpenAI diff | Codex | 对不懂这种方言的模型失败率极高 |
| `str_replace` | Claude Code 等 | 必须逐字复现旧文本（含空白）；多匹配直接拒绝 |
| trained 70B merge model | Cursor | 专门训一个模型来解决编辑合并 |

## Hashline 方案

给文件每一行加短内容哈希（如 `2:f1`）。模型编辑时引用这些 tag，不需复现原文。

> "replace line `2:f1`, replace range `1:a3` through `3:0e`"

## 实验结果

- 180 tasks × 3 runs，React 真实文件，注入机械 bug
- 16 个模型 × 三种编辑格式
- Patch 几乎最差；hashline 匹配或超过 str_replace；最弱模型收益最大

例子：Grok Code Fast 1 从 6.7% 涨到 68.3%。

## 结论

"模型不是在理解任务上不稳定，而是在表达修改上不稳定。你在怪飞行员，其实是起落架不行。"

## 关于厂商

Vendor 不会为竞争对手的模型优化 harness。开源 harness 可以为所有模型优化。模型是护城河，harness 是桥。

## Benchmark 代码

https://github.com/can1357/oh-my-pi/tree/main/packages/react-edit-benchmark
