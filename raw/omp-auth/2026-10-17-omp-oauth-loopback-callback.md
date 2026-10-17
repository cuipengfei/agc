# OMP MCP OAuth loopback 回调摘录

> Source: 2026-10-17 当前会话的回调调查与注册结果；[OMP MCP configuration](https://github.com/can1357/oh-my-pi/blob/main/docs/mcp-config.md)
> Collected: 2026-10-17
> Published: Unknown

## 用户问题

> why do we need to specify local 3000 port here? if omp has integration for mcp oauth, can omp itself not just manage all of ? why we have to specify local port for this use case?

## 官方文档原文

> Use `oauth` when the MCP server requires explicit OAuth client, scope, or callback settings. The callback listener defaults to port `3000` and path `/callback`; an HTTP loopback `redirectUri` supplies its own port/path unless explicitly overridden. An HTTPS loopback redirect requires a distinct `callbackPort` for the local HTTP listener behind your TLS terminator.

> For managed OAuth, `auth` tells OMP how to find and refresh the stored credential.

调查注释：公共源码复核从 `packages/coding-agent/src/mcp/oauth-flow.ts` 及文档列出的 `packages/coding-agent/src/mcp/oauth-credentials.ts` 开始；具体源码布局以安装版本为准。本次回调机制结论来自会话中读取的已安装实现及上述文档，后续升级应重新核对。

## 本次观察

- 默认形式 `http://localhost:3000/callback` 在动态客户端注册阶段收到 HTTP 400、`invalid_redirect_uri`。
- 改用 `http://127.0.0.1:3000/callback` 后，注册返回 HTTP 201，随后完成授权和 token 交换。
- 注册成功后仍曾遇到 `invalid_target`；最终配置的 `auth.resource` 为官方 MCP URL。回调注册与授权目标检查是独立阶段。

## 会话中核对的实现行为

OMP 自动启动临时 loopback 监听、接收 authorization code、完成凭据交换，并在授权流程结束时关闭监听。日常 MCP 调用和 refresh token 续用无需维护这个监听。

已有上述 HTTP `redirectUri` 时，端口和路径可由 URI 推断，额外的 `callbackPort: 3000` 在本次配置中属于冗余。显式 `redirectUri` 会限制端口回退；本次没有更改这一配置，也未验证 SOFA 接受其他端口。

## 证据边界

`localhost` 与 `127.0.0.1` 的结果是本次服务与客户端组合的观察，不代表所有 OAuth 服务具有同样限制。没有保存完整浏览器授权 URL、authorization code、state、客户端私有标识或任何凭据。
