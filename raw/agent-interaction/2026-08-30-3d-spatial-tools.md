> 来源: GitHub API + 官方 README/文档; blender.org 官方页面
> 收集时间: 2026-08-30
> 工具: 3D 人-agent 交互工具

## Blender MCP（ahujasid/blender-mcp）
- https://github.com/ahujasid/blender-mcp - 26,505 stars, MIT
- Blender 5.1+ 插件 + 外部 MCP server + 任意 MCP LLM client
- 自然语言调用 Blender Python API
- 分析/查询/修改 scene, 重命名, geometry-node 文档
- 结果直接呈现在 Blender 3D viewport/文件中, 人继续编辑
- 安全警告: LLM 代码执行无保护, 可能删除/外传数据
- 支持 Claude/Cursor/VS Code/OpenCode

## threejs-devtools-mcp
- https://github.com/DmitriyGolub/threejs-devtools-mcp - 88 stars, MIT, v0.4.1
- MCP server 含 59 个工具
- 任意 AI agent 检查/修改浏览器中运行的 Three.js/R3F scene
- WebSocket bridge 注入, 无需修改项目
- Scene tree, object/material/shader/light/texture/animation, 截图/点击检查, 诊断/性能/内存
- 内置 devtools overlay: scene graph, material editor, 3D preview
- 人在浏览器视觉界面操作, agent 修改同一运行 scene
- 需要浏览器标签页 + 本地 dev server

## Spline AI Agent + MCP
- https://spline.design/solutions/design-with-ai-agents-mcp-3d - 商业 SaaS
- Claude/Cursor 直接连接 3D workspace
- Agent 检查 scene, 创建/排列 objects, 材质, 状态
- 动作落入视觉编辑器, 人实时 art-direct
- 免费起步; MCP 更高调用上限在 Max 套餐
- [verified: 厂商自述]

## 3D-Agent for Blender
- https://3d-agent.com/ - 商业
- 独立应用伴随 Blender（4.2+ macOS/Windows）
- 读取 Blender viewport, 在打开 scene 内生成模型/纹理/动画/脚本
- 自然语言移动 objects, 改镜头/灯光
- 支持 undo/iterate
- Basic/Pro/Ultra 付费月度 prompts
- [single-source: 厂商自述]

## Meshy 3D Agent + MCP/Skills
- https://www.meshy.ai/features - 商业 SaaS
- 文本/图像转 3D, 纹理, 重拓扑, UV, rig/动画, 打印
- MCP 可接 Claude/Cursor/Copilot
- API/skills 可下载到本地
- "共享资产生成工作区" 非实时协同编辑
- 免费仅个人/评估
