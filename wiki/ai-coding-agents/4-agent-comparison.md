# AI Coding Agent 对比：真正独特优势（19 家）

> Sources: 官方 GitHub 仓库与文档，2026-08-27; Prime Agent 技术实质，2026-08-30; Prime Agent 社区 Reception，2026-08-30; jcode 与 OpenClaude 调研，2026-09-01; Claude Code 2.1.261 与 Codex CLI 0.153.4 本机安装直读，2026-09-05
> Raw: [四 AI Coding Agent 对比研究原始记录](../../raw/ai-coding-agents/2026-08-27-4-agent-comparison.md); [jcode 与 OpenClaude 调研原始记录](../../raw/ai-coding-agents/2026-09-01-jcode-openclaude-research.md); [Grok Build 机制](../../raw/ai-coding-agents/2026-09-03-grok-build-mechanisms.md); [竞品循环检测调查](../../raw/ai-coding-agents/2026-09-03-loop-and-stall-detection-survey.md); [OMP 跨 harness 导入与 eval kernel 原语](../../raw/ai-coding-agents/2026-09-04-omp-cross-harness-and-eval-primitives.md); [OMP session 事件日志与 extension 事件面](../../raw/ai-coding-agents/2026-09-04-omp-session-event-log-and-extension-surface.md); [OMP 编辑防护与 agent 资产 CRUD](../../raw/ai-coding-agents/2026-09-04-omp-edit-guard-and-asset-crud.md); [OMP 压缩期与分支 extension 事件](../../raw/ai-coding-agents/2026-09-04-omp-compaction-and-branch-events.md); [9 个候选 B→A 对比](../../raw/ai-coding-agents/2026-09-04-nine-candidates-b-to-a.md); [已有八家 A 侧取证](../../raw/ai-coding-agents/2026-09-04-existing-eight-a-side-verification.md); [用户标注复核修正](../../raw/ai-coding-agents/2026-09-04-annotation-review-corrections.md); [四源能力调查 17 agents](../../raw/ai-coding-agents/2026-09-05-four-lane-capability-survey.md); [被质疑断言反向核查](../../raw/ai-coding-agents/2026-09-05-challenged-claims-verification.md); [Claude Code 与 Codex 入列](../../raw/ai-coding-agents/2026-09-05-claude-code-and-codex-enrollment.md); [hook 事件集不对称断言的证伪扫描](../../raw/ai-coding-agents/2026-09-05-hook-event-set-symmetry-correction.md)
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
| Claude Code | Anthropic 闭源 CLI（本机 `2.1.261`） | 一等公民 harness；本仓多数衍生项目的上游 |
| Codex CLI | `openai/codex` | Rust 多工具二进制 + 共享 app-server 守护进程 |

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

> **Status: Outdated** (2026-09-05)
> 第 140 行「唯一公开的『Claude Code 原版 harness + 任意模型』衍生实现」中的**唯一性**不成立。两个反例:① openinterpreter 的 `Harness::ClaudeCode` / `ClaudeCodeBare` 是 MIT 独立代码,自行构造 Claude Code 的 system prompt 与工具定义;② claurst 自述为 Claude Code 的 clean-room Rust 重写。OpenClaude 真正的区别是**运行的就是泄漏原版代码本身**(~512K 行 TS fork + `openaiShim.ts` 把 Anthropic SDK 调用翻成 `/chat/completions`),而另两家是从零重建行为。这是来源性质差异,不是工程优势,且只有 OpenClaude 带 DMCA 风险。见 [被质疑断言反向核查](../../raw/ai-coding-agents/2026-09-05-challenged-claims-verification.md)。

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
- **本轮新降级(2026-09-05 反向核查)**:Reasonix `sessiontemp`(6/8 家有等价隔离机制)、jcode `agentgrep`(同轴不同实现)、jcode ONNX 嵌入记忆(OMP Mnemopi 亦本地 ONNX,功能等价)、OpenClaude「唯一衍生实现」(openinterpreter 与 claurst 构成反例)。可能独有从 2 项减至 1 项(openinterpreter 多 harness 仿真)

## 新候选 B→A 对比(2026-09-04)

对 9 个新候选(pi-mono、DeepCode、claurst、Reasonix、Codewhale、crush、goose、openinterpreter、aider)做 B→A 对比。

