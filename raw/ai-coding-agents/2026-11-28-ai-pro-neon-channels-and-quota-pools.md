# Gemini 4 Neon 发布与 AI Pro 四额度池渠道摘录

> Source: Google 官方博客 Introducing Gemini 4 Neon（blog.google，2026-11-18 发布、2026-11-23 更新）；gemini.google/subscriptions 订阅页；aistudio.google.com/docs/google-ai-plans；aistudio.google.com/docs/pricing；aistudio.google.com/docs/rate-limits；aistudio.google.com/docs/models/gemini-4-neon；aistudio.google.com/docs/aistudio-build-mode；support.google.com/gemini/answer/16275805；antigravity.google/docs/overview、/docs/install、/docs/cli/acp、/docs/ide/extensions/acp，均 2026-11-28 采集
> Collected: 2026-11-28
> Published: 博文 2026-11-18；其余文档无版本日期，标 Unknown

## 1. Neon 发布博客（blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-neon 原文摘录）

发布日期：Nov 18, 2026（Last updated November 23, 2026）。

```text
The model is priced at $3 per million input tokens ($0.15 per million cached input tokens, a 95% discount) and $15 per million output tokens, with a 1 million-token context window.
```

铺货渠道原文：

```text
Gemini 4 Neon is rolling out today in the Gemini API in Google AI Studio, Gemini for business (via API and model dropdown), for paid Google AI Pro and Ultra subscribers in Google Antigravity, and for Pro and Ultra subscribers in the Gemini app.
```

开发渠道原文：

```text
- For developers: Build with the Gemini API paid tier in Google AI Studio and Android Studio. If you're a paid Google AI Pro or Ultra subscriber, you can try Neon in Google Antigravity and all Pro and Ultra subscribers can try it in AI Studio.
- For enterprises: Use Gemini 4 Neon in Gemini for business (via the API or model drop-down) and Google Antigravity.
- For consumers: If you're a Google AI Pro or Ultra subscriber, you can select Gemini 4 Neon from the model drop-down in the Gemini app.
- For cybersecurity defenders: Eligible Fairwind Program members will begin receiving access over the next few days.
```

Antigravity 内的 Orchestrator 描述：

```text
...whether running standalone or acting as a fast, high-judgment Orchestrator directing parallel Hydrogen subagents in Google Antigravity.
```

## 2. 订阅页（gemini.google/subscriptions 原文摘录）

Google AI Pro 卡片（$19.99/ month）：

```text
Gemini app
- Access to Gemini 4 Neon
- Access to Gemini 4 Hydrogen
- Get four times higher usage limits than Free and access to more features like video generation and Daily Brief.

Google Antigravity
Entry rate limits to agent model in Google Antigravity, our agentic development platform
```

Google AI Ultra 卡片（Starting at $99.99/ month）：

```text
- Highest access to Gemini 4 Carbon
- Highest access to Gemini 4 Neon
- Highest access to Gemini 4 Hydrogen
- Get up to 20x higher usage limits in Gemini than the Pro plan
```

Google AI Plus 卡片（$4.99/ month）：`Access to Gemini 4 Hydrogen`，未见 Neon。Free 档：`Includes Gemini 4 Hydrogen`。

## 3. AI Studio Google AI plans 文档（aistudio.google.com/docs/google-ai-plans 原文摘录）

```text
Google AI Pro and Ultra plans give you higher daily usage limits, access to more models, and monthly Google Cloud credits for the Gemini API.

Google AI Pro and Ultra subscriptions unlock paid models and higher daily rate limits across the Playground and Build interfaces, including the Code Assistant in Build mode. Daily allowances reset each day rather than using rolling windows.
```

四档对照表原文：

```text
| Plan | AI Studio daily quota | Model access | Monthly API credits |
| Free | Modest quota | Basic access, including Gemini 4 Hydrogen. | None |
| AI Pro | Higher quota | Access to Gemini 4 Neon, Gemini Nano Banana 2.1, and Lyria 3.5. | $10/month |
| AI Ultra | Highest quota | Highest limits and frontier models, including Gemini 4 Carbon and Gemini 4 Neon. | $40/month (Ultra 5x) or $100/month (Ultra 20x) |
```

每月 credits 申领原文：

```text
Google AI Pro and Ultra subscribers can claim monthly Google Cloud credits through a guided flow inside AI Studio. Each monthly grant lasts 12 months and works with your paid Gemini API keys in Playground, Build mode, external applications, and other Google Cloud services.
```

```text
A payment method for the $5 minimum Prepay deposit if you are setting up a new Prepay Cloud Billing account.
```

Limitations 节原文：

```text
* Subscription quota vs. API credits: Your Google AI plan daily quota applies only within the Google AI Studio web interface. Claimed Google Cloud credits apply to Gemini API requests made with a paid API key, both in AI Studio and in external applications.
* Different from API billing: Google AI plans for AI Studio are separate from Gemini API usage tiers, which govern API rate limits and spend caps.
* Primary subscriber only: Monthly API credits are issued only to the primary subscriber's Google Account and can be applied to a single Cloud Billing account. Family plan members and Google AI Plus plans are not eligible for Google Developer Program API credits.
* Gemini 4 access: Gemini 4 Hydrogen is available on all plans, including Free. Gemini 4 Neon is available on AI Pro and AI Ultra. Gemini 4 Carbon requires AI Ultra in AI Studio, or a paid API key.
* Agent access: Google AI plans do not include subscription quota for agents like Deep Research or Antigravity Preview. These features require a paid API key, which can draw from your claimed API credits.
```

