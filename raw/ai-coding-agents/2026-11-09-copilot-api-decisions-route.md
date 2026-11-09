# copilot-api 放行 Decisions 模型并新增转发路由（2026-11-09 本机仓库改动）

> Source: 本机仓库 `/home/cpf/code-inside/copilot-api` 的源码、测试与 CI 输出（2026-11-09）
> Collected: 2026-11-09
> Published: Unknown（仓库内部改动记录）

证据分级标签：**源码原文**＝逐字引用仓库文件；**实测**＝本会话实际运行结果；**推断**＝由证据推得但未直接证实。

仓库目标分支为 `dev`。本 raw 记录两部分：已提交并推送的版本（`323a2f2`），以及提交之后工作区中出现的进一步简化。

## ① 问题

本地代理的模型缓存此前只保留 `model_picker_enabled` 为真或 `capabilities.type` 为 `embeddings` 的条目，因此上游目录里的 `gpt-6-luna-decisions`（`model_picker_enabled: false`、`capabilities.type: "decisions"`）不会出现在本地 `/v1/models`；同时仓库没有 `/v1/decisions` 路由，本地无法转发该端点。

## ② 已提交版本的过滤条件（源码原文，commit `323a2f2`）

`src/services/copilot/models-cache.ts`：

```ts
  state.models = {
    ...models,
    data: models.data.filter(
      (model) =>
        model.policy?.state !== "disabled"
        && (model.model_picker_enabled
          || model.capabilities.type === "embeddings"
          || (model.capabilities.type === "decisions"
            && (model.supported_endpoints?.includes("/v1/decisions")
              ?? false))),
    ),
  }
```

选择依据：同一目录中非 picker 条目里，`decisions` 类型只有一条且声明 `/v1/decisions`；其余非 picker 条目为 `chat`、`completion`、`embeddings` 或端点数组为空的历史残留。加上端点判断可以把"声明了该端点"作为必要条件。

## ③ 提交后工作区中的进一步简化（源码原文，未提交）

`src/services/copilot/models-cache.ts` 当前工作区版本：

```ts
  state.models = {
    ...models,
    data: models.data.filter(
      (model) =>
        model.capabilities.type === "decisions"
        || (model.policy?.state !== "disabled"
          && (model.model_picker_enabled
            || model.capabilities.type === "embeddings")),
    ),
  }
```

对应 `src/routes/models/AGENTS.md` 的不变量描述改为：

> `cacheModels()` 无条件保留 `decisions` 模型，不检查其 policy 或端点名称；其他类型仅保留非 policy-disabled 的 picker-enabled 或 `embeddings` 模型，路由复用该缓存结果。

对应测试断言改为：`decisions` 类型条目无论 `policy` 为 `disabled`、`supported_endpoints` 为 `[]`、为 `["/decisions"]` 还是缺省，全部保留；隐藏的 `chat` 条目仍被排除。

差异统计：

```text
src/routes/models/AGENTS.md          |  2 +-
src/services/copilot/models-cache.ts | 10 +++---
tests/cache-models.test.ts           | 64 ++++++++++++------------------------
3 files changed, 26 insertions(+), 50 deletions(-)
```

## ④ 模型排序（源码原文）

`src/routes/models/model-discovery.ts`：

```ts
const MODEL_TYPE_ORDER: Record<string, number> = {
  chat: 0,
  completion: 1,
  embeddings: 2,
  decisions: 3,
}
```

## ⑤ 用量端点类型（源码原文）

`src/lib/token-usage/store.ts`：

```ts
export type TokenUsageEndpoint =
  | "chat_completions"
  | "decisions"
  | "embeddings"
  | "images_generations"
  | "images_edits"
  | "messages"
  | "provider_messages"
  | "responses"
  | "videos_generations"
```

## ⑥ 上游调用（源码原文）

`src/services/copilot/create-decisions.ts`：

