# apt 来源优先级与第三方 PPA 回归

> Sources: bd 事项 wsl-webtop-bgp 记录, 2026-11-08; 本机 wsl-webtop 会话实测（apt-cache policy、preferences.d、pro status、apt history）, 2026-11-08; Ubuntu USN-8893-1, 2026-11-08
> Raw: [libwebsockets 第三方 PPA 回归与 ttyd 反复崩溃摘录](../../raw/ubuntu-packaging/2026-11-08-libwebsockets-ppa-regression-and-ttyd-crash.md); [apt 来源优先级与 Ubuntu Pro ESM 启用摘录](../../raw/ubuntu-packaging/2026-11-08-apt-priority-and-ubuntu-pro-esm.md)
> Updated: 2026-11-08

## Overview

一次普通的 `apt upgrade` 把两个 libwebsockets 包从 Ubuntu 官方版本换成了第三方 PPA 构建，随后 ttyd 在关闭 HTTP 连接时崩溃并被 systemd 反复拉起。本文记录 apt 选择候选版本的实际规则、这次事故的完整时间线、判定「是库还是程序」的隔离方法，以及比 `apt-mark hold` 更精确的长期防护。

## apt 如何挑中第三方版本

未配置 pin 时每个软件源默认优先级 `500`。同一包在多个源下都有候选，apt 在优先级最高的一组里取**版本号最大**者。本机事故版本号对照：

| 版本 | 来源 | 默认优先级 |
|---|---|---:|
| `4.3.5-3ubuntu1.1` | Ubuntu `resolute-updates` / `resolute-security` | 500 |
| `4.3.5-3xtradeb1.2604.1` | `LP-PPA-xtradeb-apps` | 500 |

两者同为 `500`，第三方构建的版本串更长、排序更高，于是 `apt upgrade` 在无人指名的情况下换掉了官方包。这一步在 `/var/log/apt/history.log` 里留下明确记录，命令是普通 `apt upgrade`，没有 `--allow-downgrades`。

优先级区间（`man apt_preferences`）：`P >= 1000` 即使构成降级也安装；`990 <= P < 1000` 即使不来自 target release 也安装；`500 <= P < 990` 与 `100 <= P < 500` 各有「除非存在别的版本」的例外；`0 < P < 100` 仅在无已装版本时安装；`P < 0` 阻止该版本被安装；`P = 0` 行为未定义，手册明确要求不要使用。

把某个来源压到负值是本问题的直接解：它阻止该版本被安装，同时不影响其他来源的正常升级。

## 事故时间线

| 时间 | 事件 |
|---|---|
| 2026-11-07 19:58:02 | 普通 `apt upgrade` 把两个包换成 xtradeb 构建 |
| 宿主重启后 | ttyd 每次 HTTP 请求约数秒后 `SIGSEGV`，`Restart=always` 反复拉起，`NRestarts` 到 23 |
| 2026-11-08 21:38:58 | 降级回官方 `4.3.5-3ubuntu1.1`（`--allow-downgrades`） |
| 2026-11-08 22:07:18 | 安装 Ubuntu Pro ESM 的 `4.3.5-3ubuntu1.2+esm1` |

## 崩溃属于库而不是程序

判定依据不是读代码，而是把变量收窄到一个：

1. 用 gdb 在隔离端口复现，拿到崩溃栈。关键两帧在 `__lws_close_free_wsi_final` 与 `libwebsockets-evlib_uv` 之间，跳转到非法地址 `0x61`，即崩溃发生在关闭 HTTP 连接（wsi）的收尾路径。
2. 只解包官方 `.deb` 到临时目录，用 `LD_LIBRARY_PATH` 让**同一个** ttyd 二进制加载官方库，连打 3 次请求并观察 18 秒以上，进程存活。

同一个二进制、同一份配置、同一批请求，只换库就消失，说明差异在库的构建。gdb 日志与对照日志在收尾时已删除，原始记录见 raw 摘录。

