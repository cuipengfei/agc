# Open Code Review 经 8787/4140 Copilot 网关 Responses 跨实例 401 与 {ocr_session_key} 修复证据

> Source: alibaba/open-code-review v1.14.3 源码; 本机 copilot-api router 源码; ~/.headroom/logs/proxy-8787.log 与 /tmp/sticky-router.log 脱敏实测摘录
> Collected: 2026-11-25
> Published: 2026-11-25

## 1. 故障现象与报错原文

在 `~/.opencodereview/config.json` 配置 `provider: "cop"`、`url: "http://localhost:8787"`、`protocol: "openai-responses"`、`model: "gpt-6.1-sol"` 时，运行 `ocr config provider` 或 `ocr llm test` 报错：

```text
Error: llm request after tool call failed: POST "http://localhost:8787/responses": 401 Unauthorized {"message":"input item ID does not belong to this connection","code":""}
```

## 2. 本机请求链路与进程实证

本机监听进程：
- `127.0.0.1:8787`：Headroom proxy（PID `1543670`，启动参数含 `--anthropic-api-url http://localhost:4140 --openai-api-url http://localhost:4140 --mode cache`）。
- `*:4140`：`copilot-api` sticky router（PID `1064425`，命令 `bun run router/sticky-router.ts`）。

Headroom `/responses` 路由注册（`/home/cpf/.local/share/uv/tools/headroom-ai/lib/python3.13/site-packages/headroom/providers/openai_responses.py:30-38`）：
```python
OPENAI_RESPONSES_ROOT_PATHS: tuple[str, ...] = (
    "/v1/responses",
    "/v1/codex/responses",
    "/backend-api/responses",
    "/backend-api/codex/responses",
    "/responses",
)
```
客户端请求 `http://localhost:8787/responses` 时，Headroom 将其作为原生 Responses 根路径处理并转发至 `http://localhost:4140/v1/responses`。

## 3. 跨实例路由导致 401 的日志对齐证据

Headroom 日志（`~/.headroom/logs/proxy-8787.log`，本地时间 UTC+8）与 sticky-router 日志（`/tmp/sticky-router.log`，UTC 时间）逐秒对齐：

- 第一轮测试（`23:58:08` CST / `15:58:08` UTC）：
  - 首请求（917 B）：`proxy-8787.log:36279-36287` 记录 `body_mutated=false`，转发至 `4140/v1/responses` -> `/tmp/sticky-router.log:51` 记录 `[2026-11-24T15:58:08.667Z] sid=- agent=_ provider=_ → <INSTANCE_A>:4144 model=gpt-6.1-sol reason=new` -> 返回 HTTP `200`。
  - 工具调用后续请求（1624 B）：`proxy-8787.log:36288-36295` 记录 `body_mutated=false` -> `/tmp/sticky-router.log:52` 记录 `[2026-11-24T15:58:12.491Z] sid=- agent=_ provider=_ → <INSTANCE_B>:4145 model=gpt-6.1-sol reason=new` -> 返回 HTTP `401`（82 B）。
- 第二轮测试（`23:59:59` CST / `15:59:59` UTC）：
  - 首请求（917 B）：`proxy-8787.log:36409-36417` -> `/tmp/sticky-router.log:64` 记录 `[2026-11-24T15:59:59.969Z] sid=- agent=_ provider=_ → <INSTANCE_C>:4146 model=gpt-6.1-sol reason=new` -> 返回 HTTP `200`。
  - 工具调用后续请求（1624 B）：`proxy-8787.log:36418-36425` -> `/tmp/sticky-router.log:65` 记录 `[2026-11-24T16:00:02.876Z] sid=- agent=_ provider=_ → <INSTANCE_B>:4145 model=gpt-6.1-sol reason=new` -> 返回 HTTP `401`（82 B）。

## 4. 客户端与路由器源码根因对照

