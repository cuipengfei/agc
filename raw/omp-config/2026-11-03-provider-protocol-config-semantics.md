# OMP Provider 协议层配置项源码取证

> Source URL: 本机安装包 `/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent` v18.16.0
> Collected: 2026-11-03
> Published: 2026-11-03

## 取证范围

本机 `@oh-my-pi/pi-coding-agent` 18.16.0 安装包源码直读。覆盖 `providers.cacheRetention`、`providers.cacheWarming`、`providers.openaiLiveSteering`、`textVerbosity`、`officialEndpoint`、`inlineToolDescriptors`、`tools.format`、`task.file` 共 8 项配置的源码级行为条件。所有行号对应本机安装包。

## providers.cacheRetention（Prompt Cache Retention）

设置定义 `session/settings.ts:1233-1255`。取值 `auto` / `short` / `long` / `none`，默认 `auto`。

取值含义（settings.ts options description）：
- auto：provider 默认；Anthropic OAuth 订阅登录默认 1h，API key 用 5m；`PI_CACHE_RETENTION` 仍可覆盖。
- short：5 分钟短档，写入最便宜。
- long：长档；Anthropic/Bedrock 1h，OpenAI GPT-5.6+ Responses 12h（OMP 文档口径）；写入更贵，只在活跃运行期间 warm。
- none：关闭 prompt 缓存与缓存亲和力路由。

wire 映射（openai-responses.ts:1609-1628）：
```
const cacheRetention = resolveCacheRetention(options?.cacheRetention);
...
// GPT-5.6+ replaces `prompt_cache_retention` with `prompt_cache_options.ttl`;
// long retention selects the 12h minimum lifetime even without an explicit policy.
const ttl = promptCache?.ttl ?? (cacheRetention === "long" ? "12h" : undefined);
...
prompt_cache_retention:
    promptCacheKey &&
    cacheRetention === "long" &&
    model.compat.supportsLongPromptCacheRetention &&
    !model.compat.supportsPromptCacheBreakpoints
        ? "24h"
        : ...
```
条件：long + 有 promptCacheKey（sessionId 派生）+ `supportsLongPromptCacheRetention` + 不支持 explicit breakpoints → 显式发 `prompt_cache_retention: "24h"`。GPT-5.6+ 若 `supportsPromptCacheBreakpoints` 为 true 则走 `prompt_cache_options.ttl="12h"` 分支。

stream 选项来源（session/settings-stream-fn.ts:97-104）：
```
const cacheRetentionSetting = cfgProvidersCacheRetention.get(settings);
const cacheRetention = cacheRetentionSetting === "auto" ? undefined : cacheRetentionSetting;
```
auto 时 cacheRetention 为 undefined，不显式覆盖，用 provider 默认。

## providers.cacheWarming（Cache Warming）

设置定义 `session/settings.ts:1257-1278`。取值 `off` / `streaming` / `idle`，默认 `idle`。

cache-warmer.ts:1-17 设计说明：
```
Keeps one prompt cache entry alive by replaying its request shortly before
the entry expires.

a refresh is scheduled at 90% of the model's declared prompt-cache lifetime
(at least ten seconds before expiry) and only fires when the expected avoided
cache-miss cost minus the refresh cost clears a savings floor. Warming runs
in two phases — "streaming" while the agent run that sent the request is
still active, "idle" after it settles — and stops on context change, mode
change, a refresh that misses the cache, or fixed safety windows (60 min
streaming / 30 min idle). An entry whose lifetime outlasts the idle window
(Anthropic's 1h tier) is therefore only warmed while a run is active.

A model is warmed only when its catalog entry (or a models.yml `promptCache`
override) declares a lifetime for the retention tier the request used, so
providers whose replay behavior is unvalidated are never touched.
```

关键常量（cache-warmer.ts:59-69）：
```
MAX_WARMING_AGE_MS = 60 * 60_000;          // streaming 阶段最长 60 分钟
MAX_IDLE_WARMING_AGE_MS = 30 * 60_000;     // idle 阶段最长 30 分钟
CACHE_WARMING_MINIMUM_EXPECTED_SAVINGS = 0.05;  // 预期节省 ≥ $0.05
IDLE_CONTINUATION_PROBABILITY = 0.15;
```

