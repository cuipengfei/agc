# Grok Build：机制证据

> Source: `xai-org/grok-build` 源码与 `docs.x.ai/build/*`；多源研究 2026-09-03
> Collected: 2026-09-03
> Published: Unknown

下方使用的验证级别：`[FETCHED]` = 研究过程中直接获取并阅读，行号已核对；`[SCOUT]` = 由研究子代理读取同仓库后报告的值，未由本文件编写者复验；`[DOC]` = 官方文档声明；`[3P]` = 独立第三方。

---

## A. 基本信息

- 仓库 `xai-org/grok-build`。Rust。许可证 Apache-2.0，版权方 SpaceXAI。`[SCOUT]` `https://raw.githubusercontent.com/xai-org/grok-build/main/LICENSE`
- 约 844k 行代码。`[SCOUT]`
- 2026-05-14 发布；2026-07 开源。模型 Grok 4.6 单独销售，权重不在仓库内。`[SCOUT]`
- `CONTRIBUTING.md`：明确拒绝外部 PR。仓库是内部闭源 monorepo 的定期单向同步。`[SCOUT]` `https://raw.githubusercontent.com/xai-org/grok-build/main/CONTRIBUTING.md`
- Crate 布局：`xai-grok-pager`（TUI）、`xai-grok-shell`（运行时，SessionActor）、`xai-grok-tools`、`xai-grok-workspace`、`xai-grok-sampler`、`xai-grok-sampling-types`、`xai-agent-lifecycle`、`xai-grok-foreign-sessions`、`xai-fast-worktree`、`xai-workflow`、`xai-chat-state`。`[SCOUT]`

---

## B. doom-loop：服务端信号驱动客户端中断与重试

服务端在采样过程中检测输出退化，向客户端发送中途信号。客户端中断流，注入固定提醒，截断重播重试。

- 检测类型：`tail_repetition`、`exact_repetition`、`low_logprob`。`[SCOUT]`
- 传输载体：SSE 事件 `response.doom_loop_check`；HTTP header `x-grok-doom-loop-check`。两者均为非标准扩展，不属于 OpenAI 或 Anthropic 流式协议。`[SCOUT]`
- 恢复时注入文本：`<system_reminder>Your messages have been flagged as looping...</system_reminder>` `[SCOUT]`
- 相关文件 `[SCOUT]`：
  - `crates/codegen/xai-grok-sampling-types/src/doom_loop.rs` — 线级类型
  - `crates/codegen/xai-grok-sampler/src/doom_loop.rs` — 客户端中断
  - `crates/codegen/xai-grok-sampler/src/doom_loop_recovery.rs` — 提醒注入与重试

**独立性说明。** 三个文件均位于同一仓库。按「一个仓库算一个来源」的规则，这是一条单一来源，无论一手阅读多么深入。

---

## C. LazinessDetector：声称与证据的比对分类

两个文件均已直接获取并阅读。`[FETCHED]`

- `crates/codegen/xai-grok-shell/src/session/acp_session_impl/laziness.rs` — 编排与注入
- `crates/codegen/xai-grok-shell/src/session/acp_session_impl/laziness_classifier.rs` — prompt、解析、判决
- 合计 1514 行。

自称为 Layer 3（`laziness.rs:274`），复用 Layer 2 通知排空的空闲判定（`laziness.rs:303`）。第 1、2 层未检查。

### 常量（`laziness_classifier.rs`）

| 值 | 含义 | 行号 |
|---|---|---|
| 10000 ms | 检测启动前的空闲阈值 | 13 |
| 0.7 | 判决生效的最低把握度 | 17 |
| 150 tokens | 分类器输出上限 | 32 |
| 120 s | 总超时 | 39 |
| 100 ms | 用户活动短路的轮询粒度 | 43 |

120 秒超时不会延迟响应：真实用户活动以 100 ms 粒度短路（37-38 行）。中断时直接 drop future，HTTP 请求随之取消，actor 侧无需清理（`laziness.rs:499-501`）。

