# OMP Provider 配置说法核查与离线运行取证

> Source URL: 本机安装包 `@oh-my-pi/pi-coding-agent` 18.16.0；六路只读核查报告；主代理在同一会话内运行 OMP/pi 侧实际函数
> Collected: 2026-11-04
> Published: Unknown

## 取证范围

本次只保存本会话后续核查中的源码结论、离线执行结果和证据边界。所有真实网络 API 数字均来自 2026-11-03 的既有探针 raw；本轮没有发起新的模型请求，也没有验证 8787 的实际转发、缓存寿命和模型回复效果。

## 模型解析与 Responses 请求构造

使用 `resolveModelPolicy` 解析 `~/.omp/agent/models.yml` 中 12 个 8787 模型，并调用已安装包的 `buildModel` 与 `buildParams`。结果：

- 12 个模型全部解析为 8787 provider 的模型。
- 全部模型按 `tools.format: auto` 选择原生工具调用。
- 没有 provider 设置 `promptCache` 寿命元数据。
- `c8787` 的 `gpt-6-luna` 使用 Responses 通道构造请求：
  - `text.verbosity` 为 `"medium"`，来源是 `textVerbosity: medium` 和模型级 `compat.officialEndpoint: true`。
  - `store` 为 `false`，来源是模型级 `compat.statefulResponses: false`。
  - `prompt_cache_key` 正常生成，取值来自请求提供的 `promptCacheKey` 或 `sessionId`。
- 分别用 `compat.officialEndpoint` 为 true 与 false 构造同一个 Responses 请求：前者有 `text.verbosity`，后者没有；两者生成的 `prompt_cache_key` 相同。
- 因此 `officialEndpoint` 不生成 cache key。cache key 路由由 `promptCacheKey ?? sessionId` 决定，这与 `raw/omp-config/2026-09-14-omp-dynamic-session-identity-sticky-routing.md` 中 `promptCacheKey ?? sessionId`、Responses 无条件写入的结论一致。
- 本轮只验证 OMP 出站请求的字段，没有拦截 8787 到上游的请求，也没有验证模型是否遵守 verbosity。

## stateful Responses、服务端存储与 prompt cache

- `compat.statefulResponses: false` 会关闭 `previous_response_id` 请求串联；本轮构造结果是 `store: false`。
- 该设置单独不保证服务端不存储响应，也不等于 prompt cache 开关。服务端存储资格另有前置检查，请求连续还需 session 标识与本地请求状态。
- `officialEndpoint: true` 覆盖思考标记修复流后，上游把 reasoning 标记混入正文的情况由 OMP 侧不再修复。上游直接返回结构化 reasoning 时不属于该修复范围。
- `officialEndpoint` 还与图片预算门相关。当前 c8787 GPT 模型声明为 text-only；部分图片流程仍有通用默认预算，未逐条穷举 OpenAI 之外所有 provider 的预算实现。

## CacheWarmer 离线调度结果

运行 `CacheWarmer.start()`，输入是实际解析的 OMP 配置，没有调用网络：

| 模型寿命声明 | agent 运行期间 | agent 空闲后 |
|---|---|---|
| 无 TTL | inactive，`cache lifetime unavailable` | inactive |
| short 300 秒 | active，可安排刷新 | active，可继续安排 |
| long 3600 秒 | active，可安排刷新 | idle 停止 |
| long 86400 秒 | inactive，`one-hour safety limit reached` | inactive |

结论：

- 当前 8787 模型无 TTL 元数据，warming 不调度。
- 固定 86400 秒寿命在首次调度阶段就会触发一小时安全窗口并停止；它不能作为启用 8787 warming 的方法。
- `streaming` 安全窗不小于 60 分钟，`idle` 不小于 30 分钟。`streaming` 长工具执行期间的调度细节未在本次复核范围内完成。
- 刷新请求把输出预算设为一个 token，不保证模型恰好生成一个可见 token。

## 工具说明路径

