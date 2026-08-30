# 官方 excalidraw/excalidraw-mcp 摘录（README + 元数据）

> Source: https://github.com/excalidraw/excalidraw-mcp（README 全文经 GitHub API 获取）
> Collected: 2026-08-30
> Published: Unknown

## 仓库元数据（GitHub API，2026-08-30 快照）

- created_at: 2026-02-04T23:04:00Z
- pushed_at: 2026-03-24T12:27:09Z（此后无更新）
- stargazers_count: 5207
- license 字段: null（GitHub 未自动识别；README 文末声明 "License: MIT"）
- description: "Fast and streamable Excalidraw MCP App"

## README 关键原文

定位："MCP server that streams hand-drawn Excalidraw diagrams with smooth viewport camera control and interactive fullscreen editing."

客户端："Works with any client that supports MCP Apps — Claude, ChatGPT, VS Code, Goose, and others."

安装："Remote (recommended) — https://mcp.excalidraw.com"。本地选项：下载 `excalidraw-mcp-app.mcpb` 双击装入 Claude Desktop；或 build from source 后以 `--stdio` 挂进 `claude_desktop_config.json`。

Usage 示例 prompt："Draw a cute cat using excalidraw"；"Draw an architecture diagram showing a user connecting to an API server which talks to a database"。

MCP Apps 说明："MCP Apps is an official Model Context Protocol extension that lets servers return interactive HTML interfaces (data visualizations, forms, dashboards) that render directly in the chat."

可自部署到 Vercel（"No environment variables needed"）。Issues 链接指向原作者仓库 antonpk1/excalidraw-mcp-app（项目由个人仓库转入 excalidraw org）。

## 社区口径（旁证）

- Glama（yctimlin 页）："Excalidraw now has an official MCP — it's great for quick, prompt-to-diagram generation rendered inline in chat."
- claudemarketplaces.com："Excalidraw has an official MCP — a chat widget that streams a diagram inline from a single prompt (the model gets two tools: a format reference and create_view)."
- Delulu9（2026-02-17）："Excalidraw does not have an official, first-party MCP server as of early 2026."——已被 2026-02-04 创建的官方仓库事实取代（时间线上该文稍后即过时）。

另：Excalidraw+ 有托管版 MCP（https://plus.excalidraw.com/docs/mcp），面向付费 workspace，属 SaaS。
