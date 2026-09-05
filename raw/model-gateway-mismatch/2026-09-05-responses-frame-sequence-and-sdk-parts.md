# MotoMoto `/v1/responses` 帧序列与 AI SDK part 序列脱敏实测摘录

> Source: 本会话对 `https://motomoto.lol/v1/responses` 及本地 shim 的脱敏实测记录
> Collected: 2026-09-05
> Published: Unknown

## 测试边界

- 认证令牌值已删除，不在本文件保存。
- 本地 shim 监听 `127.0.0.1:4150`，把 `/v1/*` 请求转发到上游，并在识别到终止标记后关闭自己的响应流。
- 客户端请求 shim 时携带占位认证头；shim 用自己持有的令牌覆盖该头。

## `/v1/responses` 完整帧序列（直连上游，读到连接被重置为止）

一次请求的完整记录，客户端不提前退出：

```
frame_types: [response.created, output_text, message, response.output_item.added,
              response.content_part.added, response.output_text.delta,
              response.output_text.done, response.content_part.done,
              response.output_item.done, response.completed]
bytes: 2097
completed_at_s: 6.21
last_byte_at_s: 6.21
bytes_after_completed_marker: 461
tail: ..."status":"completed"}],"usage":{...},"sequence_number":7}\n\n
total_s: 60.07
```

`response.completed` 标记出现在 6.21 秒。最后一个字节也在 6.21 秒到达。此后到 60.07 秒连接被重置期间没有更多字节。`bytes_after_completed_marker` 的 461 字节属于 `response.completed` 帧自身的剩余部分。

帧类型列表中的 `output_text` 与 `message` 作为事件 type 出现。

## 三个端点的终止标记

- `/v1/chat/completions`：`data: [DONE]`
- `/v1/responses`：`"type":"response.completed"`，该流中没有 `[DONE]`
- `/v1/messages`：`event: message_stop` / `"type":"message_stop"`

## 经 shim 后的四端点实测

客户端等待 stream 的 `done` 信号，并传 `Bearer dummy`：

```
/v1/models            200,  389B, 3 models                                    0.80s
/v1/chat/completions  200,  937B, STREAM DONE, marker [DONE]                  1.56s
/v1/responses         200, 2097B, STREAM DONE, marker "response.completed"    2.44s
/v1/messages          200, 1478B, STREAM DONE, marker message_stop           30.12s
shim stderr: (clean)
```

`/v1/messages` 该次的 `first_byte` 同为 30.12 秒。同端点另一轮请求耗时 1.81 秒。

修复前，同样等待 `done` 的客户端在该端点耗时 60.34 秒且没有拿到数据。

## shim 的 sentinel 匹配缺陷记录

shim 第一版的匹配逻辑为先截断再检查：

```ts
tail = (tail + decode(value)).slice(-256);
if (TERMINALS.some(m => tail.includes(m)))
```

该逻辑下 `/v1/chat/completions` 与 `/v1/messages` 通过，`/v1/responses` 耗时 60.08 秒失败，shim 日志输出 `stream aborted before terminal marker: ECONNRESET`。

修复后的逻辑为扫描整段解码文本，仅保留小段 carry 用于跨 chunk 边界：

```ts
const scanned = carry + decoder.decode(value, { stream: true });
carry = scanned.slice(-CARRY);
if (TERMINALS.some((marker) => scanned.includes(marker))) {
```

shim 中 `CARRY` 取 64，`TERMINALS` 为 `["[DONE]", '"response.completed"', "message_stop"]`。

## AI SDK `fullStream` part 类型序列

同一个 AI SDK 版本、同一个 relay，两条协议的 part 类型序列：

```
chat/completions:  start, start-step, text-start, text-delta, text-end, finish-step, finish   → finish "stop"
responses:         start, start-step, error, text-start, text-delta, text-end, ...             → finish "error"
```

responses 路径的 `error` part 出现在 `text-start` 之前。两条路径都拿到了文本内容。

## 回放对照实验

把上述 2097 字节的 `/v1/responses` 响应原样保存，由本地 Python HTTP server 用 `Content-Length` 返回（不经 shim，不经上游），再交给同一个 AI SDK 客户端：

```
耗时 0.06 秒完成
finish: "error"
usage: 完整
```

经 shim 打真上游的两次记录：run1 7.75 秒、run2 2.45 秒，同为 `finish: "error"`，shim stderr 无输出。另一次记录为 36.93 秒。

## pi-ai 对同类帧的处理

OMP 使用的 `@oh-my-pi/pi-ai` 在同一 relay 的 `/v1/responses` 上正常处理完毕，进程退出码 0。

## 真实二进制端到端记录

