# OMP 的 `openai-decisions` 判断协议与本地接入（2026-11-09 源码核验与配置）

> Source: 本机安装的 `@oh-my-pi/pi-ai` 与 `@oh-my-pi/pi-coding-agent` 源码（2026-11-09）；`~/.omp/agent/models.yml` 与 `~/.omp/agent/config.yml`；本机 `headroom-ai` 0.42.0 的 `proxy_routes.py`
> Collected: 2026-11-09
> Published: Unknown

证据分级标签：**源码原文**＝逐字引用文件；**实测**＝本会话实际运行或读取结果；**推断**＝由证据推得但未直接证实。

## ① 四种原生判断协议（源码原文）

`packages/ai/src/judgment/native.ts`：

```ts
export const TYPESAFE_PROVIDER = "typesafe";
export const TYPESAFE_DEFAULT_MODEL = "jev-latest";

const JUDGMENT_WIRES = {
	typesafe: typesafeWire,
	"openrouter-decisions": openrouterDecisionsWire,
	"workers-ai-systemone": workersAiWire,
	"openai-decisions": openaiDecisionsWire,
} as const satisfies Partial<Record<Api, JudgmentWire>>;

/** APIs {@link NativeJudge} can serve. */
export type JudgmentApi = keyof typeof JUDGMENT_WIRES;

/** Whether a catalog API answers judgments natively. */
export function isJudgmentApi(api: Api): api is JudgmentApi {
	return Object.hasOwn(JUDGMENT_WIRES, api);
}

/** Whether both the native protocol and catalog model support image input. */
export function nativeJudgmentSupportsImages(model: Model): boolean {
	return isJudgmentApi(model.api) && JUDGMENT_WIRES[model.api].images !== undefined && model.input.includes("image");
}

/** Whether `model`'s native judgment takes images and its wire forwards box questions. The model itself may still refuse them (Box needs Jev 1.14+). */
export function nativeJudgmentSupportsBoxes(model: Model): boolean {
	return nativeJudgmentSupportsImages(model) && isJudgmentApi(model.api) && JUDGMENT_WIRES[model.api].boxes === true;
}
```

### 四种 wire 的图片与 `box` 定义（源码原文）

`packages/ai/src/judgment/systemone.ts`：

```ts
/** TypeSafe's own route, shared by every System One server. */
export const typesafeWire: JudgmentWire = {
	...systemOneWire("/v1/systemone"),
	images: { mimeTypes: ["image/png", "image/jpeg"] },
	supportsImageAssets: true,
	imagesRequireOptIn: true,
	imageHeaders: { "TypeSafe-Danger-Zone-Images": "true" },
	ignoresImageDetail: true,
	boxes: true,
	encode(request, model, imageAssets) { ... },
};

/** OpenRouter Decisions: System One body under `/api/alpha`, with image parts preserved in state. */
export const openrouterDecisionsWire: JudgmentWire = {
	...systemOneWire("/decisions"),
	images: {},
	imagesRequireOptIn: true,
	boxes: true,
	encode(request, model) { ... },
};

/** Cloudflare Workers AI decision models (Clef) through the account-scoped `ai/run` route. */
export const workersAiWire: JudgmentWire = {
	// Clef's `images` extension: https://developers.cloudflare.com/workers-ai/models/clef/
	images: {
		mimeTypes: ["image/png", "image/jpeg", "image/webp"],
		maxCount: 4,
		maxBytes: 4 * 1024 * 1024,
		maxTotalBytes: 8 * 1024 * 1024,
		maxPixels: 16_000_000,
	},
	target(baseUrl, model, key) { ... },
	encode: (request, model) => ({ ... }),
	decode: payload => (isRecord(payload) ? decodeSystemOne(payload.result) : undefined),
};
```

按 wire 汇总：

| wire | `boxes` | `images` 字段 |
|---|---|---|
| `typesafe` | `true` | `{ mimeTypes: ["image/png", "image/jpeg"] }`，无 `maxCount`；另设 `imagesRequireOptIn`、`imageHeaders`、`ignoresImageDetail` |
| `openrouter-decisions` | `true` | `{}`（不设限）`imagesRequireOptIn: true` |
| `workers-ai-systemone` | 未设（视为不支持） | `maxCount: 4`、`maxBytes: 4 * 1024 * 1024`、`maxTotalBytes: 8 * 1024 * 1024`、`maxPixels: 16_000_000`，`mimeTypes` 含 `image/webp` |
| `openai-decisions` | 未设（视为不支持） | `{ maxCount: 128 }` |

