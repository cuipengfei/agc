# OMP Auth Broker 与 Auth Gateway 源码取证

> Source: can1357/oh-my-pi upstream
> Collected: 2026-09-09

## 关键文件

### docs/auth-broker-gateway.md

`docs/auth-broker-gateway.md:1-8`：

```
- `omp auth-broker serve` holds the canonical SQLite credential vault, performs OAuth refreshes
- `omp auth-gateway serve` is a forward-proxy
- Clients never see the access token
- Transport security delegated to operator (Tailscale / Wireguard / reverse proxy + TLS)
```

`docs/auth-broker-gateway.md:42`：

```
The broker is the only writer of OAuth refresh tokens. Clients load a redacted snapshot in which every `refresh` field has been replaced with `REMOTE_REFRESH_SENTINEL`.
```

### 数据流

```
developer laptop / CI / robomp
  → omp auth-broker serve (SQLite vault, refresh tokens)
  → omp auth-gateway serve (forward-proxy, OpenAI/Anthropic/pi-native)
  → gateway clients (llm-git, macOS widget, robomp containers, IDE plugins)
  → api.anthropic.com / api.openai.com / ...
```

## 结论

- broker 保存 provider refresh 凭据，执行 OAuth 刷新
- access token 在 broker/gateway 侧解析，客户端看不到 provider access token
- 客户端仍需持有 gateway bearer token
- 跨主机传输安全由运维负责（Tailscale / WireGuard / TLS）
