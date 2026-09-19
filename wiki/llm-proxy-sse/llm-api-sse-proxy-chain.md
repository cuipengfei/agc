# LLM API SSE 流式调用：Clash Verge/mihomo + 机场链路的机制、影响与配置

> Sources: 本机研究, 2026-09-19
> Raw: [2026-09-19-llm-api-sse-streaming-clash-mihomo-study](../../raw/llm-proxy-sse/2026-09-19-llm-api-sse-streaming-clash-mihomo-study.md); [2026-09-19-clash-verge-mihomo-local-config-forensics](../../raw/llm-proxy-sse/2026-09-19-clash-verge-mihomo-local-config-forensics.md); [2026-09-19-mihomo-keep-alive-key-name-verification](../../raw/llm-proxy-sse/2026-09-19-mihomo-keep-alive-key-name-verification.md)
> Updated: 2026-09-19

## Overview

LLM API 流式调用（SSE）的本质是单条长生命周期的 HTTP 响应流：连接任一中断这条流就死、不能续传。mihomo 本身对流式调用基本无害——它对 HTTPS 是逐字节转发的透明 TCP 隧道，不缓冲、不杀已建立的连接，url-test 自动切节点只影响新建连接；真正有害的是链路中段（节点稳定性、落地 NAT/防火墙空闲超时）。配置上能给的不多但明确：keep-alive 键只有无 `tcp-` 前缀的三个全局键，`tcp-keep-alive-*`/`dial-timeout` 不存在；keep-alive-idle 调长更不安全（15 略优于 30，已纠正）；LLM API 域名固定走 select 组；客户端侧靠读超时 + 重试兜底。本机（Clash Verge Rev 2.4.1 + mihomo v1.19.13）出站 keepalive 15s/15s 已生效，TUN 开、无 url-test 组。

## Q1：SSE 长连接机制

**SSE = 单条长生命周期的 HTTP 响应流**：请求发出后响应头先返回（`Content-Type: text/event-stream`），响应体以分块方式持续追加，连接一旦中断这条流就结束（客户端表现为流被截断、收到 `terminated`/`ECONNRESET` 类错误），不能像普通请求那样换一个连接重发同一个流。【官方文档】

- **HTTP/1.1**：默认持久连接（`Connection: keep-alive`）+ `Transfer-Encoding: chunked`，响应长度事先未知；每条 SSE 记录是 `data: ...\n\n` 形式，随 chunk 逐步到达。【官方文档：RFC 9112；`text/event-stream` 见 WHATWG HTML EventSource】
- **HTTP/2**：单条 TCP 连接多路复用多个 stream，单条 SSE 流映射为一个 h2 stream，连接中断杀死其上所有 stream。【官方文档：RFC 9113】本机实测（2026-09-19，WSL2 经 Clash 链路）：`api.openai.com`/`api.anthropic.com`/`api.mistral.ai` 三家无鉴权探测全部协商 **HTTP/2**（401/405/401）；经 CONNECT 隧道时 TLS 与 ALPN 在隧道内端到端完成，代理只搬字节，不改变 h2 协商结果。【本机实测+一手源码】社区兼容中转是否支持 h2：**未验证**。
- **「长连接」的两种含义必须区分**：跨请求复用的池化连接（只发生在请求之间，对单条流内部无影响）vs 单次请求内挂着不放的长响应流（**这才是 SSE 的命门**）。SSE 流中断与「连接池 keep-alive 超时」是两件不同的事，排障先分清断的是哪一段。【官方文档+推断】
- **与「未终止 chunked 流」区分**：那是流活着但终止块缺失（裸 socket 可见 chunked terminator 不存在），严格等 stream `done` 的客户端会干等到超时；本文讨论的是连接被杀死导致的截断。两者客户端表象都可能是「流没有正常结束」，归因方向不同，受控实验见 `experiments/2026-09-05-unterminated-chunked-stream-client-behavior.md`。
- **服务端心跳**：Anthropic 官方文档定义 `ping` 事件（`event: ping`/`data: {"type":"ping"}`），但未承诺固定间隔/必然出现。【官方文档】OpenAI 官方流式文档未定义任何心跳事件，长思考期连接上可能完全没有字节，空闲期完全依赖 TCP 层保活。【官方文档+社区资料】
- **客户端 SDK 池化超时只管跨请求复用**：Node ≥18 全局 fetch 基于 undici，默认 `keepAliveTimeout` 4 秒；Python httpx 默认 `keepalive_expiry=5.0`——都是池化空闲连接的过期时间，**与流内存活无关**，流式请求要显式调大 read timeout（httpx 默认 5 秒会把慢流掐死）。【官方文档】

