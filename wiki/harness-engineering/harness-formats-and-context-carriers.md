# Harness 格式与上下文载体

> Sources: Can Bölük (Stencil.so)，2026-02-12; Can Bölük (Stencil.so)，2026-06-10
> Raw: [The Harness Problem](../../raw/stencil/2026-08-30-the-harness-problem.md); [Snapcompact](../../raw/stencil/2026-08-30-snapcompact.md)
> Updated: 2026-08-30

## 核心主题

模型能力被 harness/流程设计掩盖，优化 harness 的 ROI 可能比等下一代模型更高。两个互补切口：编辑格式决定模型能否表达修改，上下文载体决定模型能否保留和利用信息。

## 编辑格式：The Harness Problem

### 现状

当前主流编辑格式各有瓶颈：

| 格式 | 使用者 | 问题 |
|---|---|---|
| `apply_patch` / OpenAI diff | Codex | 对不懂这种方言的模型失败率极高 |
| `str_replace` | Claude Code 等 | 必须逐字复现旧文本（含空白）；多匹配直接拒绝 |
| trained 70B merge model | Cursor | 专门训一个模型来解决编辑合并 |

### Hashline 方案

给文件每一行加短内容哈希（如 `2:f1`）。模型编辑时引用这些 tag，不需复现原文。

实验：16 个模型 × 三种格式 × 180 tasks。Grok Code Fast 1 从 6.7% 涨到 68.3%。

结论：模型不是在理解任务上不稳定，而是在表达修改上不稳定。

## 上下文载体：Snapcompact

### 现有 compact 策略的问题

- **eliding tool results**：确定性、快速，但会让模型困惑
- **handoff**：效果相对好，但 agent 会写过度详细的"日记"
- **provider-side compact/summary**：多为"事实粉碎机"——保存了在做什么，没保存知道什么

### 图片载体的实验

把文本渲染成像素字体 PNG 喂给 vision model：

| 字体 | px²/字符 | 字符/图 | transcription | 标识符 recall |
|---|---|---|---|---|
| 8×13 | 104 | 23,520 | 1.00 | 20/20 |
| 6×10 | 60 | 40,716 | 0.79 | 20/20 |
| 5×8 | 40 | 61,348 | 0.37 | 17/19 |

可读性悬崖在 35-40 px²/字符。

### SQuAD 基准

| 技术 | fable-5 | opus-4.8 | gpt-5.5 |
|---|---|---|---|
| text（天花板） | 0.904 | 0.911 | 0.861 |
| handoff | 0.540 | 0.248 | 0.368 |
| compact | 0.406 | 0.000 | 0.896 |
| img-6×10-sent | 0.882 | 0.601 | 0.822 |

关键观察：image 在短 corpus 上接近 text 天花板，但模型需要更多 thinking/output token 来 decode。

## 适用边界

- **Hashline**：适合编辑密集型任务，需要精确表达修改
- **Snapcompact**：适合 long-horizon session 的上下文压缩，不是通用 compression
- **两者都不是万能**：40k tokens 以下不需要 compact；简单任务不需要 hashline

## 与 Prime Agent 的关系

Prime Agent 的 RLM（持久 Python kernel）是另一种 harness 创新：让模型直接写代码作为控制平面，而不是通过受限 tool schema 间接操作。这与 hashline/snapcompact 是不同维度的优化：

| 维度 | Hashline | Snapcompact | Prime RLM |
|---|---|---|---|
| 优化目标 | 编辑表达 | 上下文保留 | 控制平面灵活性 |
| 核心机制 | 行哈希 tag | 像素字体图片 | Python kernel |
| 适用场景 | 多文件编辑 | 长会话压缩 | 复杂脚本/子任务 |

## See Also

- [Prime Agent 技术实质](../prime-agent/prime-agent-technical-reality.md) — Prime Agent 的 RLM kernel 实现细节
- [OMP Extension 与 TTSR 分层防护](../omp-ttsr/extension-and-ttsr-layering.md) — 另一套 harness 层护栏方法论
- [OMP Prewalk：规划后切换模型](../omp-prewalk/prewalk.md) — 模型切换时机的 harness 优化
