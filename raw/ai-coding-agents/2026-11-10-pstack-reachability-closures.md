# pstack 本机 57 个技能的可达性闭包：四种口径与各自结果

> Source: 本机 `~/.agents/.skill-lock.json`（source == backnotprop/pstack）与 `~/.agents/skills/*/SKILL.md`、`poteto-mode/playbooks/*.md`、各 skill 的 `references/` 全量扫描, 2026-11-10
> Collected: 2026-11-10
> Published: Unknown

## 语料范围

复核日期 2026-11-10，语料取自当日本机安装状态。

| 项 | 数值 |
| --- | --- |
| 技能数（`source == backnotprop/pstack`） | 57 |
| 纳入扫描的 markdown 文件 | 143 |

143 个文件由 57 个 `SKILL.md`、`poteto-mode/playbooks/` 下 23 本、各 skill 的 `references/` 与 `feature-map-example/` 组成。扫描只覆盖这 57 个技能自己的目录，不含宿主可能另存的路由索引。

## 四种口径的定义

| 口径 | 边集 | 含义 |
| --- | --- | --- |
| A1 严格执行派发 | `t`（触发与路由）+ `b`（正文调用） | 根明确要求运行目标技能 |
| A2 加条件派发 | A1 + `poteto-mode` 对 24 条判例的按条件点名 | 判例按触发条件被派发 |
| C 任何提及，排除 help | 任一文件中出现 `/name`、`` `name` ``、`**name**`、`../name/SKILL.md`、`the name skill`；判例另按显示名归一化匹配；不取 `poteto-help` 的出边 | 任何正文提到即算 |
| B 任何提及，含 help | 同 C，含 `poteto-help` 的出边 | 含根的路由表 |

根固定为 `poteto-mode`、`poteto-help`、`setup-pstack`。闭包按有向图从三个根做可达性遍历。

## 四档结果

| 口径 | 可达 | 不可达 | 不可达成员 |
| --- | --- | --- | --- |
| A1 | 36 | 21 | 10 个用户直呼技能 + 11 条判例 |
| A2 | 48 | 9 | automate-me、blast-radius、correct、ketchup-video、make-bot-ui、recall、reflect、sharpen、teach |
| C | 49 | 8 | automate-me、blast-radius、correct、ketchup-video、make-bot-ui、recall、sharpen、teach |
| B | 57 | 0 | 无 |

A1 与 A2 的差额是 11 条判例加 `typescript-best-practices`：判例在 A1 里没有入边，`typescript-best-practices` 靠判例的指针进入 A2。A2 与 C 的差额只有 `reflect`。C 与 B 的差额是 8 个：`poteto-help` 的路由表把它们全部指名。

## 判例的 24 条触发条件

`poteto-mode/SKILL.md` 第 41–81 行共 24 条 `- **` 条目，每条都以触发情形开头：

