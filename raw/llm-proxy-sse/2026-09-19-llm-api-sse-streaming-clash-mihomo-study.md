# WSL2 + Clash Verge Rev/mihomo + 机场链路上的 LLM API 流式调用研究

> Source: file:///tmp/llm-sse-proxy-study/research.md
> Collected: 2026-09-19
> Published: Unknown

# WSL2 + Clash Verge Rev/mihomo + 机场链路上的 LLM API 流式调用研究

> 日期：2026-09-19。纯研究报告，未改动任何代码/仓库文件。
> 证据等级标注约定（每事实性结论必标其一）：
> 【官方文档】厂商/项目官方文档；【一手源码】直接阅读项目源码；【可复现实测】本机实际执行并可复现的命令；【社区资料】社区讨论/第三方文章；【本机记录】本机 skill 沉淀的排障记录；【未验证】查不到或无法确证，禁止当作事实使用。

---

## 子问题 1：LLM API 流式调用（SSE）是否依赖 TCP 长连接？机制是什么？

**结论：是。SSE 的本质是「单条长生命周期的 HTTP 响应流」：一个 HTTP 请求发出后，响应头先返回（`Content-Type: text/event-stream`），响应体以分块方式持续追加，连接一旦中断，这条流就结束了（客户端表现为流被截断，通常收到 `terminated` / `ECONNRESET` 类错误），不能像普通请求那样"换一个连接重发同一个流"。**

### 1.1 HTTP/1.1 下的机制：keep-alive + chunked transfer-encoding

- HTTP/1.1 默认启用持久连接（`Connection: keep-alive`），响应体可以用 `Transfer-Encoding: chunked` 分块持续发送，响应长度事先未知（无 `Content-Length`）。SSE 流正是基于这个机制：每条 SSE 记录是 `data: ...\n\n` 形式（可选 `event:`/`id:` 行，记录间以空行分隔），随 chunk 逐步到达。【官方文档：RFC 9112（HTTP/1.1）；SSE 媒体类型 `text/event-stream` 见 WHATWG HTML 标准 EventSource 章节】
- 因此 SSE 流对连接中断极度敏感：客户端↔服务端之间任何一段 TCP 断了（本机、代理、机场节点、落地机、服务端任一跳），这条流就死了，且**不能续传**——SDK 层面只能整个请求重发（部分厂商提供有限的断点续传能力，本报告范围内未验证，见 3.4）。【官方文档+推断，重发语义见 OpenAI/Anthropic SDK 文档】

### 1.2 「长连接」的两种含义（必须区分）

| 含义 | 说明 | 与 SSE 的关系 |
|---|---|---|
| 跨请求复用的持久连接（连接池） | HTTP/1.1 keep-alive / h2 连接上先后发多个请求 | 只发生在**请求之间**；对单条流内部无影响 |
| 单次请求内的长响应流 | 一个请求挂着不放，响应体持续分钟级 | **这才是 SSE 的命门**：流期间连接必须一直活着 |

SSE 流中断与"连接池 keep-alive 超时"是两件不同的事，但常被混为一谈——排障时先分清断的是哪一段。

### 1.3 HTTP/2 多路复用：OpenAI/Anthropic 实际走 h2

- HTTP/2 在单条 TCP 连接上多路复用多个流（stream）；单条 SSE 流在 h2 上映射为一个 h2 stream，连接中断仍会杀死其上所有 stream。【官方文档：RFC 9113】
- **实测**：本机（WSL2，流量经 Clash 链路上网）对三家 API 域名执行 `curl -s -o /dev/null -w '%{http_version}'`（无鉴权，仅看协商结果），全部协商为 **HTTP/2**：
  - `https://api.openai.com/v1/models` → `2`（401，符合无 key 预期）
  - `https://api.anthropic.com/v1/messages` → `2`（405）
  - `https://api.mistral.ai/v1/models` → `2`（401）
  【可复现实测，2026-09-19】即：主流 LLM API 官方端点当前均优先 HTTP/2；走代理隧道不改变这一协商结果（原因见 2.6）。
