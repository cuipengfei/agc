# OMP Auth Broker 与 Gateway

> Sources: OMP upstream documentation; 本机 OMP 19.1.1 auth-gateway、pi-native 与 scoped clients 源码, 2026-11-23
> Raw: [OMP Auth Broker 与 Auth Gateway 源码取证](../../raw/omp-auth/2026-09-09-auth-broker-gateway-source.md); [pi-native 与 scoped clients 源码取证](../../raw/omp-auth/2026-11-23-pi-native-gateway-and-scoped-clients.md)
> Updated: 2026-11-23

## 结论

`omp auth-broker serve` 把 provider refresh 凭据集中到单台机器，其他机器通过 `omp auth-gateway serve` 访问，客户端不保存 provider refresh token 或 access token。

## 架构

```
developer laptop / CI / robomp
  → omp auth-broker serve (SQLite vault, OAuth refresh)
  → omp auth-gateway serve (forward-proxy, /v1/chat|messages|responses)
  → gateway clients (llm-git, macOS widget, containers, IDE plugins)
  → api.anthropic.com / api.openai.com / ...
```

## 标准路由与 pi-native

| 路由 | 类型 |
| --- | --- |
| `/v1/chat/completions` | 标准路由 |
| `/v1/messages` | 标准路由 |
| `/v1/responses` | 标准路由 |
| `/v1/pi/stream` | OMP 私有路由 |
| `/v1/pi/models` | OMP 私有路由 |

pi-native 直接传递 OMP Context 和 AssistantMessageEvent，避免格式转换丢失 service tier、cache markers、thinking budgets 等字段。provider 配置 `transport: pi-native` 后，其模型走网关；模型 ID 本身不决定传输。本机静态 `models.yml` 有 8 个 provider，显式 `transport` 为空；此结果不覆盖扩展运行时注册。

## 安全边界

- **provider refresh 凭据**：保存在 broker 的 SQLite vault 中，broker 是唯一写入者
- **access token**：在 broker/gateway 侧解析/刷新，客户端看不到 provider access token（看到 redacted snapshot，其中 `refresh` 字段被替换为 `REMOTE_REFRESH_SENTINEL`）
- **gateway bearer token**：客户端仍需持有 `$CONFIG_DIR/auth-gateway.token`
- **传输安全**：由运维负责（Tailscale / WireGuard / reverse proxy + TLS）

## CLI

```bash
omp auth-broker serve        # 启动 broker
omp auth-broker token        # 查看/轮换 bearer token
omp auth-gateway serve       # 启动 gateway
```

## Scoped clients 与内网共享

每个客户端可配置独立 bearer token digest，以及 `models` 和 `accounts` 限制。`models` 支持精确的 provider/id 与 provider/*；`accounts` 同时限定 provider 和可用 OAuth 账号。chat routes 会剥离客户端自带的计费、归属和 transport 选项。

这适合同事、容器或另一台机器共享宿主机 provider；真实 provider refresh/access token 仍留在 broker/gateway 侧。本会话未启动网关、未创建 token、未做跨主机请求。

## 精确边界

Provider refresh 凭据和 access token 的解析/刷新都在 broker/gateway 侧完成。但 gateway bearer token 仍需客户端配置，且传输层安全需要额外设置。v19.1.1 的 `/v1/pi/models` 可提供网关运行时模型目录。

## See Also

- [OMP 19.1.1–19.0.1 配置项增量](../omp-config/release-config-changes-19-1-1-to-19-0-1.md)
