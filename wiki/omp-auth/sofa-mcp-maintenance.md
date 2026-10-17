# SOFA 官方 MCP：OMP 接入、维护与验证

> Sources: SOFA 官方说明、OMP MCP 配置文档、Chrome 官方文档及本机会话验证，2026-10-17
> Raw: [官方接入与 OAuth](../../raw/omp-auth/2026-10-17-sofa-http-oauth-session.md); [loopback 回调](../../raw/omp-auth/2026-10-17-omp-oauth-loopback-callback.md); [路由与网络验证](../../raw/proxy-ops/2026-10-17-sofa-routing-and-validation.md); [Chrome 授权辅助](../../raw/agent-tooling/2026-10-17-chrome-cdp-existing-profile.md); [逐项工具测试](../../raw/agent-tooling/2026-10-17-sofa-mcp-smoke-test.md)
> Updated: 2026-10-17

## 维护时查哪里

| 问题 | 查阅位置 | 检查内容 |
|---|---|---|
| 找不到服务、地址或认证参数错误 | `~/.omp/agent/mcp.json` 的 `mcpServers.sofa` | 只查看目标条目，核对官方 URL、`auth` 和 `oauth` |
| 授权失效、刷新失败 | OMP 的 `/mcp reauth sofa`；SOFA 授权管理 | 凭据由 OMP 管理，本次本地位置为 `~/.omp/agent/agent.db`；不手动编辑或复制数据库 |
| Cloudflare challenge、域名路由或代理目标失效 | Clash Verge 当前 profile 的规则增强 | 从 `profiles.yaml` 的当前 profile 查到 `option.rules`，再找到关联规则文件 |
| 配置文件与实际连接表现不一致 | 生成的 `clash-verge.yaml` 与 controller 运行时连接记录 | 仅核对必要规则和当前请求命中；生成配置不是持久修改入口 |
| 权限不足、写入成为草稿、需要审核 | SOFA 的 My Agents 与当前 `connection_status` | 核对 publication policy、授权范围及内容生命周期 |
| 查本次哪些工具测试过 | 本文链接的逐项工具测试 raw | 区分接口调用成功、私有草稿、公开发布和未执行路径 |
| 选用 REST 辅助客户端 | 本次保留的 `~/.sofa/rest.py` 及其本地环境配置 | REST 的客户端与认证单独维护，不读取或展示凭据内容 |

默认 OMP 路径可能随 active profile 或环境覆盖而变化，维护前以当前配置来源为准。Clash Verge 目录使用 `%APPDATA%\io.github.clash-verge-rev.clash-verge-rev\`，规则文件沿当前 profile 关联查找，不保存某台机器的 UID 或节点名称。

## 接口用途与当前连接

SOFA（Stack Overflow for Agents）提供供 Agent 与开发者分享实现知识的平台，包含问题、TIL、Blueprint、Playbook、回复、投票及应用结果 verification。REST 和 MCP 是接入方式，具体能力以各自接口和授权为准。

本次采用官方 HTTP MCP `https://agents.stackoverflow.com/mcp`。官方 HTTP 接入已确认；本次未找到官方 stdio 可安装发行物。stdio 子进程若继续访问远程服务，仍需验证远程认证与请求。

目标配置的关键字段：

```json
{
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
```

这是本次保留配置的片段，不包含凭据。OMP 管理 access token、refresh token 和刷新；当前运行方案由 OMP、Clash 路由和官方 SOFA 服务组成，没有额外自建常驻中转服务。

## OAuth 回调由谁管理

OMP 在授权过程中自动启动临时 loopback 监听，接收 authorization code、交换并保存凭据，随后关闭监听。日常调用和 refresh token 续用无需维护回调服务。

默认端口为 `3000`，默认路径为 `/callback`；HTTP loopback `redirectUri` 可提供端口和路径。本次已写明 URI，因此额外的 `callbackPort: 3000` 属于冗余配置，未在会话中删除。

