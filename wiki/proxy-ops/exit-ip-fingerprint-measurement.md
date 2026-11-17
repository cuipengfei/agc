# 代理出口 IP 指纹批量测量与形态分类

> Sources: 本机实测会话记录，2026-09-16；Antigravity 隔离出口对照，2026-11-17 至 2026-11-18
> Raw: [2026-09-16 出口指纹测量](../../raw/proxy-ops/2026-09-16-exit-ip-fingerprint-measurement.md); [Antigravity 出口与域名对照](../../raw/proxy-ops/2026-11-18-antigravity-egress-and-domain-routing.md)
> Updated: 2026-11-18

## Overview

用 mihomo external-controller 逐个切换 Selector 节点、经 mixed 端口请求 `https://ipconfig.io/json`，可在几十秒内批量测出所有节点的真实出口 IP、地理位置、ASN 与 PTR。结合 Team Cymru 的 BGP 归属查询和 PTR/前缀注册史，能把节点出口分为企业商业宽频、运营商骨干、住宅宽带、机房四类，并审计节点命名是否属实。

## 测量方法

1. 从客户端运行时配置读取 external-controller 地址与 secret、mixed 端口（Clash Verge Rev 的 `clash-verge.yaml` 里有 `external-controller`、`secret`、`mixed-port` 字段）。
2. `GET /proxies` 列出全部代理，筛出目标区域节点（排除 Selector/URLTest/Fallback/LoadBalance 组类型）。
3. 对主 Selector 逐个 `PUT /proxies/{group}`（body `{"name": <node>}`），短暂间隔后经 mixed 端口请求 `https://ipconfig.io/json`。
4. **测完恢复 Selector 原选中节点**（先记下 `now` 字段再开始切）；注意测量期间该组承载的流量会被短暂切换。

## 复现要点（给下一个 agent）

- 核心循环只有三步：`GET /proxies` 拿全量 → `PUT /proxies/{group}` 切换 → `curl --proxy 127.0.0.1:<mixed-port> https://ipconfig.io/json`。不需要另起 mihomo 实例。
- external-controller 需要 secret 时带 header `Authorization: Bearer <secret>`（注意：这里的 Bearer 前缀与面板 API 的无前缀习惯相反）。
- 节点名含中文时 URL 路径要百分号编码（`urllib.parse.quote`）。
- 每个节点切换后等约 0.4 秒再测，请求超时设 10 秒以上；15 个节点串行约 30–40 秒。
- 稳定性判断要跨 ASN 比较：出口在同 ASN 内换 IP = 池内轮换（性质不变）；跨 ASN 变化 = 形态漂移（例如从商业宽频掉到骨干段）。至少间隔一小时测两轮再下"稳定/不稳定"结论。

`ipconfig.io/json` 一次请求返回：出口 IP、country/city、ASN、运营商、PTR（hostname）、经纬度、时区，无需本地 GeoIP 库。

## 隔离进程测量

需要保持原代理组和其他流量不变时，可启动独立 mihomo 进程：仅监听 localhost 的独立 mixed 端口，关闭 TUN，以目标节点为唯一出站，并通过该端口发送测量请求。临时配置经 stdin 提供；测量后停止进程并删除临时目录。节点认证信息只在进程内处理。

2026-11-18 的一次测量中，独立进程使用的节点入口 DNS 结果与原客户端节点专用 DNS 不同，导致握手失败；采用节点专用 DNS 结果后取得出口。IPinfo 和 Cloudflare 将该出口识别为新加坡，Google 无登录 Terms 页面显示中国。该页面结果是一次观察，Antigravity 服务内部采用的国家代码未公开。

## 归属冲突的收敛规则

IP→ASN 归属存在两类数据源：**BGP 宣告**（远端实际看到的 origin AS）与 **whois 注册**（前缀的注册持有者，可能是转售/租方）。两者冲突时以 BGP origin 为准。实测命令：

```
dig +short TXT <反向IP>.origin.asn.cymru.com
```

返回形如 `<AS> | <前缀> | <国家> | <RIR> | <注册日期>`。本例中 ipconfig.io 与 ipinfo.io 对同一 IP 给出不同 ASN（AS4515 vs AS137897），Team Cymru 收敛到 AS4515——ipinfo 在该 IP 上用了注册归属。查询建议指定公共递归 DNS（如 `dig ... @1.1.1.1`），避免本地代理 DNS 劫持干扰 TXT 查询。

## 形态分类信号

| 信号 | 指向 |
|---|---|
| PTR 含商业宽频品牌域名 | 企业/商业宽频出口 |
| PTR 为骨干网静态段（`static.<骨干AS>.net` 形态） | 运营商骨干/专线侧 |
| PTR 为大众 ISP 家庭宽带产品线域名 | 住宅宽带 |
| IPinfo/IPRegistry 标 Hosting；前缀注册于 AFRINIC/RIPE 却在亚洲使用（买段搬家） | 机房 IP |

## 命名审计

节点营销命名不反映真实线路。本例实测：

- 15 个节点去重后仅 7 个唯一出口 IP；同一出口最多挂 5 个节点名。
- 标"家宽"的节点出口 PTR 实为商业宽频域名；标"专线"与"中转"的成对节点共享同一出口；标"CF优选"的节点出口属于 VPS 云商 Hosting ASN。
- 选线应以实测出口为准，不以节点名为准。

## 教训记录

- 首次汇报把 7 个唯一出口误算为 6 个（漏数一个 IP）。去重计数要脚本化复核，不手数。
- 出口 IP 是测量时刻的快照；中转类节点的落地可能随时间变化，稳定性需复测确认。

## See Also

- [专有代理客户端迁移到标准 Clash：通用取证方法](proprietary-client-to-clash-migration.md)
