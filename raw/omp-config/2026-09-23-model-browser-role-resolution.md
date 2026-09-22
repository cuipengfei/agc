# OMP /model 模型浏览器角色解析与 kind 过滤取证

> 日期：2026-09-23。取证基于本机 oh-my-pi fork（已从 upstream/main 快进同步至 0f9139f546）与已安装 pi-coding-agent。

## 结论摘录（逐条带源码锚点）

1. `/model` 面板解析已配置角色，用的是 `session.scopedModels`（`enabledModels` 圈定的受限集合），不是完整目录——仅当 `scopedModels.length > 0` 时（`packages/tui/src/overlays/model-hub.ts:370-372`，`:383-399`）。
2. `scopedModels` 由 `selector-controller.ts:1064-1069` 传入 `ModelHubComponent`，来源是当前项目的 `enabledModels`（`main.ts:928-956`）。
3. 配置了却解析不到的角色，会显示 `—` 且无自动兜底：`resolveRoleAssignments`（`model-browser.ts:183-195`）只要配置串非空就先记为「已配置」，解析不出模型时跳过后续自动挑选段（`:200`）。两种触发：选择器指向 enabledModels 之外的 provider，或指向不存在的模型。
4. kind 是模型的单值类别标签，共 10 种（`MODEL_KINDS`，`packages/catalog/src/types.ts`）；未标 kind 的模型一律算 `chat`（`modelKind = kind ?? "chat"`，`types.ts`）。其中 `image/tts/stt/embedding/rerank/video` 6 种属 `KIND_API_KINDS`，provider 必须声明对应 kind 的 API 传输，否则 discovery 丢弃该行。
5. 角色用 `accepts` 按 kind 卡候选：WEB 收 `search` kind 或带 `webSearch` 的 chat；JUDGE 收 `judge/tiny/chat`；VISION 面板候选放行全部 chat（`acceptsChat`），是否真能看图由运行时 `sendsImageInputOnWire` 另行判定。
6. 内置角色 15 个（`model-roles.ts:54-88`），chat 段 10 个（DEFAULT/SMOL/SLOW/VISION/PLAN/COMMIT/TINY/MEMORY/TASK/ADVISOR）+ kind 段 5 个（IMAGE/WEB/SPEECH/DICTATION/JUDGE）。`modelRoles`/`modelTags` 里的非内置键会引入自定义角色（`getKnownRoleIds`，`model-roles.ts:113-124`）。
7. `modelTags` 是按**角色名**配置的展示元数据（`name/color/hidden`），可增设自定义角色，模型的挑选仍由 `modelRoles` 完成。
8. `designer` 曾是内置角色 + 独立 prompt 子 agent（`prompts/agents/designer.md`），由提交 `2493ba99c4`「feat(coding-agent): removed designer subagent and model role」（2026-09-03 02:01 +02）移除，自 v18.1.5 起所有发布不再含 designer。提交正文未给出动机；本机安装版 `src` 中 designer 零引用。

## 本机实测

- 复现路径：用 `Bun.Glob` 按 `~/.omp/agent/config.yml` 的 `enabledModels` 判定选择器是否在范围内。在加 `openai-codex/*`、`typesafe-zen/*` 之前，`openai-codex/gpt-5.6-luna` 与 `typesafe-zen/jev-1.13` 均 OUT（范围外）；`typesafe-zen` 为自定义 provider（`~/.omp/agent/models.yml:302`，`api: typesafe`，`baseUrl: https://opencode.ai/zen`，模型 `jev-1.13`/`jev-1.13-free`），`openai-codex` 为自定义 provider（`models.yml:2`，`baseUrl: http://localhost:8787`，`api: openai-codex-responses`，模型 `gpt-5.6-luna`）。
- 加入两个 provider 到 `enabledModels` 后，两个选择器均判定 IN-SCOPE，YAML 解析通过，重进会话后 WEB、JUDGE 正常解析。

## 证据边界

- 「不再被使用」限定为「当前安装版 pi-coding-agent `src` 无精确 `designer` 引用 + 本机配置已删 designer 行」，未覆盖 extension、项目级 `.omp` 与运行中的旧会话。
- 角色「用途」按名称与设计意图推断，未逐角色追踪调用点；`name/section/accepts` 为源码直读。

## 源码原文摘录

### 角色解析用受限集合（model-hub.ts:369-372）

```ts
	/** Resolve every known role: configured values first, auto-selection for the rest. */
	#reloadRoles(autoCandidates: ReadonlyArray<Model>): void {
		const allModels = this.#scopedModels.length > 0 ? autoCandidates : this.#registry.getAll("all");
		this.#roles = resolveRoleAssignments(this.#settings, allModels, autoCandidates);
```

### scopedModels 非空走受限集合（model-hub.ts:383-399）

