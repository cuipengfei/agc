# 视觉人机交互工具全景证据（2026-08-30 快照）

> Source: GitHub API 仓库元数据批量查询；miro.com 官方公告与开发者文档；figma.com 官方页面；各项目官方 README
> Collected: 2026-08-30
> Published: Unknown

## 判定标准（本研究的过滤口径）

"视觉人机交互"= 人与 agent 的交互本身发生在视觉介质上（点、拖、选、画、编辑视觉对象，agent 读写同一份视觉状态）。判定看**交互通道**，不看外壳是否是图形界面：多 agent 仪表盘外壳是图形的，但与每个 agent 的交互仍是文字聊天，出局；SDK/协议是造界面的材料，不是交互方式本身，出局。

## 白板平台

### Miro（官方证据）

- 2026-02-02 新闻稿 "Miro launches MCP server to connect visual collaboration with AI coding"：PRD/设计稿在 Miro 画布上成为 agentic coding 的输入；MCP server 带企业安全控制
- 2026-05-19 新闻稿（Canvas 26）："Major upgrades to Miro's agentic AI tools — including Sidekicks and Flows"；连接器含 Slack、Atlassian、GitHub、ChatGPT、Claude、Microsoft Copilot
- developers.miro.com/docs/miro-mcp："This server bridges your AI Agents (Claude, Claude Code, Cursor, and others) directly with your Miro boards"
- FAQ：MCP Server 全计划可用，"Enterprise requiring admin approval... disabled by default until an admin enables it"；OAuth 2.1，agent 只能访问该用户可见的 board
- 2026-05-22 第三方报道：MCP 支持 tool/board 创建、frames、comments、shapes、code blocks；新增 agent 友好格式 Mermaid、Markdown、HTML widgets
- GitHub miroapp/miro-ai：MIT，150 stars（官方 MCP 配置 + Claude Code skills 仓库）

### 其他白板

- FigJam AI：生成模板/图示、总结便签。第三方实测（using-ai.net）："No chained workflows, no contextual agents that understand what's already on the board."
- Whimsical：AI 生成 mind map、wireframe；未见 agent 集成
- Lucidspark / Mural：AI 总结、便签聚类；未见 agent 共享画布证据
- 以上均为专有 SaaS，无本地运行路径

## GitHub 元数据快照（2026-08-30，gh api 实测）

### 协议与 UI SDK

| repo | stars | license | 备注 |
|---|---|---|---|
| ag-ui-protocol/ag-ui | 15,626 | MIT | 最新 release 2026-08-27 |
| a2ui-project/a2ui | 16,232 | Apache-2.0 | 无 GitHub release |
| MCP-UI-Org/mcp-ui | 5,114 | Apache-2.0 | client/v7.1.1，2026-05-09 |
| CopilotKit/CopilotKit | 37,113 | MIT | |
| vercel/ai | 26,496 | Apache-2.0（LICENSE 文件原文确认） | |
| assistant-ui/assistant-ui | 11,925 | MIT | |

### 画布

| repo | stars | license | 备注 |
|---|---|---|---|
| tldraw/tldraw | 50,033 | 自定义（保留 "Made with tldraw" 水印可商用；去水印购 business license） | v5.3.2，2026-08-18 |
| tldraw/agent-template | 34 | MIT | 无 release，开发模板 |
| yctimlin/mcp_excalidraw | 2,362 | MIT | 见专项深挖 |

### 审查与批准

| repo | stars | license | 备注 |
|---|---|---|---|
| backnotprop/plannotator | 8,246 | Apache-2.0 | v0.27.9，2026-08-27；支持 Claude Code、Codex、OpenCode、Pi、Amp、Copilot CLI、Gemini CLI、Droid、Kiro |
| langchain-ai/agent-inbox | 1,083 | MIT | LangGraph interrupt 收件箱；无 release |
| humanlayer/humanlayer | 11,355 | Apache-2.0（LICENSE 原文确认） | Claude Code、Codex、Copilot、Fireworks |
| langchain-ai/langgraph | 40,706 | MIT | 仅后端 interrupt 机制，无视觉 UI |

### Coding agent 控制台（被过滤出局的一类）

| repo/产品 | stars | license | 备注 |
|---|---|---|---|
| stravu/crystal | 3,114 | MIT | v0.3.5；README："Crystal is deprecated and replaced by Nimbalyst"；Claude Code + Codex |
| BloopAI/vibe-kanban | 27,954 | Apache-2.0 | README："Vibe Kanban is sunsetting" |
| smtg-ai/claude-squad | 8,392 | AGPL-3.0 | TUI（Bubble Tea），非图形界面 |
| generalaction/emdash | 5,543 | Apache-2.0 | v1.2.1；35+ CLI agents |
| superset-sh/superset | 13,511 | ELv2（source-available） | desktop-v1.25.0；macOS 正式，Win/Linux 未充分验证 |
| dcouple/Pane | 430 | AGPL-3.0（LICENSE 原文确认） | 任意 CLI agent |
| zhu1090093659/CodeConductor | 80 | Apache-2.0 | Electron，早期 |
| Conductor（conductor.build） | 无公开仓库 | 专有 | 官方文档：Claude Code、Codex、Cursor、OpenCode |
| AgentsRoom（agentsroom.dev） | 未发现官方公开仓库 | 专有 | 官网称支持 Claude、Codex、OpenCode、Gemini CLI、Aider、Grok、Mistral、Kimi |
| Thesys C1 | 核心无公开仓库 | 专有 API | docs.thesys.dev：C1 API + React SDK |

## 部署形态结论

- 可完全本地/企业内运行：Excalidraw + mcp_excalidraw、tldraw Agent Starter Kit、drawio 桌面 + 社区 MCP、Plannotator
- 纯 SaaS（需注册，不能本地）：Miro、FigJam、Whimsical、Lucidspark、Mural、Claude Artifacts、OpenAI Canvas、Figma Make/Design Agent、tldraw computer、Qoder Lottie（IDE 本地但 AI 走云端）
- 前提：本地指视觉交互层；agent 模型后端仍需指向内部 LLM 网关或本地模型
