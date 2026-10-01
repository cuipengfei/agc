# Raw: Snapcompact 机制源码取证（2026-10-01）

来源：本机 OMP 上游源码树 `/home/cpf/code-inside/oh-my-pi`（HEAD 73a11421fe，v18.2.11-58）；本机 copilot-api 源码树 `/home/cpf/code-inside/copilot-api`；本机 OMP 配置 `~/.omp/agent/`。取证日期 2026-10-01。

## README（packages/snapcompact/README.md）摘录

- "Bitmap-frame context compression for vision-capable LLMs. Instead of asking an LLM to summarize discarded conversation history, snapcompact serializes it and renders the text into dense PNG frames of pixel-font glyphs that vision models read back directly. The whole pass is local and deterministic — no LLM call, no API key, no latency beyond rendering. Rasterization and PNG encoding happen in native code (`@oh-my-pi/pi-natives`)."
- How it works: "1. Discarded history is serialized to compact text (`serializeConversation`), with per-tool-result and per-argument character caps. 2. Text is normalized for the selected native font (`normalize`): ANSI sequences stripped, whitespace collapsed, newline runs folded into a single full-block glyph, box drawing and compatibility symbols folded to ASCII, semantic emoji folded to ASCII labels, decorative emoji dropped... 3. Pages of text are rasterized into PNG frames (`render` / `renderMany`). Frame width is fixed per shape; height hugs the rows actually printed... 4. Frames persist in the compaction entry's `preserveData` and are re-attached to the summary message on every context rebuild."
- 形状表: "Anthropic | `11on16-bw` | X.org 8x13 glyphs on an 11px advance; high-res Claude lines get 1932px frames"; "Google | `8on22-bw` @2048 | X.org 8x13 glyphs on a 22px pitch; Gemini bills a fixed per-image budget, so larger frames are free chars"; "OpenAI | `8on22-bw` | X.org 8x13 glyphs on a 22px pitch, sent at `detail: "original"`"; "Unknown | Anthropic shape | Per-provider image-count budgets guard against gateways that silently drop frames"。
- "`resolveShape({ api, id })` matches the model id, not just the wire API — a Claude routed through Vertex or OpenRouter keeps its Claude shape, priced for the gateway actually carrying the request."
- "East Asian (CJK/Kana/Hangul) glyphs render full-width across two cells so they stay legible in the narrow ASCII grid."
- compact() 返回: "result.summary — short "resume prior conversation" lead-in, reading guide, and FILES section; result.preserveData — bounded archive source + rendered image middle"。

## snapcompact.ts 常量与注释（packages/snapcompact/src/snapcompact.ts）

