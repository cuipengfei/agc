# OMP 子 agent 工作区隔离与 ovnfs 接入：源码与官方文档摘录

> Source: https://github.com/can1357/oh-my-pi （packages/coding-agent/src/task/settings.ts、task/ovnfs.ts、ovnfs/client.ts、ovnfs/daemon.ts、ovnfs/search.ts、task/isolation-runner.ts、task/worktree.ts、prompts/system/system-prompt.md、docs/tools/task.md；crates/pi-iso/src/lib.rs、overlayfs.rs、rcopy.rs；crates/pi-shell/src/git/guard.rs）；本机 OMP 18.18.1 安装与运行环境
> Collected: 2026-11-08
> Published: Unknown

## task/settings.ts

```ts
export const cfgTaskIsolationEnabled = register({
	id: "task.isolation.enabled",
	protocolDefault: ["rpc", "acp"],
	type: "boolean",
	default: false,
	ui: {
		tab: "tasks",
		group: "Isolation",
		label: "Allow Isolated Subagents",
		description: "Allow per-task isolation with `isolated: true`; tasks without it run in the shared checkout",
	},
});
```

`isolation.backend`：

```ts
export const cfgIsolationBackend = register({
	id: "isolation.backend",
	type: "enum",
	values: ["auto", "apfs", "btrfs", "zfs", "reflink", "overlayfs", "projfs", "block-clone", "rcopy"] as const,
	default: "auto",
```

auto 选项描述原文：

> Isolated subagents use ovnfs checkouts when ovnfs is found; otherwise (and for worktrees) the PAL picks the best available backend

`ovnfs.path`：

```ts
export const cfgOvnfsPath = register({
	id: "ovnfs.path",
	type: "string",
	default: undefined,
```

描述原文：

> ovnfs executable; unset looks for `ovnfs` on PATH. When it is found, ovnfs checkouts (copy-on-write views of a folder, ready in about a second at any size) serve every separate copy: the system prompt tells agents to open checkouts instead of git worktrees or copies, and isolated subagents (when allowed, with `isolation.backend` on auto) run in checkouts instead of native clones

判定函数：

```ts
export function ovnfsCommand(settings: Settings): string | undefined {
	const command = cfgOvnfsPath.get(settings)?.trim() || "ovnfs";
	return $which(command) ? command : undefined;
}
```

注释原文：

> Read by the system prompt (checkout guidance), the bash git guard, `grep`/`glob` (searches through the daemon), and the task runner (ovnfs-backed isolation when `isolation.backend` is auto).

`task.isolation.apply` 默认 `true`，描述原文：

> Automatically apply successful isolated task changes to the parent checkout; disable to retain patch or branch artifacts

`task.isolation.merge` 默认 `patch`，取值 `patch` / `branch`。

`worktree.base` 描述原文：

> Base directory for agent-managed worktrees — task-isolation copies, `github` PR checkouts, and `omp worktree` cleanup all live here. Unset uses ~/.omp/wt.

`bash.gitGuard`：

```ts
export const cfgBashGitGuard = register({
	id: "bash.gitGuard",
	type: "boolean",
	default: false,
	ui: { ... label: "Refuse git commands that discard or move shared work (`bash.gitGuard`)" ... },
});
```

## prompts/system/system-prompt.md:147-157

```md
{{#if ovnfs}}
{{#has tools "bash"}}
# Separate checkouts
Need a second copy of a folder (risky experiment, another branch, tests or review beside the user's work)? MUST use an ovnfs checkout, not `git worktree add`, `git clone` or `cp -r`, unless the user asks for those:
- `cd <folder> && {{ovnfs}} new --name <name>` prints the checkout's path in about a second at any size; `<name>`: lowercase `a-z0-9._-`. The checkout is the folder as it is now (uncommitted edits, untracked files, `node_modules`/build dirs); writes stay in the checkout; git works inside, commits stay in its private git dir.
- Add `--rev <rev>` to start tracked files and index at a commit or branch, without the folder's in-flight edits (e.g. to verify your patch); ignored build dirs stay.
- Work in the printed path; git commands that discard changes run inside a checkout, saving discarded changes first.
- Back to the folder: `{{ovnfs}} diff <name> [-p]` lists changes; `{{ovnfs}} apply <name> [--dry-run]` merges them into the folder as uncommitted edits, reporting conflicts; `{{ovnfs}} apply <name> --branch <b>` makes the checkout's commits branch `<b>`, folder untouched.
- Done: `{{ovnfs}} rm <name>`; `{{ovnfs}} ls` lists checkouts.
{{/has}}
{{/if}}
```

