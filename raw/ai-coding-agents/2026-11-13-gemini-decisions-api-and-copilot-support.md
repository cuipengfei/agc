# Gemini Decisions API 身份与 GitHub Copilot 后端支持实测（2026-11-13）

> Source: Google 官方 Decisions API 规范与模型页（https://aistudio.google.com/docs/decisions-api、https://aistudio.google.com/docs/models/gemini-decision-1）；Google 官方发布公告（https://blog.google/innovation-and-ai/technology/developers-tools/gemini-decisions-api/）；OpenRouter 模型页与 Decisions 文档（https://openrouter.ai/google/gemini-decision-1、https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request.md）；GitHub Copilot 上游 `GET /models` 与 `POST /v1/decisions` 实测（本机 4143 business 实例认证链）；`gh search code` 与 `gh search issues` 全局检索结果；can1357/oh-my-pi PR #19060 与 davila7/claude-code-templates issue #1529 / PR #1530
> Collected: 2026-11-13
> Published: 2026-11-11（Gemini Decisions API 发布日）

证据分级：**实测**＝本会话实际发出的请求或实际执行的命令；**文档原文**＝官方文档逐字；**检索**＝`gh search` 返回的公开仓库内容；**推断**＝由证据推得但未直接证实。

本 raw 不含认证 token、账号标识与完整响应头，数值字段按实测输出抄录。

## ① Gemini Decisions API 是 Google 原生端点（文档原文 + 检索）

Google 官方规范给出的端点为 `POST https://generativelanguage.googleapis.com/v1beta/decisions`，模型 ID 为 `gemini-decision-1`。官方公告日期为 2026-11-11，称其为 Gemini API 的新 endpoint。

关键形态：

| 项 | 值 |
|---|---|
| 端点 | `POST https://generativelanguage.googleapis.com/v1beta/decisions` |
| 模型 | `gemini-decision-1` |
| 认证 | `x-goog-api-key: $GEMINI_API_KEY` |
| 请求 envelope | `model`、`input`、`questions` |
| `questions` 形态 | 以问题 ID 为键的**对象 map**，不是数组 |
| 题型 | `noul`（是/否）、`choice`（选项）、`score`（有序评分） |
| 响应 | `answers` 按问题 ID 组织；`noul` 返回概率与 confidence |
| 输入上限 | 262,144 tokens |
| 输出 tokens | 0 |
| 单请求题目上限 | 1,000 |
| 多模态 | 文本、图片、视频、音频、PDF |

## ② OpenRouter 是独立的第二条实现（文档原文）

OpenRouter 的决策路由为 `POST https://openrouter.ai/api/alpha/decisions`，模型别名 `google/gemini-decision-1`，provider 标注为 Google AI Studio。

报文与 Google 原生不同：顶层用 `model`、`state`、`questions`。`state` 对应 Google 原生的 `input`，两者名称与语义都不可混用。

## ③ GitHub Copilot 上游不支持 Gemini Decisions（实测，2026-11-13）

认证方式与 2026-11-09 的 Copilot 决策探测一致：本机代理读取 GitHub token，经 `copilot_internal/v2/token` 换取 Copilot token 后直连上游，使用 `copilotCommonHeaders`。

四组请求的实际结果：

| 请求 | HTTP | 响应体要点 |
|---|---|---|
| `POST {base}/v1beta/decisions` + `model: "gemini-decision-1"` | **404** | `404 page not found`（纯文本，非 JSON 错误体） |
| `POST {base}/v1/decisions` + `model: "gemini-decision-1"` | **400** | `{"error":{"message":"The requested model is not supported.","code":"model_not_supported","param":"model","type":"invalid_request_error"}}` |
| `POST {base}/v1/decisions` + `model: "gemini-3.8-flash"` | **400** | 同上，`model_not_supported` |
| `POST {base}/v1/decisions` + `model: "gemini-4-argon"` | **400** | 同上，`model_not_supported` |
| `POST {base}/v1/decisions` + `model: "gpt-6-luna-decisions"`（对照） | **200** | `{"model":"gpt-6-luna","answers":[{"type":"predicate","name":"damaged","probability":1.0}],"usage":{"input_tokens":164,...,"output_tokens":0,"total_tokens":164}}` |

