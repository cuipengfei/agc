# OMP nvidia 模型剪枝机制取证

- Source URL: https://github.com/can1357/oh-my-pi（pi-catalog、pi-coding-agent 源码直读）
- Collected: 2026-10-05
- Published: Unknown（源码为 @oh-my-pi 当前全局安装版本）

## 源码关键段落原文

### model-manager.ts:257 (dynamicModelsAuthoritative default)
	const usableCachedModels = restoredCache.models.filter(model => !restoredCache.unresolvedModelIds.has(model.id));

	const cacheHasUnresolvedHeaders = restoredCache.unresolvedModelIds.size > 0;

	const dynamicModelsAuthoritative = options.dynamicModelsAuthoritative ?? false;

	const cacheDropIds = options.dropCachedModelIdsOnStaticMismatch;

	const staticCatalogFingerprint = fingerprintStaticModels(staticModels, dynamicModelsAuthoritative);

	// Endpoint-migration policy is cache identity: adding an id must invalidate


### model-manager.ts:326-330 (prune only when authoritative)
		(!hasModelsDevFetcher || modelsDevFetchSucceeded) &&

		(!hasDynamicFetcher || dynamicFetchSucceeded);

	const authoritativeDynamicFetchSucceeded = dynamicModelsAuthoritative && dynamicFetchSucceeded;

	const remoteResolutionComplete = authoritativeDynamicFetchSucceeded || allConfiguredRemoteFetchesSucceeded;

	const preparedCacheModels = remoteResolutionComplete


### model-manager.ts:354-368 (four-source merge)
	const mergedWithCache = mergeDynamicModels(staticModels, cacheModels);

	const mergedWithModelsDev = mergeDynamicModels(

		mergedWithCache,

		modelsDevModels,

		fetchedModelsDevModels?.explicitKindModels,

	);

	const catalogMetricsSource = modelsDevFetchSucceeded ? normalizedModelsDevModels : preparedCacheModels;

	const mergedWithCatalogMetrics = additiveStaticModelIds

		? mergeCatalogMetrics(mergedWithModelsDev, catalogMetricsSource)

		: mergedWithModelsDev;

	const mergedModels = mergeDynamicModels(

		mergedWithCatalogMetrics,

		dynamicModels,

		fetchedDynamicModels?.explicitKindModels,

	);


### model-manager.ts:575-582 (retainModelIds)
function retainModelIds<TApi extends Api>(

	models: readonly Model<TApi>[],

	retainedModels: readonly Model<TApi>[],

): Model<TApi>[] {

	if (models.length === 0) return [];

	const retainedIds = new Set(retainedModels.map(model => model.id));

	return models.filter(model => modelKind(model) !== "chat" || retainedIds.has(model.id));

}


### openai-compat.ts nvidiaModelManagerOptions
nvidiaModelManagerOptions(
	config?: NvidiaModelManagerConfig,
): ModelManagerOptions<"openai-completions"> {
	return createSimpleOpenAICompletionsOptions("nvidia", "https://integrate.api.nvidia.com/v1", config);
}

// ---------------------------------------------------------------------------
// 5.5 Novita
// ---------------------------------------------------------------------------

/** Novita OpenAI-compatible discovery configuration. */
export interface NovitaModelManagerConfig {
	apiKey?: 

### openai-compat.ts:1617-1621 (deepinfra sets true)
	return {

		providerId: "deepinfra",

		dynamicModelsAuthoritative: true,

		fetchDynamicModels: () => fetchDeepinfraModels({ baseUrl, apiKey, fetch: config?.fetch, references }),

	};


### model-patch.ts:14-32 (ProviderOverride keys)
	 * inheriting that URL, plus a provider-level `api` for override-only

	 * configs. `undefined` preserves the historical provider-wide override. */

	baseUrlApis?: readonly Api[];

	headers?: Record<string, string>;

	apiKey?: string;

	authHeader?: boolean;

	compat?: ModelSpec<Api>["compat"];

	remoteCompaction?: RemoteCompactionConfig<Api>;

	transport?: Model<Api>["transport"];

	guardrailIdentifier?: Model<Api>["guardrailIdentifier"];

	guardrailVersion?: Model<Api>["guardrailVersion"];

	guardrailTrace?: Model<Api>["guardrailTrace"];

	requestMetadata?: Model<Api>["requestMetadata"];

}



/**

 * Single decision point for provider `baseUrl` application, shared by every

 * composition path (built-in load, cached load, discovery merge, runtime

 * overrides). `undefined` `baseUrlApis` keeps the historical provider-wide

## 本机实测数据（2026-10-05）

- OMP models.db nvidia 缓存条目：176 个
- NVIDIA hosted API GET /v1/models 实测返回：81 个
- 差集（缓存有、在线目录无）：95 个
- 95 个中可在 models.dev nvidia 目录（106 条，保留退役模型）找到：52 个
- 95 个中在内置静态 nvidia.kdl：4 个
- 其余 39 个为历次缓存/models.dev 旧快照残留
- chat completions 端点（deepseek-ai/deepseek-v4.1-flash）200 响应头实测：无 x-ratelimit-* 或 retry-after 字段
- 用户配置（~/.omp/agent/config.yml）实测确认：enabledModels 含 nvidia/**（34 行）、maxInFlightRequests 含 nvidia: 5（47 行）
- 410 实测：deepseek-ai/deepseek-v4-flash（EOL 2026-08-07）；stepfun-ai/step-3.7-flash（EOL 2026-08-28，用户报错原文："The model 'stepfun-ai/step-3.7-flash' has reached its end of life on 2026-08-28T08:00:00Z and is no longer available."）
- 81 个在线目录条目含 embedding（embed-qa-4、arctic-embed-l 等）、翻译（riva-translate）、文档解析（nemotron-parse）、vision（neva-22b、vila 等）等非 chat 端点模型
- 运行时形态：omp 为 dist 打包产物（~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js），改 node_modules 内 src/*.ts 无效
- 上游修复定位：openai-compat.ts 的 nvidiaModelManagerOptions 返回值加 dynamicModelsAuthoritative: true；用户 2026-10-05 决定暂不提 PR
