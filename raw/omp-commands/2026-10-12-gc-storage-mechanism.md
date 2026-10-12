# OMP gc 存储垃圾回收机制（源码 + dry-run + apply 实测）

> Source: oh-my-pi 仓库 `packages/coding-agent/src/cli/gc-cli.ts` + `gc-settings.ts` 源码直读；本机 `omp gc --help`、`omp gc --json`、`omp gc --apply --json`、`omp gc --stale --apply --json` 输出直采（v18.10.1）
> Collected: 2026-10-12
> Published: 2026-10-12

## omp gc --help 输出（v18.10.1）

```
Run storage garbage collection

USAGE
  $ omp gc [FLAGS]

FLAGS
      --apply                          Apply changes (default is dry-run)
      --json                           Output JSON
      --agent-dir=<value>              Agent directory to maintain
      --blobs                          Sweep unreferenced blobs
      --archive                        Archive cold sessions
      --wal                            Checkpoint history/model database WAL files
      --stale                          Prune dangling session markers/breadcrumbs and old debug reports and collab replicas
      --cold-archive-after-days=<int>  Minimum session age before archiving
      --retain-newest-global=<int>     Always keep this many newest sessions active
      --retain-newest-per-cwd=<int>    Always keep this many newest sessions per cwd active
      --stale-retain-newest=<int>      Always keep this many newest debug reports and collab replicas
      --stale-retain-days=<int>        Minimum debug report/collab replica age before pruning
```

## gc-settings.ts 默认值（源码直读）

```typescript
export const cfgGcBlobs = register({ id: "gc.blobs", type: "boolean", default: true });
export const cfgGcArchive = register({ id: "gc.archive", type: "boolean", default: true });
export const cfgGcWal = register({ id: "gc.wal", type: "boolean", default: true });
export const cfgGcColdArchiveAfterDays = register({ id: "gc.coldArchiveAfterDays", type: "number", default: 30 });
export const cfgGcRetainNewestGlobal = register({ id: "gc.retainNewestGlobal", type: "number", default: 20 });
export const cfgGcRetainNewestPerCwd = register({ id: "gc.retainNewestPerCwd", type: "number", default: 10 });
// Opt-in: unlike the other phases it deletes user-visible files (debug reports,
// collab replicas), so an unqualified `omp gc --apply` leaves them alone.
export const cfgGcStale = register({ id: "gc.stale", type: "boolean", default: false });
export const cfgGcStaleRetainNewest = register({ id: "gc.staleRetainNewest", type: "number", default: 20 });
export const cfgGcStaleRetainDays = register({ id: "gc.staleRetainDays", type: "number", default: 30 });
```

## gc-cli.ts 关键常量（源码直读，行号对应 v18.10.1）

```typescript
const BLOB_FILE_RE = /^([a-f0-9]{64})(?:\.[A-Za-z0-9][A-Za-z0-9._-]{0,31})?$/;
const BLOB_REF_RE = /\bblob:sha256:([a-f0-9]{64})\b/gi;
const ACTIVE_STATUSES: ReadonlySet<SessionStatus> = new Set(["pending", "interrupted", "unknown"]);
const DAY_MS = 86_400_000;
const GC_WRITE_GRACE_MS = 5 * 60_000;
const SESSION_SUFFIX = ".jsonl";
const COMPRESSED_SESSION_SUFFIX = ".jsonl.gz";
const STALE_POINTER_GRACE_MS = DAY_MS;
```

## 归档目录解析（源码直读 gc-cli.ts:274-276）

```typescript
function getArchivedSessionsDir(agentDir: string): string {
	return path.join(path.dirname(getSessionsDir(agentDir)), "archive", "sessions");
}
```

默认 `getSessionsDir()` 返回 `~/.omp/agent/sessions`，因此 `getArchivedSessionsDir()` 返回 `~/.omp/agent/archive/sessions`。

## runBlobGc 函数（源码直读 gc-cli.ts:557-596）

