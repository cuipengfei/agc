# KDE Wayland 输入法启动器与 Fcitx 归属

> Sources: bd 事项 wsl-webtop-0yt 记录, 2026-11-08; 本机 wsl-webtop 启动与 D-Bus 实测, 2026-11-08; Fcitx 官方 wiki, 2026-11-08
> Raw: [KDE Wayland 输入法启动器修复摘录](../../raw/webtop/2026-11-08-kde-wayland-input-method-launcher-fix.md)
> Updated: 2026-11-08

## Overview

项目 KDE 桌面启动时出现 Fcitx 警告「Fcitx should be launched by KWin under KDE Wayland…」。原启动链直接拉起 Fcitx，并把 `QT_IM_MODULE=fcitx` 等设入全局会话环境；KWin 的 `VirtualKeyboard.available` 维持 `false`。修复按官方建议让 KWin 以 `[Wayland] InputMethod` 指向官方 Fcitx Wayland launcher（`fcitx5-wayland-launcher.desktop`），同时取消 `QT_IM_MODULE`、`GTK_IM_MODULE`、`SDL_IM_MODULE` 的全局设置；`XMODIFIERS` 为 XWayland 保留。经授权重启 KDE 后，KWin `available` 由 `false` 转 `true`，D-Bus 上出现 `frontend:wayland` 的 Wayland 输入上下文。

## 修复形态

| 项目 | 修复后 |
|---|---|
| `kwinrc` `[Wayland] InputMethod` | `/usr/share/applications/fcitx5-wayland-launcher.desktop`（随 fcitx5 包安装；KWin 拥有 launcher 与输入法 socket） |
| 全局 `QT_IM_MODULE` / `GTK_IM_MODULE` / `SDL_IM_MODULE` | 取消；原生 Qt/GTK 应用走 Wayland text-input |
| `XMODIFIERS` | 保留 `@im=fcitx`，供 XWayland 应用 |
| 受管理键 | `kwinrc` 的 `[Wayland] InputMethod` 已加入 capture-config 白名单（与 `[Compositing] Enabled` 并列） |

被否定的备选（调查记录，不再采用）：用受管理 desktop entry 让 KWin 直启 `fcitx5`。Qt 源码证实 `-platformpluginpath` 只影响 QPA loader 的搜索路径，不能替代 `QT_PLUGIN_PATH` 对其他插件目录的遍历；KWin 自身是被补丁的 Qt（patched libkwin），该方案环境隔离不可靠。[INFERENCE] 保留官方 launcher 的原因是它天然持有正确的进程边界：KWin 不知道也不需要管理 Fcitx 的环境，launcher 通过私有 D-Bus 激活单一 Fcitx 实例，环境污染自然消失。

## 验证结果（2026-11-08 实测）

| 项 | 修复前 | 修复后 |
|---|---|---|
| KWin `VirtualKeyboard.available` | false | **true** |
| Fcitx 内 `frontend:wayland` 输入上下文 | 无 | 1 个 |
| Fcitx 环境污染（Qt 库/插件路径/IM 模块变量） | 有 | 无 |
| Fcitx 进程父级 | 会话 main 直接持有 | 私有 D-Bus 经 KWin-launched launcher 激活（`CanRestart=false` 说明当前私有 D-Bus 上是唯一受管实例） |

进程树（重启后实测）：KWin PID `3600723` 持有 launcher PID `3601773`（KWin 子进程），launcher 经私有 D-Bus 激活 fcitx PID `3601775`。会话运行时为 `/run/user/1000/wsl-webtop/session-ohvi_yn3`，main PID `3600486`。

重启经用户在会话中授权（选项「允许重启」）；`wsl-webtop restart` 进入 `ready`。`docs/desktop-parity.md` 增补了行为说明与官方 wiki 引用，`docs/maintenance.md` 的 `kwinrc` 白名单行为新增 `[Wayland] InputMethod`。`docs/desktop-parity.md` 与 `docs/maintenance.md` 不含错误异常行。

## 边界与未执行事项

- 真实拼音/组合输入未在目标应用实测（浏览器视觉与键鼠注入按原约束保持禁止）；实际输入效果属用户目视验收项。
- 未 commit、未 push。
- 数据来源：修复前后的 D-Bus 属性对照、`/proc` 环境检查、D-Bus DebugInfo、48 项行为套件（`test_session` 29、`test_terminal_fonts` 5、`test_desktop` 14）。全量 Python 套件 180 s 超时未宣称通过（诚实边界）。

## See Also

- [私有桌面的共享边界：字体、应用入口与命令路径](private-desktop-visibility.md)
- [Webtop 移植到 WSL：组件、偏离与原因](webtop-on-wsl-architecture.md)
