# OMP dsm：三后端二进制分析与 Python worker 架构

> Sources: OMP 已安装包 `@oh-my-pi/pi-coding-agent` 19.2.1 源码（`src/disasm/`、`src/ghidra/`、`src/ida/`、`src/binja/`、`src/prompts/tools/dsm.md`）与 `dist/types/ghidra/install.d.ts`，2026-11-26；本机命令输出，2026-11-26；GitHub releases、hex-rays.com、binary.ninja、Wikipedia 等公开页面，2026-11-26/27 采集
> Raw: [OMP dsm 三后端、获取方式与 Python worker 架构（源码摘录）](../../raw/omp/2026-11-26-omp-disasm-backends-and-worker-architecture.md); [2026 年反汇编工具版本状态](../../raw/omp/2026-11-26-disassembler-landscape-2026.md)
> Updated: 2026-11-27

## 支持范围与获取方式

OMP 19.2.1 内置三个反汇编后端，权威清单是 `DISASM_BACKEND_IDS = ["ida", "ghidra", "binja"]`（`disasm/backend.ts`），设置项、host daemon 与 eval 参数都拿它校验，没有第四个后端。这是一方原生集成：三个后端各有一个 Python worker 脚本打进 npm 包，对 agent 暴露为 eval 里的 `dsm` 命名空间（JavaScript 与 Python eval 都有）和 `read` 命令的 `binary:` 分析选择器。

三个后端的获取方式不同，只有 Ghidra 会被自动下载：

| 后端 | id | 获取方式 | 数据库文件 |
|---|---|---|---|
| IDA Pro | `ida` | 只检测本机安装（要求 idalib），永不下载 | `.i64`/`.idb`，原地打开 |
| Ghidra | `ghidra` | 首次分析自动下载固定版本 12.2 | 受管项目目录 `omp.gpr`，源二进制不被修改 |
| Binary Ninja | `binja` | 只检测本机安装，导入时探测许可证 | `.bndb`，原地打开 |

`disassembler.backend` 默认 `auto`（`disasm/settings.ts` 注册处 `default: "auto"`）。auto 的尝试顺序是 `AUTO_ORDER = ["ida", "ghidra"]`：本机有带 idalib 的 IDA 就用 IDA，否则落 Ghidra；Ghidra 只要平台受支持就算可用，因为需要时可以现场下载。Binary Ninja 永不被 auto 选中，只能显式设置，源码注释给出的原因：安装本身看不出许可证是否允许无头使用，排在 Ghidra 前面会让许可证不允许的用户全部报错。显式选择某个后端时不会回退到其他后端。

## Ghidra 的下载来源与时机

下载发生在首次显式分析时（惰性），裸 `read <二进制>` 只显示文件元数据、任何情况下不触发下载。托管下载的固定版本定义在 `GHIDRA_RELEASE`：版本 12.2、tag `Ghidra_12.2_build`、资产 `ghidra_12.2_PUBLIC_20261016.zip`、sha256 `2c2cd776db3c1f6a097ba418922378ac3649cadd5e844a6f5f088ae628a7be67`，从 GitHub 官方 release 拉取并校验：

```
https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_12.2_build/ghidra_12.2_PUBLIC_20261016.zip
```

解压到 OMP 数据目录 `~/.omp/ghidra/ghidra_12.2_PUBLIC`，写入就绪标记 `.omp-ready`。Ghidra 本体的查找顺序：`ghidra.installDir` 设置 → `$GHIDRA_INSTALL_DIR` → Homebrew 前缀（`/opt/homebrew`、`/usr/local`、`/home/linuxbrew/.linuxbrew` 下的 `opt/ghidra/libexec`）→ 托管下载。

配套还会装两样：`JAVA_HOME` 不是 JDK 25+ 时，经 Adoptium API 取 Temurin JDK 25（`https://api.adoptium.net/v3/assets/latest/25/hotspot?architecture=…&image_type=jdk&os=…&vendor=eclipse`，`arch` 为 `aarch64`/`x64`、`os` 为 `mac`/`windows`/`linux`），装到 `~/.omp/ghidra/jdk/`；再用安装自带的 PyGhidra wheels 建一个 Python 3.10–3.13 的 venv（`~/.omp/ghidra/pyghidra-<版本>/`）。发行包缺本地反编译器时，在受管安装里跑一次 `gradlew --no-daemon buildNatives` 现场编译；失败则伪代码视图退回汇编文本。Ghidra 平台支持：macOS/Linux 的 arm64 与 x64，Windows 仅 x64。

## IDA 与 Binary Ninja 的检测

IDA 检测顺序（`ida/install.ts`）：`ida.installDir` 设置 → `$IDADIR` → 各 `ida-config.json` 的 `Paths.ida-install-dir`（`$IDAUSR` 与 `~/.idapro` 下）→ 标准位置（Linux 为家目录和 `/opt` 下以 `ida` 开头的子目录，macOS 为 `/Applications`，Windows 为 Program Files）。要求目录里有 idalib（Linux 下 `libidalib.so`）。Binary Ninja 检测 `binja.installDir`、`$BN_INSTALL_DIR`、Binary Ninja 自己的 lastrun 记录与默认位置（Linux 下 `~/.binaryninja`、`~/binaryninja`），运行时用 `import binaryninja as b; b.BinaryView.new(b'\x00')` 探测许可证，单个解释器限时 30 秒。

