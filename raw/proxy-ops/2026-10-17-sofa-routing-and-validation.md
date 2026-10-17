# SOFA 域名路由与网络验证摘录

> Source: 2026-10-17 当前会话的用户验收要求、Clash 配置关联核对与原生 MCP 请求日志
> Collected: 2026-10-17
> Published: Unknown

## 用户要求

> we should not ask sofa to lower their checks

> we should find a fix/workaround for our local network set up

> it should be stable, or at least not very very unstable, small percentage failure is ok

随后用户重新限定验收目标：

> reinterpretation of goal: usable and stable means what we can do with current network limitations

## 持久配置与查找方法

Clash Verge 配置目录使用通用形式 `%APPDATA%\io.github.clash-verge-rev.clash-verge-rev\`。

本次核对的关联：`profiles.yaml` 的 `current` 指向 `items` 中对应 profile，该条目的 `option.rules` 指向 `profiles/<RULES_PROFILE_UID>.yaml`。应沿当前关联查找，不保留本机 UID 或固定生成文件名。

规则增强的脱敏结构如下；`<SELECTED_PROXY>` 是被移除的实际代理目标，不能直接作为有效目标使用。

```yaml
prepend:
  - DOMAIN,agents.stackoverflow.com,<SELECTED_PROXY>
append: []
delete: []
```

持久修改放在 profile 的规则增强文件；`clash-verge.yaml` 用于核对生成配置，controller 的连接记录用于核对当前规则命中和路由。只查看必要字段，未保存订阅、节点连接参数、controller secret 或出口 IP。

本次仅为 SOFA 指定出口，全局代理选择保持原样。收尾撤除了没有证明改善效果的临时 DNS 设置；临时 listener、试验分组和诊断脚本未作为最终运行依赖保留。

## 成功与失败条件

在域名定向后的 TUN 测试中，20 个新进程有 16 个完整通过、4 个在启动阶段收到 `ECONNRESET`；完整通过的进程累计完成 128 次工具调用和 16 次重连。该测试条件与后续逐项工具 smoke test 不同，不合并计算成功率。

其他连接路径出现过成功样本，密集测试也收到 HTTP 429。单次成功和不同频率下的结果不足以证明某种路径更稳定。收到限流后停止密集测试，取消的额外稳定性测试不计为通过。

## 失败请求原始白名单字段

```json
{"httpMethod":"POST","httpPath":"/mcp/oauth/token","networkError":"TypeError","networkCode":"ECONNRESET","elapsedMs":5003}
{"httpMethod":"POST","rpcMethod":"initialize","httpPath":"/mcp","httpStatus":200,"contentType":"application/json","elapsedMs":1139}
{"httpMethod":"POST","rpcMethod":"notifications/initialized","httpPath":"/mcp","httpStatus":202,"contentType":"application/json","elapsedMs":389}
{"httpMethod":"GET","httpPath":"/mcp","httpStatus":200,"contentType":"text/event-stream","elapsedMs":395}
{"httpMethod":"POST","rpcMethod":"tools/list","httpPath":"/mcp","networkError":"TypeError","networkCode":"ECONNRESET","elapsedMs":5002}
```

这些日志与成功的 OAuth、工具调用和重连结果共同保留。`ECONNRESET` 的具体来源未确定；时间接近五秒不能证明某个组件配置了对应超时。没有把失败归因为已经证实的代理节点故障。

## 尚未验证

Clash 重启后的规则加载、长期网络可靠性和长期 OAuth 续用尚未验证。验收采用用户限定的当前网络条件下的实际可用性，没有零失败保证。
