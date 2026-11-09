# OMP Shake 机制：外科式上下文裁剪

> Sources: OMP upstream source code（本地树 HEAD 73a11421fe，v18.2.11-58）；`@oh-my-pi/pi-coding-agent` 与 `@oh-my-pi/pi-ai` 18.18.3 源码；`copilot-api` 源码；OpenAI Reasoning 指南与 Responses API 参考
> Raw: [Compaction 阈值与 Shake 机制源码取证](../../raw/omp-config/2026-10-01-compaction-threshold-and-shake-mechanics.md); [OMP /shake thinking 保留提示与 Responses 原生重放取证](../../raw/omp-slash-commands/2026-11-09-omp-shake-thinking-and-responses-replay.md)
> Updated: 2026-11-09

## 结论

shake 不调用 LLM，按区域把重内容替换成占位符（`[shaken ~N tokens — recover: artifact://…]`，原文写入 artifact 可回收）。对话散文骨架完整保留；被裁的是 tool result 正文和消息文本里的大块代码/XML。

## 裁剪对象（collectShakeRegions）

1. **Tool result 正文**：整体替换为占位符。跳过：受保护工具（skill、skill read、artifact recovery 读取）、已 prune 的、`isError` 的。
2. **消息文本中的大块**：user / developer / assistant / custom 消息的 text 里，≥400 token（`fenceMinTokens`）的 fenced code block 与顶层 XML 段。块外文字原样不动。

边界：

- 最近 `protectTokens` 的上下文整体保护（自动档 16000、手动 `/shake` 档 4000、rescue 档 0）。
- `useless === true` 且非错误的 tool result 即使在保护窗内也照裁。
- `toolCall` 块永远不碰，call/result 配对保持完整；区域不跨消息边界。
- 最近一次 compaction boundary 之前的 entry 跳过（那些内容已被摘要取代）。
- XML 检测保守：只认小写标签名的顶层段，大写/混写忽略。
- 总节省估计低于 `minSavings`（自动档 4000）时整体 no-op。

## 三档预设

| 预设 | 用途 | protectTokens | minSavings | 保护工具 |
|---|---|---|---|---|
| DEFAULT | 自动 shake | 16000 | 4000 | skill、skill read、artifact recovery |
| AGGRESSIVE | 手动 `/shake` | 4000 | 0 | skill、skill read |
| RESCUE | 压缩死路自救 | 0 | 0 | 同 AGGRESSIVE + artifact recovery |

手动档保留 4000 尾部是为不撕掉 agent 正在用的 tool result（issue #7776）。

## 变体与对比

`/shake` 三种模式：elide（默认）/ images / thinking，均无 LLM 调用。

与 compact 对比：shake 按区域撕重内容、骨架（全部对话文字）留着；compact 把旧消息整体替换成 LLM 摘要，只留摘要加最近 `keepRecentTokens`（默认 20000）的原文。

`protectTokens: 16000` 与模型输出上限无关：该常量在 shake 引入提交（417a1a1d32，2026-05-31）中即为字面量，全仓库无从 `model.maxTokens` 派生的路径，提交记录未留取值理由。

## `/shake thinking` 的保留判定

v18.18.2 起，`thinking` 模式只删除请求会从 `content` 重建的那些轮次；请求会原生重放 `providerPayload` 的轮次保持原样，并单独计数。

汇总文案有三种形态，与 `ShakeResult` 的 `thinkingBlocksDropped`、`thinkingBlocksKept` 对应：

| 情况 | 文案 |
|---|---|
| 只删除 | `Dropped N thinking blocks from this session (~M tokens freed).` |
| 只保留 | `N thinking blocks were kept because removing them would not change what the model receives.` |
| 两者都有 | `Dropped ...; N thinking blocks were kept because ...` |

释放量后缀只在 `tokensFreed > 0` 时出现，因此只保留的运行永远不带该后缀。删除数为 0 时，TUI 把结果当作状态行输出，不重建聊天记录，也不改写会话条目。

自动上下文维护只调用 `elide`（`shake("elide")` 出现在 rescue 与自动压缩路径），`thinking` 模式只由手动命令触发。

### 判定分三层

1. `openAIResponsesReplaysNativeHistory(model, providerSessionState)` 读会话冷暖状态。只有 `openai-responses` 与 `openrouter` 两个 api 会查询状态；其余 api 直接返回 `true`（没有会话状态或 api 不符都按重放处理，这意味着 `/shake thinking` 对非 Responses api 不保留任何轮次）。
2. `replaysNativeResponsesHistory(message, model, { nativeHistoryReplay })` 先要求这一轮由同一个 api、同一个模型产生，再从 `providerPayload` 取 `openaiResponsesHistory` 载荷，并核对载荷里的 provider 与当前 provider 一致。载荷通过清理后仍有可重放条目，才算命中。
3. `replaysNativeResponsesTurn` 组合两步：暖会话直接命中；冷会话要求这一轮里没有字符串类型的 `id`、没有字符串类型的 `encrypted_content`（`null` 视为通过），且每个 `reasoning` 条目都带明文 `reasoning_text`。

