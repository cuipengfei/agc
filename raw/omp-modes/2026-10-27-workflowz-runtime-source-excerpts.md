# OMP workflowz 运行时与生命周期源码摘录

> Source: https://github.com/can1357/oh-my-pi at `5d72f5d3f4`; `docs/magic-keywords.md`, `docs/tools/eval.md`, `packages/coding-agent/src/prompts/system/workflow-notice.md`, `packages/coding-agent/src/task/workpool.ts`, `packages/coding-agent/src/eval/workpool-bridge.ts`, `packages/coding-agent/src/modes/magic-keywords.ts`, `packages/coding-agent/src/modes/settings.ts`, `packages/coding-agent/src/session/agent-session.ts`, `packages/coding-agent/test`
> Collected: 2026-10-27
> Published: Unknown

## 1. 注册表与工具门槛

`packages/coding-agent/src/modes/magic-keywords.ts`：

```ts
{
  id: "workflow",
  word: "workflowz",
  hue: [30, 150],
  label: "Workflow Keyword",
  description: "Let standalone workflowz append its hidden eval workflow notice",
  requires: ["task", "eval"],
  notice: renderWorkflowNotice,
}
```

注释原文："This table is the single source of truth. Every downstream surface derives from it: the `magicKeywords.<id>` settings (`modes/settings.ts`), the notice injection and `<id>-notice` message types (agent-session, queued-messages), and the editor/bubble gradients (`setMagicKeywords` in pi-tui)."

## 2. 当前 notice 开头与关键 helper 句

`packages/coding-agent/src/prompts/system/workflow-notice.md`：

```text
User message contains **workflowz** → deterministic multi-subagent workflow. Default to `workpool()` for 2+ independent items; use individual `agent()` handles only for dependency-coupled or schema-returning calls.
```

```text
- `workpool(agent=None, *, name=None, context=None, tools=None)`: pool of keep-alive workers bounded by live `task.maxConcurrency`. `.push(*items)` returns item ids; each item goes to the least context-loaded idle worker, a new worker while capacity remains, or a busy worker's round-robin queue. `eval.workpool.freshAgents=true` instead spawns a new agent per item.
- `agent(prompt, *, agent=None, label=None, schema=None, isolated=None, apply=None, merge=None, tools=None)`: immediate `AgentHandle`; use for a small fixed dependency graph or when the parent needs validated `schema` data.
- `wait(handles, timeout=None, *, raise_errors=True)`: ordered barrier for agent/completion handles only.
```

## 3. push 的登记、派发与返回顺序

`packages/coding-agent/src/task/workpool.ts:153-165`：

```ts
push(texts: string[]): string[] {
  if (this.closed) throw new ToolError(`workpool ${this.name} is closed`);
  if (texts.length === 0) return [];
  const queued: WorkPoolItem[] = [];
  for (const text of texts) {
    const seq = this.#nextSeq++;
    const item: WorkPoolItem = { id: `${this.name}#${seq}`, seq, text, status: "queued" };
    this.items.push(item);
    queued.push(item);
  }
  this.#ensurePoolJob();
  for (const item of queued) this.#queueDispatch(item);
  return queued.map(item => item.id);
}
```

`#ensurePoolJob` 以 `{ id: this.name, ownerId: this.ownerId, queued: true }` 登记聚合任务。

## 4. 并发上限与配置读取

`packages/coding-agent/src/task/workpool.ts:148-151`：

```ts
limit(): number {
  const configured = cfgTaskMaxConcurrency.get(this.session.settings);
  return configured > 0 ? configured : Infinity;
}
```

- `task.maxConcurrency` 默认 32；`0` 或负值表示 `Infinity`。
- `eval.workpool.freshAgents` 在池构造时读取一次：`this.freshAgents = cfgEvalWorkpoolFreshAgents.get(session.settings)`，默认 `false`。

## 5. 分派、上下文与批次

- 分派顺序：上下文占用最低的空闲工作者 → 未达上限则新建 → 否则按轮转排进忙碌工作者的队列。
- `#drain` 用 `agent.queue.splice(0)` 把当前队列全部合并为一个批次；批次 id 为 `${agent.id}-b${agent.turns + 1}`。
- 第一回合调用 `runStructuredSubagent`，并传入 `context: this.context`；后续回合调用 `runSubagentFollowUpTurn`，没有 `context` 字段。
- 工作者第一回合的批次只有一项；排队项在下一回合合并发送。
- `workpool(context: "")` 被拒绝：`workpool context must be a non-empty string`。

## 6. status 与 peek 形状

`packages/coding-agent/src/task/workpool.ts`：

```ts
export interface WorkPoolStatus {
  name: string;
  agent: string;
  limit: number;
  closed: boolean;
  freshAgents: boolean;
  agents: Array<{
    id: string;
    state: "running" | "idle" | "dead";
    queued: number;
    turns: number;
    contextTokens?: number;
    contextWindow?: number;
    current?: string;
  }>;
  items: Record<WorkPoolItem["status"], number>;
  batches: number;
}
```

