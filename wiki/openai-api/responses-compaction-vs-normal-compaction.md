# OpenAI Responses API Remote Compaction 与客户端 Normal Compaction 对比

> Sources: OpenAI Compaction Guide & API Reference, 2026-10-24; OpenAI Engineering Blog, 2026-10-24; openai/codex (`de06fd0be4f465bc28c3111bdadaabda5dfdebcd`), 2026-10-24; NousResearch/hermes-agent #33130, 2026-07; openai/codex #24618, 2026-06-29; Kangwook Lee, 2026-03-13
> Raw: [OpenAI Responses API Compaction 官方指南、Codex 源码与社区取舍摘录](../../raw/openai-api/2026-10-24-responses-compaction-docs-and-community.md)
> Updated: 2026-10-24

## Overview

OpenAI Responses API 的原生压缩（`remote compact`）将长对话压缩为包含 `encrypted_content` 的加密不透明 `compaction` 项，区别于客户端发总结提示词生成可读明文的 `normal compact`。两者共有缩短后续请求、保留本地完整记录与支持客户端自持状态的能力；`remote compact` 的核心增量价值在于延续模型专门训练的先验/加密推理状态以及支持单次流式请求内自动压缩，代价则是人类与 UI 不可读、以及严格的模型与供应商绑定。在生态应用上，支持 Responses 压缩的模型与路由可走 `remote compact`（例如官方 Codex CLI 对 Codex 模型走远端加密压缩，对非 Codex 模型走本地 `normal compact`）；跨模型第三方 Agent 则分化为只用 `normal compact`（如 Hermes 通用聊天路由），或采用优先尝试 `remote` 并以本地明文压缩回退的双轨设计（如 OMP、OpenCode）。

## 核心名词定义

全文固定使用以下四个名称区分机制与存储边界：

- **`normal compact`（客户端文字摘要）**：客户端把旧对话发给模型，用总结提示词生成一段**人类可读的明文文字摘要**，后续用这段明文摘要替换旧对话。
- **`remote compact`（OpenAI 原生加密压缩）**：OpenAI Responses API 提供的原生压缩能力。服务器将旧对话压缩为一段**加密、人类不可读的压缩数据块**（`type: "compaction"`，内含 `encrypted_content`）及必要的保留消息，后续由同一模型直接读取接续。
- **本地完整记录（UI Transcript）**：保存在客户端本地磁盘上的完整聊天历史，供人类滚动查看、搜索与审查。
- **本轮发送历史（Active Context）**：客户端在下一轮请求中，实际放进网络请求交由模型处理并计费的上下文窗口。

## 三条固定方案路径（不可任意混搭）

“采用哪种压缩方式”与“下一轮历史由谁保管并传递”并非任意正交组合，在 Responses API 下只有以下 **3 条固定路径**：

| 方案路径 | 谁决定何时压缩 | 产出的压缩结果 | 保存位置与下一轮传递方式 |
|---|---|---|---|
| **1. `normal compact`**（客户端文字摘要） | **客户端** | 人类可读的**明文文字摘要** | **只由客户端保存并重发**：客户端保存明文摘要，可自由查看或编辑，下一轮放进「本轮发送历史」发给服务器。 |
| **2. `remote compact` 方式 A**（独立压缩接口 `POST /v1/responses/compact`） | **客户端**（前提是输入仍能装进单次上下文窗口） | `object: "response.compaction"`（含**保留的部分原始消息 ＋ 加密压缩数据块**） | **只由客户端保存并重发**（接口完全无状态，兼容 ZDR）：服务器不保存结果；客户端必须把**整份返回窗口原样作为下一轮 `/v1/responses` 的 `input`**，禁止客户端自行裁剪返回项。 |
| **3. `remote compact` 方式 B**（普通 `POST /v1/responses` 开启 `context_management`） | **服务器**（当渲染后 token 数跨过客户端传入的 `compact_threshold` 时） | **加密压缩数据块**（在同一次流式响应中先吐出 `compaction` 项，再继续生成本轮回答） | **有两种接续方式可选（二选一）**：<br>① **B1 客户端自己存并重发**（设 `store=false` 时服务器不存，客户端丢弃最新 `compaction` 项之前的旧历史，下一轮重发最新加密块＋回答＋新消息）；<br>② **B2 服务器存记录、客户端只传 `previous_response_id`**（服务器保存记录，客户端下一轮只传上一轮 ID＋新消息，由服务器管理历史，客户端不手动裁剪）。 |

*(注：除上述公开 API 路径外，`openai/codex` 源码内部还实现了 `RemoteCompactionSupport::V2`，通过在普通 `/responses` 流末尾追加 `{"type": "compaction_trigger"}` 触发流式检查点压缩，并由客户端按 `64_000` tokens 预算保留近期真实用户消息与末尾 1 个加密 `compaction` 项。)*

## 触发频率与门槛

OpenAI 服务端**没有面向所有 GPT 模型的固定自动压缩频率或默认门槛**：

- **`normal compact` 与 `remote compact` 方式 A**：完全由客户端代码决定何时调用。以官方 `openai/codex` 源码（`de06fd0be4f465bc28c3111bdadaabda5dfdebcd`）为例：
  - `effective_context_window_percent` 默认为 `95`（预留 5%）。
  - 硬触发阈值 `auto_compact_token_limit` 默认设为模型 `context_window` 的 **90%**（例如 `400,000` 窗口对应 `360,000` tokens；`272,000` 窗口对应 `244,800` tokens）。
  - 后台异步预压缩阈值 `DEFAULT_ASYNC_COMPACTION_THRESHOLD_PERCENT` 默认为 **65%**（达到 65% 时后台静默预生成候选 checkpoint，到 90% 硬阈值时直接切换安装）。
