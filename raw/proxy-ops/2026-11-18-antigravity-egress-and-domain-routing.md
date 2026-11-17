# Antigravity 节点出口与域名定向：本机会话证据

> Source: 2026-11-17 至 2026-11-18 本机会话；本机 Clash Verge Rev 与 mihomo controller、agy 1.5.10 脱敏日志及隔离测量；https://www.clashverge.dev/guide/rules.html；https://wiki.metacubex.one/config/rules/；https://docs.cloud.google.com/docs/security/compliance/deploy-antigravity-us-public-sector；https://github.com/MetaCubeX/mihomo/blob/Meta/config/config.go
> Collected: 2026-11-18
> Published: Unknown

## 地址与实际连接

OMP 18.22.0 的 `antigravity-cli` 登录实现识别 `accounts.google.com`；凭据刷新代码访问 `oauth2.googleapis.com/token`。独立的 `agy` 日志记录 `daily-cloudcode-pa.googleapis.com` 的 `loadCodeAssist`、`fetchAvailableModels`、`retrieveUserQuotaSummary`，以及 `play.googleapis.com/log`。用户的 `/usage` 输出记录 `www.googleapis.com/oauth2/v2/userinfo` 的 `EOF`。

一次 OMP 最小请求的 `agy` 日志记录 `CCPA routed this account to AICode`，访问 `aicode.googleapis.com/v1alpha:fetchConfig`。同一时段 Clash `/connections` 显示 `daily-cloudcode-pa.googleapis.com` 走用户设置的新加坡节点，而 `aicode.googleapis.com` 走原有香港节点。另有 OMP 生成日志记录 `daily-cloudcode-pa.googleapis.com/v1internal:streamGenerateContent` 返回 `429`。

Google 的公开部门部署文档列出 `daily-cloudcode-pa.googleapis.com`、`cloudcode-pa.googleapis.com` 和 `aicode.googleapis.com`。文档的地址清单与本次实测访问范围分别记录；`cloudcode-pa.googleapis.com` 是否被该账号的生成请求使用没有确定。`antigravity.google` 是产品网站域名，网站连接与上述服务连接分别按目标域名匹配规则。

## Clash 规则

用户在前置规则中放置 `DOMAIN,daily-cloudcode-pa.googleapis.com,<SG_NODE>`；Clash 连接详情显示规则为 `Domain(daily-cloudcode-pa.googleapis.com)`，链路为 `<SG_NODE>`。用户随后给出的规则还包含 `DOMAIN-SUFFIX,antigravity.google,<US_NODE>`，以及 `accounts.google.com`、`oauth2.googleapis.com`、`www.googleapis.com`、`daily-cloudcode-pa.googleapis.com`、`cloudcode-pa.googleapis.com`、`aicode.googleapis.com` 六条 `DOMAIN` 规则，目标均为 `<US_NODE>`；保留原有 VS Code 域名规则。YAML 格式经解析；未在当次最后一次回复中再次核对这组完整规则的运行内核状态。

`DOMAIN` 是完整主机名匹配；`DOMAIN-SUFFIX` 覆盖域名及其子域。规则从上向下匹配。规则按域名匹配同机所有程序；`accounts.google.com`、`oauth2.googleapis.com`、`www.googleapis.com` 是共享域名，其他应用访问相同域名也会使用该规则。直接引用订阅节点名时，节点被移除或改名可能导致引用失效；稳定代理组可隔离规则与节点名称。

mihomo `config/config.go` 的 `parseRules` 查找规则目标：目标不在 `proxies` 且不属于 `SUB-RULE` 时返回 `proxy [%s] not found` 错误。

## 隔离出口对照

2026-11-18 的测量和对照结果如下。

测量使用现有 Windows mihomo 二进制启动独立临时进程，配置仅通过 stdin 提供；绑定 localhost 的独立 mixed 端口，TUN 关闭，单个指定节点为唯一出站。用户现有 Clash 规则和代理组选择保持不变。最初隔离进程使用的节点入口 DNS 与原客户端的节点专用 DNS 不同，造成握手失败；改用节点专用 DNS 的结果后取得出口。测后独立进程与临时目录已清理。节点入口、节点名称及出口地址均不保留。

- `<SG_NODE>` 出口 `<SG_EXIT_IP>`：IPify 返回相同出口；IPinfo 返回 `SG` / Singapore，Cloudflare 返回 `loc=SG`、`colo=SIN`；无账号 Cookie 的 Google Terms 页面显示 `Country version: China`。Google 风控页面显示该出口地址为请求源。
- 仅令诊断进程的全部请求经 `<SG_NODE>`：独立代理日志观察到 `daily-cloudcode`、`aicode` 与 OAuth 相关目标；最小生成仍返回 `403 / UNSUPPORTED_LOCATION / 1008`。该错误没有公开 Google 最终采用的国家代码。
- `<US_NODE>` 出口 `<US_EXIT_IP>`：IPinfo 返回美国 / Manassas；无账号 Cookie 的 Google Terms 页面显示 `United States`。不带 token 请求 `www.googleapis.com/oauth2/v2/userinfo` 返回 HTTP `401`，显示 HTTPS 请求到达服务。令诊断进程全部请求通过该节点后，模型生成进入工具 schema 校验并返回 `INVALID_ARGUMENT (400)`；当次没有返回 `1008`。

两个地区查询和两个生成对照均为该时段观察。Google Terms 的无登录国家版本不是 Antigravity 服务返回的内部国家代码；公网出口可能变化。
