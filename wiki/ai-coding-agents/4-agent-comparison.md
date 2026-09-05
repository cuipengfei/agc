# 六 AI Coding Agent 对比：真正独特优势

> Sources: 官方 GitHub 仓库与文档，2026-08-27; Prime Agent 技术实质，2026-08-30; Prime Agent 社区 Reception，2026-08-30; jcode 与 OpenClaude 调研，2026-09-01
> Raw: [四 AI Coding Agent 对比研究原始记录](../../raw/ai-coding-agents/2026-08-27-4-agent-comparison.md); [jcode 与 OpenClaude 调研原始记录](../../raw/ai-coding-agents/2026-09-01-jcode-openclaude-research.md); [Grok Build 机制](../../raw/ai-coding-agents/2026-09-03-grok-build-mechanisms.md); [竞品循环检测调查](../../raw/ai-coding-agents/2026-09-03-loop-and-stall-detection-survey.md); [OMP 跨 harness 导入与 eval kernel 原语](../../raw/ai-coding-agents/2026-09-04-omp-cross-harness-and-eval-primitives.md); [OMP session 事件日志与 extension 事件面](../../raw/ai-coding-agents/2026-09-04-omp-session-event-log-and-extension-surface.md); [OMP 编辑防护与 agent 资产 CRUD](../../raw/ai-coding-agents/2026-09-04-omp-edit-guard-and-asset-crud.md); [OMP 压缩期与分支 extension 事件](../../raw/ai-coding-agents/2026-09-04-omp-compaction-and-branch-events.md); [9 个候选 B→A 对比](../../raw/ai-coding-agents/2026-09-04-nine-candidates-b-to-a.md); [已有八家 A 侧取证](../../raw/ai-coding-agents/2026-09-04-existing-eight-a-side-verification.md); [用户标注复核修正](../../raw/ai-coding-agents/2026-09-04-annotation-review-corrections.md); [四源能力调查 17 agents](../../raw/ai-coding-agents/2026-09-05-four-lane-capability-survey.md)
> Updated: 2026-09-05

## 研究对象

| 工具 | 仓库 | 核心定位 |
|------|------|---------|
| OpenCode + OMO | `anomalyco/opencode` + `code-yeongyu/oh-my-openagent` | 插件生态 + OMO 编排层 |
| OMP | `can1357/oh-my-pi` | 多模式 agent harness |
| Prime Agent | `PrimeIntellect-ai/prime-agent` | RLM-native + 配置持久化 harness（非自学习） |
| DSH | `deepseek-ai/deepseek-harness` | DeepSeek 官方 harness |
| jcode | `1jehuang/jcode` | Rust 编写、主打低内存的 harness（YC S26） |
| OpenClaude | `Gitlawb/openclaude` | Claude Code 泄漏源码衍生、多 provider 化（法律灰色） |

## 研究方法

调查方法从默认的 A-first 改为 B→A：

- **A-first** 拿已有 agent 的独有能力当清单，去查新 agent 有没有。结构性缺陷：输出空间里没有「独有」这个值，只能返回追平或落后。
- **B-first** 先用低成本方式枚举新 agent 自己的能力面（deepwiki 目录树 + 一次定向提问），挑出候选独有项，再对每个候选反查已有 agent 是否存在等价物。本轮 B-first 从 `xai-org/grok-build` 中捞出 2 个候选独有项 + 1 处既有裁定修正，A-first 遗漏。
- **厂商叙述污染枚举** 的实例：官方反复宣传「并行优于深度」，导致两个 scout 报告了互相矛盾的数字（8 vs 128），真值为 32 并发 + 128 次调用预算。收敛轮不可省。
- 官方文档、GitHub PR/issue、源码验证。

## 真独有优势

别人没有，或无法通过简单配置获得。

### OMP：TTSR 完整闭环

**是什么**：在模型流式输出过程中，正则/AST 规则实时匹配；命中时中断生成、注入规则提醒、重试。

**为什么独特**：
- OpenCode PR #14741 提出类似功能但 closed 未合并
- DSH 有第三方 `dsh-stream-rules` 插件，但无 abort+retry 完整闭环
- Prime Agent 需自行开发

