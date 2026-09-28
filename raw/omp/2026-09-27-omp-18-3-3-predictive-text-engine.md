# OMP 18.3.3 predictive text engine changelog and settings source

> Source: ~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/CHANGELOG.md (local file, no URL); src/modes/settings.ts; src/predict/smollm-weights.ts; src/predict/daemon.ts; src/predict/client.ts
> Collected: 2026-09-27
> Published: 2026-09-27 (changelog entry date for 18.3.3)

## CHANGELOG.md 18.3.3 段落原文

位置：CHANGELOG.md 第 27-60 行。

### Added

- Added a unified predictive text engine with N-gram, SmolLM2, and macOS native providers, including cross-engine blending, background model downloads, and a cross-process prediction daemon.
- Added the `omp predict` command for evaluating completion performance and support for ingesting existing Claude Code and Codex prompt histories to bootstrap predictions on new installations.
- Added `omp skill list [dir] [--json]` to report skills resolved for a session directory, including discovery warnings in JSON output.
- Added a centralized progress display for background tool and model downloads, including support for downloading the SmolLM2-135M word-completion model.
- Added dynamic evaluation guidance through hidden session notices.
- Added a required `complexity` rationale to the `task` tool to improve automatic thinking-depth selection.
- Agents using `task` or `bash` now receive the `wait` tool for background-process coordination, and subagents can receive it when explicitly requested.
- Added context-aware suggestions to empty composers based on agent activity and effort.
- Added optional global or per-project memory scopes to the `retain` and `learn` tools when Mnemopi scoping is enabled.
- Added `/btw` to focused subagent views for asking questions about that agent's transcript with separate side-conversation history.

### Changed

- Completion behavior now uses the N-gram engine for standard `auto` completion across platforms, with blended N-gram and SmolLM confidence scoring where applicable; the SmolLM2 model uses a 145 MB GGUF (Q8_0) download and is prefetched only when explicitly activated.
- Updated `spelling.autocomplete` to use an enum-based engine configuration.
- Completion ghost text is now preserved through manual keystrokes.
- Window input actions now default to background execution; set `takeover: true` to opt into foreground activation, with clarified cross-platform coordinate and activation behavior.
- `omp tiny-models download` can now download the word-completion model.
- Updated `/play` help, read-tool summaries, platform-aware shortcut labels, and other UI hints for clearer interaction guidance.
- Updated the empty-submit behavior to account for live-steered messages and surface pending live-steering status in the UI.
- `ps --all` now includes exited global services, while the default view shows live global services.
- Orchestrator task documentation now follows a Target/Change/Acceptance format.
- Slash-command and hint usage tracking is now persistent and namespaced.

### Fixed

- Preserved MCP `structuredContent` in live tool-result details so evaluation callers can consume server data without reparsing model-facing JSON; spilled results continue to retain an artifact reference without duplicating the payload in session history.
- Fixed Collab hosts becoming unable to reclaim a room after a brief network interruption; hosts now retry room recovery without losing guests or queued updates.
- Fixed one-shot commands that stopped before completing, such as `omp config set` on a fresh Windows profile, incorrectly exiting successfully without output; they now report failure with diagnostic guidance.

## src/modes/settings.ts: spelling.autocomplete 定义

位置：settings.ts 第 874-885 行。

```ts
export const cfgSpellingAutocomplete = register({
	id: "spelling.autocomplete",
	type: "enum",
	values: WORD_COMPLETION_METHODS,
	default: "auto",
	ui: {
		tab: "interaction",
		group: "Input",
		label: "Word Autocomplete",
		get description() {
			return `Show predicted word completions as inline hints: ${formatKeyHint("tab")} accepts with a space, ${formatKeyHint("right")} without`;
		},
```

WORD_COMPLETION_METHODS 定义于 pi-tui/src/prompt/word-completion.ts 第 7 行：

```ts
export const WORD_COMPLETION_METHODS = ["off", "auto", "ngram", "smollm", "apple"] as const;
```

第 9 行注释：`/** Configured word-completion engine; `off` disables ghost text. */`

第 20 行注释：`/** Asynchronous engine behind ghost-text word completion (coding-agent: the text-prediction daemon). */`

## src/modes/settings.ts: autocompleteMaxVisible 定义

位置：settings.ts 第 841-849 行。

```ts
export const cfgAutocompleteMaxVisible = register({
	id: "autocompleteMaxVisible",
	type: "number",
	default: 10,
	ui: {
		tab: "interaction",
		group: "Input",
		label: "Autocomplete Items",
		description: "Max visible items in autocomplete dropdown (3-20)",
```

## src/predict/smollm-weights.ts: SmolLM2 权重下载清单

位置：smollm-weights.ts 第 1-38 行（文件头注释与常量）。

文件头注释原文：

