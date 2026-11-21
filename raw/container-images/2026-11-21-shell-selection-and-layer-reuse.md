# 容器 shell 选择与镜像层复用：文档和行为摘录

> Source: Ubuntu `/var/lib/dpkg/info/dash.postinst`；https://docs.docker.com/build/cache/ ; https://docs.docker.com/reference/cli/docker/image/pull/ ; https://docs.docker.com/reference/cli/docker/image/ls/ ; 本机 Bash 与路径检查
> Collected: 2026-11-21
> Published: Unknown

本文件保存 shell 配置和 Docker 层复用的必要原文。不同来源的发布日期不同，Published 统一记为 Unknown。

## Ubuntu `dash` 包对 `/bin/sh` 的处理

本机 `/var/lib/dpkg/info/dash.postinst` 的 `replace_with_link` 函数先创建临时符号链接，再替换目标：

```bash
ln -sf "$ltarget" "$DPKG_ROOT$temp"
mv -f "$DPKG_ROOT$temp" "$DPKG_ROOT$dfile"
```

同一文件的配置入口：

```bash
claim_binsh /bin/sh dash
```

本机路径检查：

```text
lrwxrwxrwx 1 root root    7 Apr 22  2024 /bin -> usr/bin
drwxr-xr-x 1 root root 69632 Nov 21 11:38 /usr/bin
lrwxrwxrwx 1 root root    4 Feb  3  2026 /bin/sh -> dash
lrwxrwxrwx 1 root root    4 Feb  3  2026 /usr/bin/sh -> dash
```

这些输出说明本次检查环境中的链接关系；其他发行版或镜像应使用 `readlink -f /bin/sh` 和路径检查重新确认。

## Bash 以 `sh` 名称启动

本机行为检查：

```bash
bash -c 'exec -a sh /bin/bash -c "shopt -o posix"'
```

输出：

```text
posix               	on
```

这项观察覆盖本机 Bash 以 `sh` 名称启动的场景，不能替代对具体脚本兼容性的测试。

## Docker 构建缓存

Docker Build 文档原文：

> Each instruction in this Dockerfile translates to a layer in your final image. You can think of image layers as a stack, with each layer adding more content on top of the layers that came before it.

> Whenever a layer changes, that layer will need to be re-built.

> If a layer changes, all other layers that come after it are also affected.

> Once a layer changes, then all downstream layers need to be rebuilt as well. Even if they wouldn't build anything differently, they still need to re-run.

由此可确定检查顺序：先判断变化发生在哪一层，再判断它和后续层是否需要重新构建。

## Docker 拉取时的层复用

`docker image pull` 文档原文：

> Layers can be reused by images. For example, the `debian:bookworm` image shares its layer with the `debian:latest` image. Pulling the `debian:bookworm` image therefore only pulls its metadata, but not its layers, because the layer is already present locally.

> Docker uses a content-addressable image store, and the image ID is a SHA256 digest covering the image's configuration and layers.

文档同时说明镜像 digest 与 tag 的用途不同：

> When using tags, you can `docker pull` an image again to make sure you have the most up-to-date version of that image.
>
> To know the digest of an image, pull the image first.
>
> Docker also prints the digest of an image when pushing to a registry.

`docker image ls` 文档单独说明 `--digests` 选项：

> Images that use the v2 or later format have a content-addressable identifier called a `digest`. As long as the input used to generate the image is unchanged, the digest value is predictable. To list image digest values, use the `--digests` flag:

拉取更新时是否复用本地内容，应根据 manifest 中的层 digest 和本地已有内容判断；tag 名称本身不能说明层是否变化。
