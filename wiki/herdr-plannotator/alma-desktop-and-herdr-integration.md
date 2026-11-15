# Alma 桌面应用与 Herdr 集成

> Sources: Alma 官网与功能文档，2026-11-15 查阅；Herdr TUI 集成文档，2026-11-15 查阅；Alma Relay README，2026-11-15 查阅
> Raw: [Alma 产品与功能](../../raw/herdr-plannotator/alma-product-and-features.md); [Alma 与 Herdr 集成](../../raw/herdr-plannotator/alma-herdr-integration.md); [Alma Relay 远程访问](../../raw/herdr-plannotator/alma-relay-remote-access.md)
> Updated: 2026-11-15

Alma 是桌面 GUI AI Agent 应用，支持 Windows、Linux 和 macOS。它可以独立连接模型服务商处理对话和任务，也可以连接 Herdr 服务，作为 Agent 会话的图形客户端。官网还提供与电脑配对的 iPhone 和 Android 应用。以下功能来自官方说明，本次没有安装或运行软件。

## 独立使用

独立使用时，用户在 Alma 中配置模型服务商和 API key，选择模型并发送消息。处理项目时，可以将对话关联到项目目录。Alma 提供文件操作、Shell、网页搜索和浏览器工具，也支持 Skills 和 MCP；官方文档说明，读取文件、搜索和网页获取等操作可自动运行，写入文件、运行 Shell 命令和删除内容等操作会请求批准。

Alma 可以从对话提取记忆，在相关对话中检索；用户可以查看、编辑和删除记忆。AI 生成 HTML、React、SVG、Mermaid 和 Markdown 等内容时，Alma 可以显示 Artifact 预览。官网称对话保存在本机数据库，API Key 直连服务商。

## 连接 Herdr

Alma 官方指南说明，Agent 在 Herdr 面板里运行，Alma 连接电脑上的 Herdr 服务。用户在 Alma 将侧边栏切换到 **Agent** 后，可以按需要输入、工作中、已完成等状态查看 Agent，选择面板阅读和回复，并切换到**屏幕**视图操作真实终端。Alma 还提供工作区和标签页管理；关闭标签页会退出其中的 Agent，会话记录保留在电脑上。

Claude Code、Codex 和 pi 的会话记录可显示为对话，工具调用、子 Agent 和文件改动按顺序展示。官网说明 Herdr 中运行的其他程序可以显示为实时终端。

### Herdr 产品和版本

Alma 指南将连接对象称为 Herdr 服务，并列出 `HERDR_SESSION`、`HERDR_SOCKET_PATH` 和 Herdr socket 的查找约定。结合 [Herdr App、herdr-core 与手机](herdr-app-core-mobile.md) 对 Herdr TUI 独立服务的说明，**推断 Alma 指南描述的是 Herdr TUI 服务**。Alma 指南没有给出最低 Herdr 版本。

Herdr 官方说明 OMP 集成可以报告 `omp` 标签、运行状态和会话身份，供 Herdr 使用；Alma 的结构化对话视图清单明确列出 Claude Code、Codex 和 pi，未明确列出 OMP。**OMP 能否使用 Alma 的结构化对话视图尚未确认。**

Alma 文档描述了本机 socket 查找方式；Windows 版 Alma 连接 WSL 内 Herdr 服务的方式尚未查明。

## 手机访问

Alma 官网说明 iPhone 和 Android 应用与电脑上的 Alma 配对；Alma 再连接电脑上的 Herdr 服务。详细指南描述的 iPhone 流程包括查看和回复 Agent、启动 Agent、接收推送，以及在获得屏幕录制和辅助功能权限后远程操作 Mac 屏幕。Android 各项界面能力和通知条件未逐项确认。

官方指南说明，可以连接局域网时使用直连，否则通过 Alma 中继连接。Alma Relay 项目说明，中继连接默认启用端到端加密；官方托管中继和自行托管的中继均有提供。自行托管的中继不能向官方 Alma iOS 应用发送推送。

Herdr 官方手机 App 的连接对象是 herdr-core，其产品关系和 SSH 访问方式见 [Herdr App、herdr-core 与手机](herdr-app-core-mobile.md)。

## See Also

- [Herdr App、herdr-core 与手机：产品关系和终端访问](herdr-app-core-mobile.md)
