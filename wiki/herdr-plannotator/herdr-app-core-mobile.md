# Herdr App、herdr-core 与手机：产品关系和终端访问

> Sources: Herdr 官方网站与 herdrdev/herdr-core 文档，本次采集 2026-11-12；Herdr, Inc. 的 Google Play 应用说明，本次采集 2026-11-12；用户提供的本机 `herdr --help` 输出，2026-11-12；herdr-core 安装脚本与 WSL2/Tailscale 部署实测，2026-11-13
> Raw: [Herdr 产品关系、core 接口与手机官方摘录](../../raw/herdr-plannotator/herdr-app-core-mobile-boundaries.md); [本机 Herdr TUI 默认会话与指定会话的接入命令](../../raw/herdr-plannotator/2026-11-12-herdr-tui-attach-from-phone-terminal.md); [herdr-core 安装脚本、配置定义与 WSL2/Tailscale 部署实测](../../raw/herdr-plannotator/2026-11-13-herdr-core-install-config-wsl2-tailscale.md)
> Updated: 2026-11-13

## 产品名称与各自负责的事情

| 名称 | 使用形态 | 负责什么 |
|---|---|---|
| Herdr App | 桌面图形应用 | 显示和排列终端、spaces、tabs、功能面板；使用 herdr-core 运行程序。 |
| herdr-core | 电脑上的后台程序，通过 `hc` 命令和接口使用 | 管理终端、运行程序、保存终端状态，供其他程序连接。 |
| Herdr TUI | 在终端里使用的独立管理程序 | 使用自己的 server 管理终端和 agent，与 herdr-core 各自独立。 |
| Herdr 手机 App | iPhone、iPad、Android 应用 | 通过 SSH 访问电脑上的 herdr-core，显示终端并发送输入。 |

Herdr App 与 Herdr TUI 不共享 agent。手机官方 FAQ 明确说明手机 App 的 core 连接不会自动显示 Herdr TUI 的 agent；两套程序可以在同一台电脑运行，管理各自的终端。在手机的电脑终端中手动运行 Herdr TUI 是另一种使用方式，见下文。

## 官网宣传语对应的定制范围

官网的宣传语是“用一句话改变应用”，重点是让 agent 修改 Herdr App 的界面。

对应的功能是 Herdr App 将布局、侧栏、标签、快捷键和主题保存为可修改文件。用户告诉 agent 希望怎样修改，agent 修改这些文件，可以调整界面或添加功能面板。

手机官方说明明确提到可以调整终端快捷键栏，桌面 App 创建的 spaces 和 tabs 可以在手机显示。手机是否支持任意布局和功能面板定制、桌面自定义面板是否能在手机显示，本次没有取得明确说明。

## 只运行 core 时怎样使用

herdr-core 本身不绘制图形窗口。`hc` 提供命令行操作，也提供简单的终端选择菜单：直接输入 `hc`，可以选择已有终端并连接，或者新建 shell。这个菜单与 Herdr TUI 的侧栏、workspace、标签和分屏界面各自独立。

以下是文档用法，未在本次会话执行：

```sh
hc server start
hc run --bg --name web bun dev
hc ls
hc attach web
```

