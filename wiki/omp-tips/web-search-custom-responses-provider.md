# OMP web search: 自定义 Responses API 端点接入

> Sources: OMP pi-coding-agent dist/cli.js (installed); copilot-api src/; headroom-ai site-packages; live probe (2026-09-19)
> Raw: [codex-provider-responses-api-mechanism](../../raw/omp-tips/2026-09-19-codex-provider-responses-api-mechanism.md)
> Updated: 2026-09-19

OMP 的 codex web search provider 支持通过自定义 `baseUrl` 接入任何兼容 `/codex/responses` 路径和 Codex 请求形状的 Responses API 端点。这是源码中明确设计的 seam（`codex.d.ts` 原文："Uses the configured Codex Responses transport for proxy/API-key setups and the official ChatGPT backend for OAuth logins"），不是 hack。

## 机制

### 路径拼接

OMP 对 `openai-codex` provider 强制将 baseUrl 拼为 `<baseUrl>/codex/responses`（`jMn()` 函数，cli.js ~13959764）。普通 provider 拼 `/responses`，codex provider 替换为 `/codex/responses`。

### 请求形状

OMP 发送的请求具有 Codex 特征：
- `tool_choice` 为对象强制形式 `{"type":"web_search"}`（非 `"auto"`）
- `store: false`、`stream: true`（SSE）
- `include: ["web_search_call.action.sources"]`

### 凭证分支

- API-key 分支：走 models.yml 配置的 baseUrl，apiKey 可为 dummy（端点不校验时）
- OAuth 分支：走 `chatgpt.com/backend-api`

### 模型钉死

`PI_CODEX_WEB_SEARCH_MODEL` 环境变量（写在 shell rc 如 `.zshrc`，不是 OMP config 字段）。不设置则按内置候选列表尝试。

## 前提条件

接入的端点必须：
1. 能处理 `POST <base>/codex/responses` 路径（OMP 强制拼此后缀）
2. 接受 Codex 请求形状（`store:false`、强制 `tool_choice`）
3. 支持 `web_search` 工具并返回 `web_search_call` item

如果中间有代理（如 headroom）做了路径归一化（`/codex/responses` → `/responses`），则上游只需支持标准 Responses API。

## 已验证实例：本机 8787→4140 链路

OMP → headroom (8787) → copilot-api (4140) → Copilot 上游，2026-09-19 实测通过：

- headroom 注册了 `/v1/codex/responses` 路由并归一化为 `/v1/responses`
- copilot-api 默认不剥离 `web_search`（`useResponsesApiWebSearch` 默认 true）
- 实测返回完整 `web_search_call` 事件序列

## 配置步骤

1. `models.yml`：provider id `openai-codex`，`baseUrl` 指目标端点，`apiKey: dummy`，`api: openai-codex-responses`，声明模型
2. `.zshrc`：`export PI_CODEX_WEB_SEARCH_MODEL=<model>`
3. `config.yml`：`providers.webSearchOrder` 把 `codex` 排第一（如需优先于其他已配凭证的 provider）

## See Also

- [OMP web search provider 清单与 fallback](omp-web-search-provider-inventory.md)
