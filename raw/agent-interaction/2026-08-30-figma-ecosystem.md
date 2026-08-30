> 来源: Figma 官方帮助文档和开发者文档; 页面直读
> 收集时间: 2026-08-30
> 工具: Figma AI/MCP 生态

## Figma Design Agent
- https://help.figma.com/hc/en-us/articles/37998629035799 - 官方指南
- 自然语言/语音 on-canvas 或 sidebar; 0→1 生成
- 布局/auto-layout; 组件实例属性/variant/文本/图像/可见性
- 样式/变量/设计系统组件; 批量内容/翻译
- 图像生成/编辑, 静态图转可编辑 vectors; 重命名
- 搜索库/文件; 评论总结/采取行动; 设计反馈
- 动画/高级 shader; 生成插件; MCP connectors; 文件级 actions
- 限制: vector editing/draw, icons, slots, prototype/interactions = coming soon
- export assets, create diagrams/data viz（Design Agent）= 不支持（用 FigJam 的 Figma AI）
- Full seat+edit access 可改共享文件; View/Dev/Collab 只读聊天
- Draft 条件另见 beta 页
- 多 prompt 并行; 来回 chat; Undo/Cmd-Z
- Full-edit 用户: 新聊天对同文件可见（2026-06-23 起）

## Figma Make
- https://help.figma.com/hc/en-us/articles/42009840449175 - 官方
- Prompt-to-functional prototype/web app
- Edit tool + 属性面板; 点击预览元素改 colors/padding/margins/text styling
- 预览标注 + 附图后批量送 agent
- 直接编辑代码; 附加 Figma design, library context, backend/secrets
- 版本历史: preview/favorite/restore
- 修改需点 Apply; 预览随 agent prompt 更新
- 多人协作: Starter/Full 创建文件; viewer 可评论
- Figma Design 工具未直接集成
- Copy preview as design layers 回 Design, 但 Design 改动不回同步 Make

## Figma MCP
- https://developers.figma.com/docs/figma-mcp-server/ - 官方
- Remote endpoint: https://mcp.figma.com/mcp（首选）和 Desktop server
- 读取: design context/metadata/screenshots/variables/motion/FigJam/Make
- 写入（remote）: create_new_file, use_figma（通用 create/edit/inspect）, generate_diagram（Mermaid→可编辑 FigJam）, generate_figma_design（live UI→layers）, upload_assets, download_assets, Code Connect maps
- use_figma 通过 Plugin API 在 Figma 文件上下文执行 JS
- 需 Full seat+edit 权限; 20KB response 限制; 暂不支持 assets/images; 自定义字体不支持; beta 质量
- 支持: Claude Code/Desktop, Codex, Cursor, Copilot CLI, VS Code, Factory, Firebender, Warp, Xcode beta
- Write-to-canvas: 仅限 remote; getting-started 写 "Full and Dev seats" 但 developer write-to-canvas 文档写 "Full seat" - [conflicting]

## Figma REST API
- https://developers.figma.com/docs/rest-api/ - 官方
- 文件/节点读取, comments, variables, dev resources, webhooks
- 未发现直接 create/update canvas node 端点
- Canvas 节点创建/修改走 Plugin API（MCP use_figma）

## 关键区别
- Design Agent: 人 + agent 协同编辑同一 Figma Design 文件; agent 直接修改, 人继续编辑/undo
- Make: agent 生成 prototype, 人配置/审批; Design↔Make 是 snapshot 复制, 非同步
- MCP: 外部 agent 读取上下文并写回; 能力层面双向但非实时持续同步
