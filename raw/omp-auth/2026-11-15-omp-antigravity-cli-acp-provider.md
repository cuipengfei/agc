# OMP `antigravity-cli` provider：ACP 包装形态

> Source: https://github.com/can1357/oh-my-pi（tag `v18.20.2`）
> Collected: 2026-11-15
> Published: Unknown

本文件摘录 OMP 把 Google Antigravity CLI（`agy`）包装成 provider 的官方文档段落与源码关键行。本次未执行登录、未下载 `agy`、未发送任何模型请求。

## 官方 provider 文档（`docs/providers.md` 的 `## Antigravity CLI` 小节）

原文要点逐条抄录：

- 小节标题为 `## Antigravity CLI`，正文首句：`` `antigravity-cli` runs Google's `agy acp` locally. It is separate from the paused direct-OAuth `google-antigravity` provider. ``
- 使用步骤三条：
  - `` 1. Run `/login antigravity-cli` or `omp login antigravity-cli`. ``
  - `` 2. Complete agy's Google sign-in and paste the authorization code or callback URL. ``
  - `` 3. Select, for example, `antigravity-cli/gemini-4-carbon` or `antigravity-cli/claude-sonnet-5-5`. ``
- 二进制获取：`omp downloads agy from Google's release manifests, checks SHA-512, and keeps versioned executables under its data directory (normally ~/.omp/antigravity-cli/bin). It checks for updates at most daily without changing your shell profiles. PI_AGY_PATH selects an existing executable instead. The CLI's IDE-tool transport requires nc (netcat) on PATH.`
- 凭据：`Login exports the resulting OAuth grant into omp's credential store so normal refresh and broker distribution can manage it. The ACP child uses a private, account-scoped native credential file rather than modifying your ordinary agy login.`
- 指令与工具归属：`omp supplies the system prompt and tool schemas through ACP and an IDE MCP bridge. Tool names remain bare in omp; agy presents them to the model as mcp_ide-tools_<name>. The built-in agent prompt and coding tools are removed, but agy's manage_task and MCP resource tools remain internal to agy. Tool execution and approvals for the supplied tools stay with omp.`
- 会话保持：`The transport retains agy's conversation between model steps, including while omp executes a tool. Edits, branches and changed context restore a matching saved turn boundary when possible; otherwise the retained transcript is supplied to a fresh conversation. Native conversations and credentials are local to the machine running inference.`
- 超时：`agy's three-minute MCP timeout means longer tool operations require cancelling its waiting turn and delivering the completed result as a subsequent message.`
- 模型范围：`The bundled roster follows agy 1.5.9's model picker; availability still depends on the signed-in account. ACP supports model and thinking-level selection, but not caller-specified temperature, stop sequences or output-token caps. Token totals arrive at native turn end; intermediate steps report occupied context rather than invented per-step billing. Google's account-policy warning is shown before sign-in.`

## 模型目录（`packages/catalog/src/compat/rules/providers/antigravity-cli.kdl`）

文件头注释原文：

```
// Catalog entry for "antigravity-cli": Google's Antigravity CLI (`agy acp`)
// driven as a local subprocess over the Agent Client Protocol.
```

provider 级声明：

```
provider "antigravity-cli" {
	// `gemini-4-carbon` is the model `agy acp` selects for a new session.
	default-model "gemini-4-carbon"
	// ACP exposes model/effort selection, but no per-request output-token cap.
	preserves-max-output-tokens #false
	// agy executes its control tools internally alongside the IDE MCP tools.
	requires-native-tools #true
```

`seed` 注释说明来源：`The roster agy acp 1.5.9 advertises in session/new config options (orchestrators omitted: they drive agy's own subagents, which this transport replaces). Context windows are the usage_update.size agy reports after session/set_config_option; output caps are the maxOutputTokens agy sends upstream. Plan usage, so no token price.`

七个模型条目：

