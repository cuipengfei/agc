# Grok Build

> Sources: `xai-org/grok-build` 源码与 `docs.x.ai/build/*`；多源研究（2026-09-03）
> Raw: [Grok Build 机制](../../raw/ai-coding-agents/2026-09-03-grok-build-mechanisms.md)；[竞品循环与停滞检测调查](../../raw/ai-coding-agents/2026-09-03-loop-and-stall-detection-survey.md)
> Updated: 2026-09-04

## 概述

Grok Build 是 xAI 的终端 coding agent，Rust 编写，Apache-2.0 许可，约 844k 行代码。模型为 Grok 4.6（权重不在仓库内）。目前发现两个最强的独有候选机制；其余能力要么与已有 agent 等价，要么落后。

这个仓库是单向从内部闭源 monorepo 同步出来的；外部 PR 被明确拒绝。这不是附带性的许可证问题——它直接影响社区独立修复或审计的能力。

## 两个最强独有候选

### doom-loop：服务端信号 → 客户端中断 → 重试

Grok 推理后端在采样过程中检测到输出退化（`tail_repetition`、`exact_repetition`、`low_logprob`）时，会发送一个非标准 SSE 事件 `response.doom_loop_check` 和一个 HTTP header `x-grok-doom-loop-check`。客户端在中途中断流，注入固定的 `<system_reminder>Your messages have been flagged as looping...</system_reminder>`，然后截断重播重试。

**为什么结构上独有。** `[single-source]` doom-loop 机制存在于 Grok Build 自己的代码中。在六个被调查的 agent 中，没有发现接收服务端中途循环信号的等价物；它们要么只做客户端检测，要么完全没有循环检测。`[likely]` 四家主要模型厂商（OpenAI、Anthropic、Google、DeepSeek）的公开流式 API 中没有中途循环诊断。`[likely]` 唯一具备相同垂直整合位置的竞争对手——DSH（同时控制模型和 harness）——也没有等价机制。

**为什么价值很窄。** 这个机制只处理服务端 doom-loop/退化信号（`tail_repetition`、`exact_repetition`、`low_logprob`），命中后注入一句固定提醒，不支持任意用户规则。据已有调查，客户端规则系统（如 OMP TTSR）可覆盖任意正则或 AST 规则，注入命中规则的原文，然后重试——在规则表达力上严格更强。真正不可替代的只有 `low_logprob` 这一类：OMP 的 TTSR 流管线对流增量做 regex/AST 匹配，不接收服务端采样元数据，因此拿不到 logprob 退化信号。这三个信号名的证据等级仍是 `[single-source]` 且未一手复验——本条修正提高的是机制描述的准确度，不是证据等级；也未调查其他客户端实现是否有别的途径获得同类信号。另见 [OMP TTSR 与 /omfg](../omp-ttsr/ttsr-and-omfg.md)。

### LazinessDetector：声称与证据的比对分类

一个独立的分类器会话把 agent 的 transcript 当作普通文本来审，判断 agent 的声称是否有实际工具调用证据支撑。七个类别，四个判为停滞：`stalled_narration`（散文声称做了但 transcript 里没对应调用）、`stalled_false_completion`（宣布完成但主张无证据支撑）、`stalled_permission_asking`（一直请求许可）、`stalled_no_todos_but_task_in_flight`（任务在跑但没有待办跟踪）。

两个设计细节值得注意。分类器收到 agent 伪造不了的 harness 真值：当前有多少后台任务和子代理还没返回，以及这一轮实际跑了多少秒。而且 transcript 是作为用户消息递送的，不是分类器自己的 assistant turn，防止模型接着往下聊而不是做分类。

**默认行为是纯观测。** 这个功能按模型逐个开启，默认关闭。每会话的 nudge 上限默认是 0。在这种配置下分类器仍然会跑并发出遥测事件，但判决走到上限检查就被吞掉。nudge 只在 Goal Mode 激活时才注入。所以开箱状态下这是个遥测功能，不是干预。

**想法本身不算完全独有。** Hermes Agent 有一个 PR 在做伪造 tool-use 声明的检测（`[single-source]`）。在被调查的六个 agent 中，没有发现内置等价物（`[likely]`）。

## 等价项

