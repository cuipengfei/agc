# OMP 对 Gemini 摘要的采集、存储与 reasoning_text 回传链路取证

> Source: 本机已安装 `@oh-my-pi/pi-ai`（`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-ai/src/`）与 `@oh-my-pi/pi-catalog`（`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-catalog/src/`）源码直读, 2026-11-21; `/home/cpf/code-inside/copilot-api` 源码直读, 2026-11-21; OMP 会话记录 `~/.omp/agent/sessions/-code-inside-agc/2026-11-20T15-52-55-118Z_01a1f9a9-284e-773f-bc02-a208673e1ed7.jsonl` 直读, 2026-11-21; `~/.omp/agent/models.yml` 与用户级规则文件 `~/.omp/agent/AGENTS.md` 已加载内容摘录, 2026-11-21
> Collected: 2026-11-21
> Published: Unknown（本机源码与运行记录）

证据形态：**一手直读**＝逐字读取源码或会话文件；**观察**＝对运行产物的事实描述。

## ① 会话记录中的 thinking 块形态（一手直读）

会话文件第 19 行的 assistant 消息（字段节选，正文以 `...` 截断）：

```json
{"type":"message","message":{"role":"assistant","content":[{"type":"thinking","thinking":"**Responding with Chinese**\n\nI'm processing the instruction to always respond in Chinese, even if the user inputs English. This is to ensure a consistent communication style.\n\n**Answering Directly**\n\nI'm focusing on providing direct, clear Chinese answers to user queries, avoiding unnecessary elaborations or counter-questions. I am also mindful of the specific forbidden words and sentence structures.\n\n","thinkingSignature":"reasoning_text","summary":false},{"type":"text","text":"兄台，久候了。..."}],"api":"openai-completions","provider":"c8787-chat","model":"gemini-4-argon","stopReason":"stop"}}
```

同文件第 28 行的 thinking 块以 `**Considering User Input**` 开头，第 30 行以 `**Analyzing Advisory System**` 开头，第 33 行以 `**Adapting Language Settings**` 开头，均为英文动名词标题加 `I'm ...` 句式；这些消息的 `api` 均为 `openai-completions`、`provider` 为 `c8787-chat`、`model` 为 `gemini-4-argon`。

观察：该会话全部 thinking 块均为上述英文摘要格式。用户级规则文件 `~/.omp/agent/AGENTS.md` 的语言要求一节写有：

> 以下语言规则包括：思考、回答等自然语言内容。
>
> - **内部推理**: 中文

该规则对这条链路产生的 TUI thinking block 语言未产生可见约束（正文语言遵循规则输出中文，摘要仍为英文）。

## ② pi-ai 流式采集：三个 reasoning 字段择一（一手直读）

`@oh-my-pi/pi-ai/src/providers/openai-completions.ts` 第 1489–1536 行：

```ts
if (choice.delta) {
    // Some endpoints return reasoning in reasoning_content (llama.cpp),
    // or reasoning (other openai compatible endpoints). Use the first
    // non-empty reasoning field to avoid duplication when a chunk carries
    // multiple aliases for the same reasoning text.
    const reasoningFields = ["reasoning_content", "reasoning", "reasoning_text"];
```

同文件第 1189–1204 行 `openThinkingBlock` 构造的块：

```ts
const block: ThinkingContent = {
    type: "thinking",
    thinking: "",
    thinkingSignature: signature,
    summary: false,
};
```

流式到达的 `reasoning_text` 因此被存为 `thinkingSignature: "reasoning_text"` 的 thinking 块，与会话记录中的形态一致。

Gemini 消息级签名字段的识别清单（同文件第 158、177–180 行）：

```ts
type GeminiMessageThoughtSignatureField = "thinking_signature" | "thought_signature" | "reasoning_signature";

const GEMINI_MESSAGE_THOUGHT_SIGNATURE_FIELDS: readonly GeminiMessageThoughtSignatureField[] = [
    "thinking_signature",
    "thought_signature",
    "reasoning_signature",
];
```

