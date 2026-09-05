# Prompt Cache：前缀匹配与 cache key 的真实分工

> Sources: OpenAI 官方文档与 API Reference, 2026-09-04; Anthropic Claude Platform 文档, 2026-09-04; Claude Code 2.1.261 本机安装直读, 2026-09-05
> Raw: [OpenAI Prompt Caching 官方文档摘录](../../raw/prompt-caching/2026-09-04-openai-prompt-caching-docs.md); [Anthropic Prompt Caching 官方文档摘录](../../raw/prompt-caching/2026-09-04-anthropic-prompt-caching-docs.md); [OMP /tan 命令源码验证摘录](../../raw/omp-background-agents/2026-09-04-tan-command-verification.md); [Claude Code 与 Codex 入列](../../raw/ai-coding-agents/2026-09-05-claude-code-and-codex-enrollment.md)
> Updated: 2026-09-05

## Overview

Prompt cache 命中的必要条件是**请求前缀逐字节匹配**；`prompt_cache_key` 是 provider 侧的路由/分组提示，它影响同前缀请求到达同一缓存的概率，但**不制造命中、不保证命中、也不是安全隔离边界**。Anthropic 没有 key 字段，用 `cache_control` 断点；GLM/Kimi 为自动前缀缓存。显式 key 是部分 provider 在路由层提供的优化机制，不是 prompt caching 的通用概念。

## 命中的必要条件：前缀匹配

OpenAI："Cache reuse requires the entire rendered prefix to match." 缓存的是渲染后完整上下文（含 system、tool 定义、对话历史）的 KV 状态，前缀中任何内容或相关设置变化都会使之后的部分无法匹配。

最小可缓存长度（OpenAI）："The minimum cacheable prompt length is 1,024 tokens for GPT-5.6 and later and 2,048 tokens for models older than GPT-5.6."

默认启用："Prompt caching is enabled by default for supported OpenAI models."——不设 key 也会缓存；key 不是启用开关（例外：GPT-5.6+ 的 explicit 模式需要显式 breakpoint）。

## cache key 的作用：概率性路由提示

官方原话（OpenAI 文档）：

> "Set `prompt_cache_key` to help requests with the same prefix reach the same cache. Keys influence routing; they do not pin requests to a machine or guarantee a cache read hit."

key 的实际职责是 "controls grouping and distribution during higher-volume traffic, to mitigate request overflow to other machines and, therefore, cache misses"。因此：

- key 相同 ≠ 必命中（不 pin 机器、不保证命中）；key 不同 ≠ 必 miss（只是命中概率下降）。
- key 不能凭空制造命中：前缀不同的请求，key 相同也互不相中。
- 官方 best practice 支持分叉共享 key："`agent_123_v1:user_456` groups user 456's sessions and forks with agent 123."

OMP 侧的一个加重证据（单源，仅 OMP auth-gateway 源码注释）："Codex-class backends only cache prefixes when an explicit `prompt_cache_key` is set; without one, two requests with the same prefix but different trailing messages don't coalesce."——对这类后端 key 接近生效前提，但这是 OMP 网关的转述，OpenAI 官方文档未独立证实。

## 字段布局与职责分离

- `prompt_cache_key`：请求 **body 顶层字段**（Responses API 与 Chat Completions 均有），与 `input`/`messages` 平级，optional string。OMP 源码按 ≤64 字符处理（`normalizeOpenAIPromptCacheKey` 注释）。
- 废弃的 `user` 字段被拆成两个继任者："This field is being replaced by `safety_identifier` and `prompt_cache_key`." 职责分离：**缓存路由归 `prompt_cache_key`；终端用户标识与 abuse detection 归 `safety_identifier`**。（早期转述曾把 abuse detection 归到 key 头上，按当前 API Reference 应予纠正。）
- 缓存生命周期控制分代：GPT-5.6+ 用 `prompt_cache_options.ttl`（仅支持 `"30m"`，即默认值）；更早模型用 `prompt_cache_retention`（`"in_memory"` 或 `"24h"`）。

## TTL 与隔离

| Provider | 默认 TTL | 扩展 | 隔离边界 |
|---|---|---|---|
| OpenAI（GPT-5.6+） | 30 分钟（最近写入或复用起算，复用刷新寿命且不再收缓存写费） | — | "Caches are not shared across organizations and cannot be reused across regional processing boundaries." |
| OpenAI（更早模型） | `in_memory`：闲置约 5 to 10 minutes，up to one hour | `24h`：约 30 分钟，up to 24 hours | 同上；ZDR 组织默认 `in_memory`，非 ZDR 默认 `24h` |
| Anthropic | 5 分钟 | 1 小时（"2x the base input token price"，`cache_control` 里 `ttl: "1h"`） | 组织间隔离；Claude API 上还按 workspace 隔离；KV 仅内存、不落盘 |

**未验证**：两家均未公开驱逐算法（如 LRU）与单机容量数字。

## 分叉/多会话共享 key 的成本算术（推断，标注）

官方未公开单机容量与驱逐策略，以下为基于"缓存容量有限"一般假设的推断：共享 key 的成本是同一缓存域内多条发散尾部互相挤占驱逐位，量级 ∝ 并发发散尾部数 × 存活时长；且驱逐只有"被顶掉的条目还会被再次请求"时才产生真实费用（重新 prefill）。因此 **fork 型分身（前缀共享大、尾部短命）共享 key 净赚；不相关长会话全局共用一个 key 净亏**——前者分子大分母小，后者相反。这是 OMP /tan 共享父会话 key 的设计依据。

## harness 侧怎么让前缀真的稳定（2026-09-05 补）

前缀逐字节匹配是命中的必要条件，但 harness 自己往 system prompt 里塞的东西每次都在变（cwd、git status、env info、memory 路径），所以这个必要条件默认是不成立的。Claude Code `2.1.261` 有两个直接针对这一点的开关，是目前看到最明确的客户端侧前缀工程：

| 机制 | 做什么 | 目标 |
|---|---|---|
| `--system-prompt-snapshot` | 字段说明原文「Record the conversation's system prompt once and reuse it verbatim on every later request and resume」，另存 `systemPromptSnapshotHash`；后台会话与远程会话默认开启 | 同一会话内跨请求与 resume 的字节稳定 |
| `--exclude-dynamic-system-prompt-sections` | 把 per-user 动态段（cwd、env info、memory paths、git status）移出被缓存的 system prompt，改注入第一条 user message | **跨用户**命中同一段静态 system prompt 前缀 |

第二条值得单独注意：本文其余部分讨论的 key、TTL、隔离都在单组织或单用户视角内，而这个开关瞄准的是**不同用户之间**共享静态前缀。Claude Code 自己写明了 tradeoff（模型看不到那些段的原位置），并留了 kill switch。

反向核查：Reasonix `StaticPromptCache`（会话创建时快照 system prompt、不再从磁盘重读）在第一条轴上同轴；为跨用户共享前缀做工程的，已查材料中没有第二家。

## See Also

- [OMP /tan：后台 fork 分身命令](../omp-background-agents/tan-command.md)
- [模型 capability 与 gateway wire 参数不一致](../model-gateway-mismatch/reasoning-capability-vs-wire-parameter.md)
- [AI Coding Agent 对比：真正独特优势（19 家）](../ai-coding-agents/4-agent-comparison.md) — 这两个开关的独有性裁定与反向核查过程
