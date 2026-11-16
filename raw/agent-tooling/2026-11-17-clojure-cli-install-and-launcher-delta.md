# Clojure CLI 官方安装与 Ubuntu 启动器差别

> Source: https://clojure.org/guides/install_clojure; https://clojure.org/reference/clojure_cli; https://api.github.com/repos/clojure/brew-install/releases/latest; https://github.com/clojure/brew-install/releases/download/1.12.6.1673/linux-install.sh; https://packages.ubuntu.com/source/resolute/clojure; https://packages.ubuntu.com/resolute/all/clojure/filelist; https://manpages.ubuntu.com/manpages/resolute/man1/clojure1.12.1.html; https://packages.ubuntu.com/source/resolute/tools-deps-clojure; https://wiki.debian.org/Clojure/Goals/ClojureCLIToolsInDebian; https://lists.debian.org/debian-clojure/2021/08/msg00028.html
> Collected: 2026-11-17
> Published: 2026-11-15（安装页）; 2026-09-02（CLI 发行）; 其余 Unknown

## 官方安装页：Linux 前提与步骤

页面原文：

> Prerequisites: Java, `bash`, `curl`, `rlwrap`

> To install with the Linux script installer:
> 1. Ensure that the following dependencies are installed: `bash`, `curl`, `rlwrap`, and `Java`.
> 2. Use the `linux-install` script to download and run the install, which will create the executables `/usr/local/bin/clj`, `/usr/local/bin/clojure`, and the directory `/usr/local/lib/clojure`:

```bash
curl -L -O https://github.com/clojure/brew-install/releases/latest/download/linux-install.sh
chmod +x linux-install.sh
sudo ./linux-install.sh
```

> To install to a custom location (like `/opt/infrastructure/clojure`), use the option `--prefix`:

```bash
sudo ./linux-install.sh --prefix /opt/infrastructure/clojure
```

Java 一节原文：

> Clojure requires Java. Clojure officially supports Java LTS releases (currently Java 8, 11, 17, 21, and 25), but also tries to ensure interim versions work as well.

> Clojure officially supports Java LTS releases (currently Java 8, 11, 17, 21, and 25)

页面底部标注：`Published 2026-11-15`。

## 官方 CLI 参考：clj 与 clojure

> The CLI is invoked via either `clojure` or `clj`. In general, you can treat these interchangeably but `clj` includes `rlwrap` for extended keyboard editing, particularly useful with the REPL.

选项索引中的相关行：

```text
 -Sdeps EDN   Extra deps.edn data or file
 -M[aliases]  Invoke clojure.main, using aliases
```

`-M` 一节原文：

> You can use the `-M` exec-opt to invoke clojure.main, which supports calling a namespace with a `-main` function or a Clojure script:

```bash
clojure -M -e '(+ 1 1)'
```

## CLI 发行 1.12.6.1673

GitHub Releases API 的最新发行记录：

| 字段 | 值 |
|---|---|
| tag_name | `1.12.6.1673` |
| published_at | `2026-09-02T20:34:43Z` |
| `linux-install.sh` size | `2133` |
| `linux-install.sh` digest | `sha256:5ae63b082ed33bf4c29bf1a8317c5c15249d1bc753676b2f5177fb3804ad6f77` |
| `clojure-tools-1.12.6.1673.tar.gz` size | `12327673` |
| `clojure-tools-1.12.6.1673.tar.gz` digest | `sha256:fe9194858e75d5af13c2e2aff92d710674d5bc5105f2b42f90a7d94d82ec023c` |

下载地址：

- `https://github.com/clojure/brew-install/releases/download/1.12.6.1673/linux-install.sh`
- `https://github.com/clojure/brew-install/releases/download/1.12.6.1673/clojure-tools-1.12.6.1673.tar.gz`

## linux-install.sh 的实际动作

脚本前部：

```bash
default_prefix_dir="/usr/local"
```

下载与校验：

```bash
curl -L -O -f -m 120 --connect-timeout 5 --retry 5 --retry-connrefused --retry-max-time 60 --no-progress-meter https://github.com/clojure/brew-install/releases/download/1.12.6.1673/clojure-tools-1.12.6.1673.tar.gz
echo "fe9194858e75d5af13c2e2aff92d710674d5bc5105f2b42f90a7d94d82ec023c  clojure-tools-1.12.6.1673.tar.gz" | sha256sum -c
tar xzf clojure-tools-1.12.6.1673.tar.gz
```

