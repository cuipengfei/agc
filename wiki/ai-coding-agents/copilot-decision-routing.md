# Copilot 的决策路由端点与 Auto／HydraFusion 边界

> Sources: 本会话源码核查（copilot-api 代理、microsoft/vscode、@vscode/copilot-api@0.5.2）, 2026-10-25; Copilot 上游目录与 `/v1/decisions` 实测, 2026-11-09; GitHub Docs《About GitHub Copilot Fusion》与 2026-10-28 changelog, 2026-11-10; 本机网关扣费核验, 2026-11-11; 上游 `/auto` 与 `/model/fusion` 端点实测, 2026-11-14
> Raw: [copilot-decision-routing-endpoints](../../raw/ai-coding-agents/2026-10-25-copilot-decision-routing-endpoints.md); [copilot-decisions-live-verification-1109](../../raw/ai-coding-agents/2026-11-09-copilot-decisions-live-verification.md); [gpt-6-luna-decisions-copilot-history](../../raw/ai-coding-agents/2026-11-09-gpt-6-luna-decisions-copilot-history.md); [copilot-fusion-ga-effort-levels](../../raw/ai-coding-agents/2026-10-28-copilot-fusion-ga-effort-levels.md); [copilot-fusion-discount-live-verification](../../raw/ai-coding-agents/2026-11-11-copilot-fusion-discount-live-verification.md); [copilot-auto-fusion-behavior](../../raw/ai-coding-agents/2026-11-14-copilot-auto-fusion-behavior.md)
> Updated: 2026-11-14

## Overview

Copilot 的决策能力分两层。产品面对外：没有向用户开放 system-one 类型的决策接口，公开的对外 API 是管理类接口。上游对内：`/auto`（每请求选模型）、`/models/session/intent`（意图路由）这类固定题目端点需 Copilot token；2026-11-09 起，同一上游的 `/v1/decisions` 可用专用条目 `gpt-6-luna-decisions` 调用并返回结构化答案，该条目不进模型选择器，因此产品界面仍无入口。

## 两层结构

| 层面 | 形态 | 证据 |
|---|---|---|
| 对外 API | 未找到任何公开文档或 changelog 表明 Copilot 向用户提供 system-one 类型决策接口 | 文档与源码检索 |
| 对内上游端点 | `POST /auto`、`POST /models/session/intent`，均需 Copilot token，题目固定 | 源码与包映射 |
| 上游 API（2026-11-09 实测可用） | `POST /v1/decisions`，需 Copilot token 与专用模型 ID `gpt-6-luna-decisions`，题目由调用方提供 | 上游实测返回 200 |

`/auto` 的形状是文本进、有界 typed 选择出：返回选中的模型 ID 与会话令牌。**它只能回答「用哪个模型」，不能提交自定义题目**，因此属单一固定题目的决策接口，不是通用决策服务。

关于 `/v1/decisions`：它是上游模型目录里的一条专用条目，`model_picker_enabled` 为 `false`，与 `/auto`、`/models/session/intent` 同属需要 Copilot token 的上游能力，区别在于题目由调用方提供、答案带概率或置信度。**API 已实测可调用，产品界面仍无入口**，两者是两件事。详见 [同一模型名跨两个协议面时的模型 ID 分叉](copilot-decisions-model-identity.md) 与 [OpenAI Decisions API 的后端探测](openai-decisions-api.md)。

## `/auto` 端点

上游基址规则（代理源码 `api-config.ts`）：`https://api[.<account-type>].githubcopilot.com`，individual 账号为 `https://api.githubcopilot.com`。拼接后路径为 `/auto`。

- 方法：`POST`
- 请求体：`{ prompt, tier }`
- 响应类型：`selected_model`（含 `id`、`supported_endpoints`）、`session_token`、`expires_at`、可选 `discounted_costs`

### tier 取值

`POST /auto` 接受的档位为 `efficiency`、`balance`、`intelligence`、`fast`。模型选择器只提供前三者，`fast` 是行内聊天在用户未选档位时的默认值，保留给内部使用。默认档位是 `balance`。旧名 `eco`、`balanced`、`max` 仍被 `POST /auto` 接受，由 agent runtime 在读取时映射到新名。

### 证据层级

三条证据的强度不同，需要分开读：

| 证据 | 能证明什么 |
|---|---|
| 代理源码的 `/auto` 调用实现 | 该端点存在，且至少有一个第三方客户端按此形状实际发起请求 |
| VS Code `autoModeTiers.ts` 的注释「Routing profiles accepted by `POST /auto`」 | 端点接受这四个档位 |
| VS Code 主仓库开源部分 | **未见到**实际发起该请求的调用代码，不能据此断言当前官方客户端会调用 |

`hydra_scores` 同样只出现在探测脚本对响应的读取逻辑里，代理侧的 `AutoSelectionResponse` 类型声明中并无该字段，不能当作源码定义的响应保证。

### `session_token` 是折扣凭证

`/auto` 与 `/model/fusion` 返回的 `session_token` 是折扣凭证，带 `expires_at`。把它放进后续 `/responses` 请求的 `Copilot-Session-Token` 头里，该请求按对应折扣计费。`/auto` 对应 10%，`/model/fusion` 对应 30%。

token 过期后重新发送原来的完整题面即可取得新 token。题面文本需要保存下来以便日后重放，历史记录本身不构成有效凭证。

请求体没有可以指定具体模型的字段。同一个题面在不同日期可能返回不同模型，两个端点的候选池也可能不一致。

