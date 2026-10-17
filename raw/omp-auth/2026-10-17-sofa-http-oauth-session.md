# SOFA 官方接入与原生 OAuth 会话摘录

> Source: 2026-10-17 当前会话的用户问题与工具返回；[SOFA About](https://agents.stackoverflow.com/about)；[SOFA 技术说明](https://agents.stackoverflow.com/skill.md)
> Collected: 2026-10-17
> Published: Unknown

## 用户问题与选择

用户先询问 SOFA 的目标、REST API 的用途以及 HTTP MCP 与 stdio 的关系，随后明确要求 OMP 使用官方 HTTP MCP，完成其原生 OAuth。用户要求从本地网络设置寻找可用方案，不要求服务降低检查强度。

用户原话：

> stop only when we can make omp mcp via http work well, and omp oauth for this http mcp can work ok too

官方 About 提供的接入命令：

```text
codex mcp add sofa --url https://agents.stackoverflow.com/mcp
```

官方页面将 SOFA 描述为供 AI agents 和 developers 分享已验证实现知识的知识交流平台。官方 HTTP MCP 已确认；本次没有找到官方 stdio 可安装发行物，不能据此断言官方只有 HTTP。

## 最终保留的 OMP 配置片段

本段只摘录目标条目，未包含其他服务、身份或凭据字段。

```json
{
  "sofa": {
    "type": "http",
    "url": "https://agents.stackoverflow.com/mcp",
    "auth": {
      "type": "oauth",
      "resource": "https://agents.stackoverflow.com/mcp"
    },
    "oauth": {
      "redirectUri": "http://127.0.0.1:3000/callback",
      "callbackPort": 3000
    }
  }
}
```

条目位于 `~/.omp/agent/mcp.json` 的 `mcpServers.sofa`。本次核对的本地凭据位置为 `~/.omp/agent/agent.db`，access token、refresh token 由 OMP 管理；没有将其复制到 MCP 配置中。本次使用本地凭据管理，未增加自建常驻中转服务。

## 原生流程返回的白名单摘录

以下保留原始字段与值，省略客户端标识、完整授权 URL、身份信息和凭据内容。

```json
{"oauthDiscovery":true,"authorization":"https://agents.stackoverflow.com/mcp/oauth/authorize","token":"https://agents.stackoverflow.com/mcp/oauth/token","registration":"https://agents.stackoverflow.com/mcp/oauth/register"}
{"oauthPath":"/mcp/oauth/register","status":201,"challenge":null}
{"oauthPath":"/mcp/oauth/token","status":200,"challenge":null}
{"oauthStoredInNativeOmpVault":true,"refreshAvailable":true,"expiresInSeconds":900}
{"officialOmpHttpConnected":true,"toolCount":25}
{"tool":"sofa_guidance","isError":false,"contentTypes":["text"]}
{"tool":"sofa_attention","isError":false,"contentTypes":["text"]}
```

后续原生刷新、重复调用及重连有成功记录；这些记录与网络失败样本并存。完整 TUI 授权操作过程未逐步验收，长期续用未验证。

## REST 与 MCP 的证据边界

本次早期 REST 对照中，`curl_cffi` 的 Chrome-compatible transport 在不带 cookie 的样本中取得 metadata 200、session 201 和身份查询 200；REST 辅助入口保留在 `~/.sofa/rest.py`。这些结果只证明当时该客户端的 REST 请求可用，不能推广为 OMP 原生 MCP 已通过。

stdio 只描述宿主与本地子进程的通信方式；若该子进程继续访问远程服务，仍需独立验证远程请求及其认证。没有将社区 stdio 实现的结果作为官方 HTTP MCP 的验证结果。

## 摘录边界

早期会话含凭据及 cookie/clearance 诊断材料，本文件仅保留请求方法、公共路径、状态码、必要配置及结果字段。不保存密钥、cookie、session token、clearance 值、完整认证 headers 或可恢复这些值的命令参数。
