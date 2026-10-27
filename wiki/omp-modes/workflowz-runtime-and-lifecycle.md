# workflowz 运行机制与生命周期

> Sources: oh-my-pi 官方文档与源码，2026-10-27；本机会话实测，2026-10-27
> Raw: [workflowz 运行时与生命周期源码摘录](../../raw/omp-modes/2026-10-27-workflowz-runtime-source-excerpts.md); [workflowz 五项池实测](../../raw/omp-modes/2026-10-27-workflowz-live-pool-run.md)
> Updated: 2026-10-27

## Overview

`workflowz` 是一个 turn-scoped 关键词：它只在当前轮追加一条隐藏 notice，要求主 agent 在 `eval` 内核里写编排。真正的运行状态在池里，不在对话里。当前规则默认对 2 项以上独立工作建 `workpool()`；依赖链或需要 schema 数据时用单个 `agent()` handle。

## 触发与注入

- 精确小写、独立成词；代码块、行内代码、HTML/XML 注释与标签内容不触发。
- 只认用户发起的 prompt；匹配基于展开后的文本，斜杠命令与提示词模板可以引入关键词。
- 会话必须同时启用 `task` 与 `eval`；缺一个则整条 notice 跳过。
- notice 通过 `prependMessages` 放在用户消息之前；多个关键词按注册表顺序排列：`ultrathink`、`orchestrate`、`workflow`、`jevify`。
- 源码里的设置 id 是 `workflow`，触发词是 `workflowz`。

## 配置项

| 设置项 | 默认值 | 与 workflowz 的关系 |
|---|---|---|
| `magicKeywords.enabled` | `true` | 全局开关；关闭后 notice 与编辑器动画停止，静态高亮与拼写豁免保留 |
| `magicKeywords.workflow` | `true` | 单词开关；只控制 workflowz 的 notice |
| `task.maxConcurrency` | `32` | 池的工作者上限；每次调用实时读取；`0` 表示不限制 |
| `eval.workpool.freshAgents` | `false` | `true` 时每个工作项新起一个 agent；创建池时读取一次 |
| `eval.tools.enabled` | `true` | 决定 `tools=` 与 `@tool` 段落是否出现；允许工作者调用内核定义的工具 |
| `task.maxRuntimeMs` | `0` | 单个工作者回合的墙钟上限；`0` 表示关闭；第一回合继承，后续回合实时读取 |
| `async.maxJobs` | `100` | 会话级后台任务上限；批次任务计入运行槽，聚合任务以 `queued` 登记，不占运行槽 |
| `task.maxRecursionDepth` | `2` | eval 子 agent 的嵌套深度；负值表示不限制 |
| `task.disabledAgents` | `[]` | 影响 `scout` 可用性与 notice 文本；禁用 agent 在创建池时报错 |

`task.batch` 的值仍传入 `MagicKeywordContext`，但当前 notice 模板没有 `taskBatch` 分支，因此不改变 workflowz 的规则文本。

## 池对象与数据形状

`workpool()` 返回池对象，`name` 同时是聚合任务 id。

```ts
{ op: "create", agent?: string, name?: string, context?: string, tools?: string[] }
{ op: "push", name: string, items: string[] }
{ op: "status" | "peek" | "close", name: string }

// create -> { name, agent, limit }
// push   -> { ids: string[] }
```

`status()` 报告 `name`、`agent`、`limit`、`closed`、`freshAgents`、每个工作者的 `state`/`queued`/`turns`/上下文占用，以及 `items` 的五个计数与 `batches` 数量。`peek()` 返回每个批次的 id、agent、item ids、status 与 output，以及 `pending` 数量。

## 分派、复用与批次

- 新项先交给上下文占用最低的空闲工作者；未达上限则新建；达到上限则按轮转排进忙碌工作者的队列。
- 工作者忙碌时排队的项，在它下一回合合并成一个批次发送；工作者的第一个批次只有一项。
- 共享 `context` 只在工作者第一回合进入系统提示；后续回合不重发。空字符串会被拒绝。
- 工作者保持常驻；完成一项后进入空闲，后续项可以继续交给它。`eval.workpool.freshAgents=true` 改为每项新起一个 agent。

## 投递、截断与关闭

