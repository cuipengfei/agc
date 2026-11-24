# copilot-api 失败诊断日志与本机链路超时取值

> Source: 本机 copilot-api 仓库（`~/code-inside/copilot-api`，dev 分支）源码、提交 `0f3b3490`、测试输出；本机 `~/.headroom/settings.json`、`~/.omp/agent/config.yml`、`~/.local/share/copilot-api/config.json` 与会话内命令输出
> Collected: 2026-11-25
> Published: Unknown

## 本机链路超时取值

以下取值于 2026-11-25 在本机读取；OMP 修改与全部验证也在同一天完成。

| 层 | 位置 | 键 | 值 |
|---|---|---|---|
| OMP | `~/.omp/agent/config.yml` | `providers.streamFirstEventTimeoutSeconds` | `420` |
| OMP | `~/.omp/agent/config.yml` | `providers.streamIdleTimeoutSeconds` | `420` |
| Headroom | `~/.headroom/settings.json` | `request_timeout` | `330` |
| Headroom | `~/.headroom/settings.json` | `retry_max_attempts` | `1` |
| copilot-api | `~/.local/share/copilot-api/config.json` | `upstreamTransport.headersTimeoutMs` | `300000` |
| copilot-api | `~/.local/share/copilot-api/config.json` | `upstreamTransport.streamInactivityTimeoutMs` | `300000` |

Headroom 同文件其他已读非敏感值：`rpm` 为 `60`，`write_timeout_seconds` 为 `150`。运行中的 `GET /settings` 返回的 `request_timeout` 与 `retry_max_attempts` 与保存值一致。

OMP 两项在修改前均为 `150` 秒；修改时生成了带时间戳的备份文件。改后 YAML 解析、`cfg://providers/streamFirstEventTimeoutSeconds` 与 `cfg://providers/streamIdleTimeoutSeconds` 读取均为 `420`。

## 提交 `0f3b3490`

提交 `0f3b3490e185b3d16215baeb5af008f3b21d7ba3`，subject 为 `fix: preserve sanitized chat completion failure diagnostics`，涉及 9 个文件，合计 `+283`/`-21`：

| 文件 | 增删 |
|---|---|
| `docs/guides/en/troubleshooting.md` | `+8` |
| `docs/guides/zh-CN/troubleshooting.md` | `+8` |
| `src/lib/http/chat-completions-stream.ts` | `+32`/`-10` |
| `src/lib/http/request-context-store.ts` | `+1` |
| `src/lib/http/request-events.ts` | `+1` |
| `src/routes/chat-completions/handler.ts` | `+47`/`-10` |
| `tests/auto-session-discovery.test.ts` | `-1` |
| `tests/chat-completions-handler.test.ts` | `+145` |
| `tests/chat-completions-stream.test.ts` | `+41` |

## 失败事件保留

`src/lib/http/chat-completions-stream.ts`：

- 第 22 行：内部事件类型含 `upstreamError?: Omit<ServerSentEventMessage, "data"> & { data: unknown }`。
- 第 79 行声明局部变量，第 133 行 `upstreamError = { ...message, data }`，第 194 行 `...(upstreamError && { upstreamError })`。
- 守卫发现首个失败后继续读完上游，收集尾随 `usage` 与 `copilot_usage`，最后只向客户端发一次 `error`。公开事件只保留原有的安全错误字段，`upstreamError` 不出现在客户端 SSE 中。

## 脱敏序列化

`src/lib/http/chat-completions-stream.ts`：

