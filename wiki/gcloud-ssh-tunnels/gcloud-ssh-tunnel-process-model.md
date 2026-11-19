# gcloud SSH 隧道的进程形态

> Sources: Google Cloud SDK 594.0.0 本机源码与本机命令输出, 2026-11-20
> Raw: [gcloud SSH 隧道机制：本机源码摘录与命令输出](../../raw/gcloud-ssh-tunnels/2026-11-20-gcloud-ssh-tunnel-mechanism.md)
> Updated: 2026-11-20

## Overview

gcloud CLI 建的 SSH 隧道没有持久实体，形态就是本机进程持有的监听端口和一条对外连接。gcloud 本体是 Python 程序，但它通常只负责拼出 ssh 命令并等待子进程；实际转发流量的是系统 ssh 客户端。不同命令模式下，隧道的承重进程不同：直连只需 ssh；`compute ssh --tunnel-through-iap` 多一个 gcloud 子进程，通过管道与 ssh 通信；`workstations ssh` 则由 gcloud 主进程内的线程持有本地端口和 WebSocket。

## 隧道的物理形态

三种模式共有的一类东西是：ssh 进程用 `-L` 在本机开出的监听端口，它归 ssh 进程所有；再加上一条把字节送向目标的出站连接。进程终止，端口与连接随之消失，没有任何云端存储形态。

gcloud 从 PATH 解析 ssh 可执行名（`ssh.py:138`），默认私钥为 `~/.ssh/google_compute_engine`（`ssh.py:260`）。本机解析结果是 `/usr/bin/ssh`；`/bin` 与 `/usr/bin` 是同一目录，`ssh -V` 报 OpenSSH_10.2p1。gcloud 的 `compute ssh` 入口把参数交给 helper（`compute/ssh.py:317`、`compute/ssh.py:318`），helper 构造 ssh 命令后作为子进程运行（`ssh_utils.py:1187`、`ssh_utils.py:1198`）。

## 三种模式的必需进程

| 模式 | 必需进程 | 其余 gcloud 进程 |
|---|---|---|
| `gcloud compute ssh` 直连 | ssh 进程 | 主进程只在等待 ssh 结束，终止它不影响隧道 |
| `gcloud compute ssh --tunnel-through-iap` | ssh 进程 + `gcloud compute start-iap-tunnel ... --listen-on-stdin` 子进程 | 主进程只在等待，终止它不影响隧道 |
| `gcloud workstations ssh` | ssh 进程 + gcloud 主进程 | 主进程持有本地监听与 WebSocket，必须保持运行 |

链路差异：

- 直连：ssh 的本地转发端口 → 到实例的加密 TCP。
- IAP 模式：ssh 的本地转发端口 → ssh 与 `start-iap-tunnel` 子进程之间的 stdin/stdout 管道（`ssh.py:1875`、`ssh.py:1881`、`iap_tunnel.py:987`、`iap_tunnel.py:1002`）→ 子进程的 WebSocket → IAP 中转。这个模式没有 gcloud 自己开的隧道监听端口；独立运行 `gcloud compute start-iap-tunnel --local-host-port` 时才由 `IapTunnelProxyServerHelper` 监听本地端口（`iap_tunnel.py:846`、`iap_tunnel.py:847`）。
- workstations 模式：ssh 的本地转发端口 → gcloud 主进程内线程绑定的本地端口（`workstations/ssh.py:82`、`workstations.py:303`、`workstations.py:307`、`workstations.py:321`）→ 同进程的 WebSocket（`workstations.py:440`）→ workstation 服务。

## IAP 与 Cloud Workstations 是两套独立机制

| 维度 | compute ssh 走 IAP | workstations ssh |
|---|---|---|
| 中转服务 | Google Cloud IAP | Cloud Workstations 服务自带的 TCP 转发端点 |
| WebSocket 端点 | `wss://tunnel.cloudproxy.app/v4/...`（`iap_tunnel_websocket_utils.py:36`、`iap_tunnel_websocket_utils.py:38`） | `wss://<workstation 域名>/_workstation/tcp/<端口>`（`workstations.py:440`） |
| 鉴权 | gcloud 登录凭据 | `GenerateAccessToken` 返回的令牌放在 Bearer 头（`workstations.py:397`、`workstations.py:401`、`workstations.py:441`） |
| 本地监听持有者 | 无（走 stdin/stdout 管道） | gcloud 主进程的线程 |

`api_lib/workstations/` 模块没有 IAP 引用，两者只有表面相似：都用 WebSocket 把字节送进目标的 SSH 服务。

## 在本机辨认进程

```bash
ps -ef | grep '[s]sh'               # ssh 进程
ps -ef | grep '[s]tart-iap-tunnel'  # IAP 模式下的 gcloud 子进程
ss -tlnp                            # 监听端口的持有者：ssh 还是 gcloud 主进程
```

终止隧道：终止 ssh 进程即可；workstations 模式还需终止 gcloud 主进程。

## 证据边界

`ps` 输出里 ssh 的 `-o` 选项串随 gcloud 版本变化。
