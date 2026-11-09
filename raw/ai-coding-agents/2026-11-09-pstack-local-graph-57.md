# pstack 本机 57 个技能：分层、边表与可达性核对

> Source: 本机 `~/.agents/.skill-lock.json`（source == backnotprop/pstack）与 `~/.agents/skills/*/SKILL.md`、`~/.agents/skills/poteto-mode/playbooks/*.md` 的 grep 输出；正文绑定 backnotprop/pstack commit 25abb38, 2026-11-09
> Collected: 2026-11-09
> Published: Unknown

## 清单来源

```bash
python3 -c "import json,pathlib;s=json.loads((pathlib.Path.home()/'.agents/.skill-lock.json').read_text())['skills'];ps=sorted(k for k,v in s.items() if v.get('source')=='backnotprop/pstack');print(len(ps));print(' '.join(ps))"
```

输出 `57`，名单：

```text
architect arena automate-me benchmark-checklist blast-radius bro correct
create-formal-verification-skill create-verification-skill figure-it-out how
in-your-own-words interrogate ketchup ketchup-video maintain-formal-verification-skill
maintain-verification-skill make-bot-ui no-comments poteto-help poteto-mode
principle-attack-the-premise principle-boundary-discipline principle-build-the-lever
principle-encode-lessons-in-structure principle-exhaust-the-design-space
principle-experience-first principle-explain-the-number principle-fix-root-causes
principle-foundational-thinking principle-guard-the-context-window
principle-laziness-protocol principle-make-operations-idempotent
principle-migrate-callers-then-delete-legacy-apis principle-minimize-reader-load
principle-model-the-domain principle-never-block-on-the-human
principle-outcome-oriented-execution principle-prove-it-works
principle-redesign-from-first-principles principle-separate-before-serializing-shared-state
principle-sequence-verifiable-units principle-subtract-before-you-add
principle-test-behavior-not-implementation principle-type-system-discipline
recall reflect setup-pstack sharpen statechart swarm teach technical-writing
typescript-best-practices unslop why
```

与仓库 58 个注册技能的差额只有一个：`tdd` 未安装，本机该名字被 mattpocock/skills 的版本占用。`teach` 于 2026-11-07 换为 pstack 版本后计入。benny 三个自动化技能不在本机，也不注册为 slash 技能。

## 分层（互斥，57 = 3 + 15 + 5 + 24 + 10）

| 层 | 数量 | 成员 |
| --- | --- | --- |
| 根 | 3 | poteto-mode、poteto-help、setup-pstack |
| 第 1 层（根沿执行边直接调用） | 15 | 经 poteto-mode 13：how、why、architect、arena、swarm、interrogate、unslop、technical-writing、no-comments、benchmark-checklist、show-me-your-work、figure-it-out、ketchup；经 setup-pstack 2：create-verification-skill、create-formal-verification-skill |
| 第 2 层（第 1 层产出的下游） | 5 | bro（←ketchup）、statechart（←create-formal-verification-skill）、maintain-verification-skill（←create-verification-skill）、maintain-formal-verification-skill（←create-formal-verification-skill）、in-your-own-words（←interrogate） |
| 判例叶 | 24 | 全部 principle-*，由 poteto-mode 的 Principles 清单按命名规则引用 |
| 用户直呼（主图不可达） | 10 | recall、reflect、correct、sharpen、automate-me、blast-radius、teach、typescript-best-practices、ketchup-video、make-bot-ui |

## 边表口径

本轮构建脚本内边表共 170 条，生成页 SVG `<line>` 数同为 170，两者相等。

| 类型 | 条数 | 构成 |
| --- | --- | --- |
| t（触发与路由执行边） | 80 | poteto-mode 触发表 13 + setup-pstack 生成链邀请 2 + playbook 下行 65 |
| b（正文调用边） | 23 | skill 正文按名调用另一 skill |
| r（引用、推荐、命名规则） | 67 | poteto-help 推荐 32 + poteto-mode 判例命名 24 + 判例被正文直接引用 11 |

## playbook 覆盖

`~/.agents/skills/poteto-mode/playbooks/` 下共 23 个文件，逐个 grep 结果：