## 4. Neon 定价页（aistudio.google.com/docs/models/gemini-4-neon 原文摘录）

```text
Gemini 4 Neon is not available on the Free tier. Every token the model processes is counted and billed, including thinking tokens and internal tool system instructions and function declarations when using grounding.
```

Standard 价格表原文：Input price `Not available`（Free Tier）/ `$3.00`（Paid）；Output price `Not available` / `$15.00`；Context caching price `Not available` / `$0.15`，`Implicit caching only (explicit caching is not supported).`

模型规格原文：

```text
Context window (unified input and output token limit) 1,048,576
Max output 65,536 (default synchronous) / up to 1,048,576 (with long decode)
Thinking Supported (low, medium, high, xhigh)
```

What's new 文档（aistudio.google.com/docs/whats-new-gemini-4-neon）补充：`The model defaults to high and supports xhigh.`；`Gemini 4 Neon is available on the paid tier of the Gemini API (across both generateContent and the Interactions API) and with Google AI Pro and Ultra plans in Google AI Studio.`

## 5. rate-limits 文档（aistudio.google.com/docs/rate-limits 原文摘录）

```text
Rate limits are applied per project, not per API key. Requests per day (RPD) quotas reset at midnight Pacific time.
```

Spend-based rate limits 表原文：

```text
| Usage tier | Spend rate limit (per 10 minutes) |
| Free | N/A |
| Tier 1 | $10 |
| Tier 2 | $200 |
| Tier 3 | $200 |
```

Usage tiers 表原文：

```text
| Tier 1 | Set up and link an active billing account | $250 |
| Tier 2 | Paid $100 + 3 days from first successful payment | $2,000 |
| Tier 3 | Paid $1,000 + 30 days from first successful payment | $20,000 - $100,000+ |
```

## 6. AI Studio Build 模式（aistudio.google.com/docs/aistudio-build-mode 原文摘录）

```text
The **Antigravity Agent** is the main AI functionality within Google Antigravity and now the core components of the agent harness is powering the Build mode experience in Google AI Studio.
```

## 7. Gemini Apps 额度帮助页（support.google.com/gemini/answer/16275805 原文摘录）

```text
Gemini Apps have compute-based usage limits that determine how much you can interact with Gemini tools and features. These limits factor in the complexity of your prompt, the models and features you use, and the length of your chat. Your limit refreshes every 5 hours until you reach your weekly limit.
```

## 8. Antigravity 表面与认证（antigravity.google/docs 原文摘录）

/docs/install 认证页开头（Available on 行）：

```text
Available on: Antigravity App, Antigravity CLI, IDE extensions (VS Code, Visual Studio, Eclipse, JetBrains, Android Studio, Zed, Xcode)
```

```text
Antigravity uses a unified authentication layer across Antigravity App, Antigravity CLI, Antigravity for IDEs, and the Antigravity SDK. Signing in on one local surface shares your credentials across your local environment.
```

/docs/ide/extensions/acp（Other editors）关键句：

```text
Use Antigravity in any editor that supports the Agent Client Protocol (ACP). Antigravity CLI includes an ACP server, `agy acp`, so any editor can run it and chat with the agent in its own panel. Zed, JetBrains IDEs, Android Studio, and Xcode support ACP natively. VS Code needs a community extension.
```

模型边界原文：

```text
Gemini models are available in every client. Third-party models are only offered to JetBrains IDEs (including JetBrains Air), Android Studio, Android Performance Analyzer, Zed, and Xcode.
```

ACP 认证方式表原文：

```text
| Log in with Google | `oauth-personal` | Opens a browser sign-in for a personal Google account |
| Log in with Gemini Enterprise | `oauth-business` | Opens a browser sign-in for a Gemini Enterprise account |
| Gemini API key | `gemini-api-key` | Reads `GEMINI_API_KEY` from the agent's environment |
| Gemini Enterprise Agent Platform | `agent-platform` | Formerly Vertex AI. Uses Application Default Credentials with `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION` |
| Log in from the terminal | `terminal-login` | Signs in with your Google account by pasting a code in a terminal. Works over SSH. Only offered to clients that support ACP terminal authentication |
```

agy 用 Gemini API key 的设置（/docs/install 原文）：

```json
{
  "modelProvider": "gemini"
}
```

```bash
export GOOGLE_GEMINI_BASE_URL="https://your-endpoint.example.com"
```

（该环境变量用于把 `agy` 指向自定义 Gemini 兼容端点。）

## 9. Antigravity 定价页对 Neon 的收录（既有 raw 2026-11-20-antigravity-plans-models-orchestrator.md 已记录）

Pro 档 `Models included` 含 `Gemini 4 Neon（脚注 2）` 与 `Orchestrator (Neon)（脚注 2）`；Ultra 档含 `Gemini 4 Neon；Gemini 4 Carbon；...；Orchestrator (Neon)；Orchestrator (Carbon)；...`；页面横幅 `新推出 — Gemini 4 Neon 与 Orchestrator 现已登陆 Google Antigravity`。脚注 2 为「付费 Pro 或符合条件的设备试用」。该采集为 2026-11-20，本条为交叉引用，不重复全文。

## 10. 家庭共享与个人账号要求（既有 wiki plans 文章已记录的官方事实，此处交叉引用）

Pro/Ultra 个人档要求 personal Google Account；家庭组共享 Antigravity 与 Flow 的用量限额（官方帮助页标注"重要"）；月度 API credits 只发给主订阅账号。详见 wiki/ai-coding-agents/google-antigravity-plans-and-regions.md 与其链接的 raw。
