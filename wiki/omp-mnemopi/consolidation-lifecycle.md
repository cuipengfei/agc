# OMP Mnemopi Consolidation 生命周期

> Sources: OMP session investigation, 2026-08-23
> Raw: [2026-08-23-omp-mnemopi-investigation](../../raw/omp-mnemopi/2026-08-23-omp-mnemopi-investigation.md)
> Updated: 2026-08-23

## Overview

OMP 的 Mnemopi 记忆后端有三条相关路径：`dispose()`（普通退出，**不执行 sleep**，所以不 promote）、`/memory enqueue`（显式 full consolidation），以及 standalone `pi-mnemopi sleep` CLI（可无交互触发 full consolidation）。**只有 full sleep 路径受 12 小时年龄门槛限制**；`dispose()` 不是被 age gate 拦住，而是根本不跑 sleep。因此 fresh rows 在普通退出和立即 enqueue 后，都不会被晋升到 episodic memory。

## Consolidation 路径

### dispose() — 普通退出

`dispose()` 调用 `consolidate({ full: false, extract: false, sleep: false })`。它做两件事：

1. 把当前 session 转录 retain 进 working_memory
2. flush 进行中的异步提取

**不做** bank sleep，不晋升 working memory 到 episodic memory。

### /memory enqueue — 显式 full consolidation

`enqueue()` 调用 `consolidate({ full: true })`。它做三件事：

1. force-retain 当前转录
2. flush 异步提取
3. 调 `sleepAllSessions()` 做 full consolidation

**但** `sleepAllSessions()` 只处理超过 `workingMemoryTtlHours / 2` 的旧行。默认 TTL=24 小时，所以门槛=12 小时。fresh rows 立刻 enqueue 返回 `no_op`。

### standalone CLI — 无交互路径

`pi-mnemopi` 包的 `sleep` CLI 可以无交互运行：

```bash
MNEMOPI_DATA_DIR=<bank-dir> bun .../pi-mnemopi/src/cli.ts sleep
```

对 OMP `per-project` banks，需要遍历 `~/.omp/agent/memories/mnemopi/banks/*/` 并为每个设置 `MNEMOPI_DATA_DIR`。

## 配置

```yaml
memory:
  backend: mnemopi
mnemopi:
  scoping: per-project
  embeddingApiUrl: http://localhost:4140/v1
  embeddingModel: text-embedding-3-small
```

嵌入模型选择 `text-embedding-3-small`：三个 Copilot 嵌入模型名在当前路径下返回逐字节相同向量，选择 VS Code 第一方使用的公开名字。

## 开关接线状态

| 开关 | 有效？ |
|---|---|
| polyphonicRecall | 否 |
| enhancedRecall | 否 |
| proactiveLinking | 是 |

polyphonicRecall 和 enhancedRecall 的 gate 在 `orchestrateRecall` 里，但 OMP 的 state.ts 直调 `recallEnhanced`，绕过 orchestrator。proactiveLinking 在 store.ts 里真实检查，retain 时建图谱边。

## Diagnose 解读

`/memory diagnose` 的 project bank 27/31 是满分——差的 4 项是 bun_version/platform/env 信息项，所有用户都一样。default bank 4/26 + 18 fail 是噪音：per-project 模式下该库从不使用。

## 已知边界

- 上游 issue #9356 报告了当前行为与 changelog 不一致
- PR #9357 修正了文档/注释/changelog，不改运行逻辑
- 当前版本偏向"退出快"而非"自动 consolidate"
- 没有用户可配的 shutdown tradeoff 开关
