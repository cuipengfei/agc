# OMP computer prelude 与桌面自动化

> Sources: 本机安装包 `@oh-my-pi/pi-coding-agent` 18.12.6 与 `@oh-my-pi/pi-natives`, 2026-10-26; can1357/oh-my-pi 的 `crates/pi-natives/src/desktop/`, 2026-10-26; Chromium 与 Electron 无障碍文档, 2026-10-26; Microsoft Learn《UI Automation Support for Standard Controls》与 Oracle Java 无障碍文档, 2026-10-26; 本机 WSL 桌面能力实测, 2026-10-26; OMP 打包文档 `omp://computer-use.md`, 2026-11-20
> Raw: [computer prelude 与桌面后端摘录](../../raw/omp-tools/2026-10-26-omp-computer-prelude-and-desktop-backends.md); [Electron 与 Windows 无障碍文档摘录](../../raw/omp-tools/2026-10-26-electron-uia-and-windows-accessibility-docs.md); [WSL 回环与桌面能力实测](../../raw/wsl-windows/2026-10-26-wsl-mirrored-loopback-and-desktop-capability-probe.md); [computer use 文档摘录：browser 分工、控制语义与平台边界](../../raw/omp-tools/2026-11-20-omp-computer-use-doc-boundary-and-control.md)
> Updated: 2026-11-20

## Overview

`computer` 是注入 `eval` 的桌面自动化 prelude，源码原文说它 `is not a standalone tool`。它同时提供两条路径：通过操作系统无障碍接口（AX）拿到语义树与元素句柄，直接按控件执行动作；以及截图加像素坐标的鼠标键盘。元素操作用不到截图。原生层是 Rust 写的 `DesktopSession`，经常驻 worker 调用，按平台落到 UI Automation、AT-SPI 或 macOS 原生 AX。默认关闭，`computer.enabled` 为 false。网页内部的 DOM 操作归同批注入的 `browser` prelude，不属于本文范围。

## 两条路径，别混用坐标系

源码的选路规则要求按界面类型分路：

> Element actions need no screenshot.

有语义控件的界面走 AX（`win.ax()` 之后用 `el.press()` 或 `el.setValue()`），画布、镜像设备与自绘控件才走截图与像素。AX 树是一个字符串，一行一个节点，带 `[ref=eN]` 标签，遍历与 `.map` 都被明确禁止。指针坐标是最近一次同一目标的完整截图里的像素；AX 坐标是全局桌面坐标；两者禁止混用，`zoom` 出的放大图不能用来点击。

## 与 browser prelude 的分工

`computer` 不是浏览器 DOM API。网页内部的对象归 `browser`：选择器、ARIA/DOM 检查、页面内 JavaScript 与 CDP 标签页控制。`computer` 只处理原生桌面层：窗口枚举、截图、原生键鼠、AX 树与剪贴板。

选路按界面类型：

| 目标 | 路径 |
|---|---|
| 页面内的元素、表单、脚本与标签页 | `browser` |
| 原生界面且暴露语义控件 | `computer` 的 AX 路径：`win.find()` 后用 `el.press()` |
| 画布、镜像设备、自绘控件 | `computer` 的截图加像素路径 |
| 原生菜单栏命令 | `win.menu.select([...])`，不必点像素 |

`browser` 够不着的四类对象：

- 浏览器或 Electron 应用的原生外壳，例如窗口菜单栏。
- 系统「打开/保存」面板：内容由 `openAndSavePanelService` 绘制并接收输入，投给应用的键鼠被丢弃。
- 未开 `--remote-debugging-port` 的 Electron 应用（中继要求浏览器扩展，这类应用不加载）。
- 非网页的桌面程序，例如 Finder、Notes、Win32 或 WPF 工具。

反向判断同样成立：只做网页与 Web 形态工具的工作时，`browser` 覆盖全部交互面，`computer` 保持关闭即可。本机 `omp/agent/config.yml` 当前为 `computer.enabled: false`、`browser.enabled: true`。

WSL 边界决定这个判断在哪些机器上继续成立：WSL 内的 `computer` 看不到 Windows 宿主窗口（见「本机 WSL 的能力矩阵」），跨 WSL2 与 Windows 的浏览器控制只能走 `browser` 的回环或 CDP 路径。Windows 桌面上的原生程序要在 Windows 侧运行 OMP 才可操作。

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

- read 与 exec 是审批分类，是否真的询问由 `tools.approvalMode` 决定：默认 `yolo` 自动批准各级；`always-ask` 对写与 exec 询问，`write` 只对 exec 询问；逐工具策略的 `allow`、`prompt`、`deny` 在所有档位生效；没有会话设置上下文时按 `always-ask` 处理。
- `computer.run(..., { read_only: true })` 落在 read 级，只挡 `desktop` facade 的输入与剪贴板写入；脚本运行在持久 JS 会话里，仍有完整 Bun/Node 宿主访问（`process`、`require`、`fs`），不是沙箱。
- `computer.control.acquire({ reason })` 与批准档位无关，细节见「输入锁、急停与人类介入」。
- 默认先走后台投递，不移动指针、不激活目标窗口；后台路线不可用时由 `computer.backgroundFallback` 决定：默认 `takeover` 重跑该次调用并接管，之后把焦点交还用户的程序，`refuse` 直接报 `BackgroundUnavailable`。显式 `takeover: true` 一开始就走前台投递。
- macOS 有物理 Escape 全局中断；Wayland 下 `globalEscape` 为 false，只能靠宿主中断。

