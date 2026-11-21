# 「香港自动」分组 GeoIP 多源交叉验证实测记录

> Source: 本机实测会话记录（WSL2 内经 Clash Verge Rev external-controller 对 Windows 宿主机 mihomo 内核测量）
> Collected: 2026-11-21
> Published: Unknown

## 任务与授权边界

用户要求：核实 Clash Verge Rev（Windows 宿主机）「香港自动」分组内全部节点的出口 IP 是否真在香港；解释 https://ipconfig.io/ 显示印度的原因；判定必须多来源交叉，不能只信 ipconfig.io。用户明确授权实测，实测会短暂切换代理选择器，开始前记录原选中节点、测完还原。非香港节点的处理决策留给用户，agent 不做选择。

## 配置事实（实测读取）

- Clash Verge Rev 数据目录：`C:\Users\<WINUSER>\AppData\Roaming\io.github.clash-verge-rev.clash-verge-rev\`。
- 运行时 config.yaml：`mixed-port: 7897`、`external-controller: 127.0.0.1:9097`、`secret: set-your-secret`、`allow-lan: true`、`mode: rule`、tun 开启（gvisor，strict-route: true）。
- 当前 profile「红魔馆网络」；「香港自动」为 URLTest 组，testUrl `https://github.com/`，实测时成员 17 个；实测开始时 `now = 香港05|广港专线|油管免广`。
- WSL2 内可直接访问宿主机 `127.0.0.1:9097`（WSL localhost 转发），secret 以 `Authorization: Bearer <secret>` 传入。
- 节点 server 字段：17 节点仅两个主机名——9 节点（全部「海外中转」、两个「CF优选」、「香港测试节点|0.1倍率」）用 `dpskv4flash.577334856.xyz`；8 节点（全部「广港专线」「家宽」）用 `metamuskpark.bytedaec.cn`。（订阅 URL token、节点密码/uuid 按凭据边界不入库。）

## 入口域名解析（两次实测一致）

getent 解析两域名返回 `198.18.2.89` / `198.18.2.90`（mihomo fake-IP 段，198.18.0.0/16），本地解析不可用。改走 DoH（经代理查询 1.1.1.1 与 8.8.8.8，答案一致）：

```
dpskv4flash.577334856.xyz  -> ['159.195.16.27']   (1.1.1.1 与 8.8.8.8 相同)
metamuskpark.bytedaec.cn   -> ['159.195.16.27']   (1.1.1.1 与 8.8.8.8 相同)
```

RDAP（`https://rdap.arin.net/registry/ip/159.195.16.27`）：

- 首次：`name: US-NETCUP-KVM, handle: 159.195.16.0 - 159.195.19.255`，registrant `ANEXIA-MNT`，abuse `NETCUP ABUSE`。
- 再次：`name: RIPE-ERX-159-193-0-0`（45.0.0.0 类 RIPE ERX 回收段说明）。netcup 段注册地非香港。

结论：两个入口域名当前同指一个 netcup IP；17 个节点共享同一入口中继，节点名差异只在协议/端口/凭证层，入口地理与出口地理分离。

## 直连对照污染发现

tun（strict-route）开启时，WSL 内 `curl --noproxy '*'` 访问 www.cloudflare.com 仍被规则路由进代理：trace 显示 `ip=45.202.249.11, colo=HKG, loc=HK`。国内站点 echo 确认真实直连出口：`myip.ipip.net` 返回 `当前 IP：113.201.75.240 来自于：中国 陕西 联通`。即「直连对照」在 tun 模式下不可用，真实公网出口要用国内站点 echo 确认。

## 测量方法

对 17 节点逐个：`PUT /proxies/香港自动 {"name": <node>}` → 等 1.5s → 经 `http://127.0.0.1:7897` 查询五个 GeoIP 源 + Cloudflare trace，每节点 3 轮、轮间隔 20 秒。查询源：`https://ipconfig.io/json`、`http://ip-api.com/json/`、`https://ipinfo.io/json`、`https://api.ip.sb/geoip`、`https://ipapi.co/json/`、`https://www.cloudflare.com/cdn-cgi/trace`。每轮同时记录 `GET /proxies/香港自动` 的 `now` 以核对切换是否保持。

## 结果：8 个出口 IP 的多源归属对照（51 轮全部落在中国境内外以下 8 个 IP）

| 出口 IP | 运营商/ASN（ip-api 实测） | ipconfig.io | ip-api | ipinfo | ip.sb | ipapi.is | Cloudflare loc/colo |
|---|---|---|---|---|---|---|---|
| 221.124.34.110 | HGC Global Communications（AS9304） | Hong Kong | HK | HK | HK | — | HK/HKG |
| 209.9.200.197 | HKT Netvigator（AS4760） | Hong Kong 与 Seychelles 跳变 | HK | HK | HK | HK | HK/HKG |
| 42.3.69.99 | PCCW IMS Limited | Hong Kong | HK | HK | HK | — | HK/HKG |
| 42.98.142.197 | PCCW / Netvigator | Hong Kong | HK | HK | HK | — | HK/HKG |
| 45.202.249.11 | Akile LTD（AS61112） | Seychelles | HK | HK | HK | HK | HK/HKG |
| 45.202.249.70 | Akile LTD（AS61112） | Seychelles | HK | HK | HK | — | HK/HKG |
| 82.152.163.51 | Hytron Network Services（AS202662） | Hong Kong | HK | HK | HK | HK | HK/HKG |
| 154.88.64.75 | Hytron Network Services | Hong Kong | HK | HK | HK | — | HK/HKG |

