# 本机 Clojure CLI 与 uml-viewer 安装、验证记录

> Source: 本机会话命令输出：apt、官方安装脚本、git clone、`--help`、Xvfb、Maven 缓存检查、uv 帮助
> Collected: 2026-11-17
> Published: Unknown

## 系统软件包

安装 `rlwrap` 前的下载预览：

```text
'https://archive.ubuntu.com/ubuntu/pool/universe/libp/libptytty/libptytty0_2.0-1build1_amd64.deb' libptytty0_2.0-1build1_amd64.deb 44296 MD5Sum:51d45791192a9be27978c00b2446661a
'https://archive.ubuntu.com/ubuntu/pool/universe/r/rlwrap/rlwrap_0.47.1-0.1_amd64.deb' rlwrap_0.47.1-0.1_amd64.deb 106916 MD5Sum:ad1d49c91c62ee5635b7ee247330f05c
```

安装完成后：

```text
rlwrap 0.47.1-0.1 install ok installed
zulu25-ca-jre 25.0.5.0.3-5 install ok installed
```

`command -v rlwrap` 返回 `/usr/bin/rlwrap`。

## Clojure CLI

用 `linux-install.sh` 安装后：

```text
/usr/local/bin/clojure
Clojure CLI version 1.12.6.1673
```

`clj --version` 同样返回 `Clojure CLI version 1.12.6.1673`。

安装过程中脚本输出：

```text
linux-install.sh: OK
Downloading and expanding tar
clojure-tools-1.12.6.1673.tar.gz: OK
Installing libs into /usr/local/lib/clojure
Installing clojure and clj into /usr/local/bin
Installing man pages into /usr/local/share/man/man1
Removing download
```

## uml-viewer 源码与全局入口

克隆：

```bash
git clone --depth 1 --branch master https://github.com/unclebob/uml-viewer.git "$HOME/.local/share/uml-viewer"
```

`git ls-remote` 对应 master 的提交：

```text
ad6c36d964ef4dab07623ab98122d72010ecb5a6	refs/heads/master
```

全局入口 `~/.local/bin/uml-viewer` 的内容：

```sh
#!/bin/sh
exec clojure -Sdeps "{:deps {uml-viewer/uml-viewer {:local/root \"$HOME/.local/share/uml-viewer\"} quil/quil {:mvn/version \"4.3.1563\"}}}" -M -m uml-viewer.main.uml-viewer "$@"
```

这个入口不创建 `./uml`，不改项目 `.gitignore`，并让工作目录停在调用者所在目录。

## 帮助输出

在临时目录运行 `uml-viewer --help`：

```text
Usage: clj -M:run [options] [edn-file]

  edn-file          Diagram to watch (default: examples/library.edn).
                    A fresh start waits for the companion Grok to send
                    :display unless the associated agent recycles
                    the window with :uml-viewer-restart, or you press R.

  --restart         Associated agent only (via :uml-viewer-restart).
                    New JVM, keep the existing Grok tmux session.
                    Reloads the last view (depth, pan, zoom, proposal).
                    Do not use this if no companion is attached.

  -h, --help        Print this help and exit.
```

## 依赖下载与缓存

首次解析依赖时，出现一次失败：

```text
Error building classpath. The following artifacts could not be resolved: xml-apis:xml-apis-ext:jar:1.3.04 (absent): Could not transfer artifact xml-apis:xml-apis-ext:jar:1.3.04 from/to central (https://repo1.maven.org/maven2/): Remote host terminated the handshake
```

同一地址随后重试成功，`uml-viewer --help` 正常返回。

本机 Maven 缓存：

```text
~/.m2/repository/quil/quil/4.3.1563/quil-4.3.1563.jar          16.4M
~/.m2/repository/quil/quil/4.3.1563/quil-4.3.1563.pom          2.6K
~/.m2/repository/quil/processing-core/4.2.3/processing-core-4.2.3.jar   998.2K
```

`_remote.repositories` 记录来源为 Clojars：

```text
quil-4.3.1563.jar>clojars=
quil-4.3.1563.pom>clojars=
```

时间戳：

```text
#Mon Nov 16 23:50:21 CST 2026   quil
#Mon Nov 16 23:50:19 CST 2026   processing-core
```

## uv 的清单边界

`uv tool list --help` 对选项的说明：

```text
--show-extras              Whether to display the extra requirements installed with each tool
```

`uv tool list --show-extras` 的输出里没有 `uml`、`viewer`、`quil` 或 `processing` 条目；`command -v uml-viewer` 仍返回 `~/.local/bin/uml-viewer`。

`uv tool list` 已有条目包括 `crapper`、`dryer`、`mutator`、`graphifyy`、`headroom-ai` 等 Python 工具。

## 图形验证

本机显示环境：`DISPLAY` 未设置，`WAYLAND_DISPLAY=wayland-0`。

测试使用 `xvfb-run` 提供虚拟显示，运行 `uml-viewer --restart library.edn`，以 `xdotool search --name "^UML viewer$"` 找到窗口后退回。窗口记录见 [Azul 与本机 headless AWT 记录](2026-11-17-zulu-ca-and-headless-awt.md)。

测试只覆盖 `--restart` 分支；该分支不调用 `open-in-terminal!`。Grok companion 的 mail、regen 与重启流程没有验证。

## 未验证项

- 真实桌面或 WSL 显示通道里窗口是否可见。
- Grok companion 的唤醒、邮件队列与 `--restart` 回收流程。
- TLS 握手中断的原因。