> **Status: Single-source** (2026-09-04)
> 9 个新候选与已有八家的机制均经本轮取证,方式为混合取证:新候选中 DeepCode/claurst/Codewhale/Reasonix 有源码直读,pi-mono 仅 README,crush/goose/openinterpreter/aider 仅 README + 结构侦察;已有八家中 OMP/DSH/jcode/Grok/Prime 为源码或文档直读,OpenCode/OpenClaude/OMO 为 DeepWiki 问答(仓库自身材料的二手综合)。按一仓库=一源规则,全部标 `[single-source]`;跨源裁定仍为待复现。

### 值得深挖(2)

| 候选 | 独有机制 | 与已有八家关系 |
|---|---|---|
| **DeepCode** | repeat_guard 软循环提醒(3/5/8 阈值渐进,不阻断);hooks 使用 Claude-Code 兼容 schema | repeat_guard 与 Grok doom-loop 同轴不同机制(软提醒 vs 硬中断)。~~PreCompact 时机~~已证伪:压缩前注入是通用能力——OpenCode `experimental.session.compacting`、Claude Code `PreCompact`、OMP `session_before_compact`+`session.compacting`(types.d.ts:832-833)都有。剩生态兼容差异:CC schema 的 hook 可直接跑,OpenCode/OMP 为自家模型 |
| **Reasonix** | sessiontemp 会话级临时目录隔离 | sessiontemp 可能独有;~~prefix-cache 稳定性~~已移除——README 营销措辞,源码未命中,且未证明别家没有(prefix-cache 稳定是各 harness 的通用工程关注点,举证责任在声称独有的一方) |

> **Status: Outdated** (2026-09-05)
> Reasonix 第 167 行的「sessiontemp 可能独有」已推翻,但证据范围需收窄：反向核查报告实际混用了 Claude Code,而本文已有八家名单中的对应项是 OpenClaude,因此不能把它概括成「8 家里 6 家」。报告逐项列出了 6 个有会话级临时目录/工作区隔离等价物的项目：OMP `leaseArtifacts` + `pi-iso`(CoW/worktree,`~/.omp/wt/` 带 owner 标记)、Grok `IsolationMode{None,Worktree,Sandbox}`、claurst worktree 隔离、Claude Code 沙箱 `$TMPDIR`、DSH 按会话生成独立 Windows SID 的私有临时目录、goose `AGENT_SESSION_ID` + 容器；但其中 Claude Code 不是 OpenClaude,所以本轮不能据此完成对本文「已有八家」的封闭计数。crush(ad-hoc `MkdirTemp`)与 OpenCode(明确不做沙箱)也未见同等隔离。结论仍足够推翻「可能独有」：至少多个反例已存在；OpenClaude 自身是否提供等价机制留作未核查。Reasonix 的实现细节(lease 引用计数、世代轮换、`.owner.lock` 24h stale 清理、fail-closed 不回退主机临时目录)比同类扎实,但那是成熟度差异,不是能力有无差异。见 [被质疑断言反向核查](../../raw/ai-coding-agents/2026-09-05-challenged-claims-verification.md)。

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

