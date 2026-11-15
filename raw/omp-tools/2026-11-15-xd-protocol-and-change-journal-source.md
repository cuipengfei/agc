# OMP xd:// 虚拟协议三类入口与选择性提交 ChangeJournal：本机源码与实测摘录

> Source: 本机安装包 ~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/、omp/agent/config.yml 与当前会话 artifacts 目录直读
> Collected: 2026-11-15
> Published: Unknown（本机安装版本）

本文档摘录 OMP `xd://` 虚拟协议路由、文档主题注册、常驻动作设备、discoverable 动态工具设备，以及 `commit.draft()` 所依赖的 `ChangeJournal`（`changes.jsonl` + `blobs/`）源码与本机实测输出。

## 1. src/internal-urls/xd-protocol.ts — XdProtocolHandler（22-140）

```ts
const NOT_MOUNTED = "xd:// is not mounted in this session.";

function deviceWriteTier(
	url: InternalUrl,
	content: string | undefined,
	session: ToolSession | undefined,
): ToolApprovalDecision {
	try {
		const target = parseXdUrl(url.rawHref ?? url.href);
		const name = target?.name;
		if (name === REPORT_ISSUE_DEVICE_NAME) return "write";
		if (name && isResolutionDeviceName(name)) return "read";
		const inst = name && session?.xdev ? resolveXdevTool(session.xdev, name) : undefined;
		if (!name || !inst) return "exec";
		if (typeof content !== "string") return "exec";
		const parsed: unknown = JSON.parse(content);
		if (!isRecord(parsed)) return "exec";
		return { tier: resolveToolTier(inst, parsed), policyKey: inst.name };
	} catch {
		return "exec";
	}
}

/** Routes session-bound virtual tool devices through `xd://` URLs. */
export class XdProtocolHandler implements ProtocolHandler {
	readonly scheme = "xd";
	readonly spec: SchemeSpec = {
		backing: "device",
		selectors: "none",
		immutable: true,
		compactTranscript: true,
		write: { via: "handler", payload: "text", scope: "device", tier: deviceWriteTier },
	};

	async resolve(url: InternalUrl, context?: ResolveContext): Promise<InternalResource> {
		const session = context?.session;
		if (!session) throw new ToolError(NOT_MOUNTED);
		const topic = parseXdTopicUrl(url.href);
		const device = topic ? null : parseXdUrl(url.href);
		let content: string;
		if (topic) content = this.#topic(session, topic.name, topic.topic);
		else if (device) content = this.#usage(session, device.name);
		else throw new ToolError(`Invalid xd:// URL: ${url.href}. Use xd://, xd://<tool>, or xd://<tool>/<topic>.`);
		return { url: url.href, content, contentType: "text/plain", size: Buffer.byteLength(content) };
	}

	async write(url: InternalUrl, content: string, context?: WriteContext): Promise<InternalWriteResult> {
		const target = parseXdUrl(url.href);
		if (!target) throw new ToolError(`Invalid xd:// URL: ${url.href}. Use xd://<tool>.`);
		const session = context?.session;
		if (!session) throw new ToolError(NOT_MOUNTED);
		const { name } = target;
		if (name === REPORT_ISSUE_DEVICE_NAME) {
			const { result, xdev } = await dispatchReportIssueDevice(session, content);
			return { content: result.content, details: { xdev }, isError: result.isError, useless: result.useless };
		}
		if (name && isResolutionDeviceName(name)) {
			const { result, xdev } = await dispatchResolutionDevice(session, name, content);
			return { content: result.content, details: { xdev }, isError: result.isError, useless: result.useless };
		}
		const xdev = session.xdev;
		if (!xdev) throw new ToolError(NOT_MOUNTED);
		if (!name) throw new ToolError(`Cannot write to xd:// itself — pick a device:\n${xdevListing(xdev)}`);
		const toolCall = context.toolCall;
		if (!toolCall) throw new ToolError(`xd://${name} can only be written by the write tool.`);
		const xdevPolicyKey = resolveXdevTool(xdev, name)?.name ?? name;
		const { result, xdev: dispatch } = await dispatchXdevTool(
			xdev,
			name,
			content,
			toolCall.id,
			context.signal,
			toolCall.onUpdate,
			toolCall.context ? { ...toolCall.context, xdevPolicyKey } : undefined,
		);
		return {
			content: result.content,
			details: { xdev: dispatch },
			isError: result.isError,
			useless: result.useless,
		};
	}

