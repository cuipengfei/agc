# OMP dsm 三后端、获取方式与 Python worker 架构（源码摘录）

> Source: 已安装包 `@oh-my-pi/pi-coding-agent` 19.2.1 源码（`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/` 下 `src/disasm/backend.ts`、`src/disasm/settings.ts`、`src/disasm/active.ts`、`src/ghidra/install.ts`、`src/ghidra/platform.ts`、`src/ghidra/worker.py`、`src/ida/install.ts`、`src/binja/install.ts`、`src/binja/runtime.ts`、`src/binja/settings.ts`、`src/prompts/tools/dsm.md`、`CHANGELOG.md`，及 `@oh-my-pi/pi-utils/src/dirs.ts`、`dist/types/ghidra/install.d.ts`）；本机 2026-11-26 命令输出
> Collected: 2026-11-26
> Published: Unknown

版本确认：

```
$ jq -r '.version' package.json
19.2.1
```

## 后端清单（disasm/backend.ts）

```ts
/** Every backend id; handle hosts, unit params and eval arguments validate against this list. */
export const DISASM_BACKEND_IDS = ["ida", "ghidra", "binja"] as const;
```

```ts
/** Backend-specific paths, worker sources, and interruption mechanisms; no settings dependencies. */
export const DISASM_BACKENDS: Record<DisasmBackendId, DisasmBackend> = {
	ida: {
		id: "ida",
		label: "IDA",
		storeDir: "idbs",
		databaseExt: ".i64",
		databaseName: name => `${name}.i64`,
		isDatabasePath: p => {
			const ext = path.extname(p).toLowerCase();
			return ext === ".i64" || ext === ".idb";
		},
		workerScript: idaWorker,
		workerStageDir: "omp-ida-worker",
		interrupt: "signal",
		projectAlias: false,
		unpackedExt: ".id0",
	},
	ghidra: {
		id: "ghidra",
		label: "Ghidra",
		storeDir: "ghidra-projects",
		databaseExt: ".gpr",
		databaseName: () => "omp.gpr",
		isDatabasePath: () => false,
		workerScript: ghidraWorker,
		workerStageDir: "omp-ghidra-worker",
		interrupt: "frame",
		projectAlias: true,
	},
	binja: {
		id: "binja",
		label: "Binary Ninja",
		storeDir: "bndbs",
		databaseExt: ".bndb",
		databaseName: name => `${name}.bndb`,
		isDatabasePath: p => path.extname(p).toLowerCase() === ".bndb",
		workerScript: binjaWorker,
		workerStageDir: "omp-binja-worker",
		interrupt: "signal",
		projectAlias: false,
	},
};
```

三个 worker 脚本都以文本资源打进包（backend.ts 头部）：

```ts
import binjaWorker from "../binja/worker.py" with { type: "text" };
import ghidraWorker from "../ghidra/worker.py" with { type: "text" };
import idaWorker from "../ida/worker.py" with { type: "text" };
```

## auto 选择逻辑（disasm/active.ts）

```ts
/**
 * Order `auto` tries backends in; the first available one serves. Binary Ninja is opt-in: an
 * install does not show whether its licence allows headless use, so ahead of Ghidra it would turn
 * `auto` into an error for everyone whose licence does not.
 */
const AUTO_ORDER: readonly DisasmBackendId[] = ["ida", "ghidra"];
```

```ts
		if (choice === "none") return undefined;
		// Ghidra is provisioned on first analysis, so it is available wherever its platform is supported.
		const available: Record<DisasmBackendId, boolean> = {
			ida: ida !== undefined,
			ghidra: ghidraHostSupported(),
			binja: binja !== undefined,
		};
		// An explicit choice never falls back to another backend.
```

## backend 设置注册（disasm/settings.ts）

