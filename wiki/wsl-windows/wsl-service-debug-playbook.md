# WSL 服务排障手法

> Sources: 本会话 wsl-webtop 与 agc 排障实测, 2026-11-08
> Raw: [WSL 服务排障手法摘录](../../raw/wsl-windows/2026-11-08-wsl-service-debug-playbook.md)
> Updated: 2026-11-08

## Overview

四个在 WSL 服务排障中反复使用的手法：用 `LD_LIBRARY_PATH` 做「是库还是程序」的隔离对照、用 `ss -ltnp` 验证监听地址、用 `apt-cache policy` 与 `apt-mark showhold` 一起看版本来源与锁定状态、用 `journalctl` 与 `NRestarts` 确认崩溃循环。每个手法给出适用场景、命令模板、预期输出与误判陷阱。

## 手法 1：`LD_LIBRARY_PATH` 隔离对照

| 项 | 内容 |
|---|---|
| 适用场景 | 程序崩溃，怀疑共享库版本而非程序本身 |
| 命令模板 | `apt download <pkg>=<version> && dpkg-deb -x <deb> /tmp/isolated && env LD_LIBRARY_PATH=/tmp/isolated/usr/lib/x86_64-linux-gnu <program> …` |
| 预期输出 | 同一程序在隔离库下行为改变（如不再崩溃） |
| 误判陷阱 | 只解包 `.deb` 不改 `LD_LIBRARY_PATH` 时，程序仍加载系统库，对照无效 |

本会话用此法确认 ttyd 的 SIGSEGV 来自 xtradeb 的 libwebsockets 构建，而非 ttyd 自身。

## 手法 2：`ss -ltnp` 验证监听地址

| 项 | 内容 |
|---|---|
| 适用场景 | 服务绑定地址与预期不符，或 localhost 连接被拒 |
| 命令模板 | `ss -ltnp 'sport = :<port>'` |
| 预期输出 | 显示 `127.0.0.1:<port>` 或 `0.0.0.0:<port>` |
| 误判陷阱 | `-i lo` 在 WSL 可能解析为 `10.255.255.254` 而非回环，需用显式 `-i 127.0.0.1` |

本会话用此法确认 ttyd 从 `0.0.0.0:7681` 收窄为 `127.0.0.1:7681`。

## 手法 3：`apt-cache policy` 与 `apt-mark showhold`

| 项 | 内容 |
|---|---|
| 适用场景 | 版本来源不明、被第三方 PPA 抢占、或被 hold 锁住 |
| 命令模板 | `apt-cache policy <pkg>` 与 `apt-mark showhold` |
| 预期输出 | 版本表含 Installed、Candidate、各来源优先级；hold 列表为空或列出包名 |
| 误判陷阱 | 只看版本号不看优先级，会漏掉 `-1` 或 `510` 等关键信息 |

本会话用此法确认 xtradeb 版本被 `-1` 排除、ESM 版本以 `510` 胜出。

## 手法 4：`journalctl` 与 `NRestarts` 确认崩溃循环

| 项 | 内容 |
|---|---|
| 适用场景 | 服务反复重启，需要区分配置错误与程序崩溃 |
| 命令模板 | `journalctl -u <service> --since '<time>'` 与 `systemctl show <service> -p MainPID -p NRestarts -p Result` |
| 预期输出 | 日志含 `Main process exited, code=dumped, status=11/SEGV` 或 `Scheduled restart job`；`NRestarts` 计数递增 |
| 误判陷阱 | `Restart=always` 会掩盖崩溃，需看 `NRestarts` 是否持续增长 |

本会话用此法确认 ttyd 的 `Restart=always` 与 `SIGSEGV` 构成 23 次重启循环。

## See Also

- [apt 来源优先级与第三方 PPA 回归](../ubuntu-packaging/apt-source-priority-and-ppa-regression.md)
- [私有桌面的共享边界](../webtop/private-desktop-visibility.md)