| model id | name | reasoning | limits | max-tokens |
|---|---|---|---:|---:|
| `gemini-4-carbon` | Gemini 4 Carbon | true | 1048576 | 262144 |
| `gemini-4-argon` | Gemini 4 Argon | true | 1048576 | 65536 |
| `gemini-4-hydrogen` | Gemini 4 Hydrogen | true | 1048576 | 262144 |
| `gemini-3.8-flash` | Gemini 3.8 Flash | true | 1048576 | 65536 |
| `claude-opus-5-5` | Claude Opus 5.5 | true | 1000000 | 128000 |
| `claude-sonnet-5-5` | Claude Sonnet 5.5 | true | 1000000 | 128000 |
| `gpt-oss-120b-medium` | GPT-OSS 120B (Medium) | false | 131072 | 32768 |

所有模型 `cost input=0 output=0 cache-read=0 cache-write=0`，`supports-tools #true`。`gpt-oss-120b-medium` 的注释：`agy exposes no thought level for it: the id pins medium reasoning.`

思考等级：

```
	models "gemini-4-carbon" "gemini-4-argon" "gemini-3.8-flash" "claude-opus-5-5" "claude-sonnet-5-5" {
		thinking-mode "effort"
		thinking-efforts "low" "medium" "high"
		thinking-default-level "medium"
	}
	models "gemini-4-hydrogen" {
		thinking-mode "effort"
		thinking-efforts "low" "medium" "high" "xhigh"
		thinking-default-level "medium"
	}
```

## 专用 agent 定义（`packages/ai/src/providers/antigravity-cli/agent.md`）

全文：

```
---
name: bridge
description: Host-provided system prompt and tools.
mainAgent: true
subagent: false
tools: []
inheritCustomizations: false
excludeDefaultComponents: true
---
```

## ACP 进程启动与超时（`packages/ai/src/providers/antigravity-cli/host.ts`）

文件头注释：

```
/**
 * One stateful agy ACP conversation across omp's per-step stream calls.
 * MCP tool calls park between steps. A deadline cancels and drains the ACP
 * prompt before releasing its MCP response; the actual late result is sent
 * only in a subsequent prompt. Failed drains kill the process and reseed.
 */
```

常量：

```
const AGENT_NAME = "bridge";
const STARTUP_TIMEOUT_MS = 60_000;
const ANNOUNCEMENT_TIMEOUT_MS = 2_000;
// Leave enough time to force-stop a process that never acknowledges cancellation.
const HOLD_LIMIT_MS = 165_000;
const CANCEL_TIMEOUT_MS = 5_000;
const MCP_TOOL_NAME = /\bmcp_ide-tools_(\S+)/;
```

构造器校验原文：

```
		if (
			this.#options.holdLimitMs <= 0 ||
			this.#options.cancelTimeoutMs <= 0 ||
			this.#options.holdLimitMs + this.#options.cancelTimeoutMs >= 180_000
		) {
			throw new Error("Antigravity CLI cancellation must finish before its 180s MCP deadline");
		}
```

启动命令：

```
		const child = Bun.spawn(
			[
				binary,
				"acp",
				"--agent",
				AGENT_NAME,
				"--gemini-dir",
				options.geminiDir,
				"--ide-mcp-port",
				String(bridge.port),
				"--dangerously-skip-permissions",
			],
			{
				cwd: options.cwd,
				stdin: "pipe",
				stdout: "pipe",
				stderr: "ignore",
				env: { ...Bun.env, ...agyCredentialEnv(), AGY_CLI_DISABLE_AUTO_UPDATE: "1" },
			},
		);
```

`nc` 前置检查：

```
	if (!$which("nc")) throw new Error("Antigravity CLI needs nc (netcat) on PATH for its tool bridge");
```

system prompt 传递方式：

```
function systemMeta(system: string): Record<string, unknown> {
	return { antigravity: { systemPrompt: { append: system } } };
}
```

agent 定义落盘位置：

