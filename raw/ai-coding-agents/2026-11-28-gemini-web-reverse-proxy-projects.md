# Gemini 网页池社区逆向代理项目摘录

> Source: Mag1cFall/AIStudio2API（README.md 与 docs/protocol.md）、CJackHwang/AIstudioProxyAPI（README.md）、Mag1cFall/Gemini-Web2API（README.md 与 docs/protocol.md）、FarisHijazi/gemini-web-api（README.md）、HanaokaYuzu/Gemini-API（README.md），均 GitHub 直读，2026-11-28 采集
> Collected: 2026-11-28
> Published: 各项目文档无统一发布日期，标 Unknown

以下全部为社区项目文档摘录，内部 RPC 域名、协议与机制均来自社区逆向记录，非 Google 官方文档。

## 1. Mag1cFall/AIStudio2API — AI Studio 网页池反代（Go，监听 127.0.0.1:2048）

README 定位原文：

```text
一个基于 Go 的高性能代理服务：将 Google AI Studio 网页协议转换为 OpenAI、Responses、Anthropic 和 Gemini 兼容 API

Playground 生成通道 • Build 代码助手对话通道 • 多账户高并发 • Camoufox 与 SpiderMonkey 双 WAA 后端 • Claude Code、Codex 等 Agent 客户端 • Nano Banana、TTS 与 Omni
```

docs/protocol.md 协议入口表原文：

```text
| 页面 origin | `https://aistudio.google.com` | HTTPS |
| MakerSuite RPC | `https://alkalimakersuite-pa.clients6.google.com/$rpc/google.internal.alkali.applications.makersuite.v1.MakerSuiteService/<METHOD>` | `application/json+protobuf` |
| WAA RPC | `https://waa-pa.clients6.google.com/$rpc/google.internal.waa.v1.Waa/<METHOD>` | `application/json+protobuf` |
| BotGuard interpreter | `https://www.google.com/js/bg/<INTERPRETER_HASH>.js` | JavaScript |
```

请求头 `x-aistudio-g1-tier` 的来源原文：

```text
| `x-aistudio-g1-tier` | `GetAiStudioBenefitTier` 返回值映射为 `TIER0`、`TIER1` 或 `TIER2` |
```

SAPISID 授权原文：

```text
`authorization` 由三个 Cookie 分别签名：

