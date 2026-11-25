# copilot-api 客户端取消传播、超时配置与部署记录

> Source: 本机 copilot-api 仓库 dev 分支源码、测试、配置备份与会话内命令输出；OMP config.yml、Headroom settings.json 与 copilot-api config.json
> Collected: 2026-11-26
> Published: Unknown

## 用户目标与授权

用户要求缩短异常请求等待，同时保留 OMP 自动重试和模型切换。批准的执行范围包括修改 OMP、Headroom、copilot-api 的五个超时值，修复 copilot-api 客户端取消传播，以及向 can1357/oh-my-pi 提交英文说明。用户明确反对通过关闭 OMP 自动重试来缩短等待，也明确不修改全局安装的 OMP 包。

原始批准目标摘录：

> Goal: shorten abnormal request waiting while retaining OMP recovery; propagate gateway client cancellation; file upstream reports in English.

## 配置修改与保存验证

配置备份后缀为 `.before-fast-fail-20261125-223546`。修改前 OMP 两项均为 `420` 秒，copilot-api 两项均为 `300000` 毫秒，Headroom `request_timeout` 为 `330` 秒。

| 层 | 配置键 | 修改后保存值 |
| --- | --- | ---: |
| OMP | `providers.streamFirstEventTimeoutSeconds` | `45` |
| OMP | `providers.streamIdleTimeoutSeconds` | `120` |
| copilot-api | `upstreamTransport.headersTimeoutMs` | `50000` |
| copilot-api | `upstreamTransport.streamInactivityTimeoutMs` | `130000` |
| Headroom | `request_timeout` | `150` |

验证记录原文：

> YAML/JSON assertion check passed. Only five approved fields differ. OMP first-event 45s / idle 120s; gateway headers 50000ms / inactivity 130000ms; Headroom request_timeout 150s.

OMP `retry.enabled` 保持 `true`，`maxRetries` 为 `10`，`baseDelayMs` 为 `500`，`maxDelayMs` 为 `300000`，`modelFallback` 为 `true`。Headroom `retry_max_attempts` 保持 `1`。

原生 `omp config get` 与当前会话 `cfg://` 读取均返回 OMP 首事件 `45`、空闲 `120`，来源为全局配置。Fresh gateway config-store loader 返回 `headersTimeoutMs=50000` 和 `streamInactivityTimeoutMs=130000`。

配置修改记录时间为 `2026-11-25T14:36:03.315Z`。随后 YAML 解析断言及原生 CLI 读取均确认 `45/120`。之后再次读取当前值仍为 `45/120`。文件 mtime 后来变化，但现有会话记录没有对应的这两个字段修改操作；不能据此推断另一个取值。

## 保存值与运行值的区别

首次保存后、重启前，Headroom `GET /settings/schema` 返回 `request_timeout` stored=`150`、runtime=`330`。安装版本的 curated settings 在启动时捕获；`/settings/apply` 会重启 proxy。

当时网关进程以 `bun src/main.ts start` 运行且没有 watch。新源码需要重启进程后激活；配置有缓存和显式 `/admin/config/reload`。本次代码修改阶段没有执行生产重启。

用户随后自行重启五个 copilot-api 实例和 Headroom。实测进程启动时间为：

| 对象 | 本机启动时间 |
| --- | --- |
| copilot-api 实例一 | Wed Nov 25 23:47:50 2026 |
| copilot-api 实例二 | Wed Nov 25 23:47:53 2026 |
| copilot-api 实例三 | Wed Nov 25 23:47:56 2026 |
| copilot-api 实例四 | Wed Nov 25 23:47:58 2026 |
| copilot-api 实例五 | Wed Nov 25 23:48:01 2026 |
| Headroom | Wed Nov 25 23:50:30 2026 |

Headroom 重启后 `/settings/schema` 返回 stored=`150`、runtime=`150`。

## 源码修改

仓库：`~/code-inside/copilot-api`。提交为 `6663ff5570`，提交前工作区只包含下述源码、测试和文档修改。

`src/services/upstream-http.ts` 的 `UpstreamHttpLifecycleOptions` 保持：

```ts
export interface UpstreamHttpLifecycleOptions {
  clientSignal?: AbortSignal
  headersTimeoutMs: number
  streamInactivityTimeoutMs: number
}
```

`createRequestLifecycle` 新增：

```ts
const clientSignal = options.clientSignal
const onClientAbort = () => controller.abort(clientSignal?.reason)
```