```ts
export interface WorkPoolPeekResult {
  batches: Array<{
    id: string;
    agent: string;
    items: string[];
    status: WorkPoolBatch["status"];
    output?: string;
  }>;
  pending: number;
}
```

## 7. 投递、截断与聚合

`packages/coding-agent/src/task/workpool.ts`：

- `DELIVERY_OUTPUT_LIMIT = 6_000`；超出时输出前 6000 字符并加 `[output truncated to 6000 characters]`。
- 每个批次是独立后台任务，`manager.watchJobs([jobId])` 后自动投递被抑制。
- 排空时 `manager.consumeJobResults(batchIds)` 与 `manager.unwatchJobs(batchIds)`，然后 `closed = true`。
- 聚合结果只投递一次，任务 id 是池名。
- 聚合内联投递上限 `ASYNC_INLINE_RESULT_MAX_CHARS = 12_000`；超过时给 4,000 字符预览与 artifact 链接。

## 8. 关闭、重名与错误

- 排空后 `closed = true`；之后 `push()` 抛 `workpool <name> is closed`。
- 显式重名：registry 抛 `workpool "<name>" already exists`；job id 冲突抛 `workpool job id "<name>" already exists`。
- 未命名池自动加 `-2`、`-3` 后缀。
- `WorkPoolRegistry` 按 `${ownerId}\0${name}` 保存；只有 `releaseOwner` 删除，池名在所属会话结束前一直保留。
- 没有 `pool.wait()`；bridge 的 `op: "wait"` 抛 `unknown workpool operation "wait"`。
- 终止聚合任务会 `close()` 并取消所有批次；单独 `close()` 只取消排队项，正在跑的回合继续。
- 工作者消失时，排队的项会被重新分派。

## 9. notice 的创建、位置与生命周期

`packages/coding-agent/src/session/agent-session.ts`：

- 创建点只有两个：普通输入 `7630`，用户调用的 skill `7907`。
- `#createMagicKeywordNotices` 遍历 `MAGIC_KEYWORDS` 一次；同一关键词在一个 prompt 内只产生一条 notice。
- notice 通过 `prependMessages` 传入；组装时先 push plan/goal/vibe 上下文，再 push `options.prependMessages`，最后 push 用户消息。测试 `agent-session-magic-keywords.test.ts:211-223` 断言 `noticeIdx < userIdx`。
- 多个关键词按注册表顺序：`ultrathink`、`orchestrate`、`workflow`、`jevify`，不是文本顺序。
- 队列路径：notice 与用户消息成组入队，`setQueuedMessageGrouping` + `isHiddenUserCompanion` 保证一起投递、一起移除；队列界面隐藏 `display:false` 的 custom message。
- 重试不重新创建 notice；压缩时 `custom_message` 是合法切分点，保留区内的 notice 会随历史重放；恢复与分叉原样复制。
- 匹配基于展开后的 prompt；斜杠命令与模板可以引入关键词；`session.steer()` 与 `session.followUp()` 展开模板但不创建 notice；skill 只扫描 `details.args`。
- 合成 prompt（`options.synthetic`）不创建 notice。

## 10. 匹配掩码与边界

`packages/tui/src/prompt/markdown-prose.ts` 与 `magic-keywords.ts`：

