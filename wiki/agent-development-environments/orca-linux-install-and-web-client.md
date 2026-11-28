# Orca 在 Linux/WSL 的安装、serve 与 Web 客户端

> Sources: Orca 官方文档（install / remote-servers / CLI overview / settings），2026-11-28；GitHub Releases v1.4.281 资产与 deb control，2026-11-28；Orca main 分支源码，2026-11-28；本机 WSL 环境检查，2026-11-28
> Raw: [Linux 发行物、serve 与 Web 客户端核实](../../raw/agent-development-environments/2026-11-28-orca-linux-distribution-and-serve.md); [源码构成、配置路径与 npm registry 核实](../../raw/agent-development-environments/2026-11-28-orca-codebase-config-and-npm.md)
> Updated: 2026-11-28

## Overview

Orca 在 Linux 上有三个桌面包和一个 server-only 包：桌面包是同一个应用的不同包装，server-only 包只有 orcad、Node 与 CLI。浏览器模式由 runtime 自带的前端 bundle 提供，`orca-ide serve` 不开桌面窗口；配置落在 `~/.config/orca` 的 SQLite profile 与 `~/.orca`。只跑 serve 时，`.deb` 比 AppImage 少一层 FUSE 依赖，升级都需要手动动作。

## 四种发行物

官方把 AppImage、`.deb`、`.rpm` 描述为同一应用的不同包装，差别在升级方式；server-only tar 是功能子集。

| 产物 | 内容与依赖 | 升级 |
|---|---|---|
| AppImage | 单文件；需要 FUSE；CLI 注册到 `~/.local/bin/orca-ide` | 应用内自更新；serve-only 的可靠路径是替换文件 |
| `.deb` | apt 安装；CLI 在 `/usr/bin/orca-ide`；依赖含 `xvfb` | 不自更新；装新包后重启服务 |
| `.rpm` | dnf/zypper 安装；其余同 `.deb` | 同上 |
| server tar | orcad、Node、`orca-ide` CLI；没有 web client、浏览器面板、听写 | 替换 `/opt/orca-server` |

v1.4.281 的资产尺寸：AppImage x64 287,697,368 bytes；deb amd64 225,495,568 bytes；rpm x86_64 191,074,489 bytes；server tar x64 71,915,437 bytes。官方文档写 server-only 约 60 MB、deb 约 190 MB，与实测字节数并列记录。

## 安装与 CLI

AppImage 的稳定直链是 `https://github.com/stablyai/orca/releases/latest/download/orca-linux.AppImage`，下载后 `chmod +x`。没有 FUSE 时用 `--appimage-extract-and-run`，或者先装 `libfuse2t64`。

`.deb` 用固定 tag 的资产：

```bash
curl -fLO https://github.com/stablyai/orca/releases/download/v1.4.281/orca-ide_1.4.281_amd64.deb
sudo apt install ./orca-ide_1.4.281_amd64.deb
```

deb 的 `Depends` 直接包含 `libgtk-3-0`、`libatspi2.0-0`、`xvfb`、`xdotool`、`xclip`、`python3-gi`、`at-spi2-core`，`Installed-Size` 为 686496。

Release 页面的资产区是懒加载的 `<include-fragment src="https://github.com/stablyai/orca/releases/expanded_assets/v1.4.281">`；页面折叠或该请求失败时看不到 deb。直链和 `gh release download v1.4.281 -R stablyai/orca -p 'orca-ide_*_amd64.deb'` 不受影响。

Linux 命令名是 `orca-ide`。deb/rpm 安装时把它放到 `/usr/bin/orca-ide`；AppImage 由 `serve` 首次启动注册到 `~/.local/bin/orca-ide`，并在启动期间写一个裸 `orca` 到 `~/.local/bin`。

## serve 与浏览器

```bash
orca-ide serve --port 6768
```

默认端口是 6768；端口被占用时换一个。默认绑定 `127.0.0.1`，`--bind` 只接受字面 IP，`--pairing-address` 只改变对外通告的地址。

带 web bundle 的包会打印：

```
Web client URL: http://127.0.0.1:6768/web-index.html#pairing=...
```

浏览器页面是 runtime 里的静态 bundle（`out/web/web-index.html` 与 `/assets/`），由同一个 runtime 提供；页面通过 WebSocket RPC 连回 runtime。没有单独的 web server 进程。

没有 `DISPLAY` 时，serve 会在 `Xvfb :99` 上启动虚拟显示，给隐藏窗口和浏览器面板用；系统需要装 `xvfb`。有 `DISPLAY` 时直接复用现有显示。

