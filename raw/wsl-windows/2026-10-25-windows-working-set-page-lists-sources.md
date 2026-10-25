# Windows 工作集、页列表与 RAMMap Empty 菜单来源

> Source: Microsoft Learn `EmptyWorkingSet` 函数页；Microsoft Learn「Working Set Information」；Microsoft Learn「Exercise 1 - Identify Processes with Large Working Sets」；Microsoft Sysinternals RAMMap 页；Shadowblazer93/RamMAP-Shortcut README
> Collected: 2026-10-25
> Published: Unknown

本文件为 `nonadmin-physical-memory-reduction` 与 `windows-memory-reclamation-and-wsl-swap` 两篇文章提供机制来源与作用范围依据。

## EmptyWorkingSet（psapi.h）

URL: https://learn.microsoft.com/en-us/windows/win32/api/psapi/nf-psapi-emptyworkingset
页面 `ms.date`: 2018-12-05

- description 字段原文："Removes as many pages as possible from the working set of the specified process."
- 参数 `hProcess` 段原文："The handle must have the **PROCESS\_QUERY\_INFORMATION** or **PROCESS\_QUERY\_LIMITED\_INFORMATION** access right and the **PROCESS\_SET\_QUOTA** access right."
- Remarks 原文："You can also empty the working set by calling the SetProcessWorkingSetSize or SetProcessWorkingSetSizeEx function with the *dwMinimumWorkingSetSize* and *dwMaximumWorkingSetSize* parameters set to the value `(SIZE_T)(-1)`."
- Remarks 原文（命名）："Starting with Windows 7 and Windows Server 2008 R2, Psapi.h establishes version numbers for the PSAPI functions."；"If **PSAPI\_VERSION** is 2 or greater, this function is defined as **K32EmptyWorkingSet** in Psapi.h and exported in Kernel32.lib and Kernel32.dll."
- 最低系统原文："Minimum supported client | Windows XP [desktop apps only]"；"Minimum supported server | Windows Server 2003 [desktop apps only]"
- 该页没有规定调用者必须是管理员，也没有列出权限之外的身份条件。

## Working Set Information（psapi）

URL: https://learn.microsoft.com/en-us/windows/win32/psapi/working-set-information

- 原文："The working set of a process is the amount of memory physically mapped to its process context."
- 原文（快照语义）："The function reports only those pages that are physically present at the exact moment it is called."

## Exercise 1 - Identify Processes with Large Working Sets

URL: https://learn.microsoft.com/en-us/windows-hardware/test/wpt/memory-footprint-optimization-exercise-1
页面 `ms.date`: 2017-05-05

- 原文（账目口径 1）："Memory In Use = Process working sets + non-paged memory + modified pages"
- 原文（账目口径 2）："Available memory = Standby memory + free memory"
- 原文（常驻集定义）："The data referred to as the Resident Set is the set of pages that currently reside in physical memory (RAM)."

## RAMMap 官方页

URL: https://learn.microsoft.com/en-us/sysinternals/downloads/rammap
Published: March 26, 2026（页面 `ms.date` 2026-03-26）

- 原文："RAMMap is an advanced physical memory usage analysis utility for Windows Vista and higher."
- 原文（标签页）："*Use Counts:* usage summary by type and paging list"；"*Processes:* process working set sizes"；"*Priority Summary:* prioritized standby list sizes"；"*Physical Pages:* per-page use for all physical memory"
- 原文（快照能力）："RAMMap’s refresh feature enables you to update the display and it includes support for saving and loading memory snapshots."
- 原文（系统要求）："Client: Windows Vista and higher."；"Server: Windows Server 2008 and higher."
- 下载体积原文："**Download RAMMap**](https://download.sysinternals.com/files/RAMMap.zip)**(719 KB)**"
- 2026-10-25 复核：该页通篇没有出现 Empty 菜单、清理操作或权限要求的说明。

## Empty 菜单五项与开关

URL: https://github.com/Shadowblazer93/RamMAP-Shortcut（2026-10-25 经 GitHub 文件读取取得 README 全文）

- 原文："RamMap allows us to clear :" 之后逐项列出：
  - "Empty Working Sets `-Ew`"
  - "Empty System Working Sets `-Es`"
  - "Empty Modified Page List `-Em`"
  - "Empty Standby List `-Et`"
  - "Empty Priority 0 Standby List `-E0`"
- 该 README 只列名称与开关，没有逐项说明作用范围，也没有说明权限要求。

## 未核实项

- 五个菜单项各自处理哪些工作集与页列表：搜索摘要中出现过「Clears all user and system working sets」一类描述，对应页面正文返回 HTTP 403，未能完整读取；《Windows Sysinternals Administrator's Reference》原页同样未取得。这部分按未核实处理，不写入文章的事实陈述。
- 后四项系统级菜单项在标准账户下的权限要求：没有一手来源，本次未逐项运行。
- 运行 RAMMap 本身是否需要管理员权限：官方页没有写，二手页面未能完整读取，本次未验证。本会话没有启动过 RAMMap。

## 未取得的来源

- 4sysops 文章正文：HTTP 403，只取到检索摘要。
- Windows Sysinternals Administrator's Reference 原页：未取得。
- TechTarget 关于 RAMMap 的说明页：未完整读取，其权限结论不采用。
