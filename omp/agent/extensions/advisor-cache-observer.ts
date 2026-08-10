import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const ADVISOR_SYSTEM_MARKER = "You shadow the main agent as a peer programmer:";
const LEGACY_HEADING = "### Session update";
const WIP_SUFFIX = "[in progress — more steps follow]";
const MAX_SHAPES = 6;

type ModelIdentity = { provider: string; api: string };
type SanitizedItem = {
	type: string;
	role?: string;
	keys?: string[];
	contentKinds?: string[];
	isFinal?: true;
};
type SanitizedFixture = {
	schema: 1;
	model: ModelIdentity;
	advisorSignal: { systemMarker: "instructions" | "developer"; adviseTool: true };
	request: {
		topLevelKeys: string[];
		nativeControls: { previousResponseId: boolean; promptCacheOptions: boolean; promptCacheBreakpoint: boolean };
		inputItems: SanitizedItem[];
		finalDelta: {
			headingCount: number;
			wip: boolean;
			hasFence: boolean;
			hasPrimaryContext: boolean;
			lineKinds: string[];
		};
	};
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sortedKeys(value: Record<string, unknown>): string[] {
	return Object.keys(value).sort();
}

function contentKinds(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const kinds: string[] = [];
	for (const item of value) {
		if (!isRecord(item) || typeof item.type !== "string") return undefined;
		kinds.push(item.type);
	}
	return kinds;
}

function inputText(value: unknown): string | undefined {
	if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0])) return undefined;
	const item = value[0];
	return item.type === "input_text" && typeof item.text === "string" ? item.text : undefined;
}

function isResponsesMessage(value: Record<string, unknown>): boolean {
	return (value.type === undefined || value.type === "message") && typeof value.role === "string" && Array.isArray(value.content);
}

function advisorSystemMarker(payload: Record<string, unknown>, input: unknown[]): "instructions" | "developer" | undefined {
	if (typeof payload.instructions === "string" && payload.instructions.indexOf(ADVISOR_SYSTEM_MARKER) !== -1) {
		return "instructions";
	}
	for (const item of input) {
		if (!isRecord(item) || !isResponsesMessage(item) || item.role !== "developer") continue;
		const text = inputText(item.content);
		if (text && text.indexOf(ADVISOR_SYSTEM_MARKER) !== -1) return "developer";
	}
	return undefined;
}

function hasAdviseTool(value: unknown): boolean {
	return (
		Array.isArray(value) &&
		value.some(tool => isRecord(tool) && tool.type === "function" && tool.name === "advise")
	);
}

function classifyLine(line: string): string {
	if (line.indexOf(LEGACY_HEADING) === 0) return line.indexOf(WIP_SUFFIX) !== -1 ? "heading:wip" : "heading:done";
	if (/^\*\*(?:user|agent|developer|assistant|tool)\*\*:$/.test(line)) return `role:${line.slice(2, -3)}`;
	if (line.indexOf("```") === 0) return "fence";
	if (line.indexOf("→ ") === 0) return "tool-summary";
	if (line === "<primary-context>" || line === "</primary-context>") return "primary-context";
	return line.trim() ? "text" : "blank";
}

function classifyFinalDelta(text: string): SanitizedFixture["request"]["finalDelta"] {
	const lines = text.split("\n");
	return {
		headingCount: lines.filter(line => line.indexOf(LEGACY_HEADING) === 0).length,
		wip: text.indexOf(WIP_SUFFIX) !== -1,
		hasFence: text.indexOf("```") !== -1,
		hasPrimaryContext: text.indexOf("<primary-context>") !== -1,
		lineKinds: lines.map(classifyLine),
	};
}

function sanitizeInputItem(value: unknown, isFinal: boolean): SanitizedItem | undefined {
	if (!isRecord(value) || (typeof value.type !== "string" && !isResponsesMessage(value))) return undefined;
	const item: SanitizedItem = { type: typeof value.type === "string" ? value.type : "message" };
	if (typeof value.role === "string") item.role = value.role;
	const kinds = contentKinds(value.content);
	if (kinds) item.contentKinds = kinds;
	else item.keys = sortedKeys(value);
	if (isFinal) item.isFinal = true;
	return item;
}

/**
 * Produces an anonymous structural fixture for a recognized advisor request.
 * It never returns source text, prompt text, tool arguments, IDs, or hashes.
 */
export function sanitizeAdvisorResponsesPayload(payload: unknown, model: ModelIdentity): SanitizedFixture | undefined {
	if (model.api !== "openai-responses" || !isRecord(payload) || !Array.isArray(payload.input)) return undefined;
	const input = payload.input as unknown[];
	const systemMarker = advisorSystemMarker(payload, input);
	if (!systemMarker || !hasAdviseTool(payload.tools)) return undefined;

	const final = input[input.length - 1];
	if (!isRecord(final) || !isResponsesMessage(final) || final.role !== "user") return undefined;
	const text = inputText(final.content);
	if (!text || text.indexOf(LEGACY_HEADING) !== 0) return undefined;

	const inputItems = input.map((item, index) => sanitizeInputItem(item, index === input.length - 1));
	if (inputItems.some(item => !item)) return undefined;

	return {
		schema: 1,
		model,
		advisorSignal: { systemMarker, adviseTool: true },
		request: {
			topLevelKeys: sortedKeys(payload),
			nativeControls: {
				previousResponseId: "previous_response_id" in payload,
				promptCacheOptions: "prompt_cache_options" in payload,
				promptCacheBreakpoint: "prompt_cache_breakpoint" in payload,
			},
			inputItems: inputItems as SanitizedItem[],
			finalDelta: classifyFinalDelta(text),
		},
	};
}
export default function advisorCacheObserver(pi: ExtensionAPI): void {
	pi.logger.debug("advisor cache observer loaded");
	const seen: string[] = [];
	pi.on("before_provider_request", (event, ctx) => {
		const model = ctx.model;
		if (!model) return undefined;
		const fixture = sanitizeAdvisorResponsesPayload(event.payload, { provider: model.provider, api: model.api });
		if (!fixture) return undefined;
		const key = JSON.stringify({ advisorSignal: fixture.advisorSignal, inputItems: fixture.request.inputItems, finalDelta: fixture.request.finalDelta });
		if (seen.length < MAX_SHAPES && seen.indexOf(key) === -1) {
			seen.push(key);
			pi.logger.debug("advisor cache observer", fixture);
		}
		return undefined;
	});
}

