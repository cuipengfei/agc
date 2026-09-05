# OMP /tan：后台 fork 分身命令

> Sources: can1357/oh-my-pi 源码（GitHub main + 本机 @oh-my-pi/pi-coding-agent@18.1.10 复核）, 2026-09-04; OpenAI Prompt Caching 官方文档, 2026-09-04
> Raw: [OMP /tan 命令源码验证摘录](../../raw/omp-background-agents/2026-09-04-tan-command-verification.md); [OpenAI Prompt Caching 官方文档摘录](../../raw/prompt-caching/2026-09-04-openai-prompt-caching-docs.md)
> Updated: 2026-09-05

## Overview

`/tan`（tangent 的缩写）是 OMP 的内置 slash command：fork 当前会话的 transcript 作为上下文，派一个完整的后台 agent 去执行一件支线任务，主会话不被打断。它的设计要点是 **provider session 身份分离、prompt cache key 刻意共享**——共享 key 有助于分身的请求路由到父会话缓存所在处，提高 fork 瞬间整个父上下文前缀复用父会话已写入缓存的概率。共享 key 只影响路由、提高命中概率，不保证命中（见下文「缓存设计」）。本文只取证 OMP 的实现，未与其他 agent 做独有性对比。

## 是什么、怎么用

- 注册描述原文："Run a full background agent on tangential work"，用法 `/tan <work>`（`builtin-lifecycle.ts`，本机 v18.1.10 第 460-464 行）。
- sibling 命令 `/btw`（第 448-452 行）："Ask an ephemeral side question using the current session context"。分工：`/btw` 是顺嘴一问的轻量侧问，不派生 agent；`/tan` 是需要工具能力的完整后台 agent。
- 三个前提（缺一即报错）：存在激活 model；async jobs 未禁用；session 已持久化。

## fork 语义：继承什么、隔离什么

继承：父会话 transcript（fork 上下文）、model、thinking level、system prompt、工具集、LSP、extensions/provider auth（`disableExtensionDiscovery: true`，rebind 父会话的 prepared extensions）。

隔离：

- 费用独立：`resetInheritedCost: true`，分身成本不含父会话累计花费。
- 身份独立：`providerSessionId` 形如 `${parentSessionId}:tan:${Snowflake.next()}`。
- todo 清空：fork 会继承父会话 todo list，代码显式 `clone.setTodoPhases([])`，防止分身被拖回主线任务。
- 行为隔离：注入 `tan-context-switch.md` 指令——只处理本次请求；父 agent 可能并发改同一工作目录，文件可能中途变化甚至编译失败，分身**不许**修、审计或续写父会话的工作；"After request: STOP. NEVER work on ANY OTHER TASK."
- 主会话侧注入 `background-tan-dispatch.md`：仅作知晓，不许被打断，结果在后台 job 完成时单独浮现。

## 缓存设计：身份分离、cache key 共享

`tan-command-controller.ts` 的关键三行：

```ts
const parentPromptCacheKey = session.agent.promptCacheKey ?? parentSessionId;
providerSessionId: `${parentSessionId}:tan:${Snowflake.next()}`,
providerPromptCacheKey: parentPromptCacheKey,
```

源码注释写明意图："Providers route on `promptCacheKey ?? sessionId`"，并要求 "Mirror exactly what the parent populated the cache under — same rule as advisor and handoff calls."（`session-handoff.ts` 中 handoff 遵循同一规则。）

为什么这样做是对的：OpenAI 官方文档说 "Set `prompt_cache_key` to help requests with the same prefix reach the same cache." tan fork 的请求前缀 = system prompt + fork 时刻的完整父 transcript，与父会话逐字节相同；共享 key 提高分身请求落到父会话缓存所在处的概率，使 fork 瞬间的全量前缀有机会直接复用而不必重新 prefill。这是概率优化而非必然命中——同一段官方文字接着说 "Keys influence routing; they do not pin requests to a machine or guarantee a cache read hit."。官方 best practice 甚至直接给出分叉共享 key 的示例："`agent_123_v1:user_456` groups user 456's sessions and forks with agent 123." 机制细节（前缀匹配、key 的路由语义、成本算术）见 [Prompt Cache：前缀匹配与 cache key 的真实分工](../prompt-caching/cache-key-and-prefix-matching.md)。

## 限定与坑

- extensions 继承曾不完全：PR #10390 修复过 /tan 子会话的 extension 转发；"继承 extensions"不宜理解为历来完整。
- tan 克隆体 `hasUI: false`、`enableMCP: false`（有 mcpManager 时走代理工具）。
- 佐证 issue：#6193（/tan fork 与 one-shot 生命周期）、#7218（side turns 与 effective cache key）。

## See Also

- [Prompt Cache：前缀匹配与 cache key 的真实分工](../prompt-caching/cache-key-and-prefix-matching.md)
- [JSONL 格式与第三方 pi 解析器](../omp-sessions/jsonl-format-and-third-party-parsers.md)
- [六 AI Coding Agent 对比](../ai-coding-agents/4-agent-comparison.md)