- 经由 HTTP 代理（CONNECT 隧道）访问时，TLS 与 ALPN 在隧道内端到端完成（客户端直连 API 服务器做 TLS 握手），所以 h2 协商对代理透明。社区兼容中转（aggregator/relay）是否支持 h2：**未验证**，个别中转只支持 HTTP/1.1，这属于中转自身实现问题，不在 mihomo 层。

### 1.4 服务端心跳：各厂商行为不同

- **Anthropic**：官方文档定义了 `ping` 事件（`event: ping` / `data: {"type":"ping"}`），示例中可见 ping 穿插在内容事件之间；但**文档未承诺固定间隔/必然出现**，只能当作"可能有的应用层心跳"处理（可用来刷新空闲计时器）。【官方文档：https://platform.claude.com/docs/en/build-with-claude/streaming】
- **OpenAI**：官方流式文档**未定义任何心跳/keepalive 事件**；流内事件均为业务事件（`response.output_text.delta` 等），终止事件为 `response.completed` / `response.incomplete` / `response.failed` / `error`（Chat Completions 为 `data: [DONE]`）。长时间无 token 期间连接上可能完全没有字节——空闲期完全依赖 TCP 层保活。【官方文档：https://platform.openai.com/docs/api-reference/responses-streaming/response/refusal ；OpenAI 空闲期不发字节这一点为社区长期观察，标【社区资料】】
- 通用 SSE 协议层支持**注释行**（`: ...` 开头）作为心跳，不触发客户端事件——服务端可用、但 LLM 厂商是否实际发送：**未验证**（Anthropic 用的是显式 `ping` 事件而非注释行）。
- 兼容中转/aggregator 的行为各异：**未验证**，需逐家实测。

### 1.5 客户端 SDK 的连接复用与超时（与代理链路的交互基础）

- **Node.js（undici / 全局 fetch）**：Node ≥18 的全局 `fetch` 基于内置 undici，默认分发器为 `Agent`，其 `keepAliveTimeout` 默认 **4 秒**（空闲池化连接的超时，**跨请求复用**语义；服务器 `Keep-Alive` 响应头可延长，受 `keepAliveMaxTimeout` 上限约束）。【官方文档：https://github.com/nodejs/undici/blob/main/docs/docs/api/Client.md 、https://nodejs.org/docs/latest/api/globals.html】。注意区分：`fetch(..., {keepalive: true})` 是 Fetch API 语义（允许请求跨环境存活），与连接池超时无关；`connect.keepAlive`/`keepAliveInitialDelay` 才是 TCP keepalive 探测（默认关闭）。→ **对 SSE 流的含义**：undici 默认值只影响请求之间复用，不影响流内；流内空闲期只能靠 TCP keepalive 或应用层心跳。
- **Python httpx**：`httpx.Client` 默认 `Limits(max_connections=100, max_keepalive_connections=20, keepalive_expiry=5.0)`——同样是**池化空闲连接**的过期时间（5 秒），与流内无关；流式请求必须显式调大 read timeout（默认 5 秒会把慢流掐死）。【官方文档：https://www.python-httpx.org/advanced/resource-limits/ 、https://github.com/encode/httpx/blob/master/httpx/_config.py】
- **curl**：`--keepalive-time <秒>` 设置**TCP keepalive** 的空闲起点（默认 60 秒；当前 curl 默认启用 TCP keepalive，`--no-keepalive` 可关）；另有 `--keepalive-cnt`（curl ≥8.9.0）控制 unanswered 探测次数。与 `--connect-timeout`/`--max-time`（总时限）是不同层。【官方文档：https://curl.se/docs/manpage.html】
- 两家的官方 SDK 都自带重试：OpenAI Node SDK `maxRetries` 默认 2（连接错误、408/409/429/5xx，短指数退避）；Anthropic Python/Node SDK 同样默认 2。**但重试针对的是"请求级"失败；流已经开始后的中途截断，SDK 只能把错误抛给调用方，不会自动续传半条流**（重发=重新生成）。【官方文档：https://github.com/openai/openai-node/blob/main/docs/configuration.md 、https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/_constants.py】

---

## 子问题 2：Clash Verge Rev + mihomo + 机场链路对 TCP 长连接 / LLM 流式调用是否有害？

