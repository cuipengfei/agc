# Factory Gate 参照标准（Backlog Loop 全流程）

> Sources: Emmanuel Goossaert, codecapsule.com, 2026-10-04; goossaert/backlog-loop README, 2026-10-29
> Raw: [what-i-learned-building-an-ai-software-factory](../../raw/software-factory/2026-10-29-what-i-learned-building-an-ai-software-factory.md); [awesome-software-factories-local-options](../../raw/software-factory/2026-10-29-awesome-software-factories-local-options.md)
> Updated: 2026-10-29

## Overview

本文记录 Goossaert 在九周自建中总结出的七阶段工序与机械关卡清单。它的用途是作为「一段 agent 流水线离真正的 factory 还差什么」的参照标准：任何候选方案的关卡能力，都可以逐项对照这里检查，缺口写在 [landscape](ai-software-factory-landscape.md) 的「关卡事实边界」里。

## 七阶段

```
grill → apply-docs → plan → atdd → implement → review → review-correctness
```

- **grill**：唯一有人参与。一次问一个问题，每题附推荐答案；穷问不可逆决定（数据结构、表结构、命名、对依赖的行为）；复述总结找矛盾或含糊。
- **apply-docs**：决定写进 glossary 与 ADR，一次 commit。
- **plan**：切竖直薄片（tracer bullet），每片有可观察终点；写明规则、不变式与「禁止走的捷径」清单；set `total_phases`。
- **atdd**：只写测试；证明它们是 RED；一条 rule 写多类测试（常态、边界、必须拒绝的用例、性质测试）；测试按 spec 写，禁止照实现反推。
- **implement**：只写产品代码，禁触碰测试；测试目录用操作系统权限禁止写入。
- **review**：不评代码，评测试：能否被作弊、是否被篡改、是否按实现反向写测试（overfitting）、变异分数是否够、有没有覆盖缺口。
- **review-correctness**：不看测试，只读 spec 与实现，从 spec 推演「测试全绿但仍错」的缺陷。
- 每阶段 fresh session、一次 commit。gate 在 implement 与 review-correctness 之后各有一个（re-derive from the commit）；gate 失败带发现退回同阶段，`max_retries=3`；超标后 STOP，flag for a human。任务内 slices 推进，每片 retry budget 重置。

## Gate 检查项（机械层清单）

| 检查 | 时机 | 内容 |
|---|---|---|
| testing-the-judge | gate 改动后 | gate 自身有 unittest suite；gate bug 第一优先级修 |
| pre-baseline-green | 循环启动 | 先证明现有测试基线全绿 |
| fast-build-check | 每阶段前 | 快速构建检查 |
| red-confirmation | atdd 后 | 新测试重跑至多 3 次每次都必须红；只红一次 = flaky |
| hermetic-verify | implement 后 | 干净 clone 全量跑 3 次 + 一次随机顺序 |
| mutation-testing | implement 后 | gate 自己运行变异工具，与项目要求的最低分数比较；分数来自工具输出，而非评审模型的说法 |
| extra-verification | implement 后 | PBT / metamorphic / differential 下限 |
| forbidden-patterns | lint 阶段 | 禁模式的静态扫描（禁 `sed -i`、禁 skip、禁禁止模式内的 allowlist） |
| static-analysis | lint 阶段 | linguist 检查 |
| 失败出口 | 任一关卡 | 同阶段带 findings 重试 ≤3 → 超出 → STOP flag for a human |

## 本次调研中各方案对照这张表的可行结论

- Backlog Loop（开源实现）是唯一把这张表逐项写进配置文档的（`verify_command`、每检查项独立 block，可自由取用）。
- 三千星项目（OpenHands、Multica、Superplane、Mission Control）README 只写到 guardrail / Aegis / review gate 一层，内部红绿前置 / 变异下限 / 测试目录不可写均未展开。
- 自建最多机械关卡的现状：这是本次调研时点的事实，不构成「大项目永远没有这层」的推断。

## 证据边界

- 变异分数下限是「项目要求值」，文章未给通用分档数字；`max_retries=3` 与 hermetic 3+1 次数是作者自述，没有第三方复现。
- red-confirmation 的规则来自文章正文与 backlog-loop README 的 gate 配置说明；逐行代码实现未核对。
- testing-the-judge 的 unittest suite 在仓库里可查，本文未展开核对代码目录。
