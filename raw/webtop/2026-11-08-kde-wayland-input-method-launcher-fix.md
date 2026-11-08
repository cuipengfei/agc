# KDE Wayland 输入法启动器修复摘录（KWin InputMethod + 官方 Fcitx launcher）

> Source: 本机 wsl-webtop 会话调查（用户报告原文 + bd 事项 wsl-webtop-0yt 记录 + 本机进程/D-Bus/环境实测 + Fcitx 官方文档 https://fcitx-im.org/wiki/Using_Fcitx_5_on_Wayland#KDE_Plasma ）
> Collected: 2026-11-08
> Published: Unknown

本文是原始材料摘录。来源逐块标注：用户原话、bd 记录、本机实测（命令与读数）、官方文档。identifier 与代码一律保持英文原名。

## 用户报告原文（2026-11-08）

> 1 i just started kde, then it showed me this: Fcitx should be launched by KWin under KDE Wayland in order to use Wayland input method frontend. This can improve the experience when using Fcitx on Wayland. To configure this, you need to go to "System Settings" -> "Virtual keyboard" and select "Fcitx 5" from it. You may also need to disable tools that launches input method, such as imsettings on Fedora, or im-config on Debian/Ubuntu. For more details see https://fcitx-im.org/wiki/Using_Fcitx_5_on_Wayland#KDE_Plasma

## 官方文档要点（Fcitx 官方 wiki，KDE Plasma 段）

- KDE Wayland 下应由 KWin 启动 Fcitx，才能让 Fcitx 使用 Wayland input method frontend。
- 其余方式（imsettings、im-config 等独立启动器）应禁用。
- 对应的 KWin 配置为 System Settings → Virtual keyboard 选择 Fcitx 5；等价写法是 `kwinrc` 的 `[Wayland] InputMethod`。

## bd 事项记录（全文引用）

issue `wsl-webtop-0yt`「修复 KDE Fcitx 启动与两个终端 Starship 字体」：P1 BUG，创建并开始于 2026-11-08，现已 CLOSED。

DESCRIPTION 原文：

> 两个独立验收项：KDE由KWin管理Fcitx Wayland输入；Konsole与st可显示实际Starship特殊字符。禁止浏览器视觉自动化沿用，使用原生协议/字体cmap实际验证，不提交推送。

NOTES 原文（Fcitx 与字体两段合写，字体部分见 raw/webtop/2026-11-08-terminal-font-starship-xdg-visibility-fix.md）：

> 已授权restart KDE ready新main3600486/kwin3600723。官方launcher3601773(KWin子)激活fcitx3601775，native Wayland protocol1，DBus availablefalse->true/frontendwayland1IC/CanRestartfalse，无LD/QT插件与IM变量污染。两个私有XDG下Qt八字形beforewrongDejaVu exit2->Maple8nonzero exit0，实际st/Konsole traceMaple及profile，cmap两实际文件完整。5字体+29session通过；全suite180s超时未称通过，desktop14?正在执行。doctorok diffs[]。证据verify/fcitx-and-starship-fix.json。未browser键鼠/截图/组合输入/切i3/commit/push。

CLOSE REASON 原文：

> 两项修复完成：KDE官方KWin launcher建立nativeWayland1输入连接availabletrue，字体私有XDG导入现有Maple，两个终端实际加载字体且八Starship字形覆盖。已授权restartKDEready；5字体29session14desktop共48targetedtests通过，doctorok。全suite180s超时未通过宣称。未browser视觉/输入注入/切i3/commit/push。

## 修复前的本机实况

- 启动链：`scripts/desktop-session.py` 直接 `processes.start fcitx --replace`（第 374 行附近），KWin 的 `VirtualKeyboard` 接口显示 `available: false`。
- 环境污染：`wsl_webtop/session.py` 第 164-165 行把 `QT_IM_MODULE=fcitx`、`GTK_IM_MODULE=fcitx` 设入全局会话环境（第 159-170 行实测确认）。
- 进程归属（修复前实测）：会话 main PID `3590706`，KWin PID `3590803`，fcitx5 PID `3590918` 且父进程是 main（`ps -C fcitx5 -o pid,ppid,args`）；运行时 `/run/user/1000/wsl-webtop/session-mbm2g95f`。
- D-Bus 读数（修复前）：`org.kde.KWin /VirtualKeyboard` `org.kde.kwin.VirtualKeyboard` → `enabled: true`、`available: false`（dbus-send 实测）。

## 方案取舍记录（调查代理结论，已采纳评估）

- 否定一项：让 KWin 以受管理 desktop entry 直启 fcitx5，并试图用 `-platformpluginpath` 等手段隔离 Qt 环境不可行——Qt 源码证实该参数只属于 QPA loader 的搜索路径，不能替代 `QT_PLUGIN_PATH` 对其他插件的搜索路径，被 KWin 自身 Qt 库（patched libkwin）污染的风险仍在。
- 采用官方方案：`kwinrc` `[Wayland] InputMethod` 指向官方已安装 desktop 文件 `/usr/share/applications/fcitx5-wayland-launcher.desktop`（随 fcitx5 包安装，`dpkg -L` 核对）。该 launcher 语义是 KWin 拥有 launcher 与输入法 socket，launcher 通过私有 D-Bus 激活 Fcitx，Fcitx 不继承 KWin 的 LD/Qt 插件路径。

