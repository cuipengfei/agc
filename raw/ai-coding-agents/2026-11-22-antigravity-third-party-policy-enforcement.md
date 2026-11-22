# Google Antigravity 第三方客户端政策与账号处置官方材料摘录

> Source: https://antigravity.google/terms ; https://discuss.ai.google.dev/t/policy-question-omp-hosting-unmodified-antigravity-acp-for-one-user/199753 ; https://discuss.ai.google.dev/t/please-allow-personal-use-of-antigravity-subscriptions-in-third-party-coding-tools/202740 ; https://aistudio.google.com/docs/google-ai-plans
> Collected: 2026-11-22
> Published: 论坛帖分别为 2026-11-12 与 2026-11-19/20；Terms 与 AI Studio 文档无版本日期，标 Unknown

验证级别：`[DOC]` = Google 官方页面或官方论坛员工回复；`[USER-REPORT]` = 论坛发帖者自述，未获官方确认；`[UNVERIFIED]` = 本次会话未发起真实网络调用。

论坛用户名以 `<USER>` 代替，原始来源链接保留。

## 1. Antigravity Additional Terms of Service 第 4 条与第 6 条（`https://antigravity.google/terms/`，`[DOC]`，2026-11-22 查阅）

条款开头段落：通过 Gemini Enterprise (Google Cloud)、Gemini Enterprise for Business、Workspace Pre-GA 条款或 Gemini for business 的 API key 访问服务时，适用管理员签署或接受的条款。

```text
4. The Service includes goal-oriented AI systems or workflows that perform actions or tasks on your behalf in a supervised or autonomous manner that you may create, orchestrate, or initiate within the Service (“AI Agents”). You are solely responsible for: (a) the actions and tasks performed by an AI Agent; (b) determining whether the use an AI Agent is fit for its use case; (c) authorizing an AI Agent’s access and connection to data, applications, and systems; and (d) exercising judgment and supervision when and if an AI Agent is used in production environments to avoid any potential harm the AI Agent may cause.
```

```text
6. You must not abuse, harm, interfere with, or disrupt the Service. This includes, but is not limited to, using the Service in connection with products not provided by us. Using third party software, tools, or services to access the Service (e.g. using OpenClaw with Antigravity OAuth) is a breach of this Agreement. Such actions may be grounds for suspension or termination of your Antigravity and/or Gemini CLI accounts.
```

## 2. 官方论坛 199753：OMP 插件 ACP 接入的政策询问与员工回复（2026-11-12，`[DOC]`）

提问者自述（节选）：

```text
I am an individual Google AI Pro subscriber. I use one personal Google account, on my own machine, for my own software development. I am not reselling access, rotating accounts, or sharing credentials.

Plugin: omp-antigravity-acp-provider 0.1.43

Host: Oh My Pi (OMP), a third-party terminal coding harness. It is not Zed, JetBrains, VS Code, Android Studio, Xcode, or T3 Code.

Intended use is single-user and interactive. I would be present. No background agents, task queues, scheduled runs, or account rotation.
```

提问者列出的三条此前官方回复（提问者转述）：

- 25 September 2026, "Is using the official agy CLI through a local MCP server with third-party AI agents permitted?" Staff said wrapping `agy -p` for a third-party agent is not permitted.
- 2 November 2026, "Conflicting guidance on using T3 Code with personal Google AI subscriptions." Staff said an ACP client launching the official unmodified antigravity-acp binary with native oauth-personal is permitted for single-user interactive development, Gemini models only.
- 4 November 2026, OpenBot. Staff allowed the same pattern, with limits on unattended use, third-party tools, and non-Gemini models: https://discuss.ai.google.dev/t/197826/2

员工回复（2026-11-12，`<USER>`，原文摘录，回复中的链接省略）：

