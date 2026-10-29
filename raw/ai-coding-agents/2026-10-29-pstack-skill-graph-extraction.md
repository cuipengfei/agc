# pstack 技能图抽取会话产物（backnotprop/pstack@25abb38）

> Source: 本机克隆 https://github.com/backnotprop/pstack（commit 25abb38559ddbabec563646224d09eff9a250eca，默认分支 main，2026-10-29）；抽取脚本 /tmp/pstack-map/extract.py 与 /tmp/pstack-map/verify.py 的输出；对产物 JSON（/tmp/pstack-map/graph.json、report-data.json）的核对
> Collected: 2026-10-29
> Published: Unknown

## 前提与方法

- 抽取以固定 commit 的仓库树为唯一事实来源；后续引用绑定 commit `25abb38`。
- verify.py 断言通过：61 技能节点、23 playbook 伪节点、3 入口文档节点；asset-reference 边 103 条、去重目标 90 个——其中 46 个相对路径以 SKILL.md 结尾、解析后指向已在节点表中的技能节点（如 `create-formal-verification-skill` 的 `./statechart/SKILL.md`、`ketchup-video` 的 `./ketchup/SKILL.md`、poteto-help 的 34 个 `./<技能>/SKILL.md`），44 个为真正的非技能资产目标（references/、scripts/、templates/ 文件与目录）；执行边 179 条（合并 145 对）；全部边端点在节点集内；每条边带原文行号。
- 技能定义文件枚举：`**/SKILL.md` 共 61 个（`skills/` 58 个 + `automations/benny/skills/` 3 个）。

## root 判定

README 的 `get started` 段（`README.md:114-123`）只声明三个入口：

1. `/setup-pstack`（README.md:118）
2. `/poteto-mode`（README.md:119）
3. `/poteto-help`（README.md:121）

README 其余 `./skills/...` 链接（技能表 `README.md:205-240` 等）登记为 `entry-declaration` 结构边，不作为 root。把全部链接当 root 会得到 34 个假 root。

## frontmatter 双机制

- `disable-model-invocation: true`：61 个技能里 60 个设置；唯一例外 `setup-pstack`。
- `paths: ["**/*.ts", "**/*.tsx"]`：仅 `typescript-best-practices` 设置（文件范围自动加载，仍禁模型自动调用）。

## 边类型与计数（全部边 442 条）

| 类型 | 条数 | 含义 |
| --- | --- | --- |
| asset-reference | 103 | 正文引用正文/脚本/模板等资产文件 |
| help-recommendation | 79 | poteto-help 向用户推荐 + 给可发送的提示词 |
| playbook-instruction | 60 | playbook 正文指令调用技能 |
| entry-declaration | 50 | README/benny README 链接声明 |
| body-instruction | 41 | 技能正文指令调用其他技能 |
| principle-naming-rule | 24 | poteto-mode 按 `principle-<title>` 命名规则引用 |
| playbook-dispatch | 23 | poteto-mode 把任务归到某份 playbook |
| slash-invocation | 20 | `/技能名` 执行调用 |
| readme-dependency | 16 | README「Also install」依赖表 |
| trigger-route | 11 | poteto-mode Non-negotiables 触发器路由 |
| shared-dependency-declaration | 8 | FOR_AGENTS.md 声明共享依赖 |
| path-reference | 4 | 相对路径引用 SKILL.md |
| automation-instruction | 3 | FOR_AGENTS.md 指示读 benny 三个技能文件 |

## 执行边（179 条，7 种类型）

执行边类型：`slash-invocation`、`body-instruction`、`trigger-route`、`playbook-dispatch`、`playbook-instruction`、`principle-naming-rule`、`named-skill-reference`（0 条，最终未触发该类）。

合并后 145 对。代表性 poteto-mode 触发器边（poteto-mode/SKILL.md:20-37）：

- how（L20）、architect（L23）、swarm（L24）、arena（L24）、interrogate（L25）、unslop（L27）、technical-writing（L28）、no-comments（L30）、benchmark-checklist（L32）、show-me-your-work（L37）
- principle-model-the-domain（L22）

poteto-mode 24 条 principle 命名规则边来自 `poteto-mode/SKILL.md:41-80` 的 Principles 清单：每个标题（如 `Laziness Protocol`）转 kebab-case 后加 `principle-` 前缀；个别行用显式括号 slug（如 `(principle-sequence-verifiable-units)`，L69）。

## 可达性（按执行边重算）

- 从三个 root（poteto-mode、poteto-help、setup-pstack）经执行边可达 **47** 个技能。
- poteto-help 执行出边 0 条；它的 79 条斜杠提及是推荐关系（`help-recommendation`），正文 `poteto-help/SKILL.md:9` 明文「Answer the user's question... hand them a prompt they can send」，`:64` 明文「Read the skill before you recommend it, and give one example prompt」——不是替用户开工。
- 11 个功能技能只能由用户直接点名：automate-me、blast-radius、correct、in-your-own-words、ketchup-video、make-bot-ui、recall、reflect、sharpen、teach、typescript-best-practices。
- benny 三个自动化技能从 `automations/benny/FOR_AGENTS.md` 进入（automation-instruction 边，行 65/87），主图不可达，符合 `automations/benny/README.md:5`「the files in this directory are dormant setup and automation sources. they do not appear as slash skills」与 `FOR_AGENTS.md:31`「its SKILL.md files are direct automation instructions, not registered plugin skills」。