```typescript
async function runBlobGc(options: ResolvedGcOptions, archiveSessionsRoot: string): Promise<BlobGcResult> {
	const blobDir = getBlobsDir(options.agentDir);
	const sessionsRoot = getSessionsDir(options.agentDir);
	const defaultRoots = [sessionsRoot, archiveSessionsRoot];
	const exactSessionFiles = new Map<string, string>();
	for (const file of await collectRegisteredSessionFiles(getCustomSessionFilesDir(options.agentDir))) {
		exactSessionFiles.set(normalizePathForComparison(file), file);
	}
	for (const file of await collectBreadcrumbSessionFiles(getTerminalSessionsDir(options.agentDir))) {
		exactSessionFiles.set(normalizePathForComparison(file), file);
	}
	const referenced = await collectReferencedBlobHashes(defaultRoots, [...exactSessionFiles.values()]);
	const { candidates, staging } = await collectBlobCandidates(blobDir);
	// ...
	const deleteBeforeMs = Date.now() - GC_WRITE_GRACE_MS;
	for (const candidate of candidates) {
		if (referenced.has(candidate.hash)) continue;
		if (candidate.mtimeMs > deleteBeforeMs) continue;
		// ...
	}
	// staging files (killed/crashed writers)
	for (const file of staging) {
		if (file.mtimeMs > deleteBeforeMs) continue;
		// ...
	}
	return result;
}
```

blob 引用扫描覆盖范围：活跃会话目录 `sessions/`、归档会话目录 `archive/sessions/`、custom-session-files marker 指向的会话文件、terminal-sessions breadcrumb 指向的会话文件。扫描 `.jsonl`、`.jsonl.gz`、`.jsonl.*.bak` 三种文件。引用格式为 `blob:sha256:<64-hex>`。

## runArchiveGc 函数（源码直读 gc-cli.ts:1673-1746）

```typescript
async function runArchiveGc(options: ResolvedGcOptions, archiveRoot: string): Promise<ArchiveGcResult> {
	const sessionsRoot = getSessionsDir(options.agentDir);
	const sessions = await listActiveSessions(sessionsRoot);
	const cutoffMs = Date.now() - options.coldArchiveAfterDays * DAY_MS;
	// ...
	const archiveBeforeMs = Date.now() - GC_WRITE_GRACE_MS;

	for (const session of sessions) {
		if (session.status && ACTIVE_STATUSES.has(session.status)) {
			result.skippedActive += 1;
			continue;
		}
		if (session.modified.getTime() > archiveBeforeMs) {
			result.skippedActive += 1;
			continue;
		}
		if (await hasLiveNestedSessions(session, archiveBeforeMs)) {
			result.skippedActive += 1;
			continue;
		}
		const cwdKey = sessionCwdKey(sessionsRoot, session);
		const cwdSeen = inactiveSeenByCwd.get(cwdKey) ?? 0;
		const keepGlobal = inactiveSeen < options.retainNewestGlobal;
		const keepPerCwd = cwdSeen < options.retainNewestPerCwd;
		inactiveSeen += 1;
		inactiveSeenByCwd.set(cwdKey, cwdSeen + 1);
		if (keepGlobal) { result.keptNewestGlobal += 1; continue; }
		if (keepPerCwd) { result.keptNewestPerCwd += 1; continue; }
		if (options.coldArchiveAfterDays > 0 && session.modified.getTime() > cutoffMs) continue;
		// ... archive candidate
	}
}
```

归档筛选顺序（全部需通过才归档）：
1. 状态不在 `ACTIVE_STATUSES`（`pending`/`interrupted`/`unknown`）
2. 修改时间超过 5 分钟写入宽限期
3. 无活跃嵌套子会话
4. 超出全局最新 20 个保留额度
5. 超出每目录最新 10 个保留额度
6. 修改时间超过 30 天年龄线（`coldArchiveAfterDays`）

归档动作：会话 JSONL 移动到 `archive/sessions/` 并 gzip 压缩（`.jsonl.gz`），同名工件目录一起搬移。随后删除 `history.db` 和 `stats.db` 中对应会话的行并重建 FTS 索引。

## runStaleGc 函数（源码直读 gc-cli.ts:685-756）

