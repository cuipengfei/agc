# mcp_excalidraw：给 Agent 一块活画布

> Sources: mcp_excalidraw 官方落地页与 Skill cheatsheet; GitHub API 仓库实证; excalidraw/excalidraw-mcp 官方 README，2026-08-30
> Raw: [官方材料摘录](../../raw/agent-interaction/2026-08-30-mcp-excalidraw-official-materials.md); [仓库实证](../../raw/agent-interaction/2026-08-30-mcp-excalidraw-repo-evidence.md); [官方 excalidraw-mcp 摘录](../../raw/agent-interaction/2026-08-30-excalidraw-official-mcp.md)
> Updated: 2026-08-30

## 是什么

[yctimlin/mcp_excalidraw](https://github.com/yctimlin/mcp_excalidraw)（MIT，2,362 stars）：让 AI coding agent 在一块**活的 Excalidraw 画布**上画图的系统。不是 prompt-to-image 一次性生成，而是元素级控制 + 场景感知 + 截图反馈的**迭代环**：agent 画完能"看见"自己的作品（describe_scene 结构化文本 / get_canvas_screenshot 图像），然后改到对为止。产物是可提交进 repo 的 `.excalidraw` 文件。

## 架构

两个 server 一块画布，闭环反馈：

```
AI Client (Claude Code / Cursor / Codex CLI / OpenCode / Claude Desktop / Antigravity)
  → stdio MCP（26 tools）或 Agent Skill + CLI（推荐路径）
  → MCP Server（node dist/index.js）
  → REST + WebSocket → Canvas Server（express + Excalidraw UI，127.0.0.1:3000）
```

- 持久状态：命名快照 snapshot/restore（时间旅行）；多个 agent 可并发写同一画布
- Mermaid 转换：create_from_mermaid 把现有 Mermaid 图转成可继续手编辑的原生 Excalidraw
- Obsidian 互导：`.excalidraw.md` vault 原生格式（2026-07-17 加入）
- 安装三路径：skill 拷贝（`~/.claude/skills/` 或 `~/.codex/skills/`，推荐）、各客户端 MCP 配置、Docker（`ghcr.io/yctimlin/mcp_excalidraw-canvas`）

## 工具面（26 个 MCP 工具，7 类）

元素 CRUD（7）、布局对齐（6）、场景感知（3，反馈环核心）、文件 I/O 与导出（4）、状态管理（3）、视口相机（1）、Mermaid 转换（1）+ 设计指南（1）。另有完整 REST API 和 CLI。详见 raw 中的 cheatsheet 摘录。

## 维护健康度（2026-08-30 快照）

- 活跃：v2.0.0 发布于 2026-08-08，支持 MCP 协议修订版 2026-07-28；最近 commit 2026-08-21（加固 npm 发布链路）
- 工程纪律在增强：有 stdio 和 local-bind 两个冒烟测试脚本
- **有效巴士因子 ≈ 1-2**：18 个 contributors，但 yctimlin 占近 100 个采样 commit 中的 58 个（约三分之二），第二名 frNNcs 仅 8 个；无具备接管能力的第二维护者
- 无 GitHub Releases，分发走 npm（`mcp-excalidraw-server`，Node ≥ 20）和 ghcr.io

## 企业/离线评估

| 维度 | 结论 |
|---|---|
| 画布与 MCP server | 全本地，绑定 127.0.0.1:3000；有专门脚本验证 local bind |
| 外联点 1 | `export_to_excalidraw_url` / `share` 会把**加密场景上传到公网 excalidraw.com**——企业内必须禁用或不调用；其余功能不依赖它 |
| 外联点 2 | 安装期依赖 npm registry 与 ghcr.io（个人命名空间）——可转内部制品库 |
| 鉴权 | canvas server **无鉴权**，同机任何进程可调 REST API；单人工位可接受，共享主机需注意 |
| 模型后端 | 视觉层与模型解耦；harness 指向内部 LLM 网关即可（换内部端点未实测） |

## 已知坑

1. 清空后重发元素，Excalidraw 可能重新注入缓存的 bound text 造成重复——官方建议不要把标签放在背景区域矩形上，用独立文本元素
2. 截图、图片导出、视口控制、Mermaid 渲染**需要浏览器标签页开着**（canvas 前端是执行端）

## 与官方 excalidraw/excalidraw-mcp 的区别

两者只是名字像，产品形态不同：

| 维度 | 官方（5207 stars） | yctimlin（2,362 stars） |
|---|---|---|
| 形态 | **MCP App**：图作为交互 widget 渲染在聊天里 | **画布工作台**：独立持久画布 |
| 交互 | 一次性生成（"draw a cute cat"） | draw→look→adjust 迭代环 |
| 客户端 | 需支持 MCP Apps（Claude、ChatGPT、VS Code、Goose）；**推荐托管端点 mcp.excalidraw.com** | 任意 stdio MCP client + skill |
| 状态 | 无持久共享画布 | 持久 + 快照 + 多 agent 并发 |
| 产物 | 图活在聊天会话里 | `.excalidraw` 文件进 repo |
| 维护 | 2026-02-04 创建，**2026-03-24 后无更新**；从个人仓库转入 excalidraw org；GitHub license 字段 null（README 声明 MIT） | 活跃，2026-08 仍在发布 |

一句话：官方版是"聊天里的一次性插图生成器"，yctimlin 版是"agent 的长期绘图工位"。要人机围绕同一视觉产物反复迭代，选后者。

## 采用建议（企业内）

三个前置动作：内部镜像 npm/Docker 制品；禁用 `export_to_excalidraw_url`；接受上游演进依赖单人（或 fork 自持，MIT 无障碍）。

## See Also

- [视觉人机交互全景](../agent-interaction/visual-canvas-interaction-landscape.md) — 本工具所在的类目地图与过滤口径
- [产物可持续编辑 genre](../agent-interaction/sustainable-artifact-editing.md) — 同一设计思想的另一条实现线（语义地址）
