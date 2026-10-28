# Auto-Learn capture 管线源码取证

> Source: can1357/oh-my-pi 源码 `5d72f5d3f4`（`packages/coding-agent/src/sdk.ts`、`autolearn/controller.ts`、`prompts/system/autolearn-nudge-autocontinue.md`、`tools/learn.ts`、`packages/agent/src/agent.ts`、`task/executor.ts`）；本机 omp 18.13.1；Mnemopi 项目 bank 只读查询；`~/.omp/agent/managed-skills/` 目录修改时间
> Collected: 2026-10-28
> Published: Unknown

观测到的运行时事件时间戳为 UTC 2026-10-27；本地日期为 2026-10-28。

## 1. capture runner 是分离实例

`packages/coding-agent/src/sdk.ts` 的 `createAutoLearnCaptureRunner`：

```ts
const captureTools = options.captureTools();
if (captureTools.length === 0 || signal?.aborted) return;
const captureModel = options.sourceAgent.state.model;
if (!captureModel) return;

const captureSessionId = options.createSessionId?.() ?? Bun.randomUUIDv7();
const captureProviderSessionState = new Map<string, ProviderSessionState>();
const captureMessages = options.sourceAgent.state.messages.map(...);
const captureAgent = options.createAgent({
    initialState: {
        systemPrompt: [...options.sourceAgent.state.systemPrompt],
        model: captureModel,
        thinkingLevel: options.sourceAgent.state.thinkingLevel,
        disableReasoning: options.sourceAgent.state.disableReasoning,
        tools: captureTools,
        messages: captureMessages,
    },
    sessionId: captureSessionId,
    promptCacheKey: captureSessionId,
    providerSessionState: captureProviderSessionState,
    getApiKey: requestModel => options.sourceAgent.getApiKey?.(requestModel),
    onPayload: options.onPayload,
    onResponse: options.onResponse,
});
```

要点：

- 复制父 agent 的 system prompt、model、thinkingLevel 与整段 message 快照。
- `sessionId` 与 `promptCacheKey` 取 `options.createSessionId?.() ?? Bun.randomUUIDv7()`。
- `sdk.ts` 中 `runAutoLearnCapture` 的接线（约 5287-5300 行）只传 `sourceAgent`、`captureTools`、`onPayload`、`onResponse`、`createAgent`，没有传 `createSessionId`；因此每次 capture 现取一个 UUIDv7。
- 该 agent 直接由 `new Agent({...})` 构造，没有 `SessionManager`。
- `packages/agent/src/agent.ts` 中检索 `Bun.write`、`writeFile`、`appendFile` 均无命中。
- 对比 `task/executor.ts`：subagent 经 `SessionManager.open` / `inMemory` 再 `createAgentSession`，因此会话目录下会出现 `<agent>.jsonl`；capture 没有对应文件。

## 2. 工具集

```ts
captureTools: () =>
    (["manage_skill", "learn"] as const)
        .map(name => session.getToolByName(name))
        .filter((tool): tool is AgentTool => tool !== undefined),
```

`tools/learn.ts`：

```ts
const learnSchemaBase = type({
    memory: type("string").describe("the durable, self-contained lesson to remember (what, when, why)"),
    "context?": type("string").describe("optional source context for the lesson"),
    "skill?": learnSkillSchema,
});
```

```ts
if (params.skill) {
    ...
    await writeManagedSkill(params.skill);
    ...
}
return {
    content: [{ type: "text", text: `${memoryMessage}.` }],
    details: { skill: null },
};
```

即：`skill` 参数可选，只有存在时才写 managed skill。

## 3. 提示词原文

`packages/coding-agent/src/prompts/system/autolearn-nudge-autocontinue.md` 全文：

```
Automated capture turn — not a user reply; user has not responded to your previous turn. Do not treat this prompt as their answer, approval to continue, or acceptance of any pending action; only the user can do so.

If your previous turn produced reusable output, capture it now only if it will genuinely help next time: repeatable procedure → managed skill (`manage_skill`); durable fact, convention, or user preference → remember with `learn` when memory enabled. If nothing worth keeping, do nothing.
```

发给 capture agent 的消息：

```ts
const captureMessage: CustomMessage = {
    role: "custom",
    customType: "autolearn-nudge",
    content,
    display: false,
    attribution: "agent",
    timestamp: Date.now(),
};
```

该消息只进入 capture agent，不进入父会话。

## 4. 触发判定

`packages/coding-agent/src/autolearn/controller.ts` 的 `#onAgentEnd`，按顺序：

