# Docker Desktop 退出与 WSL2 发行版存活（2026-10-10 会话取证）

> Source: 本机 Docker Desktop 日志与 WSL 实测（Windows 11，宿主用户 C:\Users\39764）
> Collected: 2026-10-10
> Published: Unknown

排查"退出 Docker Desktop 后 WSL 发行版消失"时的本机取证。

## 环境

- Docker Desktop 4.86.0，WSL2 引擎；数据盘 `D:\docker-img\DockerDesktopWSL`。
- settings-store：`C:\Users\39764\AppData\Roaming\Docker\settings-store.json`；无"退出时保留 WSL"类开关。
- `wsl -l -v`：Ubuntu（默认，用户 cpf）与 docker-desktop 均 Running；WSL 2.7.14；Windows 11 10.0.26300。

## 后端日志证据

- 日志文件：`C:\Users\39764\AppData\Local\Docker\log\host\com.docker.backend.exe.log.20261009-230606.753`。
- 退出序列显示：`shutdownSequence begin` → `terminating main distribution`（即 docker-desktop 发行版）。
- 全程未出现 `wsl --shutdown` / `wsl.exe --shutdown` 调用（grep `wsl\.exe` 与 `shutdown` 均未命中整机关机命令）。

结论（日志层可证）：Docker Desktop 的退出流程只终止自己的 docker-desktop 发行版，不执行整机 `wsl --shutdown`。

## 证据边界（advisor 复核后收敛）

- "用户发行版（Ubuntu）在 Docker 退出后持续存活"证据不足：退出后 `wsl.exe -d Ubuntu` 成功不能证明连续存活（该命令本身能把已停止发行版重新拉起），`wsl -l -v` 显示 Running 也只是时间点状态。
- "WSL 空闲超时（`instanceIdleTimeout` 默认 15000ms / `vmIdleTimeout` 默认 60000ms）是发行版消失的根因"为机制推断，未验证。
- 可验证路径：不打开任何 WSL 会话，启动 Docker Desktop 再退出，约 1 分钟后 `wsl -l -v` 看 Ubuntu 是否仍 Running。
