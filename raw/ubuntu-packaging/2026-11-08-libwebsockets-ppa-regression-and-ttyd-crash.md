# libwebsockets 第三方 PPA 回归与 ttyd 反复崩溃摘录

> Source: 本机 wsl-webtop 会话调查（用户报告原文 + bd 事项 wsl-webtop-bgp 记录 + /proc、systemd、gdb、strace 级实测 + /var/log/apt/history.log + USN-8893-1）
> Collected: 2026-11-08
> Published: Unknown

本文是原始材料摘录。来源逐块标注：用户原话、bd 记录、apt 历史、实测读数、安全公告。identifier 与代码一律保持英文原名。

## 用户报告原文（2026-11-08）

> this machine had restarted, win host upgrade, but after upgrade, ttyd proc keeps dying on itself, now http://localhost:7681/?fontSize=14&theme=… this url can connect to it, but a few seconds later, it will ask me to reconnect and the procs number would change

> i think it is dying and getting restarted and die again

> lets find out why and how to fix it properly

> and is it related with the kde and i3 changes we did? since this did not happen before

用户提供的 `procs ttyd|cat` 输出现象（同一会话多次执行，PID 依次为 `19105` / `20609`）：

```text
 19105 root │ 0.0 0.0 00:00:00 │ /usr/bin/ttyd -W -p 7681 -T xterm-256color -t enableSixel true -t fontSize 14 -t fontFamily Maple Mono NF CN, monospace -I /home/cpf/.local/share/ttyd/index-osc52.html login -f cpf
```

即 PID 在多次采样间变化，`root` 身份运行，`-W` 可写，`login -f cpf` 直接进入账户 shell。

## bd 事项记录（全文引用）

issue `wsl-webtop-bgp`「ttyd 在 xtradeb libwebsockets 下反复崩溃」：P1 BUG，2026-11-08 创建并关闭。

DESCRIPTION 原文：

> 已定位并修复。11月7日libwebsockets由4.3.5-3ubuntu1.1升到xtradeb4.3.5-3xtradeb1.2604.1；ttyd HTTP关闭连接SEGV。恢复Ubuntu两包、hold、监听127.0.0.1。5次HTTP通过PID31049稳定，NRestarts0。安全修复1.2+esm1需UbuntuPro本机不可用。

CLOSE REASON 原文：

> 根因xtradeb libwebsockets构建在关闭HTTP wsi时非法跳转，gdb栈确认；换用Ubuntu4.3.5-3ubuntu1.1同ttyd隔离对照3请求无崩溃。系统包恢复并hold，-i127.0.0.1，5次HTTP200，NRestarts0，Resultsuccess。安全1.2+esm1需Pro未配置，当前靠loopback收窄暴露。未浏览器自动化。

## systemd 单元与崩溃循环

原厂单元 `/usr/lib/systemd/system/ttyd.service`（实测 `systemctl cat`）：

```text
[Service]
Type=simple
EnvironmentFile=/etc/default/ttyd
ExecStart=/usr/bin/ttyd $TTYD_OPTIONS
ExecReload=/usr/bin/kill -HUP $MAINPID
KillMode=process
LimitNOFILE=512
LimitMEMLOCK=infinity
LimitSTACK=infinity
```

用户覆盖层 `/etc/systemd/system/ttyd.service.d/restart.conf`：

```text
[Service]
Restart=always
RestartSec=2s
```

`Restart=always` + `RestartSec=2s` 是「崩了又起」的直接原因：崩溃不终止服务，只重置主进程。

日志实测（`journalctl -u ttyd`）关键行：

```text
Main process exited, code=dumped, status=11/SEGV
Scheduled restart job, restart counter is at N
```

`status=11/SEGV` 即 SIGSEGV。会话内实测 `NRestarts` 已达 23。

## 崩溃点定位

用 gdb 在隔离端口 7682 复现（`gdb -q -batch -ex run -ex 'thread apply all bt' --args /usr/bin/ttyd -W -p 7682 …`），发一次 `curl` 后进程崩溃。栈的关键两帧是 `__lws_close_free_wsi_final` 与 `libwebsockets-evlib_uv` 之间，跳转目标为非法地址 `0x61`。即崩溃发生在 **关闭 HTTP 连接（wsi）** 的收尾路径，而不是终端会话或渲染。

注意：该 gdb 日志（`/tmp/ttyd-gdb.log`）与对照日志已在收尾时删除，此处引用会话当次工具输出。

## 隔离对照实验（判定「是库还是 ttyd」）

做法：不改系统包，只把 Ubuntu 官方版本的两个 `.deb` 解包到临时目录，用 `LD_LIBRARY_PATH` 让**同一个** ttyd 二进制加载官方库，再打同样请求。

```text
apt download libwebsockets19t64=4.3.5-3ubuntu1.1 libwebsockets-evlib-uv=4.3.5-3ubuntu1.1
dpkg-deb -x <deb> /tmp/lws-ubuntu/root
env LD_LIBRARY_PATH=/tmp/lws-ubuntu/root/usr/lib/x86_64-linux-gnu /usr/bin/ttyd -W -p 7682 …
```