**结论：mihomo 本身对流式调用基本无害——它对 HTTPS 流量是逐字节转发的透明 TCP 隧道，不缓冲、不解释响应体，也不会主动杀死已建立的连接；url-test 自动切节点只影响新建连接。真正有害的是链路中段（机场节点稳定性、落地机 NAT/防火墙空闲超时、跨境链路抖动），这些 mihomo 管不到，只能靠选稳定节点 + TCP keepalive 缓解探测 + 客户端重试兜底。TUN 模式相比系统代理只多一个本机协议栈跳，语义上不伤长连接，但在本机有 Bun/Node 误报证书的已知记录。**

### 2.1 mihomo 的转发模型：透明 TCP、CONNECT 隧道、无响应缓冲

- 对 HTTPS 请求，mihomo 的 HTTP 入站收到 `CONNECT` 后回 `200 Connection established`，然后**劫持连接**进入 `tunnel.HandleTCPConn`，与出站节点建连后做双向字节转发：【一手源码：`listener/http/proxy.go` L68-77（CONNECT 处理）；`common/net/sing.go` L67-93 `Relay()` 为 `bufio.Copy` 双向拷贝】
- `Relay()` 里**没有任何应用层缓冲/聚合逻辑，也没有空闲超时**——已建立的 TCP 连接只会因为任一端关闭或网络故障而断，mihomo 不会主动掐。【一手源码：`common/net/sing.go`】
- 对明文 HTTP（非 CONNECT）转发，mihomo 用 Go `http.Transport` 发起请求并流式回传响应体（非全量缓冲）。【一手源码：`listener/http/proxy.go` L122-129；Go http.Transport 行为见 pkg.go.dev/net/http】

### 2.2 url-test / fallback 自动切节点：只影响新建连接，不杀已有连接（关键）

- **一手源码**（`adapter/outboundgroup/urltest.go`）：
  - `DialContext()` 在**拨号时刻**调用 `fast(true)` 选出当前节点并拨号（L57-77）；
  - `fast()` 依据各节点对该组测速 URL 的最近延迟 + `tolerance` 容差决定是否更换 `fastNode`（L103-149），健康检查只刷新延迟缓存；
  - **全文件没有任何"更换选中节点时关闭既有连接"的逻辑**——已返回给调用方的连接持有的是拨号时选定的节点引用。
- 因此：流式调用进行中 url-test 切了节点，**这条流不受影响**（仍走旧节点直到流结束或旧节点死亡）；受影响的是之后的新连接。反过来讲：一条 SSE 流从开始到结束都被"钉"在它建立时的那个节点上，节点中途死掉，流必死，mihomo 不会迁移。
- 该行为与社区讨论一致（Dashboard/API 主动关闭连接、重启核心、provider 刷新换掉节点等情况才会打断已有连接）。【社区资料：https://github.com/MetaCubeX/mihomo/discussions/3097 、issues/1402】
- 推论：对多请求的长会话（agent 连续发几十条流式请求），url-test 组会让**不同请求落到不同节点**（出口 IP 变化、延迟抖动）——这是选 `select` 固定节点的主要理由（见 3.3）。

### 2.3 机场侧真实风险（这才是大头）

按证据强度分级：

- **节点稳定性**：机场节点过载/被墙/重启会直接断流；断流无法被代理层拯救，只能重试。【推断+社区资料】
- **落地 NAT/负载均衡空闲超时**：流式响应在"思考期"可能长时间无字节（尤其 OpenAI 无应用层心跳，见 1.4），途经的中转 NAT/防火墙状态表老化会静默丢包。TCP keepalive 探测（mihomo 出站 leg 可配，见 3.1）能双向 refresh 状态表并检测死连接，但**机场内部"落地机→API 服务器"那一跳不在你的配置范围内**。【机制：TCP keepalive 语义见 Go net 文档 https://pkg.go.dev/net ；机场内部行为：未验证】
- **途中任一跳掉线**＝流死＝只能靠 SDK 重试重发（OpenAI/Anthropic SDK 默认重试 2 次，见 1.5）。【官方文档】
- 兼容中转 aggregator 对流式响应可能的缓冲行为（破坏流式实时性甚至截断）：**未验证**，需逐家实测（本任务范围内不含真实调用压测）。

