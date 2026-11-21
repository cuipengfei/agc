# 代理出口 IP 指纹批量测量与形态分类

> Sources: 本机实测会话记录，2026-09-16；Antigravity 隔离出口对照，2026-11-17 至 2026-11-18；「香港自动」分组 GeoIP 多源交叉验证，2026-11-21
> Raw: [2026-09-16 出口指纹测量](../../raw/proxy-ops/2026-09-16-exit-ip-fingerprint-measurement.md); [Antigravity 出口与域名对照](../../raw/proxy-ops/2026-11-18-antigravity-egress-and-domain-routing.md); [2026-11-21 香港自动分组多源交叉验证](../../raw/proxy-ops/2026-11-21-hk-auto-group-geoip-crosscheck.md)
> Updated: 2026-11-21

## Overview

用 mihomo external-controller 逐个切换 Selector 节点、经 mixed 端口请求 `https://ipconfig.io/json`，可在几十秒内批量测出所有节点的真实出口 IP、地理位置、ASN 与 PTR。结合 Team Cymru 的 BGP 归属查询和 PTR/前缀注册史，能把节点出口分为企业商业宽频、运营商骨干、住宅宽带、机房四类，并审计节点命名是否属实。

单源 GeoIP 判定不可靠：2026-11-21 对同一机场香港组的实测中，ipconfig.io 把 AFRINIC 注册、香港广播的 45.202.249.11/.70 稳定标成 Seychelles，同一 IP 在分钟内还有 Hong Kong/Seychelles 跳变，而 ip-api、ipinfo、ip.sb、ipapi.is 与 Cloudflare colo 全部指向香港。出口国家判定必须多源交叉（方法见「多源归属交叉验证」）。

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

2026-11-21 补充三条坑：

- URLTest 组（如「香港自动」）PUT 后会被周期性自动重选覆盖：6/17 节点在切换确认时 `now` 已漂移。切后必须立即核 `now`，竞态轮次的出口归属打折、不钉死到节点；Selector 组无此问题。
- fake-IP 环境下本地 getent/dig 解析节点域名只得 198.18.0.0/16 假地址，查入口域名真实 IP 要走 DoH（1.1.1.1 / 8.8.8.8 互查）。
- tun（strict-route）开启时，终端里 `--noproxy` 的「直连」对照仍被规则路由进代理，不能当真实出口基线；真实公网出口用国内站点 echo（如 myip.ipip.net）确认。

## 隔离进程测量

需要保持原代理组和其他流量不变时，可启动独立 mihomo 进程：仅监听 localhost 的独立 mixed 端口，关闭 TUN，以目标节点为唯一出站，并通过该端口发送测量请求。临时配置经 stdin 提供；测量后停止进程并删除临时目录。节点认证信息只在进程内处理。

2026-11-18 的一次测量中，独立进程使用的节点入口 DNS 结果与原客户端节点专用 DNS 不同，导致握手失败；采用节点专用 DNS 结果后取得出口。IPinfo 和 Cloudflare 将该出口识别为新加坡，Google 无登录 Terms 页面显示中国。该页面结果是一次观察，Antigravity 服务内部采用的国家代码未公开。

## 归属冲突的收敛规则

IP→ASN 归属存在两类数据源：**BGP 宣告**（远端实际看到的 origin AS）与 **whois 注册**（前缀的注册持有者，可能是转售/租方）。两者冲突时以 BGP origin 为准。实测命令：

```
dig +short TXT <反向IP>.origin.asn.cymru.com
```

返回形如 `<AS> | <前缀> | <国家> | <RIR> | <注册日期>`。本例中 ipconfig.io 与 ipinfo.io 对同一 IP 给出不同 ASN（AS4515 vs AS137897），Team Cymru 收敛到 AS4515——ipinfo 在该 IP 上用了注册归属。查询建议指定公共递归 DNS（如 `dig ... @1.1.1.1`），避免本地代理 DNS 劫持干扰 TXT 查询。

## 多源归属交叉验证

国家判定与 ASN 判定一样存在数据源分歧。GeoIP 库按校准方式分两类：按 RIR 注册地或旧快照推断的库，对「注册地与广播地分离」的租用段（典型：AFRINIC 段被香港商家租用广播）会整段标错国家；按延迟测量与 BGP 广播校准的库能跟上买段搬家。

2026-11-21 对同一机场「香港自动」URLTest 组 17 节点 × 3 轮的实测：51 轮出口全部落在 8 个香港 IP（HGC AS9304、HKT AS4760、PCCW、AkileCloud AS61112、Hytron AS202662 五个香港 ASN），Cloudflare trace 返回有效 colo 的轮次全部 `colo=HKG`。分歧全部来自 ipconfig.io：它对 45.202.249.11/.70（RDAP 实测 45.192.0.0 - 45.222.255.255 属 AFRINIC 分配区）稳定返回 `country: Seychelles`，对 209.9.200.197 在分钟内交替返回 Hong Kong 与 Seychelles；同一批 IP 在 ip-api、ipinfo、ip.sb、ipapi.is 全部判 HK。用户同期观察到 ipconfig.io 显示 India，是同一 IP 池上同类错误标注的另一个值。ipconfig.io 所用商业库无公开说明（站点无 about/faq 页），只能按实测行为定性。

判定组合（按可靠度）：ip-api.com + ipinfo.io 双源交叉（均为延迟/BGP 校准类）一致即可采信；关键判断再加 Cloudflare trace 的 `colo=` 作物理佐证（anycast 落地机房不会说谎），并用 RDAP 查前缀注册 RIR 与广播方是否分离。ipconfig.io 降为批量初筛；ipapi.co 当日 51 轮全部无响应；ip.sb 判对但多次超时。内核对各节点 url-test 的延迟历史（`GET /proxies/{node}` 的 history，本次实测 131–258ms，与陕西联通到香港距离相符）可作不经过测量方的独立佐证。

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

2026-11-21 复测同一机场「香港自动」组的补充观察：

- 17 节点共享 8 个出口 IP，节点名只是协议/端口/凭证变体；两个入口域名（9 节点用一个、8 节点用另一个）经 DoH 双解析器查询同指 159.195.16.27（netcup 段，注册地非香港）——入口中继与出口地理分离，入口在哪对出口国家判定没有指示作用。
- 标「家宽」的节点出口为 HKT Netvigator / HGC 的住宅宽带产品线，名实相符。与 2026-09-16 观察到的「家宽名不符」并存：同一机场不同批次命名虚实不一，必须逐批实测。

## 教训记录

- 首次汇报把 7 个唯一出口误算为 6 个（漏数一个 IP）。去重计数要脚本化复核，不手数。
- 出口 IP 是测量时刻的快照；中转类节点的落地可能随时间变化，稳定性需复测确认。
- 首轮报告用 ipconfig.io 单源且未交叉验证，用户同期观察到 India 才暴露其库误标。出口国家判定从第一天就该双源交叉（ip-api + ipinfo）并以 Cloudflare colo 佐证。
- URLTest 组测量有切换竞态（本次 6/17），逐节点归属表必须给竞态轮标注「归属不确定」，竞态轮出口不能钉死到节点。

## See Also

- [专有代理客户端迁移到标准 Clash：通用取证方法](proprietary-client-to-clash-migration.md)