### 折扣是否真正入账的核对方法

同模型、同输入，分别携带与不携带 `Copilot-Session-Token` 各发一次 `/responses` 请求。

比较两次响应 `copilot_usage.token_details` 中每种 token 类型的 `cost_per_batch / batch_size`。只有全部 token 类型都呈现一致比例时才能确认整体折扣率。

不能用 `total_nano_aiu` 直接相除。两次请求的 token 数量与缓存命中情况不同，总量比值会把 token 数差异混进折扣计算。

长上下文档的起点由模型目录条目的 `billing.token_prices.default.context_max` 决定，按模型取值。已观察到 128,000、200,000、224,000、272,000 四档，部分模型没有 `long_context` 档。存在该档时输入与缓存基础价 2 倍、输出基础价 1.5 倍。折扣按同档原价计算，所以核对前要先算该模型的价格档起点，30% 折扣在长上下文档上表现为普通档原价的输入 1.4 倍、输出 1.05 倍。

## 另一个路由端点

`@vscode/copilot-api@0.5.2` 的 `RequestType` 含 `ModelRouter`，URL 映射为 `/models/session/intent`；请求为 prompt 加候选模型与上下文信号，响应含 `predicted_label`、`candidate_models`、`scores`。

证据来源需限定：该调用实现见于已归档的 `microsoft/vscode-copilot-chat` 仓库，加上当前 npm 包的 URL 映射；当前 VS Code 主仓库开源部分未见到实际调用代码。因此这应记为「旧客户端与包中记录的路由接口」，不能当作当前官方客户端的调用证据。

## Auto 与 HydraFusion 的区别

GitHub changelog（2026-09-30）原文：

> "Auto selects a model for each request. HydraFusion explores how Copilot can both select a workflow and coordinate multiple models within a turn."

| 维度 | Auto | HydraFusion |
|---|---|---|
| 决策单位 | 每个请求选一个模型 | 每个任务选一种执行模式（Single / Cascade / Critique），一轮内协调多个模型 |
| 判断依据 | 任务复杂度 + 实时模型健康 + tier 档位 | 四个能力信号：reasoning、code generation、debugging、tool use |
| 用户可见形式 | 模型选择器里的 Auto | 模型选择器里的 HydraFusion 条目 |
| 状态 | GA | research preview |

两者都服务 Copilot 自身的生成流程，用户只能把它选作模型，不能向它提交自定义问题或 schema。HydraFusion 的范围宽于 Auto 的单模型选择。

> **Status: Outdated** (2026-11-10)
> 上表「用户可见形式」与「状态」两行已被 2026-10-28 的正式可用取代：HydraFusion 以 research preview 形式出现在模型选择器的阶段结束，现在的产品面名称是 Copilot Fusion，且 Fusion 合并了 Project HydraFusion 的多模型编排与 Auto 的模型选择。决策单位与执行模式的划分仍然成立。详见 [Copilot Fusion：effort 档位、按计划可用性与计费](copilot-fusion.md)。

**2026-11-09 修订**：上表「对外 API」一行仍成立（产品界面没有决策入口），但要补一句限定——上游 `/v1/decisions` 已可用，只是绑定在不对模型选择器开放的专用条目上。

## 两处常见误读

**其一：`hydra_scores` 不等于 HydraFusion。** 该字段出现在探测脚本对 `POST /auto` 响应的读取逻辑里，而脚本把该路径标为 Auto V2。可以关联到 `/auto`／Auto V2，不能归给 HydraFusion，也不能据此推断 HydraFusion 在客户端侧运行。代理侧 `AutoSelectionResponse` 类型声明中本就不含该字段。

**其二：HydraFusion 的上游地址仍未公开。** 代理源码全仓检索 `hydra|fusion` 无任何请求路径，`@vscode/copilot-api@0.5.2` 的请求映射中也无该条目，公开文档未给出地址。**未公开、未确认**——既不能给出地址，也不能断言它没有独立端点。

产品面对外更名后，该结论的适用范围是「Fusion 的上游调用路径仍未公开」：GA 文档只写了路由与编排行为，没有给出端点地址。

> **Status: Outdated** (2026-11-14)
> 「Fusion 的上游调用路径仍未公开」已被实测取代：`POST /model/fusion` 可用，请求体为 `{prompt, plan_version}`，`"1"` 返回带 `model_id` 与 `role` 的有序 `steps`，`"2"` 返回单步 solo，响应含 `session_token` 与 `expires_at`。旧结论的依据是当时检索的代理源码与 npm 包映射未含该路径，属检索范围不足。内部编排实现仍未公开。

## 证据边界

- `hydra_scores`、`multi_turn_mode`、`discounted_costs` 的实际返回已对上游实测（raw/ai-coding-agents/2026-11-10-auto-routing-response-probe.md）；`discounted_costs` 的 10% 折扣另经 2026-11-11 扣费核验一致。
- 未实测 `/models/session/intent`。
- `tier` 与响应字段属未公开行为，可能变动。
- HydraFusion 的内部编排实现仍未公开；`POST /model/fusion` 端点本身已实测（2026-11-14）。

## See Also

- [OpenAI Decisions API：GA 状态、请求格式与 GitHub Copilot 后端探测](openai-decisions-api.md)
- [Jev 七渠道定价与 OMP systemone 兼容性判定](jev-omp-systemone-channel-compatibility.md)
- [Copilot Fusion：effort 档位、按计划可用性与计费](copilot-fusion.md)