刷新时刻（cache-warmer.ts:74-77）：
```
function getCacheWarmingDelayMs(ttlMs: number): number | undefined {
    if (ttlMs <= 10_000) return undefined;
    return Math.max(1, Math.floor(Math.min(ttlMs * 0.9, ttlMs - 10_000)));
}
```

刷新请求构造（cache-warmer.ts:621-631）：
```
const replayOptions: SimpleStreamOptions = {
    ...run.options,
    maxTokens: 1,
    ...
};
```

TTL 来源（cache-warmer.ts:130-137）：
```
export function getPromptCacheTtlMs(model, options, isOAuthToken) {
    const tier = resolvePromptCacheTier(model, options, isOAuthToken);
    const seconds = tier === undefined ? undefined : model.promptCache?.[tier];
    return seconds === undefined ? undefined : seconds * 1000;
}
```
TTL 只来自 `model.promptCache`（catalog 规则 `prompt-cache` 轴或 models.yml `promptCache` 字段）。无声明则 TTL 为 undefined，warmer 不调度。

inactive 状态原因（cache-warmer.ts:343-350）：
```
if (this.#deps.getMode() === "off") return { state: "inactive", reason: "cache warming disabled" };
...
if (!decision.economicsAvailable && !refreshing) {
    return { state: "inactive", reason: "cache economics unavailable" };
}
```

24h 寿命的算术：若 TTL 元数据声明为 86400 秒，刷新目标时刻 = 86400 × 0.9 = 77760 秒（约 21.6h）。OMP 安全窗为 streaming 60 分钟、idle 30 分钟。源码只给出 TTL 与安全窗的数值关系，不据此保证某时段内请求绝不发送。c8787 当前模型无 promptCache 声明，getPromptCacheTtlMs 返回 undefined，warmer 不调度。

events（agent-session.ts:2144-2145）：
```
warmer.onRefreshStart = refresh => void this.#emitSessionEvent({ type: "cache_warming_start", ...refresh });
warmer.onRefreshEnd = refresh => void this.#emitSessionEvent({ type: "cache_warming_end", ...refresh });
```
事件结果取值 hit / miss / error / aborted（cache-warmer.ts:47-53）。TUI 包内检索不到 cache_warming 相关显示（grep pi-tui 无匹配）。

## providers.openaiLiveSteering（OpenAI Live Steering）

设置定义 `session/settings.ts:1171-1182`。类型 boolean，默认 false。

生效条件（openai-codex-responses.ts:2488-2490）：
```
this.runtime.transport !== "websocket" ||
!this.model.compat.supportsSteering ||
unsupportedSteeringLanes.has(this.#steeringLaneKey)
```
三条件全满足才启动：transport 为 websocket、`compat.supportsSteering` 为 true、该 lane 未被标记为不支持。

stream 选项注入（session/settings-stream-fn.ts:178-179）：
```
liveSteering: cfgProvidersOpenaiLiveSteering.get(settings) ? streamOptions?.liveSteering : undefined,
```
开关关闭时 liveSteering 为 undefined，agent loop 虽提供队列但不传递。

supportsSteering 规则（compat/rules/classes/openai.kdl:55-58）：
```
revision ">=6" {
    delegation-bias "restrained"
    supports-steering #true
}
```
GPT-6 家族（revision >=6）才有 steering 能力。GPT-5.6 没有。

response.steer 发送（openai-codex/live-steering.ts:311）：
```
const event = { type: "response.steer", previous_response_id: previousResponseId, input };
```

拒绝处理（openai-codex-responses.ts:4072-4075）：
```
if (parsed.type === "error" && parsed.code === AIError.CODEX_NATIVE_LANE_STEER_REJECTED_CODE) {
    this.#refuseSteerWaiters(parsed.code, ...);
```
被拒绝的 lane 标记后不再 steer。

## textVerbosity

设置定义 `session/settings.ts:626-640`。取值 `low` / `medium` / `high`，默认 `medium`。