## task/ovnfs.ts

文件头注释原文：

> ovnfs checkouts as isolated subagent workspaces, used when `isolation.backend`
> is auto and the ovnfs binary is found.
>
> Instead of cloning the repository, an isolated run works in an ovnfs checkout: a
> copy-on-write view of the repository served by the ovnfs daemon, ready in
> milliseconds once the daemon has captured the folder, with its own private git
> dir. The checkout's capture is the state the run started from, so no baseline
> is taken when it opens: its patch is ovnfs's `diff` against that capture, and a
> branch commit reads its baseline from a second checkout on the same capture
> (`new {base}`), opened only then. A repository with nested repos or
> submodules, or a daemon without those features, gets the runner's ordinary
> baseline instead. The checkout is removed when the run ends (or kept, like a
> native workspace, when its changes could not be captured).
>
> `ovnfs start --json` makes sure the daemon runs and reports its admin
> socket; checkouts are then opened (`new`) and removed (`rm`) over that socket

```ts
const START_FEATURES = ["new.base", "diff.binary"];
```

失败语义原文：

> Failures say what is wrong with ovnfs; there is no silent fallback to native isolation.

checkout 记录：

```ts
export const OVNFS_CHECKOUT_FILE = ".omp-ovnfs-checkout.json";
```

## ovnfs/client.ts

```ts
/** The ovnfs admin protocol generation this client speaks. */
export const PROTOCOL_VERSION = 5;
```

协议原文：

> The protocol frames JSON objects with a little-endian u32 length: the client
> says `{"hello": {...}}` and gets `{"welcome": {version, ops, ...}}`, then each
> `{"id": N, "<op>": {args}}` is answered by `{"id": N, "ok": reply}` or
> `{"id": N, "error": {code, message}}`, in any order.

## ovnfs/daemon.ts

```ts
/** How long `status` finding no daemon is believed before the command is asked again. */
const RECHECK_MS = 10_000;

/** How long `status` may run before it is killed and treated as no daemon. */
const STATUS_TIMEOUT_MS = 5_000;
```

注释原文：

> Only the command says where its daemon is: `ovnfs --json start` and
> `ovnfs --json status` both print api.Status. Nothing is read from the mount
> itself; a path is the daemon's to serve when it lies below its mount.

## ovnfs/search.ts

文件头注释原文：

> `grep` and `glob` that answer through the ovnfs daemon when the search root
> lies in an ovnfs mount, and through `@oh-my-pi/pi-natives` otherwise.
>
> ... a root below that mount is
> searched by the daemon in the checkout's overlay, in-process, instead of
> paying a kernel round trip per file. Any daemon failure (not reachable, op
> unknown, arguments rejected) falls back to the native search with the same
> arguments; an abort or timeout does not, and cancels the daemon's search.

## task/isolation-runner.ts

生命周期注释原文：

> 1. ... prepare ...
> 2. `runIsolatedSubprocess` — start worktree, capture its baseline, run, capture changes, and transfer cleanup ownership.
> 3. `mergeIsolatedChanges` — apply captured changes back to the parent repo (skip when the caller opted out).

捕获入口原文：

> Kept-alive runs retain the isolation handle through idle/parked lifecycle
> transitions, then capture final changes and clean up on release. One-shot
> and failed startup paths clean up in `finally`. If captured changes cannot
> be written to disk, the workspace is retained under a unique `.retained-*`
> sibling and its path is named in the resulting error.

