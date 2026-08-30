> 来源: GitHub API + 官方 README/文档; tldraw.dev 文档; Context7 片段
> 收集时间: 2026-08-30
> 工具: tldraw 生态深挖

## tldraw 核心
- https://github.com/tldraw/tldraw - 50,034 stars, 许可: Other（生产需 license key）
- 无限画布 React SDK, 自定义 shapes/tools/bindings, 运行时 Editor API, AI 集成
- 通过 @tldraw/sync 自托管多人协作（WebSocket, room ID, 增量 patch, 光标同步）
- @tldraw/driver: 模拟指针事件, 命令式 Editor API（create/update/delete/get shapes）

## tldraw Agent Starter Kit
- https://github.com/tldraw/agent-template - 34 stars, MIT
- 参考模板, 非托管服务
- 默认 actions: create/update/delete shapes, 手绘笔, 多 shape 旋转/缩放/对齐/分布/堆叠/重排, thinking/messages, todo list, 移动视口, 统计匹配 shapes, 安排后续工作
- 上下文模型: 用户消息, 选中项, 截图, 视口简化 shapes, 屏外 clusters, 近期 actions, 聊天历史, lints
- Agent prompt() API 含 request/cancel/reset; 右侧 chat panel
- Modes 定义 parts（agent 看到什么）和 actions（能做什么）, 可扩展 typed Zod schemas + sanitization + streaming

## tldraw MCP App（官方）
- https://github.com/tldraw/tldraw/tree/main/apps/mcp-app - 生产应用, tldraw 许可
- Cloudflare Worker server + TldrawMCP Durable Object/SQLite
- 工具: search（Editor API spec）, exec（对 live editor 执行 JS via pending callback）, _exec_callback, save/read_checkpoint
- Widget 运行 focused editor proxy, 将 AI-friendly flat shapes/IDs 翻译为 TLShape/TLShapeId
- 状态检查点存入 DO SQLite + 浏览器 localStorage; 最多 50 个检查点, 7 天闲置 TTL
- 支持 Cursor（remote HTTP 或 local via mcp-remote）, Claude Desktop, ChatGPT web（local HTTPS tunnel）
- 人协同编辑: 用户直接操作内嵌 widget, agent 通过 exec 操作同一画布
- MCP host 在聊天内联渲染 widget
- 博客（2026-03-03）描述 3-tool 首发（create/edit/delete）; 当前 main README 是更新实现

## tldraw computer
- https://computer.tldraw.com/ - 托管实验产品
- 可视化编程, 连接组件, 与 agent 分支/循环/迭代
- 未找到公开源码仓库或协议文档
- 可用性和精确同步语义 [未知]

## tldraw offline
- https://tldraw.dev/blog/tldraw-offline（2026-07-16）
- 免费基于文件的桌面应用, 无账号/服务器, 本地/私有 .tldraw 文件
- Agent（Claude Code, Codex, Pi）访问/编辑文件并添加持久 JS 脚本
- 脚本驱动编辑器/创建 shapes/导入资源/监听变更
- 应用打开本地端口供 raw JS 执行（更宽松的 guardrails）
- 本地 agent-人共享画布, 非实时多用户 SaaS 同步

## @tldraw/sync
- https://tldraw.dev/docs/collaboration
- WebSockets, 共享 room ID, 增量 patch, 重连/丢失变更回放
- 光标/选中项/视口同步
- 推荐自托管 Cloudflare Durable Objects + SQLite 持久化 + R2 资源
- 实时 WebSocket 多人协作; agent 可使用 Editor API
- MCP App 使用 per-session DO 检查点/localStorage, 非共享 room WebSocket 协作