### 类别

共七个类别；四个判为停滞：`stalled_narration`、`stalled_false_completion`、`stalled_permission_asking`、`stalled_no_todos_but_task_in_flight`。

`stalled_false_completion` 出现在 `laziness_classifier.rs:166` `[FETCHED]`。完整的七项枚举来自子代理阅读同仓库的 `events` 模块 `[SCOUT]`；枚举定义未由本人核对。

`category` 通过封闭枚举 `LazinessCategory` 反序列化（`laziness_classifier.rs:551`）。未知字符串是解析失败，不是静默回退。

### 判决闸门

有序排列。前四道在 `evaluate_laziness`（`laziness_classifier.rs:684-713`）；第五道在 `laziness.rs:602-608`；最后一道在锁内（`laziness.rs:653-679`）。

1. `cfg.enabled` — 按模型逐个开启，默认关闭
2. 类别属于四个停滞值之一
3. `confidence >= 0.7`
4. `nudges_used_this_session < max_nudges_per_session` — 默认上限 0
5. Goal Mode 激活
6. 仍空闲且未中断

六道闸门全部通过后，才执行 `push_system_reminder` 并递增计数器。

`laziness.rs:276` 说明该功能按模型 opt-in、默认关闭，另设每会话 nudge 上限、默认 0。

`laziness_classifier.rs:671-672` 记录了观测模式配置 `enabled = true, max_nudges_per_session = 0`：分类器仍会运行并发出 `LazinessClassifierFired` 事件，但判决在 `CapExhausted` 处被吞掉。

`laziness_classifier.rs:675` 的注释解释了为何约 99% 的触发走 NoNudge 路径——这也是 `evidence` 只在 Nudge 分支 clone 的原因。

### 审查方隔离

请求体恰有两条消息：

```
[0] System(LAZINESS_CLASSIFIER_PROMPT)
[1] User("Classify the following transcript. Output JSON only.\n\n" + 展平的 transcript)
```

`laziness_classifier.rs:81` 是固定前缀。`laziness.rs:382-387` 的注释说明了为何不放 assistant turn——放后模型会去接 agent 的话而非分类，注释中保留了当时的失败输出：`"Done. Let me know what part you're curious about."`，即模型在替 agent 接话。

展平时每行被中和并截断，普通字段 400 字符、`[assistant reasoning]` 收紧到 200，因为思维链只是辅助信号（`laziness_classifier.rs:260, 267-268`）。角色前缀 `user:`、`assistant:` 被处理，防止正文文字伪装成对话结构（357 行）。

### 防伪造硬信号

prompt 中塞入 agent 编不了的 harness 真值，如当前有多少 `spawn_subagent` 或 `background: true` 任务未返回（`laziness.rs:407`、`laziness_classifier.rs:120`）。

比对规则写在 prompt 中，原文两条：

- `Claim "N review rounds" -> count the implementer/reviewer spawn_subagent calls; N >> actual count is a discrepancy.`（143 行）
- `"I'm running the tests now" with no spawn_subagent line`（159 行）

### 输出格式与解析纪律

输出格式 `{category, confidence, reasoning}`，confidence 必须落在 `[0.0, 1.0]`（181 行）。

解析是多趟的：先剥 code fence（572 行），再抽第一个配平 JSON 对象（587 行），带字符串转义处理，防 `evidence` 字段里的 `{` 骗过计数器（586 行）。每趟过 confidence 范围检查；所有趟都因 confidence 越界失败才报 `ConfidenceOutOfRange`（625-664 行）。

### 中断检查点

同一个 `laziness_abort_snapshot()` 快照（两个代数计数器）在三处复查：空闲等待中（349 行）、sampler 调用后（548 行）、注入前持锁时（668 行）。

