# OMP judge 切换至 gpt-6-luna-decisions：整链实测与两套判断协议对照

> Source: 本机实测（OMP 18.18.3、Headroom 0.42.0、本地 copilot-api 实例）与本机源码直读（`@oh-my-pi/pi-ai`、`@oh-my-pi/pi-coding-agent`、`@oh-my-pi/pi-catalog`）
> Collected: 2026-11-09
> Published: Unknown

## ① 本机配置切换

改前 `~/.omp/agent/config.yml:75` 为 `judge: typesafe-zen/jev-1.13-free`，回退链第 232 行为 `c8787/gpt-6-luna-decisions`。

改后同文件：

```text
75:  judge: c8787/gpt-6-luna-decisions
```

```text
230:    judge:
231:      - typesafe-zen/jev-1.13-free
232:      - "@tiny"
233:      - "@smol"
234:      - "@default"
```

`~/.omp/agent/models.yml` 的 `c8787` provider 下该条目（改前已存在，本轮未改）：

```yaml
      - id: gpt-6-luna-decisions
        name: GPT-6 Luna Decisions
        api: openai-decisions
        reasoning: false
        input:
          - text
          - image
        contextWindow: 1000000
        cost:
          input: 0
          output: 0
          cacheRead: 0
          cacheWrite: 0
```

生效核验，`omp config get modelRoles` 输出（节选 `judge` 一项）：

```json
{"judge":"c8787/gpt-6-luna-decisions"}
```

同一次输出里其余角色为 `"tiny":"sensenova/glm-5.3:max"`、`"smol":"c8787/gpt-6-luna:high"`、`"default":"opencode-go/deepseek-v4.1-flash:max"`，三者 `api` 均为普通 chat 协议。

## ② judge 角色如何选出判断模型

`pi-catalog/src/types.ts:67-81` 把四个判断协议映射为 `judge` 类型：

```ts
export const RUNNER_API_KINDS: Record<Exclude<(typeof RUNNER_APIS)[number], "local-inference">, ModelKind> = {
	"web-search": "search",
	typesafe: "judge",
	"openrouter-decisions": "judge",
	"openai-decisions": "judge",
	"workers-ai-systemone": "judge",
	"openai-images": "image",
	...
};
```

`pi-coding-agent/src/config/model-roles.ts:51-54` 决定哪些模型能进该角色候选池：

```ts
function acceptsJudge(model: Model): boolean {
	const kind = modelKind(model);
	return kind === "judge" || kind === "tiny" || kind === "chat";
}
```

`pi-coding-agent/src/judgment/index.ts:238-245` 的三档分类：

```ts
export function kindOf(value: RoleChainCandidate | Model): JudgeKind {
	const model = "model" in value ? value.model : value;
	if (isJudgmentApi(model.api)) return "native";
	if (model.api === "local-inference") return "local";
	return "online";
}
```

同文件 `:265-269` 的尾部过滤规则：

```ts
function textJudgeRoleChain(chain: RoleChainCandidate[]): RoleChainCandidate[] {
	const firstNative = chain.findIndex(candidate => kindOf(candidate) === "native");
	if (firstNative < 0) return chain;
	return chain.filter((candidate, index) => index < firstNative || kindOf(candidate) === "native");
}
```

规则含义：链上出现第一个 `native` 候选之后，只保留 `native` 候选。本机 `modelRoles.judge` 是 `native`，回退链余下三项是 `online`，因此文本判断题的实际候选只有 `c8787/gpt-6-luna-decisions` 与紧随其后的 `typesafe-zen/jev-1.13-free` 两项。

同文件 `:271-275` 的注释说明图片路径另有一层过滤，先剔除不支持图片的候选，再应用上面的 native-only 规则。

## ③ 8787 端点的请求与逐字响应

本节是入库整理期间另行发出的一次抓取（`2026-11-09 15:43:41 UTC`），用于保存未截断的原始报文，不属于 ④ 的四条入口测试批次。同一端点在 ④ 之前另有一次早期探测（`15:05:53 UTC`，`input_tokens` 418）：请求体文件已删除、正文未留存；响应体完整保留在会话记录中，逐字如下。

