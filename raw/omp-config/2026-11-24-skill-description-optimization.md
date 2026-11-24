# OMP 技能简介压缩、缓存与 Optimizing skills 进度显示取证

> Source: OMP v19.1.1 源码与文档；OMP v19.0.0 发布记录；提交 b6a095fbbad6；本机 `omp --version`、`omp config get modelRoles` 与缓存文件只读检查
> Collected: 2026-11-24
> Published: 2026-11-18

## 来源 URL

- https://github.com/can1357/oh-my-pi/releases/tag/v19.0.0
- https://github.com/can1357/oh-my-pi/commit/b6a095fbbad6b96d370ad33351fdf06f3f9ed998.patch
- https://github.com/can1357/oh-my-pi/blob/v19.1.1/packages/coding-agent/src/extensibility/skill-descriptions.ts
- https://github.com/can1357/oh-my-pi/blob/v19.1.1/packages/coding-agent/src/prompts/skills/compress-description.md
- https://github.com/can1357/oh-my-pi/blob/v19.1.1/packages/coding-agent/src/modes/progress-hud.ts
- https://github.com/can1357/oh-my-pi/blob/v19.1.1/packages/coding-agent/src/system-prompt.ts
- https://github.com/can1357/oh-my-pi/blob/v19.1.1/packages/coding-agent/src/prompts/system/system-prompt.md
- https://github.com/can1357/oh-my-pi/blob/v19.1.1/docs/skills.md

## 本机观测

### 版本

```text
$ omp --version
omp/19.1.1
```

### 模型角色

```text
$ omp config get modelRoles
{"plan":"c8787/gpt-6.1-sol:high","slow":"c8787/gpt-6.1-sol:high","commit":"c8787/gpt-6-luna:low","smol":"c8787/gpt-6.1-terra:low","task":"kimi-code/k3.1-pro:max","vision":"opencode-go/deepseek-v4.1-flash:max","tiny":"sensenova/glm-5.3:max","advisor":"sensenova/glm-5.3:max","default":"opencode-go/deepseek-v4.1-flash:max","web":"web/firecrawl","memory":"sensenova/glm-5.3:max","judge":"c8787/gpt-6-luna-decisions","widget":"sensenova/glm-5.3:max","architect":"c8787/gpt-6.1-sol:high","designer":"sensenova/kimi-k3:max","balanced":"kimi-code/kimi-for-coding:max"}
```

### 缓存文件存在

```text
$ ls -la ~/.omp/agent/skill-descriptions.db
-rw------- 1 cpf cpf 200704 Nov 23 20:56 /home/cpf/.omp/agent/skill-descriptions.db
```

同时存在 `skill-descriptions.db-wal` 与 `skill-descriptions.db-shm`。本轮没有查询数据库中的条目数量或具体缓存内容。

## v19.0.0 发布记录摘录

`packages/coding-agent/CHANGELOG.md` 的 `## [19.0.0] - 2026-11-18` 段落包含：

```text
- Renamed SDK deferSkillDescriptionCompression to deferHintCompression and startSkillDescriptionCompression() to startHintCompression(); these settings and methods now also cover MCP namespace hints.
```

```text
- Added progress reporting for background skill-description and MCP namespace hint generation.
```

```text
- Generated skill descriptions and MCP namespace hints once per machine, sharing results and progress across omp windows.
```

## 进度行提交摘录

提交 `b6a095fbbad6b96d370ad33351fdf06f3f9ed998` 的 changelog 新增：

```text
- Skill descriptions and MCP namespace hints generated in the background show a progress row above the composer (`Optimizing skills 3/12`, `Optimizing MCP: github`), ending in `ready` or the reason it failed
```

同一提交的说明：

```text
- Counted each routing hint sent to the model under its request's `activity` label: `Optimizing skills` for skill descriptions, `Optimizing MCP: <server>` for MCP eval namespace hints.
```

## 触发条件与模型选择

`packages/coding-agent/src/extensibility/skill-descriptions.ts` 常量：

```ts
const MAX_PREVIEW_CHARS = 100;
const MIN_PREVIEW_CUT = 40;
const MAX_COMPRESSED_CHARS = 160;
const VALIDATION_REVISION = 2;
const compressionSlots = new Semaphore(4);
```

`SkillDescriptionCatalog.render()`：

```ts
const requests = skills.map((skill): RoutingHintRequest | undefined =>
	skill.description.replace(/\s+/g, " ").trim().length <= MAX_PREVIEW_CHARS
		? undefined
		: {
				key: keyFor(skill),
				name: skill.name,
				description: skill.description,
				placeholder: previewSkillDescription(skill.description),
				activity: "Optimizing skills",
				render: () =>
					prompt.render(compressDescriptionPrompt, { name: skill.name, description: skill.description }),
			},
);
```

模型选择函数的相关代码：

```ts
const firstPattern = resolveConfiguredModelPatterns(
	settings.getModelRole("smol")?.trim() || "@smol",
	settings,
)[0];
```

```ts
const available = registry.getAvailable();
return (
	resolveRoleChain("smol", settings, available)[0]?.model ??
	resolveRoleSelection(["tiny"], settings, available)?.model
);
```

源码注释：

```text
Resolve the fast role for each background request the way `/models` shows it — configured `smol`,
the inherited `default` when `smol` is unset, then the built-in chain — before a configured `tiny`.
Never uses the session's foreground model.
```

## 压缩请求形状

`compressDescriptionPrompt` 的完整内容：

