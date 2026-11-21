# Git 文件模式与跨平台脚本执行：文档和行为摘录

> Source: https://git-scm.com/docs/git-config#Documentation/git-config.txt-corefileMode ; https://git-scm.com/docs/git-update-index ; https://man7.org/linux/man-pages/man2/execve.2.html ; https://github.com/msys2/msys2-runtime/issues/311
> Collected: 2026-11-21
> Published: Unknown

本文件保存 Git、Linux 和 MSYS2 的必要原文，以及本机检查命令。不同来源的发布日期不同，Published 统一记为 Unknown。

## Git `core.fileMode`

Git `git-config` 文档原文：

> Tells Git if the executable bit of files in the working tree is to be honored.
>
> Some filesystems lose the executable bit when a file that is marked as executable is checked out, or checks out a non-executable file with executable bit on. `git-clone` or `git-init` probe the filesystem to see if it handles the executable bit correctly and this variable is automatically set as necessary.

`git-update-index` 文档对 `core.filemode` 的说明：

> The command honors `core.filemode` configuration variable. If your repository is on a filesystem whose executable bits are unreliable, this should be set to _false_ (see `git-config(1)`). This causes the command to ignore differences in file modes recorded in the index and the file mode on the filesystem if they differ only on executable bit. On such an unfortunate filesystem, you may need to use `git update-index --chmod=`.

同一文档对显式记录执行权限的说明：

> `--chmod=(+|-)x`
>
> Set the execute permissions on the updated files.

本机使用的定位命令：

```bash
git config --show-origin --show-scope --get-all core.filemode
git ls-files -s -- <path>
git ls-tree <revision> -- <path>
git -c core.filemode=true diff --summary -- <path>
```

`git ls-files -s` 和 `git ls-tree` 的输出会分别显示 Git index 与指定 revision 中的文件模式；`git -c core.filemode=true ...` 只改变该次命令的配置，不写入仓库配置。

## Linux 执行权限与 shebang

Linux `execve(2)` 手册对解释器脚本的定义：

> An interpreter script is a text file that has execute permission enabled and whose first line is of the form:
>
> `#!interpreter [optional-arg]`
>
> The interpreter must be a valid pathname for an executable file.

手册对解释器参数和权限错误的说明：

> `interpreter [optional-arg] path arg...`

> `EACCES` Execute permission is denied for the file or a script or ELF interpreter.

这些原文同时包含两个条件：脚本需要执行权限，shebang 决定解释器路径。

## MSYS2 的默认权限行为

MSYS2 维护者 `lazka` 在 `msys2/msys2-runtime` issue #311 中的回复：

> MSYS2 mounts everything with noacl, while cygwin doesn't. executable bit is detected via heuristics then, like when there is a shebang in the file for example.

另一位维护者 `jeremyd2019` 随后给出了挂载语义文档和配置入口：

> https://cygwin.com/cygwin-ug-net/mount.html
>
> edit `/etc/fstab` and remove noacl options.

该说明适用于相应 MSYS2 配置。修改挂载选项或 ACL 配置后，需要重新检查实际行为。

## 本机执行行为观察

在 Windows Git Bash 中直接运行 Git 自带的 shebang 示例脚本：

```text
-rwxr-xr-x ... pre-receive.sample
direct_exit=0
```

这项观察只覆盖该 Windows Git Bash 环境中的示例脚本。Linux 执行语义以 `execve(2)` 为准，MSYS2 行为以其实际挂载配置为准。
