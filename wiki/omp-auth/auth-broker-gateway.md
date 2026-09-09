# OMP Auth Broker 与 Gateway

> Sources: OMP upstream documentation
> Raw: [OMP Auth Broker 与 Auth Gateway 源码取证](../../raw/omp-auth/2026-09-09-auth-broker-gateway-source.md)
> Updated: 2026-09-09

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

## 精确边界

Provider refresh 凭据和 access token 的解析/刷新都在 broker/gateway 侧完成。但 gateway bearer token 仍需客户端配置，且传输层安全需要额外设置。
