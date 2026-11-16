# Clojure CLI 与 uml-viewer 的运行环境

> Sources: Clojure 官方安装页与 CLI 参考，2026-11-15; clojure/brew-install 1.12.6.1673 发行资产与 linux-install.sh，2026-09-02; Ubuntu resolute 软件包页面与 manpage，2026-11-17 采集; Debian Clojure CLI 打包目标与 GSoC 2021 报告，2021-08-23; Azul Zulu CA 安装文档，2026-11-17 采集; unclebob/uml-viewer master 文档与源码，2026-11-17 采集; 本机安装与验证日志，2026-11-17
> Raw: [Clojure CLI 安装与启动器差别](../../raw/agent-tooling/2026-11-17-clojure-cli-install-and-launcher-delta.md); [uml-viewer 图形界面与启动面](../../raw/agent-tooling/2026-11-17-uml-viewer-gui-and-launch-surfaces.md); [Azul Zulu CA 与 headless AWT](../../raw/agent-tooling/2026-11-17-zulu-ca-and-headless-awt.md); [本机安装与验证日志](../../raw/agent-tooling/2026-11-17-clojure-viewer-local-install-log.md)
> Updated: 2026-11-17

## Overview

uml-viewer 是一个 Clojure 图形应用：主窗口用 Quil 调用 Processing 绘图，源码窗口用 Swing。运行它需要 Clojure CLI 和带图形组件的 Java 21+。Ubuntu 软件源里的 `clojure` 包提供的是另一套启动器，没有 `clj`，也不解析 `deps.edn`。本机已装 Clojure CLI `1.12.6.1673`、`rlwrap 0.47.1-0.1`、`zulu25-ca-jre 25.0.5.0.3-5`，全局入口为 `~/.local/bin/uml-viewer`，窗口在 Xvfb 虚拟显示中开到 `1500×920`。

## 图形界面由什么组成

| 层 | 证据 | 作用 |
|---|---|---|
| Clojure | `deps.edn` 声明 `org.clojure/clojure {:mvn/version "1.12.0"}` | 应用语言 |
| Quil | `sketch.clj` 引用 `quil.core`、`quil.applet`、`quil.middleware` | Clojure 图形入口 |
| Processing | `sketch.clj` 引用 `processing.event`；Quil POM 依赖 `quil/processing-core 4.2.3` | Java 绘图内核 |
| Swing / AWT | `source_window.clj` 引用 `JFrame`、`JEditorPane`、`JScrollPane`；`sketch.clj` 引用 `java.awt.Frame`、`JPopupMenu` | 源码窗口与右键菜单 |
| Java 图形库 | 需要 `libawt_xawt.so` 与带图形组件的 JRE | 创建实际窗口 |

Quil `4.3.1563` 从 Clojars 取得，依赖 `quil/processing-core`、`processing-dxf`、`processing-svg`、`processing-pdf`，版本均为 `4.2.3`。本机缓存位于 `~/.m2/repository/quil/quil/4.3.1563/` 与 `~/.m2/repository/quil/processing-core/4.2.3/`；`_remote.repositories` 记录来源为 `clojars`。

## 官方 Clojure CLI 与 Ubuntu clojure 包

| 对照项 | 官方 Clojure CLI | Ubuntu `clojure 1.12.0-1build2` |
|---|---|---|
| 命令 | `clj`、`clojure` | `clojure1.12`、`clojurec1.12` |
| 依赖解析 | 读取 `deps.edn`，支持 `-Sdeps` | manpage 没有 `-Sdeps`、`-M` |
| REPL 行编辑 | `clj` 带 `rlwrap` | `clojure1.12` 由包内脚本提供 |
| 安装位置 | `/usr/local/bin`、`/usr/local/lib/clojure` | apt 管理的 `/usr/bin` |
| 附加库 | `org.clojure/tools.deps` 由 CLI 调用 | `libtools-deps-clojure` 只是库，版本 `0.21.1460-5build2` |

官方 CLI 参考说明两个命令基本可以互换，`clj` 额外带 `rlwrap`，用于 REPL 的键盘编辑。

Debian 侧的迁移记录：`2021-08-23` 的 GSoC 报告把 `clojure-cli` 打包列为 T3，标注 `90% done`；T4「更新 `clojure` 以使用 `clojure-cli`」标注为 `To be completed after GSoC`。报告同时写到要从「Debian-specific clojure runner」切换到「upstream clojure and clj runners」。采集时 Ubuntu 文件清单仍只有 `clojure1.12` 与 `clojurec1.12`，没有 `clj`。现行维护者为什么保留这个安排，没有找到说明。

## 安装步骤与下载物

以官方发行 `1.12.6.1673` 为准：

| 步骤 | 取到的文件或结果 | 地址与大小 |
|---|---|---|
| 安装 `rlwrap` | `rlwrap_0.47.1-0.1_amd64.deb` | `https://archive.ubuntu.com/ubuntu/pool/universe/r/rlwrap/rlwrap_0.47.1-0.1_amd64.deb`，`106916` 字节 |
| 同一步的依赖 | `libptytty0_2.0-1build1_amd64.deb` | `https://archive.ubuntu.com/ubuntu/pool/universe/libp/libptytty/libptytty0_2.0-1build1_amd64.deb`，`44296` 字节 |
| 下载安装脚本 | `linux-install.sh` | `https://github.com/clojure/brew-install/releases/download/1.12.6.1673/linux-install.sh`，`2133` 字节，SHA-256 `5ae63b082ed33bf4c29bf1a8317c5c15249d1bc753676b2f5177fb3804ad6f77` |
| 运行安装脚本 | `clojure-tools-1.12.6.1673.tar.gz` | `https://github.com/clojure/brew-install/releases/download/1.12.6.1673/clojure-tools-1.12.6.1673.tar.gz`，`12327673` 字节，SHA-256 `fe9194858e75d5af13c2e2aff92d710674d5bc5105f2b42f90a7d94d82ec023c` |
| 脚本安装的文件 | `deps.edn`、`example-deps.edn`、`tools.edn`、`libexec/exec.jar`、`libexec/clojure-tools-1.12.6.1673.jar`、`clojure`、`clj`、两份 man page | 落到 `/usr/local/bin` 与 `/usr/local/lib/clojure` |

