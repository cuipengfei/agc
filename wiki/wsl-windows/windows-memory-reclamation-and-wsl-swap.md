# Windows 内存回收工具与 WSL swap

> Sources: Microsoft Sysinternals RAMMap (Mark Russinovich), 2026-03-26; Microsoft `EmptyWorkingSet`（psapi）; Microsoft「Working Set Information」; Microsoft「Exercise 1 - Identify Processes with Large Working Sets」; Shadowblazer93/RamMAP-Shortcut README; Microsoft「Memory Compression in Windows 10 RTM」(Mehmet Iyigun / Seth Juarez); Mem Reduct (henrypp); Bitsum Process Lasso; 本机实测, 2026-10-10 与 2026-10-25
> Raw: [Windows 内存工具与压缩来源](../../raw/wsl-windows/2026-10-10-windows-memory-tools-and-compression.md); [WSL2 内存/swap 本机实测](../../raw/wsl-windows/2026-10-10-wsl2-memory-swap-session-measurements.md); [工作集与页列表来源](../../raw/wsl-windows/2026-10-25-windows-working-set-page-lists-sources.md); [标准账户清空工作集实测](../../raw/wsl-windows/2026-10-25-nonadmin-working-set-trim-measurement.md)
> Updated: 2026-10-25

## Overview

Windows 上的「内存清理」工具（本文有来源的是 Mem Reduct）做的是清理：清 standby、修剪工作集。压缩由操作系统内核的 Memory Compression 负责。清理工具不终止进程，但修剪工作集只是把页移出工作集、并不释放内存：任务管理器的「正在使用」骤降，提交内存（Commit）不降；页的第一站是 Standby 或 Modified 页列表（见「页离开工作集后的去向」）。本文给出工具能力边界、「正在使用腰斩」的判别方法，以及删除 WSL swap VHD 的核验纪律。

## 清理 ≠ 压缩

压缩由操作系统内核负责：Windows 自 Windows 10 RTM 起内置 Memory Compression（非实验特性）。按 Microsoft「Memory Compression in Windows 10 RTM」，系统把进程修剪出的页压缩后保留在 RAM 里、不一定写入磁盘，从而减少硬缺页。清理工具（如 Mem Reduct）调的是清理类 API（清 working set / standby / modified），与压缩是两条不同路径；装清理工具不会获得压缩能力。

## 工具能力边界

- **RAMMap**（Sysinternals 官方，Mark Russinovich）：物理内存分析工具，分标签页展示——`Processes` 各进程工作集大小、`Priority Summary` 各优先级 standby list 大小、`Physical Pages` 每个物理页的用途。用它看清 RAM 被谁占、工作集与 standby 分别多大。正因 RAMMap 把工作集、standby、物理页分开列示，"工作集下降"并不等于"页离开物理内存"（见下）。
- **RAMMap 的 Empty 菜单**（官方页没有记录该菜单；五项名称与开关取自社区 README）：Empty Working Sets（`-Ew`）、Empty System Working Sets（`-Es`）、Empty Modified Page List（`-Em`）、Empty Standby List（`-Et`）、Empty Priority 0 Standby List（`-E0`）。五项各自处理哪些工作集与页列表、在标准账户下能否执行，都没有一手来源，本次未逐项验证。
- **Mem Reduct**（开源，henrypp）：实时内存监控与清理工具，用 Native API 清理 system working set、working set、standby page list、modified page list，官方自述效果可变、约 10-50%；需管理员权限。
- **Process Lasso**（Bitsum）：官网定位是 CPU 实时优化与自动化（ProBalance、CPU 亲和性/优先级、watchdog）。本次查阅的官网主页未提及内存修剪，其内存清理能力未验证，这里不纳入清理能力比较。

RAMMap 用于诊断（看清内存去哪了），Mem Reduct 用于清理。两者都不"压缩"，也都不能凭空变出内存。

## "正在使用腰斩"的判别

修剪工作集会让任务管理器"正在使用"骤降，但那是页被移出工作集，不是内存被释放。判别模式：**工作集（WS）塌缩，而进程 Private 不变、系统 Commit 不降（甚至上升）**。

