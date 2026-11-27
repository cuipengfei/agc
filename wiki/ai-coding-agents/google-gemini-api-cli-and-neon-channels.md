# Google Gemini API CLI 与 AI Pro 四池 Neon 渠道

> Sources: GitHub google-gemini / google-antigravity 组织与仓库直读（gemini-api-cli 源码、gemini-cli README、迁移公告、Antigravity CLI 发布博客），2026-11-28 采集；Google 官方博客 Introducing Gemini 4 Neon，2026-11-18；Google AI Studio 官方文档（google-ai-plans、pricing、rate-limits、models、build-mode）与 gemini.google/subscriptions、Gemini Apps 帮助页、Antigravity 官方文档，2026-11-28 采集；Mag1cFall/AIStudio2API、CJackHwang/AIstudioProxyAPI、Mag1cFall/Gemini-Web2API、FarisHijazi/gemini-web-api、HanaokaYuzu/Gemini-API 社区项目文档，2026-11-28 采集
> Raw: [gemini-api-cli 与三 CLI 谱系](../../raw/ai-coding-agents/2026-11-28-gemini-api-cli-and-three-clis.md); [Neon 渠道与四额度池](../../raw/ai-coding-agents/2026-11-28-ai-pro-neon-channels-and-quota-pools.md); [网页池社区逆向代理项目](../../raw/ai-coding-agents/2026-11-28-gemini-web-reverse-proxy-projects.md); [Pro 套餐权益目录](../../raw/ai-coding-agents/2026-11-28-google-ai-pro-benefits-catalog.md)
> Updated: 2026-11-28

## Overview

`gemini-api`（仓库 `google-gemini/gemini-api-cli`）是给 agent、脚本和 CI 用的无状态 Gemini API 命令行客户端，请求只走 `generativelanguage.googleapis.com`、只认 AI Studio 的 `GEMINI_API_KEY`，与 Antigravity 订阅后端和 Vertex AI 都没有关系。Google AI Pro 一份订阅实际拆成四个互不挤占的额度池（Antigravity 编程池、AI Studio 网页每日池、Gemini 聊天应用池、每月 $10 API credits），`Gemini 4 Neon` 在四个池子都有官方入口，且全都不对免费用户开放；两个网页池各有社区逆向代理可以转成 OpenAI/Claude/Gemini 兼容接口接进任意 coding agent，但都处在违反消费者服务条款的边界上。

## gemini-api-cli 的定位与端点归属

官方 AI Studio 文档对它的定位原文是「stateless, zero-dependency command-line client built for AI agents with shell access, scripts, and CI pipelines」，并写明「gemini-api is a stateless API client, not an interactive coding agent like `@google/gemini-cli`. You can run `gemini-api` inside any coding agent.」

仓库 2026-04-29 创建，4166 stars，Go 编写，Apache-2.0 许可，Speakeasy 生成的 CLI，当前版本 v0.5.0，官方标注 experimental beta、小版本间允许破坏性变更。源码 `internal/sdk/geminiapi.go` 的 `ServerList` 只有一项默认端点：

```go
var ServerList = []string{
	// Global Endpoint
	"https://generativelanguage.googleapis.com",
}
```

凭证只有 API key 与 OAuth access token 两类：缺 key 时的官方提示原文指向 `https://aistudio.google.com/docs/api-key`，生成客户端的凭证优先级注释写明「flag > env > keyring > config, API key on a tie」。自托管沙箱文档（`docs/self-hosted/README.md`）同样写明连的是 `generativelanguage.googleapis.com`；`GOOGLE_APPLICATION_CREDENTIALS` 只出现在自托管运行时清洗环境变量的黑名单里，防止宿主机服务账号密钥泄露进沙箱，默认请求路径不使用 Vertex AI。

计费与订阅完全分离：Neon 定价页写明「Gemini 4 Neon is not available on the Free tier」，Paid Tier 每百万 token 输入 $3.00、输出 $15.00、隐式缓存 $0.15（发布博客另记缓存输入折扣 95%，上下文窗口 1 million-token）。走这条通道的合规资金来源是 AI Pro 每月的 $10 Google Developer Program credits（见下文四池表）。

## 三条 CLI 谱系

`google-gemini` 组织（2024-02-29 创建，52 个公开仓库）同时容纳新旧两代交互式终端 agent，`google-antigravity` 组织（2025-11-04 创建，2 个仓库）是新一代终端所在。gemini-cli README 的官方对照表按使用资格划分三者：

| 命令 | 仓库 | 形态 | 使用资格（README 原文） | stars |
|---|---|---|---|---|
| `gemini` | google-gemini/gemini-cli（TypeScript） | 交互式终端 agent | Organizations with Gemini Code Assist Standard / Enterprise or Code Assist for GitHub on Google Cloud | 109240 |
| `agy` | google-antigravity/antigravity-cli（Go） | 交互式多 agent 终端 | free / Google AI Pro & Ultra accounts, or Google Cloud | 3187 |
| `gemini-api` | google-gemini/gemini-api-cli（Go） | 无状态 API CLI（not a coding harness） | agents (`agy`, Claude Code, Codex), scripts, and CI | 4166 |