第三处顺序有讲究——先查 abort 再查空闲（660-662 行），使换模型/用户打断走 typed `LazinessClassifierAborted` 事件，而非被空闲复查静默吞掉。整个「空闲复查 → push → 计数器 +1」在同一锁内（653-654 行）。

换模型将 `nudges_used_this_session` 归零（260-270 行），故上限实际为「每会话每模型」。665-666 行注释防的是：换模型后注入旧模型时段的判决，会花掉新模型预算。

`--laziness-debug-log` 强制 `enabled = true`、空闲阈值降到 0（每轮结束都 fire）、每个返回点写一行 JSONL（285-287 行）。

---

## D. Goal Mode

本节全部 `[SCOUT]`。

- `GoalTracker` 状态机，含 Idle / Planning / Executing 三态，及 pause、resume、stall 检测与预算逻辑。`.../goal_tracker.rs`
- `GoalPlanner` — fail-closed 子代理规划器，输出 `plan.md`，支持显式模型与工具集覆盖及失败重试。`.../goal_planner.rs`
- `GoalClassifier` — 对抗式 skeptic panel，默认 3 个独立 skeptic 子代理并行验证。`.../goal_classifier.rs`
- 额外子代理角色：Strategist、Summarizer。

---

## E. 并行度：消解 16 到 128 倍的差异

两个子代理在同轮报告了冲突数字。收敛轮发现两者皆错。`[SCOUT]`

| 常量 | 值 | 位置 |
|---|---|---|
| `DEFAULT_MAX_CONCURRENT` | 32 | `admission.rs:7` |
| `DEFAULT_WORKFLOW_MAX_CONCURRENT_AGENTS` | 32 | `host_service.rs:28` |
| `MAX_SUBAGENT_SAMPLING_LIMIT` | 512 | 硬上限 |

`DEFAULT_WORKFLOW_MAX_CONCURRENT_AGENTS` 受 `available_parallelism` clamp，下限 2。

128 与 1024 是累计 agent 调用预算，不是并发度，定义于 `xai-workflow/src/lib.rs:12-13`。

数字 8 来自 `crates/codegen/xai-grok-pager/docs/user-guide/16-subagents.md`，不描述运行时并发上限。

hook `on_decompose`、`on_subagent_complete`、`on_merge`、`on_conflict` 不存在。源自第三方博客将 workflow 概念阶段误报为 hook 名。官方文档只定义一套 16 事件体系。`[DOC]` `https://docs.x.ai/build/features/hooks`

---

## F. 非独有能力

`[DOC]` / `[SCOUT]`

- **ACP**（Agent Client Protocol）：stdio、WebSocket serve、relay，含 `x.ai/*` 扩展方法。
- **Skills**：`SKILL.md` 配 YAML frontmatter。原生扫描 `~/.claude/skills`、`~/.cursor/skills`、`~/.agents/skills`。
- **MCP**：stdio 与 HTTP/SSE，OAuth，兼容 Claude 与 Cursor 配置。`https://docs.x.ai/build/features/mcp-servers`
- **Hooks**：16 个生命周期事件，JSON/TOML shell 或 HTTP 回调。
- **Headless**：四种输出格式加会话恢复。
- **Provider 主权**：`api_backend` 接受 `chat_completions`、`responses`、`messages`；`base_url` 可指向本地端点如 Ollama。`.../11-custom-models.md`
- **Memory**：`~/.grok/memory/`，FTS5 加向量搜索，`/flush` `/dream` `/remember` `/forget`。`.../13-memory.md`
- **Permissions**：ask / auto / always-approve / acceptEdits / dontAsk，管线 Hooks -> Rules -> Grants -> Auto-approve -> Mode。`.../22-permissions-and-safety.md`
- **Fast worktree**：`xai-fast-worktree` 在支持 CoW 的文件系统（如 BTRFS）上使用写时复制。

---

## G. 缺失能力

`[SCOUT]`

