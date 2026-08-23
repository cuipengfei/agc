# OMP Mnemopi 记忆系统调查

> Source: OMP session investigation, 2026-08-22 through 2026-08-23
> Collected: 2026-08-23
> Published: Unknown

## 配置

以下配置写入 `~/.omp/agent/config.yml`：

```yaml
memory:
  backend: mnemopi

providers:
  memoryModel: online

mnemopi:
  scoping: per-project
  embeddingApiUrl: http://localhost:4140/v1
  embeddingModel: text-embedding-3-small
  embeddingVariant: multilingual
  llmMode: smol
  polyphonicRecall: true
  enhancedRecall: true
  proactiveLinking: true
```

## 三开关真实接线状态

源码验证结果（oh-my-pi main @ 72000acfeb, v17.4.0+）：

| 开关 | 配置是否被读 | 说明 |
|---|---|---|
| polyphonicRecall | 无效 | gate 在 orchestrateRecall 里，但 OMP 的 state.ts 直调 recallEnhanced，绕过 orchestrator |
| enhancedRecall | 无效 | OMP 无条件调 recallEnhanced，不看这个开关 |
| proactiveLinking | 有效 | store.ts 的 proactiveLinkingAllowed 真实检查，retain 时建图谱边 |

## Consolidation 生命周期

### dispose() 路径

`packages/coding-agent/src/mnemopi/state.ts:714`：
```typescript
this.consolidate({ full: false, extract: false, sleep: false })
```

普通退出不做 bank sleep，不晋升 working memory 到 episodic。

### enqueue() 路径

`packages/coding-agent/src/mnemopi/backend.ts:174-187`：
```typescript
await state?.consolidate({ full: true })
```

`/memory enqueue` 是显式 full consolidation 路径。

### 12 小时年龄门槛

`sleepAllSessions()` 只处理超过 `workingMemoryTtlHours / 2` 的旧行。默认 TTL=24 小时，门槛=12 小时。可通过环境变量 `MNEMOPI_WM_TTL_HOURS` 配置。

实测：fresh rows 立刻 `/memory enqueue` 返回 `no_op`，`episodic_memory` 保持 0 行。

### standalone CLI 路径

`pi-mnemopi` 包的 `sleep` CLI 可以无交互运行：
```bash
MNEMOPI_DATA_DIR=<bank-dir> bun .../pi-mnemopi/src/cli.ts sleep
```

实测输出：
```
Consolidation complete: {"status":"no_op","message":"No old working memories to consolidate",...}
```

对 OMP per-project banks，需要遍历 `~/.omp/agent/memories/mnemopi/banks/*/` 并为每个设置 `MNEMOPI_DATA_DIR`。

## Diagnose 输出解读

`/memory diagnose` 的 31 项检查构成：

| 类别 | 项数 | 状态值 |
|---|---|---|
| env | 4 | 版本号/路径字符串/set/unset |
| db | 3 | OK / MISSING |
| integrity_check | 1 | OK / FAIL |
| 13 张必需表 | 13 | OK / MISSING |
| 5 张表列完整性 | 5 | 表不存在时跳过 |
| 5 张表行数 | 5 | 数字 / MISSING |

计分规则：pass = OK/YES/set/纯数字；fail = MISSING/NO/ERROR/FAIL。bun_version、platform、env unset 既不是 pass 也不是 fail。

project bank 27/31 是满分：差的 4 项是 bun_version/platform/env 信息项，所有用户都一样。default bank 4/26 + 18 fail 是噪音：per-project 模式下该库从不使用，空文件是 diagnose 自己创建的。

## retain 行为

- 不是纯同步：立即落库 working_memory，然后异步调 LLM 提取 facts/entities
- LLM 失败不阻塞初始 retain 返回
- auto-retain：每 `retainEveryNTurns`（默认 4）个用户轮次，把增量转录全文写入 working_memory

## Issue 和 PR

- Issue #9356: 报告了当前 consolidation 行为与 changelog 不一致的问题
  URL: https://github.com/can1357/oh-my-pi/issues/9356
- PR #9357: 维护者接受定性，修正文档/注释/changelog，不改运行逻辑
  URL: https://github.com/can1357/oh-my-pi/pull/9357

## 嵌入模型

当前路径下三个 Copilot 嵌入模型名返回逐字节相同向量：
- text-embedding-3-small
- text-embedding-3-small-inference
- text-embedding-ada-002

选择 text-embedding-3-small 的原因：VS Code 第一方调用代码使用这个公开名字。

Metis (metis-1024-I16-Binary) 不可用：走 GitHub dotcom 私有协议，CAPI 端点返回 model_not_supported。
