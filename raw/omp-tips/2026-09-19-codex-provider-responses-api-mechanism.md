# OMP web_search codex provider: Responses API 端点接入机制

> Source: OMP pi-coding-agent dist/cli.js (installed, 2026-09-19); copilot-api src/; headroom-ai site-packages; live probe result
> Collected: 2026-09-19
> Published: 2026-09-19

## OMP codex search provider 的 URL 拼接

OMP 对 `openai-codex` / `openai-codex-responses` provider 有专门的路径拼接逻辑（cli.js ~13959764, `jMn()`）：

```js
function jMn(e) {
  let t = Mxi(e);  // baseUrl 去尾斜杠
  if (e.api !== "openai-codex-responses" && e.provider !== "openai-codex")
    return `${t}/responses`;
  let s = t.endsWith("/") ? t : `${t}/`;
  return new URL("responses", s).toString().replace("/responses", "/codex/responses");
}
```

类型定义（`dist/types/web/search/providers/codex.d.ts:4`）原文：

> Uses the configured Codex Responses transport for proxy/API-key setups and the official ChatGPT backend for OAuth logins

即：codex provider 的 baseUrl `http://host:port/v1` 会被拼成 `http://host:port/v1/codex/responses`，不是 `/v1/responses`。

## 请求形状

OMP codex search 发送的请求体（`ivi()` 构造）：

```json
{
  "model": "<candidate>",
  "stream": true,
  "store": false,
  "include": ["web_search_call.action.sources"],
  "input": [{"type":"message","role":"user","content":[{"type":"input_text","text":"<query>"}]}],
  "tools": [{"type":"web_search","search_context_size":"high"}],
  "tool_choice": {"type":"web_search"}
}
```

关键特征：
- `tool_choice` 是对象强制形式 `{"type":"web_search"}`，不是 `"auto"`
- `store: false`
- `stream: true`（SSE）
- `include` 要求返回搜索来源

## 凭证分支（hasCodexSearch / searchCodex）

- API-key 分支：models.yml 中 provider id 为 `openai-codex`、配了 apiKey（可为 dummy 值，端点不校验时）
- OAuth 分支：走 `chatgpt.com/backend-api`（默认常量 `_a="https://chatgpt.com/backend-api"`）
- baseUrl 取 `getProviderBaseUrl("openai-codex")`，可从 models.yml 覆盖

## 模型钉死

`PI_CODEX_WEB_SEARCH_MODEL` 环境变量指定搜索用模型；不设置则按内置候选列表尝试。

## headroom 的路径适配

headroom `providers/openai_responses.py:30-37` 注册了 `/v1/codex/responses` 根路由。API-key 模式（非 ChatGPT auth）下，`handlers/openai.py:5783-5791` 将路径归一化为 `/v1/responses` 转发到上游。

这意味着 headroom 在 OMP 和不认识 `/codex/responses` 的上游之间做了路径翻译。

## copilot-api 的放行条件

- `web_search` 工具剥离仅当 `useResponsesApiWebSearch === false`（`preflight.ts:52`）
- 默认值 `true`（`config-store.ts:549` `?? true`）
- 上游发送 `JSON.stringify(payload)` 原样转发（`create-responses.ts:206`），只抹掉 `service_tier`
- `tool_choice: {type:"web_search"}` 会原样透传

## 实测验证（2026-09-19）

- POST `http://localhost:8787/v1/codex/responses`，OMP 原样请求形状
- 结果：HTTP 200，SSE 流含 `response.web_search_call.in_progress → searching → completed` 完整事件序列
- headroom proxy.log 记录：`POST /v1/codex/responses status=200 duration_ms=4612`
- OMP 内 `web_search` 工具调用返回结构化结果含 14 条来源引用

## 配置三件套

1. models.yml：provider id `openai-codex`，baseUrl 指目标端点，apiKey dummy，api `openai-codex-responses`，声明模型
2. .zshrc：`export PI_CODEX_WEB_SEARCH_MODEL=<model>`
3. config.yml：`providers.webSearchOrder` 把 `codex` 排第一（如需优先于其他已配凭证的 provider）

## 边界

## 本机端口

- headroom 监听 8787，进程参数：`headroom proxy --anthropic-api-url http://localhost:4140 --openai-api-url http://localhost:4140 --port 8787 --mode cache`
- copilot-api 监听 4140

- 不是任意 Responses API 端点都能接：必须能处理 `/codex/responses` 路径和强制 `tool_choice` 请求形状
- headroom 做了路径归一化；直连不认识该路径的端点会 404
- 上游（Copilot API）确实执行服务端搜索，返回 `web_search_call` item
