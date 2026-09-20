# Jev（TypeSafe System One）多渠道定价与免费额度核验（2026-09-19 会话材料汇编）

> Source: OMP vibe 会话（2026-09-19）worker transcripts：jev-signup-research / jev-pricing-compare / jev-modelsdev-check / omp-zen-jev-catalog / vercel-jev-verify / netlify-jev-verify / cloudflare-jev-verify / openrouter-jev-test + 主会话 Main 回复（含修正记录）+ /tmp/or-jev2.json（OpenRouter API 实测响应）；定价句均本轮重新抓取逐字复验
> Collected: 2026-09-19
> Published: Unknown

证据分级标签：**实测**＝本会话实际运行/抓取所得；**文档原文**＝官方页面/文档逐字引用；**推断**＝由证据推得但未直接证实；**未验证**＝未能核实。

## ① TypeSafe 直连定价与 waitlist

发布博客 https://typesafe.ai/blog/introducing-system-one-models-and-jev（**文档原文**，逐字）：

> "Input tokens: $0.042 / MTok ($42 per billion tokens)."
> "Output tokens: FREE (too cheap to meter)."
> "We can't prove it isn't subsidized; we'll need the long-term to prove the sustainability of our pricing (which we expect to go down, not up)."
> "Today, we are opening [early access](../) and bringing developers off the waitlist as quickly as we can."

- 首页对应句（文档原文）："$42 / Per Billion input tokens."
- 发布日 **2026-09-15**（博客标注 "Sep 15, 2026"）；创始人 **Diogo Almeida**（署名 "*Diogo Almeida, founder, TypeSafe*"），自述 OpenAI 出身（"At OpenAI, I helped build the methods that made language models useful..."）。
- API key 获取（https://docs.typesafe.ai/introduction/quickstart 文档原文）："1. **Get your API key** from the [dashboard](https://console.typesafe.ai/keys)"；"POST https://api.typesafe.ai/v1/systemone"；"Authorization: Bearer <API_KEY>"。
- waitlist 按钮（实测：fetch typesafe.ai 原始 HTML，regex 命中 2 处 desktop/mobile 变体）：`href="https://jobs.ashbyhq.com/typesafe-ai?utm_source=<REDACTED>"`（utm_source 个人追踪参数已脱敏）。
- 无公开免费额度：MCA §8.2(b)（https://typesafe.ai/legal/mca 文档原文）："TypeSafe may, but has no obligation to, issue Promotional Credits to Customer."；§8.2(a)：额度耗尽且未开自动续充时 "TypeSafe may decline to generate Output in response to Customer's submission of Input."

## ② models.dev api.json 的 jev 条目对账（实测抓取 api.json 4.7MB + 模型页）

页面 https://models.dev/models/typesafe/jev-latest/：Providers 数 **6**＝6 行 serving 条目，去重后仅 4 个 provider id（opencode 占 3 行）。api.json 中 id 含 jev 的条目**共 6 条**（逐字摘录，共同字段：description "System One model for fast, typed probabilistic decisions over text or structured state"、release_date/last_updated 2026-09-15、structured_output true、tool_call false、reasoning false、attachment false、temperature false、open_weights false、modalities text/text）：

| provider | model id | limit.context | limit.output | cost |
|---|---|---|---|---|
| cloudflare-ai-gateway | typesafe/jev | 32000 | 0 | input 0.042, output 0, cache_read 0（多一个 cache_read 字段） |
| opencode | jev-latest | 64000 | 0 | input 0.042, output 0 |
| opencode | jev-1.13 | 64000 | 0 | input 0.042, output 0 |
| opencode | jev-1.13-free | 64000 | 0 | **input 0, output 0** |
| vercel | typesafe-ai/jev | 64000 | 0 | input 0.042, output 0 |
| vivgrid | jev | 64000 | 0 | input 0.042, output 0 |

- **注意（实测事实）**：api.json **不存在 provider "typesafe" 顶层条目**；"typesafe/jev" 这个 id 挂在 cloudflare-ai-gateway 名下。与「六家含 typesafe 直连」的预期口径不同，以本条为准。
- opencode provider 顶层条目（逐字）：`{"id":"opencode","name":"OpenCode Zen","api":"https://opencode.ai/zen/v1","doc":"https://opencode.ai/docs/zen","env":["OPENCODE_API_KEY"],"npm":"@ai-sdk/openai-compatible"}`。
- 对账判定：官方价 input $0.042/MTok + output FREE 与 api.json cost 层**一致**；页面渲染 "$0.04 / $0.00" 与 meta "$0.00 / $0.00" 是展示层舍入/失真（jev-1.13-free 的 $0.00/$0.00 才为真）；Cloudflare 条目 ctx 32000 与 CF 文档一致；**OpenRouter 不在 models.dev 的 6 个 provider 中**。

