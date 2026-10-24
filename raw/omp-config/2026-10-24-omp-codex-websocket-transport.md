# OMP Codex WebSocket 传输判定（源码摘录）

> Source: 本机安装的 `@oh-my-pi/pi-ai`、`@oh-my-pi/pi-coding-agent`、`@oh-my-pi/pi-catalog`，版本均为 18.12.6，路径 `/home/cpf/.bun/install/global/node_modules/@oh-my-pi/`
> Collected: 2026-10-24
> Published: Unknown

以下为相关源码的逐字摘录，行号对应当前安装版本。

## api 到 stream 实现的分派

`pi-ai/src/stream.ts:941-968`：

```ts
		case "openrouter":
		case "openai-completions":
			return streamOpenAICompletions(providerModel as Model<"openai-completions">, context, {
				...(providerOptions as OpenAICompletionsOptions),
				waitForTerminalDrain: limited,
			});

		case "openai-responses":
			return streamOpenAIResponses(
				providerModel as Model<"openai-responses">,
				context,
				providerOptions as OptionsForApi<"openai-responses">,
			);

		case "azure-openai-responses":
			return streamAzureOpenAIResponses(
				providerModel as Model<"azure-openai-responses">,
				context,
				providerOptions as OptionsForApi<"azure-openai-responses">,
			);

		case "openai-codex-responses":
			return streamOpenAICodexResponses(
				providerModel as Model<"openai-codex-responses">,
				context,
				providerOptions as OptionsForApi<"openai-codex-responses">,
			);
```

## 两条非 Codex 实现走 HTTP 与 SSE

`pi-ai/src/providers/openai-responses.ts:892`：

```ts
					const { events, response, requestId } = await postOpenAIStream<ResponseStreamEvent>({
						url: requestUrl,
						headers: headersWithTimeout,
						body: requestParams,
						signal: requestSignal,
```

`pi-ai/src/providers/openai-completions.ts:935`：

```ts
					const { events, response, requestId } = await postOpenAIStream<ChatCompletionChunk>({
						url: completionsUrl,
						headers: headersWithTimeout,
						body: params,
						signal: requestSignal,
						maxAttempts: options?.maxHttpAttempts,
```

`pi-ai/src/utils/openai-http.ts:100-139`：

```ts
export async function postOpenAIStream<TEvent>(init: OpenAIStreamRequestInit): Promise<OpenAIStreamHandle<TEvent>> {
	let response: Response;
	try {
		response = await fetchWithRetry(init.url, {
			method: "POST",
			headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...init.headers },
			body: JSON.stringify(init.body),
			signal: init.signal,
			fetch: init.fetch,
			maxAttempts: init.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
```

```ts
	return {
		events: decodeStream<TEvent>(response.body, init.signal, init.onSseEvent, init.onDoneSentinel),
		response,
		requestId: response.headers.get("x-request-id"),
	};
```

对 `openai-responses.ts`、`openai-completions.ts`、`openai-http.ts` 三个文件检索 `WebSocket` 与 `websocket`，命中数为 0。

## 全局设置项

`pi-coding-agent/src/session/settings.ts:1097-1113`：

```ts
export const cfgProvidersOpenaiWebsockets = register({
	id: "providers.openaiWebsockets",
	type: "enum",
	values: ["auto", "off", "on"] as const,
	default: "auto",
	ui: {
		tab: "providers",
		group: "Protocol",
		label: "OpenAI WebSockets",
		description: "Websocket policy for OpenAI Codex models (auto uses model defaults, on forces, off disables)",
		options: [
			{ value: "auto", label: "Auto", description: "Use model/provider default websocket behavior" },
			{ value: "off", label: "Off", description: "Disable websockets for OpenAI Codex models" },
			{ value: "on", label: "On", description: "Force websockets for OpenAI Codex models" },
		],
	},
});
```

`pi-coding-agent/src/session/settings-stream-fn.ts:40-44`：

```ts
/** Map `providers.openaiWebsockets` to the provider `preferWebsockets` hint (`auto` → model default). */
export function resolveOpenAIWebsocketPreference(settings: Settings): boolean | undefined {
	const setting = cfgProvidersOpenaiWebsockets.get(settings);
	return setting === "on" ? true : setting === "off" ? false : undefined;
}
```

## 环境变量与偏好查询

`pi-ai/src/providers/openai-codex-transport.ts:1-18` 全文：

