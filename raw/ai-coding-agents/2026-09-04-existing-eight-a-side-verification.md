# 已有八家的 A 侧机制取证(补验)

> Source: GitHub 源码直读 + DeepWiki MCP 问答
> Collected: 2026-09-04
> Published: Unknown

验证级别:`[single-source]` = 单一仓库(源码直读或 DeepWiki,均属该仓库自身材料);`[likely]` = 官方文档声明。一仓库 = 一源,即使读了多个文件。

本文件补齐 9 候选 B→A 对比中缺失的 A 侧(已有八家)证据。上一轮(2026-09-04-nine-candidates-b-to-a.md)对 Grok、OpenCode、OpenClaude、OMO 只列了文件名,本文件补上机制级摘录。

---

## 1. OMP —— TTSR

`[single-source]` 源码:`packages/coding-agent/src/session/ttsr-coordinator.ts`(本会话直读前 50 行):TTSR 在流上做 regex/AST 匹配,命中后 abort + 注入规则原文 + 重试。详见既有 wiki(omp-ttsr/ttsr-and-omfg.md)与 raw/2026-09-04-omp-session-event-log-and-extension-surface.md。

## 2. DSH —— Cordis + event sourcing

`[single-source]` 仓库结构:40+ packages,含 `cordis-core`、`cordis-plugin-*`、`hooks`、`subagent`、`compaction`。`docs/architecture.md` 直读:append-only SessionEvent 日志,内存零真相。

## 3. jcode —— 跨 harness 导入 + swarm

`[single-source]` 源码:`crates/jcode-import-core/src/lib.rs`(直读)提供外部 harness session 导入;`crates/jcode-app-core/src/server/swarm.rs`(直读)含 `report_back_to_session_id` 与 `MAX_SWARM_MEMBERS` 上限。

## 4. Grok —— doom-loop(本轮直读)

`[single-source]` 源码:`crates/codegen/xai-grok-sampling-types/src/doom_loop.rs` 头部注释(本会话直读):

```rust
//! Server-side doom-loop check: wire contract types and tolerant parsers.
//!
//! The inference API reports selected generation-loop detector families on streaming `/v1/responses` requests.
//! `x-grok-doom-loop-check` selects legacy labels, while `x-grok-exact-repetition-check` selects exact-repetition labels.
//! Reports use two places:
//!
//! * a non-standard mid-stream SSE event (`response.doom_loop_check`) emitted as new triggers appear, carrying the **cumulative** trigger set:
//! * a `doom_loop_check: {"triggers": ["…"]}` field on the terminal response object (`response.completed` / `response.incomplete`).
//!
//! The grammar is `tail_repetition:{threshold}@{channel}`, `exact_repetition:{tokens}x{copies}@{channel}`, or `low_logprob@{channel}`.
```

要点:

- 检测在**服务端**,通过 SSE 中途事件 `response.doom_loop_check` 或终态字段上报
- 触发词语法:`tail_repetition:{threshold}@{channel}`、`exact_repetition:{tokens}x{copies}@{channel}`、`low_logprob@{channel}`
- 「The feature can never fail a stream」——best-effort,绝不因检测失败而断流
- 客户端壳在 `xai-grok-sampler/src/doom_loop_recovery.rs` 与 `xai-grok-shell/src/session/doom_loop_telemetry.rs`

与 DeepCode `repeat_guard` 的关系:DeepCode 是客户端软提醒(渐进注入,不阻断);Grok 是服务端信号上报。同轴不同机制,且 Grok 依赖服务端特权信息(low_logprob)。

## 5. Prime Agent —— RLM

`[single-source]` 文档:`packages/coding-agent/docs/rlm.md`(本会话直读前 40 行):RLM 为持久 Python kernel,递归子调用。`skills/refine` 存在。

## 6. OpenCode —— session event sourcing(DeepWiki 问答)

`[single-source]` DeepWiki(repo: anomalyco/opencode)回答摘录:

```
Yes, OpenCode utilizes an append-only session event log and event sourcing for sessions.
The `packages/core` library implements a durable `SessionV2` system that is event-sourced
and backed by a database.

Session state changes are recorded as events and stored in a SQLite database using Drizzle ORM.
The `EventTable` is specifically designed as an event-sourced log for session and system changes.

The core `EventV2` service handles persistence, transactional sequencing, pub/sub, and replay
of these events. This system ensures that only one device can write to the session, while
multiple devices can "sync" session data by replaying the event log. Total ordering is
maintained with a simple sequence ID.

The `SessionProjector` listens to these session events and synchronizes them into optimized
SQL tables for querying.
```

检索页:https://deepwiki.com/search/does-opencode-have-an-appendon_5b78c402-2d2c-4ed7-82ff-920fe198bc8d

要点:OpenCode 的 event sourcing 是 SQLite 持久化 + 递增 seq 全序 + 单写多读 + projector 物化。比 DSH/OMP 的「文件 append-only 日志」多了**跨设备同步 replay**这一层(`sessions.events({after?})` 重连安全 API)。对 DSH「event sourcing 独有性」的降级裁定(功能等价)提供直接支持。

## 7. OpenClaude —— 订阅 OAuth + 多 provider(DeepWiki 问答)

`[single-source]` DeepWiki(repo: Gitlawb/openclaude)回答摘录:

```
OpenClaude explicitly supports Claude subscription OAuth. The `ConsoleOAuthFlow` component
provides options for users to log in with a "Claude account with subscription" (Pro, Max,
Team, or Enterprise) or an "Anthropic Console account" (API usage billing).

* Codex OAuth: signing in via ChatGPT ... supporting the GPT-5.6 family via the Responses API.
* GitHub Models: Interactive onboarding is provided for GitHub Models/Copilot.
* Multi-provider Routing: routing different agents to different models ... configured via
  `agentModels` and `agentRouting` in `~/.openclaude.json`.
```

检索页:https://deepwiki.com/search/what-authentication-and-provid_36bdfafa-5bf7-4ed3-a0a0-872d02b3027f

要点:订阅 OAuth(Claude Pro/Max/Team/Enterprise)+ Codex OAuth + 多 provider 路由均存在。与对比文「订阅 OAuth/多 provider = 功能等价」的裁定一致。

## 8. OMO —— keyword-detector + 五层 hook(DeepWiki 问答)

`[single-source]` DeepWiki(repo: code-yeongyu/oh-my-openagent)回答摘录:

```
The system uses a `keyword-detector` hook to identify specific keywords in user messages.
The `createKeywordDetectorHook` function in `packages/omo-opencode/src/hooks/keyword-detector/hook.ts`
is responsible for this detection.

Yes, `oh-my-openagent` features a comprehensive hook system with 5 tiers: `Session`,
`Tool Guard`, `Transform`, `Continuation`, and `Skill`.
```

检索页:https://deepwiki.com/search/how-does-ohmyopenagent-impleme_58fd29e6-1070-4917-8843-28a29c15d0e3

要点:keyword-detector 注入编排指令(与 OMP Magic Keywords 同轴);五层 hook 体系比此前认知宽。

---

## 与 9 候选对比相关的直接结论

1. **OpenCode event sourcing 坐实**:DSH 的 append-only event sourcing 降为「功能等价」的裁定得到更强支持(OpenCode 甚至有跨设备 replay API)。
2. **Grok doom-loop 是服务端机制**:DeepCode repeat_guard(客户端软提醒)与之不构成等价;两者同轴不同机制,此点不变。
3. **OMO 五层 hook** 与 DeepCode 的 Claude-Code 兼容 hook schema 同为 hook 生态方向,但 DeepCode 的 PreCompact 注入点本轮未见 OMO 等价物 `[unknown]`。

## 证据边界

- OMP/DSH/jcode/Grok/Prime 为本会话源码或文档直读,均为 `[single-source]`
- OpenCode/OpenClaude/OMO 为 DeepWiki 问答(仓库自身材料的二手综合),`[single-source]`,未逐一打开其引用的文件
- DeepWiki 回答可能基于过期索引;关键裁定若升级,应直读其引用文件复核