> **Status: Outdated** (2026-09-05)
> 第 191 行 jcode 的两条「新增待核查轴」已降级,均非独有。`agentgrep`:交互形态(搜索结果直接带结构上下文)少见,但同一用户目标别家都到达了——aider tree-sitter repo map 全局注入签名、goose `analyze` 建 tree-sitter 调用图、OMP `read` 对可解析代码返回结构摘要 + codegraph 调用链、crush `lsp_references`,判为同轴不同实现。ONNX 本地嵌入记忆:**OMP Mnemopi 也有本地 ONNX 嵌入路径**——本机 OMP 类型声明写明 "mnemopi's local embedding provider loads fastembed"、模型 id 例子 `fast-bge-base-en-v1.5`,且因 `onnxruntime-node` 的 NAPI finalizer 在 Windows 上会 segfault Bun(issue #3031)而特意跑在独立子进程(`dist/types/mnemopi/embed-client.d.ts:3-10,20-22`、`embed-protocol.d.ts:1-12`)。差异降为运行时选择(Rust `tract-onnx` vs Node fastembed 子进程),判为功能等价。注意本机实际配置走的是 API 嵌入而非本地模型(`embeddingApiUrl: http://localhost:4140/v1`,见 [Mnemopi Consolidation 生命周期](../omp-mnemopi/consolidation-lifecycle.md)),所以「哪个是默认」本轮未定论,只确认本地路径存在。jcode 剩下的独有候选仍只有 swarm 服务端读集追踪(从未直读实现)。另:`jcode self-dev`(`build`/`build-reload`/`test` + `execvp` 热换二进制并保留会话状态)是发给终端用户的工具,但用途是开发 jcode 自身,不构成通用 harness 能力。见 [被质疑断言反向核查](../../raw/ai-coding-agents/2026-09-05-challenged-claims-verification.md)。

未变:真独有净剩仍为 OMP TTSR 与 DSH Cordis。DeepCode 降级反而加强 DSH 侧证据——其 repeat-tool-reminder、pruner、subagent 契约被 DeepCode 成体系移植。

## 被质疑断言的反向核查(2026-09-05)

用户对上文表格提出 16 条标注,其中 5 项机制断言派 4 个只读 scout 做反向核查——不是证明 A 有某功能,而是逐个点名别家有没有。四项降级已就地加 Status 块(第 169、142、204 行)。剩下的澄清与新细节:

### openinterpreter 的 harness 仿真具体仿到哪一层

三层,不止改请求格式:① `claude_code_system_and_tools` 构造目标 harness 的 system prompt(Full 变体含工具指南、CWD、git status、平台、shell、OS 版本、模型信息与上下文管理指令;Bare 变体只有 CWD 与日期);② 把内部工具映射成对方的工具定义(Bare 只暴露 Bash/Edit/Read,Full 另加 Grep);③ 按 Messages / Responses / Chat 三种 wire 分别构造请求体。13 种 harness 运行时 `/harness` 切换,自己的 Rust loop 不变、不 shell 出去调别家 CLI。

与另两个「跑 Claude Code 行为」的项目区别:claurst 是 clean-room 重写**一家**;OpenClaude 是 fork 泄漏原版**一家**;只有 openinterpreter 做**多家运行时切换**。这是它目前唯一站得住的可能独有项,`[single-source]`(grep.app repo 级源码)。

### OpenCode 的「跨设备 replay」是本地自建,不是上传云端

此前 log 里写它「比 DSH/OMP 的文件日志多一层」,现修正为**部分同轴**:各家机制形态不同,不能笼统说都等价,也不能说它独有。

| 项目 | 机制 | 跨设备路径 |
|---|---|---|
| OpenCode v2 | 本地 SQLite(WAL)事件溯源 + 投影;`session.log?after=seq` 增量 replay API | 自己跑 `opencode serve`,别的设备 attach 到自己的 server |
| OMP | typed JSONL 事件日志 + `/collab` 实时 relay | `/collab` 链接共享(实时协作,非历史 replay) |
| DSH | immutable generation files + resume/fork | 靠文件复制,无增量 API |
| crush | per-workspace SQLite + detach 后台 server + 多 client attach | 同机多 client,非跨设备 |

隐私边界:v2 默认纯本地(`~/.local/share/opencode/opencode.db`)。但 v1 有 `/share`,执行后完整会话历史上传到 `opncd.ai`(公开链接),默认 `"manual"` 需手动触发,可用 `share: disabled` 或 `OPENCODE_DISABLE_SHARE` 关闭;v2 官方文档称 sharing 尚未实现。所以「隐私优先、不存代码」与 share 不矛盾,但 share 是该承诺的明确例外。本段来自本轮 scout 核查,`[single-source]`。

### 四条概念澄清(此前表述容易误读)

- **Codewhale 的 SHA256 不是文件编辑机制**:那是 CLI **二进制自更新器**(`crates/cli/src/update.rs` 校验后原子替换自身),与代码编辑无关,也与 harness 能力无关。
- **crush 的 `crushrc` 配的是 agent 自身运行时**:provider、模型、MCP server、各类 option。特点是配置文件即 bash 脚本(内置 `provider add`/`model add`/`option`/`mcp add` 命令,30s loadTimeout),且 **agent 可在会话中用 bash tool 跑这些命令改自己当前会话的配置**,不写回文件。
- **aider 的 repo map 不是 LSP**:tree-sitter 静态解析建符号标签图 → PageRank 排序 → 按 token 预算把类/方法/函数签名注入 prompt。无 language server、无诊断、无跳转。对照 OMP/OpenCode/crush 才是真 LSP 客户端。
- **claurst 的预算切分不算 agentic coding 能力**:百分比/固定/USD cap 是花钱管控,与代码任务执行质量无关,已从独有优势位撤下。
- **goose subrecipes**:一个 recipe 用 YAML 把别的 recipe 当步骤调用,支持并行执行、参数传递与 `sequential_when_repeated` 顺序控制。对应 Claude Code 的 skills + subagents、OMP 的 task 批次。

### 净结论

真独有 **4** 项（OMP TTSR、DSH Cordis、Codex execpolicy DSL、Codex hash 化 hook trust）；可能独有 **2** 项（openinterpreter 多 harness 仿真、Claude Code cross-user prompt cache）；未知 1 项（jcode swarm 服务端读集追踪）。Reasonix 本轮归零。详见下节。

## Claude Code 与 Codex CLI 入列（2026-09-05）

名单从 17 家扩到 **19 家**。这同时修掉了此前的名单错位：Claude Code 过去只是四源调查里意外替掉 OpenClaude 的临时项，现在成为正式成员，OpenClaude 保留在名单内（其四源调查仍是缺口）。

### 先修计数口径

此前把「四源调查跑了 17 个」说成一句话，不够精确。准确说法是：

- 文章设计的名单是 **17 个不同项目 = 9 新候选 + 8 既有**（既有八家含 OpenClaude）。
- 那份 raw 实际有 **17 个 worker 分节/运行，但只覆盖 16 个不同项目**——Grok Build 跑了两次（`caps17#14` 与 `caps17#26`）；第 17 个项目 DeepCode 因 workpool yield bug 两次失败，由主会话手动补做四路，落在「主会话补漏」而非 worker 分节里。
- 那 8 个既有项目里用 **Claude Code 替掉了 OpenClaude**。
- 两套名单并起来是 **18 个名字**；本轮加入 Codex 后为 19 个。

### 本轮方法与既往不同的一点

两个 agent 都装在本机，所以 A 侧证据不再依赖 grep.app / DeepWiki 转述，而是直读二进制与活体执行。这也是本轮能推翻多数 scout 裁定的原因。三个只读 scout 给出 `真独有` 共 19 条（Claude Code 11 条、Codex 8 条），主会话按本仓既有门槛逐条复核后只留 3 条。

### Codex CLI：两项真独有

**1. execpolicy `.rules` —— 带解析器和内联单测的命令前缀策略 DSL** `[verified]`

主会话做了活体验证。`codex execpolicy check` 是真实子命令，未列在顶层 `codex --help` 里但可直接调用（`codex execpolicy --help` 输出 `check  Check execpolicy files against a command`）。实测用 `/tmp` 内两行临时规则文件，`--rules <PATH>` 传入，返回 JSON：

| 输入命令 | 规则 | 输出 |
|---|---|---|
| `git status` | `prefix_rule(pattern=["git","status"], decision="allow")` | `"decision": "allow"`，含 `matchedPrefix` |
| `git push --force` | 无匹配规则 | `{"matchedRules":[]}`，无 decision，落回常规审批 |
| `rm -rf /` | `prefix_rule(pattern=["rm","-rf"], decision="forbidden")` | `"decision": "forbidden"` |

**这一段的证据分层，别混读**：

- **主会话实测所得**（活体，见上表）：按 argv token 数组做前缀匹配、`allow` 与 `forbidden` 两种 decision 生效、无匹配时返回空 `matchedRules` 且不给 decision、`-r/--rules` 可重复传入、`codex exec --ignore-rules` 存在于 help 原文。
- **仅 scout 转述自官方文档**（`https://developers.openai.com/codex/rules`，`[single-source]`，主会话未独立复核）：优先级 `forbidden > prompt > allow` 三档、`justification` 字段、`match`/`not_match` 内联单测、用户层与项目层分层规则。
- **二进制字符串推断**（未读源码）：主二进制内含 `execpolicy/src/parser.rs`、`execpolicy/src/policy.rs`、`execpolicy/src/rule.rs` 这类 Rust panic 位置字符串，据此推断存在独立 execpolicy crate 及 parser/policy/rule 模块划分——**属推断，未读源码证实**。

更关键的是**规则会被模型提议、被系统持久化**。这一条的直接证据是主二进制内的字符串：`proposed_execpolicy_amendment` 与 `proposed_network_policy_amendment` 出现在同一处 `struct ExecApprovalRequestEvent with 17 elements` 的字段名序列中，另有 `proposed execpolicy amendment: `、`# network rule saved in execpolicy (`、`failed to persist network policy amendment to execpolicy: `、`Failed to apply execpolicy amendment: `。行为侧的旁证是本机 `~/.codex/rules/default.rules`：32 行、每行都是 `prefix_rule(...)`、`decision` 直方图 `{'allow': 32}`——形态与「历次审批固化」一致，但**「这些行确由审批流程写入」是推断，未观测写入过程**。

反向核查后的边界：**「审批固化成规则」这一层是同轴的**——Claude Code 的 `alwaysAllowRules` + `.claude/settings.local.json` 达到同一目标（二进制内另见 `askSuppressesAlwaysAllowRule`、`toolAlwaysAllowedRule`）。真正无对应物的是「策略**语言**（有 parser、有内联单测、可 CLI 单独求值）+ 模型提议修正 + 网络规则纳入同一策略」。已点名核查：OMP TTSR（正则命中在模型输出流上，不是命令策略）、Claude Code（`allowedTools`/`disallowedTools` 是平铺字符串列表）、DSH `ctx.sandbox`（运行时约束，非声明式规则语言）、goose（四档权限模式）、crush（1-4 级 + `allowed_tools`）、Reasonix、Codewhale。

**2. hook trust 闸门** —— 「执行前需已持久化信任」`[verified]`；「按 hash 索引」`[single-source]`

- **主会话直接证据**：`codex --help` 原文 `--dangerously-bypass-hook-trust  Run enabled hooks without requiring persisted hook trust for this invocation. DANGEROUS. Intended only for automation that already vets hook sources`；主二进制内可见 `HookTrustStatus`、`SetHookTrusted`、`SetHookEnabled`、`bypass_hook_trust`，以及 "`bypass_hook_trust` override must be a boolean"。即「hook 执行前需要已持久化的信任」这件事本身，由 help 原文直证。
- **仅 scout 转述自官方文档**（`https://developers.openai.com/codex/hooks`，`[single-source]`，主会话未独立复核）：信任按 hook 的 **hash** 记录、改动后重新变为不受信、managed hook（`requirements.toml`）由策略直接信任且不可在界面关闭。这三点是「hash 化」这个定语的来源，主会话只验证了信任机制存在，没验证它按 hash 索引。

反向核查有**一手负证据**：主会话在 Claude Code 的 206MB 二进制里扫可打印字符串，`hooktrust`、`trusthook` 两种大小写无关子串命中数均为 **0**（同一次扫描中 `landlock` 也是 0）。据此**推断** Claude Code 的 hook 配好即运行、没有信任闸门——但这是「已查材料中未找到」，不排除以其他命名实现，也不排除该逻辑不落字符串。其余竞品（OMP、crush、DSH、OpenCode、goose）由 scout 点名核查未见等价物，`[single-source]`，主会话未独立复核。

### Claude Code：一项可能独有

**cross-user prompt cache 前缀共享** `[single-source]`

`--exclude-dynamic-system-prompt-sections` 把 per-machine/per-user 段（cwd、env info、memory paths、git status）从 system prompt 移到第一条 user message，目的写得很直接：让**跨用户**的 prompt cache 能命中同一段静态 system prompt 前缀。内部字段说明还自带 tradeoff 与 kill switch（二进制内 `[print.ts] excludeDynamicSections restore skipped: kill switch set`），可见分节 id 有 `env_info_static`、`env_info_simple`、`scratchpad`、`bg-session`。

为什么算可能独有：别家做 prompt cache 稳定性都是为**单个用户**的 within-session / cross-session 命中（Reasonix `StaticPromptCache`、Hermes `prefix_and_2`）；为**跨用户共享前缀**做工程的，已查材料里没有第二家。评级只给 `[single-source]`：证据来自 Anthropic 自家实现，缺独立第二方佐证。

> Status: 证据边界（2026-09-05）
>
> ClaudeCodeUnique 报告里写了「Achieves ~82-98% cross-user cache sharing」。这句话本身在 raw 里（scout 报告原文收录），但 scout 没给出任何来源，也无法回溯到 Anthropic 文档或二进制里的任何数字。**属未溯源数字，已弃用，不得引用**。这与「raw 里没有」是两回事，别把两者混为一谈。

同一 scout 判为真独有的 `--system-prompt-snapshot` 被降级为**同轴不同实现**：它确实是实机制（二进制内字段说明「Record the conversation's system prompt once and reuse it verbatim on every later request and resume」，另有 `systemPromptSnapshotHash`，后台与远程会话默认开启），但 Reasonix `StaticPromptCache` 已在同一条轴上（会话创建时快照、不再从磁盘重读）。Claude Code 的差异是把快照连 hash 记进会话、resume 时逐字重放——按本仓「成熟度不是能力」原则，不算独有。

### 双杀：两个 scout 互相宣称独有的两条轴

这是本轮最有信息量的地方——两个独立 scout 在同一条轴上各自宣称自己那家独有，理由都是「对方没有」：

| 轴 | ClaudeCodeUnique 的说法 | CodexUnique 的说法 | 主会话裁决 |
|---|---|---|---|
| 云端任务交接 | Claude `ultrareview`/`--cloud`/`--teleport`/`--environment ccpool_` 真独有，因为「Codex 无云端」 | `codex cloud` 真独有，因为「Claude 只有 review 专用」 | 两边都有第一方云端交接，**双双降为同轴不同实现**；且托管服务不是 harness 机制轴 |
| 守护进程 / 后台会话 | —— | app-server 共享守护进程 + WebSocket attach + bearer auth 真独有 | Claude 有 `--bg`/`agents`/`attach`/`logs`/`stop`/`respawn`/`--remote-control`；CodexUnique 自己也承认，只以「统一守护进程 vs supervisor-worker」区分，那是实现形态，**降为同轴不同实现** |

守护进程轴上唯一残留的子操作是 `codex queue`（不 attach 就向已运行会话注入消息）。已查 6 家未见等价 CLI（OMP 顶层 `--help` 也没有），列为**可能独有**、`[single-source]`。

### 其余被降级的候选

| 候选 | scout 裁定 | 降级后 | 理由 |
|---|---|---|---|
| Claude `respawn`（保留对话重启到当前版本）、`--from-pr`、`--brief`、`--worktree` | 真独有 ×3 + 未知 | **未知** | 依据全是「未在竞品中找到」，绝非独有证明 |
| Claude `--tmux`（iTerm2 pane）、`--forward-subagent-text`、`--include-hook-events` | 真独有 ×3 | **移出讨论** | 终端 UX 与 stream-json 管线细节，非能力轴；同 Codewhale SHA256 处理 |
| Claude `--bare`/`--safe-mode`/`--restricted` 三种去功能化模式 | 真独有 | **不计** | 「没人恰好有三种」是计数产物 |
| Claude `gateway`（CLI 内置企业 auth/telemetry 网关） | 真独有 | **相邻优势** | 竞品确实没有，但属企业运维轴；同 claurst 预算切分处理 |
| Claude `import`（inbound 导入他家配置） | 未知 | **同轴不同实现** | Codex 有 `/import`（从 Claude Code、Cursor），OMP 有 `--from-claude`/`--from-codex`（本机核实） |
| Claude `--prompt-suggestions` | 真独有 | **可能独有（次要轴）** | gajae-code 明确移植自 Claude Code，属首创被克隆；但是 UX 便利 |
| Codex `migrate-rollouts` | 真独有 | **移出讨论** | 迁移自家存储格式的维护工具 |
| Codex `review` 子命令 | 真独有 | **同轴不同实现** | Claude 有 `/review`/`ultrareview`，OMP 有 reviewer 子 agent |
| Codex 80+ crate workspace、rollout JSONL + SQLite | 真独有 ×2 | **不计 / 同轴** | 计数产物与存储实现形态 |
| Codex `--output-schema` vs Claude `--json-schema` | 两 scout 都判同轴 | **同轴不同实现** | 采纳 |
| Codex `--ephemeral` | 同轴 | **同轴（三家）** | Claude `--no-session-persistence`、OMP `--no-session` |
| Codex `-p/--profile` 配置分层 | 同轴 | **同轴（三家）** | OMP `--profile`（隔离 auth/sessions/settings/caches）、goose `profiles.yaml` |
| OS 级沙箱 | CodexUnique 自判同轴 | **同轴不同实现** | Claude Code 也是第一方默认（`seatbelt: built-in (macOS)`），DSH 有 `ctx.sandbox`。差异是打包：Codex 随包自带 `bwrap`（0.5MB），Claude Code 要你 `apt-get install bubblewrap` |

`codex sandbox`（把 agent 自己的沙箱当通用工具跑任意命令，带 `--sandbox-state-json` 可序列化沙箱状态）在已查 8 家中无对应物——Claude 的 `/sandbox` 只是配置面板。保留为**可能独有**，`[single-source]`。

### 横向发现：hook 线格式正在跨厂商收敛

这条比任何单项独有更有解释力，但要分清哪半边是谁验的。**scout 转述**（CodexFourLane 经 DeepWiki 读 `openai/codex`，`[single-source]`，主会话未读源码）：Codex 的 hook 引擎在源码里叫 `ClaudeHooksEngine`，位于 `codex-rs/hooks/src/lib.rs`，分派 12 种事件。**主会话直接验证**：wire 字段 `hookEventName`、`permissionDecision`、`permissionDecisionReason`、`additionalContext`、`suppressOutput`、`stopReason`、`updatedInput` 在两个二进制里分别扫到同一组名字；事件名风格 Codex 用 snake_case（`pre_tool_use`）、Claude 用 PascalCase（`PreToolUse`），两组名字均直接扫到。

即 **OpenAI 在自家 harness 里实现了 Anthropic 的 hook 线格式**——这是基于上述同名字段的推断，双方均未公开声明兼容意图。

> Status: 自我更正（2026-09-05）
>
> 本节初稿曾写「Codex 事件里多出 `post_compact` 与 `subagent_start`，Claude 没有」。那句话写下时未做对应扫描，补扫后**证伪**：Claude Code 二进制里 `PostCompact` 命中 59（含 `executePostCompactHooks`）、`SubagentStart` 命中 24（含 `executeSubagentStartHooks`、`SubagentStart hooks cancelled (control stream closed)`），只是用 PascalCase。反方向只余弱证据：Codex 里 `PermissionDenied`/`permission_denied` 各命中 2，但语境是 IO/AWS 错误枚举与 gRPC 状态名，不是 hook 事件；`"retry"` 命中 0。故「Codex 无 PermissionDenied hook」只能记作**已查材料中未找到**。证据见 [hook 事件集不对称断言的证伪扫描](../../raw/ai-coding-agents/2026-09-05-hook-event-set-symmetry-correction.md)。
>
> 这次更正反而加强了收敛结论：两家 hook 事件集比原判断更接近，差异主要在命名风格而非覆盖面。

两家都用 `SKILL.md` + YAML frontmatter 的 Agent Skills 约定（Codex 侧为 scout 转述 `codex-rs/skills/src/`，`[single-source]`），都读 `AGENTS.md`/`CLAUDE.md` 类上下文文件。

这解释了为什么「真独有」这么稀少：hook、skills、上下文文件、审批模式这几层正在变成事实标准，剩下能拉开差距的只有各家愿意单独投入的那一两个机制。

## See Also

- [Prime Agent 技术实质](../prime-agent/prime-agent-technical-reality.md) — 源码验证的实现细节
- [Prime Agent 社区 Reception](../prime-agent/prime-agent-community-reception.md) — 第三方评价与 benchmark
- [OMP TTSR 与 /omfg：流式行为护栏](../omp-ttsr/ttsr-and-omfg.md)
- [OMP 工作模式与 Magic Keywords](../omp-modes/modes-and-magic-keywords.md)
- [OMP Mnemopi Consolidation 生命周期](../omp-mnemopi/consolidation-lifecycle.md) — jcode 记忆图的等价物对照
- [开源 Harness 与托管推理不是一回事](open-harness-vs-hosted-inference.md) — 区分客户端开源、Provider 主权与模型成本
- [Grok Build](grok-build.md) — 第七个 agent 的初步裁定与机制证据
- [Reviewer Blind Spots](../harness-engineering/reviewer-blind-spots.md) — 调查方法本身暴露出的验证架构问题
