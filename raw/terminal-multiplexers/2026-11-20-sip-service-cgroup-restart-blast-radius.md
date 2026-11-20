# sip 服务重启的 cgroup 波及范围

> Source: 本机 `~/.config/systemd/user/sip.service`；`systemctl --user show sip`；`journalctl --user`；重启后的进程树与 `/proc/<pid>/cgroup`
> Collected: 2026-11-20
> Published: Unknown

## 单元配置

`~/.config/systemd/user/sip.service` 的 `[Service]` 段：

```ini
Type=simple
WorkingDirectory=/home/cpf
Environment="HOME=/home/cpf" "USER=cpf" "LOGNAME=cpf" "SHELL=/usr/bin/zsh" "LANG=C.UTF-8" "TERM=xterm-256color" "COLORTERM=truecolor"
ExecStart=/home/cpf/go/bin/sip -H localhost -p 7682 -- /usr/bin/zsh -l
Restart=always
RestartSec=2
```

单元没有设置 `KillMode`。`systemctl --user show sip --property=KillMode` 返回 `KillMode=control-group`，即 systemd 的默认值。

## 观测到的进程树

sip 只包装一条命令（`zsh -l`），Herdr 在该 shell 内启动，因此 server 与全部 pane 进程都落在同一个单元 cgroup 中：

```text
sip.service cgroup
└── sip -H localhost -p 7682 -- /usr/bin/zsh -l
    └── /usr/bin/zsh -l
        └── herdr --session sec
            └── /home/cpf/.local/bin/herdr server
                └── pane 内 shell、agent、以及 agent 派生的子进程
```

同时存在的 `herdr --session mon`、`herdr --session main` 及其 server 也位于同一 cgroup。

## 重启时的记录

`systemctl --user restart sip` 的实际行为：

- `journalctl --user` 记录 `Reload requested`（21:43:12）、`Stopping sip.service`（21:43:13）、`Started sip.service`（21:43:15）。
- sip 退出前记录 `shutting down web server`，并结束全部 WebSocket 会话。
- 执行该命令的 shell 返回退出码 143，即收到 SIGTERM（128 + 15）。

结果是 cgroup 内的 Herdr 客户端、Herdr server、全部 pane 进程以及发起重启的 agent 会话一起结束。`Restart=always` 使 sip 崩溃后自动重启，同样会结束这些后代进程。

## cgroup 与 POSIX 进程组

systemd 的 `KillMode=control-group` 作用于单元 cgroup 内的全部进程。它与 POSIX 进程组是两个不同的概念：在 shell 里用 `setsid`、`disown`、`nohup` 改变的是进程组或会话属性，进程仍留在单元 cgroup 中，仍会随单元停止而收到信号。

要让 Herdr 不受 sip 重启影响，需要让它离开该 cgroup：

- 独立的 user unit（例如 `herdr-server.service`），或
- `systemd-run --user --scope` 启动的独立 scope。

验收标准：

```bash
systemd-cgls --user-unit sip
```

输出中不再包含 herdr server 及其 pane 进程树。

## 当前状态

本次只完成观测，未迁移 Herdr 服务。恢复后的 Herdr server 仍位于 `sip.service` 的 cgroup 内。

## 证据边界

- 独立 unit 或 scope 的迁移方式未实施，未验证。
- 页面级 `Apply & Reconnect` 只结束旧 shell 并新建会话；Herdr 进程是否随之结束，本次未单独观测。
