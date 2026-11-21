# Git 可执行权限、core.filemode 与脚本执行

> Sources: Git 官方文档；Linux man-pages `execve(2)`；MSYS2 maintainers，2025-08-22；本机行为检查，2026-11-21
> Raw: [Git 文件模式与跨平台脚本执行](../../raw/wsl-windows/2026-11-21-git-file-modes-and-shell-execution.md)
> Updated: 2026-11-21

## Overview

脚本能否直接执行、Git 是否显示权限变化、提交中保存什么文件模式，是三个不同问题。排障时分别检查本地文件、Git index、指定 revision 和 Git 配置，再检查 shebang 选择的解释器。

## 分别检查四个状态

| 检查对象 | 命令 | 回答的问题 |
|---|---|---|
| 本地文件 | `stat -c '%A %a %n' <path>` | 当前运行环境是否授予执行权限 |
| Git index | `git ls-files -s -- <path>` | 下一次提交将记录什么文件模式 |
| 指定 revision | `git ls-tree <revision> -- <path>` | 某个提交已经记录了什么文件模式 |
| Git 配置 | `git config --show-origin --show-scope --get-all core.filemode` | Git 是否检测本地执行位变化，以及设置来自哪里 |

`core.filemode=false` 让 Git 忽略 index 与本地文件之间仅涉及执行位的差异。它不修改本地权限，也不改变 Linux 执行文件时的权限检查。

需要显式修改 index 中的执行权限时，可以使用：

```bash
git update-index --chmod=+x -- <path>
```

这条命令适用于文件系统执行位不可靠或希望直接指定 Git 文件模式的场景。工作区权限、index 模式和提交内容仍应分别验收。

## Linux：执行许可和解释器选择都必需

Linux `execve(2)` 将解释器脚本定义为具有执行权限、且首行采用 `#!interpreter [optional-arg]` 的文本文件。直接运行 `./script.sh` 时，执行权限和 shebang 都参与执行过程。

`EACCES` 可能来自脚本或解释器缺少执行权限，也可能来自文件系统使用 `noexec` 挂载。出现 `Permission denied` 时，除了检查脚本本身，还要检查解释器路径和挂载选项。

## MSYS2：结论取决于挂载配置

MSYS2 维护者说明，默认 `noacl` 环境中会通过文件特征推断执行位，shebang 是其中一种特征。这解释了某些 Windows Git Bash 环境可以直接运行带 shebang 的脚本。

这个行为依赖 MSYS2 的挂载与 ACL 配置，不能用来推断 Linux，也不能覆盖修改过 `/etc/fstab` 或 ACL 的 Windows 环境。

## 可复用排障顺序

先确认实际运行环境，再检查本地权限和 shebang；随后比较 index 与 revision 的文件模式，最后读取 `core.filemode` 的来源。任何一层与他人不同，都应报告具体差异，避免用“Git 已记录可执行”替代“本机可以执行”。

## See Also

- [容器镜像中的 shell 选择与镜像层复用](../container-images/shell-selection-and-layer-reuse.md)
