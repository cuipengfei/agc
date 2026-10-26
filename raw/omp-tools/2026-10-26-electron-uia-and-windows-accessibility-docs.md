# Electron 与 Windows 无障碍文档摘录

> Source: Chromium《Accessibility Technical Documentation》；Chromium《UI Automation》文档；Chrome for Developers《Native UI Automation for Windows in Chromium》；Electron《Accessibility》；Electron《Supported Command Line Switches》；Microsoft Learn《UI Automation Support for Standard Controls》；Oracle《Enabling and Testing Java Access Bridge》
> Collected: 2026-10-26
> Published: Unknown

## Chromium 的按需激活

Chromium《Accessibility Technical Documentation》原文：

> For performance reasons Chromium waits until it detects the presence of assistive technology before enabling full support for accessibility APIs.

> Windows: Chrome calls NotifyWinEvent with EVENT_SYSTEM_ALERT and the custom object id of 1. If it subsequently receives a WM_GETOBJECT call for that custom object id, it assumes that assistive technology is running.

同一页给出的覆盖方式：启动时加 `--force-renderer-accessibility`，或在浏览器内打开 `chrome://accessibility` 按标签页开启。

## Chromium 的原生 UIA

Chrome for Developers 博客（2025-08-14）：

> From Chrome 138, Chromium-based browsers on Windows enable native UI Automation (UIA) support by default.

同文说明：此前 UIA 客户端要经过 Windows 的 MSAA 到 UIA 模拟层，延迟更高、可靠性更低。

## Electron 的无障碍

Electron《Accessibility》原文：

> Electron applications will automatically enable accessibility features in the presence of assistive technology (e.g. JAWS on Windows or VoiceOver on macOS).

手动开关：`app.setAccessibilitySupportEnabled(enabled)`；用户系统的无障碍工具优先级高于该设置。macOS 上第三方可通过设置 `AXManualAccessibility` 属性切换。

## Electron 的调试端口

Electron《Supported Command Line Switches》原文：

> `--remote-debugging-port=`port`
> Enables remote debugging over HTTP on the specified `port`.

同页示例展示用 `app.commandLine.appendSwitch('remote-debugging-port', '8315')` 在 `ready` 之前追加。

## 微软的 UIA 控件覆盖

Microsoft Learn《UI Automation Support for Standard Controls》原文要点：

> Most Win32 controls are exposed to Microsoft UI Automation through client-side providers in UIAutomationClientsideProviders.dll. This assembly is automatically registered for use with UI Automation client applications.
> Full support is provided only for controls from version 6 of ComCtrl32.dll.

Win32 支持清单（类名到控件类型）：`Button`（Button/RadioButton/Group/CheckBox/Hyperlink/SplitButton）、`ComboBoxEx32`、`ComboBox`、`Edit`（Document 或 Edit）、`SysLink`、`Static`、`SysIPAddress32`、`SysHeader32`、`SysListView32`（DataGrid 或 List）、`ListBox`、`#32768`（Menu/MenuItem）、`msctls_progress32`、`RichEdit` 系列、`ScrollBar`、`msctls_trackbar32`、`msctls_updown32`、`msctls_statusbar32`、`SysTabControl32`、`ToolbarWindow32`、`ReBarWindow32`、`SysTreeView32`、`tooltips_class32`。

Win32 不支持清单：`SysAnimate32`、`SysPager`、`SysDateTimePick32`、`SysMonthCal32`、`MS_WINNOTE`、`VBBubble`、独立使用的 `ScrollBar`、`SuperGrid`。

WPF 原文：

> All WPF control elements that provide information or support for user interaction have full native support for UI Automation. Other elements, such as panels, are not visible to UI Automation.

WinForms 原文：

> Windows Forms controls are exposed to Microsoft UI Automation through client-side providers in UIAutomationClientsideProviders.dll.

WinForms 直接支持清单：`Button`、`CheckBox`、`CheckedListBox`、`ColorDialog`、`ComboBox`、`FolderBrowser`、`FontDialog`、`GroupBox`、`HscrollBar`、`ImageList`、`Label`、`ListBox`、`ListView`、`MainMenu/ContextMenu`、`MonthCalendar`、`NotifyIcon`、`OpenFileDialog`、`PageSetupDialog`、`PrintDialog`、`ProgressBar`、`RadioButton`、`RichTextBox`、`SaveFileDialog`、`ScrollableControl`、`SoundPlayer`、`StatusBar`、`TabControl/TabPage`、`TextBox`、`Timer`、`Toolbar`、`ToolTip`、`TrackBar`、`TreeView`、`VscrollBar`、`WebBrowser`。

WinForms 仅经 MSAA 暴露、部分功能不可用的清单：`BindingSource`、`DataGrid`、`DataGridView`、`DataNavigator`、`DomainUpDown`、`ErrorProvider`、`FlowLayoutPanel`、`Form`、`LinkLabel`、`HelpProvider`、`MaskedTextBox`、`MenuStrip/ContextMenuStrip`、`NumericUpDown`、`Panel`、`PictureBox`、`PrintDocument`、`PrintPreview-Control`、`PrintPreview-Dialog`、`PropertyGrid`、`UserControl`、`ToolStrip`、`TableLayoutPanel`、`SplitContainer/SplitterPanel`、`Splitter`、`RaftingContainer`、`StatusStrip`。

## Java 的无障碍开关

Oracle《Enabling and Testing Java Access Bridge》原文：

> By default, Java Access Bridge is not enabled. Enable it either through the command line or the Windows Control Panel.

启用方式：`%JRE_HOME%\bin\jabswitch -enable`，或在“轻松使用”中心勾选。该文档面向 Swing/AWT 的 Java Access Bridge；JavaFX 使用自己的无障碍实现，是否需要额外开关按版本确认。
