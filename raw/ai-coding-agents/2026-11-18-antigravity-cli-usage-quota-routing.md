# Antigravity CLI 用量查询与配额/许可证错误：单账号实测摘录

> Source: 本机 Antigravity CLI 1.5.10 会话与日志、Clash Verge Rev 运行时 controller 查询，2026-11-17/18
> Collected: 2026-11-18
> Published: Unknown

## 环境

- 客户端：`agy` 版本 1.5.10。
- 账号：`<ACCOUNT_EMAIL>`（consumerOAuth）。
- 账号 Terms 国家与付款资料国家均为新加坡。
- 本机请求出口（ipinfo）：国家 HK，运营商 AS4760 HKT Limited，地区 Tung Chung。
- WSL 内没有 `*_proxy` 环境变量，流量经 Clash TUN。

## 用量查询入口

- TUI 输入 `/usage`（别名 `/quota`）打开交互面板。
- 打印模式默认展开 slash 命令；`agy -p "/usage"` 输出文本摘要；`--disable-slash-commands` 关闭展开。
- `/credits` 打开 credits 面板；打印模式 `agy -p "/credits"`。
- IDE 侧：Settings → Models 列出各模型组剩余配额；选择模型时下拉列表在接近上限时显示警告图标。

## 第一次 1008 错误

`agy -p "/usage"` 与 `agy -p "/credits"` 失败，日志：

```text
2026-11-17T22:52:21.1209559+08:00 ERROR [antigravity]
  token_manager: Failed to get token:
  StatusError { code: Some(PermissionDenied), message:
  "Request had insufficient authentication scopes...",
  ... error_details: "details": [{"@type": "type.googleapis.com/google.rpc.ErrorInfo",
  "reason": "UNSUPPORTED_LOCATION","domain": "cloudaicompanion.googleapis.com",
  "metadata": {"error_number": "1008"}}] } }
```

同一秒调用：

```text
https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary
```

`agy models` 正常返回模型列表（Gemini 3.8 Flash、Claude Sonnet 4.6、Claude Opus 4.6、GPT-OSS 120B），登录本身正常。

## 手动访问 quota URL 的结果

- 浏览器 GET `https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary` 返回 404。
- 无认证 `curl -X POST` 返回 401。
- 该地址是只接受 POST 的 gRPC 方法路径（`v1internal:<method>` 是 custom verb 写法），浏览器 GET 没有注册路由。

## 新加坡节点实验

规则增强文件（2026-11-17 23:46:08 写入）：

```yaml
prepend:
  - 'DOMAIN,vscode.download.prss.microsoft.com,<PROXY_GROUP>'
  - 'DOMAIN,daily-cloudcode-pa.googleapis.com,<SG_NODE>'
```

`clash-verge.yaml` 于 23:46:17 重新生成。controller `/rules` 第 1 条为 `Domain,daily-cloudcode-pa.googleapis.com` → `<SG_NODE>`。`/connections` 显示 daily 连接命中 `Domain`，链路为 `['<SG_NODE>']`。

23:47:34 复测 `agy -p "/usage"`，仍然 403 `UNSUPPORTED_LOCATION`。规则命中只证明路由，不能证明该节点出口被服务端接受。

## 美国节点实验

规则增强文件（2026-11-17 23:51:15 写入）：

```yaml
prepend:
  - 'DOMAIN,vscode.download.prss.microsoft.com,<PROXY_GROUP>'
  - 'DOMAIN-SUFFIX,antigravity.google,<US_NODE>'
  - 'DOMAIN,accounts.google.com,<US_NODE>'
  - 'DOMAIN,oauth2.googleapis.com,<US_NODE>'
  - 'DOMAIN,www.googleapis.com,<US_NODE>'
  - 'DOMAIN,daily-cloudcode-pa.googleapis.com,<US_NODE>'
  - 'DOMAIN,cloudcode-pa.googleapis.com,<US_NODE>'
  - 'DOMAIN,aicode.googleapis.com,<US_NODE>'
```

controller `/rules` 第 1 到第 7 条按上述顺序加载。`<US_NODE>` 节点存在，类型 Vless，最近延迟 491–506 ms。

2026-11-17 23:51:35 `agy -p "/usage"` 成功：

```text
Gemini Models        Weekly Limit Remaining  100%  2026-11-24T15:54:04Z
Claude and GPT models Weekly Limit Remaining 100%  2026-11-24T15:58:40Z
```

`/connections` 确认 daily 连接链路为 `['<US_NODE>']`。

2026-11-18 复测（成功生成一次后）：

```text
Gemini Models          Weekly Limit Remaining  99%   2026-11-24 23:54 CST
Claude and GPT models  Weekly Limit Remaining  100%  2026-11-25 00:10 CST
```

## `/credits` 无记录

日志：

```text
2026-11-18T00:01:44.790688+08:00 ERROR GetG1Credits: starting fetch
2026-11-18T00:01:44.790706+08:00 ERROR /credits failed: retrieving credits: no credits info found
```

两条记录相隔 18 微秒，期间没有 HTTP 请求。二进制中存在 `GetG1Credits: paidTier is nil` 的错误分支。当前账号没有 credits 记录；周额度与 credits 是两套数据。

## 1001 许可证错误

TUI 内发送 `hello` 后：

```text
403 PERMISSION_DENIED
reason: SUBSCRIPTION_REQUIRED
error_number: 1001
message: "You do not have a valid license of this product..."
help link: https://cloud.google.com/gemini/docs/codeassist/request-license
```

同一秒 `retrieveUserQuotaSummary` 也返回 1001。几分钟后新进程 `agy -p "/usage"` 成功，`agy -p "hello"` 正常返回。旧 TUI 会话保留了失败状态。

## 调用链与主机

日志中出现的调用与主机：

- `daily-cloudcode-pa.googleapis.com/v1internal:loadCodeAssist`、`fetchAvailableModels`、`retrieveUserQuotaSummary`
- `aicode.googleapis.com/v1alpha:fetchConfig`（超时后回退到 CCPA `ListExperiments`）
- `oauth2.googleapis.com`、`accounts.google.com`、`www.googleapis.com`、`play.googleapis.com`

`loadCodeAssist` 是 Code Assist 后端的开通调用，返回档位（`currentTier` / `allowedTiers`）并分配项目（`cloudaicompanionProject`）；1008 与 1001 错误域均为 `cloudaicompanion.googleapis.com`。

## 配置文件时间线

- 23:46:08：规则增强文件写入（两行版本）。
- 23:46:17：`clash-verge.yaml` 生成。
- 23:51:15：规则增强文件写入（四行版本，含 `cloudcode-pa` 与 `aicode`）。
- 23:51:21：`clash-verge.yaml` 再次生成。
- mtime 只能确认写入时间，不能确认写入者；agent 本会话只读取，没有写入。

## 证据边界

- 本实验没有直接测量新加坡节点的出口地区；后续隔离测量见 [出口与域名对照](../proxy-ops/2026-11-18-antigravity-egress-and-domain-routing.md)：IPinfo 和 Cloudflare 将该节点出口识别为新加坡，当次生成仍返回 1008。换到美国节点后 `/usage` 成功。
- 1001 的具体触发点没有日志证据；只确定旧 TUI 失败、新进程成功。
- Antigravity 使用 Code Assist 后端由请求契约、错误域与社区协议确认；Google 未公开架构文档。
- 结论来自单个账号、单台机器、2026-11-17/18；不推广到其他套餐、地区或节点稳定性。