浏览器把配对信息存在 `orca.web.runtimeEnvironment.v1` 这个 localStorage 键里，按 origin 隔离；设置另有一份本地镜像，在线时以 runtime 的 `settings.get` 为准。`http://127.0.0.1:6768` 与 `http://127.0.0.1:7000` 是两个 origin，换端口、换主机名、换浏览器或清站点数据都要重新配对，所以示例固定 `--port 6768`。

要从局域网或 Tailscale 打开：

```bash
orca-ide serve --port 6768 --bind 0.0.0.0 --pairing-address <LAN_IP>
```

配对链接等同于密码，拿到的人可以操作这台机器上的 agent。

常驻用 per-user systemd unit：

```bash
orca-ide serve service install --port 6768
orca-ide serve service status
orca-ide pair
```

unit 默认名为 `orca-serve.service`（有后缀时 `orca-serve-<suffix>.service`），启动参数是 `serve --supervise --no-pairing`，所以服务本身不打印配对链接；`orca-ide pair` 会现取一个，并打印浏览器 URL。Linux 上退出登录后服务要存活，需要 `loginctl enable-linger`。同一份 profile 不要同时跑桌面 GUI 和 serve，锁冲突时 serve 以退出码 3 结束。

## 配置位置

Linux 的 userData 目录是 `${XDG_CONFIG_HOME:-~/.config}/orca`，可用 `ORCA_USER_DATA_PATH` 覆盖；serve 还会用 `ORCA_SERVE_USER_DATA_PATH` 把 profile 钉住。

- `orca-profile-index.json`：profile 清单。
- `profiles/<profile-id>/profile-state.db`：SQLite 主状态，schema 版本 3，表 `profile_state_meta`、`profile_state_documents`；设置、仓库、worktree、标签页与会话都在这里。
- `profiles/<profile-id>/orca-data.json`：迁移前的 JSON 状态，升级过的目录里可能还在，不承担实时写入。
- `browser-session-meta.json`、`orca-runtime.json`：浏览器会话元数据与 runtime 元数据。
- `~/.orca/keybindings.json`：快捷键覆盖。
- `~/.orca/agent-hooks/`：注入到 agent CLI 的 hooks 脚本。
- `~/.orca/` 下的 `.enc` 文件：Linear、Jira、Bitbucket 等组件的凭据。

macOS 对应 `~/Library/Application Support/orca`。网页客户端和 GUI 连同一个 runtime 时共享设置与工作区状态；Windows 本机桌面应用的 profile 与 WSL 这份是两套，把它作为 Remote Orca Server 加进来才会看到 WSL 的项目和设置。

## 升级

AppImage 换同路径文件即可；`--supervise` 的服务会监视 mtime，发现新构建后在同一 PID 上 exec 重启。桌面应用里也有 Check for Updates，但 serve-only 没有这个入口。

`.deb`/`.rpm` 不自更新：下载新包，`sudo apt install` 或 `dnf` 安装，再 `systemctl --user restart orca-serve`。

server tar 停掉服务，替换 `/opt/orca-server`，再启动。

## WSL 取舍

本机检查：Ubuntu 26.04.1 LTS、内核 6.18.58.1-microsoft-standard-WSL2、`networkingMode = mirrored`、`DISPLAY` 未设置、`xvfb` 已装、`libfuse2t64` 未装（候选 2.9.9-9build1）、`Linger=yes`、`~/.local/bin` 在 PATH。

只跑 serve 且需要浏览器 UI 时，`.deb` 更省事：不需要 FUSE，CLI 固定在 `/usr/bin/orca-ide`，apt 会补齐 `xvfb` 等依赖。AppImage 适合不想给这台机器 root、或偶尔还要打开 GUI 的情况。server tar 只适合不需要浏览器、由 Windows 桌面客户端或手机连接的情况。

这是本机判断，不是厂商推荐。

## 证据边界

- 未安装、未运行 Orca；serve 输出、Xvfb 启动、deb 安装后的行为都来自官方文档与 main 分支源码。
- 官方文档的 60 MB / 190 MB 是近似值；v1.4.281 的资产字节数来自 Releases API。
- GitHub 标签页的资产区是懒加载；页面结构以后可能变化，固定 tag 的直链有效。
- 本机环境是 2026-11-28 的快照。

## See Also

- [T3 Code、Orca 与 Herdr TUI 的运行形态和本地化边界](t3code-orca-herdr-run-surfaces.md)
- [Orca 的实现构成与发行物关系](orca-codebase-and-distribution.md)
- [ADE 候选清单](ade-candidate-inventory.md)