### 2.4 TUN 模式 vs 系统代理：对长连接的影响

- **语义层面**：两者最终都是 mihomo 入站收 TCP → 出站转发，长连接语义相同；区别只在本机路径：
  - 系统代理：应用按 HTTP 代理协议发 `CONNECT`，少一层本机协议栈。
  - TUN：虚拟网卡 + 路由接管（L3），多一个本机协议栈实现跳（gVisor 用户态栈或系统栈）。
- **性能层面**：TUN 的 `stack` 可选 `gvisor`（默认，用户态，兼容性最好但 CPU/延迟略差）/`system`/`mixed`（TCP 走 system、UDP 走 gvisor，官方推荐无问题时使用）。对长流无本质伤害，只多本机一跳的固定开销。【官方文档：https://wiki.metacubex.one/en/config/inbound/tun/】
- **本机已知问题（WSL2 + TUN）**：本机 skill `bun-tun-cert-error-triage` 记录：WSL2 下 TUN 模式里 Bun 运行时间歇性报 `unknown certificate verification error`，实为**误报**——Bun 把握手前被 RST 的未知错误码统一归入该文案（修复 PR oven-sh/bun#31950 长期未合并），Node 同场景报 `ECONNRESET`。与证书/代理 MITM 无关。判定与对照实验方法见该 skill。【本机记录】
- **WSL2 网络细节**：WSL2 NAT 模式下 `127.0.0.1` 不通 Windows 宿主，需指向宿主 IP（mirrored 网络模式除外）。→ 若在 WSL 里跑 LLM 客户端，"系统代理"方案要给进程注入 `HTTPS_PROXY=http://<宿主IP>:<mixed-port>`，且**已运行的进程捡不到后设的环境变量，必须重启进程**。【本机记录 + 官方文档：Clash Verge Rev 数据目录与系统代理语义见 https://github.com/clash-verge-rev/clash-verge-rev.github.io/blob/main/docs/guide/term.md】
- Clash Verge Rev 层的开关字段：`verge.yaml` 里 `enable_tun_mode`、`enable_system_proxy`、`enable_proxy_guard`（防其他软件改系统代理，非代理本身）、`proxy_guard_duration`（秒级，示例 30）；TUN 细节参数（`stack` 等）属于内核配置 `tun:` 节，由 GUI 合并生成，**当前版本 `verge.yaml` 没有 `tun_stack` 字段**。【一手源码：https://github.com/clash-verge-rev/clash-verge-rev/blob/dev/src/types/global.d.ts 、https://github.com/clash-verge-rev/clash-verge-rev/blob/dev/src-tauri/src/config/verge.rs】

### 2.5 sniffer / tls-fingerprint 对 h2 / SSE 的干扰

- sniffer 的作用是：连接目标为 IP（无域名）时，**只读窥视**首包（如 TLS ClientHello 提取 SNI、HTTP 提取 Host）用于规则匹配，不改写流量字节。【官方文档：https://wiki.metacubex.one/en/config/sniff/；一手源码：`component/sniffer/`】
- 对 h2/SSE 无协议级干扰（TLS 内层字节原样转发）；理论成本只有首包窥视的微小时延。对 LLM 域名如想排除变量，可用 `sniffer.skip-domain`（通配语法 `+.api.openai.com` 等）跳过。【官方文档】
- `global-client-fingerprint`（utls 指纹）只影响 mihomo 自己作为 TLS 客户端出站握手时**向节点服务器**呈现的指纹，与客户端↔API 的 h2 无关。【官方文档+推断】
- 本机记录：TUN + fake-ip 模式下存在 fake-ip 时序窗口，与 Bun 误报证书错误的相关性待对照实验确认（先做 `fake-ip-filter` 加域名 / sniffer `skip-domain` 对照）。【本机记录】

### 2.6 HTTP/2 over proxy（CONNECT 隧道内 ALPN）

