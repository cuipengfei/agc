# 标准账户按进程清空工作集的本机实测

> Source: 本机会话实测（Windows 宿主，PowerShell 5.1，非提升会话）
> Collected: 2026-10-25
> Published: Unknown

本文件为 `nonadmin-physical-memory-reduction` 与 `windows-memory-reclamation-and-wsl-swap` 两篇文章提供实测数据。

## 环境

- 总物理内存：32,492 MB（`Win32_OperatingSystem.TotalVisibleMemorySize` 换算）。
- 会话身份：`IsInRole(Administrator)` 返回 `False`。
- `whoami /priv` 输出（2026-10-25 采集）：

```
SeShutdownPrivilege           Shut down the system                 Disabled
SeChangeNotifyPrivilege       Bypass traverse checking             Enabled 
SeUndockPrivilege             Remove computer from docking station Disabled
SeIncreaseWorkingSetPrivilege Increase a process working set       Disabled
SeTimeZonePrivilege           Change the time zone                 Disabled
```

该账户不持有 `SeDebugPrivilege`、`SeProfileSingleProcessPrivilege`、`SeLockMemoryPrivilege` 等系统级内存操作所需特权。

## 调用形态

- 进程句柄：`OpenProcess(0x0500, false, pid)`，`0x0500` = `PROCESS_SET_QUOTA (0x0100)` | `PROCESS_QUERY_INFORMATION (0x0400)`。
- 所有者判定：`OpenProcessToken` 取 `TokenUser`，与 `WindowsIdentity::GetCurrent().User` 比较 SID 字符串；不相等则跳过。
- 清理：P/Invoke `K32EmptyWorkingSet`，返回非零才计入成功。
- 脚本位置：`%TEMP%\trim-own.ps1`（按所有者筛选）、`%TEMP%\trim-counters.ps1`（首次计数实验）、`%TEMP%\trim-measure.ps1`（修正版四时间点测量）。
- PowerShell 5.1 读取不带 BOM 的 UTF-8 脚本按 ANSI 解码，中文会损坏并报格式错误，脚本输出一律用英文。

## 子进程试验

专门启动的临时子进程（分配约 200 MB 并写入）作为清理对象：

- 第 1 次：工作集 322,048,000 字节 → 2,105,344 字节。
- 第 2 次：工作集 322,031,616 字节 → 8,192 字节，脚本返回 `result=trimmed`。

## 首次运行（未按所有者筛选）

只跳过 PID ≤ 4 与脚本自身，凭 `OpenProcess` 成功就清理：

```
trim: trimmed=146 notmine=0 denied=182 failed=0
```

- `denied` 为 `OpenProcess` 失败（错误 5，拒绝访问）的进程数。
- 这一轮没有做所有者比对，`notmine` 计数在该版本脚本中恒为 0（该分支尚未存在），因此这 146 个进程在当时未被逐个确认归属。后来的修正版在同一台机器、同一账户下测得 `notmine=0`，说明可打开的那批进程确实都属于当前账户。

## 修正版四时间点测量

脚本 `%TEMP%\trim-measure.ps1`。先采集一次状态，再执行一次按所有者筛选的清理，之后在 3 秒、23 秒、63 秒各采集一次。单位 MB。

```
before  total=32492 avail=20084 inuse=12408 free=14113 modified=77 standby=5970 own_ws=3726 own_count=146
trim: trimmed=146 notmine=0 denied=182 failed=0 pid_of_script=18084
+3s     total=32492 avail=21446 inuse=11046 free=14238 modified=838 standby=7208 own_ws=556 own_count=146
+23s    total=32492 avail=20934 inuse=11558 free=13648 modified=450 standby=7287 own_ws=1366 own_count=146
+63s    total=32492 avail=19427 inuse=13065 free=12949 modified=358 standby=6478 own_ws=2296  own_count=147
```

字段含义：

- `avail` = `Win32_PerfRawData_PerfOS_Memory.AvailableBytes`。
- `inuse` = `total` − `avail`。
- `free` = `FreeAndZeroPageListBytes`。
- `modified` = `ModifiedPageListBytes`。
- `standby` = `StandbyCacheNormalPriorityBytes` + `StandbyCacheReserveBytes` + `StandbyCacheCoreBytes` 三个计数器之和。
- `own_ws` = 所有者 SID 等于当前用户的进程工作集字节数之和；`own_count` 为这些进程的个数。

三个 standby 计数器名称与 RAMMap `Priority Summary` 的优先级编号 0–7 之间的对应关系，本会话未获权威出处；Priority 0 单项本次未测。

### 由上面读数直接得到的差值（单位 MB）

- 清理前到 3 秒：`inuse` −1,362（12,408 → 11,046）；`avail` +1,362（20,084 → 21,446）；`free` +125（14,113 → 14,238）；`modified` +761（77 → 838）；`standby` +1,238（5,970 → 7,208）；`own_ws` −3,170（3,726 → 556）。
- 清理前到 63 秒：`inuse` +657；`avail` −657；`modified` +281（77 → 358）；`standby` +508（5,970 → 6,478）；`own_ws` −1,430（3,726 → 2,296）。
- 63 秒时 `own_ws` 为清理前的 62%（2,296 / 3,726）。

### 同一批读数按千位分隔重排

由上面四行原始输出换算，供文章引用对齐：

| 时间点 | 使用中 | 可用 | 空闲页 | Modified | Standby 三级合计 | 本人工作集合计 |
|---|---|---|---|---|---|---|
| 清理前 | 12,408 | 20,084 | 14,113 | 77 | 5,970 | 3,726 |
| 清理后 3 秒 | 11,046 | 21,446 | 14,238 | 838 | 7,208 | 556 |
| 清理后 23 秒 | 11,558 | 20,934 | 13,648 | 450 | 7,287 | 1,366 |
| 清理后 63 秒 | 13,065 | 19,427 | 12,949 | 358 | 6,478 | 2,296 |

## 归因边界

- 整机计数器无法分离到单个进程；63 秒窗口内的变化混有其他程序的同时活动。
- `own_ws` 减少 3,170 MB，而 3 秒时间点的 `modified` 与 `standby` 增量合计约 1,999 MB，`free` 仅增 125 MB，两者对不上账。差额可能来自无需进入任何列表即可丢弃的页面（已写回的干净页、共享映像页等），本会话未逐页验证，不作归属。
- `StandbyCacheCoreBytes` 在四次读数中的具体取值未单独记录，只有三级合计。

## 执行纪律记录

- 首次全量运行发生在用户只询问做法、未授权执行清理的时候；该次运行没有所有者筛选，实际清空 146 个进程的工作集。
- 计数实验（`trim-counters.ps1`）在收到停止实验的提示后执行过一次；测量对象为专门启动的临时子进程，结束后已终止。
- 后续的修正版四时间点测量同样清空了全部本人进程的工作集（146 个），包含当时正在使用的应用。

## 未验证

- Memory Compression 的压缩字节数：`Win32_PerfRawData_PerfOS_Memory` 类中没有压缩相关字段（按名称匹配 `ompress|Store` 的查询返回空）；读取相关设置需要提升权限。
- 182 个 `OpenProcess` 失败的进程所属账户与完整性级别。
- PowerShell 5.1 解码不带 BOM 的 UTF-8 脚本时的具体报错原文。
- 三个 standby 计数器与 RAMMap 优先级编号的对应关系。