脚本自带 SHA-256 校验，压缩包不匹配就中止。安装到自定义位置用 `--prefix`。`2026-09-02` 是该发行的发布时间。

## `rlwrap` 的作用边界

`rlwrap` 只服务 `clj` 的交互输入。官方 Linux 安装前提把它列进去；`clojure` 命令不经过它。uml-viewer 的 `./uml` 明确使用 `clojure`，脚本注释说明后台 `rlwrap` 会因 `SIGTTOU` 停住，JVM 起不来。因此只跑 viewer 的 `./uml` 路径时，`rlwrap` 缺席不影响启动；运行动作里的 `clj -M:...` 命令时才需要它。

## Java 图形组件与 headless 症状

Azul 的 `CA` 是 **Community Availability**，指免费发行版本，与图形能力无直接关系。区分图形能力的是包名：

> **Community Availability (CA)** distributions are Azul Zulu Builds of OpenJDK that are free to download and use.

| 包 | 图形组件 |
|---|---|
| `zulu<X>-ca-jre` | 包含 |
| `zulu<X>-ca-jre-headless` | 不包含（without GUI support） |
| `zulu<X>-ca-jdk` | 包含 |
| `zulu<X>-ca-jdk-headless` | 不包含 |

本机原状是四个 headless 包，版本 `25.0.5.0.3-5`。`lib/` 里有 `libawt.so`（`794.5K`）与 `libawt_headless.so`（`31.2K`），没有 `libawt_xawt.so`；Xvfb 提供的 `:99` 显示里，`GraphicsEnvironment.isHeadless()` 仍返回 `true`，sketch 直接报：

```text
Cannot run sketch without a display.
```

补装 `zulu25-ca-jre 25.0.5.0.3-5` 后，同一命令在同一虚拟显示里创建了 `UML viewer` 窗口，`Map State: IsViewable`，尺寸 `1500×920`。这个包只新增一个，不升级也不移除其他包。

## 全局入口与项目内启动器的差别

| 面 | 项目内 `get-uml-viewer` | 全局 `~/.local/bin/uml-viewer` |
|---|---|---|
| 安装位置 | `.uml-viewer/uml-viewer/` | `~/.local/share/uml-viewer` |
| 生成的命令 | `./uml` | PATH 上的 `uml-viewer` |
| 项目文件 | 写 `./uml`，改写 `.gitignore` 的 UML-VIEWER 段 | 不创建 |
| EDN 自动查找 | 有，按项目名与 `examples/*.edn` | 没有，需显式传入路径 |
| 启动方式 | `nohup clojure ... &`，日志写 `uml-viewer-log.txt` | 前台 `clojure ...`，日志留在终端 |
| companion | fresh start 会起 tmux + Grok | 同一 binary，是否启动取决于是否带 `--restart` |

`start!` 的分支是决定性的：`--restart` 走 `remember-companion!`，只绑定已有会话；不带 `--restart` 才走 `open-in-terminal!`，用 `tmux new-session` 起 `grok --yolo --trust --rules …`。`grok` 的候选路径是 `$GROK_BIN`、`$HOME/.grok/bin/grok`、`/usr/local/bin/grok`、`/opt/homebrew/bin/grok`，都没有时退回 PATH 上的 `grok`。

## uv 的边界

`uv tool list` 只列 uv 安装的 Python 工具，靠每个工具目录里的 `uv-receipt.toml` 发现。`--show-extras` 的官方说明是显示每个工具已安装的附加依赖：

```text
--show-extras              Whether to display the extra requirements installed with each tool
```

uml-viewer 由 Clojure CLI 启动，源码与 Maven 缓存都不在 uv 目录里，因此不会出现在 `uv tool list`，也不受 `uv tool upgrade --all` 管理。要让它进 uv 清单，需要另写一个 Python 包装包；被管理的仍然是 Python 包，Clojure 侧更新另算。

## 显示边界

本机 WSL 没有 `DISPLAY`，`WAYLAND_DISPLAY` 为 `wayland-0`。Xvfb 能提供虚拟显示，供进程创建窗口，但窗口不会出现在用户屏幕上。要在本机看到界面，需要接真实桌面、WSLg 或其他显示通道；这一步没有验证。

## 验证记录与未验证项

已执行：apt 安装 `rlwrap`；官方脚本安装 CLI；克隆 viewer；写全局入口；`uml-viewer --help`；headless 失败复现；补装 `zulu25-ca-jre`；Xvfb 下窗口出现。首次依赖解析遇到 `xml-apis:xml-apis-ext:jar:1.3.04` 的 TLS 中断，重试后成功，原因未定位。

未验证：真实显示通道的可见性；Grok companion 的邮件、regen、重启回收；TLS 中断的根因。

## See Also

- [ub-mode 配套工具：安装、升级与项目运行方式](ub-mode-companion-tools.md)
- [uv 工具发现机制与 uv-receipt.toml](uv-tool-discovery-and-receipts.md)
- [pstack 与 ub-mode 的作者归属及原则来源](../ai-coding-agents/pstack-ub-mode-authorship-and-principle-origins.md)