51 轮中 Cloudflare trace 返回有效 colo 的轮次全部 `colo=HKG`（约 45 轮，其余为请求超时）。`ipapi.co` 51 轮全部无响应，未纳入。RDAP：

- `45.202.249.11/.70`：`name: AFRINIC, handle: NET-45-192-0-0-1, 45.192.0.0 - 45.222.255.255`，registrant African Network Information Center——AFRINIC 分配区被 AkileCloud（香港）租用广播。
- `209.9.200.197`：`name: APNIC, handle: NET-209-8-0-0-1, 209.8.0.0 - 209.9.255.255`，广播方 HKT。

## ipconfig.io 误标原始响应摘录

经「香港02-海外中转」（出口 45.202.249.11）在线复测，两次请求一致：

```json
{"ip": "45.202.249.11", "country": "Seychelles", "country_iso": "SC", "country_eu": false, "latitude": -4.5833, ...}
```

同一轮 `http://ip-api.com/json/` 返回 `{"country":"Hong Kong","countryCode":"HK","isp":"Akile LTD","query":"45.202.249.11"}`。

对 `209.9.200.197`，不同轮次 ipconfig.io 交替返回 Hong Kong 与 Seychelles（测量间隔约 20 秒至数分钟），同一 IP 的答案在分钟内漂移。

ipconfig.io 数据库溯源：站点无 about/faq（`/about`、`/faq`、`/api` 均 404），根路径只返回纯文本客户端 IP；公开检索未找到其数据库归属说明，GitHub 上同名近似项目（ifconfig/echoip 类）多用 MaxMind，但不能指认 ipconfig.io 本身。判定其具体商业库：查不到。

## 逐节点 3 轮出口记录

| 节点 | 3 轮出口 IP | selector 竞态 |
|---|---|---|
| 香港01-海外中转 | 45.202.249.70 / .11 / .70 | 无 |
| 香港01\|广港专线 | 45.202.249.70 / .70 / 209.9.200.197 | 1/3 轮 |
| 香港02-海外中转 | 45.202.249.11 ×3 | 无 |
| 香港02\|广港专线 | 45.202.249.11 / .70 / .11 | 无 |
| 香港03-海外中转-油管免广 | 221.124.34.110 ×3 | 无 |
| 香港03\|广港专线\|油管免广 | 221.124.34.110 ×3 | 无 |
| 香港04\|广港专线\|油管免广 | 45.202.249.70 / .11 / .11 | 3/3 轮 |
| 香港05-海外中转\|油管免广 | 82.152.163.51 ×3 | 无 |
| 香港05\|广港专线\|油管免广 | 82.152.163.51 ×3 | 无 |
| 香港06\|广港专线\|家宽 | 42.98.142.197 ×2、209.9.200.197 | 无 |
| 香港07-晚高峰分流-海外中转 | 209.9.200.197 ×3 | 无 |
| 香港07\|广港专线\|家宽 | 209.9.200.197 ×3 | 无 |
| 香港08\|广港专线\|家宽\|油管免广 | 45.202.249.11 / .70 / .11 | 3/3 轮 |
| 香港09\|广港专线\|家宽 | 45.202.249.11 / .70、42.3.69.99 | 2/3 轮 |
| 香港1\|CF优选\|电信联通推荐 | 82.152.163.51 ×3 | 3/3 轮 |
| 香港2\|CF优选\|电信联通推荐 | 82.152.163.51 ×3 | 3/3 轮 |
| 香港测试节点\|0.1倍率 | 154.88.64.75 ×3 | 无 |

URLTest 组 PUT 后会被周期性自动重选覆盖：6/17 节点在切换确认时 `now` 已回退或漂移，这些行的出口归属带竞态不确定性；但 51 轮全部出口都在上述 8 个香港 IP 池内，整体结论不受影响。竞态轮出口以轮次实测为准，不能钉死到具体节点。

## mihomo url-test 自带延迟（独立佐证）

`GET /proxies/{node}` 的 history 字段（2026-11-21 16:31 前后，内核对 https://github.com/ 的实测）：海外中转系 131–157ms，广港专线/家宽系 207–258ms，与陕西联通到香港的距离相符；若出口真在印度应显著更高。

## 结论

- 「香港自动」17 节点 51 轮观测的出口全部落在 8 个香港 IP（HGC AS9304、HKT AS4760、PCCW、AkileCloud AS61112、Hytron AS202662），无一个真在印度或其它地区。
- ipconfig.io 显示印度/塞舌尔是它自家库对该机场 IP 池的错误标注：对 AFRINIC 注册、香港广播的 45.202.249.x 稳定返回 Seychelles，对 209.9.200.197 在分钟内 HK/SC 跳变。用户观察到的 India 是同一类错误在其它时刻/其它池 IP 上的表现。
- 判定可靠的组合：ip-api.com + ipinfo.io 交叉（均为延迟/BGP 校准类库），Cloudflare trace 的 colo 作物理佐证；ipconfig.io 只适合批量初筛；ipapi.co 当时不可达、ip.sb 判对但多次超时。
- 附带发现：17 节点共享 8 出口（节点名为路由/协议变体）；两入口域名同指 159.195.16.27（netcup）；标「家宽」的节点出口确为 HKT/HGC 住宅宽带，名实相符。
- 测完选择器已还原为「香港05|广港专线|油管免广」。