## 修复后的配置与启动链

配置命令：

```text
kwriteconfig6 --file /home/cpf/.config/wsl-webtop/desktop/kwinrc --group Wayland --key InputMethod /usr/share/applications/fcitx5-wayland-launcher.desktop
```

然后执行 `wsl-webtop capture-config` 把该键收入 managed 记录；`docs/maintenance.md` 的 `kwinrc` 白名单行为 `| kwinrc | [Compositing] Enabled；[Wayland] InputMethod |`。

启动链实测（重启后）：KWin PID `3600723` 拥有 launcher PID `3601773`（KWin 子进程）；launcher 经私有 D-Bus 激活 fcitx PID `3601775`；`wayland-info`/`ps` 均确认。

## 环境清洁规则（修复后）

- `wsl_webtop/session.py` 不再全局设置 `QT_IM_MODULE`、`GTK_IM_MODULE`、`SDL_IM_MODULE`（原生 Qt/GTK 应用改走 Wayland text-input；实测/文档口径见下方验证段）。
- `XMODIFIERS=@im=fcitx` 保留，供 XWayland 应用使用。
- KWin 自身的专用 Qt 库与插件路径不传给 launcher 激活的 Fcitx。
- `scripts/desktop-session.py` 调整构造顺序，使 launcher 环境携带项目私有 `WAYLAND_DISPLAY=wayland-kde` 与私有 DISPLAY；KWin nested backend 继续通过原有参数拿到宿主显示。

## 重启后的原生验证

- 重启经用户在会话内授权（选项「允许重启」），`wsl-webtop restart` 完成并 `ready`；运行时 `/run/user/1000/wsl-webtop/session-ohvi_yn3`，main PID `3600486`、KWin PID `3600723`、Plasma PID `3601899`。
- `org.kde.KWin /VirtualKeyboard` 属性对比：

| 属性 | 修复前 | 修复后 |
|---|---|---|
| enabled | true | true |
| available | false | **true** |

- D-Bus DebugInfo（`org.fcitx.Fcitx5 /controller`）显示 `frontend:wayland`、1 个 IC；`CanRestart=false`（说明私有 D-Bus 上已是唯一受管实例）。
- `/proc/<fcitx>/environ` 核对：无 `LD_LIBRARY_PATH`、`QT_PLUGIN_PATH`、`QT_IM_MODULE`、`GTK_IM_MODULE`、`SDL_IM_MODULE`；含私有运行时与显示；`XMODIFIERS` 保留。

## 边界（未执行事项）

- 真实拼音/组合输入未在目标应用实测（浏览器视觉与键鼠注入按原约束保持禁止）。
- 未切到 i3 复测；i3 不涉及 KWin InputMethod。
- 未 commit、未 push。

## 其他证据工件

`~/.local/state/wsl-webtop/verify/fcitx-and-starship-fix.json` 全文（写入时状态）：

```json
{
  "date": "2026-11-08",
  "issue": "wsl-webtop-0yt",
  "active_desktop": "kde",
  "runtime": "/run/user/1000/wsl-webtop/session-ohvi_yn3",
  "main_pid": 3600486,
  "kwin_pid": 3600723,
  "fcitx_launcher_pid": 3601773,
  "fcitx_pid": 3601775,
  "restart": "user_authorized_completed_ready",
  "fcitx": {
    "kwin_available_before": false,
    "kwin_available_after": true,
    "native_protocol": 1,
    "frontend": "wayland",
    "input_contexts": 1,
    "launcher": "/usr/libexec/fcitx5-wayland-launcher --reopen",
    "can_restart": false,
    "fcitx_environment": "private nested display and bus, no QT/GTK/SDL_IM_MODULE, no LD_LIBRARY_PATH/QT_PLUGIN_PATH",
    "composition_typing": "not_run"
  },
  "fonts": {
    "family": "Maple Mono NF CN",
    "qt_before": "wrong DejaVu family, exit 2",
    "qt_after_both_private_roots": "Maple family, eight nonzero glyphs, exit 0",
    "observed_codepoints": ["E0B0", "E0B4", "E0B6", "F418", "F432", "F43A", "F0079", "F0548"],
    "real_st_and_konsole_both_private_roots": "exit 0, traced Maple TTF opens and Konsole project profile",
    "actual_opened_fonts_cmap": "all eight codepoints present",
    "i3_compositor_switch": "not_run; i3 private roots verified under current KDE display",
    "visual_browser_verification": "not_run"
  },
  "tests": {"terminal_fonts": 5, "session": 29, "desktop": 14, "all_python_suite": "180s timeout before completion; not reported passed"},
  "doctor": "ok; blockers empty and configuration diffs empty",
  "commit_push": "not_run"
}
```
