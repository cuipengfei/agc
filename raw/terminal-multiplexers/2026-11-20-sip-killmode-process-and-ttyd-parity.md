# sip 的 KillMode=process 与 ttyd 对齐

> Source: 本机 `/usr/lib/systemd/system/ttyd.service`、`/etc/systemd/system/ttyd.service.d/restart.conf`、`/home/cpf/.config/systemd/user/sip.service`；`systemctl show` 输出；`/proc/<pid>/cgroup`；freedesktop 的 systemd.kill(5) 手册；herdrdev/herdr 源码
> Collected: 2026-11-20
> Published: Unknown

## 三份配置与行号

`/usr/lib/systemd/system/ttyd.service:9-11`：

```ini
ExecStart=/usr/bin/ttyd $TTYD_OPTIONS

KillMode=process
```

`/etc/systemd/system/ttyd.service.d/restart.conf:2-3`：

```ini
Restart=always
RestartSec=2s
```

`/home/cpf/.config/systemd/user/sip.service` 的 `[Service]` 段，第 8、11 行为本次重点：

```ini
[Service]
Type=simple
KillMode=process
WorkingDirectory=/home/cpf
Environment="HOME=/home/cpf" "USER=cpf" "LOGNAME=cpf" "SHELL=/usr/bin/zsh" "LANG=C.UTF-8" "TERM=xterm-256color" "COLORTERM=truecolor"
ExecStart=/home/cpf/go/bin/sip -H localhost -p 7682 -- /usr/bin/zsh -l
Restart=always
RestartSec=2
```

修改前该段没有 `KillMode` 行，systemd 使用默认值 `control-group`。

## KillMode 语义（手册）

来源：[systemd.kill(5)](https://www.freedesktop.org/software/systemd/man/latest/systemd.kill.html) 的 `KillMode=` 条目。

- `control-group`：停止单元时向单元 cgroup 内的全部进程发信号。
- `process`：只向单元主进程发信号，cgroup 内的其他进程不由该停止操作发信号。

## 本次改动与验证

改动：`sip.service` 第 8 行新增 `KillMode=process`，与 ttyd 单元一致。

执行的命令：

```bash
systemd-analyze --user verify /home/cpf/.config/systemd/user/sip.service
systemctl --user daemon-reload
systemctl --user show sip -p KillMode -p ActiveState -p MainPID
```

验证输出：

```text
ActiveState=active
KillMode=process
MainPID=864865
```

`systemd-analyze --user verify` 无错误输出。daemon-reload 前后 `systemctl --user show sip -p MainPID --value` 均为 864865，本次未执行 restart。

两份单元生效值核对：

```text
$ systemctl show ttyd.service -p KillMode -p Restart --no-pager
KillMode=process
Restart=always

$ systemctl --user show sip.service -p KillMode -p Restart --no-pager
KillMode=process
Restart=always
```

## 采集时的进程归属

三个 herdr server 的 cgroup 文件内容相同：

```text
/proc/865047/cgroup: 0::/user.slice/user-1000.slice/user@1000.service/app.slice/sip.service
/proc/866644/cgroup: 0::/user.slice/user-1000.slice/user@1000.service/app.slice/sip.service
/proc/873008/cgroup: 0::/user.slice/user-1000.slice/user@1000.service/app.slice/sip.service
```

`KillMode=process` 只改变停止时发信号的对象，不改变进程归属：这些进程仍位于 `sip.service` 的 cgroup 内。

## 未验证

- 修改后未执行 restart；重启后 herdr server 与 pane 程序继续运行是按 systemd.kill 手册的语义推断，尚未实测。
- `process` 模式下 sip 停止后子 zsh 与 Herdr 客户端的去留未观测。
- 遗留进程长期留在该单元 cgroup 的影响未评估。

## 本机约束与选择

本机操作流程为浏览器 → sip → zsh → Herdr attach，session 名称临场决定。采用全局 `KillMode=process`，对任意名称的 session 一致生效。

## Herdr 的无头服务入口

`herdr --help` 列出 `server  Run herdr server`。源码 [src/main.rs:569-570](https://github.com/herdrdev/herdr/blob/2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01/src/main.rs#L569-L570)：

```rust
if args.get(1).map(|s| s.as_str()) == Some("server") {
    return server::headless::run_server();
}
```
