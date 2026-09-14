# OMP 动态 Session Identity 与 Sticky Routing

> Sources: 本机源码核验与 live 测试, 2026-09-14
> Raw: [OMP 动态 session identity 与 sticky routing 源码核验摘录](../../raw/omp-config/2026-09-14-omp-dynamic-session-identity-sticky-routing.md)
> Updated: 2026-09-14

## Overview

OMP 自定义 provider 要给本地 sticky router（4140）提供逐会话 routing key，正确载体是 **body 里的 `prompt_cache_key`**，不是固定 header。本文记录 OMP 18.1.21 的三层 session identity、两条 API 各自的注入条件、未声明 compat 键的真实加载行为，以及被排除的两条替代路线。

## 三层 session identity

OMP 里至少有三个容易混淆的 identity：

1. **runtime session ID**：`SessionManager` 创建，UUIDv7。
2. **providerSessionId**：sdk 层默认取 `options.providerSessionId ?? sessionManager.getSessionId()`，喂给 `sessionId` 语义。
3. **promptCacheKey**：与 sessionId 分离；fork/handoff 场景可以共享 cache 身份而非共享 session。

自动 session header 只发生在 `provider === "openai"` 且 protocol 为 openai 时（`session_id` + `x-client-request-id`）。自定义 provider 名（如 `c8787`）不触发该分支。

## `prompt_cache_key` 归一化规则

`getOpenAIPromptCacheKey` 的行为：

- `cacheRetention === "none"` → 返回 `undefined`，不发 key。
- 否则取 `promptCacheKey ?? sessionId`，过 `normalizeOpenAIStableId(sessionId, 64, "pc_")`：长度 ≤ 64 原样返回（正常 UUIDv7 session ID 即原值），超长则变成 `pc_<hash>`。

## 两条 API 的注入条件不对称

- **Responses**：`params.prompt_cache_key = promptCacheKey` 无条件写入（只要 retention 非 none）。
- **Chat Completions**：只在 `model.compat.supportsPromptCacheKey` 为真且 key 存在时写入。

## 未声明 compat 键：keep，不是 reject

`supportsPromptCacheKey` 不在 18.1.21 的 OpenAICompatFields schema 声明里，但 **schema 未声明 ≠ 被拒绝**：omptype 的 object literal 未声明键默认策略是 `extras = "keep"`（`ir.ts`），只有显式 `"+"` 为 `"reject"`/`"delete"` 才拦截。因此 models.yml 里写未声明 compat 键会原样保留并进入 resolved model compat。判定这类键是否生效，**只能跑真实加载链**（AuthStorage + ModelRegistry 加载真实 models.yml 后检查 resolved compat），不能只看 schema 文本猜。本次实测三个 `c8787-chat` 模型加载后均为 `supportsPromptCacheKey: true`。

## 4140 router 的 body fallback

copilot-api `buildRequestContext` 的最终语义（commit `2713089`）：

1. 按序查 `x-session-id` → `x-claude-code-session-id` → `session-id` → `session_id`（trim 后空串视为缺失）。
2. 全部缺失时才解析 body，取 `prompt_cache_key`（同样 trim，空白不建 binding）。
3. header 永远优先于 body。

Headroom（8787）侧对本机包全目录 grep `prompt_cache_key` 零命中，出站只剥 `x-headroom-*` 前缀的内部 header，该 body 字段原样转发。

## Live 验证结果

- copilot-api 门禁：full tests 1258 pass / 0 fail，build/typecheck/lint 全过。
- Dashboard live：gpt-5.3-codex、gpt-5.6-luna（Responses）与 kimi-k2.7-code、gemini-3.8-flash（Chat）均为首请求 `new`、后续同模型请求 `sticky` 且固定同一后端端口。
- **binding 粒度是 session + agent + model，不是纯 session**：同一 OMP session 下 gpt-5.6-luna、kimi-k2.7-code、gemini-3.8-flash 各占一条独立 binding，各固定不同实例。
- embedding / 无 model 请求 Session 为 `-`，走 `new`，属预期。

**证据边界**：dashboard 只证明 sticky 行为（new→sticky、固定端口），**不证明 key 来自 body**。body 来源的结论只锚定在代码链上：固定 header 已删除 + Chat compat 已真实加载为 true + router fallback 实现；未做 packet capture 取证。

## 被排除的两条替代路线

1. **覆盖 built-in `providers.openai` 槽位**：能白拿自动 `session_id` header，但会占用 OMP 已有内置 provider 命名空间，影响面大；且该 header 用普通 sessionId，与 fork/handoff 的 promptCacheKey 身份可能分离。
2. **`compat.promptCacheSessionHeader: x-grok-conv-id`**：x-grok-conv-id 是 Grok 专属语义，借用别扭；该 compat 键同样未声明（需另行加载验证）；4140 不认识这个 header，还得扩 router。

两条都排除后，body `prompt_cache_key` 路线成为改动最小、语义正确的方案：Responses 零改动，Chat 只需一行 provider-level compat，router 只需一个 fallback 分支。

## See Also

- [Prompt Cache：前缀匹配与 cache key 的真实分工](../prompt-caching/cache-key-and-prefix-matching.md)
- [OMP 配置语义手册](config-semantics.md)
