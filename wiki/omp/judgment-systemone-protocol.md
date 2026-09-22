# OMP judgment /v1/systemone 协议面：题型 schema、传输参数、观测点与兼容端点

> Sources: 本会话实测（OMP 18.2.6 本地日志判定链 + OpenCode Zen console + 同 body 重放）, 2026-09-20; 本会话取证（docs.typesafe.ai api/primitives 逐字抓取复核、本机 @oh-my-pi/* 18.2.6 源码直读）, 2026-09-20; 本会话实测（eval judge() 三题型、重复调用与 Jev 服务端日志确认）, 2026-09-20; 本会话实测（18.2.8 eval judge usage 记账、unexpected-stop nudge 无新增 usage）, 2026-09-22
> Raw: [judgment-systemone-live-evidence](../../raw/omp/2026-09-20-judgment-systemone-live-evidence.md); [jev-question-types-schema](../../raw/ai-coding-agents/2026-09-20-jev-question-types-schema.md); [jev-omp-compatibility-probes](../../raw/ai-coding-agents/2026-09-19-jev-omp-compatibility-probes.md); [eval-judge-jev-semantic-testing](../../raw/omp/2026-09-20-eval-judge-jev-semantic-testing.md); [jev-latest-400-root-cause](../../raw/omp/2026-09-22-jev-latest-400-root-cause.md)
> Updated: 2026-09-22

## Overview

OMP 的 TypeSafe（Jev）judgment 走固定协议：`POST {base}/v1/systemone`，body 为 `{state, model, questions}`，questions 是调用方命名的题型 map，答案按同名 key 返回。本文只写机制级稳定事实：题型 schema（官方逐字）、传输参数（重试/退避/transient 集合）、客户端观测面（谁能被本地归因、谁零日志）、已实测验证的协议兼容端点。易变的额度/价格/可用性事实一律不进本文，见 Raw 链接的快照。

## 请求/响应 schema（官方逐字，2026-09-20 抓取复核）

`Question` 恰为三型，由 `type` 字段判别（docs.typesafe.ai/api.md 原文）："A `Question` is one of three types, set by its `type` field. All three share `type` and `instructions`; each adds its own `criteria`."

| 题型 | 官方定义（逐字） | 边界 |
|---|---|---|
| choice | "Picks one option from a set you define. Returns the chosen option and the full probability distribution." | criteria 是 option→rubric map，"use null when an option needs no extra detail. You can have a maximum of 255 options per Choice."（api.md；choice.md 同述 "accepts up to 255 options"） |
| noul | "A yes/no question. Returns the probability the answer is yes." | 答案是单数：noul.md 原文 "A Noul answer is a single number representing the probability that the answer is yes where 0 means no and 1 means yes."（api.md 同述 "on a scale from 0 (no) to 1 (yes)"） |
| score | 有序评级（score.md 页首："rating content against ordered, descriptive levels"） | criteria 是级别描述有序数组："A Score should have at least two levels; the API accepts up to 10."（api.md） |

答案侧（api.md「Answer types」原文）："Every answer carries a `type` matching its question. Choice and Score answers also carry a `confidence` between 0 to 1, derived from the answer's probability distribution."——**confidence 仅 Choice/Score 携带，Noul 答案只有 `noul` 一个数**。Choice/Score 答案还带 `probabilities`（各选项/级别概率，和为 1）；响应顶层为 `model`、`answers`（与 questions 同 key）、`usage.input_tokens/output_tokens`。同一请求可自由混用三题型且并行评估（primitives.md 原文："You can mix question types freely. System One models evaluate every question in a request in parallel."），同请求内问题相互独立（"one answer does not become context for another question"）。

OMP 侧类型定义与此同构（`pi-ai/src/judgment/types.ts:22-92`）：`ChoiceQuestion`（:23）、`NoulQuestion`（:30）、`ScoreQuestion`（:37，`criteria` 元组类型强制至少两级）、判别联合 `Question`（:43）、`NoulAnswer={type:"noul",noul:number}`（:58，注释 "Probability of yes, 0–1"）、`ChoiceAnswer`/`ScoreAnswer` 额外带 `probabilities`+`confidence`（:48,:64）——与官方 confidence 分布一致。

**eval 的 "bool" 是 noul 的呈现层**：eval cell 用户写 `{type:"bool"}`，bridge 转成 `NoulQuestion` 发 judge（`pi-coding-agent/src/eval/judgment-bridge.ts:94-107`）；eval 只接受 `"choice"|"bool"|"score"` 三型名（:120-131）；返回时 noul 答案映射回 `{type:"bool", bool: P(yes)}` 呈现（:162-166）。eval 工具文档逐字（`src/prompts/tools/eval.md:27-29`）：`{type: "bool", ...}` → `{bool: P(yes)}`。

## OMP 消费方 × 题型对照（18.2.6 源码行号）

| 消费方 | 题型 | 阈值/映射 | 源码锚点 |
|---|---|---|---|
| auto-thinking 难度分类 | ChoiceQuestion（low/medium/high/xhigh[/max] 全梯题、3-bucket 题） | 取最高概率选项 | `src/auto-thinking/classifier.ts:53-77`（题面定义），调用点 :110 |
| smart unexpected-stop 检测 | NoulQuestion（`UNEXPECTED_STOP_QUESTION`） | `noul >= 0.5` 判 true（keyword judge 只给 0/1，TypeSafe 给校准中间值，0.5 即「硬币翻转不触发」） | `src/session/unexpected-stop-classifier.ts:16`（阈值）,`:20-30`（题面）,`:43-62`（候选条件）,`:71`,`:83`；smart 分支 `src/session/turn-recovery.ts:916-991` |
| git TUI AI staging | NoulQuestion（file pass 每文件一题、hunk pass 再判） | `noul >= 0.5` 选入 | `src/cli/git-tui/ai-stage.ts:34`（`STAGE_THRESHOLD`）,`:104`，调用点 :69 |
| eval cell `judge()` | 用户自定义 choice/bool/score | bool↔noul 双向映射见上节 | `src/eval/judgment-bridge.ts` |

unexpected-stop 的 classifier 先于 todo 完成检查运行（`src/session/agent-session.ts:3630` 先于 :3772）；smart 分支重试上限 3（`turn-recovery.ts` `UNEXPECTED_STOP_MAX_RETRIES = 3`，:73），判定 true 则注入 developer reminder 并 `scheduleAgentContinue({source:"unexpected-stop-retry"})`（:981-991）。

## 传输面（pi-ai/src/judgment/typesafe.ts，18.2.6）

- URL 拼接：`url = baseUrl + path`（:144），POST path 恒为 `"/v1/systemone"`（:102），baseUrl 尾部斜杠剥除（:34, :93）——base 写成 `…/zen/v1` 会得到 `…/zen/v1/v1/systemone`（404）。
- body（:101）：`JSON.stringify({state, model, questions})`，无其他字段。
- 头部：恒带 `Authorization: Bearer <key>`（:145-146）——匿名通道对 OMP 不可达（client 永远发 key）。
- 响应校验（:103-110）：每个 question id 必须有同 `type` 的答案，否则抛 envelope 错误。
- 重试：timeout 10s（`DEFAULT_TIMEOUT_MS`，:58）、`MAX_ATTEMPTS = 3`（:59）、退避 `min(hinted, 5000ms)`，无 hint 时 `min(500 * 2^attempt, 5000)`（:61, :76-81）。
- transient 集合（:168）：`408 || 429 || >=500`——**429 属 transient 会重试**，401/403/404 直接抛。

## 观测面

- **model_usage 只有 auto-thinking 写**：`resolveJudge` 的 usage 记录仅在调用方传 `onUsage` 时触发（`pi-coding-agent/src/judgment/index.ts:103-114`）；四个消费方里只有 auto-thinking 的调用点把它接到 `appendModelUsage({purpose:"auto-thinking", ...})`（`src/session/model-controls.ts:627-630`）。因此 TypeSafe 命中的判定在 model_usage 里可本地归因 `provider:"typesafe"`；unexpected-stop、ai-stage、eval 的判定成功路径**不留任何本地 usage 记录**。
- **请求级零日志**：`typesafe.ts` 全文无 logger。2026-09-20 全量日志实证：三条失败签名——`judgment: TypeSafe failed; falling back to LLM judge`（`judgment/index.ts:120`）、`unexpected-stop: classification failed`、`every tiny/smol candidate failed`——当日各 0 命中；`systemone` 关键字仅出现在 subagent 名里。成功判定在 OMP 侧唯一痕迹是上面那条 model_usage（auto-thinking）或对端服务侧日志。
- **失败回退链**：TypeSafe 调用失败（非 abort）恒回退 LLM 桥，链为 tiny → smol → default → 会话模型（`judgment/index.ts:115-121`；链内规则与 `llm` 模式语义见 [judgment-provider-and-eval-judge](judgment-provider-and-eval-judge.md)）。
- **活体判定链样例**（2026-09-20 13:47:45，本机日志逐字）：`route:"entered"`（13:47:45.087）→ 0.87s 后 judge true → `agent.continue scheduled source:"unexpected-stop-retry"`（13:47:45.956）→ `route:"unexpected-stop-handled"`（13:47:45.957）。对端 zen console 同窗口记录 `POST /inference/systemone/v1/systemone` 200、UA `Bun/1.4.2`、request content-length 1902；重建 body（717 字符 state + 题面 + model）UTF-8 恰为 1902 字节——**长度相等比对**（zen 未存 body，非逐字节断言）；同 body 重发 200 返回 `{"model":"jev-1.13","answers":{"stopped":{"type":"noul","noul":0.76}},"usage":{"input_tokens":888,"output_tokens":22}}`。
- **误检倾向观察**（样本=3，未量化）：本会话 3 次纯文本交付型收尾被 smart 分支判为意外停止触发 nudge，与题面措辞（"says it will act, continue working, or call a tool, then ends"）对短交付文本边界模糊一致。观察性结论，非稳定定律。
> **Status: Outdated** (2026-09-22)
> 「eval 的判定成功路径不留任何本地 usage 记录」仅对 18.2.6 成立：18.2.8 实测 eval `judge()` 记 model_usage（`purpose=judge`、`provider=typesafe-zen`、`model=jev-1.13`，3 样本）。unexpected-stop 的两次成功 nudge 在 18.2.8 均无 usage 新增，原因未知。证据见 [jev-latest-400-root-cause](../../raw/omp/2026-09-22-jev-latest-400-root-cause.md)。

## 语义判定的实践观察

2026-09-20 的一组 eval 调用由用户通过 API 服务端日志确认实际后端为 Jev。完全相同的 state 与 questions 连续调用三次时，choice 均选择 `complete`，其概率为 0.96 至 0.97；score 为 2.78 至 2.81。相同请求的分类可以稳定，概率与加权分数仍可能轻微变化。

概率表示题面和 criteria 下的分布，不能直接解释成内容的客观质量百分比。实测 state 只声称自己包含一个结论和两条理由，没有给出具体内容；宽松 criteria 仍以 0.97 的概率选择 `complete`。这个样本证明该 rubric 会产生高概率假阳性，不足以评价 Jev 的一般判定质量。

用于语义检查时，criteria 应要求可引用的具体证据，并明确排除自我声明。多个目标分别提问；修改前后复用同一 rubric；需要确认实际后端时查看服务端日志或其他运行证据，不能仅根据 answer shape 推断。

## 已验证协议兼容端点

| 端点 | 判定 | 证据 |
|---|---|---|
| OpenCode Zen（`https://opencode.ai/zen`） | **已实测兼容** | 原生暴露 `/zen/v1/systemone`；重放响应头 `x-opencode-endpoint-id: typesafe`、`x-opencode-upstream-model-id: jev-1.13.0`——服务端自认经 typesafe 通道转发且把请求 model 解析到具体上游版本（2026-09-20 重放实测） |
| OpenRouter | **不兼容** | jev 实际挂在 `/api/alpha/decisions`（真 key 实测 200）；OMP 形状 `/api/v1/systemone` 实测 404（Next.js 兜底路由）。路径后缀硬编码，任何 base URL 都桥接不了（2026-09-19 实测） |
| TypeSafe 直连（`https://api.typesafe.ai`） | 原生匹配 | 默认 baseUrl（`typesafe.ts:29`），参考端点形态见官方 api.md |

## See Also

- [OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界](judgment-provider-and-eval-judge.md)
- [OMP TypeSafe env 变量边界、.env 加载链与 zen 免费 jev 接入](judgment-typesafe-env-config.md)
- [Jev 七渠道定价与 OMP systemone 兼容性判定](../ai-coding-agents/jev-omp-systemone-channel-compatibility.md)

- [Jev 语义回归检查方法](../harness-engineering/jev-semantic-regression-testing.md)