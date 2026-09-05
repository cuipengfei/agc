# Gateway catalog 是客户端配置的权威源

> Sources: 本机 copilot-api 网关实例 `/v1/models` 实测（2026-09-05）; JustWoker relay `/v1/models` 实测（2026-09-05）
> Raw: [本机 Copilot 网关 `/v1/models` 的 Claude-facing 与计费字段摘录](../../raw/model-gateway-mismatch/2026-09-05-copilot-gateway-catalog-fields.md); [Anthropic 兼容 relay 的 `/v1/models` 目录形态与 UA 门槛](../../raw/model-gateway-mismatch/2026-09-05-anthropic-relay-catalog-and-ua.md)
> Updated: 2026-09-05

## 核心判断

给 Claude Code 配置本机 Copilot 网关模型时，「客户端该用哪个 model ID」和「该在多少 token 压缩」这两件事，网关 catalog 里已经有声明字段。按 `max_context_window_tokens` 自己推算会推错，而且推错的方向是花钱的方向。

这个结论限定在**本机 Copilot 网关**（copilot-api 类实例）。Anthropic 兼容 relay 的目录没有这些字段，见本文末节。

## 三个字段，三种用途

同一条目里的三组字段用途互不重叠：

| 字段 | 是什么 | 喂给谁 |
|---|---|---|
| `claude_model_id` | 网关声明的 Claude-facing ID，带或不带 `[1m]` 后缀 | `ANTHROPIC_MODEL` 等模型 ID 类变量 |
| `billing.token_prices.default.context_max` | 默认计费档的 token 上限，超过跳 `long_context` 档 | `CLAUDE_CODE_AUTO_COMPACT_WINDOW` |
| `capabilities.limits.max_context_window_tokens` | 模型真实上下文窗口 | `CLAUDE_CODE_MAX_CONTEXT_TOKENS` |

`gpt-5.4` 的这三个值分别是 `gpt-5.4[1m]`、272000、1050000。`id` 字段本身是 `gpt-5.4`，与 `claude_model_id` 是两个不同字段。

## 后缀不能按窗口大小推

实测该网关 12 个带 `capabilities.limits` 的条目，`claude_model_id` 只有 6 个以 `[1m]` 结尾：

| `id` | `claude_model_id` | `window` |
|---|---|---:|
| `gemini-3.7-flash` | `gemini-3.7-flash[1m]` | 1000000 |
| `gpt-5.4` / `gpt-5.5` / `gpt-5.6-luna` / `gpt-5.6-sol` / `gpt-5.6-terra` | 均带 `[1m]` | 1050000 |
| `gpt-5.3-codex` / `gpt-5.4-mini` | 与 `id` 相同 | 400000 |
| `kimi-k2.7-code` | 与 `id` 相同 | 256000 |
| `gpt-5-mini` | 与 `id` 相同 | 264000 |
| `mai-code-1.1-flash` / `mai-code-1-flash-picker` | 与 `id` 相同 | 256000 |

带后缀的 6 个 window 是 1000000 或 1050000；不带的 6 个是 400000、264000 或 256000。用「window 超过 200000 就加后缀」这条规则去推，会给后面这 6 个全部错加。

## 计费档边界是成本边界

`default` 与 `long_context` 是同一模型的两档价。`gpt-5.4` 的两档对比：

| 档 | `context_max` | `input_price` | `output_price` | `cache_price` |
|---|---:|---:|---:|---:|
| `default` | 272000 | 250 | 1500 | 25 |
| `long_context` | 922000 | 500 | 2250 | 50 |

input 250 涨到 500，cache 25 涨到 50，output 1500 涨到 2250。所以把 `CLAUDE_CODE_AUTO_COMPACT_WINDOW` 设成 `default.context_max`，效果是在跳档前压缩。

档位不是通用常量，各模型不同：`gpt-5.4` / `gpt-5.5` / `gpt-5.6-sol` / `gpt-5.6-terra` / `gpt-5.3-codex` / `gpt-5.4-mini` 是 272000，`gemini-3.7-flash` 与 `gpt-5.6-luna` 是 200000，`kimi-k2.7-code` 是 224000，`mai-code-1.1-flash` 与 `mai-code-1-flash-picker` 是 128000。把 272000 当通用值用在后面这几个上，会让一段上下文落在 `long_context` 档里。

`gpt-5-mini` 条目没有 `billing` 字段，这种情况需要一个明确的 fallback，不能把缺失当 0。

## 真实窗口与计费档不能混用

两个数量级差别很大：`gpt-5.4` 的真实窗口 1050000，默认档上限 272000。拿错方向有两种代价——把计费档当真实窗口喂给 `MAX_CONTEXT_TOKENS`，会把可用上下文砍掉一大截；把真实窗口当压缩点，会在 `long_context` 档里跑很长一段。

混合模型时还要额外取一次 min：若 main 有 billing 而 sub 没有（如 `gpt-5.4` 的 272000 配 `gpt-5-mini` 的窗口 264000），只按 billing 算会声明出 264000 达不到的 272000。

## Anthropic 兼容 relay 没有这些字段

JustWoker relay 的 `data[0]` 键集合只有：

```json
["created_at","display_name","id","type"]
```

没有 `capabilities`、没有 `billing`、没有 `claude_model_id`。这类 relay 的能力值只能来自本地静态配置，模型 ID 也只能按裸 `id` 发。

同一 relay 还有一层 User-Agent 门槛：同样的 URL 与认证头，Python 标准库 `urllib.request` 的默认 UA 得到 403，换成浏览器 UA 得到 200。目录请求也观测到间歇失败，需要重试。

## 常见错误

- 只读 `id` 和 `limits`，不看 `claude_model_id`，然后按窗口大小自己拼后缀。
- 把某个模型的 `default.context_max` 当成全网关通用常量。
- 把 `capabilities.limits.max_context_window_tokens` 与 `billing.token_prices.default.context_max` 当同一个数。
- 拿本机 Copilot 网关的字段假设去要求 Anthropic 兼容 relay。
- 用直接 `curl` 网关的结果推断 Claude Code 的线路行为——两者不是同一个请求，见 See Also。

## See Also

- [模型 capability 声明与 gateway wire 参数不一致](reasoning-capability-vs-wire-parameter.md) — 同一主题家族：host 侧声明与 wire 侧实际行为要分开验证
- [JustWoker `/v1/messages` 实测行为](justwoker-v1-messages-observed-behavior.md) — 同一 relay 的请求侧行为
- [Claude Code 上下文窗口与自动压缩控制](../harness-engineering/claude-code-context-and-compaction.md) — 这些字段喂进去之后，客户端侧按什么规则生效
