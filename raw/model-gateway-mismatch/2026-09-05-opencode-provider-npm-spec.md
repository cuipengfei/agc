# OpenCode provider `npm` 选择规范与两 harness 协议配置摘录

> Source: opencode 仓库 `packages/web/src/content/docs/providers.mdx` 与 `packages/opencode/src/provider/provider.ts`；`@oh-my-pi/pi-ai` 本地源码；本机配置文件实测
> Collected: 2026-09-05
> Published: Unknown

## OpenCode 官方文档中的 `npm` 字段说明

`providers.mdx` 对 `npm` 字段的说明原文：

> **npm**: AI SDK package to use, `@ai-sdk/openai-compatible` for OpenAI-compatible providers (for `/v1/chat/completions`). If your provider/model uses `/v1/responses`, use `@ai-sdk/openai`.

同一文档的 troubleshooting 一节：

> For mixed setups under one provider, you can override per model via `provider.npm`.

## 文档中的 openai-compatible 配置形态

`providers.mdx` 的 Atomic Chat 示例：

```json
{ "provider": { "atomic-chat": {
  "npm": "@ai-sdk/openai-compatible",
  "name": "Atomic Chat (local)",
  "options": { "baseURL": "http://127.0.0.1:1337/v1" },
  "models": { "<id>": { "name": "<name>" } } } } }
```

同文档中 Helicone、llama.cpp、LM Studio、Ollama、Poolside 使用同一形态。示例中出现的键为 `npm`、`name`、`options`、`models`；`options` 下没有 `name` 键。

## OpenCode 源码事实

- `packages/opencode/src/provider/provider.ts` 的 `BUNDLED_PROVIDERS` 把 `@ai-sdk/openai` 映射到 `m.createOpenAI`。
- openai 分支的 `getModel` 直接调用 `sdk.responses(modelID)`，没有配置字段可以改变这一调用。
- `LLMNative.model` 相关测试将 `@ai-sdk/openai` 对应到 `openai-responses`。

AI SDK 官方文档对 `openai(modelId)` 的说明表示其默认使用 Responses API。

## pi-ai 源码事实

包名与版本：`@oh-my-pi/pi-ai` 18.1.10，`package.json` 的 `main` 为 `./src/index.ts`。

`src/types.ts` 中的 `StreamFunction` 契约：

```
(model: Model<TApi>, context: Context, options: OptionsForApi<TApi>) => AssistantMessageEventStream
```

`streamOpenAIResponses` 导出自 `src/providers/openai-responses.ts`，外层由 `withReplaySafeStreamRetry` 包装，dispatch 位于 `src/stream.ts`。

`src/api-registry.ts` 的 `BUILTIN_API_IDS` 列出的合法 `api` 值：

- `openai-completions`
- `openai-responses`
- `openai-codex-responses`
- `anthropic-messages`
- `google-generative-ai`
- `google-gemini-cli`
- `google-vertex`

## pi-ai 不补全 `/v1`

`src/providers/openai-responses.ts` 第 489 行：

```ts
const resolvedBaseUrl = (baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "")
```

同文件第 526 行：

```ts
const requestUrl = `${resolvedBaseUrl}/responses`
```

`openai-shared.ts` 第 209 至 331 行的 `resolveOpenAIRequestSetup` 只对 moonshot、sakana、github-copilot、alibaba 与 Azure 改写 baseUrl，其余原样透传。全仓库唯一的 `/v1` 补全函数是 `openai-shared.ts` 第 187 至 196 行的 `normalizeSakanaRequestBaseUrl`，只有 1 个调用点，仅 sakana 使用。

`baseUrl` 缺少 `/v1` 时，请求发往 `https://motomoto.lol/responses`，返回 HTTP 200 与 1204 字节 SPA HTML；OMP 报错文字为 `OpenAI responses stream closed before a terminal response event was received`，每次约 1.4 秒，重试 4 次后 `stopReason: error`。

## 本机 SDK 版本

位于 `~/.bun/install/global/node_modules/`：

- `@ai-sdk/openai` 3.0.108
- `@ai-sdk/openai-compatible` 2.0.74
- `@ai-sdk/anthropic` 3.0.116
- `@ai-sdk/provider` 3.0.15

## 最终配置状态

`~/.config/opencode/opencode.jsonc` 的 provider 块：

```jsonc
"motomoto-responses": {
  "npm": "@ai-sdk/openai-compatible",
  "name": "MotoMoto Responses",
  "options": { "baseURL": "http://127.0.0.1:4150/v1", "apiKey": "dummy" },
  "models": { "gpt-5.5": {}, "gpt-5.6-sol": { "reasoning": true } }
}
```

`~/.omp/agent/models.yml` 的顶层键为 `providers`，其下 `motomoto-responses` 的字段为 `api: "openai-responses"`、`baseUrl: "http://127.0.0.1:4150/v1"`、`apiKey: "dummy"`，model id 为 `gpt-5.5` 与 `gpt-5.6-sol`。

真实令牌保存在 `~/.config/motomoto-shim.key`，文件权限 `-rw-------`（mode 600），长度 51 字符。两份配置文件中的 `apiKey` 值为 `dummy`。

## `gpt-5.6-sol` 的 reasoning 观测

用同一道题（bat and ball，正确答案 0.05）分别经 chat/completions 与 responses 两条协议请求 `gpt-5.6-sol`：

- 两条协议都给出正确答案，`text_len: 5`
- 两条协议的 `reasoning_chars` 均为 0
- 两条协议 usage 报告的 `reasoning_tokens` 均为 0

`opencode.jsonc` 中该模型配置了 `"reasoning": true`。

## 非交互执行入口

- `omp -p --model provider/model "..."`，另有 `--print-thoughts` 选项
- `opencode run --model provider/model "..."`

## 命名与实际协议不一致的记录

provider id 为 `motomoto-responses`，显示名为 `MotoMoto Responses`，model 显示名中带 `(Responses)`；改为 `@ai-sdk/openai-compatible` 后，opencode 实际使用的是 `/v1/chat/completions`。
