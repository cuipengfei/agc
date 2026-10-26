# OMP computer prelude 与桌面自动化

> Sources: 本机安装包 `@oh-my-pi/pi-coding-agent` 18.12.6 与 `@oh-my-pi/pi-natives`, 2026-10-26; can1357/oh-my-pi 的 `crates/pi-natives/src/desktop/`, 2026-10-26; Chromium 与 Electron 无障碍文档, 2026-10-26; Microsoft Learn《UI Automation Support for Standard Controls》与 Oracle Java 无障碍文档, 2026-10-26; 本机 WSL 桌面能力实测, 2026-10-26
> Raw: [computer prelude 与桌面后端摘录](../../raw/omp-tools/2026-10-26-omp-computer-prelude-and-desktop-backends.md); [Electron 与 Windows 无障碍文档摘录](../../raw/omp-tools/2026-10-26-electron-uia-and-windows-accessibility-docs.md); [WSL 回环与桌面能力实测](../../raw/wsl-windows/2026-10-26-wsl-mirrored-loopback-and-desktop-capability-probe.md)
> Updated: 2026-10-26

## Overview

`computer` 是注入 `eval` 的桌面自动化 prelude，源码原文说它 `is not a standalone tool`。它同时提供两条路径：通过操作系统无障碍接口（AX）拿到语义树与元素句柄，直接按控件执行动作；以及截图加像素坐标的鼠标键盘。元素操作用不到截图。原生层是 Rust 写的 `DesktopSession`，经常驻 worker 调用，按平台落到 UI Automation、AT-SPI 或 macOS 原生 AX。默认关闭，`computer.enabled` 为 false。

## 两条路径，别混用坐标系

源码的选路规则要求按界面类型分路：

> Element actions need no screenshot.

有语义控件的界面走 AX（`win.ax()` 之后用 `el.press()` 或 `el.setValue()`），画布、镜像设备与自绘控件才走截图与像素。AX 树是一个字符串，一行一个节点，带 `[ref=eN]` 标签，遍历与 `.map` 都被明确禁止。指针坐标是最近一次同一目标的完整截图里的像素；AX 坐标是全局桌面坐标；两者禁止混用，`zoom` 出的放大图不能用来点击。

## 分层

| 层 | 组成 |
|---|---|
| 预置对象 | `eval` 全局 `computer`，导出 `windows`、`screenshot`、`click`、`ax`、`run` 等 |
| 宿主侧 | 审批、会话快照、`supervisor` |
| 常驻 worker | 消息协议见 `protocol.ts`，持久保存窗口句柄、截图帧与 ref |
| 原生层 | `@oh-my-pi/pi-natives` 的 `DesktopSession`：`Persistent, serialized native desktop capture/input/accessibility session` |
| 平台后端 | Windows 用 UI Automation；Linux 用 AT-SPI（D-Bus）加 X11 或 Wayland 输入；macOS 用原生 AX |

Linux 原生二进制里的符号可以佐证后端构成：`ATSPI`、`atspi-proxies-0.14.0`、`org.a11y`、`x11rb`、`XTEST`、`libei`、`uinput`、`pipewire`。

## 本机 WSL 的能力矩阵

直接构造 `DesktopSession` 读到的能力：

| 能力 | 值 | 后果 |
|---|---|---|
| 后端 | wayland | 走 Wayland 分支 |
| 截图 | false，原因 `unavailable` | 像素路径不可用 |
| 无障碍 | true，`granted` | AT-SPI 可用 |
| 输入 | true | 可发键鼠事件 |
| 显示数 | 0 | 没有可枚举的显示器 |
| 窗口数 | 0 | 没有可操作窗口 |
| 应用条目 | 110 | 来自 `/usr/share/applications` 的 .desktop 条目 |

所以在这台机器上，`computer` 只能作用于 WSL 内部的 Linux 图形程序，且当前没有窗口；Windows 宿主机的窗口对它完全不可见。要在 Windows 桌面做事，OMP 需要在 Windows 侧运行。

## 快照上限与截断

`ax()` 与 `observe()` 的默认上限是 800 个节点、深度 24；超出时置 `truncated`，并在文末追加 `… truncated (N nodes)`。不可读子树会跳过并追加 `… skipped N unreadable nodes`。渲染前还会折叠未命名容器。

`win.find()` 走另一条查询路径：节点上限 5000、深度 24，默认返回 100 条、最多 5000 条；引用注册表在超过 5000 条时按最大目标的最旧一批淘汰。

对大界面这就决定了用法：先 `find({ role, title })` 定位，再按 ref 操作；`ax()` 只用来确认树是否存在。

## 审批、接管与中断

