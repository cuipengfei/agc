# JetBrains Air 与 ADE 产品版图摘录

> Source: https://blog.jetbrains.com/fleet/2025/12/the-future-of-fleet; https://blog.jetbrains.com/air/2026/03/air-launches-as-public-preview-a-new-wave-of-dev-tooling-built-on-26-years-of-experience; https://www.jetbrains.com/air; https://air.dev; https://www.jetbrains.com/help/air/quickstart-air-app.html; https://www.jetbrains.com/help/idea/remote-development-a.html; https://www.jetbrains.com/remote-development; https://lp.jetbrains.com/projector; https://blog.jetbrains.com/codecanvas/2025/10/jetbrains-is-sunsetting-codecanvas/; devclass.com 2025-12-09; daily.dev; augmentcode.com 对比文
> Collected: 2026-10-26
> Published: 分列于各节

引用号标注为逐字引文；其余为要点转录。CodeCanvas 一节经会话 advisor 提供官方 URL 转录，未直接抓取全文。

## Fleet 停止分发（Fleet 博客，2025-12-08）

> "Starting December 22, 2025, Fleet will no longer be available for download. We are now building a new product focused on agentic development."

> "We will stop releasing any further updates for Fleet. Distribution will also end, so you will no longer be able to download Fleet from the Toolbox App or other channels starting December 22, 2025. If you have already downloaded Fleet, you can continue using it. However, some features that rely on our server-side services, including AI Assistant, may stop working over time."

DEVCLASS（2025-12-09）：

> "JetBrains Air, a new agentic AI development tool now in preview, uses the Fleet platform though Fleet itself is discontinued"

## Air 公开预览（Air 博客，2026-03）

> "JetBrains Air is an agentic development environment for delegating coding tasks to multiple AI agents and running them concurrently."

> "Download Air – free for macOS. Windows and Linux versions coming soon."

要点：IDE 在编辑器之上添加工具，Air 围绕 agent 组织工具；审查不限于 diff，可在整个代码库上下文里看改动；终端、Git 客户端、内置预览集成在同一界面。

## Air 产品页现状（air.dev / jetbrains.com/air，2026-10-26 读取）

> "Works with the agents you already use — Claude Agent, Codex, Junie, Copilot, OpenCode — and any you can connect via ACP."

> "From the command line: Bring terminal agents like Claude Code and Codex into Air. (Air Gateway)"

> "Agents run in the cloud, so work isn't tied to one machine or team member. Cloud runs are already available for some customers in JetBrains IDEs and the browser. Rollout to all remaining customers will happen gradually over the coming months."

> "Bring your existing provider subscription or API keys, or even base URL. You can also use JetBrains AI with credits billed at public API rates. Switch between subscriptions – even mid-session."

- 浏览器入口：air.jetbrains.cloud；Air Teams 面向团队（云端环境、权限、成本控制、Amazon Bedrock/OpenAI/Anthropic 自带密钥）。

## Air 快速入门（jetbrains.com/help/air/quickstart-air-app.html，2026-10-26 读取）

- 安装："macOS – download the Air app for macOS from the official page at air.dev or install it through JetBrains Toolbox"；"Linux – run the install script: `curl -fsSL https://jb.gg/air-install.sh | sh` You can also install the Air app for Linux through JetBrains Toolbox"；"Windows – install the Air app for Windows through JetBrains Toolbox"。
- Provider：JetBrains AI 订阅作为 universal provider，一个订阅覆盖 Claude Agent、OpenAI Codex、Gemini CLI、Junie；或直接登录 Anthropic/OpenAI/Google（Claude Pro、Max、Team 等已有订阅）；或 BYOK API key；只用 ACP 兼容 agent 可跳过登录，之后添加（select-agents-and-models.html#add-acp-agent）。
- Workspace：保存 agent 会话、Git 状态与工具的容器；workspaces 共用一个窗口，可开多个项目，在 Tasks 工具间切换。
- 运行环境三种：Local Workspace（agent 在本机直接写工作副本）；Git Worktree（独立 worktree 独立分支，应用结果前主副本不动）；Docker（隔离容器，适合运行不可信代码）。
- 任务流：Chat 里描述目标，`@` 附加文件/目录/Git 项/终端输出/符号；permission modes（含 Plan mode：先出计划批准再执行）。
- 审查：任务完成后显示增删行数（示例 +512 -4），点开 Task Changes diff；统一/分栏视图；行评论回传任务作为后续指示；"Review with <agent>" 用全新会话复查 diff 并留行评论，可更换另一个 agent 做第二意见；Apply Locally（复制为未提交改动）或 Check Out Branch Locally。
- 打开项目先询问是否信任代码（Trust / Preview）。

