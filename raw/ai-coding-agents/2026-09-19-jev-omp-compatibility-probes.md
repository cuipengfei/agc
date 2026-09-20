# Jev 各渠道 vs OMP judgment 硬编码路径：兼容性探针实测汇编（2026-09-19）

> Source: OMP vibe 会话（2026-09-19）worker transcripts：zen-429-full-response / zen-429-controlled-test / openrouter-jev-test / vercel-jev-verify / netlify-jev-verify / cloudflare-jev-verify / omp-judgment-config-check + 探针脚本 ~/.omp-typesafe-verify/probe4.py、probe5.py + /tmp/or-jev2.json（OpenRouter API 实测响应）+ 本机全局安装 @oh-my-pi/pi-ai@18.2.6 源码直读
> Collected: 2026-09-19
> Published: Unknown

证据分级标签：**实测**＝本会话实际运行/抓取所得；**文档原文**＝官方页面/文档逐字引用；**推断**＝由证据推得但未直接证实；**未验证**＝未能核实。所有探针的 key 从 `~/.local/share/opencode/auth.json` 运行时读取、输出已 redact；假 key 组使用合成占位符。

## ① OMP judgment 请求形状与硬编码路径来源（源码级）

pi-ai/src/judgment/typesafe.ts（本机 18.2.6 直读）：

- body（typesafe.ts:101）：`JSON.stringify({ state: request.state, model: this.model, questions: request.questions })`——扁平 `{state, model, questions}`，questions 形如 `{q1:{type:"noul", instructions:...}}`。
- 路径与 URL（typesafe.ts:102, 144）：`this.#request<SystemOneResponse>("POST", "/v1/systemone", body, ...)`；`const url = `${this.baseUrl}${path}``——**`/v1/systemone` 后缀硬编码**，任何 baseUrl 都会被拼该后缀。
- headers（typesafe.ts:145-146）：`Authorization: Bearer <key>`、Accept、Content-Type: application/json。
- 响应要求（typesafe.ts:103-110）：`response.answers[id]` 必须存在且 `answer.type` 与 question 一致，否则抛 `ProviderResponseError`（envelope）；随后取 `response.model` 与 `response.usage.input_tokens/output_tokens`（typesafe.ts:115-117）。
- model/baseUrl 来源：构造默认 `typesafeModel()`/`typesafeBaseUrl()`（typesafe.ts:38-40, 93-94），而 OMP 唯一构造点 `resolveJudge` **只传 apiKey**（pi-coding-agent/src/judgment/index.ts:97-99）→ 模型与 base 只能经 env 改，无 config 旋钮。
- 重试语义：timeout 10s、MAX_ATTEMPTS 3、429/5xx 带 retry-after 感知退避（typesafe.ts:58-61, 76-81, 168-170）；401/403 key 轮换经 withAuth（typesafe.ts:133-135）。TypeSafe 调用失败回退 OnlineChatJudge（judgment/index.ts:115-121）。

## ② zen 429 完整证据（probe4.py，2026-09-19 16:35 UTC，真 key，model=jev-1.13-free）

`POST https://opencode.ai/zen/v1/systemone`（**实测**）：

```
STATUS-LINE: HTTP/1.1 429 Too Many Requests
HEADERS（逐行）:
  Date: Sat, 19 Sep 2026 16:35:47 GMT
  Content-Type: application/json
  Content-Length: 112
  Connection: close
  CF-Ray: a3da01651dcb20eb-PDX
  Retry-After: 26654
  Server: cloudflare
  cf-placement: remote-ORD
  x-opencode-log-id: 9335b444-fe81-455f-b40e-441e4fb80205
BODY（112 字节，逐字）:
{"type":"error","error":{"type":"FreeUsageLimitError","message":"Rate limit exceeded. Please try again later."}}
```

对照组 `GET https://opencode.ai/zen/v1/models`（同 key，**实测**）：`HTTP/1.1 200 OK`，28 个模型含 jev-1.13-free，头含 `Access-Control-Allow-Origin: *`、`Cache-Control: no-store`、`x-opencode-log-id: 5b332380-...`，**无 Retry-After / 无限流头**——同 key 在 models 目录端点不被限流，429 只打在 systemone 判断端点。

**推断（标注为推断）**：Retry-After 26654s 从 16:35:47 GMT 起算正好到 UTC 午夜 2026-09-20 00:00:01 → 强烈提示免费日额度按 UTC 0 点重置。额度数值、账号级 or key 级、月上限，服务器均未说明（未验证）。

## ③ 四组对照实验（probe5.py，2026-09-19 16:42 UTC）

### A. 无 key（不带 Authorization 头），model=jev-1.13-free —— 200 匿名免费