```
opencode run --model motomoto-responses/gpt-5.5      exit 0, 22.54s, 输出 "OK"
opencode run --model motomoto-responses/gpt-5.6-sol  exit 0, 53.11s, 输出 "OK"
omp -p --model motomoto-responses/gpt-5.5            exit 0, 18.38s, 输出 "OK"
omp -p --model motomoto-responses/gpt-5.6-sol        exit 0, 16.42s, 输出 "OK"
shim stderr: (clean) 全程
```

SDK 层同期记录：`@ai-sdk/openai-compatible` 配合 `streamText`，`gpt-5.5` 得到 `finish: "stop"` 耗时 2.53 秒，`gpt-5.6-sol` 得到 `finish: "stop"` 耗时 2.04 秒。

## shim 进程生命周期记录

`start_shim` 内使用 `exec` 后，`$!` 记录的 `SHIM_PID=3222772`，其 `ps -o cmd=` 输出为 `/home/cpf/.bun/bin/bun run .../shim.ts`。端口 4150 的状态序列为：启动前 closed、运行中 OPEN、终止后 closed。

用真实启动器结构、把长驻命令替换为 `sleep`、以 `os.killpg` 发送 SIGINT 模拟 Ctrl-C 的一次记录：`script=3226142 mcp=3226143 shim=3226144`，proxy 子进程 3226146，SIGINT 后残留进程为 NONE。

用户在真实环境执行 `procs headr` 与 `procs shim` 的记录：headroom 相关 pid 为 3245659、3245660、3245662（mcp）、3245663（proxy），shim pid 为 3245661，全部位于同一个 `pts/15`。


## shim 实现规格

`~/code-inside/motomoto-shim/shim.ts`，130 行，5377 字节，零依赖零构建。

绑定为 `hostname: "127.0.0.1"`，端口由 `SHIM_PORT` 环境变量指定，实际使用 4150。

请求处理：

- 路径透传：上游 URL 为 `UPSTREAM + pathname + search`
- `authorization` 头被强制覆盖为 shim 自己持有的令牌，客户端传入的值被忽略
- 对上游发送 `accept-encoding: identity`
- 响应 `content-type` 不含 `text/event-stream` 时走 `arrayBuffer()` 直接透传
- SSE 路径先 `ctrl.enqueue(value)` 再检查终止标记，命中标记的那个 chunk 完整转发
- 命中标记后调用 `reader.cancel()` 与 `ctrl.close()`
- catch 分支：若已见到终止标记则 `ctrl.close()`，否则 `ctrl.error(err)` 并输出日志 `stream aborted before terminal marker`
- 每个请求调用 `srv.timeout(req, 0)`

## 外部检索记录：Bun.serve 的相关行为

DeepWiki 对 `oven-sh/bun` 的检索结果表示，`Bun.serve` 在响应结束时由 `HttpResponse::internalEnd` 负责写入 chunked 终止块 `0\r\n\r\n`，并保证只写一次，以避免残留终止块被当作 keep-alive 连接上下一个响应的开头。

Context7 提供的 Bun 官方文档表示，`Bun.serve` 的 `idleTimeout` 默认为 10 秒，`server.timeout(req, 0)` 可以针对单个请求取消该超时。安静的 SSE 流会被默认 idleTimeout 判定为 idle。

grep.app 对 TypeScript 与 JavaScript 的检索没有找到「手写 dechunk 后重发合规 chunked」的现成库。

## headroom 启动脚本改动记录

`/home/cpf/.local/bin/headroom-proxy-start` 原为 252 行；改动后文件大小 11992 字节，权限 mode 775，`bash -n` 语法检查通过。

改动位置：

- 第 207 行后新增 `SHIM_LOG=/tmp/motomoto-shim.log`
- `start_mcp()` 之后新增 `SHIM_CMD=("$HOME/.bun/bin/bun" run "$HOME/code-inside/motomoto-shim/shim.ts")` 与 `start_shim()`，后者内含 `MOTOMOTO_API_KEY="$(cat "$HOME/.config/motomoto-shim.key")" SHIM_PORT=4150 exec "${SHIM_CMD[@]}"`
- daemon 分支新增 `nohup "${SHIM_CMD[@]}"` 启动与 `SHIM_PID=$!`
- 前台分支新增 `start_shim > "$SHIM_LOG" 2>&1 &` 与 `SHIM_PID=$!`，trap 改为 `trap 'kill "$MCP_PID" "$SHIM_PID" 2>/dev/null || true' EXIT INT TERM`

脚本第 93 至 97 行已有的既有模式为 `export OPENAI_API_KEY="dummy"`，其注释文字为 `"dummy" satisfies the constructor without leaking a real secret`。

现有的 `start_mcp` 没有使用 `exec`。

## 客户端进程环境观测

读取 `/proc/<pid>/environ` 的结果：opencode（pid 3078636）与 omp（pid 3098344）的进程环境中 `ANTHROPIC_BASE_URL`、`ANTHROPIC_API_URL`、`OPENAI_BASE_URL` 均未设置。
