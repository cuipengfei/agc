# OMP judgment 对 chat 类 judge 的请求构造与解析机制（18.8.0 源码核验，2026-10-07）

> Source: omp 18.8.0 内置 pi-ai 缓存源码 `~/.bun/install/cache/@oh-my-pi/pi-ai@18.8.0@@@1/src/judgment/chat.ts`、`text.ts`、`typesafe.ts`、`stream.ts`；本机 `~/.omp/agent/config.yml`（judge 角色实配）；本会话 grep 实测
> Collected: 2026-10-07
> Published: 2026-10-07（源码核验日）

证据分级标签：**源码**＝逐字读文件；**实测**＝本会话实际命令所得；**推断**＝由证据推得但未直接证实。

## ① 结论

OMP 的 judgment 子系统用普通 chat 模型（tiny/smol/default/session 回退链中的任何 chat 模型）充当 judge 时，**不发 `response_format` / `json_schema` / `text.format` schema**。首次调用是裸文本关键词补全，由三组确定性解析器从返回文本里抠答案；解析失败后的重试才挂一个 function-call 工具强制交答案。jev 走的是独立的 `/v1/systemone` 判断路由，与 chat 协议完全分离。

## ② chatTextBackend 请求参数（chat.ts，源码）

`chat.ts:41` 注释原文："Chat completions with reasoning disabled, temperature 0, and transient-failure retry."

`chat.ts:48-68 complete()` 内 `completeSimple` 调用的关键参数：

- `systemPrompt: [prompt.system]`
- `messages: [{ role: "user", content: prompt.user, timestamp: Date.now() }]`
- `tools: prompt.retry ? [SUBMIT_JUDGMENT] : undefined`（首次调用不带 tools）
- `maxTokens: JUDGMENT_CHAT_MAX_TOKENS`（`chat.ts:27` = 4096）
- `temperature: 0`
- `disableReasoning: true`
- `toolChoice: prompt.retry ? { type: "function", name: SUBMIT_JUDGMENT.name } : undefined`
- `signal: judge.signal`

`chat.ts:14-25` 注释解释 maxTokens=4096 的两个约束：后端忽略 `disableReasoning` 仍会吐 thinking 前导（issue #4355）；Anthropic 系代理拒绝 `max_tokens <= thinking.budget_tokens`（`max_tokens must be greater than thinking.budget_tokens`，issue #8610）。

`SUBMIT_JUDGMENT` 工具定义（`chat.ts:29-34`）：`{name: "submit_judgment", description: "Submit the exact requested answer label, or the requested question-id lines for a batched judgment.", parameters: type({ answer: "string" }), strict: true}`。

`chat.ts:82-89`：响应文本拼接逻辑——非 retry 时收集 text block；retry 时同时收集 `toolCall` block 里 `submit_judgment` 的 `arguments.answer`。

`parseRetries: 2`（`chat.ts:47`）。

## ③ 无 schema 的硬证据（实测）

对 `~/.bun/install/cache/@oh-my-pi/pi-ai@18.8.0@@@1/src/judgment/` 全目录 grep `response_format|json_schema|responseFormat|text.format|jsonSchema`：**零命中**（exit 1）。

## ④ 文本解析器（text.ts，源码）

`text.ts` 文件头注释："Questions render into one system prompt asking for keyword answers (an option label, `yes`/`no`, or a level number); ... Answers are one-hot: a parsed keyword yields probability 1 and confidence 1, since a text completion carries no distribution."

三个解析器（均 export）：

- `parseChoiceReply<L>(text, labels)`（`text.ts:167-179`）：`indexOfWord` 整词、大小写不敏感匹配，返回最早出现的合法 label；同位置更长的 label 优先（`xhigh` 压过 `high`）。
- `parseNoulReply(text)`（`text.ts:182-191`）：找 `yes`/`true` 与 `no`/`false` 的最早位置，谁在前取谁；都无返回 undefined。
- `parseScoreReply(text, levels)`（`text.ts:197-203`）：`INTEGER` 正则 `(?<![\p{L}\p{N}_])(?<!\d\.)(\d+)(?![\p{L}\p{N}_])(?!\.\d)` 抓第一个独立整数，且必须 `< levels`。

`parseAnswer(id, question, reply)`（`text.ts:231-253`）按题型分派：choice 命中→`{type:"choice", choice, probabilities: oneHot(...), confidence: 1}`；noul→`{type:"noul", noul: verdict?1:0}`；score→`{type:"score", score: level, probabilities: oneHot(String(index)), confidence: 1}`。三类解析不到都 `throw new JudgmentParseError(id, reply, "...")`。

多题批量：`splitAnswerLines(text, ids)`（`text.ts:210-222`）按 `<id>: <answer>`（或 `=` / `-` 分隔、quoted id）切成 `id→answer` map，未知 id 的行直接忽略。

## ⑤ transport 分发（stream.ts，源码）

`stream.ts:990` `const api: Api = providerModel.api;`，随后 `case "openai-responses":`（`stream.ts:1014-1018`）与 `case "azure-openai-responses":`（`stream.ts:1021-1025`）等分支按 `model.api` 字段分发到不同 transport。chat 类 judge 走哪个 transport 由该模型的 `model.api` 值决定。

## ⑥ jev 路由（typesafe.ts，源码）

jev 命中时走独立判断路由，不经 chat 协议：`typesafe.ts` 定义 `JUDGMENT_ROUTES`（本机 zen 后端为 `/zen/v1/systemone`），`judge()` 方法 POST `{state, model, questions}` 到该路由，返回带类型的 `answers` map。

## ⑦ 本机 judge 实配（config.yml，实测）

`~/.omp/agent/config.yml` 当前 `modelRoles.judge: typesafe-zen/jev-1.13`。Luna 出现在 `commit` / `vision` / `advisor` / `memory` 角色与 `advisor` / `web` fallback 链，但**当前不是 judge 角色**。

## ⑧ 边界与未确认项

- "Luna 在 OMP 侧走 `openai-responses` transport"由 `stream.ts` 按 `model.api` 分发的机制推断；`~/.omp/agent/models.yml` 里 c8787 provider 的 `api` 字段值本会话未直接读取，该具体模型 api 赋值**未确认**。
- 本 raw 只覆盖 chat 类 judge 的请求构造与解析；jev 协议面细节见 raw/omp/2026-09-20-judgment-systemone-live-evidence.md。
- 源码版本：omp 18.8.0 对应 pi-ai 缓存。其他版本可能不同。