2026-05-19 官方迁移公告宣布把消费级入口统一到 Antigravity：「On June 18, 2026, Gemini CLI and Gemini Code Assist IDE extensions will stop serving requests for Google AI Pro and Ultra, as well as those using it free of charge using Gemini Code Assist for individuals.」企业侧不变：「Gemini CLI will remain accessible via paid Gemini and Gemini Enterprise Agent Platform API keys.」`agy` 与 Antigravity 2.0 共用同一 agent harness，首次启动检测旧 Gemini CLI 配置并提供迁移勾选，`agy plugin import gemini` 把旧 extensions 转成 plugins。

## 与 Antigravity 的三向关系

1. **Antigravity 是 gemini-api 的宿主之一**：AI Studio 文档写明「It works with Antigravity, Claude Code, Cursor, and any standard shell environment」；`gemini-api install-skill --agent antigravity` 把内置 skill 装进 Antigravity，Gemini 官方 skills 也可以整体装进 `agy`（`agy plugin install https://github.com/google-gemini/gemini-skills`，该仓库 4772 stars）。
2. **Gemini API 内置 Antigravity 云沙箱 managed agent**：目录里的 `antigravity-preview-09-2026` 官方描述为「Linux sandbox with Bash, Python, Node, file ops, and web search」，用 `--body '{"environment": "remote"}'` 启动，按 API key 计费。
3. **gemini-api-cli 仓库自测用 Antigravity SDK 驱动**：`evals/harness-comparison` 用 `google-antigravity` Python 运行时（`driver/antigravity_driver.py`）spawn 一个「run_command as the only tool」的 agent，测量它多少次 shell 调用才能让被测 CLI 发出正确的 API 请求；对照对象是生成版 `gemini-api` 与手写参考实现 `reference/gemini-api-cli-poc`。

## AI Pro 的四个独立额度池

官方 plans 文档写明「Your Google AI plan daily quota applies only within the Google AI Studio web interface. Claimed Google Cloud credits apply to Gemini API requests made with a paid API key」；Gemini Apps 帮助页写明聊天池「Your limit refreshes every 5 hours until you reach your weekly limit.」四个池子的扣减互不挤占：

| 额度池 | 入口 | 刷新与扣费规则 | Neon 对免费用户 |
|---|---|---|---|
| Antigravity 编程池 | Antigravity App、`agy`、7 类 IDE 表面、人直接操作的 `agy acp` | 每 5 小时滚动刷新 + 周上限（与 Gemini 聊天池同机制） | 不可用 |
| AI Studio 网页每日池 | aistudio.google.com 的 Playground 与 Build（Antigravity Agent 驱动） | 「Daily allowances reset each day rather than using rolling windows」，官方只标 Higher quota，不公布固定数字，实时值看 `/rate-limit` 面板 | 不可用（Free 只给 Hydrogen） |
| Gemini 聊天应用池 | gemini.google.com 网页与手机 App、Workspace 侧边栏、Gemini in Chrome | 免费版的 4 倍算力额度，每 5 小时刷新 + 周上限 | 不可用（Free/Plus 只给 Hydrogen） |
| 每月 $10 API credits | 领取后绑到付费 `GEMINI_API_KEY`，供 `gemini-api` CLI、OMP、OpenCode、Cursor 等第三方 agent | 「Each monthly grant lasts 12 months」；Prepay 账单先充 $5 激活；credits 可加购（`one.google.com/ai/credits`），在 Gemini、Flow、Antigravity 间通用，按模型 API 标准价扣减；按 Neon 单价扣减；Tier 1 限速每 10 分钟 $10 | 不可用（Neon 无 API Free tier） |

`x-aistudio-g1-tier`（TIER0/TIER1/TIER2）是 AI Studio 网页链的档位请求头，由社区协议文档记录（见逆向代理一节），档位对应的每日具体额度官方仍未公布数字。家庭组共享 Antigravity 与 Flow 的同一池额度；月度 API credits 只发给主订阅账号，家庭组与 AI Plus 档没有资格。

## Gemini 4 Neon 的官方渠道

发布博客（2026-11-18）的铺货原文覆盖四条线：「Gemini 4 Neon is rolling out today in the Gemini API in Google AI Studio, Gemini for business (via API and model dropdown), for paid Google AI Pro and Ultra subscribers in Google Antigravity, and for Pro and Ultra subscribers in the Gemini app.」按表面归类：

- **终端 CLI/TUI**：`agy`（`oauth-personal` 登录，模型可选 Neon 单选与 Orchestrator (Neon)）；`gemini-api` 与 OMP、OpenCode、Claude Code 等第三方 CLI 走 $10 credits 的 API key 通道。老的 `gemini` 自 June 18, 2026 起对个人订阅停服。
- **桌面与 IDE**：Antigravity App 与官方 IDE 扩展覆盖 VS Code、Visual Studio、Eclipse、JetBrains、Android Studio、Zed、Xcode；ACP 文档写明「Gemini models are available in every client. Third-party models are only offered to JetBrains IDEs (including JetBrains Air), Android Studio, Android Performance Analyzer, Zed, and Xcode.」非官方 IDE 的 ACP 客户端官方只开放 Gemini 模型。
- **网页**：AI Studio Playground/Build（付费 Pro/Ultra 的每日池）、gemini.google.com（Pro/Ultra 4 倍聊天池）。两处额度独立。
- **企业**：Gemini for business 的 API 与模型下拉；Fairwind Program 面向网络安全防御者另行发放。