> **Status: Narrower competitor exists** (2026-09-03)
> Grok Build `doom-loop` achieves the same mid-stream abort + reminder + retry via a server-side signal (`response.doom_loop_check`) rather than client-side detection. `[single-source]` It is narrower in expressiveness: it handles only server-side degeneration signals (`tail_repetition`, `exact_repetition`, `low_logprob`) with one fixed reminder, and supports no user-defined rules. Its one structural edge is `low_logprob` — OMP's TTSR pipeline matches regex/AST over stream deltas and does not receive server-side sampling metadata. See [Grok Build](grok-build.md).

**证据**：https://github.com/can1357/oh-my-pi/blob/main/docs/ttsr-injection-lifecycle.md

### DSH：Cordis everything-is-plugin

**是什么**：session log、agent loop、tool registry 都作为可配置替换的插件，组成可逆 plugin tree。

**为什么独特**：
- OMP 有扩展 API，但核心 loop 不可配置替换
- OpenCode 有 DI 和服务替换边界，但非完整配置式契约
- Prime Agent 的 Agent loop 由固定 `pi-agent-core` 提供

**证据**：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md

> **Status: Narrower than stated** (2026-09-04)
> 第 50 行「OMP 有扩展 API，但核心 loop 不可配置替换」经本机复核成立，但该行低估了 OMP 拦截面的宽度：extension/hook 类型声明覆盖 20 余个事件（含 `before_provider_request`「Can replace the payload」、`tool_call`「Can block」、`before_agent_start`），`plugin` 子命令支持 install/link/enable/disable/marketplace/scope。区别不在「有没有插件系统」，而在**核心组件是可替换（substitute）还是仅可拦截（intercept）**。OMP 类型声明中未发现替换 agent loop、session log 后端或 tool registry 的注册点，因此本项作为独有能力仍然成立——但成立的理由应改为可替换性，不是插件系统的有无。未读 OMP 源码，未排除未文档化路径。

### DSH：Append-only event sourcing

**是什么**：typed SessionEvent log 为 source of truth，模型历史由日志投射。

**为什么独特**：
- OpenCode v2 也有 durable event sourcing，但架构目标不同（非插件化核心）

**证据**：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md

> **Status: Outdated** (2026-09-04)
> 本项不应算真独有。本机 OMP session `.jsonl` 就是 typed append-only 事件日志：每行带 `type` 判别式（`message`、`custom`、`model_change`、`compaction`、`ttsr_injection` 等 11 种），非首行带 `id`/`parentId`/`timestamp`，历史沿父指针投射；抽样文件 1245 行中 3 个 `compaction` 事件均以事件形式落盘，第一个之前仍保留 340 行未被截断或改写，1244 个带 id 条目零重复。`--export` 与 `-r/--resume` 都从该文件投射。加上第 61 行本已承认 OpenCode v2 有 durable event sourcing，本项降为「功能等价」。未验证 runtime 是否以该日志为唯一 source of truth。

### jcode：跨 harness 会话恢复与凭据导入


> **Status: Partial competitor exists** (2026-09-03)
> Grok Build `xai-grok-foreign-sessions` scans `~/.claude/projects/` and `~/.codex/state_*.sqlite` for metadata (title, cwd, branch, timestamp) but does **not** resume conversation history or read credentials. Conversely, Grok Build's `claude_import.rs` imports Claude *settings* (rules, MCP, hooks, env) which jcode does not do. The two capabilities are on different axes. See [Grok Build](grok-build.md).

**是什么**：可 resume Codex、Claude Code、OpenCode、pi 的会话继续对话；可检测并经用户同意后读取这四家及 Gemini/Copilot 的本地凭据（含 macOS Keychain），拒绝 symlink。

**为什么独特**：OpenCode、OMP、Prime 均只有自家 session/credential 机制，无跨 harness 导入器（DSH unknown）。注意这是互操作/迁移能力，不提升 agent 智能。