```ts
export const cfgDisassembler = register({
	id: "disassembler.backend",
	type: "enum",
	values: ["auto", "ghidra", "ida", "binja", "none"] as const,
	default: "auto",
	ui: {
		tab: "tools",
		group: "Available Tools",
		label: "Disassembler",
		description:
			"Backend for analysis selectors in read and eval's dsm namespace; bare executable reads show metadata only. Auto uses IDA Pro when installed, else Ghidra (downloaded on first analysis); Binary Ninja is used only when selected",
		options: [
			{
				value: "auto",
				label: "Auto",
				description: "IDA Pro when an install with idalib is found, otherwise Ghidra; never Binary Ninja",
			},
			{
				value: "ghidra",
				label: "Ghidra",
				description:
					"Ghidra via PyGhidra; provisions Ghidra 12.2, a JDK 25 and PyGhidra on first analysis when not installed",
			},
			{
				value: "ida",
				label: "IDA Pro",
				description: "IDA Pro via idalib; analysis disabled when no install is found",
			},
			{
				value: "binja",
				label: "Binary Ninja",
				description:
					"Binary Ninja via its headless Python API (needs a headless-capable licence); never chosen by Auto; analysis disabled when no install is found",
			},
			{ value: "none", label: "None", description: "Executable metadata only; analysis disabled" },
		],
	},
});
```

```ts
export const cfgDisasmMaxOpen = register({
	id: "disassembler.maxOpen",
	type: "number",
	default: 4,
```

```ts
export const cfgDisasmIdleCloseSec = register({
	id: "disassembler.idleCloseSec",
	type: "number",
	default: 900,
```

## Ghidra 固定版本（dist/types/ghidra/install.d.ts）

```ts
/** Pinned release whose PyGhidra and Java APIs are supported by the worker. */
export declare const GHIDRA_RELEASE: {
    readonly version: "12.2";
    readonly tag: "Ghidra_12.2_build";
    readonly asset: "ghidra_12.2_PUBLIC_20261016.zip";
    readonly sha256: "2c2cd776db3c1f6a097ba418922378ac3649cadd5e844a6f5f088ae628a7be67";
    readonly dirName: "ghidra_12.2_PUBLIC";
};
```

## Ghidra 下载与就绪标记（ghidra/install.ts）

```ts
async function installManagedGhidra(root: string, installDir: string): Promise<void> {
	const archive = path.join(root, `${GHIDRA_RELEASE.asset}.part`);
	let temporary: string | undefined;
	try {
		await withDownload(`Ghidra ${GHIDRA_RELEASE.version}`, async tracker => {
			status = `downloading Ghidra ${GHIDRA_RELEASE.version}`;
			await downloadFile(
				`https://github.com/NationalSecurityAgency/ghidra/releases/download/${GHIDRA_RELEASE.tag}/${GHIDRA_RELEASE.asset}`,
				archive,
				{ timeoutMs: 30 * 60_000, onProgress: downloadProgress(`Ghidra ${GHIDRA_RELEASE.version}`, tracker) },
			);
			tracker.update({ detail: "verifying checksum" });
			await verifyChecksum(archive, GHIDRA_RELEASE.sha256, "Ghidra");
			status = "extracting Ghidra";
			tracker.update({ detail: "extracting" });
			temporary = await fs.mkdtemp(path.join(root, ".extract-"));
			await extractArchive({ path: archive, format: "zip" }, temporary, ARCHIVE_OPTIONS);
			const extracted = path.join(temporary, GHIDRA_RELEASE.dirName);
			if (!(await isGhidraInstall(extracted)))
				throw new DisasmUnavailableError("Ghidra archive has no Ghidra 12+ install with PyGhidra");
			await fs.rm(installDir, { recursive: true, force: true });
			await fs.rename(extracted, installDir);
			await Bun.write(path.join(installDir, READY_MARKER), `${GHIDRA_RELEASE.version}\n`);
		});
