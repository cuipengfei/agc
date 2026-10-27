# OMP subagent 并行度闸门与 autolearn 跳过条件源码取证

> Source: can1357/oh-my-pi 源码 `/home/cpf/code-inside/oh-my-pi` (`5d72f5d3f4`, 2026-10-19)；本机 `~/.omp/agent/config.yml` 与 `omp config get` 实测；agc 仓库 commit `b750424`、`03d688c`
> Collected: 2026-10-27
> Published: Unknown

## 1. subagent 并行度的四道闸门的源码定位

本文覆盖四个键：`task.maxConcurrency`、`async.maxJobs`、`providers.maxInFlightRequests`、`task.batch`。

| 键 | 默认值 | 定义位置 | 消费位置 |
|---|---|---|---|
| `task.maxConcurrency` | `32` | `packages/coding-agent/src/task/settings.ts:294-315` | `task/workpool.ts:148-151`（池上限，实时读取）；`task/index.ts:877-881`（spawn 信号量，每次 acquire/release 前 resize） |
| `async.maxJobs` | `100` | `packages/coding-agent/src/tools/settings.ts:934` | 会话级后台任务管理器槽位上限 |
| `providers.maxInFlightRequests` | `{}` | `packages/coding-agent/src/session/settings.ts:160-164` | `session/session-provider-boundary.ts:233`；`providers/settings-stream-fn.ts:136` |
| `task.batch` | `true` | `packages/coding-agent/src/task/settings.ts:241-253` | `task/index.ts:230-235`（关闭时拒绝 `tasks`/`context` 字段） |

`task.maxConcurrency` 的 UI 选项：`0`（Unlimited）、`1`、`2`、`4`、`8`、`16`、`32`、`64`。

`normalizeConcurrencyLimit`（`task/parallel.ts:129-135`）：`max <= 0` 或非有限值一律映射为不限制；注释明确对应 `task.maxConcurrency = 0` 的 "Unlimited" 语义（issue #3305）。

## 2. providers.maxInFlightRequests 的消费

`session/session-provider-boundary.ts:230-235`：

```ts
maxInFlightRequests: validateProviderMaxInFlightRequests(
    options.maxInFlightRequests ?? cfgProvidersMaxInFlightRequests.get(this.#host.settings),
),
```

`providers/settings-stream-fn.ts:136-138` 同样路径。未列出的 provider 不受限制；值为空对象 `{}` 时没有任何 provider 受限。

## 3. task.speculativeLaunch 与 task.batch 联动

`task/settings.ts:268-279`：

```ts
export const cfgTaskSpeculativeLaunch = register({
    id: "task.speculativeLaunch",
    type: "boolean",
    default: true,
    ...
    description: "Start each batch subagent as soon as its tasks[] item finishes streaming instead of waiting for the whole task call. Launched agents are aborted if the finished call fails validation, is blocked, or its arguments change. Requires auto-allowed task approval and no extension tool lifecycle handlers.",
});
```

`task.batch` 为 `false` 时，`task/index.ts:230-233` 返回错误：`task.batch is disabled, so the task tool does not accept \`tasks\` or \`context\`. Spawn one agent per call with \`task\`, or enable the task.batch setting.`

## 4. provider-concurrency 的窄槽位语义

`task/provider-concurrency.ts:1-11` 模块注释：

> Per-provider LLM concurrency cap, applied around each provider HTTP request. The semaphore brackets only the streaming request itself, not the whole agent lifetime: a parent subagent releases its slot the moment its LLM stream finishes producing, so children spawned during tool execution can acquire slots for their own turns. Holding the slot across the parent's full conversation deadlocks any spawn tree whose width exceeds `maxConcurrency` because the parents wait for children that wait for slots the parents are holding (issue #3749).

该机制目前只注册了 `ollama-cloud`（`providers.ollama-cloud.maxConcurrency`，默认 3）；`providers.maxInFlightRequests` 是另一条按 provider 的 in-flight 记录表路径。