- :259-277 SHAPES 表注释: anthropic `11on16-bw` "Tool-result legibility bench (real search/read/find output, structure QA) on opus-4.8: f1 .806 vs .755 for plain `8on16-bw` and .351 for the prior `6x12-dim` default — letter-spacing the readable cell wins; the dense 6x12 was below the OCR ~16px/char floor and abstained."; google `8on22-bw` "bench on gemini-3.5-flash: f1 .934 vs .807 for plain `8on16-bw`"; openai `8on22-bw` "bench on gpt-5.5/gpt-5.4-mini showed leading lifts recall"。
- :308-324 FAMILY_VARIANT: anthropic "11on16-bw"、google/openai/unknown "8on22-bw"；FAMILY_VARIANT_LOW（foveated 中段更密变体）: 全部 "8on16-bw"，注释 "a tighter 8px cell, trading some legibility for ~40% more chars per frame so the least-important middle of a long archive compresses into fewer frames"。
- :345-363 MODEL_VARIANTS: opus 4.7+/fable/mythos → { variant: "11on16-bw", frameSize: 1932 }，注释 "1932 is the largest *square* not downscaled under Anthropic's 4,784 visual-token cap ((1932/28)² = 69² = 4,761 ≤ 4,784 28px patches), and staying below 2000px clears the stricter ≤2000px limit for requests with more than 20 images"；gemini → { "8on22-bw", frameSize: 2048 }，注释 "Gemini 3.x bills a fixed 1,120-token budget per image regardless of pixels: 2048px packs more chars per frame at the same bill"；gpt|codex → { "8on22-bw" }，注释 "gpt-5.5 patch billing is area-proportional; 1568 is already optimal"；kimi → { "8on22-bw" }，注释 "kimi-k3 chunked bench: `8on22-bw` scored f1 .915 @ $0.66 vs .813 on `8on16-bw` ($0.70); 1568 wins on chars/$ (image processor downscales past 1792px)"；glm → { "8on16-bw" }，注释 "glm-4.6v .780 mono via direct vendor routing"。
- :464-475: `MAX_FRAMES_DEFAULT = 80`；`HQ_EDGE_FRAMES = 3`；`FRAME_TOKEN_ESTIMATE = 5024`。
- :500-520: "Per-request image-count budgets by provider id. These cap how many images an entire request may carry (archive/system-prompt/tool-result imaging combined). The values are conservative policy caps under the vendor hard limits (Anthropic 100, OpenAI 500, Gemini ~2500); unknown providers fall to a safe floor rather than sending unbounded attachments." PROVIDER_IMAGE_BUDGETS: anthropic 90, amazon-bedrock 90, openai 200, openai-codex 200, google 200, google-vertex 200, google-gemini-cli 200, openrouter 90, umans 10。`DEFAULT_PROVIDER_IMAGE_BUDGET = 5`，注释 "Safe floor for unknown providers (strictest mainstream measured: Groq ~5)"。
- :527-530: `providerFrameBudget(provider) = Math.min(providerImageBudget(provider), MAX_FRAMES_DEFAULT)`。:533: `PRESERVE_KEY = "snapcompact"`。

## session-maintenance.ts 选择逻辑（packages/coding-agent/src/session/session-maintenance.ts）

- :1112-1138 方法循环: remote 需 `canUseRemoteCompaction`；snapcompact 需 `explicitSnapcompact || (!customInstructions && !options?.internalGuidance && activeModel.input.includes("image"))`；soft 无条件可选。
- :1213-1217: "Claude refuses inputs that reproduce its own reasoning as text ("reasoning_extraction"), and the snapcompact archive is replayed as text into every later request; drop `¶think:` sections for Anthropic-dialect targets (issue #6093)" — `snapcompactIncludeThinking = preferredDialect(this.#model.id) !== "anthropic"`。
- :1218-1224 vision guard: `if (wantsSnapcompact && !this.#model.input.includes("image"))` → emitNotice "snapcompact needs a vision-capable model (... is text-only)" 并 throw。
- :1236-1247: `scanRenderability` 不安全时 emitNotice "snapcompact disabled: unsupported characters for selected snapcompact font (X%)" 并 throw。
- :1257-1260 注释: "Snapcompact runs locally first. The frame cap is sized from the live model window via #computeSnapcompactMaxFrames so the post-render context fits without the warning loop (issue #3247). A local blocker rejects this method, allowing the configured preference order to continue."
- :3428-3435 #computeSnapcompactMaxFrames 无窗口信息分支: `Math.min(snapcompact.MAX_FRAMES_DEFAULT, snapcompact.maxFramesForDataBudget(), snapcompact.providerFrameBudget(this.#model?.provider))`。
- :3449-3464 注释: textHead/textTail 各消费至多 geometry.capacity 字符（TEXT_EDGE_PAGES = 1）；"Per-shape capacity: Anthropic 11on16-bw ~13.9k, Opus 1932px ~21k, Gemini 8on22-bw 2048px ~23.8k, OpenAI 1568px ~13.9k"；"tiktoken cl100k ≈ 4 chars/token on ASCII (verified empirically for prose, code, and JSON)"；"Summary template ... bills ~2k tokens for typical sessions"。