## 输入锁、急停与人类介入

- 原生改动与菜单读取会获取跨进程的 OS 输入/焦点锁；其他会话持有时最多等 5 秒，随后在发出输入前返回 `InputBusy`，截图与只读检查不受影响。锁在操作与清理结束后释放，不在整个会话期间持有。持有者是 agent 时，错误写出该 agent 名称与 omp 进程号；Windows 只命名同一 omp 内的持有者。
- 物理 `Esc` 可中止接管类输入：`takeover: true` 的操作、持有 `computer.control` 期间的操作、桌面或显示器级输入、`raise()`、以及 `apps.open` 的 `activate` 或 `reveal`。等待输入锁的接管操作在等待期间也武装急停。
- 未持有控制时，后台窗口输入与 AX 语义操作不监听按键；宿主中断（OMP 内按 Esc 或取消工具调用）仍能停止它们并释放按住状态。急停不吞键，合成的 Escape 组合键不触发它。
- 被 `Esc` 中止后，该会话在同一回合内后续所有 `computer` 调用在抵达桌面前被拒绝，模型被要求停止并报告已做与剩余。用户的下一条消息（含 steer 与 follow-up）解除拒绝；agent 自己产生的消息不解除。拒绝属于被中止的会话，父会话与子 agent 各自独立。
- macOS 接管前先等用户连续 5 s 没有按键与点击；等待在运行超时前 0.25 s 结束，仍未空闲就抛 `UserIntervened` 且不发送输入。X11 同样先等。
- 操作期间用户切到目标应用或在该应用内输入，抛 `UserIntervened`，该调用不会以接管方式重跑；重新读取窗口后继续。
- `computer.control.acquire({ reason })` 请求现场人工确认，不受批准档位影响；无交互界面返回 `no-ui`，拒绝或取消返回 `denied`，无人回应返回 `unanswered`，确认在调用超时前 5 秒过期。
- 无人可问的机器用字面键 `tools.approval["computer.control"]` 代为作答：`allow` 或 `deny`。嵌在 `computer` 下不生效；默认 `yolo`、`--auto-approve` 与 `tools.approval.computer: allow` 都不影响它。
- 授权不改变投递方式：省略 `takeover` 仍在后台执行，只有显式 `takeover: true` 才前台投递。授权期间该运行持有桌面输入锁，其他 OMP 运行的输入以 `InputBusy` 失败。

## 菜单、剪贴板与多步执行

- `win.menu.items()` 列顶层菜单，`win.menu.items("File")` 列子菜单，`win.menu.select(["File", "Export…"])` 执行命令。匹配优先精确标题，其次忽略大小写与尾随省略号；路径有歧义直接拒绝，不猜快捷键。
- 剪贴板用 `computer.clipboard.read()` 与 `computer.clipboard.write()`。
- `computer.run` 内的 `wait(milliseconds)` 睡眠，`wait(predicate, { timeout, interval })` 轮询到真值，优于手写轮询循环。
- 运行与直接调用超时默认 120 秒，限制在 1–300 秒并受 `tools.maxTimeout` 上限约束；`0` 不会关闭超时。

## 屏幕休眠与锁屏

- macOS 在 agent 使用桌面期间持有 `PreventUserIdleDisplaySleep` 断言，`pmset -g assertions` 显示为 "oh-my-pi computer tool is operating the desktop"。它不唤醒已睡眠的显示器，也不解锁屏幕。
- 锁屏且显示器亮时：整屏截图显示锁屏界面，窗口截图显示锁屏前最后一帧，后台点击仍能到达锁屏后的应用，键击、接管与 AX 操作全部失败。锁屏且显示器睡眠时：截图、点击与键击全部失败。没有 agent 输入到达过锁屏密码框。
- `capabilities()` 报告 `screenLocked` 与 `displayAsleep`；失败调用会写出该状态，锁屏或睡眠中结束的运行以 `Note:` 行开头。

## 平台后端与框架覆盖

平台后端与权限：macOS 14 起截图走常驻原生事件循环 worker 里的 ScreenCaptureKit，12 与 13 走进程内 CoreGraphics，AX 与输入为原生实现；权限记在启动 OMP 的应用（终端或 IDE）上，要在系统设置里授予「屏幕录制」与「辅助功能」后重启它，缺屏幕录制时其他应用的窗口标题读为空。Linux X11 需要可读显示与 RandR/XTEST；Wayland 走 RemoteDesktop portal 或 `LIBEI_SOCKET`，缺 `libpipewire-0.3.so.0` 时 `capabilities()` 报 `capture: false`。Windows 用原生捕获、Win32 输入与 UI Automation。

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
- [OMP computer use 与 agent-desktop 对照](../agent-tooling/omp-computer-use-vs-agent-desktop.md)
