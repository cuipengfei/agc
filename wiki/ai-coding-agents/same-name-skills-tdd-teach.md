# 同名 skill 的遮蔽与选型：pstack 与 mattpocock 的 tdd、teach

> Sources: backnotprop/pstack `skills/tdd/SKILL.md`、`skills/teach/SKILL.md`（commit f104aa8），2026-11-07; mattpocock/skills `skills/engineering/tdd/`、`skills/productivity/teach/`（commit 4ae2317），2026-11-07; 本机 skills CLI 换源操作与 `.skill-lock.json`, 2026-11-07
> Raw: [tdd 与 teach 四份 SKILL.md 全文与换源记录](../../raw/ai-coding-agents/2026-11-07-tdd-teach-dual-repo-versions.md)
> Updated: 2026-11-07

## Overview

`tdd` 与 `teach` 这两个名字在 pstack 与 mattpocock/skills 仓库里各有一份，内容不同。安装器按名字只保留一个来源，所以磁盘上永远只有一份，锁文件里也只有一条，只看本地状态无法发现重名。选型要靠两仓目录树和两份正文的差别判断，不能靠名字。

## 遮蔽：一个名字一个来源

锁文件 `.skill-lock.json` 的 `skills` 以 skill 名为 key，同名条目只能存在一个 `source`；磁盘上 `~/.agents/skills/<name>/` 也只有一个目录。两仓各自的路径与字节如下：

| 仓库 | tdd | teach |
| --- | --- | --- |
| pstack | `skills/tdd/SKILL.md` 3143 | `skills/teach/SKILL.md` 5623 |
| mattpocock | `skills/engineering/tdd/SKILL.md` 3629，另有 `mocking.md` 1481、`tests.md` 2214、`agents/openai.yaml` 87 | `skills/productivity/teach/SKILL.md` 9733，另有 `MISSION-FORMAT.md`、`RESOURCES-FORMAT.md`、`LEARNING-RECORD-FORMAT.md`、`GLOSSARY-FORMAT.md` 与 `agents/openai.yaml` 139 |

附件也是判据：本机 `~/.agents/skills/tdd/` 含 `tests.md` 与 `mocking.md`，说明装的是 matt 版；`~/.agents/skills/teach/` 只有 `SKILL.md`，没有 `*-FORMAT.md`，说明装的是 pstack 版。

pstack 正文还直接调用 matt 的 `tdd`：`poteto-help`、`poteto-mode/playbooks/bug-fix.md`、`poteto-mode/references/recipes.md`、`implement`、`implement-spec` 都指向 `/tdd`。也就是说 pstack 在 `tdd` 这一项上依赖共享安装里的那份，不自带副本。

## tdd：缺陷修复工具 与 通用红绿循环

| 维度 | pstack 3143 B | mattpocock 3629 B |
| --- | --- | --- |
| 标题与范围 | `TDD Bug Fix`，只管修缺陷 | `Test-Driven Development`，功能与缺陷都覆盖 |
| 触发 | `disable-model-invocation: true`；description 写「Use only when the user explicitly asks for TDD, a failing test, or a regression test, OR when the bug has an obvious cheap local test target. Skip when the test path is unclear, expensive, integration-heavy, or not requested.」 | 模型可自行调用；description 覆盖 red-green-refactor 与集成测试 |
| 前置判断 | 「Do not force a test when it would be impractical.」测试路径不明确、代价高、依赖重、需要生产状态时直接放弃，改用最接近的可执行检查 | 「Test only at pre-agreed seams.」先与你确认接缝，未确认不写测试；接口形状不明时调 `codebase-design` 取词汇 |
| 主体内容 | 六步流程，加一节「If a Failing Test Is Impractical」与四条 Guardrails | 什么算好测试、接缝位置、三类反模式（implementation-coupled、tautological、horizontal slicing）、循环规则 |
| 收尾 | 「Report the evidence, not just the outcome」：要点名先失败的那个测试与它产生的失败，指名修复后通过的那次运行 | 「Refactoring is not part of the loop.」重构归 `code-review`；每轮一个纵向切片 |

写新行为用 matt 版。修缺陷且已经在用 `poteto-mode` 时，pstack 版的价值集中在「什么情况下不该写测试」和「必须交出先失败证据」两条，而 `poteto-mode` 的 `bug-fix` playbook 本来就会引用它。

## teach：一次性讲解 与 多会话课程

| 维度 | pstack 5623 B | mattpocock 9733 B |
| --- | --- | --- |
| 产物 | 一段解释，不改动仓库 | 工作区文件：`MISSION.md`、`RESOURCES.md`、`NOTES.md`、`lessons/*.html`、`reference/*.html`、`learning-records/*.md`、`assets/` |
| 时长 | 当场讲完，可以追问深入 | 「This is a stateful request - they intend to learn the topic over multiple sessions.」 |
| 依赖 | 明确跑 `how` 与 `why` 两个技能，并「Keep `why`'s confidence language intact (its hedges are findings, not style)」 | 自足；先补 `RESOURCES.md`，原则是「Never trust your parametric knowledge.」 |
| 方法 | 先给平实定义再接到眼前这个案子；三个以上部件时「Draw a short series instead」，逐步叠图；不打印 framing label、不做测验式追问 | 流畅强度与储存强度之分，靠检索练习、间隔、交织建立长期留存；每课一个可完成的小收获 |
| 表述 | 全程过 `unslop`，讲机制不讲比喻 | 不限文风，重点是课件排版质量与一手来源 |

两个版本几乎不是同类工具：pstack 版是「现在讲明白」，matt 版是「搭一学期课程并留下可复习材料」。目标是系统学一个主题并留下可复习材料时 matt 版更完整；要当场听懂一段代码或一次改动，pstack 版更直接。本机按后一种用途保留 pstack 版。

## 切换来源的操作

换源走两次 CLI 调用：先 `skills remove <name> -g -y`，再 `skills add <repo> -g -s <name> -a claude-code codex -y`。带上两个 agent 是为了让目标目录超过一个，否则 `-y` 会把 skill 复制成真实目录，脱离共享存储。判定链见 [skills CLI 安装模式与共享存储](../agent-tooling/skills-cli-performance-model.md)。

本次结果：`tdd` 保持 `mattpocock/skills`，`teach` 换成 `backnotprop/pstack`，锁文件来源计数由 matt 31 / pstack 56 变为 matt 30 / pstack 57，总数 156 不变。

## See Also

- [skills CLI 安装模式与共享存储](../agent-tooling/skills-cli-performance-model.md)
- [pstack 技能地图与行为](pstack-skill-map-and-behaviors.md)
- [mattpocock/skills：两轴分类的工程 skill 集](mattpocock-skills-system.md)
- [skill 系统的两种组织轴](skill-system-organization-axes.md)