```text
we do not recommend installing or signing in through `omp-antigravity-acp-provider` with consumer `oauth-personal`:

* Questions 1 & 2 (OMP Harness vs. Direct ACP Clients): While any interactive ACP client (such as Zed, JetBrains, Xcode, T3 Code, or a custom interactive UI) may launch the unmodified `antigravity-acp` / `agy acp` binary when a human directly drives the session, wrapping `antigravity-acp` as a model provider (`antigravity-acp/*`) inside a third-party coding agent harness like Oh My Pi (OMP) is not permitted on consumer `oauth-personal` plans.
* Questions 3, 5 & 6 (Wrapper Script, OAuth Callback Relay & MCP Bridge): Generating wrapper scripts around `agy`, intercepting/relaying the `127.0.0.1` OAuth callback instead of using native `oauth-personal` or `agy acp --login` (`terminal-login`), and driving harness tools with `--dangerously-skip-permissions` are also non-compliant on consumer sign-in.
* Questions 4 & 7 (Models, Enforcement & Compliant Path): General ACP clients outside supported IDEs (JetBrains, Android Studio, Zed, and Xcode) are scoped to **Gemini** models, and Section 6 enforcement applies to your **Antigravity and/or Gemini CLI** accounts. To use Gemini inside OMP, please use a **Google AI Studio Gemini API key** (`gemini-api-key`) instead.
```

## 3. 官方论坛 202740：个人 Ultra 用户自述停号与员工回复（2026-11-19 / 2026-11-20）

发帖者自述（`[USER-REPORT]`，2026-11-19，`<USER>`）：

```text
I’m a paying Google AI Ultra subscriber for ~1y, and my Antigravity access was suspended for a Terms of Service violation. I used less than 20% of my quota for several consecutive windows, entirely for my own development, with no sharing, resale, or redistribution.
```

员工回复（2026-11-20，`<USER>`，原文摘录）：

```text
using third-party software, wrappers, or proxies (such as `CLIProxyAPI`) with an Antigravity login isn't permitted—even for personal use—and can lead to suspension or termination.
```

```text
* Supported setups: For editors that support the Agent Client Protocol (such as Zed, JetBrains IDEs, Android Studio, and Xcode), you can connect via Antigravity CLI's built-in `agy acp` server. To run Gemini inside a third-party coding agent, use a Gemini Enterprise or Google AI Studio API key instead.
* Requesting review: Remove any third-party proxies, revoke third-party OAuth access at Google Account Permissions, and submit the official Appeal Form once while signed in to the affected account (typically 24–72 hours; no email notifications; restores automatically on sign-in if approved; one-time reinstatement policy).
```

注：员工回复未确认该账号的处置原因或用量；「停号」「连续窗口用量低于 20%」均来自发帖者自述。

## 4. AI Studio「Google AI plans」页面摘录（`https://aistudio.google.com/docs/google-ai-plans`，`[DOC]`，2026-11-22 查阅）

月度 API credits 对照（模型列内容省略）：

```text
| Plan | AI Studio daily quota | Monthly API credits |
| Free | Modest quota | None |
| AI Pro | Higher quota | $10/month |
| AI Ultra | Highest quota | $40/month (Ultra 5x) or $100/month (Ultra 20x) |
```

Limitations 节摘录：

```text
* Subscription quota vs. API credits: Your Google AI plan daily quota applies only within the Google AI Studio web interface. Claimed Google Cloud credits apply to Gemini API requests made with a paid API key, both in AI Studio and in external applications.
* Different from API billing: Google AI plans for AI Studio are separate from Gemini API usage tiers, which govern API rate limits and spend caps.
* Primary subscriber only: Monthly API credits are issued only to the primary subscriber's Google Account and can be applied to a single Cloud Billing account. Family plan members and Google AI Plus plans are not eligible for Google Developer Program API credits.
* Agent access: Google AI plans do not include subscription quota for agents like Deep Research or Antigravity Preview. These features require a paid API key, which can draw from your claimed API credits.
```

另：页面称每月 credits 通过 Google Developer Program 发放，每个 grant 有效期 12 个月；新 Prepay 计费账户需先充值至少 $5 才能激活促销 credits。

## 5. 未测边界（`[UNVERIFIED]`）

- 本次会话未对任何账号执行真实封禁、申诉或 API 调用实验。
- 未取得 Google 内部成本、利润或风控阈值数据；封禁触发条件未公开。
- 202740 的停号原因只有发帖者自述，官方未证实；2026-02-27 批量封禁与系统级自动解封公告见 `google-antigravity-api-policy-2026-11-14.md`。
