# SDK 对非标准 responses 帧的解析严格度差异

> Sources: MotoMoto relay 实测, 2026-09-05; opencode `providers.mdx` 与 `provider.ts`, 2026-09-05; `@oh-my-pi/pi-ai` 18.1.10 源码, 2026-09-05
> Raw: [MotoMoto `/v1/responses` 帧序列与 AI SDK part 序列脱敏实测摘录](../../raw/model-gateway-mismatch/2026-09-05-responses-frame-sequence-and-sdk-parts.md); [OpenCode provider `npm` 选择规范与两 harness 协议配置摘录](../../raw/model-gateway-mismatch/2026-09-05-opencode-provider-npm-spec.md)
> Updated: 2026-09-05

## Overview

同一个 relay 的同一批 SSE 帧，AI SDK 判为 `finishReason: "error"`，pi-ai 正常处理完毕。差别不在传输，也不在内容完整性——两边都拿到了全部文本——而在解析器对非标准事件 type 的容忍度。这一层问题很容易和传输层故障混为一谈，因为症状（收尾状态异常）出现在同一条链路上；区分它们需要一个把传输变量消掉的对照实验。协议选择在 opencode 侧由 `npm` 字段决定且无法在运行时改，所以实际的处理办法是让每个 harness 走各自解析器能吃下的协议。

## 现象：`finishReason` 为 error 但文本完整

MotoMoto 的 `/v1/responses` 经 shim 正常终止之后，AI SDK 仍然报 `finish: "error"`。文本内容和 usage 都完整。同一个 SDK 版本打同一个 relay 的 `/v1/chat/completions` 则是 `finish: "stop"`。

## 定位：error part 出现在 `text-start` 之前

`fullStream` 的 part 类型序列是直接证据：

```
chat/completions:  start, start-step, text-start, text-delta, text-end, finish-step, finish   → finish "stop"
responses:         start, start-step, error, text-start, text-delta, text-end, ...             → finish "error"
```

`error` part 插在文本还没开始的位置。这不是"生成过程中出错"，是解析器在读到某一帧时就判定该帧不合规。

对应的帧结构问题在 relay 侧：本次抓取的 `/v1/responses` 完整帧类型序列里出现了 `output_text` 和 `message` 两个作为**事件 type** 的值；当前 AI SDK 将这批帧解析为非预期帧。相关字符串在标准 Responses 对象模型中分别对应 content part 与 output item 的 type，但本次文章不据此断言完整规范。

## 决定性对照：正确终止的回放同样报 error

把抓到的 2097 字节 `/v1/responses` 响应原样保存，改由本地 Python HTTP server 用 `Content-Length` 返回，完全不经 shim、不经上游，再交给同一个 AI SDK 客户端：

```
0.06 秒完成
finish: "error"
usage 完整
```

**传输变量被彻底消掉，结论不变。** 这条实验把 `finishReason: "error"` 与 chunked 终止、与本地代理、与网络延迟全部解耦。

相比之下，经 shim 打真上游的耗时在 2.45 秒到 36.93 秒之间波动（run1 7.75 秒、run2 2.45 秒），那纯粹是上游负载，与收尾状态判定无关。**遇到耗时波动时，不要把它当成故障强度的指标。**

## 同一 relay 换解析器就通

OMP 使用的 `@oh-my-pi/pi-ai` 18.1.10 在同一个 relay 的 `/v1/responses` 上正常处理完毕，进程退出码 0。

所以这是解析器策略差异，不是 relay 的帧"坏到不可用"：

- **AI SDK 在这批帧上插入 error part**：收尾状态被判错，尽管文本已经拿到。
- **pi-ai 在这批帧上正常处理完毕**：正常收尾。

面对同一个非标准上游，"哪个 harness 能用"取决于它的解析器策略，而不取决于这个 relay 的整体质量。

## OpenCode 的 `npm` 字段决定协议，且无法在运行时改

`providers.mdx` 对 `npm` 字段的规范：

> **npm**: AI SDK package to use, `@ai-sdk/openai-compatible` for OpenAI-compatible providers (for `/v1/chat/completions`). If your provider/model uses `/v1/responses`, use `@ai-sdk/openai`.

