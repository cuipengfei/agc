# OpenAI Responses API Compaction 官方指南、Codex 源码与社区取舍摘录

> Source: https://developers.openai.com/api/docs/guides/compaction; https://developers.openai.com/api/reference/resources/responses/methods/compact; https://developers.openai.com/api/docs/guides/conversation-state; https://openai.com/index/equip-responses-api-computer-environment/; https://github.com/openai/codex; https://github.com/NousResearch/hermes-agent/issues/33130; https://github.com/openai/codex/issues/24618; https://github.com/strands-agents/harness-sdk/issues/5409; https://github.com/anomalyco/opencode/issues/5200; https://github.com/can1357/oh-my-pi/blob/main/docs/compaction.md; https://kangwooklee.com/blogs/codex_context_compaction.html
> Collected: 2026-10-24
> Published: 2026-03-13

## 1. OpenAI 官方 Compaction 指南摘录 (`https://developers.openai.com/api/docs/guides/compaction`)

> Compaction is a technique for managing the context window in long-running conversations or agentic workflows. When the rendered token count crosses a threshold, or when you explicitly invoke the `/responses/compact` endpoint, the API compresses prior context into an opaque, encrypted `compaction` item that carries key prior state and reasoning into future turns using fewer tokens.

> **Server-side compaction (`context_management`)**
> Pass `context_management: [{"type": "compaction", "compact_threshold": 200000}]` in `POST /v1/responses`. When the rendered token count crosses `compact_threshold`, the service automatically compacts the conversation in-stream, emits a `type: "compaction"` item, and continues generating the response.
> Server-side compaction is ZDR-friendly when used with `store=false`.
>
> - **When managing history via the `input` array (`store=false` or manual state):** After appending output items to the previous input items, you can drop items that came before the most recent compaction item to keep requests smaller.
> - **When chaining with `previous_response_id`:** Let the service manage history across turns; do not manually prune items.

> **Standalone `/responses/compact` endpoint**
> Call `POST /v1/responses/compact` when you want explicit control over when compaction runs. This endpoint is fully stateless and compatible with Zero Data Retention (ZDR).
> The returned `output` array is the compacted context window, which generally contains more than just the `compaction` item (for example, retained user messages plus the encrypted `compaction` item). Pass the returned `output` array directly as the `input` to your next `/v1/responses` call; do not manually prune items from the `/responses/compact` output.
> Note: The input passed to `/responses/compact` must still fit within the model's context window.

## 2. OpenAI API Reference: `POST /v1/responses/compact` (`https://developers.openai.com/api/reference/resources/responses/methods/compact`)

> Returns `object: "response.compaction"`.
> Example response:
> - `output`: contains retained `message` item (`role: "user"`) and `compaction` item (`type: "compaction"`, `id: "cmp_..."`, `encrypted_content: "..."`).
> - `usage`: `input_tokens: 42897`, `output_tokens: 12000`, `total_tokens: 54897`.

## 3. OpenAI Conversation State 指南摘录 (`https://developers.openai.com/api/docs/guides/conversation-state`)

> Even when using `previous_response_id`, all prior input tokens in the chain are billed as input tokens on each turn.

## 4. OpenAI 工程博客摘录 (`https://openai.com/index/equip-responses-api-computer-environment/`)

> **When the context window gets full: compaction**
> Models are trained to analyze prior conversation state and produce an encrypted representation that preserves key state in fewer tokens. A weaker version of this is prompting the model to summarize the conversation so far, which is not integrated with the model in the same way. With server-side compaction, the API can automatically compact in-stream during long-horizon tool loops without waiting to hand control back to the client.

## 5. `openai/codex` 源码摘录 (`de06fd0be4f465bc28c3111bdadaabda5dfdebcd`)

- `codex-rs/protocol/src/openai_models.rs:451-455, 1898-1922`:
  - `effective_context_window_percent` 默认 `95`（预留 5%）。
  - `auto_compact_token_limit` 默认设为模型 `context_window` 的 **90%**（例如 `400,000` 窗口对应 `360,000` tokens；`272,000` 窗口夹紧到 90% 即 `244,800` tokens）。
- `codex-rs/core/src/config/mod.rs:205` & `codex-rs/core/src/session/async_compaction.rs:73-77`:
  - `DEFAULT_ASYNC_COMPACTION_THRESHOLD_PERCENT: u8 = 65`（达到窗口 65% 时后台投机预压缩生成候选 checkpoint，到 90% 硬阈值时直接切换安装）。