- 走系统代理时：客户端对代理发 `CONNECT api.openai.com:443`，代理回 200 后**隧道内 TLS 端到端**（客户端证书校验、ALPN=h2 协商都直接与 api.openai.com 完成），mihomo 只搬字节。→ 子问题 1 的 h2 实测结果（经 Clash 链路仍协商 h2）与此一致。【一手源码：`listener/http/proxy.go` L68-77 + 可复现实测】
- TUN 模式同理：mihomo 拿到的就是原始 TCP，TLS/h2 语义端到端。
- 结论：代理层不会破坏 h2 的流控/多路复用语义；h2 层的 `RST_STREAM`/`GOAWAY` 行为是客户端与 API 服务器之间的事。【推断，基于隧道透明性】

---

## 子问题 3：若有影响，mihomo 怎么配更优（含 Clash Verge Rev 层）

### 3.1 先纠正三个键名（查证结果）

- ✅ 存在（全局，单位秒）：`keep-alive-idle`（空闲多久发第一个 keepalive 探测）、`keep-alive-interval`（探测间隔）、`disable-keep-alive`（关闭 keepalive；Android 上强制关闭）。【官方文档：https://wiki.metacubex.one/en/config/general/；一手源码：`config/config.go` General 结构体、`hub/executor/executor.go` L406-408】
- ❌ **不存在**：`tcp-keep-alive-idle` / `tcp-keep-alive-interval`——在官方 wiki 与当前源码（Meta 分支，commit `ab405ba`）中均未找到；源码里只有上述无 `tcp-` 前缀的全局键，以及 shadowquic 等个别协议**自己的** `keep-alive-interval`（毫秒级、协议私有）。【一手源码：全仓 grep 无结果】**写入配置文件会被静默忽略。**
- ❌ **不存在**：`dial-timeout`——官方 wiki 与源码均无此全局键。【一手源码：全仓 grep 仅测试文件出现 Go 标准库 `net.DialTimeout`】与拨号相关的真实键是 `tcp-concurrent`（对所有解析 IP 并发拨号、先到先得，只影响拨号阶段）、`interface-name`、`routing-mark`；url-test 组的 `timeout` 是**健康检查**超时（毫秒），不影响业务拨号。
- `unified-delay`：真实存在，语义是"计算 RTT 以消除代理协议握手差异带来的延迟差"——**只影响延迟测试显示/选路，不影响数据转发、不影响连接保活**。【官方文档：https://wiki.metacubex.one/en/config/general/；一手源码：`adapter.UnifiedDelay`】

### 3.2 keep-alive 键的作用范围与版本差异（源码级证据）

- 作用范围：**全局，且同时作用于入站和出站**——`component/dialer/dialer.go` L157 `keepalive.SetNetDialer(dialer)`（mihomo 作为客户端向机场节点拨号的 socket）；`adapter/inbound/listen.go` L53 `keepalive.SetNetListenConfig`（mihomo 入站监听 socket，含 redir/tproxy accept 的连接 `listener/redir/tcp.go` L73、`listener/tproxy/tproxy.go` L38）。【一手源码】
- 未配置时的默认行为：mihomo 传 0 → Go `net.Dialer.KeepAlive=0` → **Go 默认约 15 秒间隔的 keepalive 探测（即默认开着）**。【官方文档：https://pkg.go.dev/net 的 `Dialer.KeepAlive` 字段说明】
- 版本/构建差异：mihomo 的 keepalive 实现按 Go 构建版本分两套——`tcp_keepalive_go122.go`（Go ≤1.22：`SetKeepAlivePeriod`，只能统一设间隔，**idle 与 interval 不分**）与 `tcp_keepalive_go123*.go`（Go ≥1.23：`net.KeepAliveConfig`，idle/interval/count 分离；Windows 上 TCP_KEEPIDLE/TCP_KEEPINTVL 需 ≥ Windows 10 build 16299，否则退化为不支持该字段）。【一手源码：`component/keepalive/` 各 build-tag 文件】mihomo `go.mod` 声明 `go 1.20`，但实际发布二进制用哪个工具链构建需看具体 release 的 CI 配置——**未验证**；Clash Verge Rev 内嵌内核版本随其发布而变，以「设置页显示的内核版本」为准。
- 对 SSE 的意义：keepalive 探测能 (a) 在流空闲期（如 OpenAI 长思考无字节）**刷新途经 NAT/防火墙状态表**，(b) 检测死连接让客户端尽快报错重试，而不是干等。它**不能**阻止节点本身掉线。