安装文件：

```bash
install -m644 clojure-tools/deps.edn "$clojure_lib_dir/deps.edn"
install -m644 clojure-tools/example-deps.edn "$clojure_lib_dir/example-deps.edn"
install -m644 clojure-tools/tools.edn "$clojure_lib_dir/tools.edn"
install -m644 clojure-tools/exec.jar "$clojure_lib_dir/libexec/exec.jar"
install -m644 clojure-tools/clojure-tools-1.12.6.1673.jar "$clojure_lib_dir/libexec/clojure-tools-1.12.6.1673.jar"
install -m755 clojure-tools/clojure "$bin_dir/clojure"
install -m755 clojure-tools/clj "$bin_dir/clj"
install -m644 clojure-tools/clojure.1 "$man_dir/clojure.1"
install -m644 clojure-tools/clj.1 "$man_dir/clj.1"
```

脚本末尾：

```bash
rm -rf clojure-tools
rm -rf clojure-tools-1.12.6.1673.tar.gz
```

## Ubuntu resolute 的 clojure 包

源码包页面：

| 字段 | 值 |
|---|---|
| Source Package | `clojure (1.12.0-1build2) [universe]` |
| 二进制包 | `clojure`, `libclojure-java` |
| Original Maintainers | Debian Clojure Maintainers; Elana Hashman; Louis-Philippe Véronneau |

`clojure` 二进制包 `apt-cache show` 摘要：

```text
Version: 1.12.0-1build2
Depends: default-jre-headless, libclojure-java (= 1.12.0-1build2)
Recommends: rlwrap
```

文件清单原文：

```text
/etc/rlwrap/clojure1.12
/usr/bin/clojure1.12
/usr/bin/clojurec1.12
/usr/share/doc/clojure/README.Debian
/usr/share/doc/clojure/changelog.Debian.gz
/usr/share/doc/clojure/copyright
/usr/share/man/man1/clojure1.12.1.gz
/usr/share/man/man1/clojurec1.12.1.gz
```

manpage 的 SYNOPSIS：

```text
clojure [-cp/-classpath classpath] [-i/--init path] [-e/--eval expr] {-h | -r | path | -} [args ...]
```

manpage 的 OPTIONS 只列 `-cp, -classpath`、`-i, --init`、`-e, --eval`、`-m, --main`、`-r, --repl`、`-h, -?, --help`。没有 `-Sdeps`、`-M`、`clj`。

`tools-deps-clojure` 源码包页面：

| 字段 | 值 |
|---|---|
| Source Package | `tools-deps-clojure (0.21.1460-5build2) [universe]` |
| 二进制包 | `libtools-deps-clojure` |
| 描述 | `API for transitive dependency graph expansion, classpath creation` |

## Debian 的打包目标与迁移记录

Debian Wiki 页面开头：

> This page is intended to help the (re-)packaging of [clj](https://github.com/clojure/brew-install) (and maybe other tools?).

相关 ITP：

- `ITP: clojure-cli -- upstream CLI entrypoints for Clojure` `891141`
- 被 `ITP: tools-deps-alpha-clojure -- functional API for dependency management and classpath creation` `891136` 阻塞
- 又被 `data-xml-clojure: Please upgrade data-xml-clojure to 0.2.0-alpha5` `905545` 与 `ITP: tools-gitlibs-clojure -- Clojure API for programatically accessing git libraries` `905543` 阻塞

2021 GSoC 最终报告（2021-08-23）原文：

> The goal of the “Clojure Build Tools in Debian” project was to provide Clojure Debian users with some of the latest advanced build tools and libraries the upstream Clojure developers have been lately working on. These include `tools.deps.alpha`, a library for dependency graph resolution and classpath building, and the CLI tool `clj`, for REPL interaction.

> I only have to finish working on the transition from the currently provided set of packages (based on a Debian-specific clojure runner) to the newly provided upstream clojure and clj runners.

任务状态原文：

> T3: Packaging `clojure-cli`.
> + 90% done as of the end of Coding II.
>
> T4: Updating `clojure` to use `clojure-cli`.
> + To be completed after GSoC.

采集时没有找到现行维护者对「Ubuntu 仍提供自有启动器」的明确说明。上面两份材料只记录迁移目标与 2021 年的进度，不能推出当前维护决策的原因。