```json
{"model":"gpt-6-luna","answers":[{"type":"predicate","name":"damaged_goods","probability":1},{"type":"choice","name":"intent","choice":"replacement","probabilities":[{"value":"refund","probability":0},{"value":"replacement","probability":1},{"value":"repair","probability":0}],"confidence":1},{"type":"score","name":"urgency","score":0.99,"probabilities":[{"value":0,"label":"low","probability":0.03},{"value":1,"label":"medium","probability":0.95},{"value":2,"label":"high","probability":0.02}],"confidence":0.93}],"usage":{"input_tokens":418,"input_tokens_details":{"cached_tokens":0,"cache_write_tokens":0},"output_tokens":0,"output_tokens_details":{"reasoning_tokens":0},"total_tokens":418}}
```

该次耗时 `0.819682s`。两次的 `score` 分别为 0.99 与 1.03，说明同一题面的加权分值在重复调用间会变化。

请求体（718 字节，`/tmp/dec-p.json`）：

```json
{"model":"gpt-6-luna-decisions","input":"The customer says their keyboard arrived with three broken keys and asks for a replacement unit.","questions":[{"type":"predicate","name":"damaged_goods","instructions":"Does the customer report receiving damaged goods?"},{"type":"choice","name":"intent","instructions":"What does the customer primarily want?","choices":[{"value":"refund","description":"Return the item for money back"},{"value":"replacement","description":"Receive a functioning replacement unit"},{"value":"repair","description":"Have the existing unit fixed"}]},{"type":"score","name":"urgency","instructions":"How urgent is this request?","levels":[{"label":"low"},{"label":"medium"},{"label":"high"}]}]}
```

响应，`http=200 time=1.804371s`，逐字：

```json
{"model":"gpt-6-luna","answers":[{"type":"predicate","name":"damaged_goods","probability":1},{"type":"choice","name":"intent","choice":"replacement","probabilities":[{"value":"refund","probability":0},{"value":"replacement","probability":1},{"value":"repair","probability":0}],"confidence":1},{"type":"score","name":"urgency","score":1.03,"probabilities":[{"value":0,"label":"low","probability":0.02},{"value":1,"label":"medium","probability":0.93},{"value":2,"label":"high","probability":0.05}],"confidence":0.9}],"usage":{"input_tokens":407,"input_tokens_details":{"cached_tokens":0,"cache_write_tokens":0},"output_tokens":0,"output_tokens_details":{"reasoning_tokens":0},"total_tokens":407}}
```

本轮观察：

- 顶层只有 `model`（回显 `gpt-6-luna`，不带 `-decisions`）、`answers`、`usage`。
- `answers` 是数组，每题靠 `name` 关联。
- `score` 题的概率数组元素多出 `label` 字段，回显请求里的档位名；`choice` 题的概率数组元素没有 `label`。
- `output_tokens` 为 0，`total_tokens` 等于 `input_tokens`。
- 同一次调用里 `score` 为 1.03（0×0.02 + 1×0.93 + 2×0.05），`confidence` 为 0.9。

## ④ 四条入口的实测记录

`omp models --kind judge`（`omp/18.18.3`）：

```text
c8787 (1)
┌──────────────────────┬─────────┬─────────┬──────────┬────────┐
│ model                │ context │ max-out │ thinking │ images │
├──────────────────────┼─────────┼─────────┼──────────┼────────┤
│ gpt-6-luna-decisions │      1M │    945K │ -        │ yes    │
└──────────────────────┴─────────┴─────────┴──────────┴────────┘
```

同一命令还列出 `openai (1)` 分组，该分组表格为空，说明内置 `openai` provider 下没有该模型。命令开头另有一行无关告警 `Warning: kiro model discovery failed (unavailable): null is not an object (evaluating 't.length')`。