| `SAPISIDHASH` | `SAPISID` |
| `SAPISID1PHASH` | `__Secure-1PAPISID` |
| `SAPISID3PHASH` | `__Secure-3PAPISID` |
```

`x-goog-api-key` 请求头说明原文：

```text
请求头 `x-goog-api-key` 是 AI Studio 页面使用的动态公共值，与用户创建的 Google Cloud API key 不同；免费网页链仍依赖 Cookie、SAPISID 签名和 WAA proof。
```

协议核心 RPC 原文：

```text
| `ListModels` | 读取模型、方法、限制、默认参数与能力选项 |
| `CountTokens` | 权威输入 token 计数 |
| `GenerateContent` | 文本、思考、函数、Google 工具、图片、语音与音乐 |
```

README 双通道原文：

```text
**双通道**: 每个账户经 Playground 生成；Build 应用代理是旧通道，上游已对账户停用其生成（`PROXY_GENERATION_DISABLED`），默认关闭，可在 `UPSTREAM_CHANNELS` 中启用
```

README 对 Build 对话模型的说明原文：

```text
**Build 对话模型**: Build 对话面板可选的模型各提供一个 `<模型>-build`（如 `gemini-3.8-flash-build`），由 Build 写代码助手连同其系统提示词回复，支持函数调用、工具结果续接与 Google 搜索，用量计入 Build 对话额度（免费请求或 Google AI 订阅额度）
```

支持的 Agent 客户端原文：

```text
**主流 Agent 客户端**: 支持 Claude Code、Codex、OpenCode、pi、omp、dsh、OpenClaw、Magpie、Antigravity CLI 的文件读写工具调用，Claude Code、Codex、omp 的原生联网搜索可直接使用
```

接 `agy` 的配置原文（README）：

```powershell
$env:GEMINI_API_KEY = "<PROXY_API_KEY>"
$env:GOOGLE_GEMINI_BASE_URL = "http://127.0.0.1:2048"
agy
```

## 2. CJackHwang/AIstudioProxyAPI — AI Studio 网页池反代（Python）

README 定位原文：

```text
将 Google AI Studio 网页界面转换为 OpenAI 兼容 API 的代理服务。通过 Camoufox + Playwright 自动化，提供稳定可控的 API 访问。
```

```text
- **函数调用三模式**：`auto` / `native` / `emulated`，支持失败回退
- **认证轮转与 Cookie 刷新**：支持 profile 自动轮转、周期刷新与关停保存
```

## 3. Mag1cFall/Gemini-Web2API — Gemini 网页池反代（Go，监听 127.0.0.1:8007）

docs/protocol.md 协议入口表原文：

```text
| 网页入口 | `gemini.google.com/app` |
| 模型目录 | `otAQ7b` RPC 动态发现 |
| 生成接口 | `geminiweb-pa.clients6.google.com/v1/processSession`（WebChannel） |
| 默认会话 | Temporary Chat |
| 运行依赖 | 完成 setup 后仅需 Go 服务进程 |
```

初始化链路原文：

```text
| 1 | `GET https://gemini.google.com/app` | `SNlM0e`、`cfb2h`、`FdrFJe`、`TuX5cc`、`oPEP7c` 登录邮箱、上传参数、响应 Cookie |
| 2 | `POST /_/BardChatUi/data/batchexecute?rpcids=otAQ7b` | 当前账号可见模型与思考强度 |
| 3 | `POST ...batchexecute?rpcids=ESY5D` | 账号偏好 |
| 4 | `POST ...batchexecute?rpcids=GPRiHf` | 账号《使用限制政策》警告状态 |
| 5 | `POST ...batchexecute?rpcids=jSf9Qc&source-path=/usage` | 套餐、用量窗口、重置时间 |
```

`GPRiHf` 说明原文：

```text
**`GPRiHf`**：正常账号为 `[]`；有警告时 `payload[0][0]` 为签发时间（微秒时间戳），`payload[0][2][0]` 为违规类型码，两者都非零时记为异常标记，只用于日志与管理端账号页的警告提示
```

人机验证重定向原文：

```text
| → `www.google.com/sorry` | 人机验证 |
```

访客会话能力原文：

```text
- **能力**：官网访客页按首页 `Lz8rbb` 登录标志禁用全部输入框工具与上传入口，访客会话只公开对话模型；输入窗口按免费层 32K tokens 计算
```

README 支持模型表原文（节选）：

```text
| `gemini-4-hydrogen` | 4 Hydrogen | All-around help | 32,768–1,048,576 | 是 |
| `gemini-4-carbon` | 4 Carbon | Most complex work | 32,768–1,048,576 |  |
| `gemini-4-neon` | 4 Neon | Deeper analysis | 32,768–1,048,576 |  |
| `gemini-4-hydrogen-task`、`gemini-4-carbon-task`、`gemini-4-neon-task` | Task | 代为执行任务 |  |  |
```

README 协议兼容原文：

```text
- **OpenAI 兼容**：`/v1/chat/completions`、`/v1/completions`、`/v1/responses`、`/v1/files`、`/v1/audio/*`、`/v1/videos`、`/v1/models`
- **Claude 兼容**：`/v1/messages`、Files API
- **Gemini 兼容**：`/v1beta/models/{model}:generateContent`、`:streamGenerateContent`、`:predictLongRunning`、Files API
```

函数工具桥接原文：

```text
- **函数工具**：四种协议的函数工具经网页提示词桥接，模型在调用前写的说明随调用一起返回，调用无法解析时在首个可见输出前换账号重试
```

接 `agy` 的配置原文（README）：

```powershell
$env:GEMINI_API_KEY = "<PROXY_API_KEY>"
$env:GOOGLE_GEMINI_BASE_URL = "http://127.0.0.1:8007"
agy
```

订阅层级边界原文：

```text
- **订阅层级**：只有更高订阅层级才有的模型返回 403，写明所需层级与当前账号的层级
```

## 4. FarisHijazi/gemini-web-api — Gemini 网页池反代（Python，监听 :8100）

README 定位原文：

```text
An unofficial, self-hosted OpenAI-compatible API backed by the gemini.google.com web app. Point any OpenAI SDK at `http://localhost:8100/v1` and talk to Gemini using your logged-in Google account — no official API key, no billing.

