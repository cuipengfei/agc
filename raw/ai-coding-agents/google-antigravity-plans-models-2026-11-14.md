# Google Antigravity 套餐、价格、模型矩阵与配额规则摘录

> Source: https://antigravity.google/pricing ; https://antigravity.google/docs/plans/ ; https://antigravity.google/docs/models/ ; https://antigravity.google/docs/enterprise/ ; https://antigravity.google/blog/changes-to-antigravity-plans/ ; https://one.google.com/about/google-ai-plans/ ; https://www.forbes.com/sites/paulmonckton/2026/10/25/google-ai-pro-argon-antigravity-pixel-plan/ ; https://discuss.ai.google.dev/t/pro-trial-is-not-a-trial-of-ai-pro/190857 ; https://www.codeagentswarm.com/en/guides/antigravity-plans-and-pricing
> Collected: 2026-11-14
> Published: Unknown

验证级别：`[DOC]` = 官方页面摘录及官方论坛回复；`[MEDIA]` = 第三方媒体或分析页面摘录；`[UNVERIFIED]` = 本次会话未实测。多来源文件的各篇发布日期在对应小节标明。

## 1. `https://antigravity.google/pricing` 摘录（`[DOC]`）

```markdown
## For Individuals $0/month
Experience Antigravity without a subscription plan

Plan includes:
- Access to a variety of agent models
- Unlimited Tab completions
- Unlimited Command requests
- Basic weekly rate limits

## Google AI Pro
Everything in Individual and:
- More rate limits
- Flexible AI credit pool

## Google AI Ultra
Everything in Pro and:
- Even more rate limits
- Flexible AI credit pool

## Business plan via Google Cloud
Google Cloud customers can now access the Antigravity app, CLI, and through IDEs via Antigravity IDE extensions.

Available now:
- Access via API with consumption-based pricing
- Available to eligible Gemini Enterprise customers:
  - Standard/Plus plans starting at $30 USD per seat per month
  - Pay-as-you-go plan with $0 seat fee and consumption based pricing
```

## 2. `https://antigravity.google/docs/plans/` 摘录（`[DOC]`）

```markdown
Rate limits and model availability differ based on your Google AI plan. Refer to Models for a breakdown of model availability.

## Baseline quota

All plans receive the following baseline features:
- Use of Gemini models, including Gemini 4 Hydrogen, Gemini 3.8 Flash, and other offered Gemini Enterprise models as the core agent model
- Unlimited Tab completions
- Access to all product features, such as scheduled tasks and the CLI

Users on Google AI Ultra receive the following benefits:
- The highest, most generous quota, refreshed every five hours
- The highest weekly rate limits
- Access to third-party models

Users on Google AI Pro receive the following benefits:
- A high, generous quota, refreshed every five hours until the weekly limit is reached
- A higher weekly rate limit

Users not on Google AI Pro or Ultra plans receive the following benefits:
- A meaningful quota, refreshed weekly
- A weekly rate limit

The baseline rate limits are primarily determined by available capacity and exist to prevent abuse. Under the hood, the rate limits correlate with the amount of work done by the agent, which can differ from prompt to prompt. As a result, you receive more prompts when your tasks are straightforward and the agent can complete the work quickly, while more complex tasks consume more quota.

## Overages

Users on Google AI Pro or Ultra plans can use purchased AI credits (or any one-time promotional credits) for additional overage usage above the baseline quota. AI credits are consumed at standard Gemini Enterprise consumption pricing.

Once you exhaust the baseline quota for a particular model, credit usage is controlled by the AI Credit Overages user setting, which you can set to one of the following options:
- Never: Never use AI credits automatically; wait until the baseline quota refreshes before using this model further.
- Always: Always use AI credits when the baseline quota is exhausted (automatically switches back to using the baseline quota once it refreshes).

## Other

There is currently no support for the following options:
- Bring-your-own-key (BYOK) or bring-your-own-endpoint for additional rate limits
- Organizational tiers through a custom contract
```

## 3. `https://antigravity.google/blog/changes-to-antigravity-plans/`（Published: 2026-05-19，`[DOC]`）

```markdown
# Changes to Antigravity plans
The Antigravity Team · May 19, 2026 · 3 min read

## New Google AI Ultra tier
Previously, Antigravity users had two Google AI subscription options: the $20/month Google AI Pro plan, which provides an entry-level quota for experimentation, and the $250/month Google AI Ultra plan, which offers the highest quota to use Antigravity as a daily driver.

We are now introducing a new $100/month Google AI Ultra plan for users with lighter, regular development needs, and reducing the price of our top-tier AI Ultra plan from $250 to $200 per month.

## Shared quota across Gemini models
Until now, users had separate rate limits for Gemini Flash and Gemini Pro models. Now, we are combining these into a single rate limit, drawn down according to API pricing, allowing you to get more of whichever model you prefer. For example, if Gemini Flash is 8x cheaper than Gemini Pro according to API pricing, you can use X tokens on Gemini Pro, 8X tokens on Gemini Flash (assuming the same ratio of input, output, and cache read tokens), or any linear combination in between.

Because of capacity limitations for non-Gemini models, they remain on a separate fixed rate limit.

## Standardized multipliers across tiers
The $100/month Ultra plan has a rate limit of 5X worth of tokens compared to the $20/month Pro plan, and the $200/month Ultra plan has a rate limit of 20X worth of tokens compared to the $20/month Pro plan. This ratio also applies during promotional periods when we have access to excess capacity.

## AI credits
Google is simplifying subscriptions by removing AI credits from the base Google AI plans. Accordingly, we have adjusted the base plan entitlements upward for Gemini models on Antigravity. AI credits are now used solely as an overage mechanism. For a limited time, we’re offering new and existing Google AI Ultra subscribers USD $100 in bonus AI credits for Antigravity that apply if you reach your plan’s quota limit—claim the offer in your Antigravity App. The offer expires May 25, 2026. Terms apply.
```

