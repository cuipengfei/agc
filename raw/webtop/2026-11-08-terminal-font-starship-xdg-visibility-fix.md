# 终端字体与 Starship 字符可见性修复摘录（私有 XDG 字体接入）

> Source: 本机 wsl-webtop 会话调查（用户报告原文 + bd 事项 wsl-webtop-0yt 字体一半 + fontconfig/fontTools/Qt/strace 实测 + 修复脚本 scripts/terminal-fonts.py）
> Collected: 2026-11-08
> Published: Unknown

本文是原始材料摘录。来源逐块标注：用户原话、调查实测（命令输入输出）、修复实现与边界声明。identifier 与代码一律保持英文原名。

## 用户报告原文（2026-11-08）

> 2 in both kde and i3, in both konsole and st, the terminal prompt of starship does not look normal, it is all garbled, but other ui look normal, font problem?

用户背景（对话中确认）：桌面里其他 UI 正常，只有 Starship 的提示符在 Konsole 与 st 全部乱码。

## 会话问答确认孤立的字体搜索问题（会话证据）

用户疑问："隔离目录使终端看不到已安装的 Nerd Font?" 澄清（对话回答）：

> KDE 和 i3 都运行在同一个 WSL 系统里。通过 apt 安装的应用、软件包、动态库和系统字体，它们都可以使用。当前没有另建容器，也没有限制它们访问整个 WSL 文件系统。

> 这里的隔离主要是配置、数据和会话服务分开使用：系统程序照常共用；桌面配置单独保存；用户字体需要明确加入搜索目录；私有 D-Bus 和音频会话。

> 系统级字体仍能找到，普通 UI 因此正常；Starship 需要的 Nerd Font 图标恰好在用户字体目录，才出现乱码。

用户字体位置：`~/.local/share/fonts/maple-win/MapleMono-NF-CN-Regular.ttf`（fontTools 读取成功）。

## fontTools cmap 实测对照

fontTools cmap 实测（`uv run --with fonttools`，读取真实 ttf 文件），对照三个字体来源的映射能力：

| 位置 | fontTools cmap 结果 | 指标 |
|---|---|---|
| `~/.local/share/fonts/maple-win/MapleMono-NF-CN-Regular.ttf` 八个 codepoint E0B0/E0B4/E0B6/F418/F432/F43A/F0079/F0548 | `True` + nonzero glyph ids | 全覆盖 |
| DejaVu Sans Mono 同 codepoints | 全无映射 | 全缺 |
| Unifont CSUR（字体 fallback 链中存在） | 找到部分码位映射但图形不对应，指向另一套 PUA 字形 | 错误 fallback |

## 修复内容

脚本 `scripts/terminal-fonts.py`（2026-11-08 新建）：

1. 写入私有 Fontconfig `conf.d` 到两个桌面（`kde`、`i3`）各自的 `XDG_CONFIG_HOME`：
   - 目录导入 `~/.local/share/fonts`（私有 `XDG_DATA_HOME` 不会自动读取该目录）。
   - `monospace` 与 `Liberation Mono` 别名选到 `Maple Mono NF CN`。
2. 写入 Konsole 项目 profile 衍生（`wsl-webtop.profile`）：父 profile 保留；仅设置 `Font`；字体存疑时校验 `check_path` 实际文件。
3. 不改 Starship 符号、不改原 HOME 的 fontconfig/Konsole/Starship 文件、不升级任何包，也不改全局系统配置。

cmap 与 fallback 的 codepoint 池为 Starship 实际输出：`E0B0`、`E0B4`、`E0B6`、`F418`、`F432`、`F43A`、`F0079`、`F0548`。

## 实测验证（修复后会话内完成）

验证命令与结论：

1. Qt 字形 smoke（g++ 编译的 QTextLayout 小程序，通过 env 指向项目私有 fontconfig 验证）：
   - 修复前（私有 `XDG_CONFIG_HOME=/home/cpf/.config/wsl-webtop/desktop` + `XDG_DATA_HOME=/home/cpf/.local/share/wsl-webtop/desktop`）实际返回 family `DejaVu Sans`、glyph 非零但不出 Maple，`exit 2`。
   - 修复后：同一命令 `exit 0`；两个私有根（`desktop`、`i3` 的 `XDG_CONFIG_HOME`/`XDG_DATA_HOME`）都返回 `Maple Mono NF CN` 与 8 个非零 glyph（共 8/8）。
2. strace（真实进程，不写 mock）：
   - `strace -f -e trace=openat st -e /usr/bin/sleep 2`（KDE 私有环境）：exit 0，trace 行包含 `.ttf` 打开且为 `Maple`。
   - `strace -f -e trace=openat konsole --separate -e /usr/bin/sleep 2`（KDE 私有环境）：exit 0；trace 行包含 `wsl-webtop.profile`、`MapleMono-NF-CN-Regular.ttf`。
   - `i3` 私有根的 st 与 konsole 同样实测通过（此时尚未切到 i3 变体，只验证私有环境可发现字体）。
3. `uv run --with fonttools`：两个实际打开的 ttf 文件 cmap 全覆盖那 8 个 codepoint。
4. 套件：`test_session.py` 29 通过；`test_terminal_fonts.py` 5 通过；`test_desktop.py` 14 通过；`doctor` ok、`diffs []`；全 Python 套件 180 s 超时未宣称通过（诚实边界）。

## 边界与未执行事项

- **Konsole/st 的字形渲染最终为用户目视验收项**（终端在浏览器里的可视化由用户确认）。
- 未切换到 i3 变体运行；`strace` 验证的是「i3 私有环境下的字体发现」，不是切换后的桌面。
- 未使用浏览器视觉自动验、未操作键盘鼠标。
- 证据文件 `~/.local/state/wsl-webtop/verify/fcitx-and-starship-fix.json`（完整见 `2026-11-08-kde-wayland-input-method-launcher-fix.md`）。

## 文档同步（2026-11-08 提案已批准）

- `docs/desktop-parity.md` 新增段落：项目私有 `XDG_DATA_HOME` 不自动读字体目录，会话初始化写入专用 Fontconfig 导入该目录，并把 `monospace` 与 `Liberation Mono` 别名选到 `Maple Mono NF CN`；Konsole profile 只改字体其余沿父 profile；原 HOME 的 fontconfig/Konsole/Starship 不变。
- `docs/desktop-parity.md` 增补参考链接：https://fcitx-im.org/wiki/Using_Fcitx_5_on_Wayland#KDE_Plasma 。