**入口一：`createNativeJudge` 直调。** 用 `pi-ai/src/judgment` 的 `createNativeJudge` 构造，`baseUrl` 为 `http://localhost:8787/v1`，返回 `label: c8787/gpt-6-luna-decisions`、`supportsImages: true`；三题解码为 `damaged_goods.noul` 1、`intent.choice` `replacement`、`urgency.score` 0.9，`usage.input` 400。对应用量行 `id=176108`（`input_tokens` 400，`user_agent` 为 `omp/18.18.3`）。

**入口二：CLI `omp find`。** 在 `src/agc_sync` 上执行，stderr 依次输出 `resolving judge`、`lexical scan`、`filename ranking 6/6`、`scoring 6 passage sketches across 6 files`；JSON `stats` 为 `listed: 6, requests: 2, failed: 0, unanswered: 0, judged: 6, inputTokens: 3287, outputTokens: 0, cost: 0`。对应用量行 `id=176121`（1471）与 `id=176122`（1816），相加为 3287。

**入口三：会话内 `await judge(...)`。** 三题（`bool`、`choice`、`score`），耗时 1.23 秒，返回 `damaged_goods.bool` 1、`intent.choice` `replacement`、`urgency.score` 1.24，其中 `urgency` 的 `probabilities` 为 `{"0":0.01,"1":0.74,"2":0.25}`、`confidence` 0.61。对应用量行 `id=176143`（419，来自 `input_tokens`）。

**入口四：会话内 `find` 工具。** 调用前 `max(id)` 为 176148，调用后为 176152，新增四行全部是 `decisions` 端点：`176149` 1471、`176150` 1824、`176151` 382、`176152` 174，相加为 3851。工具自身报告 `4 requests · 5.9K tokens · $0.0000`。

两处 token 计数不一致：工具报 5.9K，数据库四行相加 3851。入口二（两次请求）两边都是 3287，一致；入口四（四次请求）不一致。差异来源本轮未追查。

## ⑤ copilot-api 的用量表

`/home/cpf/.local/share/copilot-api/copilot-api.sqlite` 的 `token_usage_events` 表列名（30 列，逐字）：

```text
id, created_at_ms, created_at_utc, trace_id, session_id, user_id, source, endpoint, provider_name, model, input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens, total_tokens, total_nano_aiu, nano_cost_input, nano_cost_cache_read, nano_cost_cache_write, nano_cost_cache_creation, nano_cost_output, cost_currency, total_cost_nanos, cost_source, user_agent, request_id, first_token_ms, duration_ms, request_outcome, upstream_request_id
```

`endpoint='decisions'` 的行样本（`id`、`created_at_utc`、`model`、`input_tokens`、`output_tokens`、`user_agent`、`total_nano_aiu`、`request_outcome`）：

```text
(176101, '2026-11-09T15:05:53', 'gpt-6-luna-decisions', 418, 0, 'curl/8.18.0', None, None)
(176104, '2026-11-09T15:06:37', 'gpt-6-luna-decisions', 687, 0, 'omp/18.18.3', None, None)
(176108, '2026-11-09T15:07:57', 'gpt-6-luna-decisions', 400, 0, 'omp/18.18.3', None, None)
(176121, '2026-11-09T15:10:09', 'gpt-6-luna-decisions', 1471, 0, 'omp/18.18.3', None, None)
(176122, '2026-11-09T15:10:10', 'gpt-6-luna-decisions', 1816, 0, 'omp/18.18.3', None, None)
(176143, '2026-11-09T15:14:40', 'gpt-6-luna-decisions', 419, 0, 'omp/18.18.3', None, None)
(176149, '2026-11-09T15:16:00', 'gpt-6-luna-decisions', 1471, 0, 'omp/18.18.3', None, None)
(176150, '2026-11-09T15:16:01', 'gpt-6-luna-decisions', 1824, 0, 'omp/18.18.3', None, None)
(176151, '2026-11-09T15:16:02', 'gpt-6-luna-decisions', 382, 0, 'omp/18.18.3', None, None)
(176152, '2026-11-09T15:16:02', 'gpt-6-luna-decisions', 174, 0, 'omp/18.18.3', None, None)
(176262, '2026-11-09T15:43:41', 'gpt-6-luna-decisions', 407, 0, 'curl/8.18.0', None, None)
```

