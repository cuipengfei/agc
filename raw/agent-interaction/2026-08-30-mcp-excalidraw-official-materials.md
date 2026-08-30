# mcp_excalidraw 官方材料摘录（落地页 + Skill cheatsheet）

> Source: https://mcp-excalidraw-landing.vercel.app/ ; https://github.com/yctimlin/mcp_excalidraw/blob/main/skills/excalidraw-skill/references/cheatsheet.md
> Collected: 2026-08-30
> Published: Unknown

## 落地页摘录

标题："mcp_excalidraw — a whiteboard for your AI agent"，标注 "v2.0 · 26 tools · canvas feedback loop"。

定位原文："A drop-in agent skill — with MCP server fallback — that hands Claude Code, Cursor, Codex CLI & friends a live Excalidraw canvas, with element-level control, scene awareness, and a tight draw → look → adjust loop."

客户端列表原文："Works with Claude Code Claude Desktop Cursor Codex CLI OpenCode Antigravity"。

架构原文："Two servers. One canvas. A closed feedback loop. Your agent connects over stdio (MCP), the MCP server keeps the live canvas in sync via REST + WebSocket. Element-level CRUD on one end, a real Excalidraw app on the other."

Canvas server："express + Excalidraw UI"，人看 "127.0.0.1:3000"。"multiple agents can share one canvas"。

特性原文：
- "Persistent live canvas — Not one-shot prompt-to-image. Real canvas state agents can read, edit, snapshot, restore."
- "describe_scene + screenshot — Two tools let the agent inspect the canvas as structured text or an image — then iterate."
- "Multi-agent friendly — Several agents can draw on the same canvas concurrently."
- "create_from_mermaid converts your existing diagrams into native Excalidraw you can keep editing by hand."
- "export_to_excalidraw_url encrypts the scene, uploads to excalidraw.com, returns a link teammates can open."

安装（落地页原文命令）：
- Canvas server 本地：`npm ci && npm run build`，`PORT=3000 npm run canvas`
- Docker：`docker run -d -p 3000:3000 ghcr.io/yctimlin/mcp_excalidraw-canvas:latest`
- Claude Code skill：拷贝 `skills/excalidraw-skill` 到 `~/.claude/skills/excalidraw-skill`
- Codex CLI skill：拷贝到 `~/.codex/skills/`
- Claude Code MCP：`claude mcp add excalidraw --scope user -e EXPRESS_SERVER_URL=http://127.0.0.1:3000 -e ENABLE_CANVAS_SYNC=true -- node /absolute/path/to/mcp_excalidraw/dist/index.js`

## Skill cheatsheet 摘录

### MCP Tools（26 total，分类）

- Element CRUD：create_element / get_element / update_element / delete_element / query_elements / batch_create_elements / duplicate_elements
- Layout & Organization：align_elements / distribute_elements / group_elements / ungroup_elements / lock_elements / unlock_elements
- Scene Awareness：describe_scene（"AI-readable scene description (types, positions, labels, connections, bounding box)"）/ get_canvas_screenshot（"Returns PNG image of canvas for visual verification"）/ get_resource
- File I/O & Export：export_scene（".md filePath → Obsidian .excalidraw.md"）/ import_scene / export_to_image（"needs browser"）/ export_to_excalidraw_url（"Upload & get shareable excalidraw.com URL"）
- State Management：clear_canvas / snapshot_scene / restore_snapshot
- Viewport & Camera：set_viewport
- Design Guide：read_diagram_guide
- Conversion：create_from_mermaid

### REST API 端点（canvas server）

GET/POST/PUT/DELETE `/api/elements*`、`/api/elements/sync`（overwrite import）、`/api/elements/from-mermaid`、`/api/export/image`、`/api/viewport`、`/api/snapshots`、`/health`（"websocket_clients = open browser tabs"）、`/api/sync/status`。

### 已知坑（cheatsheet 原文）

"If you clear and re-send elements, Excalidraw may re-inject its cached bound texts, causing duplicates. ... The safest approach is to never put labels on background zone rectangles — use free-standing text elements instead."

"screenshot" 与 "mermaid" 等命令标注 "**browser tab required**"。

设计建议：shapes ≥ 120×60，fonts ≥ 16，gaps 40–80px，20px 网格对齐；工作顺序 "background zones → primary shapes (with text) → arrows (bound via ids) → annotations → refine (align/distribute/screenshot)"。
