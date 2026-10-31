# Copilot Gemini `copilot_cache_control`：代理注入规则与实测要点

> Source: 本机 `copilot-api` 仓库提交 `f0c654b7`（2026-10-31）；本会话真实 Copilot 推理请求与 `/tmp/copilot-cache-hash-debug.jsonl`（2026-10-31）
> Collected: 2026-11-01
> Published: n/a（本机实验）

## 代理侧注入规则

- `src/services/copilot/context-cache.ts`：选前 2 条非空 `system` 消息加最后 1 条非空非 `system` 消息，写入 `copilot_cache_control: { type: "ephemeral" }`；用 `??=` 赋值，重复调用不改变已有标记。
- 触发条件：`payload.model` 在 `state.models` 中精确命中，且 `capabilities.family` 匹配 `/^gemini(?:-|$)/iu`。metadata 缺失时不注入。
- 两个调用点：`create-chat-completions.ts:133`（Chat Completions 与 Responses 的 Chat fallback 都经过这里）与 `routes/messages/api-flows.ts:168`（Messages 的 Chat fallback）。
- 验证：`tests/copilot-context-cache.test.ts` 与 `tests/copilot-context-cache-local-http.test.ts`，13 passed / 0 failed。

## 实测要点

- 同一账户内做带标记与不带标记的成对对照，各阶段缓存命中比例的差值没有稳定方向；五分钟暂停后未出现归零。
- 跨账户发送相同正文时观察到缓存互相命中。用它做 A/B 时两组不再是独立对照，差异可能来自账户分配而不是标记。
- 多次连续请求的探针记录里，工具定义与顶层字段的哈希恒定，变化只来自追加的消息；前缀由客户端改写不是这组请求的变量。

## 边界

- 原始运行目录已不存在；数值取自本会话当时的程序输出，无法二次核对。
- 未核对真实账单，金额为按项目换算的估计。
- 模型回答固定为确认语，未测回答质量。