- 第 226–232 行：`ERROR_METADATA_PATTERN`、`ERROR_URL_PATTERN`、`ERROR_CREDENTIAL_PATTERN`、`SENSITIVE_ERROR_KEY_PATTERN` 四个正则位于模块级，避免逐属性创建。
- 第 242 行：`export function serializeChatCompletionFailureLog`，通过 `JSON.stringify` 的 replacer 递归处理。
- 键名命中 `SENSITIVE_ERROR_KEY_PATTERN` 时值替换为 `[redacted]`。键名集合包括 `auth`、`authorization`、headers 类、cookies 类、`request`/`request_body`、`body`、`messages`、`prompt`、`input`、`content`、`tool_calls`、`function_call`、`arguments`、`credentials`、任何以 `apiKey`、`token`、`secret`、`password` 结尾的键，以及 `sessionId`、`session`、`session_token`、`CopilotEditsSession`。
- 其余字符串经 `redactErrorText`：先按 `ERROR_METADATA_PATTERN` 切掉元数据后缀，再把 URL 替换为 `[redacted URL]`，把 `Bearer` 形式、`sk-` 形式、GitHub 与 JWT 形式的 token 替换为 `[redacted]`。
- 日志序列化不截断长字符串；客户端错误摘要经 `safeErrorMessage`，其末尾为 `.slice(0, 1024)`，并清除非打印字符。
- 保留 `choices.finish_reason` 与错误里未被键名命中的其他字段。

## 请求上下文与日志字段

- `src/lib/http/request-context-store.ts`：`RequestContext` 增加 `port?: number`。
- `src/lib/http/request-events.ts`：存在 store 时执行 `store.port = port`。
- `src/routes/chat-completions/handler.ts` 第 52 行：日志器名为 `chat-completions-handler`。
- 第 140–157 行（非流式失败）与第 192–210 行（流式失败）各调用一次 `logger.error("Chat completion failed", serializeChatCompletionFailureLog({...}))`。字段为 `model`、`requestId`、`gatewayRequestId`、`responseId`、`upstreamRequestId`、`port`、`pid`、`clientAborted`、`usage`、`copilotUsage`；流式额外带 `upstreamEvent`。
- `upstreamRequestId` 取 `x-github-request-id`，缺失时取 `x-request-id`。
- `clientAborted` 在流式分支取 `stream.aborted || c.req.raw.signal.aborted`。
- 请求上下文值在进入 `streamSSE` 回调之前取好，回调内不读 `AsyncLocalStorage`；现有 lint 规则会拦截回调内读取。

## 日志文件与保留

`src/lib/logger.ts`：

- 第 11 行 `LOG_RETENTION_DAYS = 7`，第 12 行换算为毫秒，第 13 行 `CLEANUP_INTERVAL_MS` 为 `24` 小时。
- 第 14 行 `COPILOT_API_LOG_DIR`，第 15 行默认目录为 `PATHS.APP_DIR` 下的 `logs`；Linux 默认 `~/.local/share/copilot-api/logs`。
- 第 301 行文件名模板为 `${sanitizedName}-${dateKey}.log`，`dateKey` 由 `toLocaleDateString("sv-SE")` 得到，即 `YYYY-MM-DD`。
- 超过 7 天未修改的文件在启动时与每日清理；跨日期时关闭前一天的写入流。

## 验证结果

- 定向测试：`bun run test tests/chat-completions-stream.test.ts tests/chat-completions-handler.test.ts --coverage`，83 项通过、0 项失败。
- 完整序列：`bun run lint:all --fix`、`bun run build`、`bun run test --coverage`、`bun run typecheck`、`bun run lint:all` 全部通过；全量测试 5248 项通过、0 项失败。
- 新增回归：流式测试断言原始事件保留、公开 SSE 不泄露；handler 测试用真实路由与请求事件中间件（端口 `4146`），断言日志含模型、编号、端口、PID、用量与断开状态，并断言 2200 字符的上游详情保留、凭据与请求正文被替换。

## 测试隔离问题

全量测试暴露一个既有问题：`tests/auto-session-discovery.test.ts` 的场景在 `try` 外与 `try` 内各创建一份模块实例，`finally` 等待外层实例后删除临时目录，内层实例的后台写入报 `Probe history writer file changed .../runtime/conditions.json`。修复为只创建一个实例，所有断言保留。

## 部署边界

诊断代码与日志格式改动需要重启使用新代码的 copilot-api 实例才生效；本次未重启任何实例，也未对真实 GitHub 上游发起验证请求。
