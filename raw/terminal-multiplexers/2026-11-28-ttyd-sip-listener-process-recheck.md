# ttyd 与 sip 监听与进程归属复核

> Source: 本机 `ss -tlnp` 与 `ps -eo pid,ppid,user,lstart,args` 快照，2026-11-28 会话内只读捕获
> Collected: 2026-11-28
> Published: Unknown

## 监听行

`ss -tlnp`（非 root 视角）中与本文相关的两行：

```text
LISTEN 0      4096                                127.0.0.1:7682       0.0.0.0:*    users:(("sip",pid=356,fd=6))
LISTEN 0      4096                                127.0.0.1:7681       0.0.0.0:*
```

7681 行没有 users:() 段：ttyd 以 root 运行，非 root 的 `ss -tlnp` 看不到属主进程名，监听本身在。完整监听表里 tailscaled 的监听行含 Tailscale 虚拟 IP，按仓库脱敏规则不收录。

## 进程行

`ps -eo pid,ppid,user,lstart,args` 摘录（列依次为 pid、ppid、user、lstart、args）。

ttyd（root 级系统服务，父进程 1）：

```text
    185       1 root            Fri Nov 27 03:15:03 2026 /usr/bin/ttyd -W -p 7681 -i 127.0.0.1 -T xterm-256color -t enableSixel true -t fontSize 14 -t fontFamily Maple Mono NF CN, monospace -I /home/cpf/.local/share/ttyd/index-osc52.html login -f cpf
```

sip（用户级服务）：

```text
    356     292 cpf             Fri Nov 27 03:15:04 2026 /home/cpf/go/bin/sip -H localhost -p 7682 -- /usr/bin/zsh -l
```

sip 派发的三个登录 shell，以及各自里面运行的 Herdr TUI 客户端：

```text
3565205     356 cpf             Fri Nov 27 20:08:57 2026 /usr/bin/zsh -l
3565384     356 cpf             Fri Nov 27 20:08:59 2026 /usr/bin/zsh -l
3565679     356 cpf             Fri Nov 27 20:09:01 2026 /usr/bin/zsh -l
3565776 3565205 cpf             Fri Nov 27 20:09:01 2026 herdr --session sec
3566184 3565384 cpf             Fri Nov 27 20:09:07 2026 herdr --session main
3566559 3565679 cpf             Fri Nov 27 20:09:14 2026 herdr --session mon
```

其余相关进程（父进程均为 292）：

```text
   2878     292 cpf             Fri Nov 27 03:16:13 2026 /home/cpf/.local/bin/herdr server
   4284     292 cpf             Fri Nov 27 03:16:27 2026 /home/cpf/.local/bin/herdr server
   6612     292 cpf             Fri Nov 27 03:16:41 2026 /home/cpf/.local/bin/herdr server
  34966     292 cpf             Fri Nov 27 03:23:13 2026 /home/cpf/.local/bin/herdr-core serve
```

## 核查事实

- 全表没有父进程为 185 的行：快照时刻 ttyd 下没有任何会话进程。
- ttyd 与 sip 的启动时间均为 2026-11-27 03:15，与 WSL 本次启动一致（systemd-logind 等同批系统进程同为 03:15:03/04 启动），两个服务随启动自动拉起。
- 三个 herdr server 与 herdr-core serve 的父进程均为 292（用户 systemd），启动时间 2026-11-27 03:16 至 03:23。
- 三个 herdr --session TUI 客户端（sec、main、mon）全部经由 sip 派发的 zsh -l 运行（父进程链指向 pid 356），启动时间 2026-11-27 20:08 至 20:09。
