# Jev 七渠道定价与 OMP systemone 兼容性判定

> Sources: 本会话实测（zen/OpenRouter 探针 probe4/probe5、/tmp/or-jev2.json API 响应）, 2026-09-19; 本会话取证（typesafe.ai / opencode.ai / vercel.com / netlify.com / developers.cloudflare.com / openrouter.ai / models.dev 逐字抓取复验）, 2026-09-19; 本会话只读核查（本机凭据存在性）, 2026-09-19; 本会话实测（jevify 22 文件分类，实际模型 kimi-claw/k2d8-preview）, 2026-09-21
> Raw: [jev-channel-pricing-verification](../../raw/ai-coding-agents/2026-09-19-jev-channel-pricing-verification.md); [jev-omp-compatibility-probes](../../raw/ai-coding-agents/2026-09-19-jev-omp-compatibility-probes.md); [judgment-systemone-live-evidence](../../raw/omp/2026-09-20-judgment-systemone-live-evidence.md); [Zen jevify typesafe](../../raw/ai-coding-agents/2026-09-21-zen-jevify-typesafe.md)
> Updated: 2026-09-21

## Overview

OMP judgment 把请求**硬编码**为 `POST {base}/v1/systemone` + 扁平 body `{state, model, questions}`，因此「某渠道能不能给 OMP 当 judgment 后端」归结为一个问题：它是否原生暴露 `/v1/systemone` 路径且接受该 body 形状。2026-09-19 对七个渠道做了定价核验与兼容性判定，结论：**已实测可用的只有 OpenCode Zen 一家**（真 key 因免费日额度耗尽 429、匿名通道 200）；OpenRouter 不免费且路径不匹配，env 无解。

## OMP 请求形状与硬编码来源（pi-ai@18.2.6 源码直读）

- body（`typesafe.ts:101`）：`{state, model, questions}`，questions 形如 `{q1:{type:"noul", instructions:...}}`。
- 路径（`typesafe.ts:102, 144`）：`POST` path 固定 `"/v1/systemone"`，URL = baseUrl + path——**后缀硬编码，任何 base URL 都桥接不了别的路径形态**。
- headers（`typesafe.ts:145-146`）：`Authorization: Bearer <key>`、Accept、Content-Type: application/json。
- 响应要求（`typesafe.ts:103-110`）：`answers[id]` 必须存在且 type 与 question 一致；取 `model` 与 `usage.input_tokens/output_tokens`。
- model/baseUrl 只能经 env 改（`resolveJudge` 只传 apiKey，`pi-coding-agent/src/judgment/index.ts:97-99`；env 链详见 [OMP TypeSafe env 变量边界](../omp/judgment-typesafe-env-config.md)）。
- 重试：timeout 10s、MAX_ATTEMPTS 3、429/5xx 带 retry-after 感知退避（`typesafe.ts:58-61, 76-81, 168-170`）。

## 七渠道全景（定价与免费条款均为文档原文/实测）