- `tools.format: auto` 在模型未标为 `supportsTools: false` 时选择原生调用；未知模型等情况才回退 GLM，所以文本回退不只 GLM 一种。
- 原生调用并正常生成 system prompt 时，工具说明在 prompt 中；provider schema 顶层与嵌套 description 被清理，`required`、`enum`、类型保留。
- 固定 `systemPrompt` 的调用者可能跳过默认工具目录生成，但仍然清理原生 schema 描述；这种用法需要调用者自行保证提示中说明完整。
- 文本工具方言不发送原生 `tools` 数组。正常 system prompt 的工具目录与额外的文本方言目录可能同时存在。
- 本轮只验证信息位置和格式，没有测量 token 节省或工具调用准确率。

## task.file

- 派发时读取 `taskFile`，校验绝对路径或 `local://`、常规文件、UTF-8、非空、不超过 4 MiB，并计算原始字节的 SHA-256。
- 审批详情只显示路径，没有固定文件内容。审批后文件变化，执行可能读取变化后的内容。
- 父侧历史仍可能保存完整任务文本，例如 task/session details 或此前 `write` 的内容，因此不能承诺父历史只有路径或零 token 成本。
- `taskFile` 不参加参数仍在生成期间的提前启动，会等待完整派发。
- 子代理的任务输入是文件正文；OMP 不额外把 `taskFile` 元数据作为任务输入传入。

## 普通插话与 live steering

- 普通插话队列不只在工具执行边界处理；agent-loop 也会在响应结束等边界读取队列。
- 一次 agent 工作可以包含多次模型响应与工具执行，不应与一次模型 response 混称。
- 当前 c8787 是普通 Responses 通道，没有 Codex WebSocket；GPT-6 模型名不能提供 steering。
- `openai-codex` 配置为 `gpt-5.6-luna` 且模型级 `preferWebsockets: false`；live steering 开关未显式开启。
- 一般 steering 失败可以只结束当前 response 的 steering；只有特定错误才会暂时标记相关 lane 不支持。
- `response.steer` 的实际发送位置是 `openai-codex-responses.ts:4311`。

## 8787 既有 API 证据边界

2026-11-03 的 Responses 探针覆盖 12 个模型，7 个成功：6 个 GPT 返回 `prompt_cache_retention: "24h"`，`mai-code-1.1-flash` 返回 `"in_memory"`；两个 Gemini 返回 502，三个 embedding 返回 400。

- 该字段只能确认来自 8787 响应 body，无法确认由网关添加还是上游透传。
- 双请求的输入为 4856 token；第一次 `cache_write_tokens` 为 4853、`cached_tokens` 为 0，第二次 `cache_write_tokens` 为 0、`cached_tokens` 为 4853。这些是服务端 usage 报告，没有取得实际折扣账单。
- 小输入未命中只记录为与最小前缀门槛一致，没有验证该门槛是原因。
- 直接探针没有携带 OMP 的 `cacheRetention` 设置，不能用它证明 OMP 配置产生了效果。
- Gemini 的 502 只说明当次请求失败；永久可用性未验证。
- dummy bearer 请求成功只覆盖当次请求，不推广为整个网关不检查鉴权。

## 本轮配置结论

保留以下当前值：`inlineToolDescriptors: "on"`、`textVerbosity: medium`、`task.file: true`、`tools.format: auto`、`providers.cacheRetention: long`、`providers.cacheWarming: idle`、`c8787.compat.officialEndpoint: true`、`c8787.compat.statefulResponses: false`。`c8787-chat` 与 `openai-codex` 不改。

不要为 8787 添加猜测的 `promptCache.long: 86400`。不要仅为了 verbosity 把 Gemini 迁到 Responses；两个 Gemini 在 Responses 通道的两次请求均返回 502。

## 验证边界

- 本轮没有验证 8787 是否转发 `text.verbosity`。
- 本轮没有验证缓存真实寿命、服务端存储行为和实际计费折扣。
- 本轮没有测量 verbosity、内联工具说明或 warming 对模型输出质量的影响。
- 全量 `tools/wiki-check/check_evidence.py` 只检查引用与文字匹配，不判断机制解释是否正确。