观察：流式 reasoning 字段清单与该签名字段清单中都没有 `reasoning_opaque`；本会话取证未发现 `openai-completions` 路径对 `delta.reasoning_opaque` 的采集代码。

## ②b tool call 签名的采集与回放（一手直读）

tool call 级签名的命名空间定义与解析函数（同文件第 165–168、175、183–195 行）：

```ts
type GeminiThoughtSignatureNamespace = "google" | "vertex";

const GEMINI_THOUGHT_SIGNATURE_NAMESPACES: readonly GeminiThoughtSignatureNamespace[] = ["google", "vertex"];

function getGeminiThoughtSignatureExtraContent(value: unknown): GeminiThoughtSignatureExtraContent | undefined {
	if (typeof value !== "object" || value === null) return undefined;
	for (const namespace of GEMINI_THOUGHT_SIGNATURE_NAMESPACES) {
		const providerContent = Reflect.get(value, namespace);
		...
		if (typeof thoughtSignature !== "string" || thoughtSignature.length === 0) continue;
		return namespace === "google"
			? { google: { thought_signature: thoughtSignature } }
			: { vertex: { thought_signature: thoughtSignature } };
	}
	return undefined;
}
```

流式采集（第 1660–1665 行，tool call delta 上的 `extra_content`）：

```ts
const extraContent = getGeminiThoughtSignatureExtraContent(Reflect.get(toolCall, "extra_content"));
if (extraContent) {
    block.thoughtSignature = mergeStoredGeminiSignature(block.thoughtSignature, {
        perCall: extraContent,
    });
}
```

回放写回（第 2799–2808 行）：每个 `toolCall` 块把 `stored?.perCall` 写回 `replayedToolCall.extra_content`，消息级签名写回 `assistantMsg[messageSignature.field]`：

```ts
const stored = normalizeStoredGeminiSignature(parseStoredThoughtSignature(tc.thoughtSignature));
const extraContent = getGeminiThoughtSignatureExtraContent(stored?.perCall);
if (extraContent) replayedToolCall.extra_content = extraContent;
...
const messageSignature = getGeminiMessageThoughtSignature(stored?.message);
if (!messageSignature) continue;
assistantMsg[messageSignature.field] = messageSignature.signature;
```

另外第 1724–1733 行还解析 `reasoning_details` 中 `type === "reasoning.encrypted"` 的条目，按工具调用 id 合并进对应 `toolCall` 块的 `thoughtSignature`。

结论：OMP 采集并回放 tool call 的 Gemini 签名（`extra_content.google.thought_signature` / `extra_content.vertex.thought_signature`）；文本 thinking 摘要本身没有签名（其 `thinkingSignature` 只是字段名标记 `"reasoning_text"`），且 reasoning 文本流解析未读取 `delta.reasoning_opaque`。Google thought-signatures 文档的 Chat Completions 一节同样把签名放在 tool call 的 `extra_content.google.thought_signature`。

## ③ pi-catalog 环回判定与 replayReasoningContent（一手直读）

`@oh-my-pi/pi-catalog/src/compat/resolve.ts` 第 365–367 行：

```ts
const isLocalOpenAICompatBackend =
    PROXY_OPENAI_COMPAT_PROVIDERS[backendProvider] !== true &&
    (LOCAL_OPENAI_COMPAT_PROVIDERS[backendProvider] === true || hasLocalLoopbackBaseUrl(baseUrl));
```

第 560 行的默认赋值：

```ts
replayReasoningContent: d.isLocalOpenAICompatBackend,
```

`pi-catalog` 的 CHANGELOG（`[16.1.22] - 2026-06-26`）说明该标志的启用范围：

> Added `OpenAICompat.replayReasoningContent` — auto-enabled for the built-in local OpenAI-compatible providers (`llama.cpp`, `lm-studio`, `vllm`, `ollama` on `openai-completions`) and for any provider pointed at a loopback / RFC1918 / `*.local` baseUrl.

本机 `~/.omp/agent/models.yml` 的 `c8787-chat` 条目（apiKey 为脱敏占位，不摘录原值）：