这个函数是「唯一的重放决策」，请求构造、tokenizer 本地计数、上下文维护三处共用。请求构造器 `buildResponsesInput` 仍有两项自己的处理没有搬进该函数：补建被输出上限截断的工具调用，抑制清理后为空的轮次。因此判定函数描述的是分支条件，不等于整个构造流程。

### 会出现保留的模型

| api | 是否可能保留 | 依据 |
|---|---|---|
| `openai-responses` | 是，暖会话总是；冷会话看三条件 | 请求构造读取 `providerSessionState.nativeHistoryReplayWarmed`，成功响应后转暖 |
| `openai-codex-responses` | 是，有载荷就重放，没有冷热判断 | Codex 分支只按 `api` 与 `model` 匹配，命中即 `continue` |
| `openrouter` | 是，默认路由到 Responses | `PI_OPENROUTER_RESPONSES !== "0"` 时转入 `streamOpenAIResponses`；设为 `0` 改走 chat completions，不产生这种载荷 |
| `azure-openai-responses` | 否 | 请求端设 `nativeHistory: { replay: true }`，但该文件不写 `providerPayload`，没有可重放载荷 |
| 其他 api | 否 | 不产生 `openaiResponsesHistory` 载荷 |

### 冷会话的例外

两类宿主在首个请求前处于冷态：声明 `connectionBoundNativeHistory` 的宿主（目录里 `github-copilot` 为 `true`），以及任意宿主在 `close()` 之后到下一次成功响应之前。冷态下判定改为按三条件筛选，未通过的轮次回落到 `content` 重建，那些轮次的 thinking 块照常删除。原因写在判定函数注释里：部分后端把原生条目绑定到单条连接，GitHub Copilot 曾返回 `401 input item does not belong to this connection`。

### 保留的原因

这几轮请求本来就从 `providerPayload` 构造推理条目，`content` 里的 thinking 块不上线路。删掉它省不到线上 token，还会让 provider 的 prompt cache 前缀失配。这些块的 token 已经计费，删掉也不退。计数时用 `excludeEncryptedReasoning: true`，避免把加密推理算进释放量。

## OpenAI `reasoning` 条目与 OMP 本地 `thinking` 块

两者都描述模型的推理过程，数据表示不同。

OpenAI 文档里没有 `thinking` 这个条目类型。Responses API 返回 `type: "reasoning"` 条目，内含三类字段：`summary` 是推理摘要，`content`（可选）里是 `reasoning_text`，`encrypted_content` 是加密版 reasoning tokens。官方说明 reasoning tokens 不可通过 API 看到，但仍占用上下文窗口并按 output tokens 计费。`encrypted_content` 在无状态模式下（`store: false` 或 ZDR）默认返回，回传时服务端在内存里解密、用于生成下一轮、随后销毁。

OMP 把这一条拆成两份存放：`content` 里生成 `type: "thinking"` 块，文本取自 `summary`，没有摘要时取 `content[0].reasoning_text`，并把整个原生条目的 JSON 写进 `thinkingSignature`；`providerPayload` 里保存清理后的原生条目，保留 `id`、`summary`、`content`、`encrypted_content`。

因此删除 `content` 里的 thinking 块不会碰到原生条目里的密文，两者不是同一份数据。

## 与 copilot-api 条件剥除重试的边界

`copilot-api` 面对同一个上游错误，但位置在代理转发层，改写对象是请求 `input`。

首发原样转发。收到 `400 <= status < 500` 且 `error.message` 含 `belong`、同时请求里存在带 `encrypted_content` 的 `reasoning` 条目时，把每个 `reasoning` 条目改写为只保留 `id`、`type`、`summary`，重试一次，并按会话身份（identity、model、url、Authorization 散列、session token 散列）记入上限 1024 条的学习缓存。同会话后续请求在首发前就剥除。

两侧的因果是两个方向：

- OMP 保留本地 thinking 块这个动作不改变发往代理的请求。请求由 `providerPayload` 构造，`/shake thinking` 从不修改该字段。把同一轮的本地 thinking 强行删掉，发出的请求仍然一样，代理触发重试的条件也不变。
- 只有某轮不走原生重放、改由 `content` 重建时，删掉 thinking 块（连同其中的 `thinkingSignature`）才会改变实际请求，那一轮不再携带 `reasoning` 条目。

代理侧是否真的重试，取决于上游是否返回带 `belong` 的 4xx，与本地的保留或删除没有因果关系。

## See Also

- [OMP 内置 slash 命令全量枚举](builtin-slash-commands.md) — /shake 行与十问补遗
- [OMP Compaction 阈值解析机制](../omp-config/compaction-threshold.md) — 何时触发自动压缩
- [OMP Advisor 上下文标记](../omp-config/advisor-context-markers.md) — advisor 侧 shaken 占位符与 evictStaleResults 的区别
