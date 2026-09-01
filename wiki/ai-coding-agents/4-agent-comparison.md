# 六 AI Coding Agent 对比：真正独特优势

> Sources: 官方 GitHub 仓库与文档，2026-08-27; Prime Agent 技术实质，2026-08-30; Prime Agent 社区 Reception，2026-08-30; jcode 与 OpenClaude 调研，2026-09-01
> Raw: [四 AI Coding Agent 对比研究原始记录](../../raw/ai-coding-agents/2026-08-27-4-agent-comparison.md); [jcode 与 OpenClaude 调研原始记录](../../raw/ai-coding-agents/2026-09-01-jcode-openclaude-research.md)
> Updated: 2026-09-01

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

- 会话中可见 3 次 `task` 批量调度：wide → narrow → deep
- 每批次派发 4 个子任务，共 12 个子任务
- 子任务角色/完整参数未验证
- 官方文档、GitHub PR/issue、源码验证

## 真独有优势

别人没有，或无法通过简单配置获得。

### OMP：TTSR 完整闭环

**是什么**：在模型流式输出过程中，正则/AST 规则实时匹配；命中时中断生成、注入规则提醒、重试。

**为什么独特**：
- OpenCode PR #14741 提出类似功能但 closed 未合并
- DSH 有第三方 `dsh-stream-rules` 插件，但无 abort+retry 完整闭环
- Prime Agent 需自行开发

**证据**：https://github.com/can1357/oh-my-pi/blob/main/docs/ttsr-injection-lifecycle.md

### DSH：Cordis everything-is-plugin

**是什么**：session log、agent loop、tool registry 都作为可配置替换的插件，组成可逆 plugin tree。

**为什么独特**：
- OMP 有扩展 API，但核心 loop 不可配置替换
- OpenCode 有 DI 和服务替换边界，但非完整配置式契约
- Prime Agent 的 Agent loop 由固定 `pi-agent-core` 提供

**证据**：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md

### DSH：Append-only event sourcing

**是什么**：typed SessionEvent log 为 source of truth，模型历史由日志投射。

**为什么独特**：
- OpenCode v2 也有 durable event sourcing，但架构目标不同（非插件化核心）

**证据**：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md

### jcode：跨 harness 会话恢复与凭据导入

**是什么**：可 resume Codex、Claude Code、OpenCode、pi 的会话继续对话；可检测并经用户同意后读取这四家及 Gemini/Copilot 的本地凭据（含 macOS Keychain），拒绝 symlink。

**为什么独特**：OpenCode、OMP、Prime 均只有自家 session/credential 机制，无跨 harness 导入器（DSH unknown）。注意这是互操作/迁移能力，不提升 agent 智能。

**证据**：https://github.com/1jehuang/jcode/blob/master/OAUTH.md ; https://github.com/1jehuang/jcode/blob/master/crates/jcode-tui/src/tui/app/onboarding_flow.rs

### jcode：Server 中介的 swarm 读集冲突通知

**是什么**：多 agent 同 repo 工作时，agent A 修改 agent B 读过的文件，server 主动通知 B。

**为什么独特**：OpenCode 的冲突处理是 session 输入生命周期；OMP 是 git merge 语义；Prime 无文件级读集追踪（DSH unknown）。

**证据**：https://github.com/1jehuang/jcode/tree/master/crates/jcode-harness-api-server

## 同类但成熟度更强

别人有等价或可复制，但实现更完整或已合并主线。

### Prime Agent：RLM 完整产品形态

**是什么**：persistent IPython kernel + programmatic context slicing + recursive child agents + Continual Harness 的统一编程模型。

**现状**：
- OMP #9787 open 未合并（review:p2，17 轮 Codex review）
- OpenCode #8555/#13499 closed 未合并
- DSH 需外部插件 `deepseek-rlm`（需 3 个 host patches）

**证据**：https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/rlm.md

### Prime Agent：Continual Harness

**是什么**：prompt/memory/skill/subagent 四类统一 state + `/refine` 在线精确 CRUD + rollback。

**现状**：其他工具需开发，无等价已合并实现。

**证据**：https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/rlm-runtime.md

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

- **真独有**：OMP TTSR、DSH Cordis、DSH event sourcing、jcode 跨 harness 互操作、jcode swarm 读集冲突通知
- **成熟度更强**：Prime Agent RLM、Continual Harness
- **功能等价**：OMP Magic Keywords vs OMO 关键词触发、OMP Vibe vs OMO 多 agent、jcode 记忆图 vs OMP mnemopi、OpenClaude 订阅 OAuth/多 provider vs OpenCode/Prime
- **无独特**：OpenCode 单独、OpenClaude（差异仅为泄漏源码衍生身份，附法律风险）

## See Also

- [Prime Agent 技术实质](../prime-agent/prime-agent-technical-reality.md) — 源码验证的实现细节
- [Prime Agent 社区 Reception](../prime-agent/prime-agent-community-reception.md) — 第三方评价与 benchmark
- [OMP TTSR 与 /omfg：流式行为护栏](../omp-ttsr/ttsr-and-omfg.md)
- [OMP 工作模式与 Magic Keywords](../omp-modes/modes-and-magic-keywords.md)
- [OMP Mnemopi Consolidation 生命周期](../omp-mnemopi/consolidation-lifecycle.md) — jcode 记忆图的等价物对照
- [开源 Harness 与托管推理不是一回事](open-harness-vs-hosted-inference.md) — 区分客户端开源、Provider 主权与模型成本