## Q2：mihomo + 机场链路对长连接的影响

### mihomo 转发模型：透明 TCP，无害

对 HTTPS 请求，mihomo HTTP 入站收到 `CONNECT` 后回 `200 Connection established`，随后劫持连接进入 `tunnel.HandleTCPConn`，与出站节点建连后做双向字节转发；`Relay()` 里没有任何应用层缓冲/聚合逻辑、也没有空闲超时——已建立的 TCP 连接只会因任一端关闭或网络故障而断，mihomo 不会主动掐。【一手源码：`listener/http/proxy.go` L68-77、`common/net/sing.go` L67-93】

### url-test 切节点：只影响新建连接（不杀已有流）

- `urltest.go` 的 `DialContext()` 在**拨号时刻**调用 `fast(true)` 选出当前节点并拨号（L57-77）；`fast()` 依据各节点对测速 URL 的最近延迟 + `tolerance` 容差决定是否更换 `fastNode`（L103-149）；**全文件没有任何「更换选中节点时关闭既有连接」的逻辑**。【一手源码】
- 推论（已明确标注）：一条 SSE 流从开始到结束被「钉」在建立时的节点上，节点中途死掉流必死，mihomo 不会迁移；流进行中切节点，这条流不受影响，受影响的是之后的新连接。【一手源码+推断】与社区讨论一致（Dashboard/API 主动关连接、重启核心、provider 刷新才会打断已有连接）。【社区资料：mihomo discussions/3097、issues/1402】
- 再一步**推论**：对多请求的长会话，url-test 组会让不同请求落到不同节点（出口 IP 变化、延迟抖动）——这是给 LLM API 域名固定 select 组的主要理由。【推论】

### 机场侧真实风险（大头，mihomo 管不到）

- **节点稳定性**：过载/被墙/重启直接断流，无法被代理层拯救，只能重试。【推断+社区资料】
- **落地 NAT/防火墙空闲超时**：流式响应在思考期可能长时间无字节，途经 NAT/防火墙状态表老化会静默丢包；TCP keepalive 探测能双向 refresh 状态表并检测死连接，但机场内部「落地机→API 服务器」那一跳不在你的配置范围内。【机制见 Go net 官方文档；机场内部行为：未验证；「NAT 空闲超时为分钟级」为社区经验值：未验证】
- **兼容中转 aggregator** 的 h2 支持与流式缓冲行为：**未验证**，需逐家实测。

### TUN vs 系统代理、sniffer 干扰

- 语义上两者都是 mihomo 入站收 TCP→出站转发，长连接语义相同；TUN 只多一个本机协议栈跳（`stack` 可选 `gvisor`/`system`/`mixed`，官方推荐 `mixed`）。【官方文档】
- sniffer 只读窥视首包用于规则匹配，不改写流量字节，对 h2/SSE 无协议级干扰；`global-client-fingerprint` 只影响 mihomo 自己向节点服务器呈现的指纹。【官方文档+一手源码】
- **本机已知问题（WSL2 + TUN）**：Bun 运行时间歇性报 `unknown certificate verification error` 实为误报——Bun 把握手前被 RST 的未知错误码统一归入该文案（修复 PR oven-sh/bun#31950 长期未合并），Node 同场景报 `ECONNRESET`，与证书/代理 MITM 无关。【本机记录：skill `bun-tun-cert-error-triage`】

## Q3：配置建议（含本机 diff 表）

### 键名核验：写什么、不写什么

