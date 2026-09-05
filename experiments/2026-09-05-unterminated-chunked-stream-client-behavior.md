# 未终止 chunked 流的客户端行为受控实验

## Hypothesis

初始假设：MotoMoto 的 `/v1/*` 流式响应与 Bun `fetch` 不兼容，`fetch` 的 headers promise 被扣住约 60 秒，且 body stream 读不出任何字节；该问题为 Bun 运行时特有。

## Baseline

早前一次测量的记录：`hdr_ms: 60073`、`arrivals: []`、body 字节数为 0。该次测量同时发出 4 个请求到同一个端点。

## Change

改为严格串行发送单个请求，每次只有一个在途请求。唯一变量为客户端读取循环的退出条件：

- `sentinel` 模式：缓冲中出现 `[DONE]` 即退出循环并 cancel reader。
- `done` 模式：等待 stream 的 `done` 信号。

## Context

- Date: 2026-09-05
- Endpoint: `https://motomoto.lol/v1/chat/completions`
- 请求体：`{"model":"gpt-5.5","messages":[{"role":"user","content":"Say OK"}],"stream":true,"max_tokens":100}`
- 请求头含 `accept-encoding: identity`
- 客户端运行时：Bun 1.4.1、Node v24.20.0、Python 3.14.4
- 服务端 `Server` 头：`BaseHTTP/0.6 Python/3.10.12`
- 认证令牌值未保留

## Steps

1. 用同一份客户端脚本，分别以 `bun` 和 `node` 执行，`MODE` 环境变量控制退出条件。
2. 每次执行之间加 1 秒间隔，确保请求串行。
3. 记录 HTTP 状态、headers 到达时间、首字节时间、read 次数、收到字节数、是否含 `[DONE]`、退出原因、总耗时。
4. 另用 Python `http.client` 对同一端点发一次请求作为第三个客户端对照。
5. 用裸 socket 抓同一端点的原始响应字节，检查 chunked 终止块是否存在。

## Observations

- Bun `sentinel` 模式：HTTP 200，headers 2.79 秒到达，首字节 2.94 秒，`reads=1`，937 字节，含 `[DONE]`，总耗时 2.94 秒。
- Bun `done` 模式：抛错 `The socket connection was closed unexpectedly`，总耗时 60.34 秒。
- Node `sentinel` 模式：HTTP 200，headers 3.58 秒到达，首字节 4.23 秒，`reads=1`，937 字节，含 `[DONE]`，总耗时 4.24 秒。
- Node `done` 模式：抛错 `terminated`，总耗时 60.13 秒。
- Python `http.client`：抛出 `IncompleteRead(937 bytes read)`，总耗时 60.08 秒。
- 裸 socket 抓取结果：`chunked terminator present: false`，body 尾部为 `...data: [DONE]\n\n\r\n`，最后一个 chunk 定界符之后没有更多字节。
- 同次抓取还记录到 `duplicate header names: [["date", 2]]`。
- 三个客户端记录到的字节数都是 937。

## Evidence

- [MotoMoto 端点拓扑与客户端容忍度脱敏实测摘录](../raw/model-gateway-mismatch/2026-09-05-motomoto-endpoint-topology-and-client-tolerance.md)
- [MotoMoto `/v1/responses` 帧序列与 AI SDK part 序列脱敏实测摘录](../raw/model-gateway-mismatch/2026-09-05-responses-frame-sequence-and-sdk-parts.md)

## Verdict

初始假设的三个组成部分都被推翻：

- **「headers promise 被扣住 60 秒」不成立。** 串行条件下 headers 在 2.79 秒到达。Baseline 记录的 `hdr_ms: 60073` 来自并发测量：4 个请求同时打到单线程的 `BaseHTTP` 服务端会排队，排队等待被计入了 headers 时间。测量方法本身制造了这个数字。
- **「body 读不出字节」不成立。** 一次 `read()` 就返回全部 937 字节，含 `[DONE]`。
- **「Bun 运行时特有」不成立。** Node 与 Python 在等待流终止时同样失败，且 Python 报出的字节数与另两者一致。

成立的根因只有一条：**服务端发完最后一帧后不发 chunked 终止块，把连接吊到 60 秒超时**。等待 stream `done` 的客户端会挂满 60 秒，然后因响应被判为不完整而丢弃已经完整收到的数据。

「重复 `Date` 头是触发点」这一辅助假设不再需要——缺终止块单独就完整解释了全部观测。

方法层结论：**在单线程服务端上做并发测量，会把排队时间读成延迟或挂起。** 任何涉及时间的服务端行为判断，必须先确认在途请求数为 1。

## Follow-up

- 修复方向不在客户端运行时选择上。Bun 与 Node 在这一点上没有差别，升级 Bun 也无效（相关历史 bug 在 v1.0.18 已修，实测版本 1.4.1 高于该版本）。
- 可行修复是在客户端与上游之间插入本地代理，识别协议自身的终止标记后主动关闭响应流，由代理补上合规的 chunked 终止块。
- 该修复要求逐协议匹配终止标记：`/v1/chat/completions` 用 `[DONE]`，`/v1/responses` 用 `"response.completed"`，`/v1/messages` 用 `message_stop`。