源码侧没有留活口：`BUNDLED_PROVIDERS` 把 `@ai-sdk/openai` 映射到 `m.createOpenAI`，而 openai 分支的 `getModel` **直接调用 `sdk.responses(modelID)`**，没有任何配置字段能改变这个调用。AI SDK 官方文档也确认 `openai(modelId)` 默认就走 Responses API。

**换协议的唯一入口是换 npm 包。** 同一份文档的 troubleshooting 一节还给了更细的粒度：

> For mixed setups under one provider, you can override per model via `provider.npm`.

也就是说一个 provider 下可以按 model 混用两种协议。

文档化的 openai-compatible 配置形态只需要四个键——`npm`、`name`、`options`、`models`，`options` 下没有 `name`：

```json
{ "provider": { "atomic-chat": {
  "npm": "@ai-sdk/openai-compatible",
  "name": "Atomic Chat (local)",
  "options": { "baseURL": "http://127.0.0.1:1337/v1" },
  "models": { "<id>": { "name": "<name>" } } } } }
```

## 两个 harness 的最终协议分配

| Harness | 协议 | 配置写法 | 理由 |
|---|---|---|---|
| OpenCode | `/v1/chat/completions` | `"npm": "@ai-sdk/openai-compatible"` | AI SDK 的 responses 解析器对该 relay 报 error |
| OMP | `/v1/responses` | `api: "openai-responses"` | pi-ai 的 responses 解析器能吃下这批帧 |

pi-ai 侧换协议同样只是改一个词——`src/api-registry.ts` 的 `BUILTIN_API_IDS` 列出七个合法值：`openai-completions`、`openai-responses`、`openai-codex-responses`、`anthropic-messages`、`google-generative-ai`、`google-gemini-cli`、`google-vertex`。

四个组合的真实二进制端到端结果：

```
opencode run --model motomoto-responses/gpt-5.5      exit 0, 22.54s
opencode run --model motomoto-responses/gpt-5.6-sol  exit 0, 53.11s
omp -p --model motomoto-responses/gpt-5.5            exit 0, 18.38s
omp -p --model motomoto-responses/gpt-5.6-sol        exit 0, 16.42s
```

两个 harness 都提供非交互入口，适合做这类矩阵验证：`opencode run --model provider/model "..."` 与 `omp -p --model provider/model "..."`。

## pi-ai 不补全 `/v1`

一个容易误判的配置陷阱：pi-ai 的 `baseUrl` 不会自动补 `/v1`。`openai-responses.ts` 第 489 行只做去尾斜杠，第 526 行直接拼 `/responses`；全仓库唯一的 `/v1` 补全函数 `normalizeSakanaRequestBaseUrl`（`openai-shared.ts` 第 187 至 196 行）只有 1 个调用点、仅 sakana 使用。

缺 `/v1` 时请求发往站点根路径，返回的是 HTTP 200 加 1204 字节 SPA HTML——**不是 404**。报错文字为 `OpenAI responses stream closed before a terminal response event was received`，每次约 1.4 秒，重试 4 次后 `stopReason: error`。**"流没有终止事件"这个错误信息会把人引向传输层，实际原因是请求打到了前端页面。** 判别方法是看响应的 `content-type` 是 `text/html` 还是 `text/event-stream`。

## 一个连带的命名债务

provider id 为 `motomoto-responses`、显示名为 `MotoMoto Responses`、model 显示名带 `(Responses)`，但换成 `@ai-sdk/openai-compatible` 之后 opencode 实际走的是 `/v1/chat/completions`。改 `name` 无副作用；改 provider id 会影响已有 session 里记录的 model 引用，因此保留原状。**协议名进 provider id 是可预见的债务来源——协议可能因为解析器兼容性而改变，id 不会跟着改。**

## See Also

- [Relay 的 chunked 流不终止：诊断与最小修复](relay-unterminated-chunked-stream.md) — 同一个 relay 的传输层问题，与本页的解析层问题相互独立
- [模型 capability 声明与 gateway wire 参数不一致](reasoning-capability-vs-wire-parameter.md) — 同一个 provider 配置里 capability 声明与实际 wire 行为的分离
- [开源 Harness 与托管推理不是一回事](../ai-coding-agents/open-harness-vs-hosted-inference.md) — 客户端、runtime 与 Provider 路由是不同层
