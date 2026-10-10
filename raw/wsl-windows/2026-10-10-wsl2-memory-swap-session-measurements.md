# WSL2 内存 / swap 本机实测与 swap 文件取证（2026-10-10 会话）

> Source: 本机实测（WSL2 on Windows 11，宿主用户 C:\Users\39764，WSL 用户 cpf）；会话 transcript
> Collected: 2026-10-10
> Published: Unknown

本文件记录会话中对宿主与 WSL 内存、pagefile、swap 文件、物理盘的实测读数，作为 wiki 结论的证据底。所有数字为会话期间工具输出的原值。

## 主机与 WSL 基线

- 主机总内存 31.7GB；OS Windows 11 10.0.26300；WSL 2.7.14；发行版 Ubuntu（默认，用户 cpf）+ docker-desktop。
- WSL 内（配置生效前）：MemTotal 约 11.7GB（对应 12GB 封顶），SwapTotal 3GB，`/proc/swaps` 显示 3145728 KiB 的 swap 分区（`/dev/sdc`）。

## RAMMap 运行前后的内存读数

- 用户报告：任务管理器"正在使用"从约 25GB（用户原话"25 or above 20"）降至 8.6/31.7GB。
- 随后实测（用户已运行 RAMMap 之后；**用户点的具体 Empty 命令未记录**）：
  - `vmmemWSL`：WS=1768MB，Private=12171MB（WS 大幅塌缩而 Private 不变）。
  - 系统 Committed：31.2GB → 34.8GB。
  - Commit Limit：36.7GB → 52.4GB。

证据边界：WS 与 Private 的背离只证明工作集被修剪（页不再计入进程工作集）、内存未被释放（Private/Commit 不降）；页面是否仍驻留物理内存（standby / modified list）及最终去向（pagefile）均未逐页测定，pagefile 当前用量不能证明去向；具体由哪个 RAMMap 操作触发也未记录。归因以计数器模式为准。

## pagefile 配置

- 位置 `D:\pagefile.sys`（非 C 盘）。
- `AutomaticManagedPagefile` = False；注册表 `PagingFiles` = `D:\pagefile.sys 0 0`（位置手动指向 D:，尺寸 `0 0` 交系统托管）。
- `AllocatedBaseSize` 21184MB；`CurrentUsage` 20273MB；`PeakUsage` 21183MB。

## 物理盘布局

- 全机单块物理盘：Samsung MZVL21T0HCLR（PM9A1），MediaType SSD / BusType NVMe。
- C: 与 D: 均为该盘分区，`Get-Partition` 的 DiskNumber 都是 0 —— C:/D: 的 I/O 落在同一块 NVMe。

## WSL swap 文件取证

会话中在 `C:\Users\39764\AppData\Local\Temp\<GUID>\swap.vhdx` 发现三个 swap 虚拟盘（每个 GUID 目录对应一个 WSL VM 世代）：

| GUID 目录 | 大小 | 最后写入 | 状态 |
| --- | --- | --- | --- |
| `0CB3ACE0-AE2E-4A77-9E52-EF110CDA7306` | 3076MB | 2026-10-10（会话当日） | 当前世代在用（`/dev/sdc`，独占锁被 VM 持有） |
| `9CA45F72-CB06-470E-A6E7-1C0A7D41299D` | 3108MB | 2026-10-08 | 旧世代残留，已删除 |
| `4F1BAD84-3A1C-4932-A885-FA44D4503090` | 1796MB | 2026-10-05 | 旧世代残留，已删除 |

- 删除判据：独占打开测试（`[System.IO.File]::Open(..., "None")`）对当前世代文件抛异常（被持有），对两个旧文件成功（时间点快照）。
- 删除后健康核验：两发行版仍 Running；当前世代 swap 仍被持有；删除窗口 ±40 分钟 Hyper-V Worker/Compute 管理日志无 Error/Warning；C: 可用空间 52.9GB → 57.5GB。
- 证据分级：旧文件删除时刻的句柄/挂载状态不可事后追溯；"旧文件属已结束世代"为强推断（多证据一致：停止写入 + 源码 swap 每次重建 + 当前实例只持有当日文件），仅凭时间戳不能证明世代已结束。删除前未跑 `handle.exe` 查句柄（流程教训）。

## WSLC swap 重建机制（源码）

`microsoft/WSL · src/windows/wslcsession/WSLCSession.cpp:656-671`：WSLC 会话路径下 swap 为每次运行临时创建的 VHD，路径 `storagePath / "swap.vhdx"`，创建前先 `DeleteFileW` 删上次残留，挂入后 `mkswap + swapon`。此为 WSLC（container session）路径代码；常规发行版 VM 的 swap 创建代码不在此处（闭源），"常规路径同样用 GUID 子目录"与本机观测吻合但未经源码验证。

## 本会话应用的 `.wslconfig` 改动（生效需 `wsl --shutdown`，会话结束时尚未重启）

```ini
[wsl2]
memory=16GB          # 原 12GB；16GB ≈ 主机 31.7GB 的 50%，即官方默认比例
vmIdleTimeout=3600000
swap=8GB             # 原默认 25% ≈ 4GB
swapFile=D:\\wsl-swap\\swap.vhdx

[general]
instanceIdleTimeout=-1
```

- 另创建目录 `D:\wsl-swap`。
- 生效后预期：`free -h` 的 Mem 约 16GB、Swap 8GB；D 盘出现 `D:\wsl-swap\swap.vhdx`。
