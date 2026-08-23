# OMP Mnemopi enqueue 是否立即晋升 fresh working memory

## Hypothesis
`/memory enqueue` 会立刻把 fresh working_memory 晋升到 episodic memory。

## Baseline
- backend: `mnemopi`
- scoping: `per-project`
- 当前 project bank 已有多条 working memory，但 episodic 仍为 0

## Change
在当前 OMP 会话中显式执行 `/memory enqueue`，并观察 bank 变化。

## Context
- host: WSL2
- agent: OMP
- repo: `/home/cpf/code-inside/oh-my-pi`
- cwd: `/home/cpf/code-inside/agc`
- date: 2026-08-23

## Steps
1. 确认当前 Mnemopi bank 内容。
2. 执行 `/memory enqueue`。
3. 立即检查 `working_memory`、`facts`、`graph_edges`、`episodic_memory`、`consolidation_log`。
4. 再等待一段时间后复查，确认是否有后续晋升。

## Observations
- enqueue 后 `working_memory`、`facts`、`graph_edges` 增长。
- `episodic_memory` 仍为 0。
- `consolidation_log` 仍为 0。
- 45 秒后复查仍未出现 episodic 记录。

## Evidence
- `packages/coding-agent/src/mnemopi/backend.ts:174-187`：`enqueue()` 走 `state.consolidate({ full: true })`
- `packages/coding-agent/src/mnemopi/state.ts:714-715`：`dispose()` 走 `consolidate({ full:false, extract:false, sleep:false })`
- `pi-mnemopi/src/core/beam/consolidate.ts`：`sleepAllSessions()` 只选择超过 `workingMemoryTtlHours / 2` 的旧行
- 本机实测：`sleep` 返回 `no_op`
- Issue: https://github.com/can1357/oh-my-pi/issues/9356
- PR: https://github.com/can1357/oh-my-pi/pull/9357

## Verdict
- **fails**
- `enqueue` 不会绕过 age gate
- `dispose` 不执行 sleep，不是“被门槛拦住”
- standalone `pi-mnemopi sleep` 可无交互运行，但同样只处理 eligible rows

## Follow-up
- 观察上游是否提供面向 OMP 的一等 sleep/consolidation 自动化入口
- 若要做本机自动化，基于 `MNEMOPI_DATA_DIR` 遍历各 project bank，而不是猜 OMP CLI 新入口
