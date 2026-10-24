# Responses API WebSocket 模式

> Sources: OpenAI Developers, Unknown
> Raw: [openai-websocket-mode-guide](../../raw/openai-api/openai-websocket-mode-guide.md)
> Updated: 2026-10-24

## Overview

Responses API 提供 WebSocket 模式：客户端建立一条长连接到 `/v1/responses`，用 `response.create` 帧驱动每一轮请求，服务端按 Responses 流式事件模型返回事件。每条连接可以承载多个通道、多个并行对话，并用 `previous_response_id` 续接上下文；连接内的响应状态只保存在内存，因此与 `store=false` 和 Zero Data Retention 兼容。

本篇条目全部来自 OpenAI 平台 WebSocket 模式指南。其他服务商实现的同名端点能力可能不同；OMP 的 Codex 路径有独立实现与判定，见 [OMP Codex WebSocket 传输判定与回退](../omp-config/websocket-transport-policy.md)。

## 请求帧

每一轮以客户端发送的 `response.create` 开始。帧载荷等同 HTTP 创建请求体，`stream` 与 `background` 这类传输专用字段不适用。

发送 `generate: false` 的 `response.create` 可以预热请求状态：它不产出模型输出，但准备好工具、指令或消息，返回的响应 ID 可被后续轮次用 `previous_response_id` 续接。已知下一轮要用的工具与指令时，这种方式能缩短生成轮次的起步时间。

## 续接与缓存

续接同一段对话时，`response.create` 携带两项内容：

- `previous_response_id`，指向上一轮的响应 ID。
- `input`，只包含新增条目，例如工具输出与新的用户消息。

服务端在连接内维护一份内存缓存，保存最近的响应状态；使用 `stream_id` 时，每个通道各自保留最近一次响应，因此从该通道最新响应续接可以复用连接内状态。缓存不写入磁盘，这也是 WebSocket 模式与 `store=false` 兼容的原因。

缓存未命中时的行为取决于是否存储响应：

| 存储设置 | 缓存未命中的行为 |
|---|---|
| `store=true` | 服务端可能从持久状态恢复较旧的响应 ID，续接可用但失去内存缓存带来的延迟优势 |
| `store=false`（含 ZDR） | 没有持久回退，请求返回 `previous_response_not_found` |

同一通道的续接返回 4xx 或 5xx 时，服务端会从连接内缓存逐出被引用的 `previous_response_id`。跨通道 fork 报错时，共享父响应会保留，源通道仍可继续。

## 通道与并发

`stream_id` 在同一条连接上命名一个有序通道。它与 `previous_response_id` 承担不同职责：

- `stream_id` 决定事件归属，并让同通道请求按先进先出顺序执行。
- `previous_response_id` 决定对话血缘。

约束与上限：

| 项目 | 规则 |
|---|---|
| 字符与长度 | 1–256 个字符，仅允许字母、数字、下划线、连字符、句点 |
| 默认通道 | 省略 `stream_id` 时进入隐式默认通道，其事件不带 `stream_id`；空字符串不合法 |
| 在飞响应 | 每连接最多 16 个在飞响应，跨命名通道与默认通道合计；超出的 `response.create` 排队等待 |
| 命名通道 | 每连接最多 32 个不同的命名 `stream_id`，默认通道不计入 |
| 执行顺序 | 同一 `stream_id` 先进先出不重叠；不同 `stream_id` 可并发，事件会交错 |
| HTTP 端点 | `stream_id` 只用于 WebSocket 的 `response.create`，不进入 `POST /v1/responses` |

命名通道的事件（包括终止事件与请求级错误）都带匹配的 `stream_id`。客户端保持单个读取循环，按 `stream_id` 分流事件。

拉起新分支时，把已完成响应的 ID 作为 `previous_response_id` 配新的 `stream_id`；父响应仍可用期间，新通道继承其上下文，原通道可继续推进。`store=false` 下跨通道 fork 依赖父响应留在连接内缓存；如果 fork 排队期间源通道推进或失败导致父响应被逐出，fork 返回 `previous_response_not_found`。稳妥顺序是先等到 fork 通道发出 `response.in_progress`，再推进源通道，或者把 `previous_response_id` 置为 `null` 重放完整上下文。复用已有 `stream_id` 但不带 `previous_response_id` 会开始新响应，不延续对话。

## 连接寿命与恢复

每条连接最长 60 分钟。连接关闭（包括到达上限）后，连接内缓存对所有通道消失。恢复每个通道有三种路径：

1. 已存储响应（`store=true`）且持有有效响应 ID 时，用 `previous_response_id` 加新增条目续接。
2. 无法续接时（例如 `store=false` 或 `previous_response_not_found`），把 `previous_response_id` 置为 `null` 或省略，送该通道下一轮的完整输入上下文。
3. 用 `/responses/compact` 压缩过上下文时，以返回的压缩窗口作为新响应的 `input`，再追加最新的用户或工具条目。

## 压缩

服务端压缩（`context_management` 配 `compact_threshold`）在常规生成过程中发生，WebSocket 模式下按常规方式续接：下一次 `response.create` 带最新 `previous_response_id` 与新增条目。

独立端点的行为不同：`/responses/compact` 返回新的压缩输入窗口，不返回响应 ID。压缩后需要以该窗口作为 `input` 新建响应（省略 `previous_response_id` 或置为 `null`），并原样传入返回内容，不做裁剪。

## 错误码

| 错误码 | 触发条件 | 处理动作 |
|---|---|---|
| `previous_response_not_found` | 引用的响应 ID 不在连接内缓存，且没有持久状态可恢复 | 开启新链，或在允许时启用 `store=true` |
| `invalid_stream_id` | `stream_id` 为空、超长或含非法字符 | 修正取值；需要默认通道时省略该字段 |
| `websocket_stream_limit_reached` | 连接已用满 32 个不同命名通道 | 复用已有 `stream_id`，或新建连接 |
| `websocket_connection_limit_reached` | 连接存活达到 60 分钟上限 | 新建连接，并按恢复路径继续 |

能关联到命名通道的错误事件带 `stream_id`；请求级错误发生后，其他通道可以继续运行。

## 客户端版本要求

| 语言 | 最低依赖 |
|---|---|
| Python | `openai[realtime]>=3.8.0` |
| JavaScript | `openai@^7.10.0` 与 `ws` |
| Ruby | `openai` 与 `async-websocket` |
| Go | `github.com/openai/openai-go/v3@v3.73.0` |
| Java | `com.openai:openai-java:4.79.0` |

## See Also

- [OMP Codex WebSocket 传输判定与回退](../omp-config/websocket-transport-policy.md)
- [SDK 对非标准 Responses 帧的严格度](../model-gateway-mismatch/sdk-strictness-on-nonstandard-responses-frames.md)