对照组 200 证明端点本身可用，Gemini 侧的三次拒绝都落在模型与端点不匹配这一层。

`/v1beta/decisions` 的 404 只证明 Copilot base 没有该路径，不能反推 Google 端点不存在。

## ④ Copilot 目录只暴露一个 decisions 条目（实测）

`GET /models`（带 `openai-intent: model-access`、`x-interaction-type: model-access`）HTTP 200。

全目录 `supported_endpoints` 并集：`/chat/completions`、`/responses`、`/v1/decisions`、`ws:/responses`。

Gemini 条目：

```json
{"id":"gemini-3.8-flash","type":"chat","endpoints":["/chat/completions"],"picker":true}
{"id":"gemini-4-argon","type":"chat","endpoints":["/chat/completions"],"picker":true}
```

`capabilities.type === "decisions"` 或 id 含 `decisions` 的条目只有一个：

```json
{"id":"gpt-6-luna-decisions","type":"decisions","endpoints":["/v1/decisions"],"picker":false}
```

因此 Copilot 没有为 Gemini 建立专用 decisions 条目，Gemini 条目本身也不声明决策端点。

## ⑤ 全局检索：生态已接入，但无人打 Copilot（检索，2026-11-13）

`gh search code 'gemini-decision-1' --limit 50` 与 `gh search issues 'gemini-decision-1' --limit 50` 返回 50 条以上代码命中与 50 条以上 issue。命中覆盖的自有实现：

- **Vercel AI SDK**：`google.decisionModel('gemini-decision-1')`，类型 `GoogleDecisionModelId`。
- **Pydantic AI**：`GoogleDecisionsModel('gemini-decision-1')`，别名 `google-decisions:gemini-decision-1`。
- **Discourse**：`plugins/discourse-ai/lib/decisions/endpoints/gemini.rb`，注释写明 `Gemini Decisions API (POST /v1beta/decisions, model gemini-decision-1)`。
- **Forem**：`app/services/ai/gemini_decision/client.rb`，`DEFAULT_MODEL` 默认 `gemini-decision-1`。
- **OpenClaw**：`google/gemini-decision-1` 列入决策模型清单。
- **Parlant**：changelog 记录 `gemini:gemini-decision-1` 能力映射。
- **LangChain4j**：issue #7089 请求在 google-genai 中支持。
- **Arize Phoenix**：4 个 issue 覆盖分类评估、成本追踪、instrumentation。
- **Kestra**：issue #160 请求 Decide 任务。
- **Strands Agents**：issue #6067 实现 `GeminiDecisionModel`。
- **Windmill**：流程提示词区分 chat 模型与 `googleai` 决策模型。
- **Pipecat**：分类器示例使用。
- **Ax**：签名示例默认模型。
- **Swarms**：决策模型示例。
- **Everruns**：changelog 记录。
- **models.dev**：google / opencode / vercel / openrouter 多 provider 条目。

其中 OpenCode 是第三条路由，不是 Google 直连也不是 OpenRouter：

```text
anomalyco/opencode:services/site/src/docs/content/console/models.mdx
| Gemini Decision 1 | gemini-decision-1 | https://opencode.ai/inference/systemone/v1/systemone | - |
```

同页说明 `gpt-6-luna-decision` 与 `gemini-decision-1` 在同一个 System One 端点上接受相同报文。

**没有任何命中把 `gemini-decision-1` 指向 GitHub Copilot 后端。** 现有实现分布在三条路由：Google 直连、OpenRouter、OpenCode 自有 System One 网关。

## ⑥ OMP 的 google-decisions wire（检索 + 合并事实）

can1357/oh-my-pi PR #19060「feat(ai,catalog): add Gemini Decision 1 as a native judge」由 @kevcube 提交，2026-11-12 由 @H4vC 合并（merge commit `cc5b308`）。