stream 选项（session/settings-stream-fn.ts:89-98）：
```
const textVerbosity =
    model.api === "openai-codex-responses"
        ? cfgTextVerbosity.isConfigured(settings)
            ? cfgTextVerbosity.get(settings)
            : undefined
        : model.api === "openai-responses"
            ? cfgTextVerbosity.get(settings)
            : undefined;
```
只对 `openai-codex-responses`（需显式配置）和 `openai-responses`（始终读取）两个 api 传递。其他 api（completions、anthropic、google）不传。

写入条件（openai-responses.ts:1650-1651）：
```
if (options?.textVerbosity && model.compat.officialEndpoint) {
    params.text = { ...params.text, verbosity: options.textVerbosity };
}
```
需要 `options.textVerbosity` 有值且 `model.compat.officialEndpoint` 为 true。

## officialEndpoint

判定函数（compat/resolve.ts:584-592）：
```
function isOfficialOpenAIEndpoint(provider: string, baseUrl: string): boolean {
    if (provider !== "openai") return false;
    if (!baseUrl) return true;
    try {
        return new URL(baseUrl).hostname === "api.openai.com";
    } catch {
        return false;
    }
}
```
只有 provider 为 `openai` 且 baseUrl 为空或指向 `api.openai.com` 才为 true。自定义 provider（如 c8787）不满足。

用户覆盖（compat/apply.ts:7-17）：
```
export function applyCompatOverrides(compat: object, overrides: object | undefined): void {
    if (!overrides) return;
    for (const key in overrides) {
        const value = (overrides as Record<string, unknown>)[key];
        if (value !== undefined && key in compat) {
            (compat as Record<string, unknown>)[key] = value;
        }
    }
}
```
models.yml 的 `compat` 字段在主机判定之后应用，可覆盖 `officialEndpoint`。

对 openai-responses 模型的完整消费点：

1. text.verbosity 写入（openai-responses.ts:1650）：`options?.textVerbosity && model.compat.officialEndpoint`。
2. 有状态串联默认（openai-responses.ts:522-527）：
```
if (options?.statefulResponses === false) return false;
if (options?.statefulResponses === true) return true;
return $flag("PI_OPENAI_STATEFUL", model.compat.statefulResponses ?? model.compat.officialEndpoint);
```
优先级：请求选项 > `PI_OPENAI_STATEFUL` 环境变量 > `compat.statefulResponses` > `compat.officialEndpoint`。`officialEndpoint:true` 不配 `statefulResponses:false` 会默认开启有状态串联（`store:true` + `previous_response_id`）。`statefulResponses:false` 关闭它。`PI_OPENAI_STATEFUL` 环境变量可覆盖 compat 值。
3. 泄漏思考修复（stream.ts:89-93）：
```
function healLeakedThinking(model: Model<Api>, inner: AssistantMessageEventStream) {
    return reachesOfficialEndpoint(model) ? inner : wrapLeakedThinkingStream(inner);
}
```
官方端点不包装修复流；非官方端点包装。`officialEndpoint:true` 后不再做这层修复。若上游发生 reasoning 标记泄漏到正文，标记会原样显示。
4. 主机请求预算门（anthropic-state.ts:50-54）：
```
export function reachesBudgetedHost(model: Model<Api>): boolean {
    if (resolveCatalogPolicy(model).catalogEndpointBudgets === true) {
        return !model.baseUrl || isCatalogEndpointUrl(model, model.baseUrl);
    }
    return reachesOfficialEndpoint(model);
}
```
预算数值来自按 provider 编写的规则文件。c8787 没有对应规则块，预算轴未赋值，`resolveInlineImageByteBudget` / `resolveImageCountBudget` 返回 undefined，裁剪逻辑跳过。对 c8787 无实际影响。

## inlineToolDescriptors

设置定义 `session/settings.ts:390-410`。取值 `auto` / `on` / `off`，默认 `auto`。

解析（config/inline-tool-descriptors-mode.ts:14-25）：auto 按模型 id 分类，含 `gemini` 内联，其他不内联。on 无条件内联。off 无条件不内联。