## 为什么经过 Python

OMP 的 TypeScript 主进程跟后端引擎之间只是一条 NDJSON socket：Python worker 先把 Unix socket 或回环 TCP 监听绑好，然后才慢慢起 JVM，OMP daemon 拿 token 连上来收发 `{"id", "method", "params"}` 请求。对 Ghidra，JVM 不是独立进程，是 Python 进程内的一个库：worker 经 jpype 启动 `HeadlessPyGhidraLauncher`，之后所有 Ghidra Java 类（`DecompInterface`、`FlatProgramAPI` 等）都从 Python 经 `jpype.JClass(...)` 直接调用。

选 Python 的理由：三个引擎的官方嵌入 API 全是 Python——IDA 走 Hex-Rays idalib 的 Python 绑定，Binary Ninja 的 headless API 就是 `binaryninja` 这个 Python 模块，Ghidra 的官方 Python 桥是 NSA 自家的 PyGhidra（jpype 打底）。`disasm/backend.ts` 把三个 `worker.py` 当文本资源打进包，三套后端共用同一条宿主代码路径：起 Python 进程、连 socket、说 NDJSON，TypeScript 侧零原生依赖（不碰 JNI、不编译 node 原生模块）。副作用是 `db.exec` 暴露给 agent 的脚本面统一：同一批 helper（`pseudocode`、`xrefs_to`、`functions`、`rename`、`set_type` 等）三个后端都有。

## dsm API 概要

句柄模型：`await dsm.open(path)` 开分析数据库返回 `db`；每次 `open` 或 `dsm.get(id)` 拿一份独立引用，`close()` 只释放自己的引用，最后一个引用释放才真正关库；`dsm.list()` 列出开着的库及其引用计数。视图用 `db.view(...)`（`overview`、`main` 伪代码、`main:asm`、`:imports`、`:exports`、`:strings`、`:xrefs:<func|0xaddr>`），`db.exec("python 代码")` 在后端 worker 里跑 Python，改符号用 `rename`/`comment`/`setType`/`makeFunction`。`db.handle()` 生成可打印句柄，塞进子 agent 上下文后子 agent 用 `dsm.open(handle)` 共享同一份开着的库，同机跨项目有效。开着的数据库在 `omp ps` 里显示为 `IDA …`/`Ghidra …`/`Binary Ninja …`；`disassembler.maxOpen` 默认 4，`disassembler.idleCloseSec` 默认 900。跨后端规则：`.i64`/`.idb` 归 IDA、`.bndb` 归 Binary Ninja，后端不匹配时拒绝打开；可执行文件的改动全部落在数据库里，源二进制永不被修改。

## 本机状态（2026-11-26 实测）

`~/.omp/ghidra/` 三件套就绪：`ghidra_12.2_PUBLIC`（`.omp-ready` 标记 12.2）、`jdk/jdk-25.0.5.1+2`、`pyghidra-3.2.0`；反编译器原生程序 `decompile` 与 `sleigh` 已存在于 `Ghidra/Features/Decompiler/os/linux_x86_64/`，伪代码功能不退回汇编。配置无任何 `disassembler`/`ghidra` 覆盖项，本机无 IDA 安装（`~/.idapro`、`/opt/ida*`、`~/ida*` 均不存在），auto 落 Ghidra，无需任何设置即可用。本机 JDK 重复下载与 `JAVA_HOME` 复用方案见 [OMP 二进制分析的按需依赖安装](dsm-ghidra-provisioning.md)。

## 2026 年版本状态

| 工具 | 当前版本 | 发布日期 | 起步 |
|---|---|---|---|
| IDA Pro | 9.5 | 2026-10-26 | 1996 年起步（Ilfak Guilfanov） |
| Ghidra | 12.2 | 2026-10-22 | 2019-03-05 由 NSA 在 RSA Conference 开源 |
| Binary Ninja | 6.0.10905（Krypton） | 2026-10-20 | 2015 年开发起步，2016-07-31 首发 |

版本状态之外的热度对比是定性判断：Ghidra 免费开源、社区与插件生态规模三者最大，是 agent 工具链零摩擦的默认选择；Binary Ninja 6.0 内置官方 MCP server，商业工具中对 agent 工作流最积极；IDA 9.5 主打 "More Agentic Power"，守住专业恶意软件分析市场。三者市场份额无权威统计。

## 证据边界

- 已核实：后端清单、auto 逻辑、默认值、下载 URL、检测顺序、worker 协议与 JVM 嵌入方式，全部来自已安装包 19.2.1 源码逐行读取；本机目录、natives、配置覆盖、IDA 缺席为命令实测；三工具版本与发布日期来自官方页面检索。
- 未核实：上游 `can1357/oh-my-pi` main 分支是否已有超出 19.2.1 的改动（本地 git checkout 停在 2026-11-13，早于 Ghidra 功能合入，全部证据取自已安装包）；`disassembler.backend = none` 对已装目录复用行为的影响未实测；热度判断为定性，无份额数据支撑。

## See Also

- [OMP 二进制分析的按需依赖安装](dsm-ghidra-provisioning.md)
