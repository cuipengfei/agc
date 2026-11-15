# sip WSL systemd 自启与 uv-bun 更新集成

> Source: 本机 systemd 配置与命令实测；`uv-bun` 修改前后行为
> Collected: 2026-11-15
> Published: 2026-11-15

## ttyd.service 当前状态（并存参考）

`systemctl cat ttyd.service` 关键配置（非敏感部分）：

```
# /usr/lib/systemd/system/ttyd.service
ExecStart=/usr/bin/ttyd $TTYD_OPTIONS

# /etc/systemd/system/ttyd.service.d/override.conf
ExecStart=
ExecStart=/usr/bin/ttyd -W -p 7681 -i 127.0.0.1 -T xterm-256color \
  -t enableSixel=true -t fontSize=14 \
  -t "fontFamily=Maple Mono NF CN, monospace" \
  -I /home/cpf/.local/share/ttyd/index-osc52.html login -f cpf

# /etc/systemd/system/ttyd.service.d/restart.conf
Restart=always
RestartSec=2s
```

`loginctl show-user cpf --property=Linger` 输出：

```
Linger=yes
```

ttyd 以 root 运行（PID 178，父进程 PID 1），绑定 `127.0.0.1:7681`。

## 新建 sip.service（用户级）

文件路径：`/home/cpf/.config/systemd/user/sip.service`

完整内容：

```ini
[Unit]
Description=sip browser terminal on localhost:7682
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
WorkingDirectory=/home/cpf
Environment="HOME=/home/cpf" "USER=cpf" "LOGNAME=cpf" "SHELL=/usr/bin/zsh" "LANG=C.UTF-8" "TERM=xterm-256color" "COLORTERM=truecolor"
ExecStart=/home/cpf/go/bin/sip -H localhost -p 7682 --font-family "Maple Mono NF CN, monospace" -- /usr/bin/zsh -l
Restart=always
RestartSec=2

[Install]
WantedBy=default.target
```

启用命令：

```bash
systemctl --user daemon-reload
systemctl --user enable sip.service
systemctl --user start sip.service
```

## 启动后实测结果

| 检查项 | 命令 | 结果 |
|---|---|---|
| 是否开机自启 | `systemctl --user is-enabled sip.service` | `enabled` |
| 运行状态 | `systemctl --user is-active sip.service` | `active` |
| ttyd 是否仍运行 | `systemctl is-active ttyd.service` | `active` |
| 健康检查 | `curl -fsS http://localhost:7682/health` | `OK` |
| 首页注入配置 | `curl -fsS http://localhost:7682/ \| grep __sipConfig` | `window.__sipConfig={"fontFamily":"Maple Mono NF CN, monospace"};` |

注意：注入配置里没有 `renderer` 字段（命令行未传 `--renderer`）。

## 常驻 sip.service 进程归属实测

`systemctl --user show sip.service -p MainPID --value` 输出：

```
1820561
```

`ps -o pid,ppid,comm -p 1820561` 输出：

```
    PID PPID COMMAND
1820561  273 sip
```

常驻 `sip.service` 的 MainPID 为 `1820561`，父进程为 `273`（`systemd --user`）。以下是 `systemd-run --user` 临时单元的历史实测记录（当时 MainPID 为 `1777797`，父进程同为 `273`），环境变量结论对两种方式等价。


`systemd-run --user` 临时单元拉起的 sip 进程（历史 MainPID 1777797，父进程 273）环境变量清单：
COLORTERM  DBUS_SESSION_BUS_ADDRESS  GPG_AGENT_INFO  HOME  INVOCATION_ID
JOURNAL_STREAM  LANG  LOGNAME  MANAGERPID  MANAGERPIDFDID  MEMORY_PRESSURE_WATCH
MEMORY_PRESSURE_WRITE  PATH  QT_ACCESSIBILITY  SHELL  SSH_AUTH_SOCK
SYSTEMD_EXEC_PID  TERM  USER  XDG_DATA_DIRS  XDG_RUNTIME_DIR
```

其中不含 `HERDR_BIN_PATH`、`HERDR_ENV`、`HERDR_PANE_ID`、`HERDR_SESSION`、`HERDR_SOCKET_PATH`、`HERDR_STARTUP_CWD`、`HERDR_TAB_ID`、`HERDR_WORKSPACE_ID`、`OMPCODE`、`PI_SESSION_ID`、`PI_TOOL_CALL_ID` 等 Herdr/OMP 相关变量。

结论：从 Herdr pane 内直接派生子进程会继承 `HERDR_*` 环境变量，导致 `herdr --session main` 报嵌套错误；改用 `systemd --user` 拉起后环境干净，可正常运行。

## uv-bun 集成 sip 更新

`~/.local/bin/uv-bun` 中 sip 相关行为约定：

- `uv-bun --check`：读取 `/home/cpf/go/bin/sip` 的 Go 构建元数据（设 `GOTOOLCHAIN=local` 防自动下载），查询 Go 官方模块代理最新版本，输出本地版本与是否有更新。全程不运行 sip。
- `uv-bun --up`：版本不同时执行 `go install github.com/Gaurav-Gosain/sip/cmd/sip@latest`，完成后核验 PATH 中实际 sip 版本是否与代理返回的最新版本一致；不一致时报 `FAILED sip active version check`。
- 找不到 sip 时输出 `sip: not found`；找不到 Go 时输出 `sip: Go not found`；安装失败时输出 `FAILED sip` 并附带原因。

隔离环境 9 项行为测试全部通过，覆盖：待升级、已最新、缺 Go、缺 sip、元数据读取失败、代理查询失败、安装失败、PATH 版本未更新、不运行 sip。
