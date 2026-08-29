# 模型 capability 与 gateway wire 参数不一致：reasoning_effort 案例

> Source: OMP `packages/ai/src/providers/openai-shared.ts`; OMP `packages/ai/src/providers/openai-reasoning-fallback.ts`; 本地 8787 gateway `/v1/models` 响应；本地 copilot-api 4143 日志
> Collected: 2026-08-29
> Published: Unknown

## 事件

在本地 agent 配置中给某 chat-completions gateway 模型声明 `reasoning: true` 后，gateway 后端返回 400：

```text
reasoning_effort "high" was provided, but model <id> does not support reasoning effort
```

同一模型后续请求返回 200。

## 实测：gateway 模型目录

请求本地 gateway `/v1/models`：

```json
{
  "id": "kimi-k2.7-code",
  "supported_endpoints": ["/chat/completions"],
  "reasoning": true,
  "input": ["text", "image"],
  "contextWindow": 256000,
  "maxTokens": 32000
}
```

模型自身支持 reasoning/chains-of-thought，但上游不接受显式 `reasoning_effort` 参数。

## 源码确认：OMP 何时写 reasoning_effort

OMP `packages/ai/src/providers/openai-shared.ts`：

- 第 924 行：`omitReasoningEffort = compat.omitReasoningEffort || !compat.supportsReasoningEffort`
- 第 1143 行：若未 `omitReasoningEffort`，才写入 `params.reasoning_effort`

OMP `packages/ai/src/providers/openai-reasoning-fallback.ts`：

- 第 230-270 行：`isInvalidReasoningEffortError()` 识别 reasoning effort 相关 400
- 第 342 行：`resolveOpenAIReasoningEffortFallback()` 在无法解析允许值时返回 `null`（表示禁用该参数）
- `openai-completions.ts` 在 fallback 结果 `!== undefined` 时重试并 `rememberOpenAIReasoningEffortFallback()`

## 推断与未验证

- 400 后 200 的最可能解释：OMP 首次请求带 `reasoning_effort`，遇 400 后 fallback 为 `null`，同 session 内后续请求不再带该字段。
- 未抓到 400 请求体的原始 payload：copilot-api 只在 `--verbose`/`-v` 启动时落盘 `debugJson`，4143 进程启动参数无 `-v`，payload 未持久化。
- 没有直接测量证明 200 的 payload 不含 `reasoning_effort`；这是从源码路径和日志模式推断的。

## 修复动作

- OMP：在该模型条目加 `compat.omitReasoningEffort: true`，保留 `reasoning: true`
- Prime：在该模型条目加 `compat.supportsReasoningEffort: false`（其 schema 识别 `supportsReasoningEffort`，不识别 `omitReasoningEffort`）
- OpenCode/ai-sdk：该 SDK 只在显式配置 `reasoningEffort` 时才序列化该字段，因此未改动

## 结论

`reasoning: true` 控制 host 是否期望并解析 thinking 输出；`compat.omitReasoningEffort` / `compat.supportsReasoningEffort` 控制是否把 `reasoning_effort` 写进请求体。上游 capability 与 gateway 实际接受的 wire 参数可能不一致，需要用 compat 开关分离这两个语义。
