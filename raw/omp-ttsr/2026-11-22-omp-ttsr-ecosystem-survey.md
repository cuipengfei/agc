# OMP 公开 TTSR 资源与官方规则机制调研摘录

> Source: can1357/oh-my-pi `docs/rulebook-matching-pipeline.md`、`docs/marketplace.md`；各候选仓库公开源码及 GitHub REST API；本会话调研记录 `experiments/2026-11-22-omp-ttsr-ecosystem-research.md`
> Collected: 2026-11-22
> Published: Unknown

## 官方规则分类与加载方式

原文出处：https://github.com/can1357/oh-my-pi/blob/e1a9f4b41d24fe223bb71e864bef552f0fae6948/docs/rulebook-matching-pipeline.md

`bucketRules` 先处理 TTSR，再处理 `alwaysApply` 和 rulebook：

1. 有 `condition`、`astCondition` 或 `question` 的规则，成功注册后属于 TTSR。
2. 剩余 `alwaysApply === true` 的规则全文注入系统提示词，仍可通过 `rule://` 重读。
3. 剩余带 `description` 的规则进入 rulebook，在系统提示词里列出名称与简介，模型按需读取正文。

`globs` 不参与 rulebook 的自动选择；它作为 TTSR 的文件路径门槛，也显示在规则简介里。

官方 `Rule` 字段包括：`interruptMode?: "never" | "prose-only" | "tool-only" | "always"`；`repeatMode?: "once" | "after-gap" | "always"`。这两个字段可覆盖全局设置。`repeatMode: always` 只在规则级提供。

OMP 插件的 `rules/*.{md,mdc}` 由 `omp-plugins` provider 加载；原生规则包括项目 `.omp/rules/` 和用户 `~/.omp/agent/rules/` 下的 `.md` / `.mdc`。规则发现与执行分开：文件包含字段不代表当前 OMP 版本一定加载成功，更不代表规则意图正确。

## 搜索与数据口径

主线和后台 agent 使用 GitHub 代码搜索、仓库 API、公开 README 与规则源码核验。报告保留仓库名称及精确规则链接；本 raw 仅保存重点候选的必要摘录。stars 与 pushed_at 是 2026-11-22 快照，不代表规则包自身质量。

| 仓库 | stargazers_count | pushed_at | 读取范围 |
| --- | ---: | --- | --- |
| M0n7y5/slop-stop | 2 | 2026-08-19T16:32:27Z | 两份重点 TTSR 全文，另核对规则包分类 |
| joshuaswarren/remnic | 235 | 2026-11-22T07:34:54Z | `.omp/rules/README.md` 全文，报告另有 13 份条件规则分类 |
| themuuln/omp-config | 1 | 2026-09-23T09:26:13Z | 两份重点 TTSR 全文，报告核对 40 份规则资产，其中 39 份有条件字段 |
| zerx-lab/FluxDown | 5912 | 2026-11-22T06:17:36Z | 报告核对 `.omp/rules/` 23 份条件规则，主线抽读中文规则 |
| 0xfe-project/eta | 283 | 2026-11-22T09:42:17Z | 报告称 27 份预设资产；主线抽读 `go-ioutil.md`、`rs-box-leak.md` |
| rstacruz/omp-typescript-antislop | 1 | 2026-10-10T11:16:44Z | 报告称 14 份条件规则已直读 |
| jvsteiner/agent-rules | 0 | 2026-10-11T10:18:53Z | 报告称 10 份原生规则均 `interruptMode: never` |
| kartikkabadi/no-ai-slop | 17 | 2026-10-15T04:09:49Z | 报告称 3 份条件规则 |
| stray-nick/terse-agent-output | 13 | 2026-08-10T14:57:03Z | 报告称 1 份 TTSR、1 份 `alwaysApply` |
| pjsny/omp-commitwright | 9 | 2026-08-19T16:38:52Z | 1 份条件规则 |
| tomkyser/omp-holmes | 0 | 2026-06-11T15:57:08Z | 报告称 7 份条件规则资产，兼容写法有疑问 |
| autopus-ai/autopus-adk | 109 | 2026-11-22T09:29:37Z | 报告称 `lore-commit.md` 为 TTSR，另三份为非 TTSR |
| austinm911/anti-slop | 0 | 2026-11-05T22:25:37Z | 报告称 1 份 TypeScript 条件规则 |
| ghost-him/ZeroLaunch-rs | 585 | 2026-11-21T12:08:00Z | 报告称至少确认 1 份中文 TTSR |
| 0x56696B/agent-delivery-handbook | 0 | 2026-11-02T08:48:25Z | 报告确认 `no-redundant-reverify.md` 为 TTSR；此前搜索摘要 7 stars 与 API 不符，以 API 为准 |

除既有 `JYeswak/omp-kit-companion` 外，报告新增 15 个含 TTSR 文件的公开仓库。各类数量以来源仓库实际内容为准；`eta` 只抽读了两份，`ZeroLaunch-rs` 只确认了一份。

## 中文与命令防坑候选

`zerx-lab/FluxDown` 的 `.omp/rules/dependency-policy.md` 使用中文正文，`condition` 观察依赖清单，`scope: tool:edit,tool:write`，`interruptMode: never`。原文：https://github.com/zerx-lab/FluxDown/blob/main/.omp/rules/dependency-policy.md

`0xfe-project/eta` 的 `packages/TOBEREFR/eta-plugin-akhook/presets/omp/go-ioutil.md`：`condition: '"io/ioutil"'`，`scope: "tool:edit(*.go), tool:write(*.go)"`，`interruptMode: never`。原文：https://github.com/0xfe-project/eta/blob/main/packages/TOBEREFR/eta-plugin-akhook/presets/omp/go-ioutil.md

该预设 README 写明这些规则复制自 OMP `v18.2.11`。

`M0n7y5/slop-stop` 的 `no-prose-slop.md` 观察文本，包含 `should work now`、`seems to pass` 等英文成功措辞，命中后中断重写。原文：https://github.com/M0n7y5/slop-stop/blob/main/rules/no-prose-slop.md

`themuuln/omp-config` 的规则目录既有通用证据与资源提醒，也绑定作者的 macOS、`hub`、私有技能与脚本。其 `concise-output.mdc` 观察英文“太长”等关键词，不能据此声称它会稳定监听用户的中文抱怨。

主线逐项读取的主要候选 `pushed_at` 日期为：`2026-08-19`（slop-stop）、`2026-09-23`（themuuln/omp-config）、`2026-10-10`（omp-typescript-antislop）、`2026-10-11`（agent-rules）。

## 证据边界

公开仓库的 stars 可能属于主应用。`FluxDown` 与 `ZeroLaunch-rs` 都是应用仓库，不能将星数当作 TTSR 包采用量。`remnic` 的星数也属于 Remnic 主程序。

候选源码表明可读取的机制，不是本机触发效果。报告未安装新规则包，未测中文触发率、误报率和费用。公开插件目录的“可安装/已加载”也不等同于功能经过验证。