### 3.3 proxy-groups：LLM API 域名走 `select` 还是 `url-test`

- 切换语义（源码已证，见 2.2）：切组/切节点**不影响已有连接**，只影响新连接。
- 取舍：
  - `url-test` 优点：节点故障自动切换，无需人工。缺点：延迟抖动会让长会话内**不同请求落到不同节点**（出口 IP 漂移、不同节点对同一 API 域名表现不一），且测速 URL 的可达性≠LLM API 的可达性。
  - `select` 固定节点：长会话稳定、出口一致；代价是节点挂了要手动切（切换瞬间不打断已建立的流，只会影响切换后的新连接——这是好消息）。
- 建议组合：**给 LLM API 域名规则单独指向一个组**——该组用 `select`（手动固定高质量节点）或 `url-test` + 大 `tolerance` + 长 `interval`（降低跳动频率）。mihomo 支持在 `proxy-groups` 里给 url-test 配置 `url`（健康检查地址）、`interval`（秒，0=不测）、`tolerance`（毫秒）、`lazy`、`timeout`（健康检查毫秒）、`max-failed-times`。【官方文档：https://wiki.metacubex.one/en/config/proxy-groups/ 、https://wiki.metacubex.one/en/config/proxy-groups/url-test/】
- 规则示例：`DOMAIN-SUFFIX,api.openai.com,LLM` / `DOMAIN-SUFFIX,api.anthropic.com,LLM` 等，走该专用组。
- `profile.store-selected: true` 可把组选择持久化到重启后。【官方文档：https://wiki.metacubex.one/en/config/general/】

### 3.4 客户端侧建议（SDK 重试、连接池、超时与心跳的关系）

- **重试与退避**：OpenAI/Anthropic SDK 默认 `maxRetries=2`（指数退避），覆盖连接错误/408/409/429/5xx；流中途截断会以错误抛出，业务层应捕获后**整请求重发**（会重新生成，注意非幂等成本）。【官方文档，见 1.5】
- **连接池 keep-alive**：池化空闲超时（undici 4s / httpx 5s）只管跨请求复用，与流内存活无关，**不用为它调参**；需要并发复用时调大即可。
- **读超时 vs 心跳**：读超时必须大于"服务端最长无字节间隔"（含长思考期 + 心跳间隔），否则会把活流掐死；Anthropic 的 `ping` 可用来刷新空闲计时（若你的 HTTP 库支持按"任意字节到达"计时，如 curl 无总超时下的默认行为/自定义解析器）。【官方文档+推断】
- TCP keepalive（客户端侧）：raw socket 场景可开（curl `--keepalive-time`，Node `socket.setKeepAlive`）；SDK 场景一般无需管，重点是服务端心跳/读超时/重试的组合。
- **不要**用 `NODE_TLS_REJECT_UNAUTHORIZED=0` 之类手段"修"代理下的报错（本机 Bun 误报的教训：它是 RST 误报，关校验救不了还有安全风险）。【本机记录】

### 3.5 TUN / 系统代理取舍（本机 WSL2 场景）

- 对 LLM API 工作负载，**优先系统代理方案**：WSL 内进程注入 `HTTPS_PROXY=http://<Windows宿主IP>:<mixed-port>`（NAT 模式下 127.0.0.1 不通宿主；mirrored 模式除外），避开 TUN 的本机协议栈跳与本机 Bun 误报问题域；注意已运行进程捡不到后设 env，需重启进程。【本机记录】
- 若必须用 TUN：`stack: mixed`（官方推荐），并给 LLM API 域名加 `fake-ip-filter`（消 fake-ip 时序窗口）、按需 `sniffer.skip-domain` 做对照。【官方文档+本机记录】
- Clash Verge Rev 层：`verge.yaml` 用 `enable_tun_mode` / `enable_system_proxy` 二选一；`enable_proxy_guard` 仅防其他软件篡改系统代理，与连接质量无关。【一手源码：clash-verge-rev `verge.rs`】

### 3.6 脱敏配置片段（示意，不含任何凭据/订阅）

