# GPT-5.6 Luna（8787 Copilot 网关）真实规格

> Sources: 本机 8787 网关 /v1/models 实测, 2026-09-06
> Raw: [8787 v1/models luna 条目](../../raw/copilot-gateway/2026-09-06-8787-v1-models-luna.md), [压缩模型解析与配置动作](../../raw/omp-slash-commands/2026-09-06-compaction-model-resolution.md)
> Updated: 2026-09-06

## 一句话

`gpt-5.6-luna` 的真实窗口是 **1050000**（不是旧配置里的 272000）：max prompt 922000 + max output 128000 = 总窗口 1050000；一个物理窗口、两个计费档。

## 实测规格（8787 /v1/models，2026-09-06）

| 字段 | 值 |
|---|---|
| context window | 1050000 |
| max prompt | 922000 |
| max output | 128000 |
| tokenizer | o200k_base（OpenAI） |
| supported_endpoints | `/responses`、`ws:/responses`（无 /chat/completions） |
| reasoning_effort | none/low/medium/high/xhigh/max |
| vision | 支持（max_prompt_image_size 3145728，单次 1 张） |
| billing_multiplier | 0 |
| 计费档 | default（context ≤ 200000：input 20 / output 120）与 long_context（≤ 922000：input 40 / output 180，batch_size 1000000） |

## 配置教训

- **OMP 的 `contextWindow` 要配总窗口（1050000），不是 prompt 上限（922000）**；`maxTokens` 配输出上限（128000）。配小了会让压缩阈值（thresholdPercent 的基数）与可用性判断整体偏小。
- 该模型在 OMP 的正确通道是 `api: openai-responses`（目录里无 chat/completions 端点）。
- 跨模型比较 token 数只能近似：luna 用 o200k_base，与 Anthropic/Kimi 的 tokenizer 不同，同一文本两边计数可能差很多（CJK 尤甚）。

## 关联

- 本机已把 29 个 OMP 模型的 `compactionModel` 指到 `c8787/gpt-5.6-luna`（见 [OMP 内置 slash 命令全表](../omp-slash-commands/builtin-slash-commands.md) 十问补遗 #2）。