	/** `read xd://` listing, or one device's usage/docs. */
	#usage(session: ToolSession, name: string | null): string {
		if (name === REPORT_ISSUE_DEVICE_NAME) return reportIssueDeviceUsage();
		if (name && isResolutionDeviceName(name)) return resolutionDeviceUsage(name);
		const xdev = session.xdev;
		if (!xdev) throw new ToolError(NOT_MOUNTED);
		return name === null ? xdevListing(xdev) : xdevDocs(xdev, name);
	}

	/** `read xd://<tool>/<topic>`: one named doc topic of a tool. */
	#topic(session: ToolSession, name: string, topic: string): string {
		const topics = session.getToolByName?.(name)?.docTopics?.();
		if (!topics) throw new ToolError(`Tool '${name}' has no doc topics.`);
		const doc = topics[topic];
		if (doc === undefined) {
			throw new ToolError(`Unknown topic '${topic}' for ${name}. Available: ${Object.keys(topics).join(", ")}.`);
		}
		return doc;
	}
}
```

## 2. src/tools/xdev.ts — 顶层保留集合与挂载判定（59-97）

```ts
export const XDEV_KEEP_TOP_LEVEL: Record<string, true> = {
	todo: true,
	yield: true,
	ask: true,
	grep: true,
	web_search: true,
};

export const XDEV_TRANSPORT_TOOLS: Record<string, true> = { read: true, write: true };

/** Controls which mounted-device docs are inlined into the system prompt. */
export type XdevDocsMode = "inline" | "builtins" | "catalog";

export function isMountableUnderXdev(tool: { name: string; loadMode?: ToolLoadMode }): boolean {
	if (tool.name in XDEV_TRANSPORT_TOOLS || tool.name in XDEV_KEEP_TOP_LEVEL) return false;
	return tool.loadMode === "discoverable";
}

export function docTopicsReadable(session: Pick<ToolSession, "isToolActive">): boolean {
	return session.isToolActive?.("read") !== false;
}
```

## 3. src/tools/resolve.ts — 常驻特殊决议设备（41-64）

```ts
/** The plain-text resolution device URLs (`xd://resolve`, …). */
export const RESOLVE_DEVICE_PATH = `${XD_URL_PREFIX}${RESOLVE_DEVICE_NAME}`;
export const REJECT_DEVICE_PATH = `${XD_URL_PREFIX}${REJECT_DEVICE_NAME}`;
export const PROPOSE_DEVICE_PATH = `${XD_URL_PREFIX}${PROPOSE_DEVICE_NAME}`;

export const PREVIEW_PENDING_NOTICE = `Staged as a proposal — files NOT modified yet. To apply: write a one-sentence reason to ${RESOLVE_DEVICE_PATH}. To discard: write to ${REJECT_DEVICE_PATH}.`;

/** One-line usage string returned by `read xd://<device>` — the only "docs" these devices carry. */
export function resolutionDeviceUsage(device: ResolutionDeviceName): string {
	switch (device) {
		case RESOLVE_DEVICE_NAME:
			return `Write a one-sentence reason as plain text to ${RESOLVE_DEVICE_PATH} to APPLY the pending staged action (e.g. a tool preview).`;
		case REJECT_DEVICE_NAME:
			return `Write a one-sentence reason as plain text to ${REJECT_DEVICE_PATH} to DISCARD the pending staged action (e.g. a tool preview).`;
		case PROPOSE_DEVICE_NAME:
			return `Write your plan's <slug> (matching local://<slug>-plan.md) as plain text to ${PROPOSE_DEVICE_PATH} to submit the plan for approval. Valid only while plan mode is active.`;
	}
}
```

## 4. src/tools/read.ts 与 src/tools/eval.ts — docTopics() 注册点

`src/tools/read.ts:1264-1275`：

```ts
	/**
	 * `xd://read/sources`: selector reference for the sources the description only names.
	 * `xd://read/urls`: internal-URL grammar the system prompt's one-line entries leave out.
	 */
	docTopics(): Record<string, string> {
		return {
			sources: prompt.render(readSourcesDoc, { BINARY_VIEWS: cfgIdaAvailable.get(this.session.settings) }),
			urls: InternalUrlRouter.instance()
				.reference()
				.map(line => `- ${line}`)
				.join("\n"),
		};
	}
