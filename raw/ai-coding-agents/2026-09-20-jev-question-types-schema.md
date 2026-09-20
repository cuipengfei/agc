# TypeSafe / Jev 三题型官方 schema 逐字引用、OMP 源码题型映射与 noul 词源核查（2026-09-20）

> Source: 本会话取证（docs.typesafe.ai api.md / primitives.md / primitives/noul.md / primitives/choice.md / primitives/score.md 逐字抓取复验，2026-09-20 抓取）+ 本机全局安装 @oh-my-pi/* 18.2.6 源码直读（`~/.bun/install/global/node_modules/@oh-my-pi/`）
> Collected: 2026-09-20
> Published: Unknown

证据分级标签：**文档原文**＝官方页面逐字引用（2026-09-20 直接抓取复核）；**源码**＝本机 18.2.6 直读带行号；**未验证**＝未能核实。

## ① 官方题型定义（文档原文逐字，2026-09-20 抓取复核）

### 总纲（https://docs.typesafe.ai/api.md）

- api.md「Question types」节（原文行 56）："A `Question` is one of three types, set by its `type` field. All three share `type` and `instructions`; each adds its own `criteria`."
- 请求顶层形状（api.md）：`state`（string | object | array）、`model`（string，"Use `"jev-latest"`, TypeSafe's flagship model."）、`questions`（map<string, Question>，"You choose each key; answers come back under the same keys."）。

### Choice（https://docs.typesafe.ai/api.md + primitives/choice.md）

- api.md:116："Picks one option from a set you define. Returns the chosen option and the full probability distribution."
- api.md:125（criteria）："A map of option to rubric description; use null when an option needs no extra detail. You can have a maximum of 255 options per Choice."
- choice.md 页首："A Choice is a System One question type for selecting one option from a defined set. The answer includes the selected option, a probability for each option, and confidence."
- choice.md:355："A Choice question accepts up to 255 options"

### Noul（https://docs.typesafe.ai/api.md + primitives/noul.md）

- api.md「Noul」节："A yes/no question. Returns the probability the answer is yes."
- noul.md:240（Noul answer 定义逐字）："A Noul answer is a single number representing the probability that the answer is yes where 0 means no and 1 means yes."
- api.md「Noul answer」节 `noul` 字段（原文行 229-231）："The yes/no answer on a scale from 0 (no) to 1 (yes)."
- noul.md 页首："A Noul question asks the TypeSafe model to evaluate a yes/no question and return the probability that the answer is yes."
- **无 confidence 字段**：api.md「Answer types」节（原文行 223）："Every answer carries a `type` matching its question. Choice and Score answers also carry a `confidence` between 0 to 1, derived from the answer's probability distribution."——confidence 仅 Choice/Score 答案携带，Noul 答案无 confidence 字段。

### Score（https://docs.typesafe.ai/api.md + primitives/score.md）

- api.md:162-163（criteria）："An ordered array of level descriptions. A Score should have at least two levels; the API accepts up to 10."
- score.md 页首："A Score is a System One question type for rating content against ordered, descriptive levels. The answer includes a score, a probability for each level, and confidence."

### 混用与并行（https://docs.typesafe.ai/primitives.md）

- primitives.md:362（「Ask multiple questions together」节逐字）："Send every question that uses the same state in one request. You can mix question types freely. System One models evaluate every question in a request in parallel. Adding questions barely changes the response time and costs only the tokens for the extra questions, which are cheap."
- 同请求内问题相互独立（primitives.md:456）："Questions in the same request are independent: one answer does not become context for another question."

## ② OMP pi-ai 题型类型定义（本机 18.2.6 源码直读）

`pi-ai/src/judgment/types.ts:22-92`（Question 判别联合恰为三型）：

- `ChoiceQuestion`（export 于 types.ts:23，题述注释起于 :22）：`{type:"choice", instructions, criteria: Record<L, string|null>}`——criteria 值可为 null（"null when the name suffices"）。
- `NoulQuestion`（types.ts:30）：`{type:"noul", instructions, criteria?: {true?: string, false?: string}}`。
- `ScoreQuestion`（types.ts:37）：`{type:"score", instructions, criteria: readonly [string, string, ...string[]]}`——元组类型强制至少两级。
- `NoulAnswer`（types.ts:58-61）：`{type:"noul", noul:number}`，注释 "Probability of yes, 0–1."。
- `ChoiceAnswer`/`ScoreAnswer` 额外携带 `probabilities` 与 `confidence`（export 分别于 types.ts:48、:64），`NoulAnswer` 不携带 confidence——与官方 api.md:223 一致。

行内码剥除渲染（checker 抽取与 wiki 引用形态，供 evidence lint 对账）：
- "A is one of three types, set by its field. All three share and ; each adds its own criteria."（api.md:56 原文剥除 `Question`/`type`/`instructions`/`criteria` 行内码后的形态）
- "Every answer carries a matching its question. Choice and Score answers also carry a between 0 to 1, derived from the answer's probability distribution."（api.md:223 原文剥除 `type`/`confidence` 行内码后的形态）

## ③ 消费方 × 题型映射（源码行号，本机 18.2.6）

| 消费方 | 题型 | 源码锚点 |
|---|---|---|
| auto-thinking 难度分类 | ChoiceQuestion（LEVEL_QUESTION / LEVEL_QUESTION_WITH_MAX / BUCKET_QUESTION） | `pi-coding-agent/src/auto-thinking/classifier.ts:53-58,61-66,69-77`，调用点 :110 |
| smart unexpected-stop 检测 | NoulQuestion（UNEXPECTED_STOP_QUESTION，阈值 noul ≥ 0.5） | `pi-coding-agent/src/session/unexpected-stop-classifier.ts:16（阈值）,20-30（题面逐字）,43-62（候选条件）,71,83`；smart 分支 `src/session/turn-recovery.ts:916-991` |
| git TUI AI staging | NoulQuestion（file/hunk 两趟，阈值 0.5） | `pi-coding-agent/src/cli/git-tui/ai-stage.ts:34（STAGE_THRESHOLD）,104`，调用点 :69 |
| eval cell `judge()` | 用户自定义 choice/bool/score，经 bridge 映射 | `pi-coding-agent/src/eval/judgment-bridge.ts` |

## ④ eval bridge 的 bool↔noul 映射（`pi-coding-agent/src/eval/judgment-bridge.ts`）

- eval 侧用户写 `{type:"bool"}`，bridge 映射为 NoulQuestion 发给 judge（judgment-bridge.ts:94-107：`parseBool` 产出 `{type:"noul", instructions, criteria}`）。
- eval 只接受三种题型名（judgment-bridge.ts:120-131）：`"choice" | "bool" | "score"`，其余抛 `type must be "choice", "bool", or "score"`。
- 返回映射（judgment-bridge.ts:162-166）：judge 给出的 noul 答案转回 `{type:"bool", bool: number}` 呈现给用户——即 **eval 文档里的 "bool" 形状 wire 上是 noul**。
- eval 工具文档逐字（`pi-coding-agent/src/prompts/tools/eval.md:27-29`）：`{type: "bool", instructions, criteria?: {true?: str, false?: str}}` → `{bool: P(yes)}`。

## ⑤ noul 词源：官方未解释（未验证项记录）

查遍官方 primitives 三页、api.md、博客与 FAQ，**均无 "noul" 一词的命名由来说明**（2026-09-20 复核 docs.typesafe.ai 全站抓取：唯一 "named after" 语句是 noul.md:303 解释 `systemone` 端点/方法名得名于 System One 模型，与 "noul" 无关）。词源官方未解释，任何词源说法（如 "null/no 变体" 之类）均无官方出处。

## ⑥ 响应形状（api.md「Answer types」+ 实测样本）

- 每答案必带 `type`；Choice/Score 答案额外带 `probabilities`（各选项/级别概率，和为 1）与 `confidence`（0–1）；Noul 答案只带 `noul` 数。
- 响应顶层：`model`（实际执行模型，如 `jev-1.13.0`）、`answers`（与 questions 同 key）、`usage.input_tokens/output_tokens`。
- 实测样本（2026-09-20 重发，逐字见 [judgment-systemone-live-evidence](../../omp/2026-09-20-judgment-systemone-live-evidence.md)）：`{"model":"jev-1.13","answers":{"stopped":{"type":"noul","noul":0.76}},"usage":{"input_tokens":888,"output_tokens":22}}`——与官方 schema 逐字段吻合。