| playbook | 产出的边 | 目标 |
| --- | --- | --- |
| refactoring | 12 | figure-it-out、how、architect、principle-model-the-domain、principle-foundational-thinking、principle-redesign-from-first-principles、principle-subtract-before-you-add、principle-laziness-protocol、principle-migrate-callers-then-delete-legacy-apis、principle-prove-it-works、principle-minimize-reader-load、principle-sequence-verifiable-units |
| multi-phase-plan | 11 | technical-writing、unslop、no-comments、swarm、how、interrogate、show-me-your-work、principle-encode-lessons-in-structure、principle-guard-the-context-window、principle-sequence-verifiable-units、principle-prove-it-works |
| feature | 6 | how、architect、interrogate、principle-model-the-domain、principle-separate-before-serializing-shared-state、principle-sequence-verifiable-units |
| hillclimb | 6 | how、benchmark-checklist、show-me-your-work、principle-build-the-lever、principle-guard-the-context-window、principle-separate-before-serializing-shared-state |
| autopilot-full | 4 | no-comments、show-me-your-work、swarm、ketchup |
| bug-fix | 4 | how、why、architect、principle-sequence-verifiable-units |
| perf-issue | 4 | how、benchmark-checklist、architect、principle-sequence-verifiable-units |
| worktree-cleanup | 4 | principle-build-the-lever、principle-encode-lessons-in-structure、principle-prove-it-works、principle-guard-the-context-window |
| investigation | 3 | how、why、unslop |
| opening-a-pr | 3 | no-comments、technical-writing、unslop |
| session-pickup | 2 | principle-guard-the-context-window、principle-prove-it-works |
| autonomous-run | 1 | show-me-your-work |
| eval | 1 | arena |
| orchestrate | 1 | figure-it-out（仅口径区分：`orchestrate.md:3`「One ambitious run that needs a bespoke workflow is figure-it-out.」，未要求执行调用） |
| prototype | 1 | architect |
| shipping | 1 | why |
| trace-forensics | 1 | principle-guard-the-context-window |

17 本至少提及一个技能名，合计 65 条，指向 26 个不同目标。其中 16 本给出执行调用指令；`orchestrate` 的那一条是口径区分，2026-10-29 的抽取把它记为 playbook-instruction 0 条，本轮边表按「提及即连边」收录，因此两处计数相差 1。

其余 6 本：

| playbook | 情形 |
| --- | --- |
| pause-safely | 只有一处非加粗、非斜杠命令的提及：`pause-safely.md:8`「If a show-me-your-work trail exists, point at it instead of duplicating it」，未计入边表 |
| authoring-a-skill、autopilot-stack、babysit、runtime-forensics、visual-parity | grep 技能名（含 principle-*）无命中，不产出边 |

按调用强度分三档复述：16 本有执行调用指令，1 本（orchestrate）只有口径区分，1 本（pause-safely）只有路名提及，5 本无任何技能名。

## 关键行的原文证据

| 事实 | 证据 |
| --- | --- |
| poteto-mode 的触发表 | `poteto-mode/SKILL.md:22-28`；`:25` 为「Contested design → the **interrogate** skill (multi-model adversarial) before shipping.」 |
| interrogate 要求用 in-your-own-words 陈述意图 | `interrogate/SKILL.md:13`「State the intent with the **in-your-own-words** skill, from the user's message, the commits, and the PR description.」 |
| poteto-help 的推荐表 | `poteto-help/SKILL.md:70-88` 为表格行（每条含 `[`/skill`](../skill/SKILL.md)` 链接），`:107-112` 为技能对照说明；对本地 57 个名字做正则统计得 32 个被提及 |
| playbook 的弱提及 | `poteto-mode/playbooks/pause-safely.md:8` |
| 判例被直接引用 | refactoring 12 条中 8 条为 `principle-*`，见上表；architect 正文另引 6 条、arena 4 条、show-me-your-work 1 条，合 11 条 |

## 与旧结论的冲突

`wiki/ai-coding-agents/pstack-skill-map-and-behaviors.md` 第 35 行把 `in-your-own-words` 列入「11 个只能用户直接点名」。按上表两行原文，它的入口是 `poteto-mode:25` → `interrogate` → `interrogate:13`，属第 2 层。因此该名单应为 10 个，可达数在 58 技能口径下由 47 变为 48，本机 57 技能口径为 47。

## 边界

- 边的存在性有 `file:line` 或 grep 输出支撑；实际触发取决于宿主与任务，未做运行时路由探测。
- 分层是文档指令的重建模型；同一技能可被多处调用，分层取最短可达路径，跨层调用在图里以连线重复出现。
- 绑定本机 2026-11-09 的安装状态与正文 commit 25abb38；仓库后续 commit 需重跑。
- `principle-*` 的 24 条命名边全部来自 poteto-mode 的 Principles 清单，未逐条核对清单与目录是否完全一致。
