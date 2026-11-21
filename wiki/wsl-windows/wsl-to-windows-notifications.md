# WSL 到 Windows 桌面通知桥

> Sources: 本机环境调查与 GitHub API 查询, 2026-11-21
> Raw: [WSL 到 Windows 桌面通知链路调查](../../raw/wsl-windows/2026-11-21-wsl-to-windows-desktop-notifications.md)
> Updated: 2026-11-21

## Overview

Win browser 中的 SIP 终端（v0.10.0）不处理 HTML5 Notification API，通知必须走 Herdr 或 OMP 通道。Herdr `delivery = "herdr"` 只在面板内显示；`delivery = "system"` 在 WSL 调用 `notify-send`，但 WSL 中没有该命令。安装 WSL 通知桥后可将通知送达 Windows 桌面。

## 当前链路分析

用户工作环境：Win browser → sip v0.10.0 → zsh → Herdr 0.9.5 → OMP 19.0.1。

SIP v0.10.0 源码中无 Notification、requestPermission、showNotification 相关逻辑。前端 worker.js 只处理 title、bell、clipboard 三类 OSC 序列。浏览器中的 SIP 终端无法直接触发 Windows 桌面通知。

Herdr 0.9.5 的 `ui.toast.delivery` 可选值：`herdr` / `terminal` / `system` / `off`。`"herdr"` 只在 Herdr 面板内显示；`"system"` 在 Linux 平台调用 `notify-send`，WSL 中没有此命令，所以也不出通知。

## 修复方案：wsl-notify-send 桥

在 Windows 侧安装 wsl-notify-send.exe（GitHub Releases 下载），在 WSL 侧创建 `~/.local/bin/notify-send` 适配器脚本，将 Herdr `ui.toast.delivery` 改为 `"system"`。

适配器处理参数差异：Herdr 调用 `notify-send --app-name Herdr -- TITLE [BODY]`（两个位置参数），wsl-notify-send.exe 只接受一个消息参数。适配器剥掉 `--app-name Herdr --`，把 TITLE 和 BODY 合并成一条消息，用 `--category Herdr` 设置弹窗标题。

## 备选工具

| 工具 | Stars | 维护状态 | 安装来源 | 特点 |
|---|---|---|---|---|
| wsl-notify-send | 197 | 2021-05 最后 release | GitHub Releases zip | 简单，需适配器合并参数 |
| KDE/snoretoast | 363 | 活跃，官方下载已有 0.9.3 | KDE 官方下载 | 维护好，支持按钮/回调 |
| go-toast/toast | 487 | 2023 最后代码更新 | README .exe 下载 | 功能丰富，wsl-notify-send 的底层库 |
| BurntToast | 1,732 | 仓库已归档 | PowerShell Gallery | 功能最强，已停止维护 |
| notify-send-wsl | 2 | 2026-03 发布 | npm | 参数最接近 Herdr 调用形式 |

以上工具均无 winget 包（2026-11-21 查询确认）。wsl-notify-send 是最简单的方案，尽管其最新 release 距今已有四年多。