> **Status: Outdated** (2026-09-04)
> 上面这句对 OMP 是错的。本机实测 `omp/18.1.10` 有 `--from-claude`（`Import a Claude Code session into OMP`）与 `--from-codex`（`Import a Codex session into OMP`）。jcode 在这条轴上仍然更宽——4 家 harness 会话恢复 + 6 家凭据导入（含 macOS Keychain），对 OMP 的 2 家、仅 session、不导凭据——因此本项从「真独有」降为「覆盖面更广」。未发现 OMP 有导入其他 harness 凭据的开关；`auth-broker` 与 `token` 服务于 OMP 自身 provider。

**证据**：https://github.com/1jehuang/jcode/blob/master/OAUTH.md ; https://github.com/1jehuang/jcode/blob/master/crates/jcode-tui/src/tui/app/onboarding_flow.rs

### jcode：Server 中介的 swarm 读集冲突通知

**是什么**：多 agent 同 repo 工作时，agent A 修改 agent B 读过的文件，server 主动通知 B。

**为什么独特**：OpenCode 的冲突处理是 session 输入生命周期；OMP 是 git merge 语义；Prime 无文件级读集追踪（DSH unknown）。

**证据**：https://github.com/1jehuang/jcode/tree/master/crates/jcode-harness-api-server

> **Status: Reason corrected** (2026-09-04)
> ① 第 90 行对 OMP 的描述不准。OMP 的并发防护不是 git merge 语义，而是内容哈希 tag：`read`/`search`/`write` 为文件全文铸造短 tag，edit 必须携带，文件变动则以 `HashlineMismatchError` 拒绝。但 `edit/store.d.ts` 明写 **Session-scoped**、**One store per ToolSession**——per-agent、写入时才触发的 reactive 防护。② 「主动通知同侪」**不独有**：OMP hub 有 peer 消息（`send` 唤醒 idle/parked peers），Claude Code 有 `SendMessage`（跨机器会话互发）+ Agent Teams（DeepWiki 2026-09-04，`[single-source]`）。独有性收窄为**服务端读集追踪**（追踪谁读了什么、何时发现过期）这一半；该半本轮未直读 jcode 读集实现代码，状态 `[unknown]`。

## 同类但成熟度更强

别人有等价或可复制，但实现更完整或已合并主线。

### Prime Agent：RLM 完整产品形态

**是什么**：persistent IPython kernel + programmatic context slicing + recursive child agents + Continual Harness 的统一编程模型。

**现状**：
- OMP #9787 open 未合并（review:p2，17 轮 Codex review）
- OpenCode #8555/#13499 closed 未合并
- DSH 需外部插件 `deepseek-rlm`（需 3 个 host patches）

> **Status: Outdated** (2026-09-04)
> 上面的 OMP 一行已不足以证明 OMP 缺 RLM。本机实测 `omp/18.1.10` 的 `eval` 工具，kernel 状态跨独立调用存活（同一会话内跨多轮观察到），其自述 API 含 `agent()`、`workpool()`、`completion()`、`@tool`；工具列表另有 `python` 与 `notebook`。这只建立「OMP 有 RLM-like primitives」，不是追平：`agent()` 递归、programmatic context slicing、kernel 是否跨 `task` subagent 共享均未实测，也未读 OMP 源码。Prime Agent 已核实的完整产品形态仍然成立；Continual Harness 不受本条修正影响。

**证据**：https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/rlm.md

### Prime Agent：Continual Harness

**是什么**：prompt/memory/skill/subagent 四类统一 state + `/refine` 在线精确 CRUD + rollback。

**现状**：其他工具需开发，无等价已合并实现。

**证据**：https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/rlm-runtime.md

> **Status: Narrower than stated** (2026-09-04)
> 第 116 行「其他工具需开发」对 OMP 不成立。OMP 有 agent 资产 CRUD：`manage_skill` 工具的 `action` 为 `"create" | "delete" | "update"`（gated behind `autolearn.enabled`），`/omfg` 侧有 `OmfgController` + `buildOmfgRuleForPath` + `validateRuleAgainstAssistantHistory`，规则生成后对 assistant 历史校验、用户确认，再落 project 或 user 级。在 `dist/types` 中检索 rollback 相关项，只命中 advisor transcript 回退与 git 行选择 revert，**未发现 skill/rule 资产的版本化或 rollback**。因此 Prime 的优势应收窄到 rollback/版本化这一维，不是整个资产可持续修正能力类。Prime `/refine` 本次未取证。