| 行 | 显示名 | 触发情形（首句） | 对应 skill |
| --- | --- | --- | --- |
| 45 | Laziness Protocol | Refactoring, sizing a diff, or tempted to add abstractions, layers, or signal threading. | principle-laziness-protocol |
| 46 | Foundational Thinking | Before writing logic: core types and data structures, scaffold-vs-feature sequencing, what concurrent actors share. | principle-foundational-thinking |
| 47 | Redesign from First Principles | Integrating a new requirement into an existing design. | principle-redesign-from-first-principles |
| 48 | Attack the Premise | Two or more fixes that share one premise have failed the same gate. | principle-attack-the-premise |
| 49 | Subtract Before You Add | Sequencing an addition, refactor, or rewrite. | principle-subtract-before-you-add |
| 50 | Minimize Reader Load | Reviewing or shaping code that's hard to trace. | principle-minimize-reader-load |
| 51 | Outcome-Oriented Execution | Planned rewrites and migrations with explicit phase boundaries. | principle-outcome-oriented-execution |
| 52 | Experience First | Product, UX, or feature-scope tradeoffs. | principle-experience-first |
| 53 | Exhaust the Design Space | A novel interaction or architectural decision with no precedent. | principle-exhaust-the-design-space |
| 54 | Build the Lever | Any non-trivial work. | principle-build-the-lever |
| 58 | Model the Domain | Writing stateful logic, or code that branches a lot or repeats a shape assumption across files. | principle-model-the-domain |
| 59 | Boundary Discipline | Wiring validation, error handling, or framework adapters. | principle-boundary-discipline |
| 60 | Type System Discipline | Designing types or a signature in any typed language. | principle-type-system-discipline |
| 61 | Make Operations Idempotent | Designing commands, lifecycle steps, or loops that run amid crashes and retries. | principle-make-operations-idempotent |
| 62 | Migrate Callers Then Delete Legacy APIs | Introducing a new internal API while old callers exist. | principle-migrate-callers-then-delete-legacy-apis |
| 63 | Separate Before Serializing Shared State | Concurrent actors might write the same file, branch, key, or object. | principle-separate-before-serializing-shared-state |
| 67 | Prove It Works | After a task, before declaring done. | principle-prove-it-works |
| 68 | Fix Root Causes | Debugging. | principle-fix-root-causes |
| 69 | Sequence Work into Verifiable Units | Multi-step work (sweeps, migrations, runs of similar edits) and how you stack commits and PRs. | principle-sequence-verifiable-units |
| 70 | Test Behavior, Not Implementation | Writing, changing, or keeping a test. | principle-test-behavior-not-implementation |
| 71 | Explain the Number | Apply before you measure, and before you trust, report, or act on a number you measured. | principle-explain-the-number |
| 75 | Guard the Context Window | Context fills up: large outputs, long files, repeated reads, fan-out planning. | principle-guard-the-context-window |
| 76 | Never Block on the Human | Tempted to ask "should I do X?" on reversible work. | principle-never-block-on-the-human |
| 80 | Encode Lessons in Structure | You catch yourself writing the same instruction a second time. | principle-encode-lessons-in-structure |

## 两处「可发现但不派发」

**reflect**

`poteto-mode/SKILL.md:94`：

> **Use `subagent_type: "poteto-agent"` for any subagent you spawn inside a playbook step** (code-writing delegates, ad-hoc helpers). The chat that receives `/poteto-mode` runs the playbook. Never spawn a `poteto-agent` to run the playbook itself. Routed workflow skills (`how`, `why`, `interrogate`, `reflect`, `swarm`) set their own `subagent_type` for diverse-model review. Respect what the skill prescribes, don't override to `poteto-agent`.

这句把 `reflect` 与 how、why、interrogate、swarm 并列为「Routed workflow skills」，但上下文只谈子代理类型与模型默认值，全文没有一处要求运行 `reflect`。因此在 A2 里它不可达，在 C 里可达。

**typescript-best-practices**

`principle-type-system-discipline/SKILL.md:9`：

> Make the compiler reject impossible states, mismatched primitives, and unhandled variants. Prefer defining errors and special cases out of existence over proliferating handlers. For TypeScript syntax, see the `typescript-best-practices` skill.

`typescript-best-practices/SKILL.md:4-5` 的 frontmatter：

```yaml
paths: ["**/*.ts", "**/*.tsx"]
disable-model-invocation: true
```

它同时有判例层指针与路径匹配两条发现路径，10 个用户直呼技能里只有它带 `paths`。其余 9 个的 frontmatter 里 `paths`、`globs`、`alwaysApply` 三个字段都没有。

## 归一化前后的差异

第一版扫描把 `Outcome-Oriented Execution` 与 `Test Behavior, Not Implementation` 判为不可达。原因在匹配模式：显示名按 kebab slug 换成空格后拼成 `outcome oriented execution`，原文带连字符；`test behavior not implementation` 少了原文里的逗号。

把所有非字母数字压成空格后重扫，24 条判例全部命中，B 口径的不可达数从 2 降为 0。

## 边界

- 闭包按文档指令重建，未做运行时路由探测；实际触发取决于宿主与任务。
- 只在 57 个技能目录内计算。宿主若另存路由清单，那一份不在本轮证据里。
- 判例的「可达」指按条件被派发，不含模型自行选择阅读 Principles 清单的情形。
- `poteto-help` 的路由表性质是替用户指路：`poteto-help/SKILL.md:64`「Name a skill directly when the user wants more or less of something than the playbook gives」，第 66–101 行是那张表。把它算作可达边，结论就是「任何提及口径下 57 个全部可达」；不算，结论就是 8 个不可达。
