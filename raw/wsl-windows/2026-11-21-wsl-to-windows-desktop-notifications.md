# WSL 到 Windows 桌面通知链路调查

> Source: 本机环境调查与 GitHub API 查询（2026-11-21）
> Collected: 2026-11-21
> Published: Unknown

## 当前通知链路

用户工作环境：Win browser → sip v0.10.0 → zsh → Herdr 0.9.5 → OMP 19.0.1。

## SIP 前端不处理 Notification API

在本机 sip v0.10.0 源码（/home/cpf/go/pkg/mod/github.com/!gaurav-!gosain/sip@v0.10.0）中搜索 Notification、requestPermission、showNotification，结果为空。前端 worker.js 只处理 title、bell、clipboard 三类 OSC 序列，没有 desktop notification 逻辑。

结论：浏览器中的 SIP 终端无法直接触发 Windows 桌面通知。通知必须走 Herdr 或 OMP 通道。

## Herdr 通知方式

Herdr 0.9.5 配置（~/.config/herdr/config.toml）：

```toml
[ui.toast]
delivery = "herdr"
```

可选值：herdr / terminal / system / off。

- `delivery = "herdr"`：通知显示在 Herdr 面板内，不到 Windows 桌面。
- `delivery = "system"`：调用 `notify-send` 命令。在 WSL 中 `notify-send` 不存在，所以也不出通知。

Herdr 源码 src/client/notifications.rs（v0.9.5）：
- `Terminal` 变体调用 `crate::terminal_notify::show_notification`。
- `System` 变体在 `cfg(not(windows))` 时调用 `platform::show_desktop_notification`，Linux 平台实现调用 `notify-send`（需要 DISPLAY 或 WAYLAND_DISPLAY 至少一项）。

## WSL 到 Windows 通知桥方案

### wsl-notify-send（推荐）

GitHub 仓库：stuartleeks/wsl-notify-send

- Stars：197
- 最新 release：v0.1.871612270，发布于 2021-05-24
- 提供 Windows amd64 .exe，GitHub Releases 直接下载
- 无 winget 包

安装路径：C:\Users\<USER>\AppData\Local\Programs\wsl-notify-send\wsl-notify-send.exe

WSL 侧适配器（~/.local/bin/notify-send）：

```sh
#!/bin/sh
category=Herdr
if [ "${1-}" = "--app-name" ]; then
    category=$2
    shift 2
fi
if [ "${1-}" = "--" ]; then
    shift
fi
message=${1:?Missing notification title}
shift
if [ -n "${1-}" ]; then
    message="$message: $1"
fi
exec /mnt/c/Users/<USER>/AppData/Local/Programs/wsl-notify-send/wsl-notify-send.exe \
    --category "$category" -- "$message"
```

适配器的作用：Herdr 调用 `notify-send --app-name Herdr -- TITLE [BODY]` 时有两个位置参数，而 wsl-notify-send.exe 只接受一个消息参数。适配器剥掉 `--app-name Herdr --`，把 TITLE 和 BODY 合并成一条消息，用 `--category Herdr` 设置弹窗标题。

### 备选工具对比

| 工具 | Stars | 维护状态 | 安装来源 | 特点 |
|---|---|---|---|---|
| wsl-notify-send | 197 | 2021-05 最后 release | GitHub Releases zip | 简单，需要适配器合并参数 |
| KDE/snoretoast | 363 | 活跃，官方下载已有 0.9.3 | KDE download.kde.org 或 Binary Factory | 维护好，支持按钮/回调，二进制获取稍复杂 |
| go-toast/toast | 487 | 2023 最后代码更新 | README 提供 .exe 下载 | 功能丰富（图片/声音/按钮/链接），wsl-notify-send 的底层库 |
| Windos/BurntToast | 1,732 | 仓库已归档 | PowerShell Gallery / Chocolatey | 功能最强，作者明确停止维护 |
| dbalabka/notify-send-wsl | 2 | 2026-03 发布 | npm（可用 Bun 安装） | bash 脚本，原生接受标题/正文/--app-name，参数最接近 Herdr 调用形式 |

以上工具均无 winget 包（2026-11-21 查询确认）。

### 结论

当前链路（SIP → Herdr "herdr" 模式）无法将通知送达 Windows 桌面。将 Herdr `ui.toast.delivery` 改为 `"system"` 并安装 WSL 通知桥后，可以送达。wsl-notify-send 是最简单的方案，需要 WSL 侧适配器处理参数差异。