## 4. `https://one.google.com/about/google-ai-plans/` 与价格来源核对（`[DOC]` + `[MEDIA]`）

- `https://one.google.com/about/google-ai-plans/` 页面直接抓取时：
  - 套餐对比表列出四个消费级付费列：`Google AI Plus`、`Google AI Pro`、`Google AI Ultra 5x`、`Google AI Ultra 20x`；其中 `Google AI Developer tools (Antigravity, Gemini CLI)` 一行对四档分别写为 `Limited agent requests`、`Expanded agent requests`、`Higher agent requests`、`Highest agent requests`。
  - 页面内 `Google AI Pro bundle` 套餐折算段显式写出 `$19.99/mo`（对比单独购买 `$59/mo`，节省 `$39`，最多 5 人共享折合 `$6.67/mo`）；四个主套餐卡片的月费数字由前端动态注入，静态抓取显示为空。
- 完整四档美元标价来自同日检索到的 `one.google.com/about/google-ai-plans/` 搜索引擎摘要及第三方核验文 `https://www.codeagentswarm.com/en/guides/antigravity-plans-and-pricing`（Updated October 31, 2026）：

```markdown
| Plan                | Price            | What changes                                                                           |
| ------------------- | ---------------- | -------------------------------------------------------------------------------------- |
| Individual (free)   | $0               | A variety of agent models, basic weekly rate limits                                    |
| Google AI Plus      | $4.99/month      | Limited agent requests, same models as free                                            |
| Google AI Pro       | $19.99/month     | Expanded rate limits, Gemini 4 Argon, Claude Opus and Sonnet 5.5, flexible credit pool |
| Google AI Ultra 5x  | $99.99/month     | Higher agent requests                                                                  |
| Google AI Ultra 20x | $199.99/month    | Highest agent requests                                                                 |
| Organisation        | Via Google Cloud | Standard or Plus seats from $30/month, or pay as you go with no seat fee               |
```

## 5. `https://antigravity.google/docs/models/` 摘录（`[DOC]`）

```markdown
Most adjustable Gemini models offer `Low`, `Medium`, and `High` thinking levels. **Gemini 4 Hydrogen** defaults to `High` and adds a fourth level labeled **`Extra`** in the model selector, which sets the **Extra High** reasoning budget (`xhigh` in the Antigravity CLI, such as `--model gemini-4-hydrogen-xhigh` or `--effort xhigh`) when a task needs maximum reasoning depth.

## Reasoning model

For the core reasoning model, Antigravity offers leading frontier models. Availability depends on your plan:

| Model                                                              | Free & Google AI Plus | Google AI Pro | Google AI Ultra | Enterprise |
| ------------------------------------------------------------------ | --------------------- | ------------- | --------------- | ---------- |
| Gemini 4 Carbon                                                    | ❌                     | ❌             | ✅               | ✅          |
| Gemini 4 Argon                                                     | ❌                     | ✅†            | ✅               | ✅          |
| Gemini 4 Hydrogen                                                  | ✅                     | ✅             | ✅               | ✅          |
| Orchestrator (Carbon)                                              | ❌                     | ❌             | ✅               | ❌          |
| Orchestrator (Argon)                                               | ❌                     | ✅†            | ✅               | ❌          |
| Gemini 3.8 Flash                                                   | ✅                     | ✅             | ✅               | ✅          |
| Gemini 3.7 Flash                                                   | ❌                     | ❌             | ❌               | ✅          |
| Gemini 3.6 Flash                                                   | ❌                     | ❌             | ❌               | ✅          |
| Gemini 3.1 Pro                                                     | ❌                     | ❌             | ❌               | ✅          |
| Claude Sonnet 5.5 (thinking)**                                     | ❌                     | ✅**           | ✅               | ✅          |
| Claude Opus 5.5 (thinking)**                                       | ❌                     | ✅**           | ✅               | ✅          |
| Claude Sonnet 4.6 (thinking)*                                      | ✅                     | ✅             | ❌               | ❌          |
| Claude Opus 4.6 (thinking)*                                        | ✅                     | ✅             | ❌               | ❌          |
| GPT-OSS-120b*                                                      | ✅                     | ✅             | ✅               | ❌          |

* Will be removed on November 18, 2026.

** Available on Google AI Pro for non-trial subscriptions only. To cancel your trial and switch to a paid Google AI Pro plan, submit a request (https://one.google.com/support).

† Available with paid Google AI Pro plans or on trial with eligible premium devices. To switch to a paid Google AI Pro plan, submit a request (https://one.google.com/support).

## Orchestrator

| Model selector option | Planner | Implementation | Available on |
| --- | --- | --- | --- |
| **Orchestrator (Carbon)** | **Gemini 4 Carbon** | Gemini 4 Hydrogen | Google AI Ultra |
| **Orchestrator (Argon)** | **Gemini 4 Argon** | Gemini 4 Hydrogen | Google AI Ultra, Google AI Pro (paid plans, or trials on eligible premium devices) |

## Additional models

- **Nano Banana 2**: Used by the generative image tool when the agent produces a UI mockup, generates images to populate a web page or application, creates system or architecture diagrams, or performs other generative image tasks.
```