```ts
		if (this.#scopedModels.length > 0) {
			allModels = this.#scopedModels.map(scoped => scoped.model);
			availableModels = allModels;
			this.#configError = undefined;
		} else {
			const loadError = this.#registry.getError();
			this.#configError = loadError ? String(loadError) : undefined;
			allModels = this.#registry.getAll("all");
			try {
				availableModels = this.#registry.getAvailable("all");
			} catch (error) {
				this.#configError = error instanceof Error ? error.message : String(error);
				availableModels = [];
			}
		}

		this.#reloadRoles(availableModels);
```

### 已配置但解析不到即跳过自动兜底（model-browser.ts:183-201）

```ts
	for (const role of knownRoles) {
		const roleValue = settings.getModelRole(role);
		if (!roleValue) continue;
		configuredRoles.add(role);
		const resolved = settings.resolveRoleValue(roleValue, catalog.filter(settings.getRoleInfo(role).accepts));
		if (resolved.model) {
			roles[role] = {
				model: resolved.model,
				thinkingLevel: resolvedThinkingLevel(role, resolved),
				autoSelected: false,
			};
		}
	}

	if (autoCandidates.length > 0) {
		const candidates = [...autoCandidates];
		for (const role of knownRoles) {
			if (configuredRoles.has(role)) continue;
```

### 15 个内置角色定义（model-roles.ts:54-88，逐字）

```ts
export const MODEL_ROLES: Record<ModelRole, ModelRoleInfo> = {
	default: { tag: "DEFAULT", name: "Default", color: "success", section: "chat", accepts: acceptsChat },
	smol: { tag: "SMOL", name: "Fast", color: "warning", section: "chat", accepts: acceptsChat },
	slow: { tag: "SLOW", name: "Thinking", color: "accent", section: "chat", accepts: acceptsChat },
	vision: { tag: "VISION", name: "Vision", color: "error", section: "chat", accepts: acceptsChat },
	plan: { tag: "PLAN", name: "Architect", color: "muted", section: "chat", accepts: acceptsChat },
	commit: { tag: "COMMIT", name: "Commit", color: "dim", section: "chat", accepts: acceptsChat },
	tiny: { tag: "TINY", name: "Tiny", color: "dim", section: "chat", accepts: acceptsTinyOrChat },
	memory: { tag: "MEMORY", name: "Memory", color: "dim", section: "chat", accepts: acceptsTinyOrChat },
	task: { tag: "TASK", name: "Subtask", color: "muted", section: "chat", accepts: acceptsChat },
	advisor: { tag: "ADVISOR", name: "Advisor", color: "accent", section: "chat", accepts: acceptsChat },
	image: {
		tag: "IMAGE",
		name: "Image generation",
		color: "accent",
		section: "kind",
		accepts: model => modelKind(model) === "image",
	},
	web: { tag: "WEB", name: "Web search", color: "success", section: "kind", accepts: acceptsWeb },
	speech: {
		tag: "SPEECH",
		name: "Speech",
		color: "warning",
		section: "kind",
		accepts: model => modelKind(model) === "tts",
	},
	dictation: {
		tag: "DICTATION",
		name: "Dictation",
		color: "warning",
		section: "kind",
		accepts: model => modelKind(model) === "stt",
	},
	judge: { tag: "JUDGE", name: "Judge", color: "muted", section: "kind", accepts: acceptsJudge },
};
```

### kind 常量（catalog/src/types.ts:27-43）

```ts
export const MODEL_KINDS = [
	"chat",
	"tiny",
	"image",
	"tts",
	"stt",
	"search",
	"judge",
	"embedding",
	"rerank",
	"video",
] as const;
/** Technical capability of a catalog model; absent model kinds mean chat. */
export type ModelKind = (typeof MODEL_KINDS)[number];
/** Kinds a provider maps to a runner transport through `kind-apis` in its KDL; discovery drops rows of these kinds when the provider declares no API. */
export const KIND_API_KINDS = ["image", "tts", "stt", "embedding", "rerank", "video"] as const;
```

### 自定义角色来源（model-roles.ts:113-124）

```ts
	for (const role of settings.get("cycleOrder")) addRole(role);
	for (const role in settings.getModelRoles()) addRole(role);
	for (const role in settings.get("modelTags")) addRole(role);
```

## designer 移除提交原文

```
$ git show -s --format='%H%n%ci%n%s%n%b' 2493ba99c4
2493ba99c48c2d890b5f12d6701e5cea1075b8c9
2026-09-03 02:01:08 +0200
feat(coding-agent): removed designer subagent and model role
- Deleted the designer prompt file and removed its entry from model role definitions, priority list, and bundled agents.
- Updated documentation and READMEs to reflect nine remaining roles.

$ git describe --tags --contains 2493ba99c4
v18.1.5~14
```

## 范围复现输出（Bun.Glob 按 enabledModels 判定）

加 `openai-codex/*`、`typesafe-zen/*` 之前：

```
OUT       openai-codex/gpt-5.6-luna
OUT       typesafe-zen/jev-1.13
OUT       typesafe-zen/jev-1.13-free
```

之后：

```
IN-SCOPE  openai-codex/gpt-5.6-luna
IN-SCOPE  typesafe-zen/jev-1.13
IN-SCOPE  typesafe-zen/jev-1.13-free
```
