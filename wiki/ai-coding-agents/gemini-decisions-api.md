# Gemini Decisions API：身份、与 OpenAI Decisions 的报文差异、生态接入与 Copilot 支持状态

> Sources: Google Decisions API 规范与模型页, 2026-11-11; Google 官方发布公告, 2026-11-11; OpenRouter 模型页与 Decisions 参考, 2026-11-11; OpenAI Decisions 官方文档与 GA changelog, 2026-10-22; 本机 Copilot 上游实测, 2026-11-13; GitHub 全局检索与 can1357/oh-my-pi PR #19060, 2026-11-12
> Raw: [gemini-decisions-api-and-copilot-support](../../raw/ai-coding-agents/2026-11-13-gemini-decisions-api-and-copilot-support.md); [openai-decisions-api-ga](../../raw/ai-coding-agents/2026-10-25-openai-decisions-api-ga.md)
> Updated: 2026-11-13

## Overview

Gemini Decisions API 是 Google 在 2026-11-11 发布的独立决策端点，模型为 `gemini-decision-1`，与 OpenAI Decisions API 并行存在但报文不同：认证头换成 `x-goog-api-key`，`questions` 是以问题 ID 为键的对象 map 而非数组。生态侧已有十余个项目落地，分布在三条路由上：Google 直连、OpenRouter、以及 OpenCode 自有的 System One 网关；另有若干项目处于提案或 issue 阶段。GitHub Copilot 上游截至 2026-11-13 不支持它——目录只暴露一个 decisions 条目 `gpt-6-luna-decisions`，用 `gemini-decision-1` 请求决策端点返回 400 `model_not_supported`，`/v1beta/decisions` 路径返回 404。

## 端点与请求形态

Google 原生端点与 OpenRouter 路由是两套实现，端点、认证与 envelope 都不同。

| 项 | Google 直连 | OpenRouter |
|---|---|---|
| 端点 | `POST https://generativelanguage.googleapis.com/v1beta/decisions` | `POST https://openrouter.ai/api/alpha/decisions` |
| 模型 | `gemini-decision-1` | `google/gemini-decision-1` |
| 认证 | `x-goog-api-key: $GEMINI_API_KEY` | OpenRouter 自己的 key |
| 请求 envelope | `model`、`input`、`questions` | `model`、`state`、`questions` |

两边的 `input` 与 `state` 名称不同，语义都指共享输入，不能混用。

Google 侧的规模参数：输入上限 262,144 tokens，输出 tokens 为 0，单请求最多 1,000 题，支持文本、图片、视频、音频、PDF。

三种题型：`noul` 返回是/否概率与 confidence，`choice` 从给定选项选一个，`score` 按有序档位给分。响应统一放在 `answers` 里，以问题 ID 关联。

## 与 OpenAI Decisions 的报文差异

两套 API 都叫 Decisions，但字段结构不同，这是接入时最容易出错的地方。

| 项 | OpenAI Decisions | Gemini Decisions |
|---|---|---|
| 认证 | `Authorization: Bearer <key>` | `x-goog-api-key: <key>` |
| 共享输入字段 | `input` | `input` |
| `questions` 形态 | 数组，每题带 `type` 与 `name` | 对象 map，键即问题 ID |
| 答案关联 | 按 `name` 匹配 | 按键名匹配 |
| 是/否题型名 | `predicate` | `noul` |
| 是/否答案字段 | `probability` | 概率加 confidence |
| 输出费用 | 有 | 0 tokens |
| 题目上限 | 400（2026-10-22 GA 后） | 1,000 |

两者的 `input` 名称相同，其余几乎都不同。把 OpenAI 的请求体直接发到 Google 端点不会工作。

## 生态接入：三条路由

`gh search code 'gemini-decision-1'` 在 2026-11-13 返回 50 条以上命中。命中的落地状态分成两组。

### 已实现

**Google 直连**：Vercel AI SDK（`google.decisionModel()`，类型 `GoogleDecisionModelId`）、Pydantic AI（`GoogleDecisionsModel`）、Discourse（`plugins/discourse-ai/lib/decisions/endpoints/gemini.rb`）、Forem（`Ai::GeminiDecision::Client`，默认模型 `gemini-decision-1`）、OpenClaw（`google/gemini-decision-1` 列入决策模型清单）、Parlant（changelog 记录 `gemini:gemini-decision-1`）、Windmill（流程提示词区分 chat 与 `googleai` 决策模型）、Pipecat（分类器示例）、Ax（签名示例默认模型）、Swarms（决策模型示例）、Everruns（changelog）。