```
async function writeAgentDefinition(geminiDir: string): Promise<void> {
	const file = Bun.file(path.join(geminiDir, "config", "agents", `${AGENT_NAME}.md`));
```

ACP 客户端能力声明：

```
			agy.connection.initialize({
				protocolVersion: 1,
				clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
				clientInfo: { name: "bridge", title: "Host tool bridge", version: "1" },
			}),
```

工具调用只接受已宣告的名字：

```
			case "tool_call": {
				const name = MCP_TOOL_NAME.exec(update.title)?.[1];
```

未登录时的错误映射：

```
	if (error instanceof RequestError && /not logged in|unauthenticated|authentication required/i.test(error.message)) {
		return new Error("Antigravity CLI is not signed in. Run /login and choose Antigravity CLI.");
	}
```

## 二进制获取细节（`packages/ai/src/providers/antigravity-cli/binary.ts`）

文件头注释：`/** Managed agy releases, installed from Google's manifest without running its shell-profile installer. */`

常量：

```
const MANIFEST_BASE_URL = "https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests";
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DOWNLOAD_TIMEOUT_MS = 180_000;
```

目录与覆盖：

```
export function agyGeminiDir(): string {
	return path.join(getAntigravityCliDir(), "gemini");
}

export async function resolveAgyBinary(fetchImpl: FetchImpl = fetch): Promise<string> {
	const override = $env.PI_AGY_PATH;
	if (override) return override;
	return ensureAgyInstalled(path.join(getAntigravityCliDir(), "bin"), fetchImpl);
}
```

校验与解包：

```
			const url = new URL(value.url);
			if (url.protocol !== "https:" || url.hostname !== "storage.googleapis.com") {
				throw new Error("Antigravity CLI manifest did not reference Google's HTTPS release storage");
			}
```

```
				const digest = new Bun.CryptoHasher("sha512").update(payload).digest("hex");
				if (digest !== value.sha512.toLowerCase())
					throw new Error("Antigravity CLI download failed its SHA-512 check");
```

```
					if (url.pathname.endsWith(".tar.gz")) {
						const files = await new Bun.Archive(payload).files();
						const executable = files.get("antigravity");
						if (!executable) throw new Error("Antigravity CLI archive has no antigravity executable");
						await Bun.write(staging, executable);
					} else {
						await Bun.write(staging, payload);
					}
```

平台键：

```
	case "darwin":
			return `darwin_${cpu}`;
		case "win32":
			return `windows_${cpu}`;
		case "android":
			return `android_${cpu}`;
		case "linux": {
			const loader = `/lib/libc.musl-${cpu === "amd64" ? "x86_64" : "aarch64"}.so.1`;
			return `linux_${cpu}${(await Bun.file(loader).exists()) ? "_musl" : ""}`;
		}
```

落盘文件名 `agy`（Windows 为 `agy.exe`）：

```
function releasePath(directory: string, version: string): string {
	return path.join(directory, version, process.platform === "win32" ? "agy.exe" : "agy");
}
```

## Google 官方 CLI 文档

`https://antigravity.google/docs/cli/acp/`：官方章节用 `agy acp` 描述启动 ACP 服务。

`https://antigravity.google/docs/cli/using/`：官方用 `agy` 作为 Antigravity CLI 的启动命令。

## 本机核对（2026-11-15）

- `~/.omp/antigravity-cli/bin` 目录不存在（`if test -d` 判定输出 `managed binary directory absent`）。
- `nc` 在 PATH 上存在（`command -v nc` 有输出）。
- `~/.omp/agent/config.yml` 的 `enabledModels` 列表未包含 `antigravity-cli/*`。
- 本机 `omp --version` 为 `18.20.2`。

## 未验证项

- Google 后端实际收到的完整 system prompt、工具 schema 内容与各部分 token 占用。
- 真实登录、`agy` 下载、ACP 会话与模型请求。
- `excludeDefaultComponents` 在 Google 侧对最终 prompt 的实际裁剪结果。