- 每个批次是独立后台任务，但被标记为不自动投递；调用 `wait` 时能看到完成快照。
- 池排空后只自动投递一条聚合结果，任务 id 是池名；聚合内每个批次一段，使用未截断的批次输出。
- 批次文本在 6000 字符处截断，完整内容通过 `agent://` 读取；聚合内联超过 `12_000` 字符时给 `4,000` 字符预览与链接。
- 池排空后关闭；再 `push()` 抛 `workpool <name> is closed`。池名在所属会话结束前一直保留，下一阶段要换名字。
- 单独 `close()` 只取消排队项，正在跑的回合继续；终止聚合任务才会取消所有批次。
- 没有 `pool.wait()`；完全阻塞时离开 `eval` 调用 `wait` 工具。

## 五项池实测

本机 18.13.1、`task.maxConcurrency=4` 下，五项进入名为 `workflowz-probe` 的池：4 个工作项立即运行，1 个排队。1 号工作者完成第 1 项后接下第 5 项，`turns=2`。批次结果在 6000 字符处截断，完整内容从 `agent://` 读取；聚合结果 `completed (5 item(s), 5 batch(es))` 只投递一次。

## notice 生命周期

- 每次用户提交只创建一次；创建点只有普通输入与用户调用的 skill。同一个词重复出现只产生一条 notice。
- 同一 prompt 内多个关键词各生成一条；空行与顺序按注册表，不按文本出现顺序。
- 跨轮次没有去重：每个匹配的提交都会新造一条 notice，历史里可以堆积多条。
- 排队与插话：notice 与用户消息成组入队、一起投递、一起移除；队列界面不显示隐藏消息。
- 重试不重新创建；压缩时 `custom_message` 可作为切分点，保留区内的 notice 随历史重放；恢复与分叉原样复制。
- 斜杠命令与模板展开可以引入关键词；`session.steer()` 与 `session.followUp()` 展开模板但不创建 notice；skill 只扫描参数。

## 匹配边界

匹配用的掩码不是 CommonMark 解析器，只有围栏扫描与行内处理两层。结果是：

- 未闭合或闭合名字不匹配的 XML 元素只掩码标签本身，内容仍会命中；`<?xml …?>` 与 CDATA 也会命中。
- 4 个空格缩进的代码块不识别；4 个空格缩进的波浪线围栏会命中。
- 转义反引号被当成代码边界，`Array<workflowz>` 被当成未闭合标签。
- 汉字紧贴关键词两侧会阻断；中文标点、引号、emoji、撇号不阻断。
- `workflowz,`、`workflowz's`、`workflowz (now)` 命中；`workflowz()`、`workflowz.ts`、`foo::workflowz`、`workflowzs` 不命中。

## 历史与设计变化

- 2026-05-31 以 `workflow` 创建（`5fae08d2b7`）；2026-06-08 改名为 `workflowz`（`bc936cde43`），内部 id 保持 `workflow`。
- 2026-06-10 加入 `magicKeywords.workflow` 等开关（`7450acd4f0`）。
- 2026-07-05 改走 `task` 工具（`92765fc409`），2026-07-19 回退（`123ea5680a`），同日加入 `task` + `eval` 门槛与双语言示例（`4088c20ecb`）。
- 2026-09-03 WorkPool 重写（`05bb0c1989`），移除 `parallel()`/`pipeline()`；2026-09-20 关键词统一到 `modes/magic-keywords.ts`（`dd78f0f69a`）。

“deterministic” 从首版起指编排由显式代码写定，不承诺顺序可复现、种子或逐字节一致结果。

## 文档与测试落差

- `README.md` 仍写“workflowz — build a deterministic multi-subagent workflow with the active task tool”，停留在 2026 年 7 月的短暂版本。
- `docs/magic-keywords.md` 说 notice 随 `task.batch` 变化；模板已无该分支。
- `docs/settings.md` 没有 `magicKeywords.*` 键的表格。
- 测试覆盖注入、开关、能力门槛与排序，但没有直接用生产正则测试大小写、路径、`::`、括号调用、汉字贴邻；原 TUI 边界测试在 `dd78f0f69a` 删除。

## See Also

- [OMP 工作模式与 Magic Keywords](modes-and-magic-keywords.md) — 四个关键词的入口、开关与组合建议。
- [跨 Harness 编排：workflowz 与 orchestrate 的对应物](../ai-coding-agents/cross-harness-orchestration.md) — Claude Code、Codex、OpenCode、OMO 的近似物。
- [OMO 独立版与插件版](../ai-coding-agents/omo-native-vs-plugin.md) — `mass ulw` 的独立版归属。
