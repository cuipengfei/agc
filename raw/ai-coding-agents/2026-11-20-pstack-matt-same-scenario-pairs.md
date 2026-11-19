# pstack 与 mattpocock/skills 的同场景配对：frontmatter 与 description 摘录（2026-11-20）

> Source: 本机 `~/.agents/skills/`（skills lock 安装副本）frontmatter 逐个读取，2026-11-20
> Collected: 2026-11-20
> Published: Unknown

## 锁文件计数

```
$ python3 -c "...agents/skill-lock.json skills 计数..."
total 156
backnotprop/pstack 57
mattpocock/skills 30
```

## 原则的调用方式（poteto-help 原文）

`poteto-help/SKILL.md`（Principles 段）：

```
Principles are one-rule skills that `/poteto-mode` reads and cites in its replies. The user rarely invokes one. They steer with the names instead, as in "apply prove it works. show me the real output." Typing `/principle-<name>` still loads one on demand. [Guide page 8](../../docs/guide/08-principles.md) lists them.
```

`poteto-help/SKILL.md`（Fix a run that went wrong 表）：

```
| A skill didn't load on its own | Only `/setup-pstack` loads from the user's words. The others load when the user types them or when `/poteto-mode` runs them, and it doesn't run every skill. |
```

## 配对技能的 frontmatter 逐字摘录

### 入口

```
===== poteto-help =====
name: poteto-help
description: Guides users through pstack setup, /poteto-mode, and picking the skill, playbook, or principle for a task. Type /poteto-help with a question.
disable-model-invocation: true
===== ask-matt =====
name: ask-matt
description: Ask which skill or flow fits your situation. A router over the skills in this repo.
disable-model-invocation: true
```

### 跨会话接力

```
===== recall (pstack) =====
name: recall
description: "Reconstruct your recent working context from your own chat history, live state, and the shared record (user reports, prior fixes, incidents), then hand back a tight current-state brief. Use for 'recall my work on X', 'catch me up', 'what have I been working on', 'where did I leave off', before starting or resuming work."
disable-model-invocation: true
===== handoff (matt) =====
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
```

### 查清楚技术事实

```
===== how (pstack) =====
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
disable-model-invocation: true
===== why (pstack) =====
name: why
description: "Use for 'why does X work this way', 'why we picked Y', design rationale, regressions, postmortems, or data-backed thresholds. Returns a cited read on decisions and tradeoffs. Use how for runtime behavior."
disable-model-invocation: true
===== research (matt) =====
name: research
description: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.
```

research 的 frontmatter 无 `disable-model-invocation` 行。

### 教学（同名遮蔽）

```
===== teach（本机已装，pstack 版） =====
name: teach
description: "Explain a body of work plainly so a person actually understands it. Runs the `how` and `why` skills and weaves what they find into one clear explanation. Use for 'teach me this', 'help me really understand X', 'explain this change or subsystem to me'."
disable-model-invocation: true
```

mattpocock 版 `teach` 本机未安装（同名目录被 pstack 版占用）；两版差异记录见 raw/ai-coding-agents/2026-11-07-tdd-teach-dual-repo-versions.md。

### 磨想法与提示词

```
===== sharpen (pstack) =====
name: sharpen
description: "Make a task deeper, not bigger, then rewrite the prompt. Use for /sharpen."
disable-model-invocation: true
===== grilling (matt) =====
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
===== grill-me (matt) =====
name: grill-me
description: A relentless interview to sharpen a plan or design.
disable-model-invocation: true
===== grill-with-docs (matt) =====
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go.
disable-model-invocation: true
```

grilling 的 frontmatter 无 `disable-model-invocation` 行。

### 计划与任务票

```
===== figure-it-out (pstack) =====
name: figure-it-out
description: "Design an auditable playbook when no narrower one fits: a large migration, an ambitious multi-part change, or work a human reviews after stepping away. Scales rigor to the task, runs a hypothesis loop, and logs decisions. Use for /figure-it-out or 'figure it out'."
disable-model-invocation: true
===== to-spec (matt) =====
name: to-spec
description: "Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of what you've already discussed."
disable-model-invocation: true
===== to-tickets (matt) =====
name: to-tickets
description: Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker (edges as text in one file per ticket locally, or native blocking links on a real tracker).
disable-model-invocation: true
===== wayfinder (matt) =====
name: wayfinder
description: Plan a huge chunk of work (more than one agent session can hold) as a shared map of decision tickets on your issue tracker, and resolve them one at a time until the way to the destination is clear.
disable-model-invocation: true
```