渲染分支（system-prompt.ts:919）：
```
const toolListMode = !inlineToolDescriptors && nativeTools;
```
- toolListMode=true（off 或 auto 非内联 + 原生工具）：prompt 只列工具名清单。
- toolListMode=false（on 或 auto 内联，或文本方言）：prompt 渲染完整 `namespace functions` 目录。

目录渲染（pi-ai/src/dialect/inventory.ts:7-29）：每个工具写成 `type 名称 = (_: 参数类型)`，描述变 `//` 注释，示例 `@example` 行。

provider schema 裁剪（pi-agent-core/src/agent-loop.ts:1036-1061）：顶层 `description` 置空字符串，嵌套 `description` 递归删除。`required`、`enum`、类型保留。裁剪函数（pi-ai/src/utils/schema/wire.ts:645-680）。

nativeTools 判定（sdk.ts:4335）：
```
const nativeTools = resolveDialect(cfgToolsFormat.get(settings), agent?.state.model ?? model) === undefined;
```

## tools.format

设置定义 `session/context-settings.ts:455-500`。取值 `auto` / `native` / `glm` / `hermes` / `kimi` / `xml` / `anthropic` / `deepseek` / `harmony` / `qwen3` / `gemini` / `gemma` / `minimax`，默认 `auto`。

解析（sdk.ts:1028-1040）：
```
function resolveDialect(format, model) {
    if (format === "native") return undefined;
    if (format === "auto") {
        if (model?.supportsTools !== false) return undefined;
        if (!model.id) return "glm";
        const preferred = preferredDialect(model.id);
        return preferred === FALLBACK_DIALECT ? "glm" : preferred;
    }
    return format;
}
```
native 返回 undefined（原生 function calling）。auto 下模型 supportsTools 不为 false 返回 undefined（原生）；为 false 回退文本方言。其他值强制该方言。

## task.file

设置定义 `task/settings.ts:256-266`。类型 boolean，默认 false。

校验（task/index.ts:276-299）：
```
const hasTask = item?.task !== undefined;
const hasTaskFile = item?.taskFile !== undefined;
if (!fileEnabled) { ... return "task.file is disabled..."; }
if (hasTask === hasTaskFile) { return "must provide exactly one of `task` or `taskFile`."; }
if (hasTaskFile && (typeof item?.taskFile !== "string" || (!path.isAbsolute(item.taskFile) && !item.taskFile.startsWith("local://")))) {
    return "`taskFile` must be an absolute path or local:// URL to a UTF-8 file.";
}
```

文件读取与哈希（task/index.ts:418-438）：
```
const file = await fs.open(filePath, fs.constants.O_RDONLY | fs.constants.O_NONBLOCK);
if (!(await file.stat()).isFile()) throw new Error("must resolve to a regular file");
const bytes = await Bun.file(file.fd).slice(0, MAX_TASK_FILE_BYTES + 1).bytes();
if (bytes.byteLength > MAX_TASK_FILE_BYTES) throw new Error("exceeds the 4 MiB limit");
task = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
if (!task.trim()) throw new Error("must contain non-empty task instructions");
return { ...item, task, taskFileSha256: new Bun.CryptoHasher("sha256").update(bytes).digest("hex") };
```
MAX_TASK_FILE_BYTES = 4 * 1024 * 1024（task/types.ts:34）。

路径与哈希记录（task/index.ts:1325, 1919-1920）：
```
...(item.taskFile !== undefined ? { taskFile: item.taskFile, taskFileSha256: item.taskFileSha256 } : {}),
...
const taskFileMetadata = params.taskFile !== undefined ? { taskFile: params.taskFile, taskFileSha256: params.taskFileSha256 } : {};
```
记录到 spawn 的 AgentProgress 与工具结果 details。审批界面只显示 taskFile 路径，不展示文件内容或哈希。

provider 级 compat 合并（config/custom-models.ts:102）：
```
compat: mergeCompat(providerCompat, modelDef.compat),
```
provider 级 compat 合并进该 provider 的每个模型，模型级同名字段优先。