1. 回合以 `stopReason: "aborted"` 结束 → return
2. `!cfgAutolearnEnabled.get(settings)` → return
3. `toolCalls < cfgAutolearnMinToolCalls.get(settings)` → return
4. `session.getPlanModeState()?.enabled` → return
5. `#turnStartedInGoalMode || session.getGoalModeState()?.enabled` → return
6. `cfgAutolearnAutoContinue.get(settings) !== true` → return

全部通过才 `#startCapture()`；`#captureInFlight` 为真时置 `#capturePending = true`，当前 capture 结束后补跑一次，不并发。工具调用数按回合统计，结束即比较。

## 5. 本次运行时间线

| UTC 时间 | 事件 |
|---|---|
| 2026-10-27T16:12:58.930Z | 六次 `bash` 调用的回合以 `stopReason: toolUse` 暂停 |
| 2026-10-27T16:13:29.311Z | 同一回合以 `stopReason: stop` 结束 |
| 2026-10-27T16:13:39.955Z | 记忆库新增 `source: coding-agent-learn` 记录 |

该回合的工具调用序列为六次 `bash`。父会话 transcript 中 `learn` 与 `manage_skill` 调用次数为 0。

## 6. 产物记录

查询：

```sql
SELECT id, source, timestamp, metadata_json, content
FROM working_memory
WHERE source = 'coding-agent-learn'
  AND metadata_json LIKE '%01a17d56-02fa-767c-a30f-021051826d9e%';
```

结果（1 条）：

```
id: e928a543333bdc2f
source: coding-agent-learn
timestamp: 2026-10-27T16:13:39.955Z
importance: 0.8
veracity: tool
metadata: {"session_id":"01a17d56-02fa-767c-a30f-021051826d9e","cwd":"/home/cpf/code-inside/agc","context":null,"tool":"learn"}
```

内容（原文）：

```
OMP 的 `~/.omp/agent/config.yml` 变更要新进程才生效，即使 `omp --resume <session-id>` 恢复同一会话也一样：本会话把 `autolearn.autoContinue` 从 false 改为 true 后，同一进程的多个 6+ 工具调用回合都没有触发 capture；换成新 PID 并 `--resume` 同一会话后，首个 6 次工具调用回合结束时立刻出现自动 capture 轮。判定 `autolearn.autoContinue` 是否真的在跑，看是否有独立的 capture 轮（头部声明「not a user reply」），它按回合统计工具调用数（需 ≥ `autolearn.minToolCalls`，当前 5），不按会话累计。
```

同 bank 内本会话相关统计：`coding-agent-learn` 1 条；`coding-agent-transcript` 11 条（记忆后端转录，与 capture 无关）。

数据库路径：`~/.omp/agent/memories/mnemopi/banks/agc-djmfd5jv3zsd/mnemopi.db`。

## 7. 产物质量

上述记录有两处与源码不符：

- 把“配置变更必须新进程才生效”写成既定事实。本会话没有热重载路径的取证；`main.ts` 中存在 `settingsInstance.startWatching()` 类监听路径，但未验证其对 autolearn 键的作用。
- 把 capture 描述成“带 not a user reply 头的独立 capture 轮”。该字符串是发给 capture agent 的私有消息（`display: false`），不在父会话可见。

与源码一致的部分：工具调用数按回合统计，门槛为 `autolearn.minToolCalls`。

## 8. skill 产物

`~/.omp/agent/managed-skills/` 下最新修改时间为 2026-10-10 21:44，本次运行前后无写入，即没有 skill 产物。

边界：记忆记录只保存 `tool: "learn"` 等元数据，不保存调用参数；目录未变只能证明没有成功写入 skill，无法区分“未传 `skill`”与“传了但被拒绝或写入失败”。

## 9. 可观测性结论

- capture 的独立 sessionId 不落盘，运行结束即消失。
- capture 的模型调用不写入父会话的 `model_usage`。
- 一次 capture 的产物有三种可能：`learn` 记忆行、managed skill 文件、无产物。提示词原文允许第三种："If nothing worth keeping, do nothing."
- 本次运行的正向证据是第 6 节这条 `coding-agent-learn` 记录；它只覆盖“写了记忆”这一种结果。
- 通用核验需要同时看两处：`working_memory` 里按会话过滤的 `coding-agent-learn` 行，以及 `~/.omp/agent/managed-skills/` 的文件修改时间。两处都没有变化时，capture 可能运行了且判定无内容可存；此时要查请求侧记录，或临时降低 `autolearn.minToolCalls` 并加观测，才能得到结论。
