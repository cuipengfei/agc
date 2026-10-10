# Docker Desktop 退出与 WSL2 发行版存活

> Sources: 本机 Docker 后端日志, 2026-10-10; Microsoft WSL docs, 2026-10-10
> Raw: [Docker Desktop 退出行为取证](../../raw/wsl-windows/2026-10-10-docker-desktop-quit-wsl-behavior.md); [Microsoft wsl-config 参考](../../raw/wsl-windows/2026-10-10-microsoft-wsl-config-reference.md)
> Updated: 2026-10-10

## Overview

用 WSL2 引擎的 Docker Desktop 退出后，用户常感觉自己的 WSL 发行版也一起消失了。后端日志证实：Docker 退出只终止它自己的 docker-desktop 发行版，不执行整机 `wsl --shutdown`。发行版消失更可能来自 WSL 的空闲超时，而非 Docker 直接关掉它——这一步是推断，给出验证方法。

## 日志可证的部分

Docker Desktop（本机 4.86.0，WSL2 引擎）退出时，后端日志 `com.docker.backend.exe.log` 的退出序列为 `shutdownSequence begin` → `terminating main distribution`（docker-desktop 发行版），全程没有 `wsl --shutdown`。Docker 也没有"退出时保留 WSL"类开关。所以 Docker 的退出动作本身只针对自己的发行版。

## 推断的部分：空闲超时才是元凶

Docker 的 WSL 集成平时在后台启动用户发行版并运行代理进程；退出时清理这些代理后，若没有活跃的 WSL 会话，用户发行版落入空闲，按 WSL 默认空闲超时被关闭：

- `[general] instanceIdleTimeout`：发行版空闲默认 15000ms 后关闭。
- `[wsl2] vmIdleTimeout`：VM 空闲默认 60000ms 后关闭。

于是现象上就成了"退出 Docker → 十几秒后发行版没了 → 一分钟内虚拟机关闭"。

证据边界（未验证）："空闲超时是发行版消失的根因"是机制推断。退出后 `wsl -l -v` 显示 Running 只是时间点状态；`wsl -d <distro>` 执行成功也不能证明连续存活，因为该命令本身能把已停止的发行版重新拉起。

## 防止发行版被自动关闭

在 `.wslconfig` 关掉发行版自动关闭、放宽 VM 空闲超时（改动需 `wsl --shutdown` 生效）：

```ini
[wsl2]
vmIdleTimeout=3600000

[general]
instanceIdleTimeout=-1
```

`instanceIdleTimeout=-1` 是官方文档明示的"禁用自动关闭"值。配置键的完整语义见 See Also。

## 验证方法

不打开任何 WSL 会话，启动 Docker Desktop 再退出，约 1 分钟后在 PowerShell 执行 `wsl -l -v`：若用户发行版仍 Running，空闲超时路径坐实；若照样消失，说明存在另一条终止路径，需顺着时序与新日志继续查。

## See Also

- [WSL2 内存与 swap 配置](wsl2-memory-and-swap-config.md)