- ✅ 存在（全局 general 键，单位秒）：`keep-alive-idle`、`keep-alive-interval`、`disable-keep-alive`（Android 上强制关闭）。【官方文档+一手源码：`config/config.go`、`hub/executor/executor.go` L406-408】作用范围全局且同时作用于入站和出站（`component/dialer/dialer.go` L157、`adapter/inbound/listen.go` L53）；未配置时 Go 默认约 15 秒间隔的 keepalive（默认开着）。【一手源码+官方文档：pkg.go.dev/net】
- ❌ **不存在**：`tcp-keep-alive-idle`/`tcp-keep-alive-interval`、`dial-timeout`——官方 wiki 与源码（Meta 分支 commit `ab405ba`）均无；**写入配置文件会被静默忽略**。没有「新旧名」之分，keep-alive-* 是唯一键名，`tcp-keep-alive-*` 属其他工具（sing-box 系）的命名记忆混淆。【一手源码全仓 grep 0 命中 + 二进制 strings 0 命中双证】
- 版本差异：Go ≥1.23 构建下 idle/interval 分离生效（Windows 需 ≥10.0.16299，否则退化为不支持该字段）；发布二进制实际用哪个工具链构建**未验证**，以设置页显示的内核版本为准。【一手源码：`component/keepalive/` 各 build-tag 文件】
- `unified-delay: true` 只影响延迟测试显示/选路，不伤数据转发、不影响连接保活。【官方文档+一手源码】

### keep-alive 方向（已纠正）

**调长更不安全；15 略优于 30；真想更稳往短调。** keepalive 探测的意义是在流空闲期刷新途经 NAT/防火墙状态表并检测死连接，空闲起点拉得越长，状态表在首个探测前老化的窗口越大。【推论：机制依据是「状态表老化静默丢包」（Q2）+「keepalive 刷新状态表」（raw 3.2），结论方向已纠正——raw 研究稿初稿汇总表给的 `keep-alive-idle: 30` 推荐值作废，勿沿用】本机当前 `keep-alive-idle: 15`/`keep-alive-interval: 15` 即合理值，无需改动。

### 本机配置 diff 表（当前 → 建议）

本机基线（2026-09-19 只读取证，Clash Verge Rev 2.4.1 + mihomo Meta v1.19.13 go1.25.0，WSL 侧无 mihomo 安装）：

| 配置项 | 本机当前 | 建议 | 依据 |
|---|---|---|---|
| `keep-alive-idle` | `15` | 保持 15（更稳往短调，勿调长） | 本机实测（取证）+ 推论（已纠正，见上） |
| `keep-alive-interval` | `15` | 保持 15 | 本机实测 + 官方文档 |
| `disable-keep-alive` | `false` | 保持 `false` | 官方文档 + 一手源码 |
| `tcp-keep-alive-*` / `dial-timeout` | 未设置 | **勿写**（键不存在，静默忽略） | 一手源码 + 二进制双证 |
| LLM 出口组 | `💬AI代理`（select，89 成员，选中未持久化） | 保持 select；加 `profile.store-selected: true` | 一手源码（拨号时刻选路）+ 官方文档 |
| url-test 组 | 不存在（健康检测靠 fallback `故障转移` interval=7200 lazy、`⚖️负载均衡` interval=300） | 若改用 url-test：大 `tolerance`（100 级毫秒）+ 长 `interval`（600 秒）降低跳动 | 官方文档 + 一手源码 |
| TUN / 系统代理 | TUN 开（gvisor，strict-route），系统代理关 | LLM 工作负载优先系统代理；必须 TUN 则 `stack: mixed` + LLM 域名 `fake-ip-filter` | 官方文档 + 本机记录 |
| `sniffer.skip-domain` | 只 skip Mijia Cloud | 可选加 `+.api.openai.com` / `+.api.anthropic.com` 减少变量 | 官方文档 |
| `verge.yaml` 层 | `enable_tun_mode: true` / `enable_system_proxy: false` / `enable_proxy_guard: false` | 二选一开关；`enable_proxy_guard` 只防篡改、与连接质量无关 | 一手源码（clash-verge-rev `verge.rs`） |

要点：