```
On-demand weights for the `smollm` word-completion engine
(`pi_predict::smollm`): the SmolLM2-135M base checkpoint (Apache-2.0), every
file pinned to one repo revision and verified by size and SHA-256.

Format: `config.json` and `tokenizer.json` from the upstream repo, and the
weights as llama.cpp's `Q8_0` GGUF export (145 MB; 32 weights per 8-bit
block with an f16 scale) from QuantFactory/SmolLM2-135M-GGUF, which both
decoders run as stored. Provenance, checked against the upstream bf16
`model.safetensors` (269 MB): every `Q8_0` block is byte-identical to
quantizing it (after llama.cpp's q/k row permutation, which the loader
undoes) and the F32 norms are equal, so replay quality matches the bf16
research runs.

Layout follows the tiny-model cache: `<tiny-models>/predict/<org>--<name>/`,
a cross-process install lock next to it, `.part` downloads renamed into
place, and a ready marker listing the pinned digests so a warm start is one
read and an install of other files (e.g. the bf16 weights) reads as not ready.
```

常量（第 35-38 行）：

```ts
const SMOLLM_REPO = "HuggingFaceTB/SmolLM2-135M";
const SMOLLM_REVISION = "93efa2f097d58c2a74874c7e644dbc9b0cee75a2";
const GGUF_REPO = "QuantFactory/SmolLM2-135M-GGUF";
const GGUF_REVISION = "d948db3614be18259a175aafd7689a70f1cb4e2f";
```

SMOLLM_FILES 数组（第 52-75 行）：

```ts
const SMOLLM_FILES: readonly WeightFile[] = [
	{ repo: SMOLLM_REPO, revision: SMOLLM_REVISION, name: "config.json", size: 704,
	  sha256: "1d556eab73b69c7f11f64c557a2f9c6f440bd4c6b89bb2584a6b498c92603843" },
	{ repo: SMOLLM_REPO, revision: SMOLLM_REVISION, name: "tokenizer.json", size: 2_104_556,
	  sha256: "9ca9acddb6525a194ec8ac7a87f24fbba7232a9a15ffa1af0c1224fcd888e47c" },
	{ repo: GGUF_REPO, revision: GGUF_REVISION, name: "SmolLM2-135M.Q8_0.gguf", size: 144_810_464,
	  sha256: "b761d9ccdfce67726e41ca2ef30e9dfbcf6a32ca2aaef47df5c049ec362d04cd" },
];
```

## src/predict/daemon.ts: daemon 行为描述

位置：daemon.ts 第 1-11 行（文件头注释）。

```
Server half of the machine-global text-prediction daemon (worker selector
`__omp_worker_text_predict`, started through the `text-predict` global broker).

Lazily opens one `TextPredictor` per requested engine, keeps each learning
engine current with `history.db` (rows past a persisted row-id cursor, on
open and on every `sync`), persists on a debounce and on exit, and exits
after an idle window. A learning engine that starts from empty state first
learns the Claude Code and Codex prompt histories (`foreign-history.ts`).
`smollm` requests are answered by SmolLM and ngram together (`blend.ts`).
Engine state that fails to load is wiped and rebuilt the same way.
```

关键常量（第 34-41 行）：

```ts
const IDLE_EXIT_MS = 15 * 60_000;
const PERSIST_DEBOUNCE_MS = 30_000;
const INGEST_BATCH = 1_000;
const OPEN_RETRY_MS = 60_000;
```

第 17 行：`import { type PredictedWord, TextPredictor } from "@oh-my-pi/pi-natives";`

## src/predict/client.ts: daemon spawn 参数

位置：client.ts 第 144-185 行。

```ts
async function ensureDaemon(agentDir: string): Promise<DaemonConnection> {
	// ...
	await broker.request({
		// ...
		spec: {
			restart: "no",
			persist: false,
			detached: false,
		},
	});
```

## src/subprocess/worker-client.ts: worker spawn 命令与 Bun.spawn

resolveWorkerSpawnCmd 函数（第 169-178 行）：

```ts
export function resolveWorkerSpawnCmd(workerArg: string): WorkerSpawnCommand {
	const executable = resolveExecutablePath();
	if (isCompiledBinary()) return { cmd: [executable, workerArg] };
	const hostEntry = workerHostEntry();
	if (hostEntry) {
		return { cmd: [executable, hostEntry, workerArg] };
	}
	const packageRoot = path.resolve(import.meta.dir, "..", "..");
	return { cmd: [executable, "src/cli.ts", workerArg], cwd: packageRoot };
}
```

Bun.spawn 调用（第 272-281 行）：

```ts
const proc = Bun.spawn({
	cmd: options.spawnCommand.cmd,
	cwd: options.spawnCommand.cwd,
	detached: options.detached,
	env: options.env,
	stdin: "ignore",
	stdout: "ignore",
	stderr: stderrCapture.target,
	serialization: "advanced",
	windowsHide: true,
```