现有 `finish` 增加：

```ts
clientSignal?.removeEventListener("abort", onClientAbort)
```

创建生命周期后注册：

```ts
clientSignal?.addEventListener("abort", onClientAbort, { once: true })
```

`fetchUpstreamWithLifecycle` 仍在发送前分别执行 `options.clientSignal?.throwIfAborted()` 和 `init.signal?.throwIfAborted()`。有 `init.signal` 时使用：

```ts
AbortSignal.any([init.signal, lifecycle.signal])
```

没有 `init.signal` 时直接使用 `lifecycle.signal`。公开函数签名未改变。

响应体仍由现有 `createManagedResponseBody` 与 `readWithLifecycle` 管理。取消后，现有错误路径执行 `lifecycle.finishWithError(error)`、`finish()`、`reader.cancel(reason)` 与 `releaseLock()`。正常完成和没有响应体时也执行清理。

## 代码层级

- `clientSignal`、`onClientAbort`、`createRequestLifecycle`、`fetchUpstreamWithLifecycle` 是 copilot-api 项目代码。
- `AbortController`、`AbortSignal`、`AbortSignal.any`、`fetch`、`Response`、`ReadableStream` 是 Web 标准 API；在这个服务器项目中由 Bun 执行。
- `fetch` 发出上游 HTTP 请求。HTTP 响应头和响应体属于 HTTP 层。
- TCP 连接由 Bun 底层与操作系统处理。本次没有修改 TCP 或操作系统代码。
- 本地测试观察到 Bun HTTP 服务端收到取消；模型服务收到中断后的计算停止与计费行为由上游决定。

## 修改文件

| 文件 | 修改范围 |
| --- | --- |
| `src/services/upstream-http.ts` | 客户端取消传播与清理 |
| `tests/upstream-http-lifecycle.test.ts` | 发送前、响应头等待、响应体读取、真实断连、清理与并发隔离 |
| `tests/responses-local-http.test.ts` | Responses 流式取消后的失败终态和最终 usage 未到达时不生成用量记录 |
| `tests/provider-responses-context-management.test.ts` | provider Responses 与 Codex 的 `499 Client Closed Request`、空响应体、原取消原因、单次上游调用 |
| `tests/chat-completions-handler.test.ts` | 保留已收到文本，停止后续文本、最终 usage 与 `[DONE]`，不输出成功标记 |
| `tests/upstream-drain-ws.test.ts` | 非流式 Messages 以原 Error 拒绝，无关请求独立完成 |
| `docs/local-features.md` | 同步行为、上游接入和验证入口说明 |

测试名称与断言原文包括：

- `client cancellation closes the real upstream connection while awaiting headers`
- `client cancellation closes the real upstream connection while awaiting body`
- `concurrent upstream lifecycles use independent controllers`
- provider 与 Codex 测试断言 HTTP `499`、status text `Client Closed Request`、响应文本为空、`fetchMock` 调用一次。
- Chat 测试断言保留 `"he"`，不含 `"llo"`，不含 `"total_tokens"`，不含 `[DONE]`，上游 body 已取消。
- Messages 测试断言返回的拒绝原因与 `new Error("client disconnected")` 是同一对象。

## 验证输出

定向测试：

> `bun run test tests/upstream-http-lifecycle.test.ts tests/responses-local-http.test.ts tests/copilot-request.test.ts` passed 32 tests with 0 failures, including real loopback headers/body cancellation.

消费者迁移测试：

> The consumer migration targeted run passed 87 tests with 0 failures and 492 expectations across `provider-responses-context-management`, `chat-completions-handler`, and `upstream-drain-ws`.

最终完整序列：

```sh
bun run lint:all --fix && bun run build && bun run test && bun run typecheck && bun run lint:all
```

退出码为 `0`。全量隔离测试为 `5255` pass、`0` fail、`22280` expectations、`264` files。`src/services/upstream-http.ts` 覆盖率记录为 function `93.33%`、line `99.30%`，仓库要求为 `85%`。

提交前全量检查通过。提交后用户提供的 `git status` 显示 dev 比 origin/dev 超前一个提交，工作树干净。没有 push。

## 证据边界

本地真实 HTTP 测试证明取消能够传到本地 Bun 上游服务端。完整测试证明仓库行为在测试环境下通过。没有为本次归因调查发送新的真实模型请求，也没有测量真实模型服务收到取消后的资源释放速度。