```yaml
c8787-chat:
  baseUrl: http://localhost:8787/v1
  apiKey: <REDACTED>
  api: openai-completions
  ...
      - id: gemini-4-argon
        compat:
          extraBody:
            tool_choice: validated
```

`baseUrl` 为环回地址，命中 `hasLocalLoopbackBaseUrl` 判定，因此该 provider 的 `replayReasoningContent` 自动为 `true`。

## ④ convertMessages 把 thinking 块写回 reasoning_text（一手直读）

`@oh-my-pi/pi-ai/src/providers/openai-completions.ts` 第 2662–2685 行：

```ts
} else if (compat.replayReasoningContent) {
    // Local llama.cpp-style servers (llama.cpp, LM Studio, vLLM, Ollama
    // in openai-completions mode, custom providers pointed at a
    // loopback baseUrl) re-tokenize the entire prompt every request.
    ...
    const signature = nonEmptyThinkingBlocks[0].thinkingSignature;
    const reasoningField: OpenAICompletionsReasoningField =
        signature === "reasoning_content" || signature === "reasoning" || signature === "reasoning_text"
            ? signature
            : (compat.reasoningContentField ?? "reasoning_content");
    assistantMsg[reasoningField] = nonEmptyThinkingBlocks.map(b => b.thinking).join("\n");
}
```

已存块的 `thinkingSignature` 为 `"reasoning_text"` 时，后续请求的 assistant 消息携带 `reasoning_text` 字段，值为历史 thinking 块文本按 `\n` 拼接。

## ⑤ copilot-api 把请求体转发 CAPI（一手直读）

`/home/cpf/code-inside/copilot-api/src/services/copilot/create-chat-completions.ts` 第 119–141 行：

```ts
const url = `${copilotBaseUrl(state)}/chat/completions`
...
const response = await sendCopilotRequest(url, {
    headers,
    payload: upstreamPayload,
    clientSignal: options?.clientSignal,
    transportConfig: getUpstreamTransportConfig(),
})
```

`upstreamPayload` 即客户端提交的 `/v1/chat/completions` 请求体（含 messages 内的 `reasoning_text` 字段），除 `reasoning_effort` 归一外原样转发。

## ⑥ 未配对签名的明文 reasoning 的适用范围标注（一手直读注释）

`@oh-my-pi/pi-ai/src/dialect/demotion.ts` 第 7–9 行注释：

```ts
 * Wrap a prior-turn reasoning string for demotion into native conversation
 * history — the cross-provider / cross-model case where the target cannot
 * replay it as a structured thinking block (verified end-to-end against Gemini
 * 3: a replayed unsigned `thought` part is schema-accepted but silently
 * discarded — neither recalled nor influencing generation).
```

该结论针对原生 Gemini 协议的 `thought` part 重放。当前链路走 Copilot `/chat/completions` 的 `reasoning_text` 字段，字段与协议均不同，该结论不直接平移。

## ⑦ 边界与未验证项

- 文本 thinking 摘要无签名可回传；OMP 采集并回放的是 tool call 级签名（见 ②b）。CAPI 收到仅有 `reasoning_text`、无 tool call 签名配对的请求时，是否将摘要文本注入后端 Gemini 模型上下文并影响生成：公开资料无说明。本机 `copilot-api` 源码中 `reasoning_opaque` 只出现在类型定义（`src/lib/types/chat-completions.ts`）、流式转发（`src/lib/chat-completions-stream.ts`）、thinking 错误重试的剥离（`src/services/copilot/chat-completions-compat.ts`）与 Claude 协议翻译路径中，未见赋予生成语义的处理。
- 「后续请求携带 `reasoning_text`」由 `convertMessages` 代码路径与环回判定共同推出，本会话未抓包核对出站请求体的实际字段值。
- 先前同链路（`c8787-chat/gemini-4-argon`）的 `validated` 取值取证见 `raw/model-gateway-mismatch/2026-11-11-copilot-chat-generation-failure-and-validated-probe.md`。
