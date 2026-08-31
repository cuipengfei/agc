# OMP Mnemopi Consolidation 生命周期

> Sources: OMP session investigation, 2026-08-23; can1357/oh-my-pi Git history, source, issues and PRs, 2026-08-31
> Raw: [2026-08-23-omp-mnemopi-investigation](../../raw/omp-mnemopi/2026-08-23-omp-mnemopi-investigation.md); [2026-08-31-mnemopi-scoping-history](../../raw/omp-mnemopi/2026-08-31-mnemopi-scoping-history.md)
> Updated: 2026-08-31

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

## Scoping

Mnemopi `scoping` 有三个选项，默认 `per-project`：

| 模式 | 写入 bank | Recall banks |
|---|---|---|
| `global` | shared/global | shared/global |
| `per-project` | 当前 cwd 对应的 project bank | 仅 project |
| `per-project-tagged` | 当前 cwd 对应的 project bank | project + shared/global |

当前配置：

```yaml
memory:
  backend: mnemopi
mnemopi:
  scoping: per-project
  embeddingApiUrl: http://localhost:4140/v1
  embeddingModel: text-embedding-3-small
```

这里的 project scope 严格说是 **cwd scope**：当前版本从 cwd 派生 project bank。`per-project-tagged` 不会将内容写入 global；global 只是额外的 recall target。如果 shared bank 没有被 `global` 模式或外部 writer 预先填充，它的 recall 效果与 `per-project` 相同。

名称中的 `tagged` 具有误导性。Mnemopi 没有 tag-filtered recall；它实际打开两个独立 bank 并合并结果。不要和 Hindsight 的同名模式混淆，后者会真正使用 `project:<cwd>` tag。

当前 `retain` 工具只接受 `items[].content` 与可选 `items[].context`，没有 bank/scope/tag 参数。LLM 不能逐条决定写入 global 或 project；写入位置由会话当前 scoping 决定。

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