## compaction-methods.ts（packages/coding-agent/src/session/compaction-methods.ts）

- :19-22 snapcompact 选项描述: "Archive history onto dense bitmap images the active vision model reads back; no LLM call"。
- :43-50: `DEFAULT_COMPACTION_METHOD_ORDER = ["remote", "snapcompact", "handoff", "shake", "soft"]`，注释 "Default fallback order: server-native first, portable summary last"。

## settings-schema.ts inline imaging（packages/coding-agent/src/config/settings-schema.ts）

- :2736-2746 `snapcompact.systemPrompt`: "Experimental: snapcompact inline imaging (transient, per-request; never persisted)"；"render selected system prompt text as dense PNG image(s) and attach to the first user message (vision models only). Saves tokens; loses prompt caching for imaged text." 默认 "none"（none/agents-md/all）。
- :2763-2771 `snapcompact.toolResults`（bool，默认 false）: "render large historical tool results as dense PNG image(s) instead of text (vision models only). Saves tokens on accumulated read/search output."
- :2821-2830 `snapcompact.shape`（默认 "auto"）: "Frame shape snapcompact prints text with (compaction archive and inline imaging). Auto picks a shape tuned for the current model."

## CHANGELOG 坑位摘录

- packages/agent/CHANGELOG.md :767: "Added the `snapcompact` compaction strategy via `@oh-my-pi/snapcompact`: instead of an LLM summary, discarded history is printed onto dense bitmap frames and re-attached to the compaction summary message as image blocks. `CompactionSummaryMessage` gains an optional `images` field, `estimateTokens()` charges per attached frame, and frames persist under `preserveData.snapcompact` with an 8-frame middle-out eviction budget."
- 同文件 :768（紧接上条）: "Snapcompact frames are now rendered in a provider-aware shape (`SNAPCOMPACT_SHAPES` + `resolveSnapcompactShape(api)`), following the snapcompact 200k-token monolithic evals: Anthropic-family and unknown APIs get `8x8r-bw` (unscii-8 square cells, black ink, every line printed twice with the copy on a pale highlight band — read at F1 parity with raw text at ~2x lower cost and the most refusal-robust), Google gets `8x8r-sent` (sentence-hue ink, ~2.9x cheaper), and OpenAI gets `6x6u-sent` (unscii Lanczos..."（注：此为旧形状表，当前态以 README 与 SHAPES 常量为准；wiki 文中收益数字 "约 2 倍 / 约 2.9 倍" 出自此条；文中 1120/4761/4784 为 raw 引文 1,120/4,761/4,784 的去逗号写法）
- 同文件 :519 附近（16.1.18+ Fixed）: "Fixed stale snapcompact archive frames leaking into context-full compaction after `compaction.strategy` was switched from `snapcompact` to `context-full`... inflating context/token usage and making sessions appear to compact early (around ~60% apparent window use)."
- packages/coding-agent/CHANGELOG.md :1416: "Fixed `snapcompact` compaction frames larger than the persistence limit being truncated into invalid image base64 on session resume, which made the provider reject every subsequent request with HTTP 400; already-corrupted archives now resume from their retained source text instead ([#9901])."
- 同文件 :1393: "Fixed Snapcompact so it skips or falls back when compaction would not reduce context size, and now compacts text in mixed tool results while preserving all source images."
- packages/ai/CHANGELOG.md :1891: "Fixed GitHub Copilot Responses requests rejecting image inputs that carry the `detail: "original"` hint with an HTTP 400 by degrading the hint to `"auto"` for hosts that do not support it; other hosts still preserve native-resolution frames (snapcompact). ([#2822])"
- packages/catalog/CHANGELOG.md :1326: "Added a `supportsImageDetailOriginal` compat flag that resolves to `false` for GitHub Copilot, whose Responses endpoint rejects the `detail: "original"` image hint with a 400, and `true` for every other host. ([#2822])"