## 6. `https://antigravity.google/docs/enterprise/` 摘录（`[DOC]`）

```markdown
You can connect Antigravity to Gemini Enterprise in two ways:
- Google Cloud project and API: Connect directly using a Google Cloud project with an invoiced Cloud Billing account and the `roles/discoveryengine.agentspaceUser` Identity and Access Management (IAM) role for consumption-based billing.
- Gemini Enterprise license: Connect with your Gemini Enterprise Standard or Gemini Enterprise Plus seat license to get access to included first-party quotas, managed overages, and centralized administrative controls across the Antigravity App, Antigravity CLI (`agy`), and Antigravity IDE extensions. No separate per-user Antigravity license is required.

| Model | CLI / API Identifier | Enterprise |
| --- | --- | --- |
| Gemini 4 Carbon | `gemini-4-carbon` | ✅ |
| Gemini 4 Argon | `gemini-4-argon` | ✅ |
| Gemini 4 Hydrogen | `gemini-4-hydrogen` | ✅ |
| Orchestrator (Carbon) | — | ❌ |
| Orchestrator (Argon) | — | ❌ |
| Gemini 3.8 Flash | `gemini-3.8-flash` | ✅ |
| Gemini 3.7 Flash | `gemini-3.7-flash` | ✅ |
| Gemini 3.6 Flash | `gemini-3.6-flash` | ✅ |
| Gemini 3.1 Pro | `gemini-3.1-pro-preview` | ✅ |
| Claude Sonnet 5.5 (thinking) | `claude-sonnet-5-5-<level>`* | ✅** |
| Claude Opus 5.5 (thinking) | `claude-opus-5-5-<level>`* | ✅** |
| Claude Sonnet 4.6 (thinking) | — | ❌ |
| Claude Opus 4.6 (thinking) | — | ❌ |
| GPT-OSS-120b | — | ❌ |

* Available at four thinking levels (<level>): low, medium (default), high, and max (for example, claude-opus-5-5-high or claude-sonnet-5-5-max).
** Third-party partner models require administrator opt-in in the Google Cloud Console and are billed by token consumption. First-party Gemini models are enabled by default and draw from pooled edition seat credits ($10/month Standard, $15/month Plus).
```

## 7. 设备附赠试用版（`eligible premium devices`）背景摘录（`[DOC]` + `[MEDIA]`）

- 官方论坛 `https://discuss.ai.google.dev/t/pro-trial-is-not-a-trial-of-ai-pro/190857`（2026-10-19 至 2026-10-28）：
  - 一名用户报告购买 Pixel 10 Pro 兑换 12 个月 AI Pro 试用（标称价值 `$239.88`）后被排除在付费 AI Pro 模型之外；
  - 一位论坛支持人员于 2026-10-22 回复：`Gemini 4 Argon is available with paid Google AI Pro plans or via a trial on eligible premium devices. To upgrade to a paid Google AI Pro plan, submit a request (https://one.google.com/support).`
- Forbes 报道 `https://www.forbes.com/sites/paulmonckton/2026/10/25/google-ai-pro-argon-antigravity-pixel-plan/`（Paul Monckton，2026-10-25）：

```markdown
Google’s product documentation has been updated to reflect the changes, which now give some promotional users with “eligible premium devices” access to Argon in Antigravity, just like those on paid plans.

I’ve noticed the change on my own account, along with the unexpected addition of third-party Opus 5.5 and Sonnet 5.5 models from Anthropic, both of which remain officially available only to paying subscribers.

## Timeline Of Argon Availability In Antigravity
- **Oct 23:** Argon, Opus 5.5 and Sonnet 5.5 become available in Antigravity for some promotional subscriptions.

## What Google Still Hasn’t Explained
I’ve seen no official definition of what counts as an eligible premium device and not all promotional plans appear to have received the upgraded AI models. Furthermore, there’s no official statement regarding the newer Opus 5.5 and Sonnet 5.5 models, which officially remain available for “non-trial” subscriptions only, despite showing up in Antigravity for some promotional accounts.
```

## 8. 未测边界（`[UNVERIFIED]`）

- 本次未登录 Google One 结账页实测各地区实时税后价格。
- 官方未公布任何套餐的绝对 token 数或请求次数基准。
