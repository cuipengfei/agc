# OMP Mnemopi Consolidation 生命周期

> Sources: OMP session investigation, 2026-08-23; can1357/oh-my-pi Git history, source, issues and PRs, 2026-08-31; OMP 源码 d49918fab2
> Raw: [2026-08-23-omp-mnemopi-investigation](../../raw/omp-mnemopi/2026-08-23-omp-mnemopi-investigation.md); [2026-08-31-mnemopi-scoping-history](../../raw/omp-mnemopi/2026-08-31-mnemopi-scoping-history.md); [2026-09-21-mnemopi-data-model](../../raw/omp-mnemopi/2026-09-21-mnemopi-data-model.md); [2026-09-28-mnemopi-scoping-global-retain-test](../../raw/omp-mnemopi/2026-09-28-mnemopi-scoping-global-retain-test.md); [2026-09-27-omp-18-3-3-predictive-text-engine](../../raw/omp/2026-09-27-omp-18-3-3-predictive-text-engine.md); [2026-10-27 Mnemopi 捕获与 LLM 边界](../../raw/omp-mnemopi/2026-10-27-mnemopi-capture-and-llm-boundaries.md); [2026-10-27 本机 Mnemopi 库统计](../../raw/omp-mnemopi/2026-10-27-local-mnemopi-bank-stats.md)
> Updated: 2026-10-27

## Overview

OMP 的 Mnemopi 记忆后端有三条相关路径：`dispose()`（普通退出，**不执行 sleep**，所以不 promote）、`/memory enqueue`（显式 full consolidation），以及 standalone `pi-mnemopi sleep` CLI（可无交互触发 full consolidation）。**只有 full sleep 路径受 12 小时年龄门槛限制**；`dispose()` 不是被 age gate 拦住，而是根本不跑 sleep。因此 fresh rows 在普通退出和立即 enqueue 后，都不会被晋升到 episodic memory。

## 写入触发与提取边界（18.13.1 源码）

自动 retain 的判定发生在 `agent_end` 阶段（`state.ts:688-704`）：`userTurns - this.lastRetainedTurn < this.config.retainEveryNTurns` 时直接返回；通过门槛后用 `sliceUnretainedMessages(flat, this.lastRetainedTurn)` 只取上次游标之后的消息，写完后把游标推到 `userTurns`。`retainEveryNTurns` 默认值为 4（`settings.ts:286-295`），本机配置同样取 4。

retain 写入时是否提取事实由两个条件共同决定（`state.ts:721-755`）：`shouldExtract = options.extract !== false && extractText !== null`，`extractText` 取自用户侧消息转录。`extract`、`extractEntities`、`extractText` 三项一起随 `rememberInScope` 下发，同一次写入也会排程嵌入。普通退出路径在 `consolidate` 调用处写死 `extract: false`（`state.ts:966-973`），`consolidate` 再把它转交 `forceRetainCurrentSession`（`state.ts:901-905`），所以退出时只写转录，facts 不新增。

整合自身不调用模型。`consolidate` 返回 `llm_used: 0`、`method: "aaak"`（`consolidate.ts:1168-1180`），写入 episodic 的 metadata 为 `llm_used: false`（`consolidate.ts:1130-1145`），`sleepAllSessions` 的汇总结果同样报 `llm_used: 0`（`consolidate.ts:1225-1235`）。摘要由 `buildSleepSummary` 确定性拼接，库内 facts 与 KG 三元组由正则启发式补齐（`consolidate.ts:742-752`）。

唯一模型调用点是事实提取：`extraction.ts:395-412` 在 host 注入 completion 时以 temperature 0 调用模型；模型不可用时退回 `heuristicExtractFacts` 正则（`extraction.ts:448-458`）。`llmMode: smol` 时 `backend.ts:560-600` 通过 `resolveRoleChain("memory", ...)` 解析 `memory` 角色链，解析不到即 warn 并退化为无 LLM 路径；本机该角色配置为 `sensenova/glm-5.2:high`。

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

## Scoping

Mnemopi `scoping` 有三个选项，默认 `per-project`：

| 模式 | 写入 bank | Recall banks |
|---|---|---|
| `global` | shared/global | shared/global |
| `per-project` | 当前 cwd 对应的 project bank | 仅 project |
| `per-project-tagged` | 当前 cwd 对应的 project bank（默认；可显式 `scope:"global"` 写共享 bank，见下文 Status 块） | project + shared/global |

当前配置：

```yaml
memory:
  backend: mnemopi
mnemopi:
  scoping: per-project-tagged
  embeddingApiUrl: http://localhost:4140/v1
  embeddingModel: text-embedding-3-small
```

这里的 project scope 严格说是 **cwd scope**：当前版本从 cwd 派生 project bank。`per-project-tagged` 的默认写入目标是 project bank，shared/global 是额外的 recall target；需要写共享 bank 时由 `retain`/`learn` 的 `scope:"global"` 显式指定（18.3.3 起）。如果 shared bank 没有任何内容，它的 recall 效果与 `per-project` 相同。