```ts
export const createDecisions = async (
  payload: DecisionsRequest,
): Promise<DecisionsResponse> => {
  if (!state.copilotToken) throw new Error("Copilot token not found")

  const response = await fetch(`${copilotBaseUrl(state)}/v1/decisions`, {
    method: "POST",
    headers: copilotHeaders(state),
    body: JSON.stringify(payload),
  })

  if (!response.ok) throw new HTTPError("Failed to create decisions", response)

  const result = (await response.json()) as DecisionsResponse
  return attachResponseHeaders(result, response.headers)
}
```

## ⑦ 路由（源码原文）

`src/routes/decisions/route.ts`：

```ts
export const decisionRoutes = new Hono()

decisionRoutes.post("/", async (c) => {
  try {
    const payload = await c.req.json<DecisionsRequest>()
    setPluginRequestModel(payload.model)
    payload.model = resolveMappedModel(payload.model)

    const response = await createDecisions(payload)
    if (response.usage) {
      const recordUsage = createCopilotTokenUsageRecorder({
        endpoint: "decisions",
        model: payload.model,
      })
      recordUsage(normalizeResponsesUsage(response.usage))
    }

    return jsonWithForwardedHeaders(
      response,
      getAttachedResponseHeaders(response),
    )
  } catch (error) {
    return await forwardError(c, error)
  }
})
```

挂载位置（`src/server.ts`）：

```ts
107:server.route("/decisions", decisionRoutes)
119:server.route("/v1/decisions", decisionRoutes)
```

同时挂两个前缀：OMP 的 `openai-decisions` wire 请求的是 `{baseUrl}/decisions`，其他客户端常用 `{baseUrl}/v1/decisions`。

## ⑧ 测试（源码原文与实测）

测试文件与用例名：

```text
tests/decisions.test.ts:11:describe("decisions routes", () => {
tests/decisions.test.ts:25:  test("forwards POST /v1/decisions and /decisions to Copilot upstream /v1/decisions", async () => {
tests/cache-models.test.ts:14:describe("cacheModels", () => {
tests/cache-models.test.ts:19:  test("admits hidden decisions models regardless of endpoints while excluding disabled and hidden chat models", async () => {
```

`decisions.test.ts` 的做法：替换 `globalThis.fetch`，对 `/v1/decisions` 与 `/decisions` 各发一次请求，断言 200、`x-github-request-id` 响应头透传、响应体与上游一致，并断言两次请求都发往 `https://api.business.githubcopilot.com/v1/decisions` 且请求体原样。

### 运行结果

提交前（含路由测试与关联测试套件）：

```text
bun run typecheck      → 0 错误
bun run lint           → 0 错误
bun test tests/cache-models.test.ts tests/decisions.test.ts \
         tests/models-route.test.ts tests/server.test.ts
                       → 275 pass, 0 fail
```

提交后针对当前工作区（简化后的过滤条件）复跑：

```text
$ tsc
bun test v1.4.4 (38afee6c8)

tests/decisions.test.ts:
<-- POST /v1/decisions
--> POST /v1/decisions 200 2ms
<-- POST /decisions
--> POST /decisions 200 0ms

 2 pass
 0 fail
 11 expect() calls
Ran 2 tests across 2 files. [120.00ms]
```

## ⑨ 提交与 CI（实测）

```text
提交: 323a2f25b376a89c79526d1ac1b8336f38999778
标题: feat: expose Copilot Decisions API models and routes
分支: dev
CI:   Run 42633171077 — success（test job 2m54s）
步骤: linter、type check、desktop type check、tests、build 全部通过
```

CI 唯一注解是 `ubuntu-latest` 标签迁移提示，与本次改动无关。

## ⑩ 证据边界

- 提交后的工作区改动来源本轮未确认，按仓库现状原样记录，未回退。
- 未重启本机运行中的代理实例，因此本地端口上是否已生效未验证。
- `275 pass` 是提交前那次运行的计数；当前工作区的复跑只覆盖两个测试文件，计数为 2。
- 未测路由在真实上游（而非替换后的 `fetch`）下的端到端行为；真实上游调用见 [实测 raw](./2026-11-09-copilot-decisions-live-verification.md)。