结果：同一 ttyd 在官方库下连续 3 次请求、观察 18 秒以上仍存活，不再崩溃。这一步把变量收到「仅库版本不同」，排除 ttyd 自身与配置。

## apt 历史（版本三态的时间线）

`/var/log/apt/history.log` 实测原文：

```text
Start-Date: 2026-11-07  19:58:02
Commandline: apt upgrade
Requested-By: cpf (1000)
Upgrade: libwebsockets19t64:amd64 (4.3.5-3ubuntu1.1, 4.3.5-3xtradeb1.2604.1), libwebsockets-evlib-uv:amd64 (4.3.5-3ubuntu1.1, 4.3.5-3xtradeb1.2604.1), motd-news-config:amd64 (14ubuntu6.2, 14ubuntu6.3), base-files:amd64 (14ubuntu6.2, 14ubuntu6.3)
End-Date: 2026-11-07  19:58:05
```

这三条记录按时间顺序是：2026-11-07 19:58:02 普通升级换成 xtradeb 构建；2026-11-08 21:38:58 降级回官方 1.1；2026-11-08 22:07:18 升到 ESM 修复版。

```text
Start-Date: 2026-11-08  21:38:58
Commandline: apt-get install -y --allow-downgrades libwebsockets19t64=4.3.5-3ubuntu1.1 libwebsockets-evlib-uv=4.3.5-3ubuntu1.1
Downgrade: libwebsockets19t64:amd64 (4.3.5-3xtradeb1.2604.1, 4.3.5-3ubuntu1.1), libwebsockets-evlib-uv:amd64 (4.3.5-3xtradeb1.2604.1, 4.3.5-3ubuntu1.1)
End-Date: 2026-11-08  21:38:59
```

```text
Start-Date: 2026-11-08  22:07:18
Commandline: apt-get install -y libwebsockets19t64=4.3.5-3ubuntu1.2+esm1 libwebsockets-evlib-uv=4.3.5-3ubuntu1.2+esm1
Upgrade: libwebsockets19t64:amd64 (4.3.5-3ubuntu1.1, 4.3.5-3ubuntu1.2+esm1), libwebsockets-evlib-uv:amd64 (4.3.5-3ubuntu1.1, 4.3.5-3ubuntu1.2+esm1)
End-Date: 2026-11-08  22:07:19
```

关键点：11-07 那次是**普通的 `apt upgrade`**，没有指名包，也没有 `--allow-downgrades`；第三方 PPA 的更高版本号自然赢得了候选。

## 监听地址收窄（含一次失败）

首次尝试用接口名限制回环：

```text
ExecStart=/usr/bin/ttyd -W -p 7681 -i lo …
```

结果 `-i lo` 在本机 WSL 解析为 `10.255.255.254`，`curl http://127.0.0.1:7681/` 返回 `000`（连接被拒）。改为显式地址后正常：

```text
ExecStart=/usr/bin/ttyd -W -p 7681 -i 127.0.0.1 -T xterm-256color -t enableSixel=true -t fontSize=14 -t "fontFamily=Maple Mono NF CN, monospace" -I /home/cpf/.local/share/ttyd/index-osc52.html login -f cpf
```

`ss -ltnp 'sport = :7681'` 确认只监听 `127.0.0.1:7681`。

## 收紧与修复后的验证读数

安装官方 `+esm1` 版本并重启后实测：

```text
dpkg-query: libwebsockets19t64 4.3.5-3ubuntu1.2+esm1
dpkg-query: libwebsockets-evlib-uv 4.3.5-3ubuntu1.2+esm1
systemctl show ttyd: MainPID=53377  Result=success  NRestarts=0
```

连续 5 次 `curl`（间隔 4 秒）全部 `HTTP 200`，PID 未变化，`journalctl` 自该时刻起无 `SEGV`、无 `Main process exited`、无 `Scheduled restart`。

## 安全公告对照

USN-8893-1 针对 libwebsockets 的远程代码执行漏洞，修复版本为 `4.3.5-3ubuntu1.2+esm1`（Ubuntu Pro ESM 通道）。版本三态：

| 版本 | 来源 | 状态 |
|---|---|---|
| `4.3.5-3ubuntu1.1` | Ubuntu 普通源（universe）与 security | 受影响版本，崩溃对照实验用的是它 |
| `4.3.5-3xtradeb1.2604.1` | LP-PPA-xtradeb-apps | 可复现崩溃 |
| `4.3.5-3ubuntu1.2+esm1` | esm.ubuntu.com resolute-apps-security | 修复版，实测稳定 |

## 边界与未执行事项

- 浏览器端的 ttyd 页面交互未验收（原约束：不做浏览器自动化、不注入键鼠、不截图）。
- `-i lo` 解析到 `10.255.255.254` 只在本机 WSL 观察到，未跨环境复现。
- 未验证 xtradeb 后续版本是否修掉该崩溃。
- 未做 ttyd 与桌面改动之间的因果反证之外的实验：桌面改动不涉及 ttyd、libwebsockets 或其 systemd 单元，时间线上对应的是包升级。