```typescript
async function runStaleGc(options: ResolvedGcOptions): Promise<StaleGcResult> {
	const markersDir = getCustomSessionFilesDir(options.agentDir);
	const breadcrumbDir = getTerminalSessionsDir(options.agentDir);
	const candidates: StaleCandidate[] = [
		...(await collectDanglingPointers(markersDir, "danglingMarkers", ...)),
		...(await collectDanglingPointers(breadcrumbDir, "staleBreadcrumbs", ...)),
	];
	const stores = resolveConfigRootStores(options.agentDir);
	if (stores) {
		for (const { file, bytes } of await collectExpiredFiles(stores.reportsDir, ".tar.gz", options)) {
			candidates.push({ kind: "expiredReports", paths: [file], bytes });
		}
		// collab replicas: skip those still referenced by breadcrumbs
		// ownedSession lease: skip if a running guest holds it
		for (const { file, bytes } of await collectExpiredFiles(stores.collabDir, SESSION_SUFFIX, options)) {
			if (resumable.has(...)) continue;
			candidates.push({ kind: "expiredReplicas", paths: [...], bytes, ownedSession: file });
		}
	}
	// ...
	for (const candidate of candidates) {
		const lease = candidate.ownedSession ? await tryAcquireSessionFileLease(candidate.ownedSession) : undefined;
		if (lease === null) continue;  // running guest holds it
		// ... delete
		lease?.release();
	}
}
```

stale 阶段四类删除对象：
1. `danglingMarkers`：custom-session-files 目录里指针记录的会话文件已不存在、超过 1 天宽限期的 marker
2. `staleBreadcrumbs`：terminal-sessions 目录里非 fresh 且指向已消失会话、超过 1 天宽限期的 breadcrumb（fresh 的是 `/new` 惰性边界，保留）
3. `expiredReports`：`~/.omp/reports/` 里的 `.tar.gz` 调试报告，保留最新 20 个，其余需超过 30 天才删
4. `expiredReplicas`：`~/.omp/collab/` 里的 `.jsonl` 协作副本，同上年龄与保留规则，但仍有 breadcrumb 指向的跳过；删除前取会话所有权租约，有运行中的 guest 持有就跳过

`resolveConfigRootStores` 逻辑：默认 agent dir（`~/.omp/agent`，即 config root 下的 `agent`）解析到 `~/.omp/reports/` 和 `~/.omp/collab/`；自定义 agent dir 名为 `agent` 则父目录为 config root；其他名字的 agent dir 没有 config root 可清。

## runWalGc 函数（源码直读 gc-cli.ts:1793-1805）

```typescript
async function runWalGc(options: ResolvedGcOptions): Promise<WalGcResult> {
	const databases = await Promise.all(
		[getHistoryDbPath(options.agentDir), getModelDbPath(options.agentDir)].map(dbPath =>
			checkpointWal(dbPath, options.apply),
		),
	);
	// ...
}
```

WAL checkpoint 对 `history.db` 和 `models.db` 执行 `PRAGMA wal_checkpoint(TRUNCATE)`，带 5000ms busy_timeout。WAL 字节数非零且 checkpoint 失败会报错。

## 第一次 dry-run 输出（omp gc --json，apply 前采集）

```json
{
  "agentDir": "/home/cpf/.omp/agent",
  "apply": false,
  "blobs": {
    "referenced": 8,
    "candidates": 10,
    "wouldDelete": 4,
    "bytes": 227634,
    "errors": []
  },
  "archive": {
    "scanned": 217,
    "skippedActive": 108,
    "keptNewestGlobal": 20,
    "keptNewestPerCwd": 57,
    "wouldArchive": 16,
    "historyRowsDeleted": 0,
    "statsRowsDeleted": 0,
    "ftsRebuilt": false,
    "wouldDeleteTemps": 0,
    "deletedTemps": 0,
    "tempBytes": 0,
    "errors": []
  },
  "wal": {
    "databases": [
      { "dbPath": "/home/cpf/.omp/agent/history.db", "walBytes": 1483232, "wouldCheckpoint": true },
      { "dbPath": "/home/cpf/.omp/agent/models.db", "walBytes": 4470232, "wouldCheckpoint": true }
    ],
    "walBytes": 5953464,
    "wouldCheckpoint": true,
    "checkpointed": false
  }
}
```

## omp gc --stale --json 输出（apply 前采集）

```json
{
  "agentDir": "/home/cpf/.omp/agent",
  "apply": false,
  "stale": {
    "danglingMarkers": 0,
    "staleBreadcrumbs": 5,
    "expiredReports": 0,
    "expiredReplicas": 0,
    "wouldDelete": 5,
    "deleted": 0,
    "bytes": 670,
    "errors": []
  }
}
```