```

`src/tools/eval.ts:231-247`：

```ts
/**
 * On-demand eval docs (`topic → markdown`) served at `xd://eval/<topic>`:
 * `judge` (including completion), `helpers`, `agents` (when spawning is allowed),
 * and one per enabled prelude.
 */
export function getEvalDocTopics(options: EvalToolDescriptionOptions = {}): Record<string, string> {
	const context = evalTemplateContext(options);
	const topics: Record<string, string> = {
		judge: prompt.render(evalJudgeTopic, context),
		helpers: prompt.render(evalHelpersTopic, context),
	};
	if (context.spawns) topics.agents = prompt.render(evalAgentsTopic, context);
	for (const prelude of options.preludes ?? []) {
		const doc = prelude.documentation.trim();
		if (doc) topics[prelude.name] = doc;
	}
	return topics;
}
```

## 5. src/sdk.ts 与 src/tools/settings.ts — 5 个内建 eval prelude 及默认开关

`src/sdk.ts:2826-2855`：

```ts
		let browserPrelude: EvalPreludeDefinition | undefined;
		let computerPrelude: EvalPreludeDefinition | undefined;
		let ratchetPrelude: EvalPreludeDefinition | undefined;
		let archivePrelude: EvalPreludeDefinition | undefined;
		let commitPrelude: EvalPreludeDefinition | undefined;
		const getEvalPreludes = (): readonly EvalPreludeDefinition[] => {
			if (restrictToolNames || !toolRegistry.has("eval") || !activeToolNames.has("eval")) return [];
			const builtins: EvalPreludeDefinition[] = [];
			if (cfgBrowserEnabled.get(settings)) {
				browserPrelude ??= createBrowserPrelude(toolSession);
				builtins.push(browserPrelude);
			}
			if (cfgComputerEnabled.get(settings)) {
				computerPrelude ??= createComputerPrelude(toolSession);
				builtins.push(computerPrelude);
			}
			if (cfgRatchetEnabled.get(settings)) {
				ratchetPrelude ??= createRatchetPrelude(toolSession);
				builtins.push(ratchetPrelude);
			}
			if (cfgArchiveEnabled.get(settings)) {
				archivePrelude ??= createArchivePrelude(toolSession);
				builtins.push(archivePrelude);
			}
			if (cfgCommitEnabled.get(settings)) {
				commitPrelude ??= createCommitPrelude(toolSession);
				builtins.push(commitPrelude);
			}
			return getEnabledEvalPreludes(builtins);
		};
```

`src/tools/settings.ts:705-741` 默认值：

- `ratchet.enabled`：`default: false`（`/ratchet` 可为当前会话开启）
- `archive.enabled`：`default: true`
- `commit.enabled`：`default: true`

本机 `omp/agent/config.yml` 相关行：

- 第 116 行：`xdev: false`（位于 `tools:` 下）
- 第 479 行：`computer.enabled: false`
- 第 484 行：`archive.enabled: true`
- 第 486 行：`ratchet.enabled: true`
- 第 504 行：`browser.enabled: false`

## 6. src/commit/selective/journal.ts — ChangeJournal 持久化实现（1-80, 211-234）

```ts
/**
 * Append-only record of which agent changed which file, shared by a root session and its subagents.
 *
 * The journal lives beside the session artifacts (`<artifacts>/changes.jsonl`, content blobs under
 * `<artifacts>/blobs/`). Subagents adopt the root's artifact manager, so one journal covers the
 * whole agent tree. Edit tools append a {@link ChangeRecord} per write; shell-like tools append a
 * {@link CallRecord} per call so changes made by scripts can be traced to a call window; the
 * selective commit flow appends a {@link CommitRecord} per commit it creates.
 *
 * `draft.ts` reads the journal to preselect an agent's own lines when committing.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { isEnoent, isRecord, logger } from "@oh-my-pi/pi-utils";

/** Journal file name inside the artifacts directory. */
const JOURNAL_FILE = "changes.jsonl";
/** Blob directory name inside the artifacts directory. */
const BLOB_DIR = "blobs";
/** Larger snapshots are not stored; their file is treated as unrecorded. */
const MAX_BLOB_BYTES = 8 * 1024 * 1024;