## 三层防护

| 层 | 做法 | 作用范围 |
|---|---|---|
| 来源 | `/etc/apt/preferences.d/libwebsockets-official`，`Pin: release o=LP-PPA-xtradeb-apps`、`Pin-Priority: -1`，只列 `libwebsockets19t64 libwebsockets-evlib-uv` | 只禁这两个包的 xtradeb 版本，不影响该 PPA 提供的其他软件 |
| 暴露面 | `ExecStart` 加 `-i 127.0.0.1`，`ss -ltnp` 确认只监听回环 | ttyd 不再对局域网开放可写终端 |
| 修复 | 安装 Ubuntu Pro 的 `4.3.5-3ubuntu1.2+esm1` | 消除公告所列漏洞 |

`apt-mark hold` 能暂时冻结版本，但它会拦住该包的**全部**升级，包括将来的安全修复，必须手动 `unhold`。包级 pin 表达的是「不要这个来源的这个构建」，官方与 ESM 通道保持可升级，因此更适合长期保留。本机最终 `apt-mark showhold` 为空。

收窄监听时踩到一个具体坑：`-i lo` 在本机 WSL 解析成 `10.255.255.254`，`curl` 直接返回 `000`。改成显式 `-i 127.0.0.1` 才正常。

## Ubuntu Pro ESM 的版本语义

`ESM` 全名 Expanded Security Maintenance。ESM 修复版本带 `+esmN` 后缀，例如 `4.3.5-3ubuntu1.2+esm1`。这个后缀不承诺普通源将来也会发布同一修复：本次 USN-8893-1 只列出 ESM 版本，普通源仍停在 `4.3.5-3ubuntu1.1`。

本机订阅是免费个人方案。`ubuntu-pro-client` 包自带两个 pin 文件，把 `UbuntuESMApps` 与 `UbuntuESM` 定为 `510`，略高于普通源的 `500`。因此在 Pro 启用后，ESM 版本会自动胜过普通源与 xtradeb（后者已被 `-1` 排除），`apt upgrade` 即可取得。

服务分工与取舍：

| 服务 | 覆盖 | 本机 |
|---|---|---|
| `esm-apps` | Universe 等应用类包，本次 libwebsockets 属于这里 | 启用 |
| `esm-infra` | Main 等基础系统包 | 启用 |
| `landscape` | 多机集中管理代理，会向管理端上报机器与包信息 | 关闭（单机无收益） |

启用 `esm-apps` 后一次批量升级的实测规模是 25 个安全更新、33.3 MB，覆盖 `ffmpeg`、`imagemagick`、`tesseract-ocr`、`git-lfs`、`python3-pip` 等，全程无 dpkg 或依赖错误。

## 修复后的本机状态

| 项 | 值 |
|---|---|
| 已安装版本 | `4.3.5-3ubuntu1.2+esm1`（两个包） |
| 候选版本 | 同上 |
| xtradeb 优先级 | `-1` |
| ESM 优先级 | `510` |
| 普通源优先级 | `500` |
| hold 列表 | 空 |
| ttyd | `MainPID=53377`、`Result=success`、`NRestarts=0`，监听 `127.0.0.1:7681` |
| `apt-get -s upgrade` | `0 upgraded, 0 newly installed` |

## 一条方法论教训

会话中我曾声称 `esm-infra` 已启用，实际 `pro status` 显示它仍是 `disabled`。状态类结论必须每次以命令输出为准，不能凭上一轮自己的说法往下推。这类「自我延续的错误陈述」比读错一次文件更难发现，因为后续所有推理都建立在假前提上。

## See Also

- [ttyd xterm.js 渲染色块与渲染器选择](../terminal-multiplexers/ttyd-xterm-renderer-corruption.md)
- [ttyd 前端编译模型与 xterm 版本锁定](../terminal-multiplexers/ttyd-frontend-compilation.md)
