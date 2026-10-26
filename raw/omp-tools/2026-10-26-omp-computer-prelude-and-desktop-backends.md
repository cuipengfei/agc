# OMP computer prelude 与桌面自动化后端摘录

> Source: 本机安装包 `@oh-my-pi/pi-coding-agent` 18.12.6；同包 `src/prompts/tools/computer.md`；`@oh-my-pi/pi-natives` 的类型声明与 Linux 原生二进制；can1357/oh-my-pi 仓库 `crates/pi-natives/src/desktop/`（`ax.rs`、`types.rs`、`win32/ax.rs`）
> Collected: 2026-10-26
> Published: Unknown

## 定位与默认值

`src/prompts/tools/computer.md:1` 原文：

> Control the host desktop from JavaScript or Python Eval with the global `computer` object: windows, screenshots, native input, OS accessibility (AX) trees, clipboard. It is not a standalone tool.

`src/tools/settings.ts:602-606`：`computer.enabled` 类型 boolean，默认 false。本机实测当前会话 `typeof computer === "undefined"`。

## 两条操作路径

`computer.md:52` 原文：

> Choose the route by the surface: use AX for exposed semantic controls (`win.ax()` → `el.press()`/`el.setValue()`), and window screenshots/pixels for canvases, mirrored devices, and custom-drawn controls. Element actions need no screenshot.

`computer.md:55` 原文：

> Pointer `x,y`: pixels in the MOST RECENT FULL screenshot of the SAME target. `zoom` uses a rectangle in that frame and returns a detailed view without changing it; subsequent clicks still use the full screenshot, never zoom pixels. AX coordinates are global desktop coordinates. NEVER mix them.

`computer.md:16` 原文片段：

> `win.ax()` returns a formatted TEXT tree — one STRING, one node per line with `[ref=eN]` tags; NEVER iterate or `.map` it.

`computer.md:9`：`win.observe()` 同时返回截图与 AX 树（`ax`、`nodeCount`、`truncated`）。

## 审批与接管

`src/tools/computer.ts:111-124`：`action === "capabilities"` 归为 read；`action === "run"` 且 `read_only === true` 归为 read；其余归为 exec。

`computer.md:14`：`computer.control.acquire({ reason })` 需要人工确认，返回 `{active: true}` 或 `{active: false, reason}`，reason 取 `denied`、`no-ui`、`unanswered`。

`computer.md:21` 原文：

> `computer.run` executes in the persistent JavaScript session with full Bun/Node and tool-bridge access; it is not sandboxed.

`computer.md:22`：`globalEscape` 表示物理 Escape 可中断接管输入；Wayland 改用宿主中断。

## 分层结构

| 层次 | 证据 |
|---|---|
| eval 预置对象 | `computer.md:1`、`src/tools/computer.ts` 注册为 prelude |
| 宿主 controller 与 supervisor | `src/tools/computer.ts`、`src/tools/computer/supervisor.ts` |
| 常驻 worker 与消息协议 | `src/tools/computer/worker.ts`、`worker-entry.ts`、`protocol.ts` |
| 原生层 | `@oh-my-pi/pi-natives` 的 `DesktopSession`，类型声明见 `native/index.d.ts` |

`native/index.d.ts` 的能力面（摘录）：`listDisplays`、`listWindows`、`listApplications`、`openApplication`、`observe`、`menuItems`、`menuSelect`、`capture`、`captureRegion`、`click`、`drag`、`scroll`、`typeText`、`keyChord`、`axSnapshot`、`axQuery`、`axElementAt`、`axSelectText`、`axClick`、`axType`、`axKeyChord`、`acquireControl`、`releaseControl`。类注释：`Persistent, serialized native desktop capture/input/accessibility session.`

## Linux 原生二进制里的后端符号

`@oh-my-pi/pi-natives-linux-x64` 的 `pi_natives.linux-x64-modern.node` 通过 `strings` 提取（计数为出现次数）：

- `ATSPI` 2663、`atspi-proxies-0.14.0` 10、`org.a11y` 30
- `x11rb` 12、`XTEST` 3、`shm` 17
- `libei` 31、`uinput` 13、`pipewire` 2、`wayland-client` 4

## AX 快照上限

`crates/pi-natives/src/desktop/ax.rs` 的 `snapshot()`：

- `options.max_nodes.unwrap_or(800).max(1)`
- `options.max_depth.unwrap_or(24)`
- 截断时写入尾注 `… truncated ({} nodes)`
- 不可读子树写入尾注 `… skipped {} unreadable nodes`
- 渲染前经过 `filter_node(node, options.all.unwrap_or(false))`，未命名容器默认被折叠

同一文件的 `query()`（对应 `win.find()`）：

- `WalkState::new(5_000, 24, WalkBounds::Read)`，即节点上限 5_000（十进制 5000）、深度 24
- `let limit = query.limit.unwrap_or(100).min(5_000) as usize;`，默认返回 100 条、最多 5000 条
- `AxRegistry::enforce_cap` 在条目超过 5_000 时按最大目标的最旧一批淘汰

## Windows 后端：UI Automation

`crates/pi-natives/src/desktop/win32/ax.rs` 使用 `uiautomation` crate，导入的模式：

`UIExpandCollapsePattern`、`UIInvokePattern`、`UILegacyIAccessiblePattern`、`UIScrollItemPattern`、`UISelectionItemPattern`、`UITogglePattern`、`UIValuePattern`。

读取的属性含 `RuntimeId`、`ControlType`、`Name`、`HelpText`、`FrameworkId`、`AriaRole`、`AriaProperties`、`ProviderDescription`、`IsPassword`、`NativeWindowHandle`。

坐标点击白名单原文：

```rust
const fn coordinate_click_supported(control_type: ControlType) -> bool {
	matches!(
		control_type,
		ControlType::Button
			| ControlType::MenuItem
			| ControlType::Hyperlink
			| ControlType::CheckBox
			| ControlType::RadioButton
			| ControlType::TabItem
	)
}
```

单元测试断言被排除的类型：`SplitButton`、`TreeItem`、`ListItem`、`Pane`、`Custom`、`Document`。

源码注释原文：

> for toolkits that drop posted clicks (WPF, `WinUI` 3, Tk, GTK)

同一注释说明：只有“点击落在控件内部任何位置效果相同”的控件才配走这条坐标动作路径，画布与窗格保留像素语义。

## 平台差异（声明层）

`native/index.d.ts` 与 `protocol.ts` 的注释：

- 窗口 id：`Numeric on X11/Win32/macOS; a composite AT-SPI string on Wayland`
- 锁屏与显示器休眠状态只有 macOS 检测，其它平台报 false
- `spaces`、`axSelectText` 等能力属于 macOS