## 功能等价（非独特）

| 功能 | OMP | OpenCode+OMO | 说明 |
|------|-----|-------------|------|
| 关键词触发 | Magic Keywords（ultrathink/orchestrate/workflowz） | OMO keyword-detector（ultrawork/ulw/hyperplan） | 词表不同，机制类似 |
| 多 agent 编排 | Vibe（read-only director + persistent workers） | OMO 多 agent（sisyphus/prometheus/atlas） | 可配置等价 |
| 规划后交棒 | Prewalk | 第三方复刻（pi-prewalk、codex-prewalk） | 可复制 |
| 自动记忆图 | mnemopi（embedding + episodic graph + veracity consolidation） | 无（session persistence 级） | jcode 的记忆图非独有，差异仅在自动注入 + sideagent 验证 + ambient consolidation 的组合 |
| 订阅 OAuth 登录 | unknown | OpenCode 有 ChatGPT Plus/Pro 与 Copilot；Prime 有 ChatGPT/Claude/Copilot | OpenClaude 的 Codex/xAI OAuth 非独有 |

## 无独特优势

**OpenCode（单独）**：所有能力均可在其他工具找到等价或近似。优势在插件生态活跃度，非架构独特性。

**OpenClaude**：无真实独有功能。多 provider、订阅 OAuth、hooks、记忆、VS Code 扩展均非独有；gRPC headless 与 OpenCode serve 能力等价；Buddy 为纯 UI 装饰。唯一差异是唯一公开的「Claude Code 原版 harness + 任意模型」衍生实现，价值在源码研究，且伴法律灰色风险（2026-03-31 泄漏事件 + DMCA 8.1K 仓库 fork 网络下架；未见诉讼）。社区无头部人物评测；周边有假冒泄漏仓库的恶意软件诱饵与诈骗帖。

**jcode 性能宣称**：官方自测 PSS 27.8 MB（embedding off）、启动比 Claude Code 快 72.2×；无第三方复测，方向可信（Rust vs Node）、精确倍数存疑。

## 结论

- **当前独有候选(单源,未被竞品取证推翻)**:OMP TTSR、DSH Cordis(成立点为核心可替换性,非插件系统有无)、jcode swarm 服务端读集追踪(「主动通知同侪」已证常见——OMP hub、Claude Code SendMessage 均有;读集追踪本身未直读验证)。按一仓库=一源规则,全部 `[single-source]`,跨源复现未做,不构成已证实的真独有
- **覆盖面/成熟度更强**：jcode 跨 harness 互操作（4 家会话 + 6 家凭据 vs OMP 2 家会话）、Prime Agent Continual Harness（优势收窄至资产 rollback/版本化；CRUD 侧 OMP 已有）
- **成熟度待重估**：Prime Agent RLM —— 本机当前 OMP 已有 RLM-like primitives（版本锚点见上方 Status 块与 raw），完整形态的差距未逐项复验
- **功能等价**：OMP Magic Keywords vs OMO 关键词触发、OMP Vibe vs OMO 多 agent、jcode 记忆图 vs OMP mnemopi、OpenClaude 订阅 OAuth/多 provider vs OpenCode/Prime
- **功能等价（本轮新降级）**：DSH append-only event sourcing vs OMP typed session 事件日志 vs OpenCode v2 durable event sourcing
- **无独特**：OpenCode 单独、OpenClaude（差异仅为泄漏源码衍生身份，附法律风险）
- **新发现（待继续验证）**：Grok Build 服务端 doom-loop 信号（只处理服务端退化信号，不支持任意用户规则；`low_logprob` 是 TTSR 流管线拿不到的那一类）、LazinessDetector 声称-证据比对（默认观测模式）
- **新发现（待继续验证）**：OMP `/tan` 后台 fork 分身——session 身份分离 + prompt cache key 共享父会话缓存 lineage（OpenAI 官方 best practice 同样建议分叉共享 key）；OpenCode/OMO 侧等价物未调查。详见 [OMP /tan](../omp-background-agents/tan-command.md)