```text
Compress into one routing hint of at most 12 words: WHEN to use; WHEN NOT only if it prevents confusion. Retain recognizable trigger words. Do not restate the skill name or market it. Output one line without bullets or quotes.

Skill: {{name}}
Description: {{description}}
```

`createSkillDescriptionCompressor().compress()` 发送的请求：

```ts
response = await instrumentedCompleteSimple(
	model,
	{
		messages: [{ role: "user", content: request, timestamp: Date.now() }],
	},
	{
		apiKey: registry.resolver(model, options.sessionId),
		sessionId: options.sessionId,
		maxTokens: 1024,
		disableReasoning: true,
		temperature: 0,
		signal: AbortSignal.any([AbortSignal.timeout(30_000), refused.signal]),
		beforeDispatch: gate ? refuseAttempt : undefined,
		fetch: gate ? transportFetch(model, undefined, refuseAttempt) : undefined,
		onAttempt: message => {
			gate?.record(message.usage.cost.total);
			journal?.(message, request);
		},
	},
	{ telemetry: options.getTelemetry?.(), oneshotKind: options.oneshotKind ?? "skill_description" },
);
```

输出校验：

```ts
function validCompression(text: string): string | null {
	const line = text.trim();
	if (!line || /[\r\n]/.test(line) || line.length > MAX_COMPRESSED_CHARS) return null;
	return line;
}
```

源码注释：

```text
The prompt's 12-word target stays advisory: small models routinely overshoot it by a few words
while staying well inside the character budget, which is what bounds the prompt.
```

## 持久化缓存

默认存储路径由 `getSkillDescriptionsDbPath(agentDir)` 决定；本机默认 agent 目录下观察到 `~/.omp/agent/skill-descriptions.db`。

缓存键计算：

```ts
function keyFor(skill: Pick<Skill, "name" | "description">): string {
	return new Bun.CryptoHasher("sha256")
		.update(compressDescriptionPrompt)
		.update("\0")
		.update(skill.name)
		.update("\0")
		.update(skill.description)
		.digest("hex");
}
```

SQLite 表与读写语句：

```ts
this.#select = db.prepare("SELECT description FROM skill_descriptions WHERE key = ?");
this.#upsert = db.prepare("INSERT OR REPLACE INTO skill_descriptions (key, description) VALUES (?, ?)");
```

```sql
CREATE TABLE IF NOT EXISTS skill_descriptions (key TEXT PRIMARY KEY, description TEXT NOT NULL)
```

进程间锁的源码注释：

```text
Takes the machine-wide lock of one compression job (`<store path>:<hint key>`) and resolves with
its release, so one omp process asks the model for a hint and the others read its answer from the
store.
```

会话快照的源码注释：

```text
One prompt/session snapshot of model-condensed routing hints. A hint is frozen the first time the
catalog renders it, so completing a background job never mutates a prompt this catalog already
built; the answer reaches the next catalog through the store.
```

`RoutingHintCatalog.hints()` 的读取顺序：

```ts
let hint = this.#snapshot.get(request.key);
if (hint !== undefined) return hint;
hint = store?.get(request.key);
if (hint === undefined) {
	hint = request.placeholder;
	misses.set(request.key, request);
}
this.#snapshot.set(request.key, hint);
```

不可用答案按模型记录：

```ts
function unusableKey(key: string, model: string): string {
	return `${key}:v${VALIDATION_REVISION}:${model}`;
}
```

## 主 agent 上下文

`packages/coding-agent/src/prompts/system/system-prompt.md`：

```text
{{#if skills.length}}
Matching skill → MUST read skill://<name> first.
<skills>
{{#each skills}}
- {{name}}: {{description}}
{{/each}}
</skills>
{{/if}}
```

`packages/coding-agent/src/system-prompt.ts`：

```ts
const filteredSkills = (options.skillDescriptions ?? new SkillDescriptionCatalog()).render(
	hasSkillReader ? skills.filter(skill => skill.hide !== true) : [],
);
```

`docs/skills.md`：

```text
Skills are file-backed capability packs discovered at startup and exposed to the model as:

- lightweight metadata in the system prompt (name + description)
- on-demand content via the `read` tool against `skill://...`
- optional interactive `/skill:<name>` commands
```

## 进度显示保留时间

`packages/coding-agent/src/modes/progress-hud.ts`：

```ts
/** Downloads finishing faster than this never appear (warm caches, tiny files). */
const DOWNLOAD_REVEAL_MS = 150;
/** A finished download's `ready` row lingers this long. */
const DOWNLOAD_DONE_RETAIN_MS = 1_500;
/** A failed download's row lingers this long so the reason can be read. */
const DOWNLOAD_FAILED_RETAIN_MS = 10_000;
```

## 说明用示例

以下示例为依照提示模板编写的说明材料，不是本机实际模型调用记录。

输入：

```text
Skill: db-migration
Description: Use before changing database schemas and migration files. Require reversible migrations, preserve existing data, audit indexes, test rollback, and update docs. Avoid for changes with no schema impact.
```

示例输出：

```text
Use for schema changes; require reversible migrations and rollback tests.
```

## 证据边界

- 版本、配置与缓存文件存在来自本机只读命令输出。
- 功能引入版本、提示模板、请求参数、缓存键、会话快照与主 agent 上下文形状来自 OMP v19.1.1 源码和 v19.0.0 发布记录。
- 本机配置只能说明下一次压缩请求会优先选择 `c8787/gpt-6.1-terra:low`；用户看到的那次请求实际由哪个模型完成，没有调用日志证据。
- 示例输出是说明材料，不是真实调用结果。
- 本轮没有查询缓存数据库的具体条目。