- **核心 loop 不可插件替换。** `xai-agent-lifecycle/src/local/registry.rs` 仅暴露内部 Rust trait 供 contributor 注入；插件通过目录内容注入，不可替换核心 loop。
- **非事件溯源。** `chat_history.jsonl` 加 compaction 时全量 `replace_history`；`xai-grok-session-events` 只是遥测。`xai-chat-state/src/persistence.rs`
- **无跨 harness 会话恢复。** `xai-grok-foreign-sessions` 扫描 `~/.claude/projects/*.jsonl` 与 `~/.codex/state_*.sqlite`，仅返回标题、cwd、分支、时间戳。该 crate 首行自称为 `Bounded, metadata-only listing`。不读历史、不 resume、不碰凭据。
- **无文件级读集冲突通知。** 仅靠 worktree 隔离；冲突在 merge 阶段才暴露。
- **无版本化 state CRUD 带回滚。** `/create-skill` 与 `/config-agents` 为交互式改文件。

### 已记录的更正

`claude_import.rs` 导入的是 Claude *设置*——权限规则、MCP server、hooks、环境变量、`extra_skill_dirs`——生成 TOML patch 写入 `.grok/config.toml`。它与会话无关。先前判决将其与会话 resume 对比，是类别错误。另外，这项设置迁移能力 jcode 没有。

---

## H. 2026-07 仓库上传事件

- 版本 0.2.93。`[3P]`
- 在明确指令「不要打开任何文件」下，客户端向 GCS bucket `grok-code-session-traces` 上传了完整的 5.1 GiB git bundle，含 git 历史、`.env` 及模型从未读取的 canary 文件。同一会话模型流量仅 192 KB。证据为 mitmproxy  wire 抓包。`[3P]`
- 用户界面「Improve the model」开关无效；实际控制为未文档化的服务端 flag `disable_codebase_upload`。`[3P]`
- 修复方式为服务端 flag 变更；上传代码路径仍在二进制中。`[3P]`
- 开源在事件后 4 天。`[3P]`
- 对比运行显示 Claude Code、Codex、Gemini 仅上传已打开的文件。`[3P]`

**独立性。** 原始取证工作为一位独立研究者的 gist。四篇后续文章均追溯到它。未发现独立复现。

- 原始：`https://gist.github.com/cereblab/dc9a40bc26120f4540e4e09b75ffb547`
- 衍生分析：`https://betterstack.com/community/guides/ai/grok-cli-data-leak/` ; `https://schulz.dk/2026/07/13/your-repository-has-left-the-building-why-you-should-never-trust-grok-build/` ; `https://www.digit.in/features/general/grok-builds-disaster-shows-why-it-trails-behind-chatgpt-claude-gemini.html` ; `https://byteiota.com/grok-build-is-open-source-but-the-upload-code-remains/`

### 遥测配置

`features.telemetry`、`features.feedback` 与 `features.codebase_indexing` 出现在配置参考中，含 trace 上传端点。`.../26-config-reference.md`。消费者侧默认布尔值未说明；文档仅记 Enterprise 默认关闭。`[SCOUT]`

---

## I. Benchmark

`[3P]`，证据弱。

- 旧 harness 上的 grok-code-fast-1：SWE-bench 70.8%，对比 Codex 88.7% 与 Claude Code 87.6%。
- Grok 4.6 无公开 SWE-bench Verified 成绩，未找到独立实验室复现。

---

## J. 覆盖缺口

- Laziness 流水线第 1、2 层未检查。
- `LazinessCategory` 枚举定义未由本人阅读；七项列表为子代理报告。
- 单 turn 内工具调用是否并行未确定；`tool_dispatch.rs` 未读。
- 0.2.98 之后版本是否仍含上传代码路径未确定；所有第三方分析均针对 0.2.93。
- 上传代码在开源树中的精确文件路径未定位；844k LOC 的网页搜索超时。
- Grok Build 未在研究机器上安装或运行。本文件中的任何行为声称均非来自运行该工具。