- `codex-rs/core/src/compact_remote_v2.rs:394-414` & `codex-rs/core/src/compact_remote_history.rs`:
  - Codex 内部 `RemoteCompactionSupport::V2` 在普通 `/responses` 流末尾追加 `{"type": "compaction_trigger"}` 触发流式检查点压缩。
  - `COMPACT_USER_MESSAGE_MAX_TOKENS: usize = 64_000`：重建历史时丢弃旧 `FunctionCall`、`FunctionCallOutput`、Assistant 消息与旧 `Compaction` 项，保留最多 `64,000` tokens 预算内的真实用户消息 + 末尾 1 个加密 `compaction` 项，通过 `sess.replace_compacted_history(...)` 替换模型侧 `ContextManager`（本地 rollout/transcript 独立存储不受影响）。
  - `trim_function_call_history_to_fit_context_window` 在调压缩前先裁剪超限工具历史以装进单次上下文窗口。

## 6. 社区与开源 Agent 项目取舍摘录

### 6.1 NousResearch `hermes-agent` Issue `#33130` (2026-07)
- `@teknium1`（核心维护者，关闭为 won't-implement）：
  > In `codex_app_server` mode we use Codex's native thread compaction. For the general `codex_responses` chat path, replacing internal Compress with OpenAI's Compaction API is not desirable: the encrypted `compaction` item can only be decrypted by OpenAI, locking the session history to a single provider. Switching `/model` mid-session or triggering provider failover loses the entire compacted prefix, and the handoff summary becomes unreadable gibberish in `/recap`, session views, and WebUI.
- `@shariqriazz`（生产环境用户实测数据）：
  > In a `372K` context window session, compaction reduced a `354,425` token request (`218` messages) down to `59,713` input tokens on the next turn.
- `@2001Y` / `@shariqriazz`（折中提案）：
  > Keep a readable audit transcript and a plaintext shadow summary in the database for UI, `/recap`, and cross-model failover, while treating the OpenAI encrypted `compaction` item as a disposable, provider-stamped projection replayed only when continuing on the same OpenAI route.

### 6.2 OpenAI `openai/codex` Issue `#24618` (2026-05 ~ 2026-06)
- 用户报告：在 Codex Desktop 中，普通对话走 `responses_websocket` 正常，但自动压缩调用独立的 HTTP `POST /responses/compact` 端点时，可能挂起 `30-60` 分钟或返回 `HTTP 504 Gateway Timeout`。
- `@etraut-openai`（OpenAI 工程师，2026-06-29）：
  > Confirming that Codex recently switched compaction to use the same endpoint channel as normal conversation turns rather than the standalone remote compaction endpoint, eliminating standalone "remote compaction" errors.

### 6.3 AWS `strands-agents/harness-sdk` Issue `#5409` & `anomalyco/opencode` Issue `#5200`
- `strands-agents#5409`：提出接入 OpenAI 服务端压缩以在推理模型（reasoning models）上保留 encrypted reasoning 状态（客户端本地摘要会丢弃加密推理项），同时需处理跨 Provider 切换时丢弃无可读内容的加密块。
- `opencode#5200`：讨论支持 `/compact` 配置使用 OpenAI Responses API compaction（支持 `endpoint`、`trigger`、`contextManagement`）。

### 6.4 OMP `can1357/oh-my-pi` (`docs/compaction.md`)
- `compaction.methodOrder` 默认顺序：`["remote", "snapcompact", "handoff", "shake", "soft"]`。
- `remote` 优先尝试 V2 streaming（`compaction_trigger`），其次尝试 V1 `/responses/compact`；失败或当前模型不支持则自动按序回退到本地压缩策略。OpenAI 远程压缩只保存不可读的 replay payload 与占位提示；后续若需本地重新摘要，需从原始消息历史展开。

### 6.5 Kangwook Lee 博客：《Investigating How Codex Context Compaction Works》(2026-03-13)
- 开源 Codex CLI 对非 Codex 模型在本地调用 LLM 做总结（使用公开的 `codex-rs/core/templates/compact/prompt.md` 与 `summary_prefix.md`）；对 Codex 模型则调用远端 `compact()` 接口，返回 `gAAAAAB...` 开头的 Fernet（AES-128-CBC + HMAC-SHA256）密文块。
- 作者通过黑盒观测与开源模板比对发现：服务端 `responses.compact()` 内部同样调用 Compactor LLM 生成明文总结并加密返回，在 `responses.create()` 恢复时解密并拼上交接提示词（Handoff Prompt）。
- 提取出的服务端压缩提示词（`You are performing a CONTEXT CHECKPOINT COMPACTION. Create a handoff summary for another LLM that will resume the task...`）和交接提示词（`Another language model started to solve this problem and produced a summary of its thinking process. You also have access to the state of the tools that were used by that language model...`）与开源 Codex CLI 的 `prompt.md`、`summary_prefix.md` 几乎一致。
- 边界说明：作者将服务端管线标为 `best guess`（不同运行轮次结果有波动），且测试输入仅为一句简单纯文本（Zephyr-7 预算 `$234,500`），未测试包含工具调用的复杂会话，因此加密块在真实工具会话中是否还包含工具状态的额外恢复信息仍属开放问题（Open Question）。
