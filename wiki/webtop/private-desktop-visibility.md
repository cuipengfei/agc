# 私有桌面的共享边界：字体、应用入口与命令路径

> Sources: wsl-webtop 会话修正记录, 2026-11-08; bd 事项 wsl-webtop-5tp 与 wsl-webtop-0yt 记录, 2026-11-08; fontconfig/Qt/strace/fontTools 实测, 2026-11-08
> Raw: [终端字体与 Starship 字符可见性修复摘录](../../raw/webtop/2026-11-08-terminal-font-starship-xdg-visibility-fix.md); [私有桌面应用入口与命令路径接入摘录](../../raw/webtop/2026-11-08-private-desktop-discovery-and-command-resolution.md)
> Updated: 2026-11-08

## Overview

项目 KDE、i3 与宿主 WSL 共住一个系统：系统程序、动态库、系统字体共用，并不会因为桌面进程启动方式不同而「看不到」。差异发生在**搜索路径**层：配置、数据、D-Bus、音频走项目私有目录。本文记录 2026-11-08 三项搜索路径相关修正（用户字体、`.desktop` 应用入口、用户命令目录），并给出当前边界清单与仍未验证的项。

## 三层边界：同一 WSL，不同搜索路径

| 安装或设置位置 | 项目 KDE / i3 行为 |
|---|---|
| `apt` 程序与动态库 `/usr/bin`、`/usr/lib` | 共用 |
| 系统字体 `/usr/share/fonts` | 自动可见 |
| 用户字体 `~/.local/share/fonts` | 2026-11-08 起由 `scripts/terminal-fonts.py` 在项目 Fontconfig 显式导入（此前行为：私有 `XDG_DATA_HOME` 不自动读取该目录） |
| 原用户 `~/.config` 下的应用设置 | 默认不使用（项目用各自 `XDG_CONFIG_HOME`）；仅有经 `capture-config` 收入管理白名单的键进管理记录 |
| 用户 `.desktop` 入口 `~/.local/share/applications` | 2026-11-08 起加入 `XDG_DATA_DIRS` 搜索，项目私有数据目录优先 |
| 用户命令目录（`.local/bin`、`.bun/bin`、`.cargo/bin` 等） | 2026-11-08 起加入桌面启动 `PATH`；此前 `wmenu-run` 只见系统目录 |
| D-Bus、音频、显示服务 | 项目私有会话运行，与宿主平行 |

用户最初的疑问是「i3 与 KDE 运行时是否看不到已安装的东西」。更准确地描述是**文件都能访问，寻路规则不同**，需要逐项接入。

## 修复前后的实证（仅列 2026-11-08 已验证内容）

- **用户字体**：Starship 的 8 个图标 codepoint（`E0B0` `E0B4` `E0B6` `F418` `F432` `F43A` `F0079` `F0548`）在 `Maple Mono NF CN`（`~/.local/share/fonts/maple-win/MapleMono-NF-CN-Regular.ttf`）的 cmap 全覆盖；`DejaVu Sans Mono` 与 `Liberation Mono` 全缺。修复前私有环境下 Qt 返回 family `DejaVu Sans`、无 Maple（exit 2 的字形程序实测）；修复后两个私有根返回 Maple 与 8 个非零 glyph（exit 0）。
- **真实进程字体加载**：`strace -f -e trace=openat` 实测修复后 KDE、i3 两个私有根下的 `st` 与 `konsole` 都真实打开 Maple 字体文件；`konsole` 的 trace 里同时出现项目 profile（`wsl-webtop.profile`）。
- **命令解析（advisor 提醒后明确边界）**：本次逐项验证的是 KDE、i3 启动环境能通过 `PATH` 解析这些命令；`i3` 的 `wmenu-run` 按此 PATH 列出可执行命令。KDE 应用菜单显示 `.desktop` 入口的应用，修复前 `~/.local/share` 的入口接入不了，修复后 Tern 与 Claude URL handler 实证可达；本批没有逐项验证全部命令的菜单入口。

## 边界与未验证项

| 项 | 状态 |
|---|---|
| 终端字形在浏览器里的最终显示 | 用户目视验收项（浏览器视觉验证保持禁止） |
| 拼音/组合输入实测 | 未做；依赖 Wayland 输入法链路实测 |
| 全量命令的可执行依赖（编译链、外设库等） | 仅验证 Python `PATH` 解析，不等于应用可完整运行 |
| KDE 菜单或 `wmenu-run` 的逐项显示顺序 | 菜单整屏未做视觉核验 |
| `~/.local/bin` 中 4 项未解析的归因 | `env.fish`（Fish 专用文件）、`pnpm`/`pnpx`（符号链接本身在宿主已损坏）、`uv-bun.test.js`（非可执行测试文件）；与桌面缺陷无关 |

## 边界的适用范围（不要再扩）

以上三层边界按**搜索路径**解释，仍共用同一套系统目录；本批修复没有把项目变成隔离容器，后续更新应继续遵循同一表格的语义。`docs/desktop-parity.md` 与 `docs/maintenance.md` 已与本文同步。

## See Also

- [KDE Wayland 输入法启动器与 Fcitx 归属](kde-wayland-input-method-launcher.md)
- [Webtop 移植到 WSL：组件、偏离与原因](webtop-on-wsl-architecture.md)