### 设计与原型

```
===== architect (pstack) =====
name: architect
description: "Sketch types, signatures, and module structure before code, then stay in the loop while implementation fills in. Use for /architect, 'architect this', 'design this', or non-trivial work where jumping to code would lock in the wrong shape."
disable-model-invocation: true
===== codebase-design (matt) =====
name: codebase-design
description: Shared vocabulary for designing deep modules. Use when the user wants to design or improve a module's interface, find deepening opportunities, decide where a seam goes, make code more testable or AI-navigable, or when another skill needs the deep-module vocabulary.
===== domain-modeling (matt) =====
name: domain-modeling
description: Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing a GLOSSARY.md, or recording or editing an ADR.
===== improve-codebase-architecture (matt) =====
name: improve-codebase-architecture
description: Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick.
disable-model-invocation: true
===== prototype (matt) =====
name: prototype
description: Build a throwaway prototype to answer a design question. Use when the user wants to sanity-check whether a state model or logic feels right, or explore what a UI should look like.
===== principle-exhaust-the-design-space (pstack) =====
name: principle-exhaust-the-design-space
description: "Apply when facing a novel UI interaction or architectural decision with no precedent in the codebase. Build 2-3 competing prototypes and compare side by side before committing."
disable-model-invocation: true
===== arena (pstack) =====
name: arena
description: "Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape."
disable-model-invocation: true
```

codebase-design、domain-modeling、prototype 的 frontmatter 无 `disable-model-invocation` 行。

### 测试（同名遮蔽）

```
===== tdd（本机已装，mattpocock 版） =====
name: tdd
description: Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.
```

tdd 的 frontmatter 无 `disable-model-invocation` 行。pstack 版 `tdd` 本机未安装；两版差异记录见 raw/ai-coding-agents/2026-11-07-tdd-teach-dual-repo-versions.md。

### 并行实现

```
===== swarm (pstack) =====
name: swarm
description: "Fan out N parallel workers, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
disable-model-invocation: true
===== poteto-mode (pstack) =====
name: poteto-mode
description: poteto's agent style for concise, detailed responses, deliberate subagents, unslopped prose, simple code, and verified work. Use for poteto, /poteto-mode, or requests to work in this style.
disable-model-invocation: true
===== implement-spec (matt) =====
name: implement-spec
description: "Implement the result of /to-spec and /to-tickets in code."
disable-model-invocation: true
===== loop-me (matt) =====
name: loop-me
description: Grill me about specs for the workflows I want to build, within this workspace.
argument-hint: "A workflow to design, or nothing to go find one"
disable-model-invocation: true
```

### 排查与修 Bug

```
===== principle-fix-root-causes (pstack) =====
name: principle-fix-root-causes
description: "Apply when debugging. Trace each symptom back to the first place the system went wrong and fix it there. A guard is a fix only when the state it handles is legitimate."
disable-model-invocation: true
===== principle-attack-the-premise (pstack) =====
name: principle-attack-the-premise
description: "Apply when two or more fixes that share one premise have failed the same gate. Write the premise down and test it directly before you write another fix that assumes it."
disable-model-invocation: true
===== diagnosing-bugs (matt) =====
name: diagnosing-bugs
description: Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken/throwing/failing/slow.
===== triage (matt) =====
name: triage
description: Move issues and external PRs through a state machine of triage roles, categorise, verify, grill if needed, and write agent-ready briefs.
disable-model-invocation: true
```

diagnosing-bugs 的 frontmatter 无 `disable-model-invocation` 行。

### 审查

