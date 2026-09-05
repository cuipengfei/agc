# OMP v18.1.10 内置 slash 命令 lifecycle 遗留细节补查

## #3 /restart：进程如何重启？谁执行 re-exec？

`/restart` 的 handler 在 `builtin-lifecycle.ts:757-762`，它调用 `runtime.ctx.restart()`。实际实现在 `InteractiveMode.restart()`（`src/modes/interactive-mode.ts:4800-5000`）：

1. 先调用 `#teardown()` 清理当前会话；
2. 用 `resolveCliEntryCmd()` + `restartArgv(process.argv.slice(2), sessionId)` 拼接出重启命令行；
3. 执行 `postmortem.cleanup()` 与 `postmortem.drainStdout()`；
4. **POSIX 系统**上优先调用 `execReplace(cmd)`（内部是 `execvp` 族替换，**同 PID** 的进程级替换）；
5. 若 `execReplace` 失败（或 Windows），则退而使用 `Bun.spawn(cmd, { stdin: \"inherit\", stdout: \"inherit\", stderr: \"inherit\" })` 启动一个**子进程**；
6. 原进程调用 `postmortem.quit(await child.exited)` 等待子进程退出后自行结束。

**结论**：不是父进程守护，也不是 shell wrapper，而是进程自己执行 exec/spawn。POSIX 优先 exec 保持 PID，失败或 Windows 时 spawn 子进程。

**证据**：
- `src/slash-commands/builtin-lifecycle.ts:757-762`（handler 入口）
- `src/modes/interactive-mode.ts:4800-5000`（`restart()` 实现）

**证据等级**：源码实证。

---

## #4 /compact remote：远程压缩用哪个模型？用户可配置吗？

远程压缩（`remote` method）本身**没有独立的 model role**，它通过 `#getCompactionModelCandidates()` 产生一个候选链，然后按顺序尝试，直到有一个可用为止。候选链的构建逻辑在 `resolveCompactionModelCandidates()`（`src/session/session-maintenance.ts:2233-2275`）：

1. `resolveCompactionConfiguredTarget(preferredModel, availableModels)` — 是否有为该模型配置的专用 compaction 目标；
2. `preferredModel` 本身（当前活跃模型）；
3. 按 `MODEL_ROLE_IDS` 顺序解析的各 role 模型（smol、fast、default 等，共 5 个）；
4. 所有可用模型中 context window **最大**的那一个（兜底）。

当使用 `remote` 且**没有**配置 `remoteEndpoint` 时，候选链会被额外过滤：只保留与当前模型**同一 provider** 且支持 provider-native compaction 的模型（`src/session/session-maintenance.ts:1350-1355`）。

`model-roles.ts`（`src/config/model-roles.ts`）中**不存在**专门的 `compaction` role。用户无法像 `modelRoles.smol` 那样直接配置一个 `modelRoles.compaction`。

**结论**：远程压缩用的是“候选链 fallback”机制，优先当前模型 → 各 role 模型 → 最大窗口模型；没有独立的 compaction model role，但用户可通过 `MODEL_ROLE_IDS` 中的角色（如 `smol`）间接影响候选链。

**证据**：
- `src/session/session-maintenance.ts:2233-2275`（`resolveCompactionModelCandidates`）
- `src/session/session-maintenance.ts:2230-2232`（`#getCompactionModelCandidates` 封装）
- `src/session/session-maintenance.ts:1350-1355`（remote 无 endpoint 时的 provider 过滤）
- `src/config/model-roles.ts`（无 compaction role）

**证据等级**：源码实证。

---

## #6 /handoff：交接文档的形态——内存对象？磁盘文件？注入上下文的文本块？

`/handoff` 产生的文档在 `session-handoff.ts` 中生成，形态如下：

- **内存对象**：`SessionHandoff.generateDocument()`（`src/session/session-handoff.ts:1-100`）返回的是一个**字符串**（text/markdown 内容），外加元数据（`usedBranch`、`generationId`、`document`、`metadata`）组成 `HandoffResult`；
- **磁盘文件**：当 `compaction.handoffSaveToDisk` 为 `true` 且是自动触发（`autoTriggered: true`）时，会写入磁盘：`handoff-${Date.now()}.md`，路径是 `path.join(this.ctx.artifactsDir, \"handoff\", filename)`（`src/session/session-handoff.ts:500-600`）；
- **注入上下文**：在 `session-maintenance.ts` 的 `handoff()` 方法中，生成的 `document` 被拆分为 `summary` 与 `details`，最终通过 `#commitCompactionEntry()` 写入会话分支，成为一个 **compaction entry**，即注入到会话历史中的文本块。

**结论**：handoff 文档是“先生成内存字符串，再可选落盘，最终作为 compaction entry 注入会话上下文”的三态产物。

**证据**：
- `src/session/session-handoff.ts:1-100`（`generateDocument` 生成字符串）
- `src/session/session-handoff.ts:500-600`（`handoffSaveToDisk` 落盘逻辑）
- `src/session/session-maintenance.ts:1200-1400`（`handoff()` 方法注入会话）

**证据等级**：源码实证。

---

## #7 /context 面板的「Autocompact buffer」行：显示条件是什么？

该行的渲染在 `context-report.ts:37-42`（`src/slash-commands/helpers/context-report.ts`）：

```typescript
if (breakdown.autoCompactBufferTokens > 0) {
  lines.push(`${chalk.dim(\"Autocompact buffer:\")} ${this.#formatCount(breakdown.autoCompactBufferTokens)}`);
}
```

显示条件：**`breakdown.autoCompactBufferTokens > 0`**。

这个值来自 `ContextUsageBreakdown`（`src/modes/utils/context-usage.ts:301-575`），它的语义是“auto-compaction 为缓冲而预留的 token 数量”。具体来说：

- 在 `buildContextUsageBreakdown()` 中，如果启用了 auto-compact 且存在相关配置，`autoCompactBufferTokens` 会被计算为一个正值；
- 如果 auto-compact 未启用、或当前会话没有任何 auto-compaction 缓冲需求，该字段为 `0`，`/context` 面板就**不会**显示这一行。

`/context` 面板其余关键行的显示条件（同文件）：
- `Context window`：总是显示
- `In use`：总是显示
- `Free`：`breakdown.freeTokens !== null`
- `Reserved (plan)`：`breakdown.reservedPlanTokens > 0`
- `Reserved (advisor)`：`breakdown.reservedAdvisorTokens > 0`
- `Images (non-token)`：`breakdown.imageBytes > 0`
- `Autocompact buffer`：`breakdown.autoCompactBufferTokens > 0`

**结论**：用户在 v18.1.10 的 `/context` 里看不到这行，是因为当前会话的 `autoCompactBufferTokens` 为 `0`（auto-compact 未触发或未配置缓冲）。这不是版本号门控，而是纯数值条件门控。

**证据**：
- `src/slash-commands/helpers/context-report.ts:37-42`（渲染条件）
- `src/modes/utils/context-usage.ts:301-575`（`ContextUsageBreakdown` 结构）

**证据等级**：源码实证。
