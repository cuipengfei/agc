# herdr-core 安装配置与 WSL2/Tailscale 手机接入

> Sources: herdrdev/herdr-core README 与安装脚本, 2026-11-13; 本机 Ubuntu 26.04 WSL2 部署实测, 2026-11-13; bradfitz Tailscale SSH 说明, 2022-06-22
> Raw: [herdr-core 安装脚本、配置定义与 WSL2/Tailscale 部署实测](../../raw/herdr-plannotator/2026-11-13-herdr-core-install-config-wsl2-tailscale.md)
> Updated: 2026-11-13

## 安装与升级

安装（Linux/macOS）：

```sh
curl -fsSL https://releases.herdr.dev/core/install.sh | sh
```

安装脚本装到 `~/.local/bin/herdr-core`；`hc` 链接只在系统没有 `hc` 命令时创建。下载走 `latest.json` manifest，SHA256 校验失败拒绝安装。`HC_VERSION=0.2.0` 可固定版本。升级用 `hc update`，运行中的终端保留。apt 升级不会触碰它。

## config.toml 配置项

配置文件 `~/.config/herdr-core/config.toml`，不存在时全用默认值。以下 11 项来自源码 `config.rs` 的完整定义：

| 配置项 | 默认值 | 含义 |
|---|---|---|
| `shell` | 本机 shell（`$SHELL`，否则 `/bin/sh`） | 不带程序启动新终端时的 shell，如 `["nu"]`；对之后新建的 shell 生效，无需重启 |
| `detach_key` | `"ctrl+\\"` | `hc attach` 的脱离按键，只接受 `ctrl+字母` 或 `ctrl+@ [ \ ] ^ _` |
| `wait_timeout` | 180 秒 | `hc wait` 等待多久后先返回一次，程序继续运行 |
| `notes` | true | 是否允许 core 给父 agent 发通知、给 agent 间消息加 `<hc>` 标签；false 时 core 不主动输入任何内容 |
| `notes_quiet` | 3 秒 | 发通知前等待的安静时间；按 Enter 或清除草稿立即发送 |
| `draft_wait` | 60 秒 | 有未完成草稿时，消息和通知最多等待的秒数；0 表示只保留安静等待 |
| `headless` | `"200x120"` | 无人输入的终端尺寸，`列x行`，值必须都大于 0 |
| `history_mb` | 5 | 每个存活终端保留的滚动历史（MB） |
| `restore_screen` | false | `--keep` 终端的程序丢失后，是否在新 shell 上方显示最后保存的屏幕 |
| `socket` | `$XDG_RUNTIME_DIR` 下 | core 监听 socket 位置，`HC_SOCKET` 环境变量优先 |
| `machine_timeout` | 30 秒 | 另一台机器响应调用的时限，以及连接静默超时后放弃该线路并重拨的时限；重拨间隔另有退避策略 |

写错配置的行为分两类：使用处校验的（`shell`、`headless`、`detach_key`）在使用时报配置错误；投递相关的（`notes_quiet`、`draft_wait`）退回默认值并在 `core.log` 记录一次错误，不中断投递。

## WSL2 + Tailscale 手机接入部署

本机（Ubuntu 26.04 WSL2）实测部署清单：

1. `curl -fsSL https://releases.herdr.dev/core/install.sh | sh` 安装 core。
2. **Tailscale 装在 WSL 发行版内**（手机要登录 WSL 的 SSH 入口；只装 Windows 宿主侧时手机只能到达 Windows）：`curl -fsSL https://tailscale.com/install.sh | sudo sh`，然后 `sudo tailscale up --ssh`，浏览器完成一次登录认证。
3. `sudo ln -sf ~/.local/bin/herdr-core /usr/local/bin/hc`：手机通过非交互 SSH 执行 `hc connect`，`/usr/local/bin` 保证任何 PATH 下都能找到。
4. `sudo systemctl enable --now tailscaled`：tailscaled 随 WSL 的 systemd 自启；Windows 重启后只要 WSL 启动，Tailscale 即上线，登录状态保留。
5. 手机端：Tailscale 登录同一账号，Herdr 添加机器填本机 Tailscale 地址、SSH 用户名 `cpf`、端口 22；Tailscale SSH 接管认证，不需要密钥。

Tailscale 侧没有手工配置文件：`/etc/default/tailscaled` 只有 `PORT`（UDP 41641）和 `FLAGS` 两项；其余（登录、SSH 启用）由 `tailscale up`/`tailscale set` 命令写入 state 文件。访问规则在网页控制台的 tailnet policy 文件（`acls`、`ssh` 段）。

## 地址来源与本机自测限制

本机 Tailscale 地址由协调服务器在首次登录时分配，`tailscale ip -4` 查询；跟随设备，正常使用稳定。手机首台机器手动填地址，连上后 Herdr 提供它认识的其他机器。

在 WSL 内对本机 Tailscale 地址执行 `tailscale ssh <USER>@<本机地址>` 得到 `connection refused`：Tailscale SSH 由 tailscaled 在 WireGuard 解密后的入站流量内接管 22 端口，本机访问自己的 Tailscale 地址不经过该路径，所以 `ss` 看不到 22 监听、自测不通，服务状态以 `RunSSH: true` 和 tailscale0 地址为准。Tailscale 仓库 issue #11097（OPEN）记录同一现象。真实验证需要另一台在线 tailnet 设备（如手机）连接。

## 升级方式与 uv-bun 集成

core 用 `hc update` 自升级；Tailscale 走 apt 仓库（`pkgs.tailscale.com/stable/ubuntu resolute`）。本机 `~/.local/bin/uv-bun` 的 `--up` 自 2026-11-13 起在第 3 段 self-update 中包含 `hc update`（版本显示、升级提示、执行与 `hc` 缺失时跳过），`--check` 实测输出确认。

## 证据范围

- 安装脚本、README、`config.rs` 引文与全部实测输出：来自 raw 摘录原文。
- 手机端连接未实测；Android 侧 Herdr App 与 Tailscale 行为未验证。
- `headless`、`restore_screen`、`socket`、`machine_timeout` 的运行效果未逐一实测，含义取自源码注释。

## See Also

- [Herdr App、herdr-core 与手机](herdr-app-core-mobile.md)
- [Herdr 配置项与用户体验](herdr-config-user-experience.md)（Herdr TUI 的 config.toml，与本文件的 herdr-core config.toml 是两个不同文件）
- [herdr-core 的 hc 命令面](herdr-core-hc-cli-command-surface.md)