```

就绪标记为 `.omp-ready`（`const READY_MARKER = ".omp-ready";`）。组装后的完整下载 URL：

```
https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_12.2_build/ghidra_12.2_PUBLIC_20261016.zip
```

Ghidra 本体缺失时的原生反编译器构建（只发生在受管安装内，每进程一次）：

```ts
		const result = await $`${path.join(installDir, "support", "gradle", "gradlew")} --no-daemon buildNatives`
			.cwd(path.join(installDir, "support", "gradle"))
			.env(workerEnvFromParent({ JAVA_HOME: javaHome, GRADLE_USER_HOME: path.join(root, "gradle") }))
			.quiet()
			.nothrow();
```

## Ghidra 查找顺序（ghidra/install.ts 的 ensureGhidraInstall）

```ts
		const explicit = configured?.trim();
		if (explicit) {
			const dir = path.resolve(explicit);
			if (await isGhidraInstall(dir)) return dir;
			throw new DisasmUnavailableError(`ghidra.installDir ${dir} is not a Ghidra 12+ install with PyGhidra`);
		}
		const environment = $env.GHIDRA_INSTALL_DIR?.trim();
		if (environment && (await isGhidraInstall(environment))) return path.resolve(environment);
		for (const prefix of ["/opt/homebrew", "/usr/local", "/home/linuxbrew/.linuxbrew"]) {
			const dir = path.join(prefix, "opt", "ghidra", "libexec");
			if (await isGhidraInstall(dir)) return dir;
		}
		if (!ghidraHostSupported())
			throw new DisasmUnavailableError(`Ghidra does not support ${process.platform}/${process.arch}`);
