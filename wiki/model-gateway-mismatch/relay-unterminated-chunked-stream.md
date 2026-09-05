# Relay 的 chunked 流不终止：诊断与最小修复

> Sources: MotoMoto relay 实测, 2026-09-05; DeepWiki `oven-sh/bun` 检索, 2026-09-05; Bun 官方文档经 Context7, 2026-09-05
> Raw: [MotoMoto 端点拓扑与客户端容忍度脱敏实测摘录](../../raw/model-gateway-mismatch/2026-09-05-motomoto-endpoint-topology-and-client-tolerance.md); [MotoMoto `/v1/responses` 帧序列与 AI SDK part 序列脱敏实测摘录](../../raw/model-gateway-mismatch/2026-09-05-responses-frame-sequence-and-sdk-parts.md)
> Updated: 2026-09-05

## Overview

一个 relay 可以把 SSE 内容完整发出来，却因为不发 chunked 终止块而让所有严格 HTTP 客户端判定响应失败。数据早就到齐了，客户端仍要等到服务端 60 秒硬超时，然后把已经完整收到的字节全部丢弃。这类故障的表面症状是超时和"流读不出来"，容易被误判成运行时兼容问题；实际根因在服务端的 transfer-encoding 收尾，判别方法是抓原始字节看终止块是否存在。修复不需要改客户端运行时，只需要在中间插一层按协议终止标记主动收尾的本地代理。

## 症状与根因

MotoMoto 的 `/v1/*` 流式响应使用 `Transfer-Encoding: chunked`，发完最后一帧后不发终止块 `0\r\n\r\n`。裸 socket 抓取的判定结果是 `chunked terminator present: false`，body 尾部停在 `...data: [DONE]\n\n\r\n`，最后一个 chunk 定界符之后没有更多字节。

于是连接一直挂着，直到服务端 60 秒超时才断。等待 stream `done` 信号的客户端会挂满这 60 秒，然后因为响应被判为不完整而丢弃全部数据。

同一次抓取还记录到 `duplicate header names: [["date", 2]]`——`Date` 头出现了两次，这是另一个协议违规。但它不是这个故障的触发点：缺终止块单独就完整解释了全部观测，不需要引入第二个假设。

## 判别：`Server` 头只在坏的那条路上出现

这个站点的路径由 Caddy 反代分给两个不同后端，只有一条坏：

| 路径 | `Server` 响应头 | chunked 终止块 | 认证 |
|---|---|---|---|
| `/` | `Caddy` | 不适用 | 无 |
| `/api/*` | 缺失 | 存在 | dashboard JWT |
| `/pg/chat/completions` | 缺失 | 存在 | 仅 dashboard JWT |
| `/v1/*` | `BaseHTTP/0.6 Python/3.10.12` | 缺失 | `sk-` 令牌 |

`Server: BaseHTTP/0.6 Python/3.10.12` 只出现在 `/v1/*` 的响应里。本次观测中，带有这个响应头的 `/v1/*` 流式路径同时出现了未终止 chunked 流。

`/pg/chat/completions` 虽然收尾正常，却不是可用的替代路线：它只认 dashboard JWT（观测到 `exp` 减 `nbf` 为 905 秒），`sk-` 令牌返回 HTTP 401 与 `{"code":"AUTH_UNAUTHORIZED"}`，而且没有对应的 `/pg/responses` 端点。

## 三个客户端一致失败，且字节数相同

同一个流式请求，三个运行时的记录：

| 客户端 | 结果 | 收到字节 | 总耗时 |
|---|---|---|---|
| Python `http.client` | `IncompleteRead(937 bytes read)` | 937 | 60.08s |
| Bun 1.4.1 `fetch`（等 `done`） | `The socket connection was closed unexpectedly` | — | 60.34s |
| Node v24.20.0 `fetch`（等 `done`） | `terminated` | — | 60.13s |

三者拿到的字节数完全一致（937），这排除了任何客户端丢数据的可能。同一批客户端只要改成看到协议自身的终止标记就退出循环，全部立刻成功：Bun 2.94 秒、Node 4.24 秒，`reads=1`，937 字节，`[DONE]` 在内。

**Python 报出的错误名最准确。** `IncompleteRead` 是 chunked 解码器状态机的专用异常，直接点出"声明了 chunked 但没读到终止"；Bun 的 "socket closed unexpectedly" 和 Node 的 "terminated" 都只描述了连接层的结果。诊断这类问题时，Python 标准库是最省力的探针。

## 只有 SSE 坏

`GET /v1/models` 用 `Content-Length`、没有 `Transfer-Encoding: chunked`，389 字节、0.80 秒正常终止。故障范围仅限 `text/event-stream`，因此中间层对非流式响应可以直接透传，不需要统一读循环。

## 三个协议的终止标记各不相同

任何按标记收尾的方案都必须逐协议匹配：

| 端点 | 终止标记 |
|---|---|
| `/v1/chat/completions` | `data: [DONE]` |
| `/v1/responses` | `"type":"response.completed"`，该流中**没有** `[DONE]` |
| `/v1/messages` | `event: message_stop` / `"type":"message_stop"` |