**OpenRouter**：`google/gemini-decision-1` 在 models.dev 的 openrouter provider 下有条目，走 `/api/alpha/decisions`。

**OpenCode 自有 System One 网关**：`gemini-decision-1` 与 `gpt-6-luna-decision` 共用 `https://opencode.ai/inference/systemone/v1/systemone`，接受相同报文。这是第三条独立路由。

OMP 已合并的 PR #19060（2026-11-12）属于已实现一组：新增 `google-decisions` judgment API，wire 差异包括 `x-goog-api-key` 认证、64 字符 `[A-Za-z0-9_-]` 问题键限制导致的位置化编码、`noul` criteria 写成 `true_description`/`false_description`、图片按解码字节上限 75,000,000。该 wire 按评审要求只做 opt-in，没有进入默认 judge 链——理由是默认链一旦遇到 native 候选就丢弃其后全部非 native 候选，会让只有 `GEMINI_API_KEY` 的用户失去回退。

### 提案或 issue 阶段

LangChain4j（issue #7089 请求在 google-genai 中支持）、Arize Phoenix（4 个 issue 覆盖分类评估、成本追踪、instrumentation）、Kestra（issue #160 请求 Decide 任务）、Strands Agents（issue #6067 实现 `GeminiDecisionModel`）、`davila7/claude-code-templates`（issue #1529 为 enhancement 请求，PR #1530 状态 `OPEN`、`mergedAt: null`，尚未合并）。

**没有任何项目——已实现或提案——把 `gemini-decision-1` 指向 GitHub Copilot 后端。**

## GitHub Copilot 上游不支持

2026-11-13 用本机 business 认证直连 Copilot 上游，四组请求与一组对照：

| 请求 | HTTP | 结果 |
|---|---|---|
| `POST /v1beta/decisions` + `gemini-decision-1` | 404 | `404 page not found`，纯文本 |
| `POST /v1/decisions` + `gemini-decision-1` | 400 | `model_not_supported` |
| `POST /v1/decisions` + `gemini-3.8-flash` | 400 | `model_not_supported` |
| `POST /v1/decisions` + `gemini-4-argon` | 400 | `model_not_supported` |
| `POST /v1/decisions` + `gpt-6-luna-decisions` | 200 | `answers` 数组，`probability` 1.0，`output_tokens` 0 |

目录侧同向：`GET /models` 的端点并集为 `/chat/completions`、`/responses`、`/v1/decisions`、`ws:/responses`；两个 Gemini 条目 `gemini-3.8-flash` 与 `gemini-4-argon` 的 `supported_endpoints` 只有 `/chat/completions`；`capabilities.type` 为 `decisions` 的条目只有一个，仍是 `gpt-6-luna-decisions`，且 `model_picker_enabled` 为 `false`。

对照组的 200 证明端点可用，Gemini 侧的三次拒绝都落在模型与端点不匹配这一层。

## 接入时的诊断顺序

按下面的顺序查，比反复改请求形状快：

1. 读厂商官方文档，确认模型 ID 与端点路径。不能拿 chat 模型 ID 去试决策端点。
2. 取上游 `/models`，汇总全部 `supported_endpoints`，确认目标端点是否被任何条目声明。
3. 在声明者里挑 `capabilities.type` 匹配的条目；决策面应为 `decisions`。
4. 用该条目的 `id` 原样发送，不做名称映射。
5. 以上都确认后才怀疑端点本身。

## 证据边界

- 未持有 `GEMINI_API_KEY`，Google 直连端点未实测；Google 侧结论来自官方文档与第三方实现源码。
- Copilot 侧只覆盖本次 business 认证与本次上游；不推广为其他账号类型、其他主机或其他区域。
- 未做两套 API 的逐字段 schema 对照测试，报文差异表来自双方文档与实际实现源码。
- `/v1beta/decisions` 的 404 只说明 Copilot base 没有该路径。

## See Also

- [OpenAI Decisions API：GA 状态、请求格式与 GitHub Copilot 后端探测](openai-decisions-api.md)
- [同一模型名跨两个协议面时的模型 ID 分叉](copilot-decisions-model-identity.md)
- [Copilot 的决策路由端点与 Auto／HydraFusion 边界](copilot-decision-routing.md)
- [OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界](../omp/judgment-provider-and-eval-judge.md)