## ③ OpenCode Zen 文档原文（https://opencode.ai/docs/zen/，实测抓取逐字）

- Endpoints 表：`| Jev 1.13 Free | jev-1.13-free | https://opencode.ai/zen/v1/systemone | - |`；同表 `| Jev 1.13 | jev-1.13 | ... /systemone | - |`。
- Pricing 表（per 1M tokens）：`| Jev 1.13 Free | Free | Free | - | - |`；`| Jev 1.13 | $0.042 | Free | - | - |`——与 api.json 完全一致（0/0 与 0.042/0）。
- 免费模型说明（文档原文）：**"Jev 1.13 Free is available on OpenCode for a limited time."**（限时免费变体，非 TypeSafe 官方定价）。

## ④ Vercel AI Gateway

- 模型页 https://vercel.com/ai-gateway/models/jev（实测抓 HTML/JSON-LD/markdown 快照，文档原文）："**Pricing:** $0.042/1M input tokens"；"**Model ID:** `typesafe-ai/jev`"；`"inputCost":"0.042","outputCost":"0"`；JSON-LD `"description":"Input: 0.042/token, Output: 0/token"`；促销横幅（`data-slot="note-content"` div 内原样）：`Promotional pricing ends on <!-- -->September 25, 2026<!-- -->.`；当前 offer 价 `"price":"0"`（促销窗内 $0）；规格表对勾 SVG `aria-label="Free Tier: Yes"`。
- evaluation 端点文档（https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe 文档原文）："POST /typesafe/v1/systemone evaluates state against typed questions; GET /typesafe/v1/models lists the evaluation models available to you"。
- pricing 页（文档原文）："**AI Gateway charges no markup and no platform fee on tokens.**"；FAQ 原文："The free tier is a monthly included credit, not an expiring trial. It covers a subset of models with lower per-model rate limits."（每月免费 credit **金额未注明**；网络摘要称 $5/月但 pricing 页原文无此数字，不予采信——未验证）。
- 本机凭据核查（只报存在性）：env 无 VERCEL_API_KEY/AI_GATEWAY_API_KEY；opencode auth.json 8 条目无 vercel；~/.config/vercel、~/.vercel 不存在；vercel CLI 未装 → 实测跳过（实测只会 401，不产生有效证据）。

## ⑤ Netlify AI Gateway

- 纯透传、非 OpenAI 兼容（文档原文）："served directly by the AI Gateway, using each provider's own API. These are the models listed below, and they are not routed through OpenRouter."；SDK 源码佐证（typesafe-sdk-js main/src/client.ts）：stripTrailingSlashes(baseURL) 后拼 `/v1/systemone`，DEFAULT_BASE_URL=https://api.typesafe.ai。
- changelog（https://www.netlify.com/changelog/typesafe-jev-ai-gateway/ 文档原文）："TypeSafe's Jev model is now available through Netlify's AI Gateway with zero configuration required. Install @typesafe-ai/sdk and use it directly in your Netlify Functions — no API keys to create, no provider config, no base URLs to wire up. AI Gateway handles credentials automatically, and usage is billed to your Netlify credits like every other model in the gateway."
- Overview（文档原文）："By default, Netlify automatically sets the appropriate environment variables that AI client libraries typically use for configuration, in all Netlify compute contexts (e.g., Netlify Functions, Edge Functions, Preview Server, etc.)."——只在 Netlify 计算上下文注入 `TYPESAFE_API_KEY`/`TYPESAFE_BASE_URL`，官方不公布固定网关主机名（二级检索指向 ai-gateway.netlify.com，未在官方文档确认，**未验证**）。
- 免费条款（文档原文）：netlify.com/pricing "Free — $0 forever" … "300 credit limit / month"（账户级共享，非 AI Gateway 专属）；换算 "Netlify then converts every $1 USD spent on AI model usage to 180 Netlify credits." / "Each dollar equals 180 credits."；jev 行 "TypeSafe jev-1.13.0 **$0.04** N/A **$0.00** N/A"（jev-latest、jev-preview 同价）→ **7.2 credits/1M input**＝0.04×180（**推断**算术，非原文）；300 credits/月 ≈ 41.7M 输入 token 等值（推断）。Free 档速率限制 90 credits/分钟（Personal 450 / Pro 1,800 / Enterprise 9,000）；额度用尽不收费、不自动充值、不结转。
- 使用前提（Limitations 第 1 条，文档原文）："Using the AI Gateway requires that the site has had at least one production deployment in the past."；Overview："A project must have a production deploy for the AI Gateway to activate"。
- 本机条件：netlify CLI 未装、无 NETLIFY_AUTH_TOKEN、无已部署站点（工作区无 netlify.toml/.netlify）、auth.json 无 netlify 条目 → 四前置全缺，实测跳过。