## detail:"original" 链（packages/ai）

- src/types.ts :804-809: "OpenAI-only resolution hint. `"original"` preserves native resolution (required for snapcompact frames, whose glyphs do not survive the default `auto` downscale). Providers without a detail knob ignore it."
- test/github-copilot-long-context-wire.test.ts :120-125: "GitHub Copilot's Responses endpoint rejects the `detail: "original"` image hint (an oh-my-pi extension that preserves native-resolution snapcompact frames) with an HTTP 400. The catalog resolves `supportsImageDetailOriginal` to `false` for Copilot, and the Responses request builder degrades the hint to `"auto"` so the wire stays valid. Every other host preserves `"original"`."；:207-223 另有 "clamps `original` when only the base URL identifies Copilot (provider id differs)" 用例。
- packages/catalog/src/hosts.ts :34: `githubCopilot: { providers: ["github-copilot"], urlMarkers: ["githubcopilot.com", "copilot-api."] }`。
- packages/catalog/src/resolve.ts :725: `supportsImageDetailOriginal: !isXaiHost && !modelMatchesHost(hostModel, "githubCopilot")`。
- packages/agent/src/compaction/compaction.ts :1484-1486: `openAiCompatSupportsImageDetailOriginal` 要求 `compat.supportsImageDetailOriginal === true` 才保留。

## 归档迁移（packages/agent/src/compaction/compaction.ts）

- :756-767: `mergePreviousSummaryWithSnapcompactArchive`——下一次 LLM 摘要式压缩把旧归档源文本折进 previousSummary。
- :2026-2032 注释: "This LLM-summary path migrated any prior snapcompact frames into the summary text above; strip the now-stale frame archive from preserveData so it cannot re-attach to the rebuilt context."
- packages/agent/src/compaction/messages.ts :59-64: CompactionSummaryMessage 的 `blocks`（"Runtime-only ordered archive blocks for snapcompact: old text region, imaged middle, then new text region"）与 `images` 字段。
- packages/agent/src/tokenizer.ts :297-304: 消息带 blocks/images 时按 `snapcompact.FRAME_TOKEN_ESTIMATE` 逐帧计费，注释 "Snapcompact frames render at ≥1568px; providers bill the downscaled cap."

## 本机环境取证（~/.omp/agent/）

- models.yml provider 块: `openai-codex`（baseUrl http://localhost:8787/v1，api openai-codex-responses）；`c8787`（baseUrl http://localhost:8787/v1，api openai-responses，`compat: supportsImageDetailOriginal: false`）；`c8787-chat`（baseUrl http://localhost:8787/v1，api openai-completions）。
- models.yml :7-13 openai-codex 块 gpt-5.6-luna: input 仅 [text]；:84-101 c8787 块 gpt-6-luna/gpt-6-sol: input [text, image]。
- config.yml :280-298: `compaction: enabled: true; midTurnEnabled: true; thresholdPercent: 90; methodOrder: [shake, soft]; experimentalContextManagement: true`。
- config.yml modelRoles: `commit: c8787/gpt-5.6-luna:medium`、`vision: c8787/gpt-5.6-luna:medium`、`memory: c8787/gpt-5.6-luna:high`、`web: openai-codex/gpt-5.6-luna`。

## 本机 copilot-api relay 取证（/home/cpf/code-inside/copilot-api）

- src/routes/responses/utils.ts :203-224 `normalizeInputImageDetails`: 遍历 payload.input 的 input_image，`image.detail === undefined || VALID_INPUT_IMAGE_DETAILS.has(image.detail)` 则跳过，否则 `image.detail = "auto"` 并计数。
- src/routes/responses/handler.ts :204-208 调用点，debug 日志: "Normalized N unsupported input image detail value(s) before forwarding to Copilot Responses"。
- src/types/responses.ts :236-239: `ResponseInputImage.detail?: "low" | "high" | "auto"`；src/types/chat-completions.ts :188-191 同。