- LLM API 域名规则单独指向专用组（本机已全部指向 `💬AI代理`，625 条规则中 `红魔馆网络` 301 条、`DIRECT` 192 条兜底清晰）；该组用 `select` 手动固定高质量节点，切节点不打断已建立的流，只影响新连接。【一手源码】
- 本机 `auto_close_connection: false` + TUN strict-route：已建立的 SSE 流不会被策略切换主动重置。【本机实测取证】
- WSL2 场景：NAT 模式下 `127.0.0.1` 不通 Windows 宿主，系统代理方案要给进程注入 `HTTPS_PROXY=http://<宿主IP>:<mixed-port>`（本机 mixed-port 7897），且已运行进程捡不到后设 env，必须重启进程。【本机记录】

## 客户端侧建议

- **重试与退避**：OpenAI/Anthropic SDK 默认 `maxRetries=2`（指数退避，覆盖连接错误/408/409/429/5xx）；流中途截断只把错误抛给调用方，业务层应捕获后**整请求重发**（会重新生成，注意非幂等成本）。【官方文档】
- **读超时 vs 心跳**：读超时必须大于「服务端最长无字节间隔」（含长思考期 + 心跳间隔），否则把活流掐死；Anthropic 的 `ping` 可用来刷新空闲计时。【官方文档+推断】
- **池化 keep-alive 不用调**：undici 4s / httpx 5s 只管跨请求复用；需要并发复用时调大即可。【官方文档】
- raw socket 场景可开客户端侧 TCP keepalive（curl `--keepalive-time`，默认 60 秒；Node `socket.setKeepAlive`）；SDK 场景一般无需管。【官方文档】
- **不要**用 `NODE_TLS_REJECT_UNAUTHORIZED=0` 之类手段「修」代理下的报错——本机 Bun 误报是 RST 误报，关校验救不了还有安全风险。【本机记录】

## 证据链

- **一手源码**（MetaCubeX/mihomo Meta 分支，commit `ab405ba`，2026-09-14）：`listener/http/proxy.go` L68-77、`common/net/sing.go` L67-93、`adapter/outboundgroup/urltest.go` L57-77/L103-149、`config/config.go`、`hub/executor/executor.go` L406-408、`component/keepalive/`、`component/dialer/dialer.go` L157。
- **一手源码 + 二进制双证**（键名）：`/tmp/mihomo-src` 全仓 grep 与 `verge-mihomo.exe` strings 交叉——`keep-alive-idle`/`keep-alive-interval`/`disable-keep-alive` 各 2 命中（yaml tag + json tag），`tcp-keep-alive-idle`/`tcp-keep-alive-interval`/`dial-timeout` 均 0 命中。
- **官方文档**：wiki.metacubex.one（general/tun/sniff/proxy-groups/url-test 页）、RFC 9112/9113、Go net（`Dialer.KeepAlive`、Go 1.23 `KeepAliveConfig`）、OpenAI/Anthropic 流式与 SDK 文档、undici/httpx/curl 文档。
- **本机实测**（2026-09-19）：三家 API 域名 h2 协商（401/405/401）；Clash Verge Rev + mihomo 配置只读取证（版本 2.4.1 / v1.19.13 go1.25.0）。
- **本机记录**：skill `bun-tun-cert-error-triage`（WSL2 + TUN Bun 证书误报，oven-sh/bun#31950）。
- **未验证清单**：发布二进制实际构建工具链（go.mod 声明 go 1.20）、社区中转 aggregator 的 h2/缓冲行为、机场落地 NAT 空闲超时具体量级（社区经验分钟级）、SSE 注释行心跳厂商是否实发。

## See Also

- [代理出口 IP 指纹批量测量与形态分类](../proxy-ops/exit-ip-fingerprint-measurement.md) — 选线应以实测出口为准，不以节点名为准
- [专有代理客户端迁移到标准 Clash：通用取证方法](../proxy-ops/proprietary-client-to-clash-migration.md) — 本机订阅形态来源（`flag=meta` 标准输出）
- [未终止 chunked 流的客户端行为](../../experiments/2026-09-05-unterminated-chunked-stream-client-behavior.md) — 与「连接被杀死」互补的另一类流式截断：终止块缺失