## 新候选 B→A 对比(2026-09-04)

对 9 个新候选(pi-mono、DeepCode、claurst、Reasonix、Codewhale、crush、goose、openinterpreter、aider)做 B→A 对比。

> **Status: Single-source** (2026-09-04)
> 9 个新候选与已有八家的机制均经本轮取证,方式为混合取证:新候选中 DeepCode/claurst/Codewhale/Reasonix 有源码直读,pi-mono 仅 README,crush/goose/openinterpreter/aider 仅 README + 结构侦察;已有八家中 OMP/DSH/jcode/Grok/Prime 为源码或文档直读,OpenCode/OpenClaude/OMO 为 DeepWiki 问答(仓库自身材料的二手综合)。按一仓库=一源规则,全部标 `[single-source]`;跨源裁定仍为待复现。

### 值得深挖(2)

| 候选 | 独有机制 | 与已有八家关系 |
|---|---|---|
| **DeepCode** | repeat_guard 软循环提醒(3/5/8 阈值渐进,不阻断);hooks 使用 Claude-Code 兼容 schema | repeat_guard 与 Grok doom-loop 同轴不同机制(软提醒 vs 硬中断)。~~PreCompact 时机~~已证伪:压缩前注入是通用能力——OpenCode `experimental.session.compacting`、Claude Code `PreCompact`、OMP `session_before_compact`+`session.compacting`(types.d.ts:832-833)都有。剩生态兼容差异:CC schema 的 hook 可直接跑,OpenCode/OMP 为自家模型 |
| **Reasonix** | sessiontemp 会话级临时目录隔离 | sessiontemp 可能独有;~~prefix-cache 稳定性~~已移除——README 营销措辞,源码未命中,且未证明别家没有(prefix-cache 稳定是各 harness 的通用工程关注点,举证责任在声称独有的一方) |

### 对照基准(1)

**pi-mono**:OMP 上游,README 明说无内置权限系统。价值在校准 OMP 哪些能力是 fork 后加的。

### 低优先(6)

claurst、Codewhale(经标注复核后移入:机制面常见,见上表)、crush、goose、~~openinterpreter~~、aider:机制面与已有八家重叠,未见独有。

> **Status: Outdated** (2026-09-05)
> openinterpreter 移出低优先。2026-09-04 将其判为「兼容层、非独有」依据的是 README + 结构侦察;2026-09-05 grep.app repo 级源码直证其 `codex-rs` 内有 harness 仿真层:`codex-rs/tools/src/harness.rs` 定义 `pub enum Harness { Native, ClaudeCode, ClaudeCodeBare, DeepSeekTui, ..., OpenCode, Pi, ..., Other(String) }`,`codex-rs/core/src/harness/request.rs` 模块注释自述「chat-completions harness emulation」,per-harness 请求构建与响应流后处理集中在该模块。这是「运行时切换其他 agent 的提示词+工具 schema、Rust 原生执行」的新机制轴,未见于其他候选,标 `[single-source]`(grep.app 一源)。

**证据边界**:DeepCode、claurst、Codewhale、Reasonix 为单一仓库源码直读 `[single-source]`;crush/goose/openinterpreter/aider 为 README + 结构侦察 `[single-source]`。已有八家经本轮取证:OMP/DSH/jcode/Grok/Prime 源码或文档直读,OpenCode/OpenClaude/OMO 为 DeepWiki 问答,均 `[single-source]`。用户标注复核(五处)见 [标注复核修正](../../raw/ai-coding-agents/2026-09-04-annotation-review-corrections.md)。详见 [9 个候选 B→A 对比](../../raw/ai-coding-agents/2026-09-04-nine-candidates-b-to-a.md) 与 [已有八家 A 侧取证](../../raw/ai-coding-agents/2026-09-04-existing-eight-a-side-verification.md)。


