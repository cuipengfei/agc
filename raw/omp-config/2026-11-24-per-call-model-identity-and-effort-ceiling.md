# OMP 19.1.1 per-call 模型身份与 effort ceiling 源码摘录

> Source: 本机安装包 `/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent` 源码与仓库脱敏配置 `omp/agent/config.yml`
> Collected: 2026-11-24
> Published: Unknown

以下源码与脱敏配置摘录读取于 2026-11-24。

## 安装包版本

来源：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/package.json:1-4`

```json
{
	"name": "@oh-my-pi/pi-coding-agent",
	"version": "19.1.1",
	"description": "Coding agent CLI with read, bash, edit, write tools and session management",
```

## 广播选择器与批准身份

来源：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/task/model-approval.ts:196-217`

```ts
/**
 * Each granting role value as a selector a caller can send; globs never grant, so they are skipped.
 * Provider-qualified values are shown as written (compared to the allowlists
 * without a `:level`), so rendering never composes the full catalog; a bare value needs the registry
 * to name its provider.
 */
function advertisedGrants(
	settings: Settings,
	registry: ApprovalRegistry | undefined,
): ApprovalCacheKey & AdvertisedGrants {
	const authority = settings.grantAuthority();
	const allowlists = perCallAllowlists(settings);
	const [operatorAllow, liveAllow] = allowlists;
	let models: { chat: Model<Api>[]; catalog: Model<Api>[]; preferences: ModelMatchPreferences } | undefined;
	const advertise = (pattern: string): string | undefined => {
		if (/[*?]/.test(pattern)) return undefined;
		if (pattern.includes("/")) {
			const base = splitThinkingSuffix(pattern, -1, MAX_THINKING_SUFFIX_OPTIONS).base;
			return allowlistsAdmitIdentity(allowlists, base) || allowlistsAdmitIdentity(allowlists, pattern)
				? pattern
				: undefined;
		}
```

来源：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/task/model-approval.ts:75-84`

```ts
/**
 * The one model an exact entry names: a literal catalog id wins over a `:level`
 * split, and an `@upstream` pin stays part of the identity. Undefined when the
 * entry is not an exact selector in the full catalog, including unavailable models.
 */
function exactIdentity(entry: string, catalog: Model<Api>[]): string | undefined {
	const model = resolveModelOverride([entry], { getAvailable: () => catalog }, undefined, { exactOnly: true }).model;
	return model ? formatModelStringWithRouting(model) : undefined;
}
```

来源：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/config/model-resolver.ts:202-206`

```ts
export function formatModelStringWithRouting(model: Model<Api>): string {
	const selector = formatModelString(model);
	const upstream = getUpstreamPin(model);
	return upstream ? `${selector}@${upstream}` : selector;
}
```

## allowlist 与 grant 判定

来源：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/task/model-approval.ts:144-159`

```ts
/** The allowlist compares canonical identities literally; it never resolves or case-folds entries. */
function allowlistAdmitsIdentity(allow: string[], identity: string): boolean {
	return allow.length === 0 || allow.some(entry => entry.trim() === identity);
}

/**
 * The operator's allowlist and the live one, which includes project and subagent-injected layers.
 * A model must satisfy both, so a project list can narrow the operator's but never replace it.
 */
function perCallAllowlists(settings: Settings): [operator: string[], live: string[]] {
	return [cfgTaskPerCallModelAllow.get(settings.grantAuthority()), cfgTaskPerCallModelAllow.get(settings)];
}

function allowlistsAdmitIdentity(allowlists: string[][], identity: string): boolean {
	return allowlists.every(allow => allowlistAdmitsIdentity(allow, identity));
}
```

来源：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/task/model-approval.ts:291-310`

```ts
/** Whether the configuration grants this model; the caller has already checked chat availability. */
function computeGranted(
	model: Model<Api>,
	target: string,
	grants: PerCallModelGrants,
	chat: Model<Api>[],
	catalog: Model<Api>[],
): boolean {
	if (!allowlistsAdmitIdentity(perCallAllowlists(grants.settings), target)) return false;
	return perCallModelGrantPatterns(grants).some(pattern => {
		// Full-catalog literals win even when unavailable, so :low and [1m] never broaden a grant.
		const exact = exactIdentity(pattern, catalog);
		if (exact !== undefined) return exact === target;
		// A glob routes the role but never grants: the operator must name each per-call model.
		if (/[*?]/.test(pattern)) return false;
		const resolved = resolveGrantPattern(pattern, chat, catalog, grants.matchPreferences).model;
		return resolved !== undefined && formatModelStringWithRouting(resolved) === target;
	});
}
```

来源：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/task/model-approval.ts:321-358`

```ts
/** Throw {@link PerCallModelError} unless `model` is an available chat model the configuration approves. */
export function assertPerCallModelApproved(
	model: Model<Api>,
	grants: PerCallModelGrants,
	registry: ApprovalRegistry,
): void {
	const target = formatModelStringWithRouting(model);
	let cache = decisionCache.get(grants);
	if (!cache || !isCurrent(cache, grants.settings, registry)) {
		cache = {
			authority: grants.settings.grantAuthority(),
			revision: grants.settings.revision,
			catalog: registry.getAll(),
			decisions: new Map(),
		};
		decisionCache.set(grants, cache);
	}
	let granted = cache.decisions.get(target);
	if (granted === undefined) {
		const chat = registry.getAvailable("chat");
		// Unavailability is never cached: a login can make the model available without a settings change.
		if (
			!chat.some(candidate => candidate.provider === model.provider && candidate.id === model.id) &&
			!findOpenRouterRouteVariant(formatModelString(model), chat)
		) {
			throw new PerCallModelUnavailableError(`Per-call model ${target} is not an available chat model.`);
		}
		granted = computeGranted(model, target, grants, chat, cache.catalog);
		cache.decisions.set(target, granted);
	}
	if (granted) return;
	const allowGuidance = perCallAllowlists(grants.settings).some(allow => allow.length > 0)
		? " It must also be listed in task.perCallModelAllow."
		: "";
	throw new PerCallModelError(
		`Per-call model ${target} is not approved for agent "${grants.agentName}": use a model named by a chat role configured outside project settings, the selected agent's own frontmatter (bundled or user-level agents only), or the parent's model.${allowGuidance} Catalog or credentials alone do not approve a model.`,
	);
}
```

## exactOnly 模型解析

来源：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/config/model-resolver.ts:1833-1877`

```ts
 * `exactOnly` matches each pattern only as a literal `provider/model-id` or an
 * OpenRouter route variant of one (`openrouter/<id>:nitro`), optionally followed
 * by a supported `:level` and an aggregator `@upstream` pin: no role aliases,
 * globs, or fuzzy ids. Per-call grant matching relies on this contract.
 */
export function resolveModelOverride(
	modelPatterns: string[],
	modelRegistry: ModelLookupRegistry,
	settings?: Settings,
	options?: { exactOnly?: boolean },
): { model?: Model<Api>; thinkingLevel?: ConfiguredThinkingLevel; explicitThinkingLevel: boolean; warning?: string } {
	if (modelPatterns.length === 0) return { explicitThinkingLevel: false };
	const availableModels = modelRegistry.getAvailable();
	if (options?.exactOnly) {
		const find = (selector: string) =>
			availableModels.find(model => `${model.provider}/${model.id}` === selector) ??
			findOpenRouterRouteVariant(selector, availableModels);
		const exact = (selector: string) => {
			// Some real ids end in a level-shaped segment, so the literal id wins over a suffix split.
			const literal = find(selector);
			if (literal) return { model: literal, explicitThinkingLevel: false };
			const { base, level } = splitThinkingSuffix(selector, -1, MAX_THINKING_SUFFIX_OPTIONS);
			if (!level) return undefined;
			const model = find(base);
			if (!model) return undefined;
			return {
				model,
				thinkingLevel:
					level === AUTO_THINKING ? AUTO_THINKING : (resolveThinkingLevelForModel(model, level) ?? level),
				explicitThinkingLevel: true,
			};
		};
		for (const pattern of modelPatterns) {
			const selector = pattern.trim();
			const direct = exact(selector);
			if (direct) return direct;
			// The pin is part of the selection: it rides the resolved model to dispatch.
			const routing = splitUpstreamRouting(selector);
			const routed = routing ? exact(routing.base) : undefined;
			if (routing && routed && supportsUpstreamRouting(routed.model)) {
				return { ...routed, model: applyUpstreamRouting(routed.model, routing.upstream) };
			}
		}
		return { explicitThinkingLevel: false };
```

来源：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/task/executor.ts:4997-5013`

```ts
			} = await awaitAbortable(
				resolveModelOverrideWithAuthFallback(
					modelPatterns,
					options.parentActiveModelPattern,
					modelRegistry,
					settings,
					id,
					{ exactOnly: !!options.perCallModelGrants, allowedProvider },
				),
			);
			if (cfgOffline.get(settings) && !model) {
				throw new Error("Offline mode: no subagent model is available on the active parent provider.");
			}
			if (options.perCallModelGrants && !model) {
				throw new PerCallModelError(
					`Requested exact model ${JSON.stringify(modelPatterns)} is unavailable. Use an exact provider/model[:level] selector; do not substitute another model.`,
				);
			}