1. **4140 Sticky Router 的会话键提取逻辑**（`/home/cpf/code-inside/copilot-api/router/state.ts:940-961`）：
   - 优先按序检查请求头：`x-session-id`、`x-claude-code-session-id`、`session-id`、`session_id`。
   - 若请求头均缺失，解析 JSON body 读取 `prompt_cache_key`。
   - 若两者皆无，`sessionId` 为 `null`，`getBindingKey`（`router/lib.ts:358-364`）返回 `null`，`pickPort`（`router/state.ts:679-695`）每次执行 `pickLeastLoaded` 并标记 `reason=new`。
2. **`ocr review` 与 `ocr llm test` 在 `SessionID` 上的差异**：
   - 在正式审查主循环 `internal/llmloop/loop.go:336,367-373` 中，每个子任务生成 `sessionID := uuid.NewString()` 并传入 `llm.ChatRequest{..., SessionID: sessionID}`；`internal/llm/responses_client.go:488-490` 将非空的 `req.SessionID` 写入 `params.PromptCacheKey`。
   - 但在连接自测 `cmd/opencodereview/llm_cmd.go:107-116` 中：
     ```go
     return llmClient.CompletionsWithCtx(ctx, llm.ChatRequest{
         Model:     ep.Model,
         Messages:  msgs,
         Tools:     tools,
         MaxTokens: 2048,
     })
     ```
     未设置 `SessionID`，因此 `ocr llm test` 发出的请求既无 session header，body 中也无 `prompt_cache_key`。
3. **第二轮请求重放原生输出项 ID**（`internal/llm/responses_client.go:431-436, 530-571`）：
   - 第一轮响应返回 `reasoning`、`function_call`、`message` 输出项时，`mapResponsesResponse` 调用 OpenAI Go SDK（`github.com/openai/openai-go/v3 v3.51.0`）的 `ToParam()` 将原始 JSON 项存入 `Native.Payload`。
   - 第二轮回传 `function_call_output` 时，`buildResponsesParams` 直接将 `msg.Native.Payload` 追加进 `input`，保留了第一轮实例生成的 item `id` 与 `reasoning.encrypted_content`。当路由器将第二轮请求分发到另一个 Copilot 实例（如 `4144 -> 4145` 或 `4146 -> 4145`）时，目标实例拒绝不属于本连接的 item ID 并返回 401。

## 5. `{ocr_session_key}` 机制与修复验证

`internal/llm/sessionkey.go:20-95` 与 `internal/llm/responses_client.go:46-48, 153-164`：
- `const SessionKeyTemplateVar = "{ocr_session_key}"`。
- `NewOpenAIResponsesClient` 在初始化时若 `cfg.SessionKey == ""` 则调用 `NewSessionKey()` 生成一个随机 UUIDv4，供 context 未携带会话键的请求（如 `ocr llm test`）作为客户端级会话键复用；在 `ocr review` / `ocr scan` 中则由 `ContextWithSessionKey` 按 `(sessionID[:8], taskType, sha256(scope)[:8])` 细化为 `SessionTaskKey`。
- 每次请求时，`expandSessionKeyInHeaders(c.cfg.ExtraHeaders, sessionKey)` 将 `extra_headers` 中的 `{ocr_session_key}` 替换为当前 `sessionKey`。

永久修复命令：
```bash
ocr config set custom_providers.cop.extra_headers 'x-session-id={ocr_session_key}'
```

实测验证输出（2026-11-25）：
```text
Source: provider:cop
URL:    http://localhost:8787
Model:  gpt-6.1-sol
I’m open-code-review, a code review assistant developed by Alibaba for your command-line environment (self-test: “ocr_selftest ok”).
✓ Connection test successful
✓ Tool-call round trip verified
```

对应 `/tmp/sticky-router.log` 路由记录：
```text
[2026-11-24T16:15:51.829Z] sid=<present> agent=_ provider=_ → <INSTANCE_C>:4146 model=gpt-6.1-sol reason=new
[2026-11-24T16:15:54.813Z] sid=<present> agent=_ provider=_ → <INSTANCE_C>:4146 model=gpt-6.1-sol reason=sticky
```
两轮请求携带相同非空 `sid`，全部固定在 `<INSTANCE_C>:4146` 实例。