| 能力 | 状态 |
|---|---|
| ACP（Agent Client Protocol） | 与 OMP、OpenCode、DSH、Prime 等价。OpenClaude 是这组里唯一没有的。 |
| Skills / Plugins / Hooks / MCP | 与 Claude Code skill 格式等价；原生扫描 `~/.claude/skills`、`~/.cursor/skills`、`~/.agents/skills`。16 个生命周期 hook 事件。 |
| Headless / 脚本 / 会话恢复 | 四种输出格式，会话恢复。标准能力。 |
| Provider 主权 | `api_backend` 支持 `chat_completions`、`responses`、`messages`；`base_url` 可指向本地端点。标准能力。 |

## 落后于被调查集合

| 能力 | Grok Build | 为什么落后 |
|---|---|---|
| 核心 loop 可被插件替换 | 否 | `xai-agent-lifecycle` 只暴露内部 Rust trait 供 contributor 注入；loop 本身不是插件。DSH Cordis 有 everything-is-plugin。 |
| Append-only 事件溯源 | 否 | `chat_history.jsonl`，compaction 时全量 `replace_history`；events crate 只是遥测。DSH 有 typed SessionEvent 作为真相来源。 |
| 跨 harness 会话恢复 | 否 | `xai-grok-foreign-sessions` 只做元数据（标题、工作目录、分支、时间戳）。jcode 恢复 4 个 harness（Codex、Claude Code、OpenCode、pi）并读取 6 个 host 的凭据。 |
| 文件级读集冲突通知 | 否 | 只有 worktree 隔离；没有服务端介导的读集追踪。jcode 有。 |
| 带回滚的版本化 state CRUD | 否 | `/create-skill` 和 `/config-agents` 是交互式编辑文件。Prime Agent 有 `/refine` 带回滚。 |

## Goal Mode

Planner → Strategist → Classifier（N=3 并行 skeptic）→ Summarizer，含停滞检测与策略重规划。skeptic panel 是对抗式的：独立子代理在执行前验证计划。

## 并行度：数字的真实含义

- **32** 默认并发子代理（`DEFAULT_MAX_CONCURRENT`，`admission.rs:7`；也是 `host_service.rs:28`，受 `available_parallelism` clamp，下限 2）
- **512** 硬上限（`MAX_SUBAGENT_SAMPLING_LIMIT`）
- **128 / 1024** 是 workflow 系统的累计 agent 调用预算（`xai-workflow/src/lib.rs:12-13`），不是并发度
- 数字 **8** 来自子代理用户指南（`16-subagents.md`），不是运行时上限
- hook `on_decompose`、`on_subagent_complete`、`on_merge`、`on_conflict` **不存在**。它们来自第三方博客把 workflow 概念阶段误报成 hook 名。官方文档只定义了一套 16 事件的 hook 系统。

这是**厂商叙述污染枚举**的具体实例：官方反复宣传「并行优于深度」，导致两个 scout 报告了互相矛盾的数字（8 vs 128），而真值（32）根本不是 headline 数字。

## 上传事件

0.2.93 版本在明确指令「不要打开文件」下，静默上传了完整的 5.1 GiB git bundle 到一个 GCS bucket。同一会话的模型流量只有 192 KB。用户界面的开关无效；真正起作用的控制是一个未文档化的服务端 flag。`[single-source]` 修复方式是改服务端 flag 而非移除代码；上传路径仍在二进制里。开源发布在事件后 4 天。没有找到独立复现；主要证据是一位研究者的 mitmproxy 抓包，四篇后续文章都追溯到它。

## 证据边界

- **一手直读**：LazinessDetector 常量与闸门顺序，来自 `laziness.rs` + `laziness_classifier.rs`（1514 行）。doom-loop 文件路径来自 scout 报告。
- **scout 报告、未复验**：其他 crate 路径、Goal Mode 子代理角色、workflow 常量、遥测默认值、benchmark 数字。
- **未安装未运行**：Grok Build 没有在研究机器上执行过。没有任何行为声称来自运行该工具。
- **未知**：Laziness 流水线的第 1、2 层；单 turn 内工具调用是否并行；0.2.98 之后的版本是否仍含上传代码；上传代码在开源树中的精确文件路径。

## 另见

- [六 AI Coding Agent 对比](4-agent-comparison.md) — 已有的六个 agent 对比
- [Reviewer Blind Spots](../harness-engineering/reviewer-blind-spots.md) — 本次研究中的相关机制发现
