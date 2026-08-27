# 四 AI Coding Agent 对比：真正独特优势

> Sources: 官方 GitHub 仓库与文档，2026-08-27
> Raw: [四 AI Coding Agent 对比研究原始记录](../../raw/ai-coding-agents/2026-08-27-4-agent-comparison.md)
> Updated: 2026-08-27

## 研究对象

| 工具 | 仓库 | 核心定位 |
|------|------|---------|
| OpenCode + OMO | `anomalyco/opencode` + `code-yeongyu/oh-my-openagent` | 插件生态 + OMO 编排层 |
| OMP | `can1357/oh-my-pi` | 多模式 agent harness |
| Prime Agent | `PrimeIntellect-ai/prime-agent` | RLM-native + 自改进 harness |
| DSH | `deepseek-ai/deepseek-harness` | DeepSeek 官方 harness |

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

## 无独特优势

**OpenCode（单独）**：所有能力均可在其他工具找到等价或近似。优势在插件生态活跃度，非架构独特性。

## 结论

- **真独有**：OMP TTSR、DSH Cordis、DSH event sourcing
- **成熟度更强**：Prime Agent RLM、Continual Harness
- **功能等价**：OMP Magic Keywords vs OMO 关键词触发、OMP Vibe vs OMO 多 agent
- **无独特**：OpenCode 单独

## See Also

- [OMP TTSR 与 /omfg：流式行为护栏](../omp-ttsr/ttsr-and-omfg.md)
- [OMP 工作模式与 Magic Keywords](../omp-modes/modes-and-magic-keywords.md)