## 四源能力调查(2026-09-05)

对 17 个 agent(9 新候选 + 已有八家)各跑四路:context7、DeepWiki、web 搜索、code 搜索(grep.app)。目的不是重做任何裁定,而是补广度证据。证据原文见 [四源能力调查 raw](../../raw/ai-coding-agents/2026-09-05-four-lane-capability-survey.md)。

本轮引起的裁定变化:

1. **DeepCode 降级**:grep.app 直证其至少 9 个模块文件头自证 borrowed from dsh——`repeat_guard.py`(「Borrowed from dsh's ``repeat-tool-reminder`` guard」)、`pruner.py`、`structured_result.py`、`external_backend.py`、`/compact`、tool timeout、TUI 配色等。此前「repeat_guard 同轴不同机制、可能独有」的判断撤销:它是 dsh 机制的移植,DeepCode 整体更接近「dsh 设计的 Python 实现」。
2. **openinterpreter 升级**:见上方 Status: Outdated 块。harness 仿真轴源码直证。
3. **jcode 新增待核查轴**:DeepWiki 报告 `agentgrep`(把文件结构上下文注入搜索结果,agent 不用整文件读)与 ONNX 本地嵌入持久记忆;ddgs 报告 skill 不预载、会话嵌入成向量后按命中自动注入。均未源码直读,`[single-source]`。
4. **Prime Agent 血统确认**:官方博客 Acknowledgements 原文「Prime Agent is built on top of `pi`.」——与 OMP 同宗(pi-mono 生态),RLM/Continual Harness 是 pi 之上的抽象层,不是独立内核。博客 benchmark 表亦将 Pi-mono (w/ sub-agents) 列为对照 harness。
5. **OMO 更名**:context7 显示主仓库已演进为 `oh-my-openagent`(8012 snippets);`oh-my-opencode`、`oh-my-openagent`、`@code-yeongyu/oh-my-opencode` 为同一插件包别名。
6. **Grok Build 数字**:SWE-bench Verified 70.8% at $0.20/M tokens(ddgs → sdd.sh/tokencost.app,第三方口径 `[single-source]`);context7 确认子 agent 并发上限 32、`spawn_subagent` 支持 worktree 隔离与 `resume_from`。
7. **Reasonix 裁定不变**:本轮 web 路拿到 prefix-cache 相关材料(threads 帖称单日真实负载 99.82% 命中率、$12 vs $61;README 称 >90% 命中、长会话输入成本约 1/5),但这些是 README 与网页口径 `[single-source]`,**不构成对上表第 167 行「prefix-cache 稳定性已移除」的推翻**——仍无源码命中,也仍未证明别家没有。Reasonix 的可能独有项依旧只有 `sessiontemp`(源码直读,见 [9 个候选 B→A 对比](../../raw/ai-coding-agents/2026-09-04-nine-candidates-b-to-a.md))。

未变:真独有净剩仍为 OMP TTSR 与 DSH Cordis。DeepCode 降级反而加强 DSH 侧证据——其 repeat-tool-reminder、pruner、subagent 契约被 DeepCode 成体系移植。

## See Also

- [Prime Agent 技术实质](../prime-agent/prime-agent-technical-reality.md) — 源码验证的实现细节
- [Prime Agent 社区 Reception](../prime-agent/prime-agent-community-reception.md) — 第三方评价与 benchmark
- [OMP TTSR 与 /omfg：流式行为护栏](../omp-ttsr/ttsr-and-omfg.md)
- [OMP 工作模式与 Magic Keywords](../omp-modes/modes-and-magic-keywords.md)
- [OMP Mnemopi Consolidation 生命周期](../omp-mnemopi/consolidation-lifecycle.md) — jcode 记忆图的等价物对照
- [开源 Harness 与托管推理不是一回事](open-harness-vs-hosted-inference.md) — 区分客户端开源、Provider 主权与模型成本
- [Grok Build](grok-build.md) — 第七个 agent 的初步裁定与机制证据
- [Reviewer Blind Spots](../harness-engineering/reviewer-blind-spots.md) — 调查方法本身暴露出的验证架构问题