/** Identity of the agent a record belongs to. */
export interface JournalAgent {
	/** Registry id (`Main`, `AuthLoader`). */
	agent: string;
	/** Parent agent id; absent for the root agent. */
	parent?: string;
}

/** One write of a file by an agent's edit tool. Blobs are keys into the journal's blob store. */
export interface ChangeRecord extends JournalAgent {
	type: "change";
	/** Epoch ms when the write landed. */
	at: number;
	/** Tool that wrote (`edit`, `write`, `ast_edit`, `task`). */
	tool: string;
	/** Absolute path. */
	path: string;
	/** Content before the write; `null` when the file did not exist; `undefined` when not stored (too large). */
	before: string | null | undefined;
	/** Content after the write; `null` when the write deleted the file; `undefined` when not stored. */
	after: string | null | undefined;
	/** The file's mtime just before the write; locates whoever changed it since the agent's previous write. */
	beforeMtimeMs?: number;
}

/** One shell-like tool call (`bash`, `eval`); files modified inside its window may be the agent's. */
export interface CallRecord extends JournalAgent {
	type: "call";
	tool: string;
	/** Epoch ms when the call started. */
	start: number;
	/** Epoch ms when the call returned. */
	end: number;
	/** One-line description (command head, cell title). */
	label: string;
}

/** A commit created by the selective commit flow. */
export interface CommitRecord extends JournalAgent {
	type: "commit";
	at: number;
	sha: string;
	/** Repo-relative paths the commit changed. */
	paths: string[];
}
```

```ts
	async #append(record: JournalRecord): Promise<void> {
		await this.#ensureDir();
		await fs.appendFile(path.join(this.dir, JOURNAL_FILE), `${JSON.stringify(record)}\n`);
	}

	async #ensureDir(): Promise<void> {
		if (this.#dirReady) return;
		await fs.mkdir(path.join(this.dir, BLOB_DIR), { recursive: true });
		this.#dirReady = true;
	}

	/** Store `content` content-addressed; `null` passes through, oversized content yields `undefined`. */
	async #storeBlob(content: string | null): Promise<string | null | undefined> {
		if (content === null) return null;
		const bytes = Buffer.from(content, "utf8");
		if (bytes.byteLength > MAX_BLOB_BYTES) return undefined;
		const key = `${bytes.byteLength.toString(36)}-${Bun.hash(bytes).toString(36)}`;
		if (this.#storedBlobs.has(key)) return key;
		await this.#ensureDir();
		await Bun.write(path.join(this.dir, BLOB_DIR, key), Bun.gzipSync(bytes));
		this.#storedBlobs.add(key);
		return key;
	}
```

## 7. 本次会话实测的 changes.jsonl 与 blobs/ 样本

会话 artifacts 目录：`~/.omp/agent/sessions/-code-inside-agc/2026-11-15T04-47-06-877Z_01a1dd87-cc7d-72dd-bbb3-a981f7ae0540/`

`changes.jsonl` 中的三类记录实测样本：

```json
{"type":"call","agent":"Main","tool":"eval","start":1794718111788,"label":"获取文章内容","end":1794718113621}
{"type":"change","at":1794720275322,"agent":"Main","tool":"write","path":"/home/cpf/code-inside/agc/raw/software-factory/2026-11-12-verification-engineering-distort.md","before":null,"after":"7re-ymzrimfnhtdi"}
{"type":"change","at":1794720445424,"agent":"Main","tool":"edit","path":"/home/cpf/code-inside/agc/wiki/log.md","before":"6bnt-lf1huxejp7e5","after":"6d07-13j68975fx6lc","beforeMtimeMs":1794718281058.336}
{"type":"commit","at":1794720582332,"agent":"Main","sha":"a451355eb834c889786ff1b0f4e69ad69404a350","paths":["raw/omp/2026-11-15-markdown-heading-rendering-source.md","raw/software-factory/2026-11-12-verification-engineering-distort.md","raw/software-factory/2026-11-15-lauren-tan-monthly-pr-counts.md","wiki/index.md","wiki/log.md","wiki/omp/markdown-heading-rendering.md","wiki/software-factory/factory-gate-reference.md","wiki/software-factory/verification-engineering-levels-of-done.md"]}
```

同目录 `blobs/` 下的压缩快照文件样本：`6d07-13j68975fx6lc`、`6bnt-lf1huxejp7e5`、`2b2a-1o9dtesxzko0r`、`7re-ymzrimfnhtdi` 等。