`/v1/responses` 没有 `[DONE]` 是最容易踩的一点：只按 `[DONE]` 匹配的实现在这个端点上会完全失效。

## 最小修复：本地代理补终止块

修复形态是一个 130 行、零依赖的本地 shim：用 `fetch` 读上游，边读边转发，识别到该协议的终止标记就 `reader.cancel()` 加 `ctrl.close()`，由 `Bun.serve` 写出合规的终止块。

之所以不需要裸 socket 和手写 dechunk：本次实测中 Bun 1.4.1 与 Node v24.20.0 的 `fetch` 均能解析这个响应，包括重复的 `Date` 头。缺的只是"什么时候算结束"这个判断。

两个必需的实现细节：

- **`Bun.serve` 的终止块由 `HttpResponse::internalEnd` 写出，且保证只写一次**，避免残留终止块被当成 keep-alive 连接上下一个响应的开头。
- **每个请求要调 `server.timeout(req, 0)`。** `Bun.serve` 的 `idleTimeout` 默认 10 秒，安静的 SSE 流会被判定为 idle 而误杀。

经 shim 后四个端点全部正常终止：`/v1/models` 0.80s、`/v1/chat/completions` 937 字节 1.56s、`/v1/responses` 2097 字节 2.44s、`/v1/messages` 1478 字节 30.12s（该次上游生成慢，`first_byte` 同为 30.12 秒，同端点另一轮只用 1.81 秒）。

## 实现陷阱：sentinel 必须扫全文

第一版匹配逻辑是先截断再检查：

```ts
tail = (tail + decode(value)).slice(-256);
if (TERMINALS.some(m => tail.includes(m)))
```

这个写法让 `/v1/chat/completions` 和 `/v1/messages` 侥幸通过（它们的标记就在末尾），但 `/v1/responses` 失败，耗时 60.08 秒，日志输出 `stream aborted before terminal marker: ECONNRESET`。

原因在帧结构：`response.completed` 的标记出现在一个大帧的**开头**，标记之后还有 461 字节属于同一帧（整个 response 对象，整流 2097 字节）。256 字符的尾窗口必然把它切掉。

正确写法是扫描整段解码文本，carry 只为跨 chunk 边界保留一小段：

```ts
const scanned = carry + decoder.decode(value, { stream: true });
carry = scanned.slice(-CARRY);
if (TERMINALS.some((marker) => scanned.includes(marker))) {
```

一般规则：**滑动窗口的长度假设必须来自实际帧尺寸，不能来自标记本身的长度。**

另一个顺序细节：先 `enqueue` 再检查标记，命中标记的那个 chunk 才会完整转发给客户端。反过来会丢掉最后一帧。

## 部署：随宿主进程一起起停

shim 挂进了已有的 headroom 启动脚本，与 proxy、MCP 共享同一个 `trap ... EXIT INT TERM`，Ctrl-C 三个一起停。

**`start_shim()` 内部用 `exec` 是必需的。** 用了之后 `$!` 直指 bun 进程本身而不是 wrapper subshell——实测 `SHIM_PID=3222772` 的 `ps -o cmd=` 输出就是 `bun run .../shim.ts`，`kill` 能精确命中，不留孤儿。端口状态序列为启动前 closed、运行中 OPEN、终止后 closed。真实环境的验证是三个进程同处一个 `pts/15`，shim pid 3245661 由启动脚本拉起。

令牌放在 shim 侧（`~/.config/motomoto-shim.key`，mode 600），客户端配置只写 `dummy`，由 shim 强制覆盖 `authorization` 头。shim 绑 `127.0.0.1`——它持有真令牌且不校验调用方凭据，绑到全网等于把额度开放给局域网。

## 不成立的修复方向

- **换或升级客户端运行时。** Bun 与 Node 在这一点上行为一致。DeepWiki 检索确认"服务器停发但保持连接导致 `fetch` 挂"的历史 bug 在 Bun v1.0.18（commit `02e991d`）已修，对应测试 `test/js/web/fetch/http-chunked-server.c` 的场景正是发完一个 chunk 后 `sleep(9999999)`；实测版本 1.4.1 早已包含该修复。同一检索也确认没有任何 Bun 配置项能让 `fetch` 容忍未终止的 chunked。
- **调 `Accept-Encoding`。** Caddy 确实给 `text/event-stream` 加了 `Content-Encoding: gzip`，但 `identity` 变体同样 60 秒失败。
- **改用 `/pg/*`。** 认证与端点覆盖都不满足（见上）。

## See Also

- [SDK 对非标准 responses 帧的解析严格度差异](sdk-strictness-on-nonstandard-responses-frames.md) — 同一个 relay 的解析层问题，与本页的传输层问题相互独立
- [JustWoker `/v1/messages` 实测行为](justwoker-v1-messages-observed-behavior.md) — 另一个 relay 的客户端可观察行为记录
- [模型 capability 声明与 gateway wire 参数不一致](reasoning-capability-vs-wire-parameter.md) — 声明与实际 wire 行为需要分别验证