- **`remote compact` 方式 B**：由请求中显式传入的 `compact_threshold` 整数决定（官方文档示例值为 `200000` tokens）。

## 为什么「本地完整记录」保留全文仍能省 Token？

无论使用 `normal compact` 还是 `remote compact`（方式 A、B1、B2），省 Token 的原因完全相同：**OpenAI 只按每一轮实际进入模型处理的上下文计费，不按客户端硬盘上的「本地完整记录」计费**。

- **本地完整记录（UI Transcript）**：保留全部历史对话、代码与长工具日志，仅用于本地界面展示，不进入后续 HTTP 请求体。
- **本轮发送历史（Active Context）**：压缩发生时消耗一次输入与输出 token（例如官方 API Reference 示例中 `input_tokens: 42897`、`output_tokens: 12000`、`total_tokens: 54897`；Hermes 生产用户实测将 `354,425` tokens 的 `218` 条消息压缩后，下一轮降为 `59,713` input tokens）。此后每一轮请求仅携带浓缩后的结果与新增消息。
- **计费边界**：OpenAI Conversation State 指南明确规定，若仅使用 `previous_response_id` 串联对话而**未发生压缩**，链上所有历史输入 token 在每一轮仍会照常作为输入 token 计费。

## 共有能力 vs 真正增量差异与代价

两边**共有的能力**（不能作为二选一的依据）：都能缩短后续输入、腾出窗口继续长任务、在本地保留完整可读原文、以及在服务器不长期存会话时由客户端保存并回传压缩结果。

在同一套条件下，`remote compact` 相比 `normal compact` 的**真实差别**如下：

| 比较维度 | `remote compact` 相比 `normal compact` 的差异 | 适用条件与代价 |
|---|---|---|
| **1. 模型状态与加密推理链延续** | OpenAI 工程博客说明模型经专门训练分析先验状态并生成加密表征（官方称提示词文本总结为其“较弱版本”）；在 OpenAI 推理模型上可保留并消化 encrypted reasoning 状态（本地 `normal compact` 会丢弃加密推理项）。 | **适用**：持续数小时、多轮调用工具或重度依赖推理状态的长任务。<br>**边界**：Kangwook Lee（2026-03-13）黑盒观测发现，在极简纯文本输入（预算 `$234,500`）下，`responses.compact()` 内部同样调用 LLM 生成明文总结再用 Fernet（`gAAAAAB...` 前缀）加密，且提取出的压缩提示词与交接提示词同开源 Codex CLI 模板（`prompt.md`、`summary_prefix.md`）几乎一致；复杂工具状态在加密块中是否有额外恢复机制仍属未验证的开放问题。 |
| **2. 单次请求流内自动压缩（仅限方式 B）** | 服务器可在一次请求流内部跨过门槛时当场压缩并继续推理，无需等待服务器交还控制权后再由客户端单独发起一次总结请求。 | **适用**：服务器在单次请求内连续执行托管工具循环的场景。若工具循环本就由客户端逐轮在本地调度，此项差距缩小。 |
| **3. 可读性与人工干预（代价）** | `encrypted_content` 对人类与客户端 UI 完全黑盒，无法像 `normal compact` 明文摘要那样直接阅读、用于 `/recap` 或手动修改错误假设。 | 需要审查摘要、在 WebUI 展示 `/recap` 或由下游记忆模块消费摘要文本时，纯 `remote compact` 无法满足。 |
| **4. 供应商与模型锁死（代价）** | 加密块只能由原 OpenAI 路由解密；会话中途切换 `/model` 或触发跨厂商故障转移（failover）会导致压缩前缀全部失效。 | 此外，独立端点 `POST /responses/compact` 在 `openai/codex` Issue `#24618` 中曾出现挂起 `30-60` 分钟或 `HTTP 504` 的问题，OpenAI 工程师于 2026-06-29 确认 Codex 已改为复用普通对话同通道执行压缩。 |

## 生态落地格局：谁单用 `remote compact`，谁用 `normal compact`？

1. **官方 Codex CLI（按模型能力分流）**：
   - 对支持 Responses 压缩的 Codex 模型路由走远端加密 `remote compact`；对非 Codex 模型或不支持远端压缩的路由，则走本地 `normal compact`（使用仓库内公开的 `prompt.md` 与 `summary_prefix.md` 模板）。
2. **跨模型通用 Agent 框架（拒绝默认替换，或采用双轨回退）**：
   - **纯 `normal compact` 路线（NousResearch `hermes-agent` Issue `#33130`）**：维护者在通用 `codex_responses` 聊天路由上拒绝默认切到 OpenAI Compaction API，理由正是跨模型切换丢失历史前缀与 `/recap` 乱码；社区贡献者则提议做成可选的 `plaintext shadow summary` 加 `disposable, provider-stamped projection` 双轨模式。
   - **双轨回退路线（OMP `oh-my-pi` 与 `opencode`）**：OMP 默认 `compaction.methodOrder` 为 `["remote", "snapcompact", "handoff", "shake", "soft"]`——当前处于支持 Responses 压缩的模型时优先尝试 `remote`（先 V2 streaming，再 V1 `/responses/compact`），同时在本地保留完整原始消息；一旦模型不支持或切换，自动按序回退到本地明文压缩。

## See Also

- [Responses API WebSocket 模式](responses-websocket-mode.md) — Responses API 的持久化连接与 `previous_response_id` 内存缓存续接
- [OMP Compaction Methods & History URI Tool Support](../omp-config/compaction-methods-and-history-uri.md) — OMP 客户端的五级压缩回退链与 `history://current/full` 恢复机制
