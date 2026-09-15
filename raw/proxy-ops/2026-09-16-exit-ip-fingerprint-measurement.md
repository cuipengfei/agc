# 代理节点出口 IP 指纹批量测量过程记录（匿名化）

> Source: 本机实测会话记录（某订阅的 15 个香港节点，服务与节点命名细节已泛化）
> Collected: 2026-09-16
> Published: Unknown

## 测量方法

1. Clash Verge Rev 的 mihomo 内核暴露 external-controller（本例 `127.0.0.1:9097`，secret 从客户端运行时配置读取）。
2. `GET /proxies` 列出全部代理；按名称筛出目标区域节点（本例名称含"香港"且类型非 Selector/URLTest/Fallback/LoadBalance），得到 15 个节点。
3. 对主 Selector 组逐个 `PUT /proxies/{group}`（body `{"name": <node>}`）切换，间隔 0.3–0.4 秒后经 mixed 端口（本例 7897）请求 `https://ipconfig.io/json`。
4. 测完把 Selector 恢复到原选中节点。15 个节点全部成功，总耗时约 34 秒。

## ipconfig.io/json 返回字段

实测返回 JSON 含：`ip`、`country`、`country_iso`、`region_name`、`city`、`latitude`、`longitude`、`time_zone`、`asn`、`asn_org`、`hostname`（PTR）、`user_agent`。一次请求即可获得出口 IP + 地理 + ASN + 运营商 + PTR，不需要本地 GeoIP 库。

## 结果摘要

- 15 个节点去重后只有 7 个唯一出口 IP（首次汇报误算为 6 个，被审查纠正为 7 个）。
- 多对"不同名字"的节点共享同一出口 IP（同出口最多 5 个节点）。
- 命名与实测不符案例：标注"家宽"的节点出口 PTR 为商业宽频域名（`*.<商业宽频品牌域名>` 形态）；标注"专线"与"中转"的成对节点出口相同；标注"CF优选"的节点出口实际属于 VPS 云商 ASN。

## ASN 归属冲突与收敛

同一出口 IP：ipconfig.io 报 AS4515，ipinfo.io 报 AS137897，两者冲突。用 Team Cymru DNS 查询收敛：

```
dig +short TXT <反向IP>.origin.asn.cymru.com
```

返回 `4515 | <前缀>/17 | HK | apnic | 1995-05-30`。BGP origin 是远端实际看到的宣告者；ipinfo 在该 IP 上用的是注册归属（转售方），属于已知数据源差异。结论：归属冲突时以 Team Cymru（BGP origin）为准。

7 个出口的 BGP 归属（Team Cymru 实测）：AS61112 ×2、AS9304、AS151407、AS202662、AS4760、AS4515。

## 形态分类依据

| 特征 | 指向 |
|---|---|
| PTR 含商业宽频品牌域名 | 企业/商业宽频出口 |
| PTR 为骨干网静态段（`static.<骨干AS>.net` 形态） | 运营商骨干/专线侧 |
| PTR 为大众 ISP 家庭宽带产品线域名 | 住宅宽带 |
| IPinfo/IPRegistry 标注 Hosting；前缀注册于 AFRINIC 塞舌尔/RIPE 英国却在香港使用 | 买段搬家的机房 IP |

## 通用结论

- 出口 IP 数量远少于节点数是常态；营销命名不反映真实线路差异。
- IP→ASN 归属存在"BGP 宣告 vs whois 注册"两类数据源，冲突时取 BGP origin（Team Cymru）。
- PTR 记录是免费情报：常直接暴露产品线（家宽/商宽/骨干段）。
- 前缀注册 RIR、注册年份与实际使用地不符（如 AFRINIC 段在亚洲使用）是机房段的强信号。
- mihomo external-controller 的 Selector 切换 + HTTP 代理出口探测，可在不中断日常使用的前提下批量测量（测量期间该组流量会被短暂切换，测完需恢复原节点）。
