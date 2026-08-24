# OMP Prewalk：规划后切换模型

> Sources: oh-my-pi 源码与官方文档，2026-08-24；GitHub、Hacker News、X、Reddit、掘金、V2EX、B站及中文博客公开资料，2026-08-24
> Raw: [OMP Prewalk 机制调研](../../raw/omp-prewalk/2026-08-24-omp-prewalk-mechanism-investigation.md); [OMP Prewalk 社区反响调研](../../raw/omp-prewalk/2026-08-24-omp-prewalk-community-reception.md)
> Updated: 2026-08-24

## Overview

Prewalk 是 oh-my-pi 的一次性模型交接功能：当前模型先规划，todo 规划开始落地后，第一次文件修改操作返回，在下一次模型请求前切换到便宜模型。它适合规划重、后续执行相对机械的任务，不保证便宜模型完成剩余项目，也不会自动切回当前模型。现有社区证据显示，少量重度用户认可这个思路，但尚未形成广泛采用或总体满意率证据。

## 用户看到的行为

开启 prewalk 后，OMP 会让当前模型先形成 todo 计划。当前模型执行第一次 edit/write 文件修改操作并返回后，切换在包含该操作的 assistant 消息及其工具批次结束时执行；同一消息中已经生成的其他工具调用仍由当前模型执行，下一次模型请求起才使用便宜模型。

触发条件只要求修改操作返回，不检查 `isError`。因此，失败的 edit/write 也会触发切换；失败后的实际影响没有实测，切换后出现的 checklist 只是给模型的验证提示，不构成正确性保证。

切换只发生一次。这里的“一次”是指 prewalk 自动切换机制：它切换后不再自动切回，也不会按剩余 todo 项逐项重新选择模型。用户仍可用 `/model` 手动切换；其他自动机制也可能改变模型。切换是当前会话级行为，不把模型选择写回配置；但 usage 统计仍可写入 settings storage。

如果任务始终是研究或问答，没有文件修改操作返回，触发条件不会满足，待处理状态会继续存在。

## 启用与目标模型

可用路径包括：

```text
omp --prewalk
omp --prewalk-into gpt-5.4-mini
omp --no-prewalk
```

也可在配置中启用 `prewalk.enabled: true`，或在会话中执行 `/prewalk`。`/prewalk` 固定使用 `@smol` 目标；没有 off/status/toggle 命令。恢复已有会话时，配置启用不会自动重新建立 prewalk 状态。

目标解析失败或目标没有可用凭证时，OMP 发出 warning 并跳过，不阻止会话继续。未发现 prewalk 专属环境变量；`PI_SMOL_MODEL` 可以间接改变默认目标。

## 子代理

子代理可以单独配置 prewalk。优先级从高到低是：settings 中的 `task.agentPrewalk`，agent frontmatter 中的 `prewalk`，以及 bundled generic task 的 `task.prewalk` fallback。目标不可解析、没有可用凭证或同模型 no-op 时，子代理只收到 warning，不因此阻止启动。security-reviewer 被强制关闭 prewalk。

plan-mode 子代理会清除 agent frontmatter 的 prewalk 设置；源码没有专门证据证明 bundled task 的 fallback 也一定被清除，因此这部分仍是待验证推断。plan-yolo 与 prewalk 使用独立状态逻辑，源码未显示二者之间有互斥或排序保护。

## 边界与使用风险

- **Cursor 通道不应假定支持 prewalk。** [Issue #6075](https://github.com/can1357/oh-my-pi/issues/6075) 仍是 open 并带 wontfix label；维护者评论认为 Cursor 服务端单次请求运行完整 agent loop，使当前实现收不到触发 handoff 所需的工具结果。这是 issue 评论中的架构判断，不是正式关闭定案。
- **不能把失败编辑当成成功交付。** 失败 edit/write 也会触发切换；后续便宜模型只是继续尝试处理剩余项目，checklist 只是提示验证。
- **模型质量不会按 todo 难度自动升级。** 如果剩余项目需要更强推理，用户必须手动 `/model` 切换；prewalk 没有按项目自动回升的机制。
- **handoff 前后的 Esc 不承担模型回切。** handoff 前中断会保留当前模型和待处理状态；handoff 后中断会保留当时模型。该行为的完整交互尚未做专门运行时实验。

## 社区反响

当前证据支持的结论是：**概念受到小范围认可，功能尚未得到广泛口碑验证。**

正面信号主要来自少量重度用户：HN 用户称 prewalk 是 “cool new ideas”；另一位称 OMP 是 “most advanced, configurable and capable harness”；Elves 工具作者称 prewalk 是 “great idea”；Pi 扩展作者把类似方法移植到 pi-prewalk，并称获得 “huge amount of success”。这些是个例，且最后一条评价的是方法移植，不是 OMP 本体。

负面信号集中在具体问题：[#6174](https://github.com/can1357/oh-my-pi/issues/6174) 抱怨无法关闭 armed 状态和重复提示，并称其为 “terrible user experience”；[#7312](https://github.com/can1357/oh-my-pi/issues/7312) 讨论过早降级的风险；[#6659](https://github.com/can1357/oh-my-pi/issues/6659) 报告合法配置静默失效。社区成员为相关问题提交修复 PR，证明有人实际关注，但不等于总体满意率。

中文材料主要是教程和 OMP 泛介绍。掘金教程列出了 prewalk 命令，但没有作者运行记录或主观评价；B站 OMP 视频的播放和互动说明 OMP 话题有传播，不说明 prewalk 采用量或好评。未发现本次覆盖范围内中文社区对 prewalk 的多用户实测口碑。

HN 的批评还指出跨模型切换的 KV cache 冷启动、计划可审阅性和缺少代码质量比较数据。这些是方法论层面的有效保留，不是独立的 OMP prewalk 失败复现。

## 适用判断

适合：规划复杂但实现阶段主要是按计划修改、批量处理或样板化执行的任务；用户愿意接受一次性切换，并会检查便宜模型的结果。

不适合：实现过程中仍需要频繁重新设计、剩余 todo 难度差异很大、需要自动按项目切回强模型、或使用 Cursor 通道的任务。

## 历史与当前状态

Prewalk 从 v16.5.0 引入，后续经历了循环处理、只读 xd:// 排除、one-shot 生命周期、DeepSeek 兼容和文档化等修正。相关历史问题包括：[#5551](https://github.com/can1357/oh-my-pi/issues/5551) 已由 [PR #5553](https://github.com/can1357/oh-my-pi/pull/5553) 修复；只读 xd:// 行为由 [PR #7314](https://github.com/can1357/oh-my-pi/pull/7314) 修复；one-shot 生命周期由 [PR #7785](https://github.com/can1357/oh-my-pi/pull/7785) 修复；DeepSeek reasoning 问题对应 [commit 54ce9e47fc](https://github.com/can1357/oh-my-pi/commit/54ce9e47fc6e)。

## 未决问题

- plan-mode 子代理清除 frontmatter 后，bundled task fallback 是否仍可能启用 prewalk，尚未运行时验证。
- prewalk 与 plan-yolo 同时启用时的交互，尚未运行时验证。
- 失败 edit/write 后切换对实际交付质量的影响，尚未实测。
- 社区没有足够样本支持采用率、满意率或“广泛喜爱”的统计结论。

## See Also

- [OMP Mnemopi Consolidation 生命周期](../omp-mnemopi/consolidation-lifecycle.md)
