# Coding Agent 的短反馈闭环：逐轮 Advisor

> Sources: OMP 源码调查，2026-09-05；Pi Advisor，Unknown；Pi OMP-like Advisor，Unknown；DSH Advisor，Unknown
> Raw: [OMP Advisor 源码调查](../../raw/omp-slash-commands/2026-09-05-scout-collaboration.md); [OMP CLI Advisor 选项](../../raw/ai-coding-agents/2026-09-05-cli-help-recursive-survey.md); [Pi Advisor](../../raw/ai-coding-agents/2026-09-10-pi-advisor.md); [Pi OMP-like Advisor](../../raw/ai-coding-agents/2026-09-10-pi-omplike-advisor.md); [DSH Advisor](../../raw/ai-coding-agents/2026-09-10-dsh-advisor.md)
> Updated: 2026-09-10

## 概览

短反馈闭环指：主模型完成一轮工作后，第二模型自动审查这一轮，并把 advice 回流同一 session，供主模型下一轮修正。严格按这个定义，当前资料确认的实现有 OMP Advisor、Pi `pi-advisor`、Pi `pi-omplike-advisor` 和 DSH `dsh-advisor`。

## 定义

只有同时满足以下条件，才算严格同类：

1. 主 agent 每轮完成后自动触发第二模型。
2. 第二模型负责审查主 agent 的本轮工作。
3. 审查建议回到同一 session。
4. 主 agent 可以在后续一轮使用该建议继续工作。

普通 reviewer、并行 subagent、一次性 diff/PR review、CI/test-only retry 不归入本模式。

## 四个严格同类实现

### OMP Advisor

OMP 的 `/advisor` 描述为第二模型逐轮审查并注入 notes。`omp --advisor` 启用 Advisor runtime，CLI 描述同样明确为被动审查每一轮并注入 notes。Advisor 的角色是旁审者，主 agent 继续负责执行。

### Pi `pi-advisor`

`pi-advisor` 在每个主 agent turn 后运行第二模型。Advisor 可以读取用户提示、assistant 消息、工具调用和工具结果，并使用隔离的只读工具检查项目；它可以发出 `nit`、`concern` 或 `blocker` 建议，但不能编辑文件、执行命令或改变 session 状态。

### Pi `pi-omplike-advisor`

这是 OMP Advisor 在 Pi 公共 extension 接口上的移植版。它按每轮 transcript delta 审查主 agent，并将建议放入 pending queue，在 turn 边界或 review 完成时 flush。高严重度建议会先暂存并由下一次 review 重新确认，以降低异步建议过时的风险。

### DSH `dsh-advisor`

`dsh-advisor` 是 DeepSeek Harness plugin。它为每个 session 使用独立 reviewer model，审查每个 stepped turn，并把 `nit`、`concern` 或 `blocker` 注入原 session。它只提供建议，不批准或拒绝主 agent 动作，也不会递归审查自己的 advice。

## 共同结构

```text
主模型执行一轮
       ↓
第二模型读取本轮 transcript
       ↓
生成 review advice
       ↓
advice 回流同一 session
       ↓
主模型下一轮修正
```

共同点有四个：

- **逐轮触发**：反馈延迟短，不等到任务结束才审查。
- **独立模型**：reviewer 与 executor 分离，可以使用不同模型。
- **建议回流**：结果进入原 session，而不是只写到外部报告。
- **旁审而非接管**：Advisor 不能编辑文件、执行命令或替主 agent 做决定。

## 不纳入的相邻机制

- Claude Code Advisor 是关键时刻的按需咨询，不是每轮自动审查。
- OpenHands Critic 是完成或评估节点后的 follow-up，不是逐轮 Advisor。
- MetaGPT 的代码审查失败后重写属于阶段级循环。
- Codex、Cursor、Junie、Devin 的现有材料主要是 diff、PR、hook、审批或显式 review。
- 普通 reviewer、并行 subagent 和 CI/test loop 缺少本定义要求的逐轮第二模型回流。

## 结论

OMP Advisor 不是唯一实现，但这种短反馈闭环仍然少见。当前已确认的严格同类集中在 OMP、Pi 和 DSH 生态；主流 coding agent 更多提供一次性 review、按需咨询、任务级 critic 或确定性测试反馈。

## See Also

- [OMP 内置 Slash 命令全表](../omp-slash-commands/builtin-slash-commands.md)
- [Reviewer Blind Spots](../harness-engineering/reviewer-blind-spots.md)
- [四 Agent CLI 能力面对比](cli-capability-surface.md)