`nativeJudgmentSupportsBoxes` 的判定条件是 `JUDGMENT_WIRES[api].boxes === true`，因此只有 `typesafe` 与 `openrouter-decisions` 返回真。函数注释原文：`Box needs Jev 1.14+`。

## ② `openai-decisions` wire 的报文与能力（源码原文）

`packages/ai/src/judgment/openai-decisions.ts`：

```ts
type DecisionQuestion =
	| { type: "predicate"; name: string; instructions: string }
	| { type: "choice"; name: string; instructions: string; choices: { value: string; description?: string }[] }
	| { type: "score"; name: string; instructions: string; levels: { label: string }[] };
```

题型编码：

```ts
		case "noul":
			return { type: "predicate", name, instructions: ... };
		case "choice":
			return {
				type: "choice",
				name,
				instructions: question.instructions,
				choices: Object.entries(question.criteria).map(([value, description]) =>
					description === null ? { value } : { value, description },
				),
			};
		case "score":
			return {
				type: "score",
				name,
				instructions: question.instructions,
				levels: question.criteria.map(label => ({ label })),
			};
		case "box":
			throw new AIError.ValidationError(`OpenAI Decisions has no box question type (question "${name}")`);
```

协议定义：

```ts
export const openaiDecisionsWire: JudgmentWire = {
	// https://developers.openai.com/api/reference/resources/decisions/methods/create/
	images: { maxCount: 128 },
	target: (baseUrl, _model, key) => ({ url: `${baseUrl}/decisions`, token: key }),
	encode: (request, model) => {
		const state = typeof request.state === "string" ? request.state : JSON.stringify(request.state);
		return {
			model,
			input: request.images?.length
				? [
						{
							role: "user",
							content: [
								{ type: "input_text", text: state },
								...request.images.map(image => ({
									type: "input_image",
									image_url: embeddedImageDataUrl(image),
									...(image.detail !== undefined ? { detail: image.detail } : {}),
								})),
							],
						},
					]
				: state,
			questions: Object.entries(request.questions).map(([name, question]) => encodeQuestion(name, question)),
		};
	},
	decode(payload) { ... },
};
```

要点：

- 请求路径是 `{baseUrl}/decisions`（不带 `/v1`，由调用方的 baseUrl 决定）。
- 图片上限 128 张，转成 `input_image` 的 data URL。
- 内部 `noul` 映射为 `predicate`，`choice` 映射为带 `value` 的选项数组，`score` 映射为 `levels`。
- `box` 直接抛 `ValidationError`，没有对应题型。

## ③ 判断角色的消费点（源码检索，逐字行号）

`resolveJudge` 的定义与调用点：

```text
judgment/index.ts:367                      export function resolveJudge(deps: JudgeDeps): ChainJudge
judgment/standalone.ts:32                  judge: resolveJudge({...})
tools/jfind/index.ts:101                   const judge = resolveJudge({...})          // find 语义搜索
auto-thinking/classifier.ts:151            const judge = resolveJudge({...})          // 推理档位分类
auto-prewalk/classifier.ts:130             const judge = resolveJudge({...})          // 预设探索判定，门控 hasNativeJudge
session/agent-session.ts:3791              return resolveJudge({...})                 // TTSR 规则检查
session/agent-session.ts:3810              tableChartJudge(): ChainJudge              // 表格配图
session/agent-session.ts:11886             const judge = resolveJudge({...})          // 标题/统计辅助
session/unexpected-stop-classifier.ts:88   const judge = resolveJudge({...})          // 提前停止检测
slash-commands/builtin-session.ts:194      const judge = resolveJudge({...})          // /stats 面板
eval/judgment-bridge.ts:247                return resolveJudge({...})                 // eval 里的 judge()/judgeBatch()
```

`hasNativeJudge` 用于 `auto` 模式的门控（`auto-prewalk/classifier.ts:129`、`session/agent-session.ts:3790`）。`openai-decisions` 属原生协议，因此与 `typesafe` 一样满足该门控。