patch 模式应用原文：

```ts
// Patch mode: apply the patch from a successful run. A failed or
// aborted run has nothing to apply and must not block the result.
const succeeded = result.exitCode === 0 && !result.error && !result.aborted;
```

```ts
await repo.applyPatch(normalized, {});
```

补丁文件：

```ts
const patchPath = path.join(artifactsDir, `${agentId}.patch`);
```

嵌套仓库补丁：

```ts
const nestedPatchPaths = await persistNestedPatches(artifactsDir, agentId, delta.nestedPatches);
```

kept-alive 跳过重复提交：

```ts
/** Fingerprint of a delta already handed to the caller at run end; release only re-captures on change. */
let handedOff: bigint | number | undefined;
```

分支模式：

```ts
const branchName = `omp/task/${opts.agentId}`;
```

## task/worktree.ts

```ts
await natives.isoStart(candidate, repoRoot, mergedDir);
// Sever the isolation's git metadata from the source checkout. Copy
// backends duplicate `repoRoot`'s `.git` verbatim — a linked-worktree
// pointer file (or the rcopy `git worktree add` registration) leaves
// ...
// frozen repo that still borrows the source object DB via alternates.
await detachSubmodules(repoRoot, mergedDir);
await vcs.detachGitDir(mergedDir, sourceCommonDir);
```

## docs/tools/task.md

流程第 9 步原文：

> If `isolated`, it requires a git repo ... and opens the run's workspace (`openWorkspace`): by default it maps `isolation.backend` to a backend-kind hint (`parseIsolationBackend`) and materializes the workspace via the natives PAL (`nativeWorkspace` → `ensureIsolation` → `isoResolve`/`isoStart`), walking the candidate list when a backend is unavailable; when `isolation.backend` is `auto` and ovnfs is found (`ovnfsCommand`), it opens an ovnfs checkout instead (`ovnfsWorkspace`, `task/ovnfs.ts`).

隔离段落原文：

> **ovnfs** (active whenever the binary is found — `ovnfs.path`, default `ovnfs` on PATH): the system prompt gains a "Separate checkouts" section telling agents to open ovnfs checkouts (`ovnfs new`, `diff`, `apply`, `rm`) instead of `git worktree add`, `git clone` or `cp -r`. When `task.isolation.enabled` also allows isolated tasks and `isolation.backend` is `auto`, each isolated subagent works in an ovnfs checkout — a copy-on-write view of the repo with a private git dir, served by the ovnfs daemon — instead of a native clone. omp runs `ovnfs --json start` to make sure the daemon runs and learn its admin socket, then opens (`new`) and removes (`rm`) one checkout per run over that Unix socket. Capture, merge and apply are the same as for native workspaces. The run's task-isolation dir records the checkout (`.omp-ovnfs-checkout.json`) so `omp worktree clear` removes checkouts of crashed runs; a checkout whose changes could not be captured is kept like a native workspace. Without the binary, isolation stays native; once ovnfs is found there is no fallback: if it fails, the isolated task fails and says so.

限制原文：

> Isolation baseline: each repository's uncommitted snapshot is capped at `1 GiB` (`ISOLATION_BASELINE_MAX_CONTENT_BYTES` in `task/worktree.ts`). Oversized snapshots fail before spawning rather than buffering unbounded content.
>
> Concurrency: `task.maxConcurrency` defaults to `32`; `0` means unlimited.

## crates/pi-iso/src/lib.rs

后端枚举原文：

> `Apfs`, `Btrfs`, `Zfs`, `LinuxReflink`, `Overlayfs`, `WindowsBlockClone`, `Projfs`, `Rcopy`（`Rcopy`：`git worktree` when `lower` is a git repo, otherwise plain recursive copy. Always available; the universal fallback.）

Linux 自动顺序：

