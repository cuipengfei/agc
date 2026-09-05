# MotoMoto 端点拓扑与客户端容忍度脱敏实测摘录

> Source: 本会话对 `https://motomoto.lol` 的脱敏实测记录
> Collected: 2026-09-05
> Published: Unknown

## 测试边界

- 认证使用一枚短期 `sk-` 令牌；令牌值已删除，不在本文件保存。
- 所有 HTTP 探测由 Python（`socket` + `ssl`、`http.client`）与 JavaScript（`fetch`、`node:https`）发出；本会话环境禁用 `curl` 与 `wget`。
- 流式请求体统一为 `{"model":"gpt-5.5","messages":[{"role":"user","content":"Say OK"}],"stream":true,"max_tokens":100}`。
- 请求头包含 `accept-encoding: identity`，用于排除 gzip 变量。

## 站点响应头指纹

以下头字段出现在站点响应中：

```
x-new-api-version: v1.0.0-rc.30-motomoto.3
x-oneapi-request-id: <值已删除>
via: 1.1 Caddy
```

## 端点拓扑

| 路径 | `Server` 响应头 | chunked 终止块 | 接受的认证 | 其他观测 |
|---|---|---|---|---|
| `/` | `Caddy` | 不适用 | 无 | 静态 SPA shell，1204 字节 |
| `/api/*` | 缺失 | 存在 | dashboard JWT | 管理端点 |
| `/pg/chat/completions` | 缺失 | 存在 | 仅 dashboard JWT | `sk-` 令牌返回 HTTP 401，响应体含 `{"code":"AUTH_UNAUTHORIZED"}` |
| `/v1/*` | `BaseHTTP/0.6 Python/3.10.12` | 缺失 | `sk-` 令牌 | `Date` 头出现两次；`Connection: close`；`X-Accel-Buffering: no` |

`Server: BaseHTTP/0.6 Python/3.10.12` 只在 `/v1/*` 的响应中出现。

`/pg/chat/completions` 的请求体比 `/v1/chat/completions` 多一个字段 `"group":"default"`。该端点使用的 dashboard JWT 中 `exp` 减 `nbf` 为 905 秒。对 `/pg/responses` 与 `/pg/v1/chat/completions` 的请求返回 SPA HTML。

## `/v1/models` 观测

`GET /v1/models` 返回 HTTP 200、389 字节、耗时 0.80 秒，响应使用 `Content-Length`，没有 `Transfer-Encoding: chunked`，连接正常终止。返回的模型 id 为：

- `gpt-5.4-mini`
- `gpt-5.5`
- `gpt-5.6-sol`

## `/v1/chat/completions` 原始响应头与响应尾

裸 socket 抓取的响应头（行号为抓取时的行序）：

```
 0| HTTP/1.1 200 OK
 3| Content-Type: text/event-stream
 4| Date: Sat, 05 Sep 2026 06:02:25 GMT
 5| Date: Sat, 05 Sep 2026 06:02:25 GMT
 6| Server: BaseHTTP/0.6 Python/3.10.12
11| Connection: close
12| Transfer-Encoding: chunked
```

同次抓取的解析结果：

```
duplicate header names: [["date", 2]]
chunked terminator present: false
body tail: "...data: [DONE]\n\n\r\n"
```

最后一个 chunk 的定界符之后没有更多字节，即缺少 chunked 终止块 `0\r\n\r\n`。连接在服务端 60 秒超时后被断开。

## 四客户端容忍度实测

对同一个 `/v1/chat/completions` 流式请求，四个客户端的记录（客户端在读到 `[DONE]` 后主动退出循环）：

| 客户端 | 状态 | headers 到达 | 首字节 | 收到字节 | 含 `[DONE]` | 总耗时 |
|---|---|---|---|---|---|---|
| Python `http.client` | 抛异常 `IncompleteRead(937 bytes read)` | — | — | 937 | — | 60.08s |
| Node v24.20.0 `fetch`（undici） | 200 | 2.21s | 2.21s | 937 | 是 | 2.22s |
| Node v24.20.0 `https.request`（llhttp） | 200 | 2.51s | 2.51s | 937 | 是 | 2.52s |
| Bun 1.4.1 `fetch` | 200 | 2.55s | 2.55s | 937 | 是 | 2.55s |

三个客户端都记录到 937 字节。Bun 进程内 `process.version` 报告为 `v26.3.0`，`Bun.version` 报告为 `1.4.1`。

## 受控实验：唯一变量为循环退出条件

请求严格串行发送，每次只有一个在途请求。唯一变量是客户端读取循环的退出条件：`sentinel` 模式在缓冲中出现 `[DONE]` 时退出，`done` 模式等待 stream 的 `done` 信号。

```
bun 1.4.1    mode=sentinel  → 200, hdr 2.79s, first_byte 2.94s, reads=1, 937B, has_DONE=true, exit=sentinel-break, total 2.94s
bun 1.4.1    mode=done      → error "The socket connection was closed unexpectedly. For more information, pass `verbose: true` in the second argument to fetch()", total 60.34s
node v24.20.0 mode=sentinel → 200, hdr 3.58s, first_byte 4.23s, reads=1, 937B, has_DONE=true, exit=sentinel-break, total 4.24s
node v24.20.0 mode=done     → error "terminated", total 60.13s
```

早前一次并发测量记录到 `hdr_ms: 60073` 与 `arrivals: []`。该次测量同时发出 4 个请求。

## 本机运行时版本

```
bun 1.4.1 (/home/cpf/.bun/bin/bun)
node v24.20.0
go version go1.24.12 linux/amd64
Python 3.14.4
cargo: 未安装
deno: 未安装
caddy: 未安装
```

## 端口占用观测

- 4139-4146：sticky-router 与 5 个 copilot-api 实例
- 8787：headroom proxy
- 8788：headroom MCP
- 4150 / 4151 / 4160：实测空闲

## 上游服务错误观测

测试期间两次收到 HTTP 503，响应体中的错误标识为 `system_cpu_overloaded`，说明文字表示 CPU 使用率超过 90% 阈值时拒绝请求。退避 12 秒后重试成功。

## 外部检索记录：Bun 的相关历史修复

DeepWiki 对 `oven-sh/bun` 的检索结果表示，「服务器停止发送数据但保持连接打开导致 `fetch` 挂起」的问题在 Bun v1.0.18 修复，对应 commit `02e991d`。Exa 检索到对应测试文件 `test/js/web/fetch/http-chunked-server.c`，其注释描述的场景为：发送 headers 与一个 chunk 后 `sleep(9999999)`，不关闭连接。

同一检索结果表示，没有 Bun 配置项能让 `fetch` 容忍未终止的 chunked 响应。