## README/正文矛盾

`README.md:46-48` 自述一批技能「don't call other pstack skills」：unslop、bro、how、tdd、typescript-best-practices、arena、swarm、interrogate、reflect、show-me-your-work、figure-it-out、automate-me、correct、benchmark-checklist、in-your-own-words、sharpen、statechart。

正文执行边与之矛盾的有：

- why → how（`why/SKILL.md:9`）
- architect → how（`architect/SKILL.md:23`）
- blast-radius → how/why/arena/unslop（`blast-radius/SKILL.md:11,38,48`）
- ketchup → bro（`ketchup/SKILL.md:11`）
- ketchup-video → ketchup（`ketchup-video/SKILL.md:3,9`）

`README.md:52-64` 的「Also install」依赖表与此一致，以正文为准。

## playbook 覆盖

`skills/poteto-mode/playbooks/` 共 23 个 `.md`。

无技能出边的 7 个：orchestrate、autopilot-stack、babysit、pause-safely、visual-parity、authoring-a-skill、runtime-forensics。

有技能出边的 16 个的下游（行号取部分代表边）：

- bug-fix → how/why（L8）、architect（L8,9）、tdd（L11）
- feature → how（L5）、architect（L6）、arena/principle-model-the-domain（L12）、interrogate（L16）
- investigation → how/why（L7）、how（L9）、unslop（L10）、architect（L12）
- refactoring → figure-it-out（L5）、how（L7）、architect（L9）+ 8 条 principle（L8-13）
- perf-issue → benchmark-checklist（L5）、how（L6）、architect（L17）
- hillclimb → how（L7）、benchmark-checklist（L8）、show-me-your-work（L9）
- multi-phase-plan → technical-writing/unslop（L9）、swarm（L13,65）、no-comments（L59）
- opening-a-pr → no-comments/technical-writing/unslop（L9,34）、poteto-mode（L11）
- autopilot-full → no-comments（L10）、show-me-your-work（L12）、swarm（L14）、ketchup（L22,25）
- autonomous-run → show-me-your-work（L10）
- eval → arena（L7,20,21）
- prototype → architect（L12）
- shipping → why（L9）
- session-pickup → principle-guard-the-context-window（L5）、principle-prove-it-works（L9）
- trace-forensics → principle-guard-the-context-window（L7）
- worktree-cleanup → principle-build-the-lever/principle-encode-lessons-in-structure（L3）、principle-prove-it-works（L4）、principle-guard-the-context-window（L5）

## 安装核对

`~/.agents/.skill-lock.json` 顶层键：version、skills、dismissed、lastSelectedAgents。`skills` 是 name → entry 映射，共 155 条。

`source == backnotprop/pstack` 条目 56 条，按 `skillPath` 末级目录匹配 `~/.agents/skills/`，56/56 全部命中；56 条的 lock key 与 skillPath 末级目录名一致（无显示名/slug 分离案例）。

- 未安装且因同名遮蔽：`tdd`、`teach`（本机 `~/.agents/skills/tdd`、`teach` 来自 `mattpocock/skills`；pstack 版 SKILL.md 内容与 mattpocock 版完全不同——pstack 的 tdd frontmatter 有 `disable-model-invocation: true` 与「Skip when the test path is unclear, expensive, integration-heavy, or not requested」描述）
- 未安装且按设计：`setup-benny`、`triage-issue-reports`、`reproduce-and-fix-issues`（benny 自动化，不进用户 skill 目录）
- 已装的 56 个 SKILL.md 与 commit 25abb38 逐字节一致
- tdd lock 条目示例 key：`{'source': 'mattpocock/skills', 'sourceType': 'github', 'skillPath': 'skills/engineering/tdd/SKILL.md', 'installedAt': '2026-06-18T23:46:40.486Z', 'updatedAt': '2026-10-27T13:34:53.018Z'}`
- teach lock 条目示例 key：`{'source': 'mattpocock/skills', 'sourceType': 'github', 'skillPath': 'skills/productivity/teach/SKILL.md', 'installedAt': '2026-07-05T14:33:58.686Z', 'updatedAt': '2026-10-27T13:34:53.019Z'}`

## 抽取消歧的三个关键点

1. **principle 引用是命名规则，非文件链接**。`poteto-mode/SKILL.md:41` 原文「Each leaf is the **principle-<title>** skill, with the title in kebab case, hyphens kept and other punctuation dropped, unless the entry gives its name.」多数行只有标题（如 `- **Outcome-Oriented Execution.**`，L51 → `principle-outcome-oriented-execution`）；少数行显式带括号 slug（如 `- **Sequence Work into Verifiable Units** (**principle-sequence-verifiable-units**)`，L69）。抽取需两条正则。
2. **poteto-help 的斜杠提及不是执行调用**。79 条 `help-recommendation` 的语义是「回答问题、给一段可以发出去的提示词、停」。它从执行图把它摘出去后，可达性从虚高的 58 修正为 47。
3. **root 只有 get started 段的三个**。README 其他链接（技能表等）是文档结构，不是入口声明。

## 证据边界

- 结论绑定 commit 25abb38；仓库变化需重跑抽取。
- 层级是文档指令的重建模型，未做运行时路由探测。
- poteto-help 的 33 个 read/recommend 目标是中文转述的上限口径，与 79 条边为合并后的对数（同对多条边合并 counted once 时为 33 对）。