```
STATUS-LINE: HTTP/1.1 200 OK
HEADERS:
  Date: Sat, 19 Sep 2026 16:42:20 GMT
  Content-Type: application/json
  Content-Length: 129
  Connection: close
  Cf-Placement: remote-ORD
  Server: cloudflare
  CF-RAY: a3da0b058d4d884d-PDX
BODY（129 字节，逐字）:
{"model":"jev-1.13-free","answers":{"q1":{"type":"noul","noul":0.99}},"usage":{"input_tokens":276,"output_tokens":21},"cost":"0"}
```

### B. 假 key（Bearer $$BEARERTOKEN_LK9CT9SKQIFY:L$$，合成占位符），model=jev-1.13-free —— 401

```
STATUS-LINE: HTTP/1.1 401 Unauthorized
HEADERS:
  Date: Sat, 19 Sep 2026 16:42:24 GMT
  Content-Type: text/plain;charset=UTF-8
  Content-Length: 74
  Connection: close
  Cf-Placement: remote-ORD
  Server: cloudflare
  CF-RAY: a3da0b207aed2fbe-PDX
BODY（74 字节，逐字）:
{"type":"error","error":{"type":"AuthError","message":"Invalid API key."}}
```

### C. 真 key 基线复测，model=jev-1.13-free —— 429

```
STATUS-LINE: HTTP/1.1 429 Too Many Requests
HEADERS:
  Date: Sat, 19 Sep 2026 16:42:29 GMT
  Content-Type: application/json
  Content-Length: 112
  Connection: close
  CF-Ray: a3da0b3adfddff11-PDX
  Retry-After: 26251
  Server: cloudflare
  cf-placement: remote-ORD
  x-opencode-log-id: bedebf48-243a-45a0-ad46-6b194114ed41
BODY（112 字节）:
{"type":"error","error":{"type":"FreeUsageLimitError","message":"Rate limit exceeded. Please try again later."}}
(UTC now 16:42:30; seconds to next UTC midnight: 26250; Retry-After: 26251; diff: 1s)
```

——Retry-After 与距下一 UTC 午夜的秒数只差 1s，二次确认对齐 UTC 午夜（推断）。

### D-preflight. GET /zen/v1/models（真 key）—— 200，28 模型

7 个含 free 的模型：`ling-3.0-flash-fin-free`、`mimo-v2.5-free`、`muse-spark-1.2-contributor-free`、`muse-spark-1.3-contributor-free`、`nemotron-3-ultra-free`、`nemotron-3.5-lightning-free`、`jev-1.13-free`。D 组不跳过。

### D. 真 key + ling-3.0-flash-fin-free，POST systemone —— 503

```
STATUS-LINE: HTTP/1.1 503 Service Unavailable
HEADERS:
  Date: Sat, 19 Sep 2026 16:42:38 GMT
  Content-Type: application/json
  Content-Length: 95
  Connection: close
  CF-Ray: a3da0b71adb6b298-PDX
  Server: cloudflare
  cf-placement: remote-ORD
  x-opencode-log-id: 19a282cb-9a47-48c8-a655-f2f6aa7d7b9d
BODY（95 字节，逐字）:
{"error":{"type":"server_error","message":"Upstream request failed: Endpoint is unavailable."}}
```

### 对比表

| 组 | 状态码 | error.type | error.message | Retry-After | 其它关键头差异 |
|---|---|---|---|---|---|
| A 无 key | 200 OK | 无（成功，noul=0.99，cost "0"） | — | 无 | 无 x-opencode-log-id |
| B 假 key | 401 | AuthError | Invalid API key. | 无 | Content-Type 为 text/plain（非 JSON） |
| C 真 key + jev-1.13-free | 429 | FreeUsageLimitError | Rate limit exceeded. Please try again later. | 26251（对齐 UTC 午夜，差 1s） | 有 x-opencode-log-id |
| D 真 key + ling-3.0-flash-fin-free | 503 | server_error | Upstream request failed: Endpoint is unavailable. | 无 | 有 x-opencode-log-id |

（C/D 的 cf-placement 与 A/B 的 Cf-Placement 仅大小写差异，Cloudflare 常规行为，无语义。）

### 三道闸结论与边界

1. **无 key ≠ 假 key ≠ 429**：无 key 直接 200 返回真实判断结果（cost "0"）——systemone 免费层当前允许完全匿名调用，不触碰账号限额；假 key 401；真 key 才进入额度检查。**服务端先校验 key 合法性，再查额度；匿名通道绕过账号限额**（实测）。
2. **429 只在「真 key + 免费模型」组合出现**：严格说「免费模型」条件没被干净验证——D 用另一个免费模型拿到的是 503（上游端点不可用），503 把「429 是否 jev 专属 / 账号对全部免费模型的总限额」盖住了。只能说 jev-1.13-free 路径确认额度已耗尽；其它免费模型是否共享同一限额池，本次证据无法判定。
3. **账号级 vs key 级无法判定**：只有一个 key 可用，无法做同账号多 key 对照。限额绑定在「认证身份」上，但认证身份对应账号还是 key 本身证据不足；区分需同账号第二 key 或换账号真 key。