Built by reverse-engineering the web app's private `batchexecute` / `StreamGenerate` RPC protocol.
```

双后端原文：

```text
| `webapi` | reverse-engineered `batchexecute` RPC via `gemini_webapi`, cookies from local Chrome / CDP | cookies (`__Secure-1PSID`, …) — can expire | chat, streaming, tools, vision, images, Veo video |
| `chrome` | a **Chrome extension** drives a logged-in `gemini.google.com` tab (types prompt, scrapes reply); server relays over a WebSocket (`/ws`) | **the browser's own session** — nothing to harvest or expire | chat, streaming |
```

工具调用模拟原文：

```text
The Gemini web app has no native function-calling API, so it's **emulated via prompt engineering** (the same approach as LiteLLM's `add_function_to_prompt`, LocalAI, and `00bx/gemini-web-proxy`): incoming OpenAI `tools` schemas are rendered into the prompt, Gemini is instructed to reply with a `{"tool_calls":[…]}` JSON block, and that's parsed back into the OpenAI `tool_calls` shape (`finish_reason: "tool_calls"`, arguments as a JSON string).
```

```text
> Caveat: emulated tool calling is less token-efficient and less rock-solid than a native function-calling API — expect occasional parse retries on complex multi-tool turns. It works, but native APIs are more reliable.
```

OpenCode 接入配置原文（README）：

```json
{
  "provider": {
    "gemini-web": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Gemini Web (local)",
      "options": { "baseURL": "http://localhost:8100/v1", "apiKey": "not-needed" }
    }
  }
}
```

## 5. HanaokaYuzu/Gemini-API — gemini_webapi Python 库

README 定位原文：

```text
A reverse-engineered asynchronous Python wrapper for the [Google Gemini](https://gemini.google.com) web app (formerly Bard).
```

认证原文：

```text
- Go to https://gemini.google.com and log in with your Google account
- Press F12 to open the web inspector, go to the `Network` tab, and refresh the page
- Click any request and copy the cookie values of `__Secure-1PSID` and `__Secure-1PSIDTS`
```

动态模型目录原文：

```text
Models are discovered **dynamically** at init time from your account, along with the request headers and tier capacity each one needs. Pass a name, alias, display name or id string - or an `AvailableModel` straight from `list_models()`. Names follow whatever Google publishes to your account (currently `gemini-pro`, `gemini-flash` and `gemini-flash-lite`), so run the snippet below to see your own list rather than hardcoding one.
```

## 6. 证据边界（本次采集的验证级别）

- 以上全部为仓库文档直读，未在本机部署或运行任何项目，未发起真实 API 调用，未登录任何 Google 账号。
- `Gemini-Web2API` README 明确列出 `gemini-4-neon` 与 `gemini-4-neon-task` 模型 ID（上文摘录）；`AIStudio2API`、`AIS tudioProxyAPI`、`gemini-web-api`、`gemini_webapi` 经 `ListModels` / `otAQ7b` 动态拉取账号在网页端的实时模型目录，Pro 账号在网页端有 Neon 权限时才可解析出该模型——此为机制推断，未一手实测调用。
- 两类代理消耗的额度归属按各项目文档对应官网通道推断：AI Studio 池代理走 MakerSuite 网页链（订阅每日额度），Gemini 网页池代理走 BardChatUi/processSession 网页链（聊天池 5 小时/周额度）。