```

来源：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/task/executor.ts:5029-5033`

```ts
			// Preflight skips these checks while the registry is cold, so hold the model
			// a per-call child actually starts on to them before its session exists.
			if (options.perCallModelGrants && model) {
				assertPerCallModelApproved(model, options.perCallModelGrants, modelRegistry);
			}
```

## effort ceiling、优先级与子会话传参

来源：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/task/executor.ts:5074-5107`

```ts
			// Caller-requested coarse effort maps onto the resolved model's
			// supported range, then respects the operator-configured ceiling.
			// Undefined (no effort, or no controllable effort surface) falls
			// through to the normal selectors below.
			// The ceiling outlives initial resolution: it rides into the session so
			// retry-fallback recovery can never clamp effort back up past it.
			// A per-call `model` is caller-chosen too, so its `:level` is held to the same
			// ceiling, and a model whose lowest effort is above it fails the spawn
			// exactly as an `effort` hint does.
			const spawnEffortCeiling =
				options.effort !== undefined || options.perCallModelGrants ? cfgTaskMaxEffort.get(settings) : undefined;
			if (model && spawnEffortCeiling) assertModelSupportsEffortCeiling(model, spawnEffortCeiling);
			const effortLevel =
				options.effort !== undefined
					? resolveTaskEffortLevel(model, options.effort, spawnEffortCeiling)
					: undefined;
			const explicitLevel =
				explicitThinkingLevel && resolvedThinkingLevel !== AUTO_THINKING
					? clampThinkingLevelToCeiling(model, resolvedThinkingLevel, spawnEffortCeiling)
					: resolvedThinkingLevel;
			if (model) {
				const displayLevel = effortLevel ?? (explicitThinkingLevel ? explicitLevel : undefined);
				progress.resolvedModelIdentity = formatModelStringWithRouting(model);
				progress.resolvedThinkingLevel = displayLevel;
				progress.resolvedModel =
					displayLevel !== undefined
						? formatModelSelectorValue(progress.resolvedModelIdentity, displayLevel)
						: progress.resolvedModelIdentity;
			}
			// Precedence: caller `effort` > explicit `:level` suffix on the resolved
			// model pattern > agent-definition default (e.g. task's `auto`) >
			// pattern-derived level.
			const effectiveThinkingLevel =
				effortLevel ?? (explicitThinkingLevel ? explicitLevel : (thinkingLevel ?? resolvedThinkingLevel));