本次使用 `localhost` 的注册收到 `invalid_redirect_uri`，改用 `127.0.0.1` 后完成注册及授权。显式 URI 会限制端口回退；其他端口接受情况未验证。注册后仍可能在授权目标检查阶段遇到 `invalid_target`，需分别核对 `auth.resource`。

## 路由维护与网络判断

持久规则只匹配 `agents.stackoverflow.com`，通过当前 profile 的规则增强选择有效代理目标。修改规则后，分别核对持久文件、生成配置和运行时请求命中，避免仅凭文件内容判断连接路径。不得输出整份含节点凭据或 controller secret 的配置。

本次同时观察到原生 OAuth、刷新、工具调用和重连成功，以及初始化或 `tools/list` 收到 `ECONNRESET`。失败日志中也有握手成功、GET 返回 `text/event-stream` 后工具发现失败的样本。

**机制推断边界**：某一阶段成功不能推导其他阶段成功；接近五秒的失败时间不能定位具体超时组件。错误来源未确定，不能据此确认代理节点故障。

HTTP 429 按限流响应处理，停止密集测试并等待。用户把验收限定为当前网络条件下的实际可用性；取消的额外测试没有计入通过。Clash 重启后的加载、长期网络可靠性与长期 OAuth 续用仍未验证。

## 工具与发布状态快照

截至本次记录，暴露 25 个工具，23 个实际调用成功，`sofa_edit_post` 和 `sofa_delete_post` 因没有可授权的自有 canonical post 未执行。完整逐项清单只在[测试原始记录](../../raw/agent-tooling/2026-10-17-sofa-mcp-smoke-test.md)维护；后续使用时以当前暴露工具为准。

当时的 `publication_policy` 为 `draft_directly`，五类内容各创建一份私有草稿，最终共五份保留。question 草稿读取版本 1，修改标题后返回版本 2。草稿创建与修改有成功证据；公开发布、公开 reply 挂接及 canonical post 编辑、删除未验证。

私有草稿 ID 不可当作 post ID 使用。本轮 MCP 清单没有草稿删除或批准操作，需要由人类在 My Agents 审核或删除。投票、native verification、external verification 各有一次实际写入；外部 application 结果来自实际运行 JSON 示例，没有提交 currency 评估。

`sofa_guidance` 正常返回，但声明状态为 `unknown`，原值保留。接口成功返回不保证所返回的每项业务状态均已满足，也不构成长时间可用性的证明。

## 浏览器授权辅助

Chrome 官方 auto-connect 支持经用户批准复用现有 profile。它可访问该 profile 的标签页、存储和 cookies，启用前需明确授权范围。文档中的使用统计及 performance trace URLs 发送选项也需要单独检查。

本次没有验证 WSL 到 Windows 的 auto-connect，也没有将 CDP 加入日常 MCP 调用或凭据刷新的运行依赖。

## 如何更新这篇文章

配置、OAuth 行为、网络条件或服务工具发生变化时，保存新的脱敏 raw，再修改对应章节，并更新 `Sources`、分号并列的 `Raw`、`Updated`、索引和日志。首次提交后的 raw 保持冻结；测试结果保留日期与条件，不把旧快照当作当前状态。

raw 和 wiki 均不保存真实凭据及其截断值、身份、私有对象 ID、profile UID、订阅或节点名称、出口 IP、用户或机器路径。配置关联使用通用路径及明确占位符，保留公共服务 URL、技术字段和必要结果。raw 不经过配置同步的自动脱敏，写入时需要单独检查。

## See Also

- [三家宿主 MCP 配置、验证阶梯与凭据事故](../harness-engineering/mcp-setup-validation.md) — 通用配置与验证方法
- [LLM API SSE 流式调用：代理链路的机制、影响与配置](../llm-proxy-sse/llm-api-sse-proxy-chain.md) — 通用连接机制与代理配置边界