## ⑥ Cloudflare Workers AI

- 免费额度（https://developers.cloudflare.com/workers-ai/platform/pricing/ 文档原文，页面标注 2026-09-17 更新）："Our free allocation allows anyone to use a total of **10,000 Neurons per day at no charge**."；"All limits reset daily at 00:00 UTC. If you exceed any one of the above limits, further operations will fail with an error."；Paid 超量 "$0.011 / 1,000 Neurons"。
- jev 模型页（https://developers.cloudflare.com/ai/models/typesafe/jev/ 文档原文）：Pricing 行仅 "View pricing in the Cloudflare dashboard ↗" → **neurons 单价未公开，需登录 dashboard**（**未能复验**数字）。
- REST 调用（input 包装 body，文档原文）：`curl https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/ai/run --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN" --data '{"model": "typesafe/jev", "input": {"state": ..., "questions": {...}}}'`，响应顶层即 `answers`。
- 本机凭据：wrangler v4.135.0 已装，~/.config/.wrangler/config/default.toml 有 oauth_token（access token 2026-08-04 已过期，refresh 未实测）；无 CLOUDFLARE_API_TOKEN env。

## ⑦ OpenRouter

- 模型页 https://openrouter.ai/typesafe/jev-1.13/（实测抓页面内嵌 flight-data/JSON-LD，文档原文）：`"pricing":{"prompt":"0.000000042","completion":"0","discount":0,...}`；JSON-LD `"name":"Input Price","price":0.042,"priceCurrency":"USD","unitText":"per 1M tokens"`；meta description "$0.042 per million input tokens, $0 per million output tokens"；`"is_free":false`；modality **"text->decisions"**（与 /tmp/or-jev2.json 实测 API 响应同字段，context_length 32000、max_completion_tokens 28800）。
- /typesafe/jev-latest 是**软 404**：HTTP 200 但 flight-data 渲染 404 组件（原文 `"NotFoundFooter"`、`1d:"404: Not Found"`、路由节点 `"slug","jev-latest","d",["private-model-redirect"]`）；公开目录 API（447 个模型）无任何 typesafe/jev 条目——jev-latest 在 OpenRouter 无有效页面。
- **无 :free 变体**（:free 后缀 404）。
- FAQ（https://openrouter.ai/docs/faq 文档原文）："All new users receive a small free allowance to test out OpenRouter."（**金额未注明**）；"We pass through the pricing of the underlying providers; there is no markup on inference pricing."
- judgment 端点实测：`POST https://openrouter.ai/api/alpha/decisions` → 200，单次成本 **$0.000011928**，响应形状兼容 OMP judge() parser（详见 `raw/ai-coding-agents/2026-09-19-jev-omp-compatibility-probes.md`）。

## ⑧ 修正记录：「OpenRouter 免费 allowance」≠「免费 jev」

- 错误表述（2026-09-19 早些时候 Main 回复）：把 OpenRouter 列进「能免费试用的渠道」之一，依据 FAQ「a small free allowance」。
- 用户质证（2026-09-19T17:08Z，steering 原话）："wtf? earlier you said openrouter provide free jev, now it does not ? wtf?"
- 更正（Main 2026-09-19T17:09Z 回复要点）：「小额免费 allowance 是 OpenRouter 给**新用户的通用额度**，不是 jev 专属免费——它理论上能抵 jev 的付费调用，但金额官方没公布。我把『账户里有点通用免费额度』写成了『这家能免费试 jev』，这是过度推断。而且你的 OpenRouter 是老账号，新用户 allowance 大概率根本不存在（推断，未验证你的账户余额）。**OpenRouter 上没有免费 jev。** jev-1.13 是付费模型（$0.042/M 输入），且 modality 是 text->decisions、走 alpha 的 /api/alpha/decisions 端点，OMP 的 /v1/systemone 硬编码路径接不上。OpenRouter 这条路 dead on two counts：不免费，也接不进 OMP。」
- 教训：通用账户额度 ≠ 模型免费；免费渠道判定以模型级 is_free/定价为准。

## ⑨ Vivgrid（仅一句）

api.json 条目：`{id: vivgrid, name: Vivgrid, api: https://api.vivgrid.com/v1, doc: https://docs.vivgrid.com/models, env: [VIVGRID_API_KEY]}`；jev 条目与 vercel/opencode 同字段（cost 0.042/0、ctx 64000、2026-09-15）。api.json 只给 name/api/doc/env 四字段，无描述；按 doc URL 推断为模型托管/API 服务商（**推断**，背景未核实）。
