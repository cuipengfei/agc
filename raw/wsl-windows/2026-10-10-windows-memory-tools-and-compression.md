# Windows 内存工具与 Memory Compression 来源

> Source: Microsoft Sysinternals RAMMap 页；Microsoft Learn「Memory Compression in Windows 10 RTM」；Mem Reduct（henrypp）GitHub README；Bitsum Process Lasso 官网
> Collected: 2026-10-10
> Published: Unknown

本文件为 `windows-memory-reclamation-and-wsl-swap` 文章中「清理≠压缩」与工具能力边界的来源材料。

## Memory Compression（Microsoft Learn「Memory Compression in Windows 10 RTM」，Mehmet Iyigun / Seth Juarez）

URL: https://learn.microsoft.com/en-us/shows/seth-juarez/memory-compression-in-windows-10-rtm

- 原文："the OS is doing some clever optimizations that allow your processes to trim some of the memory but not necessarily page it out to disk. Not only is the memory preserved in RAM, but it is also compressed - making hard page faults a more rare occurrence."
- 原文："this feature is not an experimental feature: it has been available since the RTM bits of Windows 10 were released."
- 要点：压缩是操作系统内核行为；被修剪的页不一定写入磁盘，而是压缩后保留在 RAM；减少硬缺页；自 Windows 10 RTM 起内置、非实验特性。

## RAMMap（Microsoft Sysinternals，Mark Russinovich，Published 2026-03-26）

URL: https://learn.microsoft.com/en-us/sysinternals/downloads/rammap

- 定位：advanced physical memory usage analysis utility for Windows Vista and higher。
- 标签页：Use Counts（按类型与分页列表汇总）、Processes（process working set sizes）、Priority Summary（prioritized standby list sizes）、Physical Pages（per-page use for all physical memory）、Physical Ranges、File Summary、File Details。
- 下载约 719 KB；Client Windows Vista+、Server 2008+。
- 注：官方概览页只描述分析能力，未记录 Empty（清理）菜单。

## Mem Reduct（henrypp/memreduct GitHub README）

URL: https://github.com/henrypp/memreduct

- 原文："Lightweight real-time memory management application to monitor and clean system memory."
- 原文："used undocumented internal system features (Native API) to clear system cache (system working set, working set, standby page lists, modified page lists) with variable result ~10-50%."
- 需管理员权限；Windows 7 SP1 及以上（64-bit/ARM64）；开源（GitHub 公开仓库，含 LICENSE）。

## Process Lasso（Bitsum 官网）

URL: https://bitsum.com/

- 官网定位：Real-Time CPU Optimization and Automation。核心功能 ProBalance、CPU 亲和性/CPU Sets、优先级、Efficiency Mode、watchdog 规则、电源计划自动化、实例均衡等，均围绕 CPU 与进程治理。
- 官网主页未出现内存清理 / 工作集修剪 / SmartTrim 功能；本次仅查阅官网主页，其内存清理能力未验证（主页未提及不等于功能不存在）。
- 版本 v18.4.0（2026-10-01）；兼容 Windows 7–11、Server 2012–2025。

## 未取得来源

- EmptyStandbyList（wj32.org）：本次抓取失败（HTTP 500），未获权威来源，故文章不保留其能力断言。
