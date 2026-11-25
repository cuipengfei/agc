# copilot-api 客户端取消与上游请求生命周期

> Sources: 本机 copilot-api 源码、测试、配置与部署记录, 2026-11-26
> Raw: [客户端取消传播、超时配置与部署记录](../../raw/copilot-gateway/2026-11-26-client-cancellation-and-timeout-deployment.md)
> Updated: 2026-11-26

## Overview

copilot-api 的 `fetchUpstreamWithLifecycle` 会把客户端取消传入当前上游 HTTP 请求。等待响应头和读取响应体期间都能取消；原取消原因、调用方 `init.signal`、既有超时和清理路径继续保留。该行为由提交 `6663ff5570` 引入。

## 请求控制路径

一次上游请求按以下顺序处理：

1. 发送前分别检查 `options.clientSignal` 和 `init.signal`，任一信号已经取消时不调用 `fetch`。
2. `createRequestLifecycle` 为当前请求创建独立 `AbortController`、响应头计时器和清理函数。
3. `onClientAbort` 收到客户端事件后执行 `controller.abort(clientSignal?.reason)`。
4. 有 `init.signal` 时，`AbortSignal.any([init.signal, lifecycle.signal])` 合并两个来源；没有时直接使用 `lifecycle.signal`。
5. `fetch` 使用该信号等待响应。响应体仍由现有 `createManagedResponseBody` 和 `readWithLifecycle` 逐段读取。
6. 正常结束、读取失败或消费者提前取消时，现有清理路径释放监听器、计时器和 reader 锁。

`clientSignal` 是 copilot-api 包装函数接收的选项，`init.signal` 是标准 fetch 选项。两者可以同时存在，互不失效。

## 职责层级

| 层级 | 名称 | 职责 |
| --- | --- | --- |
| copilot-api 应用代码 | `clientSignal`、`onClientAbort`、`createRequestLifecycle`、`fetchUpstreamWithLifecycle` | 组织本次请求、转发取消原因并管理清理 |
| Web 标准 API，由 Bun 执行 | `AbortController`、`AbortSignal`、`AbortSignal.any`、`fetch`、`Response`、`ReadableStream` | 提供取消信号、HTTP 请求和流读取能力 |
| HTTP | 响应头、响应体、SSE | 承载上游状态、元数据和逐步输出的内容 |
| Bun 底层与操作系统 | TCP 连接 | 提供网络传输 |

本次只修改 copilot-api 应用代码。程序里的 `abort` 事件不是发送给模型服务的 HTTP 字段。

## 清理与请求隔离

`finish` 使用 `finished` 防止重复清理，清除响应头计时器，并移除客户端取消监听器。注册时使用 `{ once: true }`，正常完成时仍主动移除监听器，因为请求可能从未发生取消。

响应体读取发生错误时，现有路径执行 `lifecycle.finishWithError(error)`、`finish()`、`reader.cancel(reason)` 和 `releaseLock()`。消费者提前结束流时也会取消底层 reader。

并发测试创建两个独立生命周期。取消第一个客户端后，第一个上游信号被取消，第二个继续正常完成。

## 接口的可观察行为

| 接口或场景 | 测试观察到的结果 |
| --- | --- |
| provider Responses 与 Codex 等待上游时取消 | HTTP `499`，status text 为 `Client Closed Request`，响应体为空，上游调用一次 |
| Responses 已开始流式输出后取消 | 上游终止，发送 `response.failed` 后结束；最终 usage 未到达时不新增用量记录 |
| Chat Completions 收到 `"he"` 后取消 | 保留 `"he"`，不再收到 `"llo"`、最终 usage 或 `[DONE]`，不输出成功标记 |
| 非流式 Messages 等待时取消 | Promise 以客户端提供的同一个 Error 对象拒绝 |
| 无关请求 | 独立取得原响应，不跟随另一个客户端取消 |

用量记录使用取消前已经收到的数据。本地取消不会撤销上游已经发生的处理或费用。

## 验证与部署

定向生命周期与 Responses 测试通过 `32` 项，消费者迁移测试通过 `87` 项、`0` 失败。真实本地 `Bun.serve` 测试分别覆盖等待响应头和读取响应体时的取消，并在服务端观察连接取消。

最终验证序列为：

```sh
bun run lint:all --fix && bun run build && bun run test && bun run typecheck && bun run lint:all
```

退出码为 `0`。全量隔离测试为 `5255` 通过、`0` 失败、`22280` 个断言、`264` 个文件。`src/services/upstream-http.ts` 的 function coverage 为 `93.33%`，line coverage 为 `99.30%`。

五个 copilot-api 实例在本机时间 `2026-11-25 23:47:50` 至 `23:48:01` 重启，加载新源码。Headroom 在 `23:50:30` 重启。配置保存值、进程已加载值和代码是否已部署需要分别核对。

本地 HTTP 测试没有测量真实模型服务收到取消后的计算停止时间或资源释放速度。

## See Also

- [本机链路的超时预算：OMP、Headroom 与 copilot-api](local-hop-timeout-budget.md)
- [Copilot Chat 生成失败：跨协议传递、用量保留与 OMP 重试边界](../model-gateway-mismatch/copilot-chat-generation-failure-and-omp-retry.md)
- [OMP HTTP 首事件与首输出的计时边界](../omp-config/http-first-output-deadline.md)
- [Copilot 延迟调查：社区报告、本机用量与 OMP 计时](copilot-latency-evidence-boundaries.md)