```

来源：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/task/executor.ts:5245-5266`

```ts
					modelPatternDefaultFallbackChain:
						model || modelOverride === undefined ? undefined : inheritedRetryFallbackChain,
					thinkingLevel: effectiveThinkingLevel,
					...(perCallModelGrants || allowedProvider !== undefined
						? {
								assertDispatchModel: (dispatchModel: Model) => {
									if (allowedProvider !== undefined && dispatchModel.provider !== allowedProvider) {
										throw new Error("Offline mode: subagent dispatch must use the active parent provider.");
									}
									if (perCallModelGrants) {
										assertPerCallModelApproved(dispatchModel, perCallModelGrants, modelRegistry);
										if (spawnEffortCeiling)
											assertModelSupportsEffortCeiling(dispatchModel, spawnEffortCeiling);
									}
								},
								...(perCallModelGrants ? { disableModelFallback: true } : {}),
								disableServerSideFallback: true,
							}
						: {}),
					thinkingLevelCeiling: spawnEffortCeiling,
					// Bridge long tool waits (a third of them happen in subagents), but never
```

## 脱敏配置当前值

来源：`omp/agent/config.yml:574-584`

```yaml
  batch: true
  perCallModel: "on"
  enableEffort: true
  maxConcurrency: 32
  enableLsp: true
  maxRecursionDepth: 1
  maxRuntimeMs: 3600000
  agentIdleTtlMs: 420000
  softRequestBudget: 200
  softRequestBudgetNotice: true
  maxEffort: high
```

## 被修正的 wiki 原句

来源：`wiki/omp-config/config-semantics.md:63`（本次修改前）

```md
| `task.maxEffort: high` | 限制 task 调用显式传入的 effort hint | task spawn 带 `effort` 时 | 只约束显式 hint，不表示未传 hint 的 spawn 被强制降级 |
```

来源：`wiki/omp-config/custom-subagent-deployment.md:170`（本次修改前）

```md
本机 `modelRoles` 的 `:max`/`:high` 后缀优先于 frontmatter `thinkingLevel`（`src/task/executor.ts:5019-5023`）。要让 `.md` 里的档位生效，需在 role 值或调用处加 `:level`。
```

## 证据边界

本 raw 只保存 19.1.1 安装包源码、仓库脱敏配置和两篇 wiki 的修改前原句。没有执行真实 subagent 派发，没有捕获最终线上 reasoning 参数，也没有验证 provider 是否遵守请求档位；`omp models` 一类目录输出即使存在，也只能证明目录支持档位，不能替代这些实测。