内核配置（Clash Verge Rev 生成/合并，建议在 GUI 或配置文件中对应位置维护）：

```yaml
# 全局（mihomo 文档当前版本；作用于入站+出站 TCP，单位秒）
keep-alive-idle: 30        # 空闲 30s 后起首个 keepalive 探测
keep-alive-interval: 15    # 探测间隔
disable-keep-alive: false

unified-delay: true        # 仅影响延迟测试显示，按需
profile:
  store-selected: true     # 记住组的节点选择

tun:                       # 仅 TUN 方案需要；系统代理方案保持 enable: false
  enable: true
  stack: mixed             # 官方推荐：TCP=system, UDP=gvisor
  auto-route: true
  strict-route: true
  auto-detect-interface: true
  dns-hijack:
    - any:53

dns:
  enhanced-mode: fake-ip
  fake-ip-filter:          # 消 fake-ip 时序窗口（本机 Bun 误报排查项）
    - "+.api.openai.com"
    - "+.api.anthropic.com"

sniffer:                   # 对 LLM 域名可选跳过，减少变量
  enable: true
  skip-domain:
    - "+.api.openai.com"
    - "+.api.anthropic.com"

proxy-groups:
  - name: "LLM"
    type: select             # 长会话求稳：手动固定节点；切节点不打断已建立的流
    proxies: ["<节点1>", "<节点2>"]
    # 若改用 url-test：加大 tolerance/interval 降低跳动
    # type: url-test
    # url: https://www.gstatic.com/generate_204
    # interval: 600
    # tolerance: 100
    # timeout: 5000

rules:
  - "DOMAIN-SUFFIX,api.openai.com,LLM"
  - "DOMAIN-SUFFIX,api.anthropic.com,LLM"
  - "DOMAIN-SUFFIX,openai.azure.com,LLM"   # 如使用 Azure OpenAI
  # ...其余规则
```

Clash Verge Rev 层（`verge.yaml`）：

```yaml
enable_tun_mode: false        # 系统代理方案
enable_system_proxy: true
enable_proxy_guard: true      # 防篡改；与连接质量无关
proxy_guard_duration: 30
```

---

## 配置清单汇总表