```
===== interrogate (pstack) =====
name: interrogate
description: "Use for \"interrogate\", \"adversarial review\", \"multi-model review\", \"challenge this\", \"stress test this code\", \"find blind spots\", or \"tear this apart\". Adversaries try to break a change or design, and only findings proven by a run survive."
disable-model-invocation: true
===== no-comments (pstack) =====
name: no-comments
description: "Spawn Comment Sicko, fix accepted findings, and offer encodings for claimed constraints."
disable-model-invocation: true
===== code-review (matt) =====
name: code-review
description: "Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes: Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/spec asked for?). Runs both reviews in parallel sub-agents and reports them side by side. Use when the user wants to review a branch, a PR, work-in-progress changes, or asks to \"review since X\"."
```

code-review 的 frontmatter 无 `disable-model-invocation` 行。

### 长跑与账本

```
===== principle-never-block-on-the-human (pstack) =====
name: principle-never-block-on-the-human
description: "Apply when tempted to ask 'should I do X?' on reversible work."
disable-model-invocation: true
===== show-me-your-work (pstack) =====
name: show-me-your-work
description: "Keep a reviewable decision trail for long-running or unattended work: a TSV log with one row per decision (what, why, evidence, result). Local by default; commit it when a reviewer needs the trail to trust the result. Use for /show-me-your-work, autonomous or multi-phase runs, or work a human reviews after stepping away."
disable-model-invocation: true
```

### 复盘与沉淀

```
===== correct (pstack) =====
name: correct
description: "Find the mistakes agents keep repeating in this repo and make each one impossible. Try architecture first, then types, then a lint whose error names the fix, then a test, and write docs last. Prove each check fails on a real past mistake. Repeat this each time the operator corrects you. Use for /correct."
disable-model-invocation: true
===== reflect (pstack) =====
name: reflect
description: Mine the active transcript for durable learnings and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
===== automate-me (pstack) =====
name: automate-me
description: "Use for \"automate me\", \"create/update/refresh my -mode skill\", \"turn/capture my preferences or working style into a skill\", or wanting agents to follow how the user works. Drafts or revises a personal -mode skill via create-skill + unslop, optionally pulling fresh evidence from recent transcripts."
disable-model-invocation: true
===== retro (matt) =====
name: retro
description: "Conduct a retrospective on a coding session."
disable-model-invocation: true
===== writing-for-agents (matt) =====
name: writing-for-agents
description: Writing documents for agents. Use when creating or editing skills, or modifying AGENTS.md or CLAUDE.md.
```

writing-for-agents 的 frontmatter 无 `disable-model-invocation` 行。

### matt 侧自动触发的其余技能（佐证 11 个计数）

```
===== pr =====
name: pr
description: "Use when writing a PR body."
===== wizard =====
name: wizard
description: Generate an interactive bash wizard that walks a human through steps only they can perform. Use when provisioning infrastructure, setting up credentials or CI secrets, walking an unfamiliar third-party dashboard, or running a one-off migration or cutover. Don't invoke this for steps the agent can perform itself.
```

pr 与 wizard 的 frontmatter 均无 `disable-model-invocation` 行。连同上文 codebase-design、domain-modeling、prototype、tdd、diagnosing-bugs、code-review、grilling、research、writing-for-agents，mattpocock 版共 11 个技能无该行（加上本段即为完整清单）。

### pstack 侧唯一无 disable 行的技能

```
===== setup-pstack =====
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Detects your available models and writes an always-applied rule that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
```

setup-pstack 的 frontmatter 无 `disable-model-invocation` 行。

### typescript-best-practices（宿主按 paths 加载）

```
===== typescript-best-practices =====
name: typescript-best-practices
description: TypeScript best practices. Use when reading or editing any .ts or .tsx file.
paths: ["**/*.ts", "**/*.tsx"]
disable-model-invocation: true
```

## 边界

- 本文件只记录 frontmatter 与 description 逐字内容；触发档位的分类（自动/手调、`/poteto-mode` 内部调、宿主按 paths 加载、纯手调）是从这些字段与 poteto-help 原文推出的机制判断，未做运行时加载探测。
- `grilling` 与 `grill-me` 的正文在早前核对中确认逐字相同（记录见 raw/ai-coding-agents/2026-10-05-mattpocock-skills-readme.md 系列），本文件不重复正文。
- 被同名遮蔽的 pstack 版 `tdd` 与 mattpocock 版 `teach` 不在本机磁盘上，本文件不含它们的 frontmatter；差异见 2026-11-07 的四份 SKILL.md 全文 raw。
