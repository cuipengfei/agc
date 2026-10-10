# Microsoft WSL `.wslconfig` 配置参考（内存 / swap / idle 超时）

> Source: https://learn.microsoft.com/en-us/windows/wsl/wsl-config
> Collected: 2026-10-10
> Published: Unknown

本文件摘录官方 `wsl-config` 页中与内存、swap、空闲超时直接相关的键。行号为 2026-10-10 采集时该页正文的行号。

## 文件位置与分段

- `.wslconfig` 位于 `%UserProfile%\.wslconfig`（典型 `C:\Users\<UserName>\.wslconfig`），作用于全部 WSL 2 发行版（line 54、line 247）。
- 默认不存在，需手动创建；缺失或格式损坏时 WSL 照常启动但不应用配置（line 244、line 249）。
- 仅对 WSL 2 发行版生效，WSL 1 不受影响（line 246）。
- 分段标签：`[wsl2]`（VM 设置）、`[general]`（General WSL settings，section label 原文 `[general]`）、`[experimental]`（Experimental settings，line 324）。

## `[wsl2]` 段关键键（默认值原文）

| Key | Default | Notes |
| --- | --- | --- |
| `memory` | 50% of total memory on Windows | 分配给 WSL 2 VM 的内存（line 275） |
| `processors` | The same number of logical processors on Windows | 分配的逻辑处理器数（line 276） |
| `swap` | 25% of memory size on Windows rounded up to the nearest GB | swap 空间大小，`0` 表示无 swap（line 280） |
| `swapFile` | `%Temp%\swap.vhdx` | swap 虚拟硬盘的绝对 Windows 路径（line 281） |
| `vmIdleTimeout` | `60000` | VM 空闲多少毫秒后关闭（line 286） |

## `[general]` 段关键键

> `### General WSL settings` → `.wslconfig section label: [general]`

| Key | Default | Notes |
| --- | --- | --- |
| `instanceIdleTimeout` | `15000` | 一个发行版空闲多少毫秒后关闭；设为 `-1` 禁用自动关闭（line 321 原文 "Set to -1 to disable auto shutdown"） |
| `distributionInstallPath` | `%LocalAppData%\wsl` | 新装发行版的默认目录（line 322） |

## `[experimental]` 段关键键

| Key | Default | Notes |
| --- | --- | --- |
| `autoMemoryReclaim` | `dropCache` | 可选 `disabled` / `gradual` / `dropCache`；`dropCache` 立即回收缓存内存（line 332） |

## 路径与单位规则

- path 类值必须用 Windows 路径且转义反斜杠，例：`C:\\Temp\\myCustomKernel`（line 307）。
- size 类值默认单位为字节，可省略单位；用其他单位需追加，例：`8GB` 或 `512MB`（line 309）。

## 官方示例片段

```ini
# Sets amount of swap storage space to 8GB, default is 25% of available RAM
swap=8GB

# Sets swapfile path location, default is %UserProfile%\AppData\Local\Temp\swap.vhdx
swapfile=C:\\temp\\wsl-swap.vhdx
```

（line 367-371；示例注释印证 swapFile 默认位置为 `%UserProfile%\AppData\Local\Temp\swap.vhdx`，与键表 `%Temp%\swap.vhdx` 同一位置。)
