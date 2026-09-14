# OMP 动态 session identity 与 sticky routing 源码核验摘录

> Source: 本机源码核验与 live 测试（2026-09-14 会话）；本机 OMP 安装包 @oh-my-pi/* 18.1.21（~/.bun/install/global/node_modules/@oh-my-pi/）、copilot-api 仓库 router、Headroom 本机包（~/.local/share/uv/tools/headroom-ai/lib/python3.13/site-packages/headroom/）
> Collected: 2026-09-14
> Published: Unknown

## 背景问题

OMP 自定义 provider `c8787` / `c8787-chat` 的 models.yml 里固定了 `x-session-id: omp-cop-sticky`，导致所有 OMP session 在 4140 sticky router 上共用同一个 binding key。

## 摘录 1：自动 session header 只认 provider === "openai"

pi-ai/src/providers/inference-headers.ts:35-50（逐字）：

```ts
export function applyInferenceHeaders(headers: Record<string, string>, options: InferenceHeaderOptions): void {
	const isOpenCode = options.provider === "opencode-go" || options.provider === "opencode-zen";
	const sessionId = options.sessionId;
	if (!sessionId) return;

	if (options.protocol === "anthropic") {
		setHeader(headers, "X-Claude-Code-Session-Id", sessionId);
	} else if (options.protocol === "openai" && options.provider === "openai") {
		setHeader(headers, "session_id", sessionId);
		setHeader(headers, "x-client-request-id", sessionId);
	}

	if (isOpenCode) {
		setHeaderIfAbsent(headers, "User-Agent", USER_AGENT);
		setHeader(headers, "x-opencode-session", sessionId);
	}
}
```

## 摘录 2：prompt cache key 归一化（上限 64，超长哈希）

pi-ai/src/providers/openai-shared.ts:481-493（逐字）：

```ts
/** Normalize a cache identity to the wire limit accepted by OpenAI-family providers. */
export function normalizeOpenAIPromptCacheKey(sessionId: string | undefined): string | undefined {
	return normalizeOpenAIStableId(sessionId, 64, "pc_");
}

