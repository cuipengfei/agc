# 用户标注复核：五处对比断言的验证结果

> Source: DeepWiki MCP 问答（Claude Code、OpenCode、Prime Agent）、OMP 已安装包类型声明直读、claurst/Codewhale 源码直读（上一轮）
> Collected: 2026-09-04
> Published: Unknown

验证级别：`[single-source]` = 单一仓库材料；`[RUN]` = 本机实测。DeepWiki 为仓库自身材料的二手综合，索引可能过期。

本文件记录用户对 2026-09-04 候选对比表的五处标注的核查结果。

---

## 1. jcode swarm「主动通知同侪」是否独有

用户标注：「i think lots of them have this」

`[single-source]` DeepWiki（repo: anthropics/claude-code）:

```
Claude Code sessions can message each other across different machines using `SendMessage`.
You can discover available sessions using `ListAgents`. `SendMessage` also automatically
resumes stopped agents in the background. An experimental agent teams feature allows for
multi-agent collaboration. With `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` enabled, every
session implicitly has one team.
```

检索页：https://deepwiki.com/search/does-claude-code-support-sessi_d61d3587-69e1-408d-b588-155981df72d7

`[RUN]` OMP 的 `hub` 工具自述文本（本会话日常使用）：peer 消息、`send` 唤醒 idle/parked peers。

结论：用户正确。「主动通知同侪」不独有——OMP hub、Claude Code SendMessage/Agent Teams 都有。jcode 的独有性收窄为「服务端读集追踪」这一半；该半本轮未直读其代码，状态 `[unknown]`（此前为推断保留）。

## 2. Prime RLM 的 kernel 语言面

用户标注：「omp have eval for js and py」

`[RUN]` OMP eval 工具（本会话直接使用）：同一 kernel 接受 `language: "py"` 与 `language: "js"`，状态跨调用存活（已实测）。

`[single-source]` DeepWiki（repo: PrimeIntellect-ai/prime-agent）:

```
The RLM in Prime Agent is built around a persistent Python REPL kernel. Python variables,
imports, functions, and parsed results survive across multiple tool calls and compaction events.
The kernel primarily supports Python. The codebase mentions "JavaScript" in the context of
Extensions, which are TypeScript modules that run in the main Agent process (Node.js).
However, this is distinct from the RLM's code execution kernel, which is Python-based.
```

检索页：https://deepwiki.com/search/does-prime-agent-rlm-use-a-per_6046abe9-7dac-42e2-90b0-55d37cc1db41

结论：用户正确。RLM 的语言面上 OMP（py+js）比 Prime（py only）更宽。Prime 剩：RLM 的完整产品形态（rlm.md 声明的上下文作为变量、递归子调用产品化）与 kernel 状态 snapshot 恢复——未逐项复验。

## 3. claurst /fork 是否常见

用户标注：「this is very common, i think, check」

`[single-source]` DeepWiki（repo: anomalyco/opencode）:

```
The HTTP API exposes a `POST /session/:sessionID/fork` endpoint that creates a new session
by forking an existing one at a specified message point. The OpenCode CLI also supports
session forking through the `--fork` flag.
```

检索页：https://deepwiki.com/search/does-opencode-support-session_73f88369-61de-4e74-86f3-ecfae884cefa

`[single-source]` DeepWiki（repo: anthropics/claude-code）:

```
You can fork a conversation into a new background session using the `/fork` command,
which was later renamed to `/branch` (though `/fork` still works as an alias).
```

`[RUN]` OMP 已安装包 `dist/types/extensibility/extensions/types.d.ts`：

```
399:    /** Branch from a specific entry, creating a new session file. */
399-401:    branch(entryId: string): Promise<{ cancelled: boolean; }>;
830:    on(event: "session_before_branch", handler: ExtensionHandler<SessionBeforeBranchEvent, SessionBeforeBranchResult>): void;
831:    on(event: "session_branch", handler: ExtensionHandler<SessionBranchEvent>): void;
837:    on(event: "session_tree", handler: ExtensionHandler<SessionTreeEvent>): void;
```

结论：用户正确。`/fork` 类能力在 OpenCode、Claude Code、OMP 都有（OMP 的 session 日志带 `parentId` 父指针，与分支/树导航一致）。claurst 的 /fork 不构成独有，已从候选独有机制中移除。

## 4. Codewhale execpolicy 澄清

用户标注：❓ Clarify this

`[single-source]` 源码直读 `crates/execpolicy/src/lib.rs`（上一轮已摘录）：类型化规则集（Ruleset），含 trusted_prefixes / denied_prefixes，三层优先级（BuiltinDefault=0、Agent=1、User=2），可把特定工具调用标记为需审批。

澄清：execpolicy = 「策略即代码」的执行许可层——把「这个命令前缀要不要批」写成可提交、可评审、可叠加的规则文件，替代逐次交互审批。与 OMP 的交互式 approve/reject 是同轴（执行许可）不同实现形态（预声明规则 vs 运行时询问）。不是独有方向；差异在形态。

## 5. Reasonix prefix-cache 是否算独有

用户标注：「what? this counts? even? wtf? others not have this?」

结论：用户正确，该断言不成立。

- 证据只有 Reasonix README 一句「Engineered around prefix-cache stability」，源码未命中（上一轮已注明）
- 未证明别家没有；prefix-cache 稳定是各 harness 的通用工程关注点，举证责任在声称独有的一方
- 已从 Reasonix 的独有机制中移除；Reasonix 仅剩 sessiontemp（会话级临时目录隔离，`internal/sessiontemp/manager.go` 直读过头部注释）

---

## 修正后状态

| 项 | 修正 |
|---|---|
| jcode swarm | 独有收窄为「服务端读集追踪」；通知同侪不独有 |
| Prime RLM | 语言面 OMP 更宽；Prime 剩完整形态（未逐项复验） |
| claurst /fork | 从独有机制移除 |
| Codewhale execpolicy | 澄清为策略即代码，非独有方向 |
| Reasonix prefix-cache | 移除 |

## 证据边界

- Claude Code、OpenCode、Prime 的证据为 DeepWiki 问答 `[single-source]`，未逐一打开引用文件复核
- OMP 证据为本机类型声明直读 + 工具实测 `[RUN]`
- jcode 服务端读集追踪的代码本轮仍未直读