| 渠道 | 输入定价 | 免费条款 | OMP systemone 兼容性 | 证据级别 |
|---|---|---|---|---|
| TypeSafe 直连 | $0.042/M，输出 $0 | 无公开免费额度（MCA §8.2(b)："TypeSafe may, but has no obligation to, issue Promotional Credits to Customer."） | 默认后端，原生匹配 api.typesafe.ai | 文档原文 |
| OpenRouter | $0.042/M（is_free:false，无 :free 变体） | 新用户 "All new users receive a small free allowance to test out OpenRouter."（金额未注明）；**无免费 jev**（见修正记录） | **不兼容**：OMP 形状 /api/v1/systemone 实测 404（Next.js 兜底）；jev 实际挂在 /api/alpha/decisions（实测 200，单次 $0.000011928），路径硬编码 env 无解 | 实测 |
| Vercel AI Gateway | $0.042/M；促销窗内 $0（横幅注明 2026-09-25 截止）；规格表 aria-label="Free Tier: Yes" | 每月 included free credit（金额未注明） | **协议兼容，差一把 key**：文档原文 "POST /typesafe/v1/systemone evaluates state against typed questions; GET /typesafe/v1/models lists the evaluation models available to you"；base 须含 /typesafe 段；本机无任何 Vercel 凭据，实测跳过 | 文档原文 |
| Netlify AI Gateway | $0.04/M＝7.2 credits/M（180 credits/$1） | Free 计划 300 credits/月（账户级共享，≈41.7M 输入 token 等值）；Free 档 90 credits/分钟 | **协议兼容，前置重**：纯透传原生协议（"served directly by the AI Gateway, using each provider's own API. These are the models listed below, and they are not routed through OpenRouter."）；但凭据只在 Netlify 计算上下文注入，且 "Using the AI Gateway requires that the site has had at least one production deployment in the past."——必须至少生产部署过一次站点 | 文档原文 |
| Cloudflare Workers AI | neurons 单价未公开（模型页仅 "View pricing in the Cloudflare dashboard"，需登录）；通用费率 $0.011/1k neurons | 每日 10,000 Neurons 免费，UTC 0 点重置："Our free allocation allows anyone to use a total of **10,000 Neurons per day at no charge**." | **不兼容，需 shim**：统一端点要求 body 包一层 `input`（`{"model","input":{state,questions}}`），AI Gateway 四端点均无 /v1/systemone 形状、无路径别名机制；响应顶层 answers 倒是兼容，接入须翻译 shim | 文档原文 |
| OpenCode Zen | jev-1.13 $0.042/M（输出 Free）；jev-1.13-free Free/Free，"Jev 1.13 Free is available on OpenCode for a limited time." | jev-1.13-free 限时免费（models.dev api.json cost 0/0、ctx 64000 佐证） | **已实测可用**：原生暴露 /zen/v1/systemone；GET /zen/v1/models 200（28 模型含 jev-1.13-free）；匿名 POST 200；真 key POST 429（免费日额度耗尽） | 实测 |
| Vivgrid | $0.042/M 同价（api.json 条目） | 未注明 | 未验证（仅 api.json 一行条目，api.vivgrid.com/v1） | 未验证 |

models.dev api.json 对账要点：jev 共 6 行 serving 条目（cloudflare-ai-gateway 的 typesafe/jev ctx 32000；opencode 三行 jev-latest/jev-1.13/jev-1.13-free ctx 64000；vercel 的 typesafe-ai/jev；vivgrid 的 jev），release_date 全部 2026-09-15；**api.json 无 provider "typesafe" 顶层条目**；"Providers 6" 数的是 provider-model 行而非 6 家独立 provider。

## zen 429 证据与额度重置（probe4.py，2026-09-19 16:35 UTC）

`POST https://opencode.ai/zen/v1/systemone`（真 key，model=jev-1.13-free）实测：`HTTP/1.1 429 Too Many Requests`，响应头逐行含 `Retry-After: 26654`、`Content-Length: 112`、`x-opencode-log-id: 9335b444-...`；响应体逐字 `{"type":"error","error":{"type":"FreeUsageLimitError","message":"Rate limit exceeded. Please try again later."}}`（112 字节）。

对照：同 key `GET /zen/v1/models` 返回 200、28 模型、无限流头——429 只打在 systemone 判断端点，不打 models 目录端点。

**推断（标注）**：`Retry-After: 26654` 的秒数从 16:35:47 GMT 起算正好到 UTC 午夜，强烈提示免费日额度按 UTC 0 点重置；额度数值、账号级还是 key 级，服务器未说明（未验证）。
> **Status: Outdated** (2026-09-20)
> 「免费日额度按 UTC 0 点重置」的推断被新证据推翻：429 的 `Retry-After` 两次观测仍恒指次日 UTC 午夜，但 2026-09-20 00:00 UTC 过后免费通道依旧 429——**重置周期未定，`Retry-After` 不是可靠的重置时间预测器**（它只是到 UTC 午夜的秒数）。另补充两条时点观察（2026-09-20 快照，非承诺）：免费池与付费余额相互独立（账户充值后免费模型通道仍 429，充值不解锁免费池）；付费通道首发请求曾 200 空 body（激活窗口），随后稳定。本节及其后结论 1 中「等 UTC 午夜额度重置」的表述均不再成立。证据见 [judgment-systemone-live-evidence](../../raw/omp/2026-09-20-judgment-systemone-live-evidence.md)。

## 四组对照实验（probe5.py，2026-09-19 16:42 UTC）