| 配置键 | 所在层 | 推荐值 | 作用 | 证据来源与版本要求 |
|---|---|---|---|---|
| `keep-alive-idle` | mihomo 全局 | `30`（秒） | 空闲多久发首个 TCP keepalive 探测；作用于入站监听+出站拨号 socket | 【官方文档】general 页；【一手源码】`config/config.go`、`executor.go` L406、`component/keepalive/`。Go≥1.23 构建下与 interval 分离生效（Windows 需 ≥10.0.16299） |
| `keep-alive-interval` | mihomo 全局 | `15`（秒） | keepalive 探测间隔 | 同上。未配置时 Go 默认约 15s（keepalive 默认开启） |
| `disable-keep-alive` | mihomo 全局 | `false` | 关闭 keepalive（Android 强制 true） | 【官方文档】+【一手源码】`keepalive` 包 |
| ~~`tcp-keep-alive-idle` / `tcp-keep-alive-interval`~~ | — | 勿写 | **键不存在**，会被静默忽略 | 【一手源码】全仓 grep 无；wiki 无 |
| ~~`dial-timeout`~~ | — | 勿写 | **键不存在**。拨号相关真实键为 `tcp-concurrent`/`interface-name`；组内 `timeout` 仅健康检查 | 【一手源码】全仓 grep 无；wiki 无 |
| `unified-delay` | mihomo 全局 | `true` | 只影响延迟测试/选路显示，不伤数据转发 | 【官方文档】+【一手源码】`adapter.UnifiedDelay` |
| `tcp-concurrent` | mihomo 全局 | 按需 | 对所有解析 IP 并发拨号、先到先得（仅拨号阶段） | 【官方文档】general 页 |
| `profile.store-selected` | mihomo 全局 | `true` | 组节点选择跨重启持久化 | 【官方文档】general 页 |
| `tun.enable` / `tun.stack` | 内核 `tun:` 节 | 按方案；栈选 `mixed` | TUN 接管；mixed=TCP 走系统栈+UDP 走 gvisor（官方推荐） | 【官方文档】tun 页 |
| `dns.enhanced-mode: fake-ip` + `fake-ip-filter` | 内核 `dns:` 节 | 过滤 LLM API 域名 | 消 fake-ip 时序窗口（本机 Bun 误报排查项） | 【本机记录】+【官方文档】dns 页 |
| `sniffer.skip-domain` | 内核 `sniffer:` 节 | LLM API 域名 | 跳过嗅探，减少变量 | 【官方文档】sniff 页 |
| url-test 组 `url`/`interval`/`tolerance`/`timeout`/`max-failed-times` | `proxy-groups` | interval 600s、tolerance 100ms 级 | 控制自动切节点频率；切节点不打断已建立的流（只影响新连接） | 【官方文档】proxy-groups 页 +【一手源码】`urltest.go` |
| LLM 组 `type: select` | `proxy-groups` | 推荐 | 长会话出口固定；切换不打断已有流 | 【一手源码】拨号时选路语义 |
| `enable_tun_mode` / `enable_system_proxy` | Clash Verge Rev `verge.yaml` | 二选一 | GUI 层的模式开关 | 【一手源码】clash-verge-rev `global.d.ts`/`verge.rs` |
| `enable_proxy_guard` / `proxy_guard_duration` | Clash Verge Rev `verge.yaml` | `true` / `30` | 防其他软件篡改系统代理；与连接质量无关 | 【一手源码】同上 |
| 客户端：SDK `maxRetries`、httpx read timeout、undici `keepAliveTimeout` | 应用层 | 读超时>最长思考期；重试≥2 | 超时与心跳关系：读超时须覆盖空闲期；池化 keep-alive 只管跨请求复用 | 【官方文档】各 SDK/库文档（见 1.5） |
| curl `--keepalive-time` / `-N` | 命令行 | 按空闲期设 | TCP keepalive 起点（默认 60s）；`-N` 关闭缓冲看实时流 | 【官方文档】curl manpage |

---

## 附：主要来源

- mihomo 官方文档：https://wiki.metacubex.one/en/config/general/ 、/en/config/inbound/tun/ 、/en/config/sniff/ 、/en/config/proxy-groups/ 、/en/config/proxy-groups/url-test/
- mihomo 一手源码（Meta 分支，commit `ab405ba`，2026-09-14）：`config/config.go`、`hub/executor/executor.go`、`component/keepalive/`、`component/dialer/dialer.go`、`adapter/inbound/listen.go`、`listener/http/proxy.go`、`common/net/sing.go`、`adapter/outboundgroup/urltest.go`（https://github.com/MetaCubeX/mihomo ）
- Go 标准库语义：https://pkg.go.dev/net （`Dialer.KeepAlive`、Go 1.23 `KeepAliveConfig`）
- OpenAI 流式文档：https://platform.openai.com/docs/api-reference/responses-streaming/response/refusal ；SDK 重试：https://github.com/openai/openai-node/blob/main/docs/configuration.md
- Anthropic 流式文档（ping 事件）：https://platform.claude.com/docs/en/build-with-claude/streaming ；SDK 重试：https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/_constants.py
- undici：https://github.com/nodejs/undici/blob/main/docs/docs/api/Client.md ；Node fetch：https://nodejs.org/docs/latest/api/globals.html
- httpx：https://www.python-httpx.org/advanced/resource-limits/ ；curl：https://curl.se/docs/manpage.html
- Clash Verge Rev 源码字段：https://github.com/clash-verge-rev/clash-verge-rev/blob/dev/src/types/global.d.ts 、https://github.com/clash-verge-rev/clash-verge-rev/blob/dev/src-tauri/src/config/verge.rs 、https://github.com/clash-verge-rev/clash-verge-rev.github.io/blob/main/docs/guide/term.md
- 本机记录：skill `bun-tun-cert-error-triage`（WSL2 + TUN 下 Bun `unknown certificate verification error` 误报机制与对照实验方法）
- 可复现实测：2026-09-19 本机 curl 协商结果（api.openai.com / api.anthropic.com / api.mistral.ai 均为 HTTP/2）