## omp gc --apply --json 输出（真实执行）

```json
{
  "agentDir": "/home/cpf/.omp/agent",
  "apply": true,
  "blobs": {
    "referenced": 8,
    "candidates": 10,
    "wouldDelete": 4,
    "deleted": 4,
    "bytes": 227634,
    "errors": []
  },
  "archive": {
    "scanned": 217,
    "skippedActive": 108,
    "keptNewestGlobal": 20,
    "keptNewestPerCwd": 57,
    "wouldArchive": 16,
    "archived": 16,
    "historyRowsDeleted": 261,
    "statsRowsDeleted": 3870,
    "ftsRebuilt": true,
    "wouldDeleteTemps": 0,
    "deletedTemps": 0,
    "tempBytes": 0,
    "errors": []
  },
  "wal": {
    "databases": [
      { "dbPath": "/home/cpf/.omp/agent/history.db", "walBytes": 0, "wouldCheckpoint": false, "checkpointed": false },
      { "dbPath": "/home/cpf/.omp/agent/models.db", "walBytes": 0, "wouldCheckpoint": false, "checkpointed": false }
    ],
    "walBytes": 0,
    "wouldCheckpoint": false,
    "checkpointed": false
  }
}
```

## omp gc --stale --apply --json 输出（真实执行）

```json
{
  "agentDir": "/home/cpf/.omp/agent",
  "apply": true,
  "stale": {
    "danglingMarkers": 0,
    "staleBreadcrumbs": 9,
    "expiredReports": 0,
    "expiredReplicas": 0,
    "wouldDelete": 9,
    "deleted": 9,
    "bytes": 1282,
    "errors": []
  }
}
```

stale 阶段删 9 个 breadcrumb（不是 dry-run 时的 5 个）：archive 阶段刚把 16 个会话从 sessions/ 搬到 archive/sessions/，指向那 16 个会话之一的 breadcrumb 目标文件随即不存在，从「正常」变成「悬空」，只要 crumb 本身超过 1 天宽限期就被 stale 删除。5（dry-run 已识别）+ 4（因归档新悬空）= 9。

## 第二次 dry-run 输出（apply 后采集）

### omp gc --json

```json
{
  "agentDir": "/home/cpf/.omp/agent",
  "apply": false,
  "blobs": {
    "referenced": 8,
    "candidates": 8,
    "wouldDelete": 0,
    "bytes": 0,
    "errors": []
  },
  "archive": {
    "scanned": 201,
    "skippedActive": 108,
    "keptNewestGlobal": 20,
    "keptNewestPerCwd": 57,
    "wouldArchive": 0,
    "errors": []
  },
  "wal": {
    "databases": [
      { "dbPath": "/home/cpf/.omp/agent/history.db", "walBytes": 226632, "wouldCheckpoint": true },
      { "dbPath": "/home/cpf/.omp/agent/models.db", "walBytes": 0, "wouldCheckpoint": false }
    ],
    "walBytes": 226632,
    "wouldCheckpoint": true,
    "checkpointed": false
  }
}
```

### omp gc --stale --json

```json
{
  "agentDir": "/home/cpf/.omp/agent",
  "apply": false,
  "stale": {
    "danglingMarkers": 0,
    "staleBreadcrumbs": 0,
    "expiredReports": 0,
    "expiredReplicas": 0,
    "wouldDelete": 0,
    "deleted": 0,
    "bytes": 0,
    "errors": []
  }
}
```

## 磁盘核验（apply 后 du/ls 输出）

执行前：sessions 6.0G、blobs 752K、history.db-wal 1.4M、models.db-wal 4.3M。
执行后：sessions 5.8G、blobs 640K（16 个文件：8 个被引用哈希 × 主文件+扩展名副本）、archive/sessions/ 16 个 .jsonl.gz + 16 个同名工件目录、history.db-wal 与 models.db-wal 均为 0 字节。

## 文档页与本机 help 的 gc flag 差异

文档页 gc flag 表只列出 9 个 flag（`--apply` 到 `--retain-newest-per-cwd`），未列出 `--stale`、`--stale-retain-newest`、`--stale-retain-days`。文档页另一处把参数写作 `--retain-newest-per-project`，本机实际 flag 名是 `--retain-newest-per-cwd`。