## 网页池逆向进任意 coding agent

社区逆向项目把两个网页池的私有网页协议转成标准 API。内部 RPC 域名与机制全部来自社区项目协议文档，非官方资料：

| 池子 | 代表项目 | 底层机制（社区 protocol.md 原文） | 工具调用 | 额度归属 |
|---|---|---|---|---|
| AI Studio 网页每日池 | Mag1cFall/AIStudio2API（Go，:2048）；CJackHwang/AIstudioProxyAPI（Python + Playwright + Camoufox） | MakerSuite RPC `alkalimakersuite-pa.clients6.google.com/$rpc/...MakerSuiteService/<METHOD>`；三段 SAPISIDHASH 授权；SpiderMonkey 或 Camoufox 跑 WAA BotGuard proof | 网页链原生支持函数（GenerateContent RPC 原文含「文本、思考、函数、Google 工具」）；AIS tudioProxyAPI 提供 auto/native/emulated 三模式 | 订阅每日池 |
| Gemini 聊天应用池 | Mag1cFall/Gemini-Web2API（Go，:8007，README 已列 `gemini-4-neon` 与 `gemini-4-neon-task`）；FarisHijazi/gemini-web-api（Python，:8100，底层 HanaokaYuzu/Gemini-API 的 `gemini_webapi` 库） | `GET gemini.google.com/app` 取 `SNlM0e`；`batchexecute?rpcids=otAQ7b` 动态发现模型目录；生成走 `geminiweb-pa.clients6.google.com/v1/processSession`（WebChannel）；Cookie `__Secure-1PSID`/`__Secure-1PSIDTS` | 无原生函数调用，gemini-web-api 文档自述「emulated via prompt engineering」并提醒「less token-efficient and less rock-solid than a native function-calling API」 | 聊天池 5 小时/周额度 |

AIStudio2API 的 README 给出接 OMP、Claude Code、Codex、OpenCode、OpenClaw、Magpie 与 `agy`（`GOOGLE_GEMINI_BASE_URL` 指向本地代理）的现成配置；Gemini-Web2API 同样提供四协议（OpenAI、Claude、Gemini、Interactions）与 `agy` 接法。对 coding agent 而言 AI Studio 侧的网页链优于 Gemini 网页侧：前者原生函数调用，后者靠提示词模拟 JSON，复杂多工具回合需要重试。

两条工程风险与一条合规边界。工程上：Gemini-Web2API 协议文档记录了 `GPRiHf` 账号《使用限制政策》违规警告读取接口与 `www.google.com/sorry` 人机验证重定向，说明 Google 侧存在检测与拦截路径；访客会话输入窗口按免费层 32K tokens 计算，付费模型必须带有效 Cookie。合规上：抓取 Cookie 或绕过 BotGuard 将网页会话转成 API 属于第三方软件访问消费者服务，与 Antigravity 条款第 6 条同一边界，封禁先例与官方指路的 API key 合规路径见 [Antigravity 第三方客户端政策、执行范围与计费边界](antigravity-third-party-policy.md)——官方建议的「Google AI Studio Gemini API key」正是 `gemini-api` CLI 所在通道。

## 证据边界

本次全部为官方文档、GitHub 仓库直读与本地 wiki 检索：未在本机部署任何逆向代理、未发起真实 API 调用、未登录任何 Google 账号。`Gemini-Web2API` README 明确列出 `gemini-4-neon` 模型 ID（可查证）；`AIStudio2API` 等其余项目经 `ListModels` / `otAQ7b` 动态拉取账号实时模型目录，Pro 账号在网页端有 Neon 权限时才可解析出该模型——此为机制推断，未一手实测。AI Studio 网页池与 Gemini 聊天池的内部 RPC 域名以社区项目协议文档为唯一来源。

## See Also

- [Google AI 套餐权益目录：Pro 相对免费与 Plus 解锁什么](google-ai-pro-plan-benefits.md) — Pro 捆绑权益全清单、AI credits 加购与 Antigravity 超额切换
- [Google Antigravity：套餐、模型、额度与地区](google-antigravity-plans-and-regions.md) — 档位表唯一权威：Neon 与 Orchestrator (Neon) 的 Pro 清单收录
- [Antigravity 第三方客户端政策、执行范围与计费边界](antigravity-third-party-policy.md) — 条款第 6 条、论坛官方回复与申诉路径
- [OMP Antigravity 认证与社区 API](../omp-auth/google-antigravity-auth-and-api.md) — `daily-cloudcode-pa.googleapis.com` 的 Code Assist 后端证据与假 429 观察
- [Antigravity Orchestrator 机制](antigravity-orchestrator-mechanism.md) — Orchestrator (Neon) 的规划/执行分工