> **Status: Outdated** (2026-09-28)
> 本段原文写「`per-project-tagged` 不会将内容写入 global」，这只覆盖默认路径。18.4.2 源码（`tools/memory-retain.ts`）允许显式 `scope:"global"` 写共享 bank；同日实测两条 global 写入落入共享 bank（`working_memory.channel_id=default`）并被 recall 命中。共享 bank 的名字是 `default`（`mnemopi/config.ts:129` `DEFAULT_SHARED_BANK`），不是 `global`。

名称中的 `tagged` 具有误导性。Mnemopi 没有 tag-filtered recall；它实际打开两个独立 bank 并合并结果。不要和 Hindsight 的同名模式混淆，后者会真正使用 `project:<cwd>` tag。

当前 `retain` 工具接受 `items[].content`、可选 `items[].context` 与可选 `items[].scope`（`"project" | "global"`，默认 project；描述原文 "storage scope; defaults to project, global is for durable cross-project knowledge"）。`scope` 参数只在 scoping 为 `global` 或 `per-project-tagged` 时暴露（`mnemopi/settings.ts` `isGlobalMemoryScopeAvailable`）；`per-project` 下工具隐藏该选项。写入位置默认由会话当前 scoping 决定，可按条覆盖为 global。

> **Status: Outdated** (2026-09-28)
> 本段原文写「retain 工具只接受 content 与 context，没有 bank/scope/tag 参数」。v18.3.3 changelog："Added optional global or per-project memory scopes to the retain and learn tools when Mnemopi scoping is enabled."另注：db 行里的 `scope` 列值固定为 `bank`（行级存储语义），与调用参数的 `scope` 是不同字段。
### Recall 合并语义（18.4.2 源码）

`collectScopedRecallResults`（`mnemopi/state.ts`）对每个 recall 目标 bank 分别查询，按 id 与内容去重合并，统一排序后按 `recallLimit` 截断；单个 bank 失败只记日志不拖垮另一边，全部目标都失败才抛错。scoping 配置在 memory backend 启动时读取（`mnemopi/backend.ts` `start`），改配置后新会话生效。

### 发布历史

初始 Mnemosyne backend 于 `2026-05-30T08:07:03+02:00` 加入，当时没有显式 `scoping` 设置。三个选项在同日 commit `9d29fc97167daba0eb7bab15be69af7b324a0e00` 中一次加入，并首次一起随 `v15.6.0` 发布；不存在 global 先发布、另外两个后来才发布的顺序。

初始测试先用 `global` 写入用户偏好，再用 `per-project-tagged` 写项目记忆，最后断言 recall 合并 global + 当前项目并排除其他项目。这证明它支持消费预先存在的 global memory，但源码和历史没有把它定义为迁移功能。

### 模式切换

从 `per-project` 切到 `global` 不会迁移或删除旧 project bank：

- 旧 project 内容保留在磁盘，但 global 模式不会 recall 它；
- 新记忆写入 global bank；
- 切回 `per-project` 后旧 project 内容重新可见；
- 切到 `per-project-tagged` 后可同时 recall project + global。

没有自动 bank 合并或迁移。

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

- `per-project-tagged` 依赖预先存在的 shared/global memory；它自身不写 global
- `retain` 工具不能选择写入 bank，持续维护 project + global 两层内容需要切换 scoping 或外部 writer
- 没有用户可配的 shutdown tradeoff 开关

## 启动期 Promotion（2026-09-21 源码确认）

OMP 启动 Mnemopi bank 时（`backend.ts:94-96` 调用 `state.promoteEligibleWorkingMemory()`）会尝试 promote 符合年龄条件的 working memory 到 episodic memory。`state.ts:644-672` 说明：`remember` 每次写入都跑 `trimWorkingMemory`，删除 `consolidated_at IS NULL` 且超过 `workingMemoryTtlHours`（24 小时）的行；consolidation 的 `sleep` 年龄门槛为 12 小时，但此前只经 `/memory enqueue` 触发（`dispose` 传 `sleep:false`，#4843），导致从未手动 enqueue 的 retain/learn/transcript 行在会话间隔超过 24 小时后被静默删除（#10770）。启动期 promotion 在首次写入前对旧行盖上 `consolidated_at`，使 trim 过滤器不再删除它们。`sleep` 无 eligible 行时空转 no-op，失败只记录不抛出。

详见 [Mnemopi 数据模型与 Recall/Reflect](data-model-and-retrieval.md)。

## See Also

- [浏览历史 RAG：Hister 的能力与边界](../personal-knowledge/browser-history-rag.md) — 对比个人文档检索与 Agent 记忆系统
- [Harness 格式与上下文载体](../harness-engineering/harness-formats-and-context-carriers.md) — 记忆、压缩和上下文载体的边界