## ④ OpenRouter 实测（openrouter-jev-test worker，2026-09-19）

- 目录（实测，带 openrouter key）：`GET https://openrouter.ai/api/v1/models` 共 **447** 个模型，**0 条** typesafe/jev 条目；`typesafe/jev-1.13` 存在（$0.042/M input、$0 output、is_free:false）、**无 :free 变体**（:free 404）。
- `POST https://openrouter.ai/api/v1/systemone`（OMP 拼接形状，真 key）→ **404**，路由匹配 `matched_path: /api/[[...slug]]`（Next.js 兜底路由，非 API 响应）。
- `POST https://openrouter.ai/api/alpha/decisions`（真 key，同 body）→ **200**，**cost $0.000011928**，响应形状兼容 OMP judge() parser。/tmp/or-jev2.json 实测响应字段：modality `text->decisions`、pricing prompt 0.000000042/completion 0、context_length 32000、max_completion_tokens 28800。
- 根因（源码级，见①）：OMP 硬编码 `POST {base}/v1/systemone`，OpenRouter 的 jev 挂在 `/api/alpha/decisions`——**任何 base URL 值都桥接不了固定的 /v1/systemone 后缀**。
- 结论：**env 无解，infeasible-env-only**。可选路径：OMP 上游把 judgment 路径做成可配置；或本地 shim 代理把 /v1/systemone 改写到 https://openrouter.ai/api/alpha/decisions（付费，非免费）。未改任何文件。

## ⑤ Vercel / Netlify / Cloudflare 三家 OMP 兼容性判定

| 渠道 | 判定 | 依据 |
|---|---|---|
| Vercel | **协议兼容，差一把 key**（本机不可用） | 文档级匹配：base `https://ai-gateway.vercel.sh/typesafe`，文档原文 "POST /typesafe/v1/systemone evaluates state against typed questions; GET /typesafe/v1/models lists the evaluation models available to you"；cURL 示例与 OMP judgment 请求逐字段同构（Authorization: Bearer、body={model,state,questions{noul/instructions}}），响应含 answers。OMP 拼接规则下 TYPESAFE_BASE_URL 须含 /typesafe 路径段；配成 gateway 根会落到未文档化的 /v1/systemone（根路径只有 /v1/evaluate 与 OpenAI 兼容端点，evaluation 明确不支持 OpenAI/Anthropic/Cohere 兼容端点）。本机无任何 Vercel/AI Gateway 凭据（env/auth.json/CLI 全无）→ 实测只会 401，跳过。解锁：dashboard 建 AI Gateway API key 配 TYPESAFE_BASE_URL=https://ai-gateway.vercel.sh/typesafe。注意 2026-09-25 促销价 0 截止，之后按输入计费；免费档模型子集未确认含 jev。 |
| Netlify | **协议兼容，前置重**（本机不可用） | 纯透传 TypeSafe 原生协议（文档原文 "served directly by the AI Gateway, using each provider's own API... not routed through OpenRouter"）；SDK 源码（typesafe-sdk-js client.ts）拼 `/v1/systemone`，与 OMP 形状逐字吻合。但凭据只在 Netlify 计算上下文自动注入（TYPESAFE_API_KEY/TYPESAFE_BASE_URL），且 Limitations 第 1 条原文 "Using the AI Gateway requires that the site has had at least one production deployment in the past."——必须至少生产部署过一次站点。本机四前置全缺（CLI 未装、无 token、无已部署站点、auth.json 无条目）→ 实测跳过。额度约束：300 credits/月账户共享（≈$1.67 模型用量）+ 90 credits/分钟，对高频 judgment 是硬瓶颈。 |
| Cloudflare | **不兼容，需 shim** | 无任何端点路径与请求体同 OMP 硬编码匹配（含 AI Gateway 四端点全部公开 API）。统一端点要求 body 为 `{"model":"typesafe/jev","input":{state,questions}}`——state/questions 包在 input 里、model 是兄弟字段，与 OMP 扁平 `{state,model,questions}` 两个差异都不匹配；旧式 per-model 端点走 CF envelope `{result,success,errors,messages}` 也无 /v1/systemone 形状；AI Gateway 四端点（/ai/run、/ai/v1/chat/completions、/ai/v1/responses、/ai/v1/messages）均挂在 `/accounts/{account_id}/ai/*` 下，无路径别名机制。**响应侧兼容**：CF 返回原生 JSON 顶层就是 `answers`。接入须翻译 shim（Cloudflare Worker 或本地代理）：收 OMP 原样请求 → 转 CF REST 形状 → 回传 answers。免费额度 10,000 neurons/天（文档原文），jev neurons 单价需登录 dashboard（未公开）。 |

已实测可用渠道（2026-09-19 时点）：**仅 OpenCode Zen 一家**（GET models 200、匿名 POST 200；真 key POST 因免费日额度耗尽 429，UTC 午夜重置）。
