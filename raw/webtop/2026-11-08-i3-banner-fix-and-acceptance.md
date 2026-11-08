# i3 Sway 会话红色配置错误横幅修复：证据摘录

> Source: 本机 wsl-webtop 会话调查（bd 事项 wsl-webtop-xp2 记录全文引用 + config/i3 生成配置现状核对 + config-receipts 捕获记录 + 会话用户验收）；生成配置来源 /home/cpf/code-inside/wsl-webtop/config/i3
> Collected: 2026-11-08
> Published: Unknown

本文是原始材料摘录。本主题属于 wsl-webtop 的 i3 Sway 桌面变体；KDE 变体的组件构成见另一文章（wiki/webtop/webtop-on-wsl-architecture.md）。两变体单端口互斥切换，bd 事项 `wsl-webtop-us2` 全名为「单端口 KDE 与 Webtop i3 Sway 互斥切换」。

## 事项记录（bd 全文引用）

issue `wsl-webtop-xp2`「修复 i3 Sway 配置错误横幅」：P1 BUG，创建并开始于 2026-11-08，现已 CLOSED。

DESCRIPTION 原文：

> 用户在localhost8080看到红色error in config file横幅。检查当前Sway配置与日志，修复实际配置错误，执行非视觉原生验证并保持i3 ready；禁止视觉测试、Chrome自动化、commit/push及AGC修改。

NOTES 原文：

> Mod4+Return重复定义触发swaynag；已将原有绑定直接设置st、移除末尾重复定义，源码与runtime一致，capture记录20261108T032036-fe44effc6f14。原生reload成功，swaynag进程退出，MainPID3437236和Sway3437320保持；独立临时headless sway--validate--debug无ERROR/Overwriting，42相关测试与HTTP7passed，native最终检查进行。包/baseline/user env保持，docs来源描述同步，不GUI/Chrome/commit/push/AGC。

CLOSE REASON 原文：

> 快捷键只定义一次，Sway原生配置验证无ERROR或binding overwrite；同MainPID/SwayPID原生reload后swaynag退出。42相关测试、native11与HTTP7passed，源码/runtime/managed记录一致；原包/baseline/env保持，无视觉测试和重启。

## 生成配置现状（修复后核对）

`/home/cpf/code-inside/wsl-webtop/config/i3/sway/config` 中键位定义（现在唯一一处，行号以当前文件为准）：

```text
    # Start a terminal
    bindsym $mod+Return exec /usr/bin/st
```

同文件保留的退出确认绑定（与本主题无关的正常功能，未改动）：

```text
    # Exit sway (logs you out of your Wayland session)
    bindsym $mod+Shift+e exec swaynag -t warning -m 'You pressed the exit shortcut. Do you really want to exit sway? This will end your Wayland session.' -B 'Yes, exit sway' 'swaymsg exit'
```

生成器验收来源 `/home/cpf/code-inside/wsl-webtop/config/i3/upstream.json` 的生成语义要求原文（第 74-77 行）：

```text
      "Append xwayland enable because /usr/bin/st is an X11 terminal and must be available before the ready desktop accepts its default terminal shortcut.",
*75:  "Set the existing bindsym $mod+Return command to exec /usr/bin/st. Keep one definition of this shortcut and preserve the original $term variable and system terminal alternatives.",
      "Keep the complete default keybindings, Mod4 modifier, wmenu-run launcher, resize mode, top swaybar, date status command, colors and wallpaper. No rofi, polybar, feh, personal theme or auto-started app is added."
```

## 捕获记录

根因核对时的 capture 收据实测路径 `/home/cpf/.local/state/wsl-webtop/config-receipts/20261108T032036-fe44effc6f14.json`：`status: "complete"`，`schema_version: 2`，`receipt_id: "20261108T032036-fe44effc6f14"`，`created_at: "2026-11-08T03:20:36.432537+00:00"`；`before` 与 `after` 两段快照各自锚定 `i3/sway/config` 等条目（同收据内并列 `desktop/fcitx5/config`、`desktop/fcitx5/profile`、`desktop/kscreenlockerrc`、`desktop/kwinrc`、`desktop/kwinrulesrc`、`i3/sway/config`、`profile`、`service`），`captured_diffs: []`、`captured_files: []`、`changed_files: []`、`package_receipt_id: null`、`managed_keys: {}`。收据在收据目录落盘；未入 agc 仓库。

## 会话用户验收

用户在本会话中确认红色横幅消失。后续 `wsl-webtop-yx9`（指针闪烁事项）的关闭理由亦引用同一次用户确认：红色横幅与指针闪烁均消失、移动不再缩小拉伸。

## 横幅机制要点

- 红色「error in config file」横幅由 Sway 的 swaynag 呈现，触发自配置错误（本例为 Mod4+Return 重复定义，即同一快捷键第二定义产生 binding overwrite 错误）。
- 修复方式：删除尾部重复定义，保留唯一 `bindsym $mod+Return exec /usr/bin/st`；`sway --validate --debug` 独立校验无 ERROR/Overwriting。
- 应用方式：经 native IPC 对同一 PID reload（Main PID 3437236、Sway PID 3437320 不变），原横幅 swaynag 进程退出；未重启桌面服务。
