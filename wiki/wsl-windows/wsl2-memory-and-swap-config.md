# WSL2 内存与 swap 配置（`.wslconfig`）

> Sources: Microsoft WSL docs, 2026-10-10; 本机实测, 2026-10-10
> Raw: [Microsoft wsl-config 参考](../../raw/wsl-windows/2026-10-10-microsoft-wsl-config-reference.md); [WSL2 内存/swap 本机实测](../../raw/wsl-windows/2026-10-10-wsl2-memory-swap-session-measurements.md)
> Updated: 2026-10-10

## Overview

WSL 2 的内存、CPU、swap、空闲超时都由单个全局文件 `%UserProfile%\.wslconfig` 控制，作用于全部 WSL 2 发行版。文件默认不存在，需手动创建；任何改动都要 `wsl --shutdown` 关闭整个 WSL 虚拟机后重启才生效。本文覆盖内存封顶、swap 扩容与迁移盘、空闲回收三类常用调整。

## 文件位置与分段

`.wslconfig` 放在 `%UserProfile%`（典型 `C:\Users\<用户名>\.wslconfig`）。三个分段标签：

- `[wsl2]`：虚拟机设置（内存、CPU、swap、`vmIdleTimeout` 等）。
- `[general]`：General WSL settings（`instanceIdleTimeout`、`distributionInstallPath`）。
- `[experimental]`：实验性设置（`autoMemoryReclaim` 等）。

两条格式规则：path 类值用 Windows 路径并转义反斜杠（`D:\\dir\\file.vhdx`）；size 类值默认字节，用其他单位要追加（`8GB`、`512MB`）。

## 内存封顶

`[wsl2] memory` 默认是主机总内存的 50%。WSL 2 的内存按需动态分配，这个值是上限而非预占。封顶取值的通用原则：留给 Windows 足够保底，避免 WSL 峰值时把宿主挤到全局换页。例：主机 31.7GB 时设 `memory=16GB`（约等于默认的 50%）既给 WSL 充足空间，又给 Windows 侧留出余量。

## swap 扩容与迁移到其他盘

`[wsl2] swap` 默认是内存的 25%（向上取整到 GB），`0` 表示禁用。`swapFile` 默认落在 `%UserProfile%\AppData\Local\Temp\swap.vhdx`（C 盘 Temp 下）。扩容并迁移到 D 盘：

```ini
[wsl2]
swap=8GB
swapFile=D:\\wsl-swap\\swap.vhdx
```

先在目标盘建好父目录（`D:\wsl-swap`），改配置，`wsl --shutdown` 重启。swap 大小的权衡：设成内存封顶的一半左右，超限时靠换页多撑一段而非立刻 OOM，又不至于引入过多换页抖动。swap 的磁盘 I/O 与它所在盘绑定，放在空间富余、低延迟的盘。

## 空闲回收与自动关闭

- `[experimental] autoMemoryReclaim` 默认 `dropCache`：发行版空闲时立即把页缓存还给 Windows，因此 WSL 峰值用过的内存会在空闲后自行回落，不需要外部工具硬清。可选 `gradual`（缓慢回收）或 `disabled`。
- `[general] instanceIdleTimeout`（发行版空闲关闭，默认 15000ms）与 `[wsl2] vmIdleTimeout`（VM 空闲关闭，默认 60000ms）控制自动关机节奏；`instanceIdleTimeout` 设 `-1` 禁用发行版自动关闭。空闲超时与发行版"莫名消失"的关系见下方 See Also。

## 验证

重启后：`free -h` 的 Mem 反映新封顶、Swap 反映新大小；迁移 swap 后目标盘出现对应 `swap.vhdx`。想立刻整体释放 WSL 占用的宿主内存，直接 `wsl --shutdown`。

## See Also

- [Docker Desktop 退出与 WSL2 发行版存活](docker-desktop-quit-and-wsl2-lifecycle.md)
- [Windows 内存回收工具与 WSL swap](windows-memory-reclamation-and-wsl-swap.md)
