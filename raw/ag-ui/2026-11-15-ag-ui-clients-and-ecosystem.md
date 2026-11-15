# AG-UI 客户端、SDK 与治理生态摘录

> Source: https://docs.ag-ui.com/introduction.md, https://www.copilotkit.ai/product/framework, https://github.com/ag-ui-protocol/ag-ui（README 与仓库元数据）, https://docs.copilotkit.ai/intelligence/overview
> Collected: 2026-11-15
> Published: Unknown（站点持续更新）

## Clients 表（docs.ag-ui.com/introduction）

| Client | 归属 |
| - | - |
| CopilotKit | 1st Party |
| Terminal + Agent | Community |
| Chat platforms (Slack, Microsoft Teams)（Channels SDK、OpenTag 示例） | 1st Party |
| React Native | 1st Party |
| OpenBot | 1st Party |

- 原文：「An AG-UI client does not have to be a web application. The protocol describes an event stream rather than a rendering target, so a terminal, a mobile app, or a chat platform can each act as a client.」
- Channels SDK 与 OpenTag：「a Python LangGraph agent served over AG-UI into Slack and Microsoft Teams. In that application the agent and its runtime are self-hosted, while platform credentials and message delivery are handled by CopilotKit Intelligence — a hosted service, not part of the protocol.」
- OpenBot：「an open-source workspace for AI coworkers that connects to any AG-UI agent endpoint … It keeps threads and memory in CopilotKit Intelligence, a separate service that is not part of the protocol, which CopilotKit can host for you or you can run yourself.」

## CopilotKit Frontend SDKs（copilotkit.ai/product/framework）

- 页面首行：「React, Angular, Vue, and React Native SDKs for agent-powered applications.」四个框架官方客户端：React、Angular、React Native、Vue。
- npm registry 检查（2026-11-15）：`@copilotkit/svelte` 404、`@copilotkit/solid` 404——Svelte 与 Solid 没有官方 AG-UI/CopilotKit 客户端。
- 「Open-source SDKs, with framework-specific components and APIs」「Start with ready-made components or compose your own」「Prebuilt chat / Replace the parts you need（component slots）/ Headless APIs（messages, agent state, activity rendering）」三层定制深度。

## 社区 SDK（README SDKs 表）

- 已发布（Community）：Kotlin、Golang、Dart、Java、Rust、Ruby、C++、.NET。
- 进行中：Nim（PR #29）、Flowise（issue #367）、Langflow（issue #366）。

## Agent 框架集成（introduction.md 全表）

- Direct to LLM：Supported。
- Partnerships：LangChain（LangGraph）、CrewAI。
- 1st Party：Microsoft Agent Framework、Google ADK、Google ADK (JavaScript)、Google Antigravity、AWS Strands Agents、AWS Bedrock AgentCore、Mastra、Pydantic AI、Agno、LlamaIndex、AG2；In Progress：AWS Bedrock Agents。
- Community：Claude Agent SDK、Claude Managed Agents SDK、Langroid、Omnara、OpenAI Agents SDK、Cloudflare Agents。
- Agent Interaction Protocols：A2A Middleware（Partnership）。
- Specification (standard)：Oracle Agent Spec。
- Generative UI：A2UI、MCP Apps。

## 治理与规模（GitHub README 与仓库元数据）

- 「AG-UI was born from CopilotKit's initial **partnership** with LangChain and CrewAI」。
- 「1st party = the platforms that have AG‑UI built in and provide documentation for guidance.」
- License：MIT。Contributing：Biweekly AG-UI Working Group（Luma 日历）；Roadmap 用 GitHub Projects 管理。
- 仓库元数据（2026-11-15 repo_view）：Stars 17419、Forks 1694、Primary language TypeScript、Default branch main。
- README 与新文档的事件数差异：README「~16 standard event types」；1.0 规范 31 个事件类型、8 个族。

## CopilotKit Intelligence（docs.copilotkit.ai/intelligence/overview）

- 定位原文：「CopilotKit Intelligence adds AG-UI Streams, User Memories, Automatic Learning, Channels, and Product Analytics to the CopilotKit app you already run.」
- 线程存储可保留：「Keep your existing thread system. You do not need to replace your thread storage when you connect Intelligence.」Intelligence 记自己的副本，原框架继续管理原对话与 agent 状态。
- 能力清单：AG-UI Streams（跨标签页与跨设备的重连与追赶、generative UI、多模态输入与文件上传）、User Memories、Automatic Learning、Trajectories、Product Analytics、Channels（Slack/Teams）、Inspector（localhost 观察线程、学习与工具调用）。
- 部署：Cloud-hosted 或 self-hosted（Kubernetes Helm chart / AWS ECS bundle），「Cloud-hosted and self-hosted use the same app APIs, so you can start on one and move later.」
- 「TypeScript also works without Intelligence; the other runtime implementations require it.」

## Dojo 验收流水线（apps/dojo/README.md）

- 默认每条 lane 跑仓库源码；published mode 跑最新发布包，「which is what proves that a framework's public release works with the current protocol」。
- 「runs the whole dojo-e2e.yml matrix this way every Monday (and on manual dispatch)」。
- 协议版本门槛：「its tests passed, but only a lane whose `ag-ui-protocol` / `@ag-ui/core` / `@ag-ui/client` resolve to 1.0 or newer counts as having adopted the protocol」，低于 1.0 的 lane 记 `PASS ON OLDER PROTOCOL` 并按失败计。
