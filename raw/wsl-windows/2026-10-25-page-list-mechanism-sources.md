# Windows 页列表分类、写回路径与可用内存定义

> Source: Microsoft Learn「Exercise 1 - Identify Processes with Large Working Sets」(MMList 定义)；Microsoft Learn「Data corruption on IO write」(Modified Page Writer)；Microsoft Learn「MEMORYSTATUSEX」
> Collected: 2026-10-25
> Published: Unknown

本文件补足 `nonadmin-physical-memory-reduction` 与 `windows-memory-reclamation-and-wsl-swap` 两篇文章关于页列表分类与可用内存口径的一手依据。

## 页列表分类（WPT 页的 MMList 定义）

URL: https://learn.microsoft.com/en-us/windows-hardware/test/wpt/memory-footprint-optimization-exercise-1
页面 `ms.date`: 2017-05-05

- 原文："Active – Pages currently within a process private working set or kernel working set."
- 原文："Standby – Unmodified pages on the standby list. They are part of the available memory."
- 原文："Modified – Process private or file backed pages that were modified since last being persisted to permanent storage."
- 原文（回收路径）："Standby pages could be freed under memory pressure."；"Modified pages could be written to disk and freed."

## 已修改页的写回与转段

URL: https://learn.microsoft.com/en-us/troubleshoot/windows-hardware/drivers/data-corruption-io-writes
页面 `ms.date`: 2020-09-01

- 原文："The Modified Page Writer scans all dirty pages that are page file backed and tracked by the Memory manager."
- 原文："An IRP is allocated and an MDL describing the pages is created and sent to the Storage stack to be written to the backing page file. Once the I/O is completed, the pages are placed at the tail end of the Standby list if there are no other references to the page (refcount == 0)."
- 要点：Modified 列表上的页由系统工作线程写回后备文件（pagefile），写回完成后转入 Standby 列表。

## 可用内存的构成

URL: https://learn.microsoft.com/en-us/windows/win32/api/sysinfoapi/ns-sysinfoapi-memorystatusex
页面 `ms.date`: 2018-12-05

- 原文（`ullAvailPhys`）："The amount of physical memory currently available, in bytes. This is the amount of physical memory that can be immediately reused without having to write its contents to disk first. It is the sum of the size of the standby, free, and zero lists."
- 要点：Standby 上的页在计数器里立即算作可用，无需先写盘；Modified 上的页不在这个和之内。