| 组 | 状态 | 关键响应 | 结论 |
|---|---|---|---|
| A 无 key（无 Authorization 头） | 200 OK | 真实判断结果，body 逐字含 `"cost":"0"`（q1 noul=0.99，usage 276/21 tokens） | systemone 免费层当前允许**完全匿名调用**，不触碰账号限额 |
| B 假 key（合成占位符） | 401 Unauthorized | `{"type":"error","error":{"type":"AuthError","message":"Invalid API key."}}` | 服务端先校验 key 合法性，假 key 进不了额度检查 |
| C 真 key + jev-1.13-free | 429 | FreeUsageLimitError，`Retry-After: 26251`，与距 UTC 午夜秒数只差 1s | 免费额度已耗尽，二次确认 UTC 午夜对齐 |
| D 真 key + ling-3.0-flash-fin-free | 503 | `{"error":{"type":"server_error","message":"Upstream request failed: Endpoint is unavailable."}}` | 该免费模型上游端点不可用；503 盖住了「429 是否 jev 专属」的信号 |

三道闸结论：**匿名免费 200 / 假 key 401 / 真 key 429**——限额绑定在认证身份上，匿名通道绕过限额。边界：①「429 是否对全部免费模型共享同一限额池」本次证据无法判定（D 组被 503 盖住）；②「账号级 vs key 级」无法判定——只有一个 key，做不了同账号多 key 对照，需第二 key 或换账号真 key 才能区分。

## 修正记录：「OpenRouter 免费 allowance」≠「免费 jev」

本会话早些时候曾把 OpenRouter 列进「能免费试用的渠道」，依据 FAQ 原文 "All new users receive a small free allowance to test out OpenRouter."。用户质证（2026-09-19 原话："wtf? earlier you said openrouter provide free jev, now it does not ? wtf?"）后更正：

- 「小额免费 allowance」是 OpenRouter 给**新用户的账户通用额度**，不是 jev 专属免费；把「账户里有点通用免费额度」写成「这家能免费试 jev」是过度推断（该账户为老账号，allowance 是否存在未验证）。
- 实测确认：jev-1.13 在 OpenRouter 上 $0.042/M、is_free:false、无 :free 变体、modality text->decisions、走 /api/alpha/decisions——**OpenRouter 上没有免费 jev，且路径接不进 OMP**（"dead on two counts：不免费，也接不进 OMP"）。
- 教训：免费渠道判定以模型级 is_free/定价为准，账户通用额度不算模型免费。

## Zen 模型目录实测（2026-09-21）

`GET https://opencode.ai/zen/v1/models` 返回 200，约 30 个模型。可见：

- `jev-1.13-free`
- `jev-1.13`

`jev-latest` 探针（最小 System One POST）返回：

```text
HTTP 400 "Model is unavailable."
```

## 结论

截至 2026-09-19：

1. **已实测可用的 judgment 渠道仅 OpenCode Zen 一家**（配置见 [env 文章](../omp/judgment-typesafe-env-config.md)；匿名通道即刻可用但属未承诺行为；~~真 key 等 UTC 午夜额度重置~~ 已被 2026-09-20 证据推翻，见上文 Status: Outdated 块）。
2. Vercel（协议兼容、差 key）与 Netlify（协议兼容、需部署站点激活）是文档级候选，本机均未实测；Vercel 促销 $0 价 2026-09-25 截止。
3. OpenRouter 与 Cloudflare 都需要 shim 或上游改动，env 层面无解。
4. 各渠道输入定价基本一致（$0.042/M，Netlify 表取整 $0.04），选渠道不该看价格，该看免费条款与 OMP 路径兼容性。

## 证据边界

- Vercel/Netlify/Cloudflare 三家为文档级判定（无本机凭据或前置不满足，按门控跳过实测）；其「兼容」均指协议形状匹配，未做过真实 POST。
- Cloudflare jev neurons 单价、Vercel 每月免费 credit 金额、OpenRouter allowance 金额，三处官方均未公开，未能复验。
- zen 匿名 200 是当日实测行为，是否长期可用未验证；jev-1.13-free 官方标注限时免费（见全景表 Zen 行引文）。

## See Also

- [Jev 在 OMP、Codex、OpenCode 的现成集成盘点](jev-host-integrations.md)
- [OMP judgment /v1/systemone 协议面：题型 schema、传输参数、观测点与兼容端点](../omp/judgment-systemone-protocol.md)
- [OMP TypeSafe env 变量边界、.env 加载链与 zen 免费 jev 接入](../omp/judgment-typesafe-env-config.md)
