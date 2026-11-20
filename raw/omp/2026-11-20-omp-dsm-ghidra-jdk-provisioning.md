# OMP 二进制分析的按需依赖安装（Ghidra、JDK、PyGhidra）

> Source: OMP 工具说明 `omp://tools/dsm.md` 与 `xd://eval/dsm`；已安装包 `@oh-my-pi/pi-coding-agent` 的 `src/ghidra/install.ts`；本机 `dpkg-query`、`update-alternatives`、目录占用与子代理会话记录
> Collected: 2026-11-20
> Published: Unknown

## 两个入口的差别

工具说明（`omp://tools/dsm.md`）原文：

```
- Bare `read <binary>` (ELF/PE/Mach-O, extensionless included) and bare `read <db>.i64`/`.idb` return on-disk metadata only. They never open a database or provision a backend. The footer lists the explicit analysis selectors and points to `xd://eval/dsm`, or says analysis is disabled.
```

`xd://eval/dsm` 原文：

```
- Bare `read <binary>` shows on-disk Mach-O/ELF/PE metadata only; it never opens an analysis database or downloads a backend.
```

```
- Ghidra may provision Ghidra, a JDK, PyGhidra, and native tools on first analysis. An installation-in-progress error means it continues; retry later.
```

同一文档的查找与懒安装说明：

```
- Ghidra install lookup: `ghidra.installDir` (Ghidra 12+), else `$GHIDRA_INSTALL_DIR`, else Homebrew prefixes, else a managed download of Ghidra 12.2 under the omp data dir. A JDK 25+ comes from `JAVA_HOME` or a managed Temurin JDK 25 download. `ghidra.python` overrides the interpreter (must import `pyghidra`); otherwise a managed venv is built from the install's bundled wheels. Provisioning is lazy: it happens on first analysis, never on bare reads.
```

因此在 `read` 路径上，`:overview`、`:strings`、`:imports` 这类分析视图与 `dsm.open(...)` 会进入分析流程；裸路径只返回元数据。

## 本次触发记录

子代理会话记录中的首次调用：

```
read(/home/cpf/.local/bin/herdr:overview)
```

返回：

```
Ghidra is still being installed (downloading JDK 25: 60/141 MB); it continues in the background. Retry later.
```

随后对同一二进制的 `:strings` 调用仍返回安装进行中：

```
Ghidra is still being installed (downloading Ghidra 12.2: 361/570 MB); it continues in the background. Retry later.
```

调用方没有专门申请安装依赖；安装由首次分析触发。本次调查不需要该分析即可继续。

## JDK 选择逻辑

`src/ghidra/install.ts` 的公开入口只检查 `JAVA_HOME`：

```ts
/** Use JAVA_HOME when it is JDK 25+, otherwise provision and reuse a managed Temurin JDK 25. */
export async function ensureJdk(): Promise<string> {
	status = "locating JDK 25";
	try {
		const environment = $env.JAVA_HOME?.trim();
		if (environment && (await isSuitableJdk(environment))) return path.resolve(environment);
```

适用性判定读 `release` 文件，要求主版本号不小于 25：

```ts
async function isSuitableJdk(home: string): Promise<boolean> {
	const release = await optionalText(path.join(home, "release"));
	const version = release?.match(/^JAVA_VERSION="(\d+)(?:[.\-+"_])/m);
	return (
		!!version &&
		Number(version[1]) >= 25 &&
		Bun.file(path.join(home, "bin", process.platform === "win32" ? "java.exe" : "java")).exists()
	);
```

管理目录中的候选由 `managedJdk` 扫描，要求存在就绪标记并通过同一判定：

```ts
		const existing = await managedJdk(jdkRoot);
		if (existing) return existing;
		const release = await latestJdkRelease();
```

固定安装版本：

```ts
export const GHIDRA_RELEASE = {
	version: "12.2",
	tag: "Ghidra_12.2_build",
	asset: "ghidra_12.2_PUBLIC_20261016.zip",
```

下载源为 Adoptium 的最新 25 版接口：

```ts
	const response = await fetch(
		`https://api.adoptium.net/v3/assets/latest/25/hotspot?architecture=${arch}&image_type=jdk&os=${os}&vendor=eclipse`,
```

代码中不读取 `PATH` 里的 `java`，也不查询系统 alternatives。

## 本机既有 JDK

```
JAVA_HOME=<unset>

java in PATH:
/usr/bin/java
/usr/lib/jvm/zulu25-ca-amd64/bin/java
openjdk version "25.0.5.1" 2026-11-17 LTS
OpenJDK Runtime Environment Zulu25.38+201-CA (build 25.0.5.1+2-LTS)
OpenJDK 64-Bit Server VM Zulu25.38+201-CA (build 25.0.5.1+2-LTS, mixed mode, sharing)

Registered Java installations:
/usr/lib/jvm/java-21-openjdk-amd64/bin/java
/usr/lib/jvm/zulu25-ca-amd64/bin/java
```

即已装 Zulu 25.0.5.1，版本满足要求。

## 实际下载的 JDK

管理目录中的 `release` 文件头部：

```
IMPLEMENTOR="Eclipse Adoptium"
IMPLEMENTOR_VERSION="Temurin-25.0.5.1+2"
JAVA_RUNTIME_VERSION="25.0.5.1+2-LTS"
JAVA_VERSION="25.0.5.1"
```

与既有 Zulu 的主版本、次版本、补丁号一致：`25.0.5.1`。差异只在发行方。

## 占用

```
1.2G	/home/cpf/.omp/ghidra
885M	/home/cpf/.omp/ghidra/ghidra_12.2_PUBLIC
305M	/home/cpf/.omp/ghidra/jdk
2.8M	/home/cpf/.omp/ghidra/pyghidra-3.2.0
697M	/home/cpf/.omp/agent/ghidra-projects
```

目录创建时间 2026-11-20 19:56:39，Ghidra 目录 20:06:03，PyGhidra 环境 20:06:10。

## 浏览器依赖的对照

本次隔离实验使用本机已有的 Chromium，安装记录：

```
chromium	156.0.8078.73-1xtradeb1.2604.1
2026-11-07 20:28:18 install chromium:amd64 <none> 156.0.8078.73-1xtradeb1.2604.1
```

Playwright 来自既有 Bun 缓存 `playwright-core@1.65.1@@@1`（文件时间 2026-11-16），本次未执行 `playwright install`。即浏览器侧没有新增下载，Ghidra 侧有。

## 结论边界

- 已核实：裸读不安装、分析视图会安装；JDK 只按 `JAVA_HOME` 与自管目录查找；本机因此下载了第二份 25.0.5.1。
- 未核实：安装是否可通过 `disassembler.backend=none` 之外的配置阻止；本机未测试该开关对已安装目录的复用行为。