**推断**：上述 10 个消费点都不使用 `box` 题型，因此在 `openai-decisions` 上全部可用；`box` 只在用户自行调用 `judge()` 并传入 `type: "box"` 时才会触发，届时须使用 `typesafe`（或同样声明 `boxes: true` 的 `openrouter-decisions`）。

## ④ 自定义 provider 下的模型对象（实测）

用 `custom-models.ts` 的 `buildCustomModelOverlay` + `finalizeCustomModel` 构造 `c8787/gpt-6-luna-decisions`，输出逐字：

```json
{
  "id": "gpt-6-luna-decisions",
  "provider": "c8787",
  "api": "openai-decisions",
  "kind": "judge",
  "baseUrl": "http://localhost:8787/v1",
  "requestModelIdIsUndefined": true,
  "requestModelIdInObject": false,
  "supportsImages": true,
  "supportsBoxes": false
}
```

要点：

- `requestModelId` 不存在，因此请求体里的 `model` 原样发送 `gpt-6-luna-decisions`，与 Copilot 目录要求的 ID 一致。
- 内置 `openai/gpt-6-luna-decisions` 配了 `request-model-id`，会把 `model` 改写为 `gpt-6-luna`；那条路径服务 OpenAI 原生端点，不适用于 Copilot 上游。
- `supportsImages` 为真、`supportsBoxes` 为假。

## ⑤ 本机配置（逐行原文）

`~/.omp/agent/models.yml`，`c8787` provider 下新增条目：

```yaml
      - id: gpt-6-luna-decisions
        name: GPT-6 Luna Decisions
        api: openai-decisions
        reasoning: false
        input:
          - text
          - image
        contextWindow: 1000000
        cost:
          input: 0
          output: 0
          cacheRead: 0
          cacheWrite: 0
```

`~/.omp/agent/config.yml`：

```text
63:modelRoles:
...
75:  judge: typesafe-zen/jev-1.13-free
```

```text
230:    judge:
231:      - typesafe-zen/jev-1.13-free
232:      - c8787/gpt-6-luna-decisions
233:      - "@tiny"
234:      - "@smol"
235:      - "@default"
```

说明：写入回退链首项时先写成了付费变体 `typesafe-zen/jev-1.13`，本次已改为免费变体 `typesafe-zen/jev-1.13-free`，与 `modelRoles.judge` 一致。

## ⑥ 中间层转发（源码原文）

本机 `headroom-ai` 0.42.0 的 `providers/proxy_routes.py` 末尾注册了兜底路由：

```python
    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "HEAD"])
    async def passthrough(request: Request, path: str):
        ...
        return await proxy.handle_passthrough(
            request,
            # The path matters here: this is where unrouted paths land, and
            # Copilot's inline completions are one of them (#3076).
            _select_passthrough_base_url(proxy, dict(request.headers), request.url.path),
        )
```

**推断**：`/v1/decisions` 没有专门注册，会进入这条兜底路由并按原样转发，不改写请求体。本轮未发请求验证该路径。

## ⑦ 端到端链路（推断）

```text
OMP judge 角色
  → POST http://localhost:8787/decisions（baseUrl 后缀拼接）
  → Headroom 兜底 passthrough
  → http://localhost:4140（sticky router）
  → 4142-4146 的 copilot-api 实例 /v1/decisions
  → https://api[.<account-type>].githubcopilot.com/v1/decisions
```

每一跳的证据：OMP 的 `target` 拼接（§②）、Headroom 的兜底路由（§⑥）、copilot-api 的路由挂载（见 [copilot-api raw](../ai-coding-agents/2026-11-09-copilot-api-decisions-route.md)）、上游实测（见 [实测 raw](../ai-coding-agents/2026-11-09-copilot-decisions-live-verification.md)）。**未做整链实跑。**

## ⑧ 证据边界

- 未实测 OMP 通过 8787 调用该模型的完整链路；只核对了代码路径与配置文本。
- 未验证 sticky router 是否会按模型名把 `gpt-6-luna-decisions` 分发到实例；这依赖实例 `/v1/models` 已包含该模型，而实例需重启后才会加载新代码。
- `kind: "judge"` 是构造 `finalizeCustomModel` 时的返回值，未核对上层如何消费该字段。
- Headroom 兜底路由的选择函数 `_select_passthrough_base_url` 内部逻辑未逐行核对。
