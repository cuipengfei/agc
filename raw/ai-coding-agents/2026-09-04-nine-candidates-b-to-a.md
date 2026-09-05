# 9 个 Coding Agent 候选的 B→A 对比(源码验证)

> Source: GitHub API + 源码直读(README、核心源文件)
> Collected: 2026-09-04
> Published: Unknown

验证级别:`[verified]` = 源码直读确认;`[likely]` = README 声明但源码未直接验证;`[single-source]` = 仅官方自述。

本文件记录对 9 个新候选的 B→A 对比结果,包括源码验证后的机制确认和与已有八家的语义重叠分析。

---

## A. 源码验证结果

### DeepCode(HKUDS/DeepCode)— 值得深挖

`[verified]` `core/agent_runtime/repeat_guard.py`:

```python
"""Advisory repeat-call reminders — a soft loop-breaker, not a circuit breaker.

The tracker watches the stream of tool calls for runs of consecutive calls to
the same tool with identical canonicalized arguments, and at configured run
lengths returns an escalating reminder for the runner to inject as a
user-visible message. It never delays, rewrites, or blocks a call.

DEFAULT_THRESHOLDS: tuple[int, ...] = (3, 5, 8)
"""
```

关键区分:**软提醒,不是硬中断**。与 Grok doom-loop(服务端信号 → 客户端中断)不同机制,同一条「循环检测」轴。

`[verified]` `core/harness/hooks/events.py`:

```python
"""Hook event names and matcher semantics (C3).

The wire format is the Claude-Code-compatible hooks schema, so a hook the user
already wrote for that ecosystem runs here unchanged.

Event names: SessionStart, UserPromptSubmit, PreToolUse (may block/rewrite),
PostToolUse (may inject feedback), Stop (may force-continue), PermissionRequest,
PreCompact, PostCompact, SessionEnd, SubagentStart, SubagentStop.
"""
```

关键区分:**Claude-Code 兼容 hook schema**,已有生态的 hook 可直接复用。

### claurst(Kuberwastaken/claurst)— 值得深挖

`[verified]` `src-rust/crates/tools/src/team_tool.rs`:

```rust
// Team tools: create and disband multi-agent swarm teams.
// TeamCreateTool — create a named team, run N AgentTool sub-agents in parallel
//                  via the globally-injected AgentRunner, and return aggregated
//                  results from every agent.
```

`[verified]` `src-rust/crates/commands/src/session.rs`:

```rust
// Session-control commands: /plan, /tasks, /session, /fork.
// /fork — Fork the current session into a new branch at the specified message index.
```

关键区分:**会话分叉**(`/fork`)与 jcode 的**跨 harness 恢复**是不同轴。

### Codewhale(Hmbown/Codewhale)— 值得深挖

`[verified]` `crates/execpolicy/src/lib.rs`:

```rust
/// Priority layer for typed permission-rule selection.
pub enum RulesetLayer {
    BuiltinDefault = 0,
    Agent = 1,
    User = 2,
}

/// A named set of allow/deny prefix rules at a given priority layer.
pub struct Ruleset {
    pub trusted_prefixes: Vec<String>,
    pub denied_prefixes: Vec<String>,
    // Typed rules that mark specific tool invocations as requiring approval.
}
```

`[verified]` `crates/hooks/src/lib.rs`:

```rust
/// All events that can be emitted through the hook system.
pub enum HookEvent {
    ResponseStart { response_id: String },
    ResponseDelta { ... },
    // ...
}
```

关键区分:**类型化权限规则**(allow/deny prefixes、三层优先级)与 OMP 的**审批工作流**(approve/reject 交互)是同轴不同深度。

### Reasonix(esengine/DeepSeek-Reasonix)— 值得深挖,但机制面比 README 声称的窄

`[verified]` `internal/sessiontemp/manager.go`:

```go
// Package sessiontemp provides a logical-session private temporary directory
// manager. Bash and related sandboxed helpers share one directory for the
// duration of a logical chat session.
```

`[verified]` `internal/plugin/cache.go`:

```go
// Package-internal cache for MCP handshake results. The handshake costs
// hundreds of ms to a few seconds per server on cold start. We persist the
// tool schema + capabilities under the user cache dir.
```

`[likely]` prefix-cache 稳定性:README 声明「Engineered around prefix-cache stability」,但源码中未找到直接实现(可能在 prompt 构造层,未深入)。

### pi-mono(badlogic/pi-mono)— 对照基准

`[single-source]` README 声明:

```
pi does not include a built-in permission system for restricting filesystem,
process, network, or credential access. By default, it runs with the
permissions of the user and process that launched it. If you need stronger
boundaries, containerize or sandbox pi.
```

价值:校准 OMP 哪些能力是 fork 后加的(权限层、TTSR、session 管理等)。

### crush / goose / openinterpreter / aider — 低优先

机制面与已有八家重叠,未见独有:

- crush: mid-session LLM switch(≈ OMP model_change)、LSP-enhanced(≈ 多数 agent 都有)
- goose: goose-local-inference(≈ Ollama 集成)、goose-context-management(≈ 上下文管理)
- openinterpreter: Codex SDK 兼容、ACP 兼容(≈ 兼容层,非核心机制)
- aider: git integration、auto-commit(≈ 多数 agent 都有)

---

## B. 与已有八家的语义重叠

| 候选机制 | 已有八家等价物 | 关系 |
|---|---|---|
| DeepCode repeat_guard(软提醒) | Grok doom-loop(硬中断) | 同轴不同机制 |
| DeepCode precompact hook | OMP TTSR(流式中断) | 同轴不同时机(压缩前 vs 流式中) |
| claurst teamcreate | OMP task/hub | 同轴不同实现(DI 模式 vs 内置) |
| claurst /fork | jcode 跨 harness 恢复 | 不同轴(会话分叉 vs 跨工具恢复) |
| Codewhale execpolicy | OMP 审批工作流 | 同轴不同深度(类型化规则 vs 交互式审批) |
| Codewhale hooks | OMP extension | 同轴不同覆盖(生命周期事件 vs 20+ 事件) |
| Reasonix sessiontemp | 无 | 可能独有(会话级临时目录隔离) |
| Reasonix prefix-cache | 无 | 可能独有(长 session 成本优化) |

---

## C. 证据边界

- DeepCode、claurst、Codewhale、Reasonix 的机制为源码直读确认 `[verified]`
- Reasonix 的 prefix-cache 为 README 声明,源码未直接验证 `[likely]`
- pi-mono 的权限系统缺失为 README 声明 `[single-source]`
- crush、goose、openinterpreter、aider 的「无独有」为 README + 结构侦察,未深入源码 `[likely]`
- 已有八家的机制引用自 `wiki/ai-coding-agents/4-agent-comparison.md` 和 `wiki/ai-coding-agents/grok-build.md`

## D. 未验证项

- DeepCode 的 goal_runtime.py 实际行为(只读了文件头)
- claurst 的 memory consolidation 实现(README 提及,源码未深入)
- Codewhale 的 secrets crate 具体功能
- Reasonix 的 QQ 远程会话实现
- 已有八家是否真的没有这些机制(只查了 wiki,未读源码)
