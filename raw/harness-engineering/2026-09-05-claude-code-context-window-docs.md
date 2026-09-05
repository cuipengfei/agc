# Claude Code 上下文窗口与自动压缩相关环境变量（官方文档摘录）

> Source: Claude Code 官方文档 env-vars 与 model-config 页
> Collected: 2026-09-05
> Published: Unknown

来源 URL：

- `https://code.claude.com/docs/en/env-vars`
- `https://code.claude.com/docs/en/model-config`

以下为原文摘录。

## `CLAUDE_CODE_AUTO_COMPACT_WINDOW`

> Set the [auto-compact window](/docs/en/model-config#set-the-auto-compact-window) in tokens, from `100000` to `1000000`. Accepts a plain integer such as `500000` only: a value like `500k` reads as `500` and clamps to the 100K minimum. The effective window is also capped at the model's context window. Takes precedence over the `/autocompact` command, the `--autocompact` flag, and the `autoCompactWindow` setting. The status line's `used_percentage` always measures against the model's full context window, so once this variable is set, that percentage no longer indicates when compaction will run

## `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`

> Set the percentage (1-100) of the auto-compact window at which auto-compaction triggers. Use lower values like `50` to compact earlier; the variable can't raise the threshold, so values above the default percentage are ignored. It applies only in sessions that [compact before the model's context limit](/docs/en/model-config#context-window-and-auto-compaction). Applies to both main conversations and subagents

## `CLAUDE_CODE_MAX_CONTEXT_TOKENS`

> Override the context window size Claude Code assumes for the active model. As of v2.1.193, how it applies depends on how Claude Code resolves the model ID; see [Correct the window for a gateway or custom model ID](/docs/en/model-config#correct-the-window-for-a-gateway-or-custom-model-id). Use this when routing to a model through `ANTHROPIC_BASE_URL` whose context window does not match the built-in size for its name

## `CLAUDE_CODE_MAX_OUTPUT_TOKENS`

> Set the maximum number of output tokens for most requests. Defaults and caps vary by model; see [max output tokens](https://platform.claude.com/docs/en/about-claude/models/overview#latest-models-comparison). Claude Code defaults to 32000 for model IDs it doesn't recognize, such as gateway-specific names, and lowers values above a model's cap to the cap. Increasing this value reduces the effective context window available before [auto-compaction]

## model-config：Correct the window for a gateway or custom model ID

> On an [LLM gateway](/docs/en/llm-gateway) or other custom deployment, Claude Code can assume a context window for the model ID that differs from the model's real window, whether or not it resolves the ID to a Claude model. [`CLAUDE_CODE_MAX_CONTEXT_TOKENS`](/docs/en/env-vars) declares the window Claude Code should assume instead. How the variable applies depends on the ID. An unrecognized ID, an unrecognized `[1m]` ID, and an ID that starts with `claude-` or resolves to a Claude model are three separate cases:
>
> * If the ID doesn't start with `claude-` or contain `[1m]`, in any casing, and Claude Code can't resolve it to a Claude model, the variable applies directly and proactive compaction continues at the declared window.
> * If the ID doesn't start with `claude-` but contains `[1m]`, in any casing, and Claude Code can't resolve it to a Claude model, Claude Code assumes a 1M window for it and the variable doesn't apply on its own. To correct the window while keeping proactive compaction, also set [`CLAUDE_CODE_DISABLE_1M_CONTEXT=1`](/docs/en/env-vars). With a declared window above 200K, Claude Code then shows a [startup warning](/docs/en/errors#the-200k-limit-isnt-enforced) that the 200K limit isn't enforced. The warning is expected in this configuration.
> * If the ID starts with `claude-` in any casing or resolves to a Claude model, the variable takes effect only when [`DISABLE_COMPACT`](/docs/en/env-vars) is also set, which disables all compaction. For example, Claude Code resolves an ID that contains a Claude model name, such as `anthropic/claude-opus-4-8` or `us.anthropic.claude-…-v1:0`, to that model. This includes IDs that also contain `[1m]`: Claude Code resolves `claude-opus-4-8[1m]` to Opus 4.8 even with `CLAUDE_CODE_DISABLE_1M_CONTEXT` set.

同一节末尾：

> For a model ID Claude Code doesn't recognize, set [`CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT=1`](/docs/en/env-vars) to have Claude Code compact only after the API rejects the conversation with a [too-long error Claude Code recognizes](/docs/en/errors#prompt-is-too-long). Claude Code doesn't run that recovery when a gateway [rewrites the error](/docs/en/llm-gateway-connect#troubleshoot-gateway-errors) to wording Claude Code doesn't recognize.

## model-config：gateway 模型发现

> For LLM gateway deployments, Claude Code can populate the picker from the gateway's `/v1/models` endpoint when `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1` is set, so this variable is needed only when discovery is disabled or does not return the model you want.

## 检索边界

在 env-vars 页对 `CLAUDE_CODE_CONTEXT_LIMIT` 的检索没有命中任何条目。
