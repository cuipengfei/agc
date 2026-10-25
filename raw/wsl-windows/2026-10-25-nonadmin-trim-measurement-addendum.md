# 标准账户清空工作集实测的追加说明

> Source: 本机会话实测（Windows 宿主，PowerShell 5.1，非提升会话）。本文件补正 `2026-10-25-nonadmin-working-set-trim-measurement.md` 的解读边界，原始读数见该文件。
> Collected: 2026-10-25
> Published: Unknown

## 可用内存的解读

原始读数中 `avail` 在 3 秒时从 20,084 升到 21,446 MB（+1,362），63 秒时为 19,427 MB（比基线低 657 MB）。

按微软对 `ullAvailPhys` 的定义（standby、free、zero 三张列表之和，这些页无需先写盘即可复用），干净页进入 Standby 后立即计入可用。因此这次测量里可用内存确实出现净增 1,362 MB，这一点不能记作「只是数字变化、内存没有释放」。

63 秒时可用低于基线 657 MB，同期其他程序也在活动，这一段变化不能全部归到清理动作。

## 提交占用未采集

脚本只读取 `Win32_PerfRawData_PerfOS_Memory` 的 `AvailableBytes`、`FreeAndZeroPageListBytes`、`ModifiedPageListBytes` 与三个 standby 计数，没有读取 `CommittedBytes`。清空工作集对提交占用的影响本次未测。

## 所有者条件的归属

`EmptyWorkingSet` 文档只规定句柄需要 `PROCESS_QUERY_INFORMATION`（或 `PROCESS_QUERY_LIMITED_INFORMATION`）与 `PROCESS_SET_QUOTA`，没有要求调用者是进程所有者或管理员。可打开哪些进程由访问控制决定。

本次脚本在拿到句柄后比对令牌所有者 SID 与当前用户 SID，只处理自有进程。这一步是脚本自己的筛选，用来让结果对应「我的进程」；API 本身不带该条件。

## 定期清理收益的判断

本次测量只覆盖一个时间窗口，不能推出「定期清理必然无益」。可以确定的是：可用内存的上升来自 Standby 立即计入可用；代价是这些页下次被访问时要重新进入工作集。收益取决于被清空的页面是否长期闲置，本次未针对该条件做对照实验。