## 次源补充（daily.dev、augmentcode.com，2026）

- "built on the codebase of its previously abandoned Fleet IDE"；"uses the Agent Client Protocol (ACP)"；ACP 由 JetBrains 与 Zed 共同开发。
- "Alongside Air, JetBrains released Junie CLI as a standalone LLM-agnostic coding agent that runs in terminals, IDEs, and CI/CD pipelines."
- 预览期免费；BYOK 优先于 JetBrains 订阅；Junie 需要 JetBrains AI 订阅，其余三个 agent 可纯 BYOK。
- 注：次源称 Air "free macOS desktop application"，与官方快速入门已列 Linux/Windows 安装并存；以官方文档为准。

## Gateway 的 WSL2 支持（jetbrains.com/help/idea/remote-development-a.html 等，2026-10-26 读取）

> "Connect to WSL: 1. Launch JetBrains Gateway. 2. In the All Providers list select WSL. ... The connection is established, the backend IDE is downloaded, and the project is opened in JetBrains Client."

> "Starting with IntelliJ IDEA version 2025.3, you can open your remote project in the same window with the backend running on WSL2."

- 前置（文档原文要点）："Windows 10 or 11 ... Ubuntu 20.04 version installed under WSL2"；"at least 200 GB of available space, 8 GB RAM, and 4 CPUs"；"latest EAP build of JetBrains Gateway"；"latest EAP version of the backend IDE"（EAP 为其中一条路径的要求）。
> "The remote development functionalities are included with paid JetBrains IDEs that support remote development workflows, so you need a valid IDE subscription to use them."
- Dev Environments provider 列表："Connections to various development environments running on Ona, Google Cloud, GitHub Codespaces, Amazon CodeCatalyst, and Coder are also available through JetBrains Gateway."

## Projector（lp.jetbrains.com/projector，2026-10-26 读取）

> "JetBrains Projector lives on as part of JetBrains Gateway. The development of JetBrains Projector as its own standalone product has been suspended."

> "We no longer recommend using the standalone version of JetBrains Projector ... If you have the option to switch from Projector to Gateway, we strongly recommend you do so."

- 背景（2021 博客）：Projector 是自托管技术，让 IntelliJ 系 IDE 与 Swing 应用运行在服务器上，用浏览器或原生客户端访问。

## CodeCanvas 停止开发（CodeCanvas 博客，2025-10）

- JetBrains 官方宣布停止 CodeCanvas 当前形态的开发；现有实例可使用至 2026-03-31；此后公共产物停止提供。（URL：https://blog.jetbrains.com/codecanvas/2025/10/jetbrains-is-sunsetting-codecanvas/ ；本条经会话 advisor 转录官方公告，未直接抓取全文。）

## ADE 准入定义（转引 wiki/agent-development-environments/ade-candidate-inventory.md，2026-10-18）

- "Terminal TUI/CLI 或独立 Web UI 可完整使用（排除纯桌面应用）；能清楚显示哪些 Agent 在运行及所在 project/workspace/worktree/session/host 至少一种位置；能方便切换 workspace/session/context；GitHub stars ≥ 1000。"
