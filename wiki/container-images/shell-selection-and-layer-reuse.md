# 容器镜像中的 shell 选择与镜像层复用

> Sources: Ubuntu `dash` 包脚本；Docker Build 与 `docker image pull` 官方文档；本机 Bash 与路径检查，2026-11-21
> Raw: [容器 shell 选择与镜像层复用](../../raw/container-images/2026-11-21-shell-selection-and-layer-reuse.md)
> Updated: 2026-11-21

## Overview

容器里的 shell 由调用方式和镜像文件共同决定。构建缓存与拉取时的层复用也发生在不同阶段：前者决定哪些构建步骤需要重新执行，后者决定本地已有内容能否继续使用。

## 先确认调用方式，再确认解释器

| 调用方式 | 解释器来源 | 需要检查的内容 |
|---|---|---|
| `sh script.sh` | 命令中明确写出的 `sh` | `sh` 的实际路径与链接目标 |
| `./script.sh` | 脚本 shebang，且脚本需要执行权限 | 文件权限、`#!` 行和解释器路径 |
| `#!/bin/sh` | `/bin/sh` 指向的程序 | `readlink -f /bin/sh` 的结果 |

Ubuntu 的 `dash` 包会通过包管理脚本配置 `/bin/sh`。具体镜像是否使用 `dash`，应检查镜像内的链接，不能只根据发行版名称推断。

某些环境中 `/bin` 本身是指向 `usr/bin` 的符号链接，因此 `/bin/sh` 与 `/usr/bin/sh` 可能指向同一位置。这个关系也需要实际检查，不能作为所有 Linux 镜像的固定布局。

Bash 以 `sh` 名称启动时可以进入 POSIX 模式。将系统 `/bin/sh` 改为 Bash 后，使用 `sh` 的脚本会经过新的解释器路径，应运行覆盖这些调用方式的兼容性测试。

## 构建缓存按层向下失效

Docker Build 文档规定：某一层发生变化时，该层需要重新构建，后续层也需要重新执行。

因此，在现有 Dockerfile 末尾增加新指令时，如果基础镜像和前置输入均未变化，前面的层可以继续使用构建缓存，新指令形成新的层。若基础镜像或前面的指令发生变化，则从变化层开始重新构建。

“指令位于末尾”只说明缓存失效的位置。实际是否命中缓存仍取决于构建器能否取得对应缓存，以及前置输入是否一致。

## 拉取镜像按内容复用本地层

Docker 使用内容寻址存储。不同 tag 可以共享相同层；当所需层已经存在于本地时，拉取另一个引用该层的 tag 可以只取得元数据。

拉取更新后的 tag 时，应根据 manifest 中的层 digest 与本地内容判断是否复用。前置层未变且新增层位于末尾时，已有前置层仍可复用；如果前置层的内容也发生变化，相应新层需要下载。

构建缓存命中与拉取层复用需要分别验证，不能根据其中一种结果推断另一种结果。

## See Also

- [Git 可执行权限、core.filemode 与脚本执行](../wsl-windows/git-executable-modes-and-shell-scripts.md)
- [发布资产与镜像的验证方法](../software-testing/release-artifact-verification.md)