需要后台程序时，CLI 会启动 core，所以通常可以直接运行 `hc run`。`hc attach` 将当前终端连接到 core 管理的终端；`Ctrl+\` 断开查看，程序继续运行。

core 可以运行 shell、脚本、编辑器、开发服务器和 coding agent。手机可访问这些普通终端；通过 OSC 7501 报告状态的 agent 还会进入 Inbox，按工作、完成或需要回答等状态排列。

基于手机 FAQ 中“every terminal on your machines”的表述，本文将其理解为 herdr-core 管理的终端；电脑其他终端窗口是否自动加入，本次没有取得明确说明。

## 手机连接需要什么

目标电脑需要 herdr-core，手机需要能够通过 SSH 登录这台电脑。用户在手机添加电脑的名称或地址，并配置登录方式。官方 Android 说明支持把手机生成的 SSH key 加到电脑，也支持 Tailscale SSH。

手机 App 直接与用户的电脑通信，不需要 Herdr 账户，终端内容不经过 Herdr 的服务器。离开家以后，Tailscale 或其他 VPN 可以提供到电脑的网络访问。

电脑仅运行 core 时，手机能够看到终端和 agent；电脑也运行 Herdr App 时，手机官方说明还支持显示其 spaces 和 tabs。使用手机不要求桌面窗口保持打开。

**WSL 场景下 Tailscale 必须装在 WSL 发行版内**：手机要登录的是 WSL 里的 SSH 入口，只装 Windows 宿主侧的 Tailscale 时手机只能到达 Windows。装好后 tailscaled 由 systemd 管理并设为自启，Windows 重启后只要 WSL 启动，Tailscale 即上线，登录状态保留。首次 `tailscale up --ssh` 需要浏览器完成一次登录。另一种拓扑是把 core 装在 Windows 侧，手机经 Windows 的 SSH 连接其 core，再由它经 `wsl.exe` 接入 WSL（官方 machines 文档给出 `hc machine add --via 'wsl.exe -d Ubuntu -e sh -c' --name wsl`），不需要 WSL 内的 sshd。本机 WSL2 部署记录见 [herdr-core 安装配置与 WSL2/Tailscale 手机接入](herdr-core-install-config-wsl2-tailscale.md)。

## SSH 和 core 通信协议分别负责什么

SSH 负责登录、主机身份确认、加密和传输。core 通过这条连接提供自己的操作接口。

core 的公开接口文档说明了以下顺序：

1. 远程客户端通过 SSH 执行 `hc connect`，将 core 协议通过标准输入和标准输出传输。
2. 连接开始使用 plain 模式：JSON-RPC 2.0，每行一条操作消息。
3. 客户端调用 `hello`，传入 `{"framed": true}`，收到回复后切换到 framed 模式。这个模式将操作消息和终端数据分成不同通道，共用同一条连接。
4. 客户端调用 `terminal.attach`，得到终端流的通道。core 先发送当前屏幕等内容，再发送程序输出；客户端通过同一通道发送键盘输入。

手机页面确认连接方式为 SSH。上面的接口顺序来自 core 文档；本次没有找到 Android 客户端源码，也没有测试手机，因此 Android 内部具体怎样调用这些接口仍未确认。

## agent 在哪里运行，手机显示什么

程序在运行 core 的电脑上执行，使用该电脑账户的文件系统和网络权限。手机负责显示终端内容和发送输入。文档说明查看方断开连接后，程序继续运行；关闭或停止 core 对程序的影响不在本文展开。

例如：电脑通过 core 启动 Claude Code，手机连接电脑并打开它的终端。用户在手机输入要求或回答确认问题，电脑上的 Claude Code 处理，后续输出传回手机显示。手机断开连接不会结束电脑上的程序。

手机 App 有 agent 列表，打开 agent 后显示的是其真实终端，可以显示程序输出的颜色和图片，支持选择与复制文字。快捷键栏提供 Esc、Ctrl、Tab 和方向键；compose 支持文字、图片和语音，发送到 agent 时作为一次粘贴并提交 Enter。

### 在手机中手动打开 Herdr TUI

手机 App 的自动 agent 列表与“在终端中启动什么程序”是两件事。用户可以在手机显示的电脑 shell 中运行 `herdr`，由 Herdr TUI 连接电脑的默认持久会话；指定会话时使用 `herdr session attach <name>`。
WSL 部署与本机自测记录见 [herdr-core 安装配置与 WSL2/Tailscale 手机接入](herdr-core-install-config-wsl2-tailscale.md)。


用户提供的本机 `herdr --help` 输出确认上述两个命令；其中没有 `herdr attach` 子命令。

在这种使用方式中，外层是手机 App 显示的 core 终端，里面运行的是 Herdr TUI。手机转发输入并显示终端输出，Herdr TUI 的程序和会话仍在电脑。这不会改变手机 App 的自动列表范围：Herdr TUI 中的 agent 不会因为手动打开界面就自动进入手机 App 的 core agent 列表。

从命令帮助和终端运行关系推断，这个操作不需要桌面 App；本次没有进行手机连接实测。

这里有两个不同对象：

- **agent 自己的 TUI**：例如 Claude Code 的输入框、菜单和确认问题，属于终端内容，手机可以显示和操作。
- **Herdr TUI**：独立的终端管理产品，手机 App 不连接其 server，里面的 agent 不会出现在手机列表。

机制推断：如果电脑上的 agent 使用云端模型，模型请求仍由该电脑上的 agent 发出；手机查看终端不会把 agent 程序迁移到手机。这一项没有通过手机连接实测。

## Android、Google 服务和华为的证据边界

官方提供 Android 应用，Google Play 应用 ID 为 `dev.herdr.app`。

Google 语音识别是可选方式，手机也支持本地语音模型。这个事实只说明语音功能的选择，不能用于判断整个应用是否强制依赖 Google Mobile Services（GMS）。

本次查阅的官方下载页面提供 Google Play 链接，没有提供独立 APK 或华为 AppGallery 链接。整个应用的 GMS 依赖和华为手机兼容性未确认；本次没有读取到官方 Android 最低系统版本说明。

## 证据范围

- 产品关系、命令、连接方式、接口顺序和手机功能来自 raw 中保存的官方摘录。
- Context7 和 DeepWiki 用于辅助核对；以官方原文为依据。
- 对 Android 内部实现、手机任意界面定制和华为兼容性，保留未知项。
- 本次没有安装程序、启动服务、连接设备或运行手机测试。命令示例来自文档。

## See Also

- [Herdr + Plannotator 工具链全量 Reference](toolchain-reference.md)
- [Herdr 配置项与用户体验](herdr-config-user-experience.md)
