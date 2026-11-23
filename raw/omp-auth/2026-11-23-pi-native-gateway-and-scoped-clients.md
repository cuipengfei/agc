# OMP pi-native、auth-gateway 与 scoped clients 源码取证

> Source: 本机 `@oh-my-pi/pi-ai` 与 `@oh-my-pi/pi-coding-agent` 19.1.1 源码；本机 `models.yml` 结构化检查
> Collected: 2026-11-23
> Published: 2026-11-23

## 网关路由

来源：`packages/ai/src/auth-gateway/server.ts`。

```text
GET  /healthz                          → unauth; ok + version
GET  /v1/usage                         → aggregated provider usage
GET  /v1/credentials/check             → per-credential auth probe
GET  /v1/models                        → list known models from the registry
GET  /v1/pi/models                     → the same catalog as pi-native model specs
POST /v1/chat/completions              → OpenAI chat-completions in/out
POST /v1/messages                      → Anthropic messages in/out
POST /v1/responses                     → OpenAI Responses in/out
POST /v1/pi/stream                     → native pi-ai stream in/out
POST /v1/systemone | /alpha/decisions  → TypeSafe System One judgments
```

网关统一通过 pi-ai 的 `streamSimple()` 处理凭据注入、provider 请求格式和流式响应。标准路由执行「外部请求格式 → OMP Context → provider → OMP events → 外部响应格式」的转换。

## pi-native 的设计用途与请求格式

来源：`packages/ai/src/providers/pi-native-server.ts` 文件头。

> Where the OpenAI / Anthropic / Responses route modules translate foreign wire shapes through pi-ai's canonical Context, this module accepts the canonical shape directly — for clients that already speak pi-ai (containerized omp, robomp's sidecar auth-gateway).

> Skipping the wire-format → Context → wire-format round-trip cuts per-request CPU but, more importantly, avoids the quantization that those translations impose on first-class pi-ai fields (service tier, cache markers, thinking budgets, tool-choice variants, …).

> The streaming wire is AssistantMessageEvent serialized verbatim and SSE-framed.

端点约定原文：

```text
POST /v1/pi/stream
body:    { modelId, context, options?, stream? }   // `stream` defaults to true
200 SSE: stream of AssistantMessageEvent (terminated by `data: [DONE]`),
         interleaved with `: keepalive` comment frames
200 JSON (stream=false): { message: AssistantMessage }
4xx/5xx: { error: { type, message } }
```

`parseRequest()` 接受 `modelId`，也兼容 `model` 字符串或带 `id` 的模型对象；`context.messages` 必须是数组，`context.systemPrompt` 和 `context.tools` 若存在也必须是数组。

文件头还说明：每个 delta 都带完整 rolling `partial`，其线传输量随回合长度呈二次增长；该格式面向 loopback / sidecar 拓扑，provider 延迟仍占主要成本。

## 客户端如何声明使用它

来源：`packages/coding-agent/src/config/models-config-schema-bundle.ts`。

`transport: pi-native` 是 provider 级配置。该 provider 的模型请求发往 `omp auth-gateway` 的 `/v1/pi/stream`，provider 的 `baseUrl` 指向网关，`apiKey` 是网关 bearer。

```yaml
providers:
  my-provider:
    baseUrl: http://127.0.0.1:<PORT>
    apiKey: <GATEWAY_BEARER>
    transport: pi-native
```

是否使用它由 provider 配置决定，不由模型 ID 决定。v19.1.1 的 `GET /v1/pi/models` 让客户端直接获得网关目录；网关运行时发现的模型无需逐个写进 `models.yml`，网关无法路由的模型会隐藏。

本机结构化读取 `~/.omp/agent/models.yml` 的输出：

```text
provider count: 8
explicit transports: {}
```

该结果只覆盖静态 `models.yml`。本会话没有查询扩展运行时注册的 provider，也没有向网关请求模型目录。

## scoped clients 的权限边界

来源：`packages/ai/src/auth-gateway/clients.ts` 文件头。

每个 scoped client 有自己的名称和 bearer token SHA-256 digest。可配置：

- `models`：允许调用的精确 `provider/id` 或 `provider/*`。缺省允许全部，`[]` 不允许任何模型。
- `accounts`：按 provider 限定可使用的 OAuth 账号 identity key。列出 provider 后不会回退到同 provider 的其他账号或 API key；空数组表示不允许账号。该表同时也是 provider allow-list，未列出的 provider 被拒绝。

源码原文：

> Chat routes drop a client's attribution, billing and transport options, upstream headers included. The unscoped gateway token keeps them.

账号绑定复用 `AuthStorage.sessions.restrict`。每个客户端版本的请求在自己的受限 session 下解析凭据；配置重载产生新版本，旧版本已经接纳的请求继续到完成后再解除限制。

## 凭据归属

本仓库已有 `raw/omp-auth/2026-09-09-auth-broker-gateway-source.md` 记录：

- `omp auth-broker serve` 保存 SQLite credential vault 并执行 OAuth refresh。
- access token 在 broker/gateway 侧解析，客户端看不到 provider access token。
- 客户端仍需持有 gateway bearer token。
- 跨主机传输安全由运维负责，例如 Tailscale、WireGuard 或 reverse proxy + TLS。

因此，网关可用于让同事、容器或另一台机器调用宿主机已配置的 provider，同时不直接分发 provider refresh token 或 access token。scoped token 的模型和账号权限由网关操作者配置。

## 证据边界

- 本会话只读源码和静态配置，没有启动 `omp auth-gateway serve`，没有创建客户端 token，也没有进行跨主机请求。
- 内网共享场景与 robomp/container 用途来自源码注释和网关配置结构；本机实测范围不包括真实多用户部署。