```rust
#[cfg(target_os = "linux")]
const LINUX_AUTO_ORDER: &[BackendKind] = &[
	BackendKind::Btrfs,
	BackendKind::Zfs,
	BackendKind::LinuxReflink,
	BackendKind::Overlayfs,
	BackendKind::Rcopy,
];
```

`resolve` 优先级原文：

> 1. If `preferred` is `Some` and its probe reports `available`, use it as-is.
> 2. Otherwise walk `auto_order`, skipping `preferred` if present.
> 3. `BackendKind::Rcopy` is the final automatic candidate and is expected to be available on every platform.

## crates/pi-iso/src/overlayfs.rs

探测原文：

```rust
pub fn probe() -> ProbeResult {
	if kernel_overlay_supported() || FUSE_OVERLAYFS.load(Ordering::Relaxed) {
		return ProbeResult::available();
	}
	let fuse_runs = Command::new("fuse-overlayfs") ...
	ProbeResult::unavailable(
		"overlay filesystem unavailable: kernel `overlay` module missing and `fuse-overlayfs` \
		 not on PATH",
	)
}
```

`kernel_overlay_supported` 读取 `/proc/filesystems` 判断 `overlay` 是否存在。

## crates/pi-iso/src/rcopy.rs

```rust
//! Cross-platform fallback isolation: git worktree, or plain recursive copy.
//!
//! When `lower` is a git working tree, `start` materializes `merged` via
//! `git worktree add --detach <merged> HEAD`.
```

## crates/pi-shell/src/git/guard.rs

启用条件原文：

> Opt-in: active only when `PI_GIT_GUARD` is truthy in the session or process
> environment (the coding agent sets it from its `bash.gitGuard` setting).
> `PI_GIT_GUARD_OVNFS` supplies the ovnfs command for separate-checkout hints.

共享检出拒绝清单原文：

> - `stash`, except the read-only `stash list` and `stash show` and `stash create`, which writes only an object;
> - `reset --hard`, and `reset` to a commit other than HEAD's;
> - `switch`, and `checkout` of a branch or commit;
> - `checkout` of paths and working-tree `restore`, unless a merge, rebase, cherry-pick, or revert is underway ...

私有检出原文：

> An ovnfs checkout (marked by repository-local `ovnfs.checkout`), a linked worktree (`git worktree add`) of a repository with a main checkout, and a submodule inside either belong to one line of work. There every command runs, except that `stash pop` ... and a command that discards uncommitted changes first records them on `DISCARDED_REF`'s reflog ...

提示语：

```rust
const OWN_WORKTREE: &str = "In a worktree of your own (git worktree add <path> [<branch>]) it \
                            runs, and uncommitted changes it would discard are saved first.";
```

有 ovnfs 时替换为：

> In an ovnfs checkout of your own ({command} new --name <name>) it runs, and uncommitted changes it would discard are saved first.

## 本机证据（2026-11-08）

- `omp --version`：`omp/18.18.1`；安装目录 `dist/types/ovnfs/client.d.ts`、`daemon.d.ts`、`search.d.ts`、`task/ovnfs.d.ts` 存在。
- `~/.omp/agent/config.yml`：`bash.gitGuard: false`（第 426 行）；`task.isolation` 下 `apply: true`、`merge: patch`、`commits: generic`、`enabled: false`（第 534-538 行）。
- `command -v ovnfs`：无输出（未安装）。
- `stat -f -c %T /home/cpf/code-inside/agc`：`ext2/ext3`。
- `/proc/filesystems` 含 `nodev\toverlay`。
- `unshare -Ur true` 成功；`unshare -Urm` 内 `mount -t overlay overlay -o lowerdir=...,upperdir=...,workdir=... merged` 成功（`overlay-ok`）。
- `command -v fusermount3`：`/usr/bin/fusermount3`；`command -v fuse-overlayfs`：无输出。
- `git --version`：`git version 2.53.0`。
- `~/.local/bin` 存在且已在 PATH。
- 未执行 OMP 隔离子 agent 的实际运行，overlay 在 OMP 内部是否一次走通未验证。