wire 差异（PR 正文与评审记录）：

- 新增 `google-decisions` judgment API，注册在其他原生 judge wire 旁。
- key 放 `x-goog-api-key`，不是 `Authorization`；`JudgmentTarget` 因此新增可选 `tokenHeader`。
- 问题键被限制为 64 字符的 `[A-Za-z0-9_-]`；OMP 的问题 id 不满足该限制，于是外发用 `q0`、`q1`…… 并按位置读回答案，`JudgmentWire.decode` 因此也接收 request。
- `noul` criteria 是 `{ true_description, false_description }`；无 rubric 的 `choice` 选项发送空字符串。
- 图片作为 base64 `image` 块放在 state 文本之后，上限按解码后字节计 75,000,000（Google 的 100 MB 限制按 base64 计）。
- 行在目录中为 `google/gemini-decision-1`，使用 `GEMINI_API_KEY`；`models.yml` 接受 `api: google-decisions`。

评审要求并已采纳：**不进默认 judge 链，只做 opt-in**。理由写在评审意见里——`textJudgeRoleChain()` 一旦遇到 native 候选就丢弃其后所有非 native 候选，把该 wire 放进默认链会让只有 `GEMINI_API_KEY` 的用户把所有判断都发给一条从未做过 live call 的 wire，且没有回退。

PR 自述的测试边界：没有 Gemini API key，请求与响应形状只对照 Google 公开示例检查；用无效 `x-goog-api-key` 请求 `https://generativelanguage.googleapis.com/v1beta/decisions` 返回 400 `API_KEY_INVALID`，证明路由存在且读该 header。

## ⑦ claude-code-templates 是提案，不是已实现（检索，2026-11-13 核验）

`davila7/claude-code-templates` issue #1529「jev-model-router: support Google's Gemini Decision as a backend」由 @BTL00 于 2026-11-12 创建，label 为 `enhancement`、`triage:human`，state open。

对应 PR #1530「feat(jev-model-router): add Gemini Decision backend」：`gh pr view 1530 --json state,mergedAt` 返回 `state: OPEN, mergedAt: null`。

因此该仓库目前只有提案与待合并 PR，没有落地的后端支持。

## ⑧ 方法教训（实测）

**`github` MCP 工具的 `repo` 默认取当前检出仓库。** 在 `cuipengfei/agc` 里检索 `gemini-decision-1` 与 `"gemini decision" copilot` 均返回 0 条，输出明确写着 `Repository: cuipengfei/agc`。这个 0 不代表全局不存在，只代表当前仓库没有。

全局检索必须用 `gh search code '<term>' --limit N` 与 `gh search issues '<term>' --limit N`，再按仓库名或端点路径过滤。

**判断「后端是否支持某 API」必须先取官方文档里的真实模型 ID 与真实端点路径。** 本会话第一次测试用的是 chat 模型 ID（`gemini-3.8-flash`、`gemini-4-argon`）打 `/v1/decisions`，得到 400 `model_not_supported`；这个结果只能证明「这两个 chat 模型不是决策模型」，不能回答「Gemini 决策模型是否可用」。改用 `gemini-decision-1` 与 `/v1beta/decisions` 重测后，才得到有意义的 404 与 400 组合。

## ⑨ 证据边界

- 未持有 `GEMINI_API_KEY`，Google 直连端点未实测；Google 侧结论全部来自官方文档与第三方实现源码。
- Copilot 侧结论只覆盖本次 business 认证与本次上游；不推广为其他账号类型、其他主机或其他区域。
- 未做 OpenAI `POST /v1/decisions` 与 Google `/v1beta/decisions` 的逐字段 schema 对照，不能断言两者兼容或可互转。
- `gh search` 受索引覆盖与措辞影响，未命中不等于绝对不存在。
- 未向 Google 或 OpenRouter 发出任何请求；本 raw 中的请求全部发往 Copilot 上游。