## 5. 注册的 magic keyword

`modes/magic-keywords.ts` 的 `MAGIC_KEYWORDS` 表注册四个关键词：`ultrathink`、`orchestrate`、`workflow`（触发词 `workflowz`）、`jevify`。`parallel` 不在表中；它是 system prompt 里的普通委派约定，不是注册关键词。

## 6. autolearn.autoContinue 的跳过条件

`autolearn/controller.ts`（`5d72f5d3f4`）`#onAgentEnd`，按顺序：

1. 回合以 `stopReason: "aborted"` 结束 → return
2. `!cfgAutolearnEnabled.get(settings)` → return
3. `toolCalls < cfgAutolearnMinToolCalls.get(settings)` → return（计数器每回合重置，不累积）
4. `session.getPlanModeState()?.enabled` → return
5. `#turnStartedInGoalMode || session.getGoalModeState()?.enabled` → return（goal 状态在 `agent_start` 时快照）
6. `cfgAutolearnAutoContinue.get(settings) !== true` → return

全部通过后 `#startCapture()`；若 `#captureInFlight` 则 `#capturePending = true`，等当前 capture 结束后补跑一次。

## 7. 相关设置默认值（18.13.1 源码）

| 键 | 默认值 | 定义 |
|---|---|---|
| `task.maxRuntimeMs` | `0` | `task/settings.ts:350-368`；UI 描述 "Hard wall-clock limit per subagent (ms). 0 disables it." |
| `task.maxEffort` | `max` | `task/settings.ts:456-460` |
| `todo.remindersMax` | `3` | `tools/settings.ts:372-375` |
| `todo.eager` | `default` | `tools/settings.ts:389-393` |
| `autolearn.autoContinue` | `false` | `autolearn/settings.ts:23-27` |
| `task.maxRecursionDepth` | `2` | `task/settings.ts:330-348`；UI 选项含 `-1`（Unlimited） |

## 8. 历史变更记录

### commit `b750424`（2026-09-11）

`omp/agent/config.yml` diff（节选）：

```diff
-  eager: preferred
-  batch: true
+  eager: default
+  batch: false
-  maxConcurrency: 5
+  maxConcurrency: 4
-  maxEffort: max
+  maxEffort: high
```

同一批改动还包括 `todo.reminders: true → false`、`todo.eager: preferred → default`、`autolearn.autoContinue: true → false`、`browser.enabled: true → false` 等 24 项值级变化。当时同一配置文件中 `providers.maxInFlightRequests` 为每个 provider 配 `5`。

### commit `03d688c`（2026-10-27）

`omp/agent/config.yml` diff（完整）：

```diff
-  maxInFlightRequests:
-    c8787: 5
-    c8787-chat: 5
-    opencode-zen: 5
-    opencode-go: 5
-    kimi-code: 5
-    kimi-claw: 5
-    deepseek: 5
-    sensenova: 5
-    nvidia: 5
+  maxInFlightRequests: {}
```

```diff
-  autoContinue: false
+  autoContinue: true
```

```diff
-  remindersMax: 1
-  eager: default
+  remindersMax: 2
+  eager: preferred
```

```diff
-  maxJobs: 12
+  maxJobs: 100
```

```diff
-  batch: false
+  batch: true
-  maxConcurrency: 4
+  maxConcurrency: 32
```

## 9. 2026-10-27 实测生效值（omp config get）

| 键 | 实测值 |
|---|---|
| `providers.maxInFlightRequests` | `{}` |
| `task.maxConcurrency` | `32` |
| `async.maxJobs` | `100` |
| `task.batch` | `true` |
| `task.eager` | `default` |
| `task.maxEffort` | `high` |
| `autolearn.autoContinue` | `true` |
| `todo.eager` | `preferred` |
| `todo.reminders` | `true` |
| `todo.remindersMax` | `2` |

注意：workflowz 五项池实测（2026-10-27 早些时候）跑在 `task.maxConcurrency=4` 下，该值为当时用户配置；系统默认 `32`。