- 只读类动作（`windows`、`screenshot`、`ax`、`find`、`clipboard.read`、`capabilities`）走 read 审批；输入与改动类走 exec 审批；`computer.run(..., { read_only: true })` 落在 read 级。
- `computer.control.acquire({ reason })` 需要人工确认，拒绝原因分 `denied`、`no-ui`、`unanswered`，其中 `no-ui` 表示该会话根本没有人可以询问。
- 默认在后台投递输入，不动你的指针、不激活目标窗口；只有 `takeover: true` 才临时接管。
- `computer.run` 在持久 JS 会话里执行，有完整 Bun/Node 与工具桥，不做沙箱隔离。
- macOS 有物理 Escape 全局中断；Wayland 下 `globalEscape` 为 false，只能靠宿主中断。

## 平台后端与框架覆盖

Windows 后端使用 UIA 客户端库，读取 `ControlType`、`RuntimeId`、`FrameworkId`、`AriaRole`、`ProviderDescription` 等属性，按 `Invoke`、`Toggle`、`SelectionItem`、`ExpandCollapse`、`Value`、`LegacyIAccessible`、`ScrollItem` 这些模式执行动作。

| 应用类型 | 覆盖 | 条件 |
|---|---|---|
| Win32 通用控件 | 逐类可查 | 经 `UIAutomationClientsideProviders.dll` 暴露；完整支持要求 ComCtrl32 第 6 版。`SysDateTimePick32`、`SysMonthCal32` 等在不支持清单里 |
| WPF | 覆盖高 | 提供信息或支持交互的元素有完整原生支持；面板对 UIA 不可见；自绘内容不在其中 |
| WinForms | 分两档 | 一档直接支持（`Button`、`ListView`、`TextBox`、`TreeView`、各标准对话框等）；另一档仅经 MSAA 暴露、部分功能不可用（`Form`、`Panel`、`DataGridView`、`MenuStrip`、`ToolStrip`、`SplitContainer`、`PropertyGrid` 等） |
| WinUI 3、Tk、GTK | 动作可达，覆盖按版本 | 源码注释点名它们会丢投递式点击，因此要依赖 UIA 模式而不是像素点击；树本身是否完整需实测 |
| Java Swing、AWT | 默认不可见 | Java Access Bridge 默认未启用，需 `jabswitch -enable` |
| JavaFX | 另有实现 | 使用自己的无障碍实现，是否需要额外开关按版本确认 |
| 自绘界面 | 基本没有 | 坐标点击白名单只接受 `Button`、`MenuItem`、`Hyperlink`、`CheckBox`、`RadioButton`、`TabItem`；`Pane`、`Custom`、`Document`、`SplitButton`、`TreeItem`、`ListItem` 被测试明确排除 |

## Electron 与 VS Code 的可用条件

Electron 应用能否被读到，取决于三件事叠加。

**一、无障碍是否被激活。** Chromium 原文：

> For performance reasons Chromium waits until it detects the presence of assistive technology before enabling full support for accessibility APIs.

检测方式是在 Windows 上发出带自定义 object id 1 的 `EVENT_SYSTEM_ALERT`，收到对应的 `WM_GETOBJECT` 才认定有无障碍客户端。覆盖手段有三个：启动时加 `--force-renderer-accessibility`、在浏览器里打开 `chrome://accessibility`、或由应用调用 `setAccessibilitySupportEnabled(true)`。前两条针对浏览器；`chrome://accessibility` 在 Electron 应用里不存在。

Electron 文档另说：

> Electron applications will automatically enable accessibility features in the presence of assistive technology

**二、走哪条连接。** Browser Relay 依赖在浏览器里加载未打包扩展，VS Code 这类应用不加载任意 Chrome 扩展，因此**中继对它不可用**。可行的是 Direct CDP，前提是应用启动时开了 `--remote-debugging-port`——Electron 文档支持该开关，但把参数直接传给 VS Code 的可执行文件是否生效未验证。

**三、树有多大。** Electron 应用的界面是网页，AX 树对应 DOM，节点多、层级深，`ax()` 的 800 节点预算很容易在目标控件之前用完。Chromium 自 Chrome 138 起在 Windows 默认启用原生 UIA provider，比此前经模拟层更可靠，但节点数量不会因此变少。VS Code 的编辑器对行做过虚拟化，未滚入视野的内容不在树里——这一条是推断，未实测。

结论：能用，但要按 `find()` 定位；界面内的元素优先走 `browser` 的 Direct CDP，原生部分才用 `computer`。

## 判断方法

```javascript
const win = await computer.window({ title: "目标程序" });
const obs = await win.observe({ maxDepth: 8 });
// nodeCount 为 0 或只有窗口节点 → 无障碍未激活
// truncated 为 true → 树超预算，改用 find()
```

三条经验：树里有具体控件类型与 `actions` 才走 AX；整窗只有 `Pane`/`Custom`/`Document` 就走像素；反复读同一棵树没有新节点就该换路径。

## See Also

- [OMP browser prelude 与 relay 架构](browser-prelude-and-relay-architecture.md)
- [OMP 内建工具全集、会话暴露边界与内部地址空间](builtin-tools-and-internal-urls.md)
- [OMP 配置语义手册](../omp-config/config-semantics.md)
- [键盘驱动指针控制横评](../keyboard-input/keyboard-driven-pointer-control.md)
