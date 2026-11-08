# Webtop 移植到 WSL：组件、偏离与原因

> Sources: bd 事项 wsl-webtop-us2 记录, 2026-11-07; wsl-webtop 本机配置与验收记录, 2026-11-07; bd 事项 wsl-webtop-8tw 记录, 2026-11-08
> Raw: [WSL 原生 KDE Webtop：组件、构建参数与运行证据摘录](../../raw/webtop/2026-11-07-wsl-webtop-architecture-and-evidence.md); [Webtop 移植到 WSL 的单 8080 端口互斥架构摘录](../../raw/webtop/2026-11-07-webtop-passwordless-http-cutover.md); [i3 Ctrl Alt modifier 修改与 Selkies 内存归因调查摘录](../../raw/webtop/2026-11-08-i3-ctrl-alt-modifier-and-memory-investigation.md)
> Updated: 2026-11-08

## Overview

本机通过浏览器访问的 Linux 桌面由两组运行时组成：KDE（KWin 6.6.6 与 Plasma 5.27 补丁包）与 Webtop i3 Sway（Sway 1.11-3），两者在同一 8080 端口互斥切换（bd `wsl-webtop-us2`「单端口 KDE 与 Webtop i3 Sway 互斥切换」）。本批更新补充 i3 Sway 变体的窗口模式 modifier 调整。

## 组件

KDE 变体运行 KWin 6.6.6、Plasma 5.27 与 KScreenLocker，通过 host 浏览器无登录访问；i3 Sway 变体运行 Sway 1.11-3、st、wmenu、brightnessctl、grim 与 Chromium，同样无登录。两变体的包管理、用户环境、KDE 与 i3 Sway 的启动顺序与验收在对应 raw 中分别记录。

## 偏离与原因

i3 Sway 的持久配置模板来自 Ubuntu Sway 1.11-3 固定源码 `75a065a6e5b79216516e1077aa8dde9d397f67a8` 与 Debian 补丁。原包集合、baseline 与用户环境保持不变；不降级、不删除、无全局 upgrade。default `$term` 变量与系统终端 alternatives 保持；`$mod+Return` 绑定收敛为唯一定义并设为 `/usr/bin/st`；append xwayland enable；内联包的壁纸片段；移除末尾 `include /etc/sway/config.d/*`（因其中 `50-systemd-user.conf` 会向原用户管理器导入私有显示环境）。

## 窗口模式 modifier 调整（2026-11-08）

用户授权把 i3 Sway 的键盘前缀从 Mod4 改为 `Control+Mod1`，鼠标拖动显式拆出为 `floating_modifier Mod1 normal`。动机是避免 Windows 宿主对 Win 键组合的截获（Win+D 触发 Windows 显示桌面是已确认冲突）；窗口模式下选择较少冲突的远程快捷键。完整证据链（配置、收据、验证、HTTP 200）与当前建议键位表见 wiki/webtop/i3-sway-config-error-banner.md。

## 健康验收

非 root 单 8080 服务、KDE 环境与窗口的验收结果以本机 verify 记录为准（native running 11 项、security 7 项、desktop 13 项、session 29 项）；KDE reload 的上下文与 health acceptance 在对应 raw 中记录。

## See Also

- [i3 Sway 变体的配置错误横幅：重复键位与修复](i3-sway-config-error-banner.md)
- [Selkies 指针尺寸链路与浏览器时序（HiDPI 嵌套会话）](selkies-cursor-scaling-chain.md)
- [KDE Wayland 输入法启动器与 Fcitx 归属](kde-wayland-input-method-launcher.md)
- [私有桌面的共享边界：字体、应用入口与命令路径](private-desktop-visibility.md)