- 掩码只有两阶段：按行处理围栏，再从左到右处理行内反引号与 `<…>` 结构；不是 CommonMark 解析器。
- 未闭合或闭合名字不匹配的 XML 元素，只掩码标签本身，内容仍为散文：`<note>workflowz` 命中，`<b>workflowz</i>` 命中。
- `<?xml workflowz ?>` 与 `<![CDATA[workflowz]]>` 命中；`?` 与 `!` 不是标签名起始字符。
- 4 个空格缩进的代码块不识别；4 个空格缩进的波浪线围栏会命中。
- 转义反引号 `` \`workflowz\` `` 被当成代码边界，不命中。
- `Array<workflowz>` 被当成未闭合标签，不命中。
- 边界字符：左右 `\p{L}\p{N}_/\\-`，左侧另有 `(?<!::)`，右侧另有 `(?!(?:\.\p{L}))` 与 `(?!(?:\\())`。
- 汉字紧贴两侧会阻断；中文标点、引号、emoji、撇号不阻断。
- `workflowz,` 命中；`workflowz's` 命中；`workflowz (now)` 命中；`workflowz()`、`workflowz.ts`、`foo::workflowz`、`workflowzs` 不命中。

## 11. 相关设置项与默认值

| 设置项 | 默认值 | 与 workflowz 的关系 |
|---|---|---|
| `magicKeywords.enabled` | `true` | 全局开关；关闭后 notice 与编辑器动画停止，静态高亮与拼写豁免保留 |
| `magicKeywords.workflow` | `true` | 单词开关；源码 id 为 `workflow` |
| `task.maxConcurrency` | `32` | 池的工作者上限；实时读取；`0` 为不限制 |
| `eval.workpool.freshAgents` | `false` | `true` 时每个工作项新起一个 agent；创建池时快照 |
| `eval.tools.enabled` | `true` | 决定 `tools=` 与 `@tool` 段落是否出现；允许工作者调用内核工具 |
| `task.maxRuntimeMs` | `0` | 单个工作者回合的墙钟上限；`0` 表示关闭；第一回合继承，后续回合实时读取 |
| `async.maxJobs` | `100` | 会话级后台任务上限；批次任务计入运行槽，聚合任务以 `queued` 登记，不占运行槽 |
| `task.maxRecursionDepth` | `2` | eval 子 agent 的嵌套深度；负值表示不限制 |
| `task.disabledAgents` | `[]` | 影响 `scout` 可用性与 notice 文本；禁用 agent 在创建池时报错 |

补充：`task.batch` 的值仍传入 `MagicKeywordContext`，但当前 notice 模板没有 `taskBatch` 分支。

## 12. 文档与测试落差

- `README.md:323`："`workflowz` — build a deterministic multi-subagent workflow with the active `task` tool." 这与当前 eval 编排不一致。
纯文本形式：workflowz — build a deterministic multi-subagent workflow with the active task tool.
- `docs/magic-keywords.md:54`："its notice adapts to the active task batching, scout availability, and Eval kernel-tool settings." 模板已无 `taskBatch`。
- `docs/settings.md` 的 Interaction 表没有 `magicKeywords.*` 行。
- 测试覆盖注入、开关、能力门槛与排序，但没有直接用生产正则测试大小写、路径、`::`、括号调用、汉字贴邻。
- 原 `packages/tui/test/magic-keywords.test.ts` 在 `dd78f0f69a` 删除。

## 13. 历史时间线

| 日期 | 提交 | 事件 |
|---|---|---|
| 2026-05-31 | `5fae08d2b7` | 创建 `workflow` 关键词与 notice 文件 |
| 2026-06-08 | `bc936cde43` | 触发词改为 `workflowz`，内部 id 保持 `workflow` |
| 2026-06-10 | `7450acd4f0` | 加入 `magicKeywords.workflow` 等开关 |
| 2026-07-05 | `92765fc409` | notice 改走 `task` 工具 |
| 2026-07-19 | `123ea5680a` | 回退到 eval 编排 |
| 2026-07-19 | `4088c20ecb` | 要求 `task` 与 `eval` 同时启用，加入双语言示例 |
| 2026-09-03 | `05bb0c1989` | WorkPool 重写，移除 `parallel()`/`pipeline()` |
| 2026-09-20 | `dd78f0f69a` | 关键词统一到 `modes/magic-keywords.ts` |
| 2026-10-19 | `5d72f5d3` | 当前检出 |

“deterministic” 在首版 notice、旧 `modes/workflow.ts` 注释、CHANGELOG 与当前文档中均指编排由显式代码写定；没有关于顺序可复现、种子或逐字节一致结果的承诺。

## 14. 继承的 subagent 设置

`packages/coding-agent/src/eval/workpool-bridge.ts:79-84` 创建池时调用 `resolveEffectiveSubagentPolicy`；`packages/coding-agent/src/task/structured-subagent.ts:414-428` 读取以下设置：

```ts
const agentModelOverrides = cfgTaskAgentModelOverrides.get(request.session.settings);
const agentServiceTierOverrides = validateAgentServiceTierOverrides(
  cfgTaskAgentServiceTierOverrides.get(request.session.settings),
);
const compactionThresholdOverrides = validateAgentCompactionThresholdOverrides(
  cfgTaskAgentCompactionThresholdOverrides.get(request.session.settings),
);
const agentAccountPools = validateAgentAccountPools(cfgTaskAgentAccountPools.get(request.session.settings));
```

| 设置项 | 默认值 | 作用 |
|---|---|---|
| `task.agentModelOverrides` | `{}` | 按 agent 名覆盖模型 |
| `task.agentServiceTierOverrides` | `{}` | 按 agent 名覆盖服务层级 |
| `task.agentCompactionThresholdOverrides` | `{}` | 按 agent 名覆盖压缩阈值 |
| `task.agentAccountPools` | `{}` | 按 agent 名指定 OAuth 账号池 |
| `task.agentIdleTtlMs` | `420_000` | 空闲 subagent 在内存中的驻留时长；超时停放到磁盘，消息或恢复时自动唤醒；`0` 保持到退出 |

`task.agentIdleTtlMs` 的 UI 描述原文：“How long an idle subagent stays live in memory before being parked to disk (ms). Parked agents are revived automatically when messaged or resumed. 0 keeps idle agents live until exit.”
