# Mnemopi per-project-tagged：源码语义与 scope:"global" 实测

> Source: 本机 OMP 18.4.2 源码（`~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/`）与本机 SQLite 实测
> Collected: 2026-09-28
> Published: Unknown

## 源码摘录（18.4.2）

### mnemopi/settings.ts（scope 参数暴露条件）

`isGlobalMemoryScopeAvailable`（settings.ts:67-73）：

```ts
/**
 * Whether `retain`/`learn` can take `scope: "global"`: only Mnemopi with a bank every project
 * recalls (`global` or `per-project-tagged` scoping). Tools hide the option everywhere else.
 */
export function isGlobalMemoryScopeAvailable(scope: ScopeLike): boolean {
	return cfgMemoryBackend.get(scope) === "mnemopi" && cfgMnemopiScoping.get(scope) !== "per-project";
}
```

### tools/memory-retain.ts（scope 参数定义与目标选择）

- 第 27-28 行：`"scope?": type("'project' | 'global'").describe("storage scope; defaults to project, global is for durable cross-project knowledge")`
- 第 72-74 行：任一个 item 带 `scope === "global"` 时先解析 `state.getGlobalRetainTarget()`。
- 第 100 行：`item.scope === "global" ? globalTarget : undefined` 作为 `rememberScoped` 的写入目标。
- 第 94 行：写入时固定 `scope: "bank"`（这是行级存储语义，与调用参数的 `scope` 不同名同义）。
- 第 129-130 行：`params.items.some(item => item.scope === "global")` 且后端非 mnemopi 时抛错 `"Global memory scope is only available with the Mnemopi backend."`。

### mnemopi/config.ts（bank 解析）

- 第 129 行：`const DEFAULT_SHARED_BANK = "default";`
- `computeMnemopiBankScope`（约 152-183 行）三种模式：

```ts
case "global":
	return { ..., retainBank: globalBank, recallBanks: [globalBank] };
case "per-project":
	return { ..., retainBank: project, recallBanks: [project] };
case "per-project-tagged":
	return { ..., retainBank: project,
		recallBanks: project === globalBank ? [project] : [project, globalBank] };
```

config.ts 注释（`computeMnemopiBankScope` 上方）："Mnemopi has no tag-filtered recall, so `per-project-tagged` maps to a project-local write bank plus a shared recall-visible bank."

### mnemopi/state.ts（collectScopedRecallResults，约 402-448 行）

- 对 `this.scoped.recall` 里每个目标 bank 分别 `recallEnhanced(recallQuery, this.config.recallLimit, { includeFacts: true, channelId: target.bank })`。
- 结果经 `mergeRecallResult(merged, byId, byContent, result)` 按 id 与内容去重合并。
- 单个 bank 失败记入 `failures` 并继续；`successfulTargets === 0` 且存在失败时才抛错（单 bank 抛原错，多 bank 抛 AggregateError）。
- 末尾 `merged.sort(compareRecallResults)`；超过 `recallLimit` 截断。

### mnemopi/backend.ts（配置读取时机）

`mnemopiBackend.start`（backend.ts:101-126）：会话启动时 `loadMnemopiConfigWithProviders(settings, agentDir, modelRegistry, sessionId)` 读取配置并 `installMnemopiState(session, config)`。scoping 变更对运行中会话是否热生效未在源码中看到热重载路径（推断：新会话生效）。

## 实测记录（2026-09-28，cwd=/home/cpf/code-inside/agc）

配置：`~/.omp/agent/config.yml` 的 `mnemopi.scoping` 由 `per-project` 改为 `per-project-tagged`（行 332）。

会话内调用 retain 工具，两个 item 均带 `scope: "global"`。结果：

共享 bank db（`~/.omp/agent/memories/mnemopi/mnemopi.db`）`working_memory` 表新增两行：

| id | channel_id | scope | source | recall_count | last_recalled | timestamp | importance | trust_tier |
|---|---|---|---|---|---|---|---|---|
| b9fb6232cc30b0a5 | default | bank | coding-agent-retain | 1 | 2026-09-28T15:43:40.805Z | 2026-09-28T15:42:28.588Z | 0.75 | STATED |
| 174ff970b6b6ffb8 | default | bank | coding-agent-retain | 1 | 2026-09-28T15:43:40.805Z | 2026-09-28T15:42:28.624Z | 0.75 | STATED |

两行完整 `content`（与 retain 调用参数逐字节相等，脚本比对确认）：

`b9fb6232cc30b0a5`：
> OMP Mnemopi per-project-tagged scoping semantics (verified against 18.4.2 source): retain writes to the project bank by default; retain/learn tools accept scope:"global" to write the shared bank (parameter added in v18.3.3, exposed only when scoping is global or per-project-tagged, per mnemopi/settings.ts isGlobalMemoryScopeAvailable); recall merges project+global banks, dedupes by id and content, sorts, truncates to recallLimit (mnemopi/state.ts collectScopedRecallResults). Scoping config is read at memory backend startup, so changes apply to new sessions.

`174ff970b6b6ffb8`：
> User's OMP config (~/.omp/agent/config.yml) uses mnemopi.scoping: per-project-tagged since 2026-09-28 (changed from per-project). Consequence: memories written by retain default to the per-cwd project bank; the shared 'default' bank at ~/.omp/agent/memories/mnemopi/mnemopi.db participates in recall everywhere. When recalling user history, missing facts may live in another project's bank, not necessarily the current one.

- `recall_count` 从 0 变 1 且 `last_recalled` 为随后一次 recall 测试的时刻，证明本会话召回命中了共享 bank。
- 项目 bank（`~/.omp/agent/memories/mnemopi/banks/agc-djmfd5jv3zsd/mnemopi.db`）`working_memory` 行数保持 480 不变，这两条未落进项目 bank。
- 共享 bank 的 bank 名是 `default`（与 `DEFAULT_SHARED_BANK` 一致），不是 `global`。
- 同表随后出现一行 `source=coding-agent-learn` 的记录（id `ef1a9a44093ea76f`，timestamp 2026-09-28T15:44:10.747Z），为自动学习管线写入。

## changelog 相关行（can1357/oh-my-pi releases，gh release view 读取）

- v18.3.3：`Added optional global or per-project memory scopes to the retain and learn tools when Mnemopi scoping is enabled.`
- v18.4.1：修复源记忆行被取代或过期后，从其提取的事实仍被显示的问题（PR #12825）。
