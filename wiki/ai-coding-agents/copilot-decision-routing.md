# Copilot 的决策路由端点与 Auto／HydraFusion 边界

> Sources: 本会话源码核查（copilot-api 代理、microsoft/vscode、@vscode/copilot-api@0.5.2）, 2026-10-25
> Raw: [copilot-decision-routing-endpoints](../../raw/ai-coding-agents/2026-10-25-copilot-decision-routing-endpoints.md)
> Updated: 2026-10-25

## Overview

Copilot 的决策能力分两层。对外：没有向用户开放 system-one 类型的决策接口，公开的对外 API 是管理类接口。对内：上游存在 `/auto`（每请求选模型）与 `/models/session/intent`（意图路由）这类固定题目端点，均需 Copilot token、schema 固定。Auto 与 HydraFusion 是两件事——前者每请求选一个模型，后者选执行工作流并在一轮内协调多个模型。

## 两层结构

| 层面 | 形态 | 证据 |
|---|---|---|
| 对外 API | 未找到任何公开文档或 changelog 表明 Copilot 向用户提供 system-one 类型决策接口 | 文档与源码检索 |
| 对内上游端点 | `POST /auto`、`POST /models/session/intent`，均需 Copilot token，题目固定 | 源码与包映射 |

`/auto` 的形状是文本进、有界 typed 选择出：返回选中的模型 ID 与会话令牌。**它只能回答「用哪个模型」，不能提交自定义题目**，因此属单一固定题目的决策接口，不是通用决策服务。

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

## 两处常见误读

**其一：`hydra_scores` 不等于 HydraFusion。** 该字段出现在探测脚本对 `POST /auto` 响应的读取逻辑里，而脚本把该路径标为 Auto V2。可以关联到 `/auto`／Auto V2，不能归给 HydraFusion，也不能据此推断 HydraFusion 在客户端侧运行。代理侧 `AutoSelectionResponse` 类型声明中本就不含该字段。

**其二：HydraFusion 的上游地址未公开。** 代理源码全仓 grep `hydra|fusion` 无任何请求路径，`@vscode/copilot-api@0.5.2` 的请求映射中也无该条目，公开文档未给出地址。**未公开、未确认**——既不能给出地址，也不能断定它没有独立端点。

## 证据边界

- 未实发 `/auto` 请求；`hydra_scores`、`discounted_costs`、`multi_turn_mode` 的实际返回未验证。
- 未实测 `/models/session/intent`。
- `tier` 与响应字段属未公开行为，可能变动。
- HydraFusion 的内部实现与上游调用方式未公开。

## See Also

- [OpenAI Decisions API：GA 状态、请求格式与 GitHub Copilot 后端探测](openai-decisions-api.md)
- [Jev 七渠道定价与 OMP systemone 兼容性判定](jev-omp-systemone-channel-compatibility.md)
