# OMP 二进制分析的按需依赖安装

> Sources: OMP 工具说明 `omp://tools/dsm.md` 与 `xd://eval/dsm`，2026-11-20；已安装包 `src/ghidra/install.ts`，2026-11-20
> Raw: [OMP 二进制分析的按需依赖安装（Ghidra、JDK、PyGhidra）](../../raw/omp/2026-11-20-omp-dsm-ghidra-jdk-provisioning.md)
> Updated: 2026-11-20

## Overview

OMP 的二进制分析按需准备依赖：Ghidra 12.2、JDK 25、PyGhidra 环境、反编译器本机组件。裸读一个可执行文件只显示元数据，不触发准备；只要调用分析视图或 `dsm.open`，就会在首次分析时下载并安装缺失部分。JDK 的查找只认 `JAVA_HOME` 与自管目录，不读取 `PATH`，这是系统已装 Java 仍会再下载一份的原因。

## 两个入口的差别

| 调用 | 行为 |
|---|---|
| `read <二进制>` | 只返回 ELF/PE/Mach-O 元数据 |
| `read <二进制>:overview`、`:strings`、`:imports`、`:exports`、`:xrefs:<func>` | 进入分析流程，可能触发安装 |
| `dsm.open(<路径>)` | 同上 |

工具说明原文：

> Bare `read <binary>` shows on-disk Mach-O/ELF/PE metadata only; it never opens an analysis database or downloads a backend.

> Ghidra may provision Ghidra, a JDK, PyGhidra, and native tools on first analysis. An installation-in-progress error means it continues; retry later.

安装是惰性的：首次分析才发生，裸读永不发生。

## 安装位置

Ghidra 的查找顺序：配置项 `ghidra.installDir` → 环境变量 `$GHIDRA_INSTALL_DIR` → Homebrew 前缀 → 托管下载。托管下载固定为 `Ghidra 12.2`，解压到 OMP 数据目录下的 `ghidra/ghidra_12.2_PUBLIC`，并写入就绪标记。

PyGhidra 用该安装自带的 wheel 建虚拟环境；反编译器本机组件缺失时在托管安装内构建一次。

## JDK 为什么会被重复下载

入口只检查一个环境变量：

```ts
/** Use JAVA_HOME when it is JDK 25+, otherwise provision and reuse a managed Temurin JDK 25. */
export async function ensureJdk(): Promise<string> {
	const environment = $env.JAVA_HOME?.trim();
	if (environment && (await isSuitableJdk(environment))) return path.resolve(environment);
```

适用性判定读 JDK 的 `release` 文件，要求主版本号不小于 25，并存在 `bin/java`。若 `JAVA_HOME` 未设置，代码直接转向自管目录；自管目录为空时从 Adoptium 取最新 25 版并安装。

代码中不读取 `PATH` 中的 `java`，也不查询系统的 Java alternatives 登记。

## 本机实例

- `JAVA_HOME` 未设置；`/usr/bin/java` 指向 `/usr/lib/jvm/zulu25-ca-amd64/bin/java`，版本 `25.0.5.1`。
- 因此安装器下载了 Temurin，其 `release` 记录 `JAVA_VERSION="25.0.5.1"`，与既有 Zulu 的版本号一致，只有发行方不同。
- 触发方式：子代理对 Herdr 可执行文件调用了 `read(...:overview)`，工具返回 `downloading JDK 25: 60/141 MB`；随后的 `:strings` 调用仍在安装 `Ghidra 12.2: 361/570 MB`。
- 占用：`~/.omp/ghidra` 合计 `1.2G`（Ghidra `885M`、JDK `305M`、PyGhidra `2.8M`），分析项目 `~/.omp/agent/ghidra-projects` 为 `697M`。

同一会话里浏览器侧没有新增下载：Chromium 为系统包（安装于 2026-11-07），Playwright 来自既有缓存。

## 怎样避免重复下载

把 `JAVA_HOME` 指到已有的 JDK 25 即可让安装器复用它，省下 `305M` 的第二份 JDK。设置后需要在新的进程环境里重新触发分析，已安装的自管 JDK 不再被选中但保留在磁盘上。

清理已安装内容属于删除操作，需要单独确认；本文不代为执行。

## 证据边界

- 已核实：裸读与分析视图的行为差别；JDK 查找顺序与代码路径；本机两份 JDK 的版本与发行方；各目录占用。
- 未核实：`disassembler.backend = none` 对首次分析的影响；设置 `JAVA_HOME` 后安装器是否仍会新建自管目录（代码路径显示会先返回，未实测）。

## See Also

- [OMP 本地构建：依赖、步骤、产物与验证](local-build.md)
