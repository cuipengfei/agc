# 标准用户降低 Windows 物理内存占用的可达范围

> Sources: Microsoft `EmptyWorkingSet`（psapi）; Microsoft「Working Set Information」; Microsoft「Exercise 1 - Identify Processes with Large Working Sets」; Microsoft Sysinternals RAMMap (Mark Russinovich), 2026-03-26; Shadowblazer93/RamMAP-Shortcut README; 本机实测, 2026-10-25
> Raw: [工作集与页列表来源](../../raw/wsl-windows/2026-10-25-windows-working-set-page-lists-sources.md); [标准账户清空工作集实测](../../raw/wsl-windows/2026-10-25-nonadmin-working-set-trim-measurement.md)
> Updated: 2026-10-25

## Overview

标准账户能动的只有自己拥有的进程，可用的动作是按进程清空工作集。整机的 Modified、Standby 与 Priority 0 Standby 三张页列表，以及系统工作集，由内存管理器调度；RAMMap 的 Empty 菜单提供了对应入口，其作用范围与权限要求本次未核实。按进程清理确实让「使用中」下降，本机实测降幅 1,362 MB，63 秒后回升并超过清理前水平。

## 可达范围

| 动作 | 作用对象 | 标准账户 |
|---|---|---|
| 清空单个进程的工作集 | 目标进程 | 可，对该进程申请两项权限 |
| RAMMap Empty Working Sets | 未核实 | 本次未验证；按进程逐个清空可达到相近效果 |
| RAMMap Empty System Working Sets | 未核实 | 本次未验证 |
| RAMMap Empty Modified Page List | 未核实 | 本次未验证 |
| RAMMap Empty Standby List | 未核实 | 本次未验证 |
| RAMMap Empty Priority 0 Standby List | 未核实 | 本次未验证 |

第一行的两项权限来自 `EmptyWorkingSet` 的参数段，本机实测跑通了这条路径。RAMMap 五项菜单各自处理哪些工作集与页列表、在标准账户下能否执行，都没有一手来源，本会话也没有逐项运行；五项名称与开关取自社区 README。

## 调用条件

`EmptyWorkingSet` 对目标进程句柄的要求是 `PROCESS_QUERY_INFORMATION` 或 `PROCESS_QUERY_LIMITED_INFORMATION`，加上 `PROCESS_SET_QUOTA`。进程创建者对自有进程持有这两项权限，因此标准账户无需提升即可清理自己的进程。

能打开句柄不等于进程属于自己：访问控制表也可能放行其他账户组的成员。按令牌所有者的 SID 比对当前用户 SID，确认后再调用。

覆盖「全部本人进程」的办法就是遍历进程列表逐个尝试，打不开的跳过。本机非提升会话的计数：146 个本人进程清理成功，182 个进程打不开被跳过，没有出现「能打开但属于他人」的进程。

## 实测效果

本机标准账户，总内存 32,492 MB，单位 MB。

| 时间点 | 使用中 | 可用 | Modified | Standby 三级合计 | 本人进程工作集合计 |
|---|---|---|---|---|---|
| 清理前 | 12,408 | 20,084 | 77 | 5,970 | 3,726 |
| 清理后 3 秒 | 11,046 | 21,446 | 838 | 7,208 | 556 |
| 清理后 23 秒 | 11,558 | 20,934 | 450 | 7,287 | 1,366 |
| 清理后 63 秒 | 13,065 | 19,427 | 358 | 6,478 | 2,296 |

3 秒时间点使用中下降 1,362 MB，可用同额上升；Modified 增加 761 MB，Standby 增加 1,238 MB，本人进程工作集从 3,726 MB 降到 556 MB。63 秒时工作集回到 2,296 MB，为清理前的 62%；使用中比清理前高 657 MB。

工作集减少 3,170 MB，两张页列表的增量合计约 1,999 MB，空闲页仅增 125 MB，三者的账对不上。整机计数器无法分离到单个进程，差额不作归属。

## 页的去向

被改写过的页进入 Modified 页列表，需要先写回来源文件或 pagefile 才能复用，写回前仍计入「使用中」。未被改写过的页进入 Standby 页列表，计入「可用」，任何程序申请内存时可直接取用。备用页按使用情况分层，回收从最低层开始，分层由系统决定，标准账户既不参与分层，也不能清空某一层。

## 适用场景

- 确认不再活动的后台进程让出内存，内存较小的机器尤其明显。
- 测量某个程序的冷启动常驻占用，或对比不同实现的内存开销。
- 给即将启动的大型程序腾出位置，同时那批后台程序短期内不会工作。
- 排查内存相关问题的诊断步骤。

定期清理没有收益：Standby 页本就计入可用，Modified 页仍计使用中，指标下降换来的是下次访问时的重新读取。

## See Also

- [Windows 内存回收工具与 WSL swap](windows-memory-reclamation-and-wsl-swap.md)