```

## JDK 查找与 Adoptium 下载（ghidra/install.ts）

```ts
/** Use JAVA_HOME when it is JDK 25+, otherwise provision and reuse a managed Temurin JDK 25. */
export async function ensureJdk(): Promise<string> {
	status = "locating JDK 25";
	try {
		const environment = $env.JAVA_HOME?.trim();
		if (environment && (await isSuitableJdk(environment))) return path.resolve(environment);
```

```ts
async function latestJdkRelease(): Promise<JdkRelease> {
	const os = process.platform === "darwin" ? "mac" : process.platform === "win32" ? "windows" : "linux";
	const arch = process.arch === "arm64" ? "aarch64" : "x64";
	status = "locating JDK 25 download";
	const response = await fetch(
		`https://api.adoptium.net/v3/assets/latest/25/hotspot?architecture=${arch}&image_type=jdk&os=${os}&vendor=eclipse`,
		{ headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(30_000) },
	);
```

`isSuitableJdk` 读 `release` 文件，要求主版本号 ≥ 25 且存在 `bin/java`：

```ts
async function isSuitableJdk(home: string): Promise<boolean> {
	const release = await optionalText(path.join(home, "release"));
	const version = release?.match(/^JAVA_VERSION="(\d+)(?:[.\-+"_])/m);
	return (
		!!version &&
		Number(version[1]) >= 25 &&
		Bun.file(path.join(home, "bin", process.platform === "win32" ? "java.exe" : "java")).exists()
	);
}
```

PyGhidra 虚拟环境只装 Python 3.10–3.13，位置在 `getGhidraDir()` 下：

```ts
/** Provision a Python 3.10–3.13 venv using only an installation's bundled PyGhidra wheels. */
export async function ensurePyGhidraVenv(installDir: string): Promise<string> {
```

```ts
					{
						dir: path.join(getGhidraDir(), `pyghidra-${version}`),
						marker: READY_MARKER,
						key: `${version}\n${installDir}`,
						python: { min: "3.10", below: "3.14" },
```

## 平台支持（ghidra/platform.ts）

```ts
/** Whether a host has a supported Ghidra/JDK platform; installation is lazy. */
export function ghidraHostSupported(
	platform: NodeJS.Platform = process.platform,
	arch: NodeJS.Architecture = process.arch,
): boolean {
	return (
		((platform === "darwin" || platform === "linux") && (arch === "arm64" || arch === "x64")) ||
		(platform === "win32" && arch === "x64")
	);
}
```

## IDA 检测（ida/install.ts，只检测不下载）

```ts
const IDALIB =
	process.platform === "darwin" ? "libidalib.dylib" : process.platform === "win32" ? "idalib.dll" : "libidalib.so";
```

```ts
	const candidates = [$env.IDADIR, ...configuredInstallDirs(), ...defaultInstallDirs()];
	return candidates.find((dir): dir is string => !!dir && hasIdalib(dir));
```

Linux 默认位置：

```ts
		default:
			return [...childDirs(os.homedir(), "ida"), ...childDirs("/opt", "ida")];
```

`configuredInstallDirs()` 读每个 `ida-config.json` 的 `Paths.ida-install-dir`（`$IDAUSR` 与 `~/.idapro` 下）。

## Binary Ninja 检测与许可证探测（binja/）

核心库文件名（binja/install.ts）：

```ts
		platform === "darwin"
			? "libbinaryninjacore.dylib"
			: platform === "win32"
				? "binaryninjacore.dll"
				: "libbinaryninjacore.so.1";
```

Linux 默认位置 `~/.binaryninja` 与 `~/binaryninja`；Windows 为 `Program Files\Vector35\BinaryNinja` 等三处；无安装时的报错原文（binja/runtime.ts）：

```
Binary Ninja unavailable: no install with the core library found (binja.installDir, $BN_INSTALL_DIR, lastrun, default install locations).
```

许可证在导入 `binaryninja` 时由核心检查（binja/runtime.ts）：

```ts
export const BINJA_PROBE = "import binaryninja as b; b.BinaryView.new(b'\\x00')";

/** How long one interpreter gets to start the core; a licence server that never answers must not hang analysis. */
export const BINJA_PROBE_TIMEOUT_MS = 30_000;
```

设置项（binja/settings.ts）：`binja.installDir`（空为自动检测）、`binja.python`（指定能 import `binaryninja` 的 Python 3 解释器）。

## worker 协议与 JVM 嵌入（ghidra/worker.py）

文件头注释（协议原文）：

```
"""omp Ghidra worker: drives one PyGhidra program over an NDJSON socket protocol.

Launched as `worker.py --socket PATH` (Unix socket) or `worker.py --port-file PATH` (loopback TCP;
the bound port is written to PATH). The omp daemon connects, sends `{"token": $OMP_DISASM_WORKER_TOKEN}`
as its first line, then speaks:

Request:  {"id": int, "method": str, "params": dict}
Response: {"id", "ok": true, "result", "dirty"} | {"id", "ok": false, "error": {"type", "message"}}

A dropped connection does not close the program: the daemon reconnects after a restart. With no
connection for `_ORPHAN_S` the worker saves and exits.
"""
```

监听先于慢速 JVM 启动绑定；然后导入 jpype 与 pyghidra：

```python
import jpype  # noqa: E402
import pyghidra  # noqa: E402
from pyghidra.launcher import HeadlessPyGhidraLauncher  # noqa: E402
```

JVM 在 Python 进程内启动：

```python
    launcher = HeadlessPyGhidraLauncher(install_dir=Path(os.environ["GHIDRA_INSTALL_DIR"]))
    launcher.add_vmargs("-Xrs")
    launcher.start()
```

Ghidra Java 类经 `jpype.JClass` 取用（节选）：

```python
    TaskMonitorAdapter = jpype.JClass("ghidra.util.task.TaskMonitorAdapter")
    ProjectLocator = jpype.JClass("ghidra.framework.model.ProjectLocator")
    FlatProgramAPI = jpype.JClass("ghidra.program.flatapi.FlatProgramAPI")
    DecompInterface = jpype.JClass("ghidra.app.decompiler.DecompInterface")
```

## dsm 工具说明关键行（src/prompts/tools/dsm.md）

```
The `dsm` object exists in JavaScript and Python Eval; it is not a standalone tool. `disassembler.backend` selects IDA, Ghidra, or Binary Ninja.
```

```
- Start analysis explicitly with `await dsm.open(path)` or a `read` analysis selector: `binary:overview`, `binary:<func|0xaddr>`, `binary:<func>:asm`, `:imports`, `:exports`, `:strings`, `:xrefs:<func|0xaddr>`.
```

```
- Ghidra may provision Ghidra, a JDK, PyGhidra, and native tools on first analysis. An installation-in-progress error means it continues; retry later.
```

```
- `dsm.open(path)` accepts an executable, a universal slice reference (`./binary:@arm64`), an existing IDA `.i64`/`.idb` (IDA active), an existing Binary Ninja `.bndb` (Binary Ninja active), or a portable string returned by `db.handle()`; Ghidra project paths do not open in place.
```

```
- Executables are analyzed in managed databases; source binaries are never modified. IDA `.i64`/`.idb` and Binary Ninja `.bndb` files open in place. A database file owned by another backend is rejected; switch `disassembler.backend` to its owner.
```

```
- Every `open` or `get` owns one independent reference. `close()` releases only that reference; the final release closes the database.
```

```
- `db.handle()` returns a printable reference bound to this live database incarnation. Pass that exact string in a child's task/context; the child MUST `await dsm.open(handle)` and close its returned handle in `finally`. Keep the parent's reference until the children finish.
```

```
- Databases appear in `omp ps` labelled `<Backend label> <ref>` (`IDA …`, `Ghidra …`, `Binary Ninja …`); unit ids are UUIDs.
```

```
- `disassembler.maxOpen` bounds databases across all backends; unreferenced idle databases may be evicted or closed by `disassembler.idleCloseSec`.
```

## 安装位置（@oh-my-pi/pi-utils/src/dirs.ts）

```ts
/** Get managed Ghidra installs, JDK, PyGhidra venv and Gradle cache (~/.omp/ghidra). */
export function getGhidraDir(): string {
	return dirs.rootSubdir("ghidra", "data");
}
```

## CHANGELOG 摘录（pi-coding-agent CHANGELOG.md）

```
- Moved binary analysis from the standalone `ida` and `ghidra` tools into the backend-neutral `dsm` namespace (`xd://eval/dsm`).
```

```
- Replaced the `ida.enabled`, `ida.maxOpen`, and `ida.idleCloseSec` settings with `disassembler.backend`, `disassembler.maxOpen`, and `disassembler.idleCloseSec`; shared disassembler database APIs are now available under `@oh-my-pi/pi-coding-agent/disasm`.
```

```
- Added Ghidra support with automatic setup of Ghidra, JDK, and PyGhidra when analysis is explicitly requested; Auto mode uses an installed IDA Pro when available and otherwise falls back to Ghidra.
```

## 本机实测（2026-11-26）

```
$ ls ~/.omp/ghidra/
775  ghidra_12.2_PUBLIC/
775  jdk/
775  pyghidra-3.2.0/
600  install.lock  0B
600  pyghidra-3.2.0.install.lock  0B
```

```
$ cat ~/.omp/ghidra/ghidra_12.2_PUBLIC/.omp-ready
12.2
```

```
$ ls ~/.omp/ghidra/jdk/
jdk-25.0.5.1+2/
```

```
$ ls ~/.omp/ghidra/ghidra_12.2_PUBLIC/Ghidra/Features/Decompiler/os/linux_x86_64/
decompile  sleigh
```

```
$ echo "JAVA_HOME=$JAVA_HOME"
JAVA_HOME=
$ java -version
openjdk version "25.0.5.1" 2026-11-17 LTS
OpenJDK Runtime Environment Zulu25.38+201-CA (build 25.0.5.1+2-LTS)
```

配置覆盖检查（`~/*.json` 与 `~/.omp/agent/*.json` 均 grep `disassembler|ghidra` 无匹配，exit=1）；IDA 检测（`~/.idapro`、`/opt/ida*`、`~/ida*` 均不存在，exit=2）。本机 git checkout `~/code-inside/oh-my-pi` 停在 2026-11-13（commit 6e374adc76aeed920c5f3ff2674d1c9e3002bcbd），早于 Ghidra 功能合入，本文件证据全部来自已安装包 19.2.1。