本机实测证据：运行 RAMMap 后 `vmmemWSL` 的 WS 从约 12GB 塌到 1768MB，而 Private 仍是 12171MB（约 10GB 的已提交私有内存不再计入 vmmemWSL 的工作集，但未被释放）；同期系统 Commit 不降反升到 34.8GB、Commit Limit 自动涨到 52.4GB、`D:\pagefile.sys` 的 CurrentUsage 为 20273MB（Allocated 21184MB）。内存的账没少——vmmemWSL Private 不变、系统 Commit 不降反升，变化的只是这些页不再计入工作集。

证据边界：以上计数器只证明工作集被修剪、内存未被释放。页面的去向在 2026-10-25 另行测定，见下一节。

实用含义：Empty Standby List 只清缓存，「正在使用」不动（动的是「已缓存」），偶尔点无害；修剪工作集把页移出工作集，产出的页进入 Standby 或 Modified，重新访问时多为软缺页，只有当页已被写回磁盘才产生磁盘读取。不要在 WSL/Docker 干活时点。WSL 内部内存的正路是 `.wslconfig` 的 `autoMemoryReclaim` 与封顶，在宿主机上直接清理只是把开销推迟。

## 页离开工作集后的去向

页在离开工作集的那一刻按修改位分流：被改写过的页进入 Modified 页列表，未被改写过的页进入 Standby 页列表。微软的账目口径把这两类分算两侧：`Memory In Use = Process working sets + non-paged memory + modified pages`、`Available memory = Standby memory + free memory`。Modified 上的页仍计入「使用中」，Standby 上的页计入「可用」，可被任何程序直接取用。

Modified 上的页需要先写回来源文件或 pagefile 才能复用，写回时机由内存管理器按压力决定，写完转入 Standby。备用页本身按使用情况分层，回收从最低层开始，分层由系统决定，用户既不能指定页进入哪一层，也不能清空某一层。

2026-10-25 的本机实测（标准账户，清空 146 个本人进程的工作集，单位 MB）：

| 时间点 | 使用中 | 可用 | Modified | Standby 三级合计 | 本人进程工作集合计 |
|---|---|---|---|---|---|
| 清理前 | 12,408 | 20,084 | 77 | 5,970 | 3,726 |
| 清理后 3 秒 | 11,046 | 21,446 | 838 | 7,208 | 556 |
| 清理后 63 秒 | 13,065 | 19,427 | 358 | 6,478 | 2,296 |

3 秒时间点使用中下降 1,362 MB、Modified 增加 761 MB、Standby 增加 1,238 MB、本人进程工作集从 3,726 MB 降到 556 MB；63 秒后工作集回到 2,296 MB，使用中比清理前高 657 MB。整机计数器无法分离到单个进程；本人进程工作集减少 3,170 MB，而两张页列表的增量合计对不上，差额不作归属。

## pagefile 与 WSL swap：两层换页

Windows 的 pagefile 与 WSL 虚拟机内部的 Linux swap 是两套独立换页，各写各的文件。内存压力下两层可能同时触发，I/O 叠加。关键是：若 pagefile 与 WSL swap 落在同一块物理盘，叠加的 I/O 会集中打满这块盘。本机即单块 Samsung PM9A1 NVMe，C: 与 D: 都是它的分区（DiskNumber 同为 0），所以把 swap 放 C:、pagefile 放 D: 并无延迟差异——盘符不同，物理盘相同。

## 删除 WSL swap VHD 的核验纪律

WSL swap 的内容是易失的内存换出副本。删除旧世代残留一般安全，但要守证据纪律（swap VHD 的重建行为：WSLC/container-session 路径由源码证实每次运行重建；常规发行版路径本机观测到按世代重建的相似布局，但未经源码验证）：

- 删除前先用 Sysinternals `handle.exe` 查句柄，确认无活动引用。
- Windows 删除成功 **不能** 反推无占用：`FILE_SHARE_DELETE` 语义下，被句柄持有的文件同样可被删除。
- 文件时间戳只证明创建/写入时间，不能证明对应的 WSL 虚拟机世代已结束。
- 删除后以可观测现状核验（发行版仍 Running、当前世代 swap 仍被持有、Hyper-V 事件日志无 Error/Warning、目标盘可用空间按预期上升）；删除时刻的句柄状态一旦文件不在命名空间即不可事后追溯。

## See Also

- [标准用户降低 Windows 物理内存占用的可达范围](nonadmin-physical-memory-reduction.md)
- [WSL2 内存与 swap 配置](wsl2-memory-and-swap-config.md)
