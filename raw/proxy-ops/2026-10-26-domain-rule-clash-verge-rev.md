# Clash Verge Rev 域名定向规则与本机核对摘录

> Source: https://www.clashverge.dev/guide/rules.html; https://wiki.metacubex.one/en/config/rules/; 2026-10-26 本机 Clash Verge Rev 与 mihomo 配置、controller 只读读数
> Collected: 2026-10-26
> Published: Unknown

## 官方文档摘录

Clash Verge Rev Docs「自定义规则」，https://www.clashverge.dev/guide/rules.html ：

> ### 1. 编辑订阅规则（注意此处编辑的规则不会随着订阅更新而失效）
>
> 右键点击订阅配置文件，选择 "编辑规则"。

> ### 3. 规则类型说明
>
> 规则从上到下依次匹配，匹配到第一条符合条件的规则后停止。
>
> #### 域名规则
>
> DOMAIN - 完整域名匹配

> ### 4. 代理策略选择
>
> 在规则中指定的 "代理策略" 需要选择您配置的节点分组：
>
> `DIRECT` - 直连，不使用代理
> `REJECT` - 阻断连接
> `代理组名称` - 如 `🚀 手动切换`、`🎯 全球直连` 等

> ### 5. 规则插入位置
>
> 规则可以插入到 "前置规则" 或 "后置规则"：
>
> 前置规则：优先级最高，建议将自定义规则放在此处
> 后置规则：在订阅规则之后生效
>
> 推荐使用前置规则，因为规则按从上到下的顺序匹配，前置规则能确保您的自定义配置优先生效。

mihomo docs「Route Rules」，https://wiki.metacubex.one/en/config/rules/ ：

> ## Priority
>
> Rules will be matched in order from top to bottom, with the rules at the top having higher priority than those below.

> ### DOMAIN
>
> Matches the full domain name.

## 本机配置布局

Clash Verge Rev 版本 `2.5.8`。配置目录为 `%APPDATA%\io.github.clash-verge-rev.clash-verge-rev\`。

`profiles.yaml` 的 `current` 指向的条目：`name` 为 `红魔馆网络`，`type` 为 `remote`，`option` 键为 `allow_auto_update`、`groups`、`merge`、`proxies`、`rules`、`script`、`update_interval`。

该条目 `option.rules` 值为 `rNBxcSZKEHaF`，对应文件 `profiles/rNBxcSZKEHaF.yaml`。该文件存在，顶层键为 `append`、`delete`、`prepend`，其中 `prepend` 有 2 条，`append` 与 `delete` 均为 0 条。`prepend` 原文：

```yaml
prepend:
  - DOMAIN,vscode.download.prss.microsoft.com,红魔馆网络
  - DOMAIN,agents.stackoverflow.com,日本01-海外中转-0.6倍率
```

同目录下 `config.yaml` 的 `rules` 为空列表；`clash-verge.yaml` 含 `rules` 627 条、`proxy-groups`、`external-controller` 为 `127.0.0.1:9097`、`mixed-port` 为 `7897`。

## 运行内核读数

从 `clash-verge.yaml` 读取 controller 地址后，带 `Authorization: Bearer` 请求 `/configs`、`/rules`、`/proxies`；不带该请求头请求 `/configs` 得 `HTTP 401 Unauthorized`。

`/configs`：`mode` 为 `rule`，`tun.enable` 为 `True`，`tun.stack` 为 `gvisor`。

`/rules` 返回 627 条，前三条：

```text
0 | Domain | vscode.download.prss.microsoft.com | 红魔馆网络
1 | Domain | agents.stackoverflow.com | 日本01-海外中转-0.6倍率
2 | DomainKeyword | openai | 💬AI代理
```

`/proxies` 中 8 个代理组的类型与运行时选择：

```text
红魔馆网络 | select | now=香港07-晚高峰分流-海外中转
故障转移 | fallback | now=套餐到期：2026-11-14
⚖️负载均衡 | load-balance | 无当前选择
💬AI代理 | select | now=红魔馆网络
🌍国外媒体 | select | now=红魔馆网络
📺巴哈姆特 | select | now=红魔馆网络
Telegram | select | now=红魔馆网络
📺YouTube | select | now=红魔馆网络
```

`红魔馆网络` 组的 `proxies` 列表不含 `DIRECT`；其当前节点在运行时的 `type` 为 `AnyTLS`。

## 网络路径

WSL 侧：`wslinfo --networking-mode` 输出 `mirrored`；`HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY`、`http_proxy`、`https_proxy`、`all_proxy` 六个变量均为空；`ip route get 1.1.1.1` 输出 `via 198.18.0.2 dev eth1 src 198.18.0.1`。WSL 内可访问 `127.0.0.1:7897`。

宿主侧：网络适配器 `Mihomo` 状态为 `Up`；`HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings` 的 `proxyEnable` 为 `0`，`proxyServer` 为空；`0.0.0.0/0` 默认路由排序后首条为 `Mihomo nextHop=198.18.0.2 metric=0`，次条为 `WLAN nextHop=192.168.3.1 metric=0`。

## 一次隧道观察

经 `127.0.0.1:7897` 对 `vscode.download.prss.microsoft.com:443` 建立一次 CONNECT 隧道，响应行为 `HTTP/1.1 200 Connection established`。随后查询 `/connections`，该主机名对应一条记录：`rule` 为 `Domain`，`rulePayload` 为 `vscode.download.prss.microsoft.com`，`chains` 为 `["香港07-晚高峰分流-海外中转", "红魔馆网络"]`。

## 证据边界

本次仅记录一次隧道观察，未重复测量，未验证长期稳定性，未验证订阅更新后规则文件的保留行为。规则已加载的依据是生成配置与 `/rules` 的第 0 条，属于本机只读读数；隧道记录只说明该次连接命中了这条规则并经过该组与该节点。