```ts
import { $env, $flag } from "@oh-my-pi/pi-utils";
import type { Model } from "../types";

/** Read the optional process-wide Codex WebSocket override. */
export function getOpenAICodexWebSocketEnvValue(): boolean | undefined {
	return $env.PI_CODEX_WEBSOCKET === undefined ? undefined : $flag("PI_CODEX_WEBSOCKET");
}

/** Resolve the public WebSocket preference using env, caller, then model precedence. */
export function isOpenAICodexWebSocketPreferred(
	model: Model<"openai-codex-responses">,
	options?: { preferWebsockets?: boolean },
): boolean {
	const envValue = getOpenAICodexWebSocketEnvValue();
	if (envValue !== undefined) return envValue;
	if (options?.preferWebsockets === false) return false;
	return options?.preferWebsockets === true || model.preferWebsockets === true;
}
```

## 实际请求判定

`pi-ai/src/providers/openai-codex-responses.ts:3536-3551`：

```ts
function shouldUseCodexWebSocket(
	model: Model<"openai-codex-responses">,
	state: CodexWebSocketSessionState | undefined,
	preferWebsockets?: boolean,
): boolean {
	// Explicitly disabled by the model or session state.
	if (model.preferWebsockets === false) return false;
	// Explicitly disabled by the session state.
	if (!state || state.disableWebsocket) return false;
	// Env val > Preference
	const envVal = getOpenAICodexWebSocketEnvValue();
	if (envVal !== undefined) return envVal;
	// Negative preference overrides model preference; otherwise use the model's preference.
	if (preferWebsockets === false) return false;
	return true;
}
```

## 传输状态字段

`pi-ai/src/providers/openai-codex-responses.ts:3553-3564`：

```ts
export interface OpenAICodexTransportDetails {
	websocketPreferred: boolean;
	lastTransport?: CodexTransport;
	websocketDisabled: boolean;
	websocketConnected: boolean;
	fallbackCount: number;
	canAppend: boolean;
	prewarmed: boolean;
	hasSessionState: boolean;
	hasTurnState: boolean;
```

## URL 协议替换

`pi-ai/src/providers/openai-codex-responses.ts:3895-3903`：

```ts
function toWebSocketUrl(url: string): string {
	const parsed = new URL(url);
	if (parsed.protocol === "https:") {
		parsed.protocol = "wss:";
	} else if (parsed.protocol === "http:") {
		parsed.protocol = "ws:";
	}
	return parsed.toString();
}
```

## beta 头取值与按传输选择

`pi-catalog/src/wire/codex.ts:67-72`：

```ts
export const OPENAI_HEADER_VALUES = {
	BETA_RESPONSES: "responses=experimental",
	BETA_RESPONSES_WEBSOCKETS_V2: "responses_websockets=2026-02-06",
	REMOTE_COMPACTION_V2: "remote_compaction_v2",
	ORIGINATOR_CODEX: "omp",
} as const;
```

`pi-ai/src/providers/openai-codex-responses.ts:4870-4878`：

```ts
	const betaHeader =
		transport === "websocket"
			? OPENAI_HEADER_VALUES.BETA_RESPONSES_WEBSOCKETS_V2
			: OPENAI_HEADER_VALUES.BETA_RESPONSES;
	headers.delete(OPENAI_HEADERS.BETA);
	headers.delete("openai-beta");
	headers.set(OPENAI_HEADERS.BETA, betaHeader);
	headers.set(OPENAI_HEADERS.ORIGINATOR, OPENAI_HEADER_VALUES.ORIGINATOR_CODEX);
	headers.set(OPENAI_HEADERS.VERSION, codexClientVersion);
```

## 帧内信息通道

`pi-ai/src/providers/openai-codex-responses.ts:1944-1959`：

```ts
	// WebSocket frames cannot carry per-request HTTP headers. Canonical Codex
	// request identity is already in `client_metadata`; connection-scoped
	// compatibility values that can change after the upgrade ride alongside it
	// on every `response.create`.
	const websocketClientMetadata = { ...chainedBody.client_metadata };
	if (requestContext.responsesLite) {
		websocketClientMetadata[CODEX_WS_RESPONSES_LITE_CLIENT_METADATA_KEY] = "true";
	}
	if (requestContext.turnState.value) {
		websocketClientMetadata[X_CODEX_TURN_STATE_HEADER] = requestContext.turnState.value;
	}
	let websocketRequest = {
		type: "response.create",
		...chainedBody,
		client_metadata: websocketClientMetadata,
	};
```