/** Resolve a prompt-cache identity, falling back to the provider session unless caching is disabled. */
export function getOpenAIPromptCacheKey(options: OpenAICacheOptions | undefined): string | undefined {
	if (resolveCacheRetention(options?.cacheRetention) === "none") return undefined;
	return normalizeOpenAIPromptCacheKey(options?.promptCacheKey ?? options?.sessionId);
}
```

pi-ai/src/providers/openai-shared.ts:1351-1355（逐字）：

```ts
function normalizeOpenAIStableId(value: string | undefined, maxLength: number, hashPrefix: string): string | undefined {
	if (!value || value.length === 0) return undefined;
	const wellFormed = value.toWellFormed();
	if (wellFormed.length <= maxLength) return wellFormed;
	return `${hashPrefix}${Bun.hash(wellFormed).toString(36)}`;
}
```

## 摘录 3：Responses 无条件带 prompt_cache_key；Chat 有 compat gate

pi-ai/src/providers/openai-responses.ts:1198-1208（逐字）：

```ts
	const params: OpenAIResponsesSamplingParams = {
		model: modelId,
		input: messages,
		instructions: systemInstructions,
		stream: true,
		prompt_cache_key: promptCacheKey,
```

pi-ai/src/providers/openai-completions.ts:1645-1648（逐字）：

```ts
	const promptCacheKey = getOpenAIPromptCacheKey(options);
	if (model.compat.supportsPromptCacheKey && promptCacheKey !== undefined) {
		params.prompt_cache_key = promptCacheKey;
	}
```

## 摘录 4：compat schema 未声明该键，但加载器默认 keep 未声明键

pi-coding-agent/src/config/models-config-schema-bundle.ts 的 OpenAICompatFields 声明列表中无 `supportsPromptCacheKey`（字段列表逐字摘录含 `"supportsLongPromptCacheRetention?": "boolean"`、`"stripImageInput?": "boolean"` 等，无 `supportsPromptCacheKey`）。

omptype/src/ir.ts:1300（逐字）：

```ts
	let extras: Extras = "keep";
```

即 object literal 的未声明键默认策略是 keep；只有 `"+"` 值为 `"reject"` 或 `"delete"` 才拦截/删除。

pi-coding-agent/src/config/config-file.ts:261-269（逐字）：

```ts
			const checked = this.schema(parsed);
			if (checked instanceof OmpErrors) {
				const schemaErrors: ConfigSchemaError[] = checked.map(error => ({
					instancePath: error.path.length === 0 ? "root" : error.path.join("."),
					message: error.problem,
				}));
				const error = new ConfigError(this.id, schemaErrors);
				logger.warn("Failed to parse config file", { path: this.path(), error });
				return this.#storeCache({ error, status: "error" });
			}
```

## 摘录 5：sdk 层 sessionId 与 promptCacheKey 分离

pi-coding-agent/src/sdk.ts:1461（逐字）：

```ts
	const providerSessionId = options.providerSessionId ?? sessionManager.getSessionId();
```

## 摘录 6：4140 router 的 body fallback 实现（copilot-api 仓库，commit 2713089）

router/state.ts buildRequestContext 内（逐字，最终版）：

```ts
  const headerSessionId = (
    [
      "x-session-id",
      "x-claude-code-session-id",
      "session-id",
      "session_id",
    ] as const
  )
    .map((name) => params.req.headers.get(name)?.trim())
    .find(Boolean)
  let bodySessionId: string | null = null
  if (!headerSessionId) {
    try {
      const body: unknown = JSON.parse(params.bodyText)
      if (isRecord(body) && typeof body.prompt_cache_key === "string") {
        bodySessionId = body.prompt_cache_key.trim() || null
      }
    } catch {
      // Non-JSON bodies have no prompt cache key.
    }
  }
  const sessionId = headerSessionId ?? bodySessionId
```

## 摘录 7：live 配置（~/.omp/agent/models.yml 修改后）

```yaml
providers:
  c8787:
    baseUrl: http://localhost:8787/v1
    api: openai-responses
```

```yaml
  c8787-chat:
    baseUrl: http://localhost:8787/v1
    api: openai-completions
    compat:
      supportsPromptCacheKey: true
```

两个 provider 的 `x-session-id: omp-cop-sticky` 固定 header 均已删除。

## 摘录 8：ModelRegistry 真实加载验证输出（逐字）

命令：bun -e 用本机 AuthStorage + ModelRegistry 加载真实 /home/cpf/.omp/agent/models.yml，逐个 find("c8787-chat", id) 打印 api 与 compat.supportsPromptCacheKey。

输出：

```text
gemini-3.7-flash openai-completions true
gemini-3.8-flash openai-completions true
kimi-k2.7-code openai-completions true
```

## 摘录 9：Headroom 不碰 prompt_cache_key，只剥自身内部 header

对本机 Headroom 包全目录 `grep -rn "prompt_cache_key"`：零命中。

headroom/proxy/helpers.py:1637-1652（逐字，出站剥离逻辑 docstring）：

```python
def _strip_internal_headers(headers: dict[str, str]) -> dict[str, str]:
    """Return a copy of ``headers`` with internal ``x-headroom-*`` keys stripped.

    Used at every upstream call site to prevent fingerprinting / leakage of
    internal flags like ``x-headroom-bypass``, ``x-headroom-mode``,
    ``x-headroom-user-id``, ``x-headroom-stack``, ``x-headroom-base-url``.
    Case-insensitive on the prefix. Returns a NEW dict; never mutates the
    caller's mapping. Pure function. No regex.
```

## 摘录 10：验证与 live 结果（逐字数字）

- copilot-api 完整门禁：router tests 31 pass / 0 fail；full tests 1258 pass / 0 fail；build、typecheck、lint、git diff --check 均通过。
- copilot-api commit：`2713089` `fix(router): use prompt cache key for sticky sessions`（dev 分支，核验时未 push）。
- AGC 仓库 commit：`517f60b` `chore(omp): sync live routing configuration`，已 push origin/master。
- Dashboard（4139）live 观察：gpt-5.3-codex 首请求 reason=new 落 :4142，后续 3 次 sticky 同端口；gpt-5.6-luna 首请求 new 落 :4143，后续 sticky；kimi-k2.7-code 首请求 new 落 :4144 后 sticky；gemini-3.8-flash 首请求 new 落 :4145 后 sticky。同一 OMP session 01a086cd-41bf-74da-b4a6-25b10648841f 下同时存在 gpt-5.6-luna→:4143、kimi-k2.7-code→:4144、gemini-3.8-flash→:4145 三条 binding。embedding / 无 model 请求 Session 显示 `-`，走 new。
- Active Bindings 按 session + agent + model 粒度建绑，不是纯 session 粒度。

## 摘录 11：被排除的备选方案证据

pi-ai/src/providers/openai-shared.ts:324-331（逐字）：

```ts
	const sessionId = options.sessionId ?? options.promptCacheSessionId;
	applyInferenceHeaders(headers, {
		provider: model.provider,
		protocol: "openai",
		sessionId,
	});
	if (options.promptCacheSessionId && model.compat?.promptCacheSessionHeader) {
		setHeaderIfAbsent(headers, model.compat.promptCacheSessionHeader, options.promptCacheSessionId);
	}
```

- built-in `openai` 覆盖路线：会占用 OMP 已有 `providers.openai` 内置槽位；自动 header 用的是普通 sessionId，与 fork/handoff 的 promptCacheKey 身份可分离。
- `compat.promptCacheSessionHeader: x-grok-conv-id` 路线：x-grok-conv-id 是 Grok 专属 header 语义；且该 compat 键同样不在用户 schema 声明中，需另行真实加载验证；4140 也不认识该 header，需扩 router。