最后一行 `176262` 对应 §③ 的入库期间补录抓取；`176101` 是同一端点更早的探测。`176262` 之前的 `omp/18.18.3` 行属于 ④ 的四条入口测试。

同批次更早的行 `id` 在 175737 到 175960 之间的 `input_tokens` 全为 167，`user_agent` 为空字符串，均来自上游直连探测。

`decisions` 端点的 `total_nano_aiu`、`request_outcome` 为 `None`，与同一实例上其它端点的行不同。`user_agent` 列记录请求的 `User-Agent` 头原值，`omp --version` 实测输出为 `omp/18.18.3`。

## ⑥ 两套判断协议的字段映射

`pi-ai/src/judgment/openai-decisions.ts:5-19` 的文件头注释给出逐项映射（逐字节选）：

```text
* | `choice` `criteria` option → rubric         | `choices: [{ value, description }]`
* | `score` `criteria` level descriptions       | `levels: [{ label }]`, lowest first
* | `noul` answer `noul`                        | `predicate` answer `probability`
* | `probabilities` map by option / level index | `probabilities: [{ value, probability }]`
```

该文件的结构锚点：

| 位置 | 内容 |
|---|---|
| `:30-32` | 三种题型的开头形状，`name` 是每题字段 |
| `:34` | `encodeQuestion(name, question)`，题目 id 来自调用方传入的 key |
| `:38`、`:50`、`:59` | `predicate` / `choice` / `score` 的 `type` 字面量 |
| `:53` | `choices: Object.entries(question.criteria).map(...)` |
| `:62` | `levels: question.criteria.map(label => ({ label }))` |
| `:65` | `throw new AIError.ValidationError("OpenAI Decisions has no box question type")` |
| `:70-81` | `probabilityMap`，把 `[{ value, probability }]` 转成按字符串键的 map，忽略 `label` |
| `:84-103` | `decodeAnswer`，`predicate` 读 `entry.probability` 写成 `{ type: "noul", noul }`；`choice` 与 `score` 需 `probabilities` 与 `confidence` 同时存在 |
| `:106-153` | `openaiDecisionsWire`，`target` 拼 `${baseUrl}/decisions`；`encode` 把 `questions` 用 `Object.entries(...).map` 展开为数组；`decode` 要求 `payload.answers` 是数组，`refusal` 条目收进 `refused`，`usage` 只读 `input_tokens` 与 `output_tokens` |

`pi-ai/src/judgment/systemone.ts` 的对应锚点：

| 位置 | 内容 |
|---|---|
| `:34-40` | `decodeSystemOne`：要求 `payload.answers` 是对象，`refused` 恒为 `[]`，`usage` 读 `usage.input_tokens`、`usage.output_tokens`、`usage.cost` |
| `:104` | `wireQuestions`，`questions` 直接作为对象 map 发出 |
| `:114-117` | `systemOneWire(path)`：`target` 拼 `${baseUrl}${path}`，`encode` 发 `{ state, model, questions }` |
| `:124` | `typesafeWire` 用 `/v1/systemone` |
| `:159-160` | `openrouterDecisionsWire` 用 `/decisions`，`/api/alpha` 属 baseUrl |
| `:181` | `workersAiWire` |
| `:201-203` | Workers AI 的 `encode` 同样发 `state` + `questions` |

据此，OpenAI 与 Copilot 两处 `/v1/decisions` 共用同一份请求与响应结构，差别只在请求体的 `model` 必须写专用 ID，以及 Copilot 上游响应体不含 `copilot_usage`。Jev / System One 与它们的不同点集中在五处：证据字段名 `state` 对应 `input`；题目与答案用对象 map 对应数组加 `name`；题型名 `noul` 对应 `predicate`；概率用对象 map 对应数组；`cost` 放在 `usage` 内（OpenRouter）或响应顶层（zen 实测）。