`pi-ai/src/providers/openai-codex-responses.ts:2498-2508`：

```ts
		if (eventType === "response.metadata") {
			// The WebSocket transport has no per-response HTTP headers; codex-rs
			// mirrors them into this event's `headers` and reads
			// `x-codex-turn-state` from there (ResponsesStreamEvent::turn_state).
			// Capture only the first non-empty value so same-turn follow-ups keep
			// the server's original sticky-routing token on either transport.
			updateCodexSessionMetadataFromHeaders(
				this.requestContext.turnState,
				this.requestContext.websocketState,
				toCodexHeaders(rawEvent.headers),
			);
```

## 失败后转入 SSE

`pi-ai/src/providers/openai-codex-responses.ts:308-309`：

```ts
/** Connection-level websocket failures that should immediately fall back to SSE without retrying. */
const CODEX_WEBSOCKET_FATAL_PATTERNS = ["websocket error:", "websocket closed before open", "connection timeout"];
```

`pi-ai/src/providers/openai-codex-responses.ts:1670-1719`：

```ts
	const { transformedBody, websocketState } = requestContext;
	if (websocketState && shouldUseCodexWebSocket(model, websocketState, options?.preferWebsockets)) {
		const websocketRetryBudget = CODEX_WEBSOCKET_RETRY_BUDGET;
		let websocketRetries = 0;
		while (true) {
			try {
				return await openCodexWebSocketTransport(
					model,
					options,
					requestContext,
					requestSetup,
					websocketState,
					websocketRetries,
					options ? event => options.onSseEvent?.(event, model) : undefined,
				);
			} catch (error) {
				if (!(error instanceof CodexWebSocketTransportError)) throw error;
				const fatalWebSocketMessage = error.message.toLowerCase();
				const isFatal = CODEX_WEBSOCKET_FATAL_PATTERNS.some(pattern =>
					fatalWebSocketMessage.includes(pattern.toLowerCase()),
				);
				const activateFallback = isFatal || websocketRetries >= websocketRetryBudget;
				recordCodexWebSocketFailure(websocketState, activateFallback);
				CODEX_DEBUG &&
					logger.debug("[codex] codex websocket fallback", {
						error: error.message,
						retry: websocketRetries,
						retryBudget: websocketRetryBudget,
						activated: activateFallback,
						fatal: isFatal,
					});
				if (!activateFallback) {
					websocketRetries += 1;
					await scheduler.wait(CODEX_WEBSOCKET_RETRY_DELAY_MS * Math.max(1, websocketRetries), {
						signal: requestSetup.requestSignal,
					});
					continue;
				}
				break;
			}
		}
	} else if (websocketState) {
		releaseIdleCodexWebSocket(websocketState);
	}
	try {
		return await openCodexSseTransport(model, requestContext, requestSetup, options, websocketState, transformedBody);
	} catch (error) {
		if (!dropRejectedCodexAccessPrograms(transformedBody, model, requestContext.accountId, error)) throw error;
		return openCodexSseTransport(model, requestContext, requestSetup, options, websocketState, transformedBody);
	}
```

## 会话状态字段

`pi-ai/src/providers/openai-codex-responses.ts:446-469`：

```ts
type CodexWebSocketSessionState = {
	sessionId: string;
	disableWebsocket: boolean;
	lastRequest?: RequestBody;
	/** Last completed response; an in-progress response cannot replace the retry baseline. */
	lastResponseId?: string;
	lastResponseItems?: InputItem[];
	canAppend: boolean;
	modelsEtag?: string;
	connection?: CodexWebSocketConnection;
```

## 本机配置快照（脱敏）

`~/.omp/agent/models.yml` 中指向 `http://localhost:8787/v1` 的 provider：

| provider | api | gpt-5.6-luna 的 preferWebsockets |
|---|---|---|
| `openai-codex` | `openai-codex-responses` | `false` |
| `c8787` | `openai-responses` | 未设置 |
| `c8787-chat` | `openai-completions` | 该 provider 下无此模型条目 |

`~/.omp/agent/config.yml` 中 `providers.openaiWebsockets` 当前值为 `auto`。以上快照不含任何 `apiKey` 字段。
