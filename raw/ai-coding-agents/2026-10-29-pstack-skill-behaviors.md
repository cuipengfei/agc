# pstack 61 技能正文逐字摘录（backnotprop/pstack@25abb38）

> Source: 本机克隆 https://github.com/backnotprop/pstack（commit 25abb38559ddbabec563646224d09eff9a250eca），`git clone --depth 1` 后逐个读取 SKILL.md
> 摘录性质说明：正文以原文块逐字摘录（保留标点、大小写与 markdown 标记），每块前标注来源文件与行号；行内中文小注是导览说明，原文内容见 `>` 引用块内。摘要式归纳见 wiki 文章，本文件只存原文。
> Collected: 2026-10-29
> Published: Unknown

## 入口三个

### poteto-mode（skills/poteto-mode/SKILL.md）

frontmatter（L1-7）：

```yaml
---
name: poteto-mode
description: poteto's agent style for concise, detailed responses, deliberate subagents, unslopped prose, simple code, and verified work. Use for poteto, /poteto-mode, or requests to work in this style.
disable-model-invocation: true
icon: crown
color: yellow
---
```

Non-negotiables 触发器（L20-25、L27-28、L30、L32、L33、L34、L35、L37）逐字：

> Nontrivial change, architecture decision, or "are we sure?" → the **how** skill.

> Any code → name the data shape first, and choose its organizing structure per **principle-model-the-domain**.

> Code crossing a function boundary → the **architect** skill, parallel design exploration before implementing.

> Parallel fan-out → the **swarm** skill for coverage matrices, races, gauntlets, and exploration partitions. Use **arena** for design or code bakeoffs with base selection and grafting.

> Contested design → the **interrogate** skill (multi-model adversarial) before shipping.

> Any prose surface, your reply to the user included → the **unslop** skill. Write the reply per **Writing the reply**. Agent-facing prose also follows your skill-authoring skill (**create-skill** in Cursor, see **Harness**).

> Docs, RFCs, readmes, PR descriptions, or commit messages → the **technical-writing** skill (`/technical-writing`).

> Before review → the **no-comments** skill (`/no-comments`).

> Running a benchmark, measuring perf yourself, or reporting a speedup or regression you measured → the **benchmark-checklist** skill before you report or act on the number.

> Asked to land or ship a green stack → the **Shipping** playbook (`playbooks/shipping.md`). Green is not safe. Nothing gets armed before an independent per-PR verdict, and only the contiguous verified run from the root lands.

> Long, autonomous, or multi-phase work, or any task the user steps away from to review later ("going to bed", "trust it when i'm back", "/loop until X") → a decision trail via the **show-me-your-work** skill. Commit it when stakes need an auditable record. Keep it local otherwise.

Principles 命名规则（L41）逐字：

> Read the leaf skill in full for any principle you apply. Each entry names when it applies. Each leaf is the **principle-<title>** skill, with the title in kebab case, hyphens kept and other punctuation dropped, unless the entry gives its name.

Autonomy（L84-86、L88、L90）逐字：

> **Just do it.** Use any MCP tool. Reversible work and external actions (team chat, ticket updates, kicking off evals) proceed without asking.

> **Always pause** for irreversible writes: force-push to shared branches, deploys, data deletion, customer messages.

> **Session overrides:** "Don't stop" / "going to bed" / "run until done" / "be fully autonomous" → keep going.

> **No is an acceptable answer.** Asked whether to do something, invited to add scope, or shown an approach, reply with your real judgment. Decline, push back, or say "this doesn't earn its place" when true. A recommendation is a judgment, not a validation. Agreement is not the default, candor over sycophancy.

Subagents 默认（L94、L96 起首段）逐字：

> **Use `subagent_type: "poteto-agent"` for any subagent you spawn inside a playbook step** (code-writing delegates, ad-hoc helpers). The chat that receives `/poteto-mode` runs the playbook. Never spawn a `poteto-agent` to run the playbook itself. Routed workflow skills (`how`, `why`, `interrogate`, `reflect`, `swarm`) set their own `subagent_type` for diverse-model review. Respect what the skill prescribes, don't override to `poteto-agent`.

> **Defaults for every `Task` call.** `run_in_background: true` (a steer or resume of a running agent too, because a foreground call holds your turn while other reports wait), agent mode (readonly strips MCP), file pointers not inlined context, explicit model per role (configurable via `/setup-pstack`. Defaults `grok-4.7-xhigh-fast` for code, `claude-opus-5-5-xhigh` for prose and judgment). Code delegates tier by difficulty.（后续按角色展开到同段 L96 全段）

Playbook 路由（L136 指令、L140-162 路由表逐字首条与兜底）：

> Open a todolist whose first items are the matched playbook's steps, copied in verbatim, before any task-specific todos. A step you choose not to do stays in the list with a one-line `skip: <reason>`. Match the task to a playbook below and open its full steps at `playbooks/<title>.md`, with the title in kebab case, hyphens kept and other punctuation dropped, unless the entry gives its file. Copy its steps in verbatim.

> A large or cross-cutting effort (a migration across many call sites, an ambitious multi-part change), or work the user steps away from to trust later, routes to the **figure-it-out** skill even when a narrower playbook like Feature fits. Use **figure-it-out** whenever no bundled playbook fits. It designs a bespoke, rigorous playbook for the task. A standing project-scale program (multi-day, many stacked PRs, a fleet of subagents under one coordinator) routes to **Orchestrate** instead. figure-it-out designs one bespoke run, orchestrate runs the program.

> - **Investigation.** Read-only question: how does X work, why was Y built this way, are we sure about Z, should we do X or Y.
> - **Bug fix.** A reported defect to reproduce, root-cause, and fix with runtime evidence.
> - **Perf issue.** A measured slowness to trace and improve against a baseline.
> - **Hillclimb.** Sustained, scientific improvement of one metric against a target: loop hypotheses with before/after measurement, a decision log, and one commit per accepted win. Distinct from Perf issue, which is a one-off fix.
> - **Runtime forensics.** Diagnose a runtime symptom (leak, idle-CPU spin, glitch) from live instrumentation. The deliverable is a diagnosis, not a fix.
> - **Trace forensics.** Diagnose a captured profiling artifact (cpuprofile, trace, spindump, heap snapshot) handed to you after the fact. The deliverable is a diagnosis, not a fix.
> - **Feature.** New or changed behavior, built from a named data shape.
> - **Refactoring.** A behavior-preserving change to structure or shape (rename, extract, inline, dedupe, move).
> - **Prototype.** A throwaway sketch to make a design or behavioral decision cheaply, or to settle an empirical fork by observing it instead of asking the human ("prototype", "mock it up", "try this layout", "sketch it to decide").
> - **Visual parity.** Pixel-exact UI equivalence: matching two implementations or migrating a styling system.
> - **Authoring or modifying a skill.** Writing or editing a SKILL.md. File: `playbooks/authoring-a-skill.md`.
> - **Eval.** Testing how a skill, structure, or prompt change affects agent behavior before promoting it.
> - **Babysit.** Driving a PR or a stack to merge-ready: conflicts, review threads, CI.
> - **Shipping.** The half after Babysit. Independently verifying a green stack, then landing the contiguous verified run bottom-up through `gh` by default or Origin when its CLI is available.
> - **Autonomous run.** A long task to drive to completion without stopping ("run until done", "/loop until X").
> - **Orchestrate.** A standing project handed to one coordinator chat: multi-day, many stacked PRs, dozens to hundreds of subagents, minimal human turns ("run this whole project", "own this migration until it lands"). Distinct from Autonomous run, which drives one task to a predicate. Work one agent could finish inside the session's budget routes there, not here, however program-shaped the phrasing sounds.
> - **Autopilot-full.** A queue of independent PRs run to merged with full autonomy. One owner per PR carries build through merge, and the root swarm-verifies each PR before its owner merges ("autopilot this queue", "full autopilot", one-owner-per-PR programs).
> - **Autopilot-stack.** Autopilot-full without the merge. A queue of PRs built and verified with full autonomy, then handed to the operator to land. A PR stacks only on a PR it builds on ("autopilot-stack", "autopilot, don't merge", "stack them, don't ship", "build the stack, I'll land it").
> - **Session pickup.** Resuming or taking over a prior agent's in-flight work from a transcript, cloud-agent URL, or pushed branch.
> - **Pause safely.** Suspending in-flight work cleanly so it can be resumed, on an explicit pause, going offline, a Cursor or harness restart, or imminent context compaction. The complement to Session pickup.
> - **Multi-phase or multi-PR plan.** Work that spans phases or stacked PRs. File: `playbooks/multi-phase-plan.md`.
> - **Worktree and simulator cleanup.** Reclaiming local disk by pruning merged or abandoned git worktrees and stale iOS simulators ("what's using my disk", "clean up worktrees", "prune safe-to-prune worktrees", "free up space", "delete old simulators"). File: `playbooks/worktree-cleanup.md`.
> - **Opening a PR.** Invoked at the end of every other playbook.

模型默认（L96 内配到角色的段落）节选逐字：

> Defaults `grok-4.7-xhigh-fast` for code, `claude-opus-5-5-xhigh` for prose and judgment

> Verification is the exception and stays on the `swarm workers` model and speed (`grok-4.7-xhigh-fast` by default).

### poteto-help（skills/poteto-help/SKILL.md）

frontmatter（L2-4）：

```yaml
name: poteto-help
description: Guides users through pstack setup, /poteto-mode, and picking the skill, playbook, or principle for a task. Type /poteto-help with a question.
disable-model-invocation: true
```

开头行为（L9、L11）逐字：

> Answer the user's question about pstack, hand them a prompt they can send, and link the file the answer came from. For a help question, don't start the work. The user asked how, and a pstack run spends real tokens, so let them send the prompt.

> A message that asks for work, such as "use pstack to fix this bug", is not a help question. Read [`poteto-mode`](../poteto-mode/SKILL.md), do the work under it, and mention once that a Custom Mode keeps it on.

推荐前先读（L64）逐字：

> The default answer is `/poteto-mode`, which runs most of the others when its steps need them. Name a skill directly when the user wants more or less of something than the playbook gives. Read the skill before you recommend it, and give one example prompt.

### setup-pstack（skills/setup-pstack/SKILL.md）

frontmatter（L2-3，无 disable-model-invocation）：

```yaml
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Detects your available models and writes an always-applied rule that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
```

目标文件（L10-12）逐字：

> - **Cursor:** `~/.cursor/rules/pstack-models.mdc`, an always-applied rule.
> - **Claude Code:** `~/.claude/rules/pstack-models.md`. Claude Code loads every file in `~/.claude/rules/` into each new session.
> - **Every other harness** (Codex, Pi, OpenCode, and others): `~/.agents/pstack-models.md`. These harnesses don't load it on their own, so pstack skills read this file when they pick a model.

预算四档（L30-33）逐字：

> - `unlimited — max reasoning`
> - `large — xhigh reasoning`
> - `medium — high reasoning`
> - `small — medium reasoning`

可选生成（L80、L84）逐字：

> Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, invoke `/create-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.

> Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, invoke `/create-formal-verification-skill` (resolves wherever pstack is installed: workspace, user, or plugin). On no, move on without pushing.

## 理解四

### how（skills/how/SKILL.md）

frontmatter description（L3）：

```yaml
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
```

角色与模型行（L11）逐字（段首）：

> Every spawn is a Task subagent with `subagent_type: generalPurpose` and `readonly: true`. Explorers use the `how explorer` line in the pstack settings file (`~/.cursor/rules/pstack-models.mdc` in Cursor, `~/.claude/rules/pstack-models.md` in Claude Code, `~/.agents/pstack-models.md` in other harnesses) (default `grok-4.7-xhigh-fast`), and every explainer uses the `how explainer` line (default `claude-opus-5-5-xhigh`).

复杂度分叉（L17、L18）逐字：

> - **Simple** (a single module, a small utility, a narrow question such as "how does function X work"): no explorers. Spawn one explainer that explores and explains in one pass, built from `references/explainer-prompt.md` without the explorer-findings section. Go to step 4.
> - **Complex** (a subsystem spanning multiple files or services, a cross-cutting feature, a full architectural overview): go to step 2.

扇出与综合（L26、L30、L34）逐字：

> Decompose the question into 2 to 4 angles, each a distinct slice of the subsystem. Spawn all explorers in a single message, each with `references/explorer-prompt.md` and its angle filled in.

> Once all explorers have returned, spawn one explainer with `references/explainer-prompt.md` and every explorer's findings filled in.

> Present the explainer's output. Light edits for clarity or context from the conversation are fine. Do not substantially rewrite it.

输出节（L38）：

> The explanation uses the sections defined in `references/explainer-prompt.md`, dropping any that do not apply: Overview, Key Concepts, How It Works, Where Things Live, Gotchas.

### why（skills/why/SKILL.md）

frontmatter description（L3）：

```yaml
description: "Use for 'why does X work this way', 'why we picked Y', design rationale, regressions, postmortems, or data-backed thresholds. Discovers available MCPs and queries each evidence category (source control, issue tracker, long-form docs, real-time chat, infrastructure observability, error tracking, product analytics warehouse) in parallel, then returns a cited read on decisions and tradeoffs. Use how for runtime behavior."
```

agent mode（L13）逐字：

> Every spawn is `generalPurpose` with `readonly: false` (agent mode). **Do not use readonly/Ask mode.** It strips MCP access, which disables the MCP-backed investigators and the synthesizer's citation spot-checks. Investigators still shouldn't write anything.

七类证据与调查员（L37-39 为主，L49-52 配模型与提示）逐字：

> 1. Source control history

> Spawn one investigator per category that has a matching MCP, all in a single message so they run concurrently, each owning exactly one tool or MCP. Don't ask one agent to cover multiple MCPs. `model`: the `why investigators` line, default `grok-4.7-xhigh-fast`.

> Each investigator's prompt is `references/investigator-prompt.md` filled in, plus:
> - the category playbook `references/sources/<source>.md` for the selected MCP, adapted from the examples in `references/source-playbook.md`

synthesizer（L81-82）逐字：

> Spawn one synthesizer. `model`: the `why synthesizer` line, default `claude-opus-5-5-xhigh`. It gets:
> 1. The investigator findings, including any null results and any categories skipped with justification

信心措辞与输出（L90、L94、L96）逐字：

> Present the synthesizer's output to the user. You may lightly edit for clarity or add context from the conversation, but **do not rewrite the confidence language**.

> The structure is the one in `references/synthesizer-prompt.md`: The Question, The Code in Question, What We Found, What We Can Reasonably Infer, Competing Hypotheses, What We Don't Know, Sources Consulted, Confidence Summary. Adapt as needed, but keep the confidence separation intact, and keep Sources Consulted as one line per investigator, including the ones that returned nothing or were skipped, with the reason.

> After Sources Consulted, if the user's `why` question is a precursor to changing this code, convert the lineage findings into a Preserve / Change / Avoid / Risk constraint set for planning the change.

### teach（skills/teach/SKILL.md）

顶部定位（L9）逐字：

> **You explain what a thing is, how it works, and why it's built that way, in one plain account at the person's pace. The goal is that they understand it, not that you change anything.**

跑 how + why（L11-14）逐字（段首与关键句）：

> Teach sits on top of `how` and `why`. Get your bearings on what the work is and what it touches, then run `how` for how it works and `why` for why it's that way. Those are real skill invocations that do their own digging. Blend what they find into one plain explanation, lead with what matters to the person, and go deeper when they ask. Reword freely for teaching, with one exception. Keep `why`'s confidence language intact (its hedges are findings, not style).

> 1. Decide the few things they should walk away understanding. Choose them from why they're asking (about to change it, reviewing it, debugging it, new to it) and what they already know, both read from the conversation, not quizzed out of them. Skip what they plainly already know. Put the depth where their question is.

> 2. Let `how` and `why` do the work, don't redo it. Read the code yourself to get oriented, then run `how` for how it works and `why` for why. Run them in parallel and combine the results. Match the size to the question. Run both for a subsystem, maybe one is enough for a small change. Keep `why` narrow by default since its full sweep is slow. Put the narrowing in the ask itself (a scoped question, git plus a source or two) so `why` records the skipped categories per its own contract, and widen it only when the reasons are the point.

叠图教学（L17 起首）逐字：

> 5. Show, don't only tell, and build the picture up diagram by diagram. Open the diff, the code, or the debugger when that is the fastest way to land it. Draw when a picture lands faster than words. For anything with three or more moving parts, do not draw one diagram with all of them at once. Draw a short series instead, where each diagram redraws the last and adds a single part, so the reader watches the system assemble. A single all-at-once diagram, especially one saved for the end, is a reference, not teaching. Concretely, to teach a flow from A to B to C, draw it three times. First A to B. Then redraw and add C. Then redraw and add the return edge or the next piece. Match the medium to the idea, and use both kinds when both help.

### recall（skills/recall/SKILL.md）

顶部定位（L9）：

> **Before you start or resume work, you rebuild the user's recent working context and hand back a tight capsule of where things stand now and what to do next.**

双记录（L13）逐字：

> Your context lives in two records. Your own chat history holds what you did and decided. The shared record holds everything that happened around the same code under other names: the symptoms users keep reporting, the fixes that shipped and got reverted, the errors still firing in prod. That second record is what the **why** skill searches, across source control, the issue tracker, chat and issue channels, long-form docs, and error tracking. A feature with a long bug tail keeps most of its story there, so don't reconstruct it from your transcripts alone.

分类（L23）与锁范围（L24）逐字：

> 1. Classify, then route. One specific prior chat to resume is the `session-pickup` playbook, not this. Turning habits into a durable skill is `automate-me`. A human-readable summary of your work is a different task. Recall loads working context across recent chats before you act. If the user already gave you a full state capsule (paths, branch, the change), use it and skip the mining.

> 2. Lock the scope before searching. Pin the window ("recent" is a real range, default the last 7 days), the topic if named, and the workspace (default the active one. Never read another project's transcripts without being asked). State the scope back. Never quietly turn "all" into "recent N".

分片与验证（L25、L27）逐字（起首）：

> 3. Fan out across your chat history. Spawn parallel subagents on a fast, cheap model, each taking a slice of the corpus. Tell every subagent to order candidates by real modification time (`ls -t`) and never by UUID name, grep the topic first and then read only the matching chats and only their relevant regions, and skip the current chat plus obvious noise (subagent, eval, and test chats). Each returns the same schema, one block per chat: topic, the user's goal, decisions, open threads, struggles and corrections, and artifacts (PRs, tickets, branches), each citing the chat UUID. For one or two chats, skip the fan-out and search directly.

> 4. Sweep the shared record whenever the topic names a feature, file, subsystem, area, or bug. This is the default, not a judgment call, and "my work on X" does not exempt it. Hand it to the **why** skill's source investigators, but steer their question from "why was this built this way" to "what's the current state, what's been tried and didn't hold, and what are users still reporting". Reuse its per-source playbooks, run the investigators in parallel with the chat-history mining, and inherit its posture: one investigator per source, null results are findings, skip an unavailable MCP and say so.

> 5. Verify against live state. Take the PRs, branches, and tickets that the mining and the sweep surfaced and check them with `git` and `gh`. When the answer hinges on what an agent actually did (the tools it ran, files it read, errors it hit), read the full transcript, not just a trimmed local copy.

输出合同（L32-37）逐字：

> - **Capsule.** At most 5 bullets. What this work is and where it stands overall.
> - **Threads.** One line each, prefixed with exactly one status tag: `[merged #N]`, `[open PR #N]`, `[in flight <branch>]`, `[verified, uncommitted]`, `[reverted #N]`, or `[planned, not started]`. A thread with no tag is not done yet, so tag it.
> - **Problems.** At most 5, the recurring ones. Include the symptoms users keep reporting and any fix that shipped and was reverted, so the next attempt starts where the last one failed.
> - **Next move.** The single most useful next action, concrete.

## 设计四

### architect（skills/architect/SKILL.md）

五阶段（L13-20）：

> 1. Ground
> 2. Sketch
> 3. Agree
> 4. Implement
> 5. Scrap

Ground（L23、L25）逐字：

> Build a real mental model of every system the new code touches. Run the **how** skill over the relevant subsystems. Naming a file isn't grounding. Produce the architectural explanation `how` prescribes. If the design redefines ownership or layering, also run the **why** skill on the existing shape so the rationale becomes a constraint, not a guess.

> Skip Phase A only when the work is genuinely greenfield with no surrounding system to integrate.

Sketch（L29、L31、L33、L35、L37）逐字：

> Run the **arena** skill with the design-sketch task and the Phase A grounding artifacts. Pass `references/runner-prompt.md` as each runner's prompt.

> Take the runners from the `architect runners` line in the pstack settings file (`~/.cursor/rules/pstack-models.mdc` in Cursor, `~/.claude/rules/pstack-models.md` in Claude Code, `~/.agents/pstack-models.md` in other harnesses), in place of the `arena runners` line. If the file or that line is missing, use `claude-opus-5-5-xhigh` and `grok-4.7-xhigh-fast`.

> Design it twice. Require at least two structurally distinct candidates before synthesis, even when the first looks sufficient. This is the **exhaust-the-design-space** principle skill made concrete. Whole-shape alternatives, not point fixes inside one shape.

> Screen every candidate against [`references/design-red-flags.md`](references/design-red-flags.md) before synthesis. Assume the next contributor is an agent that sees only the files it opened, copies the nearest example, and takes the shortest path that compiles. Prefer the design where a change that looks right from one file is right for the whole repo.

> Compare viable candidates on interface depth. Prefer the design that hides more complexity behind a smaller, simpler public surface. A rich interface can keep call chains short by concentrating capability instead of scattering it across layers.

Agree（L43、L45、L47）逐字：

> Default: proceed directly to implementation with the synthesized design. No human checkpoint.

> Opt in to a checkpoint when the invoker explicitly asks: "/architect with checkpoint," "stop and show me before implementing," or similar. Then surface the synthesized design and pause for sign-off.

> The synthesis can ship as its own commit either way, as the "scaffold first" mode of the **foundational-thinking** principle skill. Planned and scoped breakage during fill-in is fine, per the **outcome-oriented-execution** principle skill. For adversarial pressure on the design before implementing, run the **interrogate** skill on the synthesized sketch.

Implement 与 Scrap（L53、L57、L59-66、L70-75）逐字：

> Replace `not implemented` bodies with code, pseudocode with logic. The synthesized sketch is the contract. Deviations from it are signal to surface, not friction to absorb silently. If a function needs a parameter the sketch didn't anticipate, ask whether the sketch was wrong, the requirement was missed, or the implementation is overreaching.

> If implementation keeps producing friction the sketch can't absorb, throw the sketch out. Don't bolt fixes onto a wrong design, per the **redesign-from-first-principles** and **fix-root-causes** principle skills.

> The signal is a *pattern*, not single instances. Tells:
> - The same shape of workaround appearing repeatedly across unrelated code.
> - Multiple unrelated edge cases that all need special-case branches.
> - Types that need escape hatches (`any`, casts, optional fields always set in practice) to compile.
> - The "we need a lock" reflex when the sketch said the state wasn't shared.
> - Callers having to know the abstraction's internal rules to use it.
> - Two or more independent Phase D deviations of the same shape across the implementation.

> When you scrap:
> 1. Re-run the **how** skill over what's been built.
> 2. Redesign as if the new constraints had been day-one assumptions, per redesign-from-first-principles.
> 3. Subtract before adding, per the **subtract-before-you-add** principle skill. The new sketch should be smaller than the old one before it grows.
> 4. Return to Phase B and re-run arena.

### arena（skills/arena/SKILL.md）

六阶段（L9）：

> Open a todolist with one entry per phase (Frame, Fan out, Cross-judge, Pick, Graft, Verify) before launching anything.

Frame（L13、L16、L17、L18 起首）逐字：

> Every candidate gets the same prompt, so the prompt is the contract.

> 2. Derive the rubric, 3-6 concrete gradeable criteria for what success looks like on *this* task. It is the picker's tool in Phase D. Candidates only see the task.

> 3. Pick the runners. Use the `arena runners` line in the pstack settings file (`~/.cursor/rules/pstack-models.mdc` in Cursor, `~/.claude/rules/pstack-models.md` in Claude Code, `~/.agents/pstack-models.md` in other harnesses). If the file or that line is missing, default to one each on `claude-opus-5-5-xhigh` and `grok-4.7-xhigh-fast`.

> 4. Give each candidate its own output location (a git worktree where possible, otherwise `/tmp/arena-<slug>/candidate-<n>/`), per the **separate-before-serializing-shared-state** principle skill.

Fan out 与 judges（L22、L24、L28 起首）逐字：

> Spawn all N subagents in one message with `run_in_background: true`, each with the task, the path to the shared grounding, its own output path, and instructions to produce the artifact and a short rationale naming the alternatives it considered and what it rejected.

> If a candidate produces no output, proceed with N-1 and note the dropout.

> After all Phase B candidates complete, choose one model from the `arena cross-judge pool` line in the pstack settings file. If the file or that line is missing, choose from `claude-opus-5-5-xhigh` and `grok-4.7-xhigh-fast`. Spawn one readonly judge subagent. The judge is never from the parent's family, as Phase A step 3 defines families.

Pick 与 Graft（L32、L34、L38、L40）逐字：

> Read every candidate end to end before picking. Score each against the rubric criterion by criterion, not on holistic feel, and compare with the cross-judge when Phase C ran one. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous. Read both rationales before deciding.

> Pick the base a future maintainer can extend most easily without breaking invariants. When two feel tied, prefer the cleaner boundary or smaller API, per the Laziness Protocol.

> Walk each losing candidate once more for what is worth porting into the base, usually one or two things per candidate, not most of it. Fold each graft in by hand, per the **redesign-from-first-principles** principle skill, so the result stays coherent under one mental model. Don't paste mechanically.

> If the candidates converge on one shape, that is strong agreement. Note it and ship the consensus shape. No graft is needed. If they wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

Verify（L44）逐字：

> Verify the synthesized artifact like any other output, per the **prove-it-works** principle skill. If verification finds a problem the arena missed, either Phase A was wrong (re-frame and re-run) or a candidate caught it and you missed the graft (go back to Phase E). Don't paper over it.

### interrogate（skills/interrogate/SKILL.md）

Frame（L13）：

> The scope is what the user names. Otherwise it is the branch diff from its merge base with the base branch, through the working tree. State the intent with the **in-your-own-words** skill, from the user's message, the commits, and the PR description. Ask the user when the intent is unclear.

任务与判定（L17-19、L23、L25、L9）逐字：

> Run Phase A steps 3 and 4 and Phase B of the **arena** skill, with four changes. Read the `interrogate reviewers` line in place of `arena runners`. Copy the scope's uncommitted changes into each worktree. Spawn each adversary as a general-purpose subagent (`generalPurpose` in Cursor). In place of the arena task and rationale, give each adversary the scope, the intent, and this brief:

> > Break this change. Prove each finding with a run against the real code, such as a failing test, a repro script, or command output that shows the wrong behavior. For a design or plan, run a prototype or probe the current tree. Keep repros in your own worktree. Report each finding with a title, the exact command, the output it printed, and the output the intent requires. Leave out anything you did not run. That covers style, naming, structure, and risks that need a future change to matter. No findings is a valid result.

> Verify each finding per arena Phase F by rerunning its command. Keep a finding when the output shows the failure and the failure breaks the intent. Drop the rest. Merge findings that share a root cause.

> Skip arena Phases C, D, and E. Adversaries find different failures, so the verdict keeps every verified finding, not one adversary's list.

> Adversaries try to break a change or a design. A finding survives only when a run proves it. Report the findings. Do not apply fixes.

### blast-radius（skills/blast-radius/SKILL.md）

定位与核心（L11、L13、L17、L34）逐字：

> Companion to `how` and `why`. `how` tells you what the code does. `why` tells you why it's shaped that way. Blast radius tells you what it breaks somewhere else.

> Listing the callers is not the job. The agent can grep those in a second. The job is the breakage grep won't show you.

> A blast-radius writeup that sounds right is worthless. It reads as convincing whether or not it's true. So don't hand back the writeup. Find the one or two facts the whole thing depends on and prove them by running code.

> 2. Find the one fact it's safe because of. Most changes that look risky are safe because of a single fact, like "this call only drops already-dead cache entries and does nothing else". Find that fact. If it holds, most risky cases are cleared at once. Spend your time here, not on a long list of maybes.

确信度阶梯（L23-27）逐字：

> For each fact the change's safety depends on, get it as far down this list as is cheap, and say where it stopped.
> 1. You said so. Worthless on its own.
> 2. You pointed at the line. A real `file:line`, or the library's own source.
> 3. You showed the bad case can't happen. You walked the failure step by step and it doesn't reach.
> 4. You ran it. A script or test that calls the real code and fails loud if you're wrong.
> 5. You reproduced it in the running app.

grep 之外（L35）逐字：

> 3. Look where grep stops. Read the source of the library you call, and check its pinned version and any local patch. Work out when things run: microtasks, unmount and teardown, Solid versus React. Follow what a symbol search misses: the JSON an API returns, a DB column, a wire format, another language reading the same bytes, a feature flag, code three hops downstream.

大改动（L38）：

> 6. For a big or wide change, run it as an `arena`. Ask more than one model the same question and merge the answers. Different models catch different real bugs.

### swarm（skills/swarm/SKILL.md）

四阶段与选择（L13-16、L20-23）逐字：

> 1. Frame
> 2. Fan out
> 3. Aggregate
> 4. Report

> 1. State the done predicate and the artifact or report the swarm must return.
> 2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
> 3. Pick the worker model from the `swarm workers` line in the pstack settings file (`~/.cursor/rules/pstack-models.mdc` in Cursor, `~/.claude/rules/pstack-models.md` in Claude Code, `~/.agents/pstack-models.md` in other harnesses). If the file or that line is missing, use `grok-4.7-xhigh-fast`.
> 4. Give each worker its own writable output when it writes. When workers verify or measure commits, each brief names the exact SHAs. A measurement brief also names the method (sample count, what one sample is, order). The worker records both in its result.

Fan out 与报告纪律（L27、L33、L35、L39、L43）逐字：

> Spawn all N workers in one message with `subagent_type: generalPurpose`, `environment: "cloud"`, `run_in_background: true`, and the step 3 model, left unset for `auto` or `inherit-parent`. Use `environment: "local"` only when the worker needs access to something on the user's computer.

> Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence. A worker that can prove a defect reports `ISSUES` and lists every issue it can prove, not only the first.

> If a worker drops out, proceed with N-1 and note it.

> Read the terminal results. Drop a result that does not record the SHAs and method its brief names, and respawn that worker once. After a second miss, record a gap. A gap does not count as a pass. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

> Return one consolidated in-chat report with a result table, issue one-liners, gaps or dropouts, and the race rule when used.

### tdd（skills/tdd/SKILL.md）

frontmatter description（L3）：

```yaml
description: "Use only when the user explicitly asks for TDD, a failing test, or a regression test, OR when the bug has an obvious cheap local test target. Skip when the test path is unclear, expensive, integration-heavy, or not requested."
```

工作流（L9、L17-20）逐字：

> When fixing a bug with a clear, cheap test path, make the broken behavior executable before changing production code. The goal is a focused regression test that fails before the fix and passes after it.

> 3. **Write the failing test first.** Add the smallest focused test that would have caught the bug. The test should encode intended behavior, not mirror the current implementation.
> 4. **Run the new test before fixing.** Confirm it fails for the intended reason. If it passes or fails for an unrelated reason, correct the test or reproduction before editing the implementation.
> 5. **Fix the bug.** Make the smallest production change that satisfies the intended behavior while preserving nearby contracts.
> 6. **Rerun the regression test.** Confirm the test now passes.

不逼测试（L11、L26）逐字：

> Do not force a test when it would be impractical. If the available test would require broad harness setup, brittle mocks, slow end-to-end infrastructure, production-only state, vague reproduction steps, or large unrelated fixture churn, skip adding a new test and use the closest useful verification instead.

> Prefer no new test over a bad test. A bad test is one that mostly tests mocks, encodes current implementation details, depends on timing or unrelated global state, needs expensive infrastructure for a small fix, or would be deleted immediately after proving the fix.

### benchmark-checklist（skills/benchmark-checklist/SKILL.md）

七问（L21-27 逐条原文长句，摘每问起首）：

> 1. **Why not double?** Name the limiter. Profile in a run you do not report, because profilers and tracers slow the work down.

> 2. **Was it tuned?** Run every side the way production runs it: release builds, production flags and env, batching and transaction settings, connection pools, caches as warm or cold as production sees them, and the same versions and data.

> 3. **Did it break limits?** Do the arithmetic. Compare bytes per second with disk and network bandwidth, operations per second times cost per operation with your cores, and the time saved with the time the changed piece took. Removing a piece that takes 10% of the run can make the run at most about 11% faster.

> 4. **Did it error?** Count failures and non-success responses, and check that outputs are correct, not just present.

> 5. **Does it reproduce?** Run each side at least 5 times, alternating (A, B, A, B, and so on) so warmup, lazy initialization, caches, and drift favor neither. Report the median and range.

> 6. **Does it matter?** Next to any micro result, measure the end-to-end path a user waits on, with realistic data sizes and concurrency, and report the micro result as a share of the whole.

> 7. **Did it even happen?** Confirm the work ran inside the timed region: the request reached the server, the rows were written, the bytes were read, and the code used the result.

ballpark 特例（L11）与 inconclusive（L33）逐字：

> For a quick ballpark the user asked for, one run is enough. Still check questions 4 and 7, and say that it is one run. Skip the rest unless that run looks wrong. A choice between options is never a ballpark.

> - Call the verdict inconclusive when you claim a difference but cannot name the limiter, when a side ran untuned, or when you could not check questions 4 and 7. Name the gap.

### show-me-your-work（skills/show-me-your-work/SKILL.md）

列定义（L15-22）逐字：

> - **ts.** ISO8601 timestamp.
> - **phase.** The phase or workstream.
> - **decision.** What was chosen or done, one line.
> - **why.** The reason in plain words. If a principle drove it, say it plainly, not as a jargon tag.
> - **evidence.** A link or path that proves it: commit SHA, PR number, `file:line`, or an artifact, trace, or screenshot path. Never a paragraph.
> - **result.** The outcome or predicate state: `tests green`, `reverted`, `pixel-diff 0`, `INCONCLUSIVE`, `open`.

规则与审计（L52-53、L63、L67-74 中关键句）逐字：

> - Append-only. A wrong call gets a new row that supersedes it. Never edit or delete history.
> - Prefer evidence produced by committed scripts over hand-made one-offs (the **encode-lessons-in-structure** principle skill).

> Correct the log, not the story. The audit never edits or removes a row, even an invented one. When a row records neither a real decision nor a real action, or its claim or evidence is wrong, add a row that supersedes it with what actually happened and a pointer that resolves.

> Before handing back, spawn a subagent on a different model family from the one that did the work. Self-review is not a substitute. The subagent reads the audit trail and the run's transcript, then flags what the user should pay attention to.

> Every reply for a run that produced a trail ends with an "Attention" section. Lead with the reviewer's model on its own line (`reviewed by <model>`), then list each flag pointing to specific rows or moments. "No flags" is a valid value. The model name is not.

## 文字六

### unslop（skills/unslop/SKILL.md）

规则盘点（L7-9、L13 与分节标识）逐字起首：

> Edit text to remove AI patterns. Scan for the patterns below, then rewrite. Preserve meaning and match the intended tone.

> Rule numbers are stable ids that other skills cite. A removed rule leaves a gap.

核心规则代表（L22、L31、L52、L56）逐字：

> 7. **AI vocabulary.** Additionally, crucial, delve, enduring, enhance, fostering, garner, interplay, intricate, landscape (abstract), pivotal, showcase, tapestry (abstract), testament, underscore, vibrant. Replace with plain words.

> 13. **Em dash overuse.** Avoid em dashes entirely. Use periods or commas only (no parentheses, no en dashes, no hyphen-as-dash substitutes). If a thought needs separation, end the sentence or use a comma.

> 26. **Abstract metaphor nouns.** Substrate (base), wedge, wedge in (add), vector (way, method), locus, vantage, nexus, primitive as a noun, harness as a metaphor, surface as in "API surface", bedrock, scaffolding as a metaphor, modality, paradigm, gold-plating (more than the job needs), ratchet as a metaphor (the mechanism's real name, or a limit that only tightens), evacuate for moving code (move out), endgame (the last phase), north star, flywheel. These read as technical but usually have a plainer concrete word. Pick the concrete word.

> 27. **Say what it does, not how it feels.** "the database stays close at hand", "SQL you can read", "types that follow your schema" name a feeling. The fix names the mechanism or a number: "`.toSQL()` returns the exact string sent to the database", "a column rename fails the build". Ask what the sentence tells the reader to do or know, then write that. If you can't restate it as a concrete instruction, fact, or number, cut it.

### technical-writing（skills/technical-writing/SKILL.md）

顶层三规则（L13、L17、L19 起首）逐字：

> - **Cut every word that does no work.** If the sentence survives without a word, the word goes. "In order to" is "to". "It is important to note that" is nothing.

> The codebase is the word list. Write the real symbol, file, flag, or command name, not a synonym or a description of it.

> Don't invent jargon. Use the words a developer would say out loud: "move", "delete", "a budget that only decreases", not "evacuate", "ratchet", or "endgame". A named pattern is fine when the doc says what it means the first time. Propose a new offender and its replacement as an addition to `unslop`'s abstract-metaphor rule in your reply, with the diff. Don't edit that skill.

四模式（L41、L43、L45、L47 逐条起首）：

> **Tutorial: learning by doing.** The learner's success is your job, not theirs. Open by saying what the learner will build, not what they will "learn".

> **How-to: steps to a goal.** Solve a problem a person has, not an operation the machine can perform.

> **Reference: facts for lookup.** Only describe. No instruction, no persuasion, no opinion.

> **Explanation: understanding and why.** One bounded topic, readable away from the product. Each title should tolerate an implicit "About..." in front.

混模式禁令（L49）：

> Don't mix modes: no reference tables inside a tutorial, no tutorial hand-holding inside reference, no arguing inside a how-to. Split and link instead.

### no-comments（skills/no-comments/SKILL.md）

步骤（L19-23 关键句）逐字：

> 1. Spawn `Task` with `subagent_type: "comment-sicko"`. Pass the scope. Pick each subagent's reasoning level and fast or standard speed for the job, per the Subagents section of the **poteto-mode** skill.

> 2. Inspect its report and diff. Reject application-code edits, scope escapes, exception-protected deletions, misstated `MUST KILL` reasons, and flags that treat kept intentional code as guilty.

> 3. Fix trivial accepted flags directly by deleting a dead path, dropping a parameter, or using the real API. If any fix needs a shape, run `/architect` once for the accepted set and surrounding code. Stop at the sketch. Architect shapes. Step 4 implements.

> 4. Implement the smallest root-cause fix in scope. Remove every named workaround. If the root cause is out of scope, land the smallest in-scope fix and report the rest open.

> 5. Constraint comments say `do not remove`, `do not change wording`, or `talk to X before changing`. Leave keeps about things we cannot change. Offer the cheapest in-scope type, runtime, test, or CI lint. Wait for interactive approval.

不重述 sicko（L9、L11）：

> Spawn Comment Sicko. Act on accepted findings.

> Defer to Comment Sicko's fresh perspective.

### bro（skills/bro/SKILL.md 全文）

> Restate your last message. Stop using jargon and speak coherently. State it more simply and concisely, like one human talking to another.

### ketchup（skills/ketchup/SKILL.md）

定位与只读（L9、L15）逐字：

> Catch the user up on what changed in this chat since the last message they wrote before `/ketchup`, and help them understand each change, not only where it stands. Then lay out every call waiting on them so they can make it from your reply alone. Notifications and subagent results are not their messages. Assume the user remembers their last message and nothing after it.

> Keep this turn read-only. Make visuals only from what you already have: do not change code, start an app or a job, or post anything.

用 bro 的声音（L11）：

> Use [`/bro`](../bro/SKILL.md)'s voice, not its task: plain words, short sentences, no jargon, like one person catching up another. Say what changed for the user, not how you did it. Say "the tests pass", not "CI is green".

行动项定义（L17 中段）：

> An action item is a call or step only the user can take, such as a product choice, an approval, an irreversible action, or access you lack. Include any still waiting on the user, even one raised before their last message.

### ketchup-video（skills/ketchup-video/SKILL.md）

定位与例外（L9）逐字：

> Follow [`/ketchup`](../ketchup/SKILL.md), but show what happened in a short subtitled video instead of its summary and visuals. Its window starts at the last message the user wrote before `/ketchup-video`, not before any earlier `/ketchup`. Writing and rendering the video, outside the repo, is the one exception to its read-only rule. The reply is ketchup's opening sentence, the embedded video, one line naming any work left that you can do yourself, and the action items. When the video shows a call's options, call each option by the name the video gives it. If the render fails, say so in one line and give only the calls.

渲染与自检（L27、L29）逐字：

> Render one silent landscape video, such as an mp4, with motion between slides. Every frame is the slide itself, edge to edge, above its subtitle strip. Make the frames from the slides, never by recording a screen, and burn each subtitle into its slide's frames so it stays on screen for the slide's whole hold. The hold is the time a slide is fully on screen, not counting the motion into or out of it. Hold each slide long enough to read the words it adds, at least one second for each three words.

> Before you embed the video, check the rendered file. Look at one frame from each slide at chat size, and check that its subtitle is readable and covers nothing. Measure each hold by matching the file's frames to the slide, not with a still-frame detector, which counts the faint ends of a fade as still.

## 生成器与维护五

### create-verification-skill（skills/create-verification-skill/SKILL.md）

定位（L7-9 起首）：

> Every serious project needs a scripted way to drive the real app and prove behavior: launch it, exercise a feature the way a user would, and capture evidence. This skill generates that as a project-local skill (`<skills>/verify-<app>/`) tailored to the repo.

采访仓库五问（L15-19 列表头）：

> - **Surface:** what does a user actually touch?
> - **Run:** how does the app start locally?
> - **Drive:** how can an agent interact with it programmatically?
> - **Observe:** what evidence can be captured?
> - **Isolate:** can two instances run side by side?

自证（L38-40 起首）：

> Run its own instructions end to end once: launch, doctor, drive ONE mapped feature (one is enough; the map exists so later runs can cover the rest), capture evidence, clean up. After cleanup, confirm the evidence still exists at the named location — a cleanup that eats the proof fails this step.

> A generated skill that was never executed is a draft, not a deliverable.

### maintain-verification-skill（skills/maintain-verification-skill/SKILL.md）

三结局（L13-17）与编辑范围（L21）：

> - **clean** — every feature got source and live coverage; nothing worth shipping. No branch, no PR.
> - **changed** — one PR ships proven doc, harness, or map corrections.
> - **blocked** — coverage could not finish or a proven fix could not ship safely. Say exactly what blocked it.

> Only edit the verification skill's own directory (its SKILL.md, features/, and any harness scripts it owns). Never edit product code during a run: a behavior the map describes that the app no longer does is either doc drift (fix the map) or a product regression (report it, don't paper over it in docs).

流程与活体波（L29、L33 起首）：

> 2. **Source wave.** One read-only subagent per feature file, launched concurrently. Each explains "how does this user-facing feature work?" from source, flags likely doc drift with citations, and returns one concise live-verification recipe.

> 4. **Live pass.** Required even when source looks clean. The coordinator owns all driving; follow the verification skill's own launch model — one long-lived instance driven serially for servers and UIs, or a fresh isolated session per drive for short-lived CLIs (the skill's Launch section decides, not this one). Exercise every feature at least once, and hold three invariants the whole pass, whatever the failure: (1) never drive an instance you haven't health-checked since it last did something surprising — doctor before first drive, doctor on each fresh session where sessions are the unit, doctor again after any failed drive, and where doctor can't see the failure (a wedged UI state on a healthy process), reset to a known state or relaunch rather than hoping…

### create-formal-verification-skill（skills/create-formal-verification-skill/SKILL.md）

定位（L7-9 起首）：

> A test checks the cases that someone thought to write. Formal verification checks every case in a stated scope: every order of steps in a model, every input up to a bound, or every input. This skill finds the part of the repo where that matters most, verifies one property of it, and leaves a project-local skill that lets the next agent check a change against that property.

工具选择（L19 起首）：

> Pick the tool that answers the question at the lowest cost: a model checker, a proof assistant, an SMT-backed verifier, or another tool. Whether events can happen in a bad order usually suits a model checker over a small model of the design, and TLA+ is the default for that in any language.

七个「好」标准（L23-29 列表头）：

> - **True to the code.** Every part of the model or proof points to code that a reviewer can open.
> - **Able to fail.** A check that you have never seen fail proves nothing.
> - **Findings stay findings.** When the current code breaks the property, report it with the counterexample in the code's terms.
> - **Honest about scope.** Say what is verified, under which bounds and assumptions, and what is left out.
> - **Readable without the tool.** State the property and the harm in one plain sentence each.
> - **Cheap to rerun.** One command, a reproducible tool version, and a run short enough that the next agent will use it on every relevant change.
> - **Kept in step with the code.** Record which files and functions each check covers, and the commit at which you last confirmed that the verification describes them.

statechart 指派（L35）：

> If the check is a TLA+ model, tell the next agent to read every result with the pstack [`/statechart`](../statechart/SKILL.md) skill.（后接为什么不复制命令路径的原因）

交接前证明（L39）：

> Follow the generated skill once, as the next agent would, on a scratch change that breaks the property in the real code. It must catch the break. Then drop the scratch change and confirm that the check is back where it started: passing, or failing only on the findings you will report. A verify skill that was never run is a draft.

### maintain-formal-verification-skill（skills/maintain-formal-verification-skill/SKILL.md）

四结局（L15-18）与危险情形（L9）：

> - **in sync**: no change since the last sync alters what the check describes, and the check passes.
> - **updated**: the code changed, the verification now describes the new code, and the check passes.
> - **bug**: the verification describes the current code, and the code breaks the property. This is a finding about the code. It is not drift.
> - **blocked**: the check could not be brought back in line or could not run. Say exactly why.

> A formal check proves a property of what it describes. When the code changes and the verification does not, the check can keep passing while it describes code that no longer exists. That pass is the dangerous case, because it looks like a proof.

分类改动（L33-36 四条列表头）：

> - **No effect.**
> - **The verification no longer describes the code.**
> - **The promise changed on purpose.**
> - **The promise may be broken.**

按代码而非按结果更新（L38 起首）：

> 4. **Update from the code, not from the result.** Change the model or harness so that each changed part again points to code that a reviewer can open, and keep one indivisible step in the code as one step in the verification. Write the update from the code before you rerun, and do not shape it by what makes the check pass.

### statechart（skills/statechart/SKILL.md）

运行模型（L13-21）与 spec 原则（L25-27）：

> Work in a scratch folder outside the repo. Write a TLA+ spec and its config. Then run:

> - Write each rule that the reader agrees to as an INVARIANT. A rule can be about a screen, a result, a stored value, or a message. If the model has no variable for a rule, add the variable. Never weaken a rule to make it hold.

> - Write `Next` as a disjunction of the actions, such as `YouPressPlay \/ YouPressStop`. If you do not, TLC names every step `Next`.

报告解读（L64、L66、L69）：

> - In the chart, a state that breaks a rule has the class `breaks`. When only some model states behind it break the rule, it has the class `mayBreak`.

> - TLC goes past a state that breaks a rule, so the chart shows the states after a bug.

> - The command checks the rules with TLC on the config as written, with one worker. When a rule breaks, the command removes that rule and runs TLC again, until no rule breaks.

重放（L80-82 起首）：

> When the model describes code, replay each bug path against the real code, as a test or a live repro, one step for each action. If a bug does not occur, think that the model is wrong until you show that it is not.

## 个人化与元六

### automate-me（skills/automate-me/SKILL.md）

定位与编排（L7-13）：

> A guided flow for turning the user's working conventions into a skill agents will follow. The output is one `-mode` skill tailored to them (e.g. `jay-mode`, `priya-mode`).

> This skill orchestrates three others: an inline mining pass (see step 1), your harness's skill-authoring skill (authoring), and the **unslop** skill (prose discipline). It sequences them. It doesn't replace them.

分片与可信度（L31、L39、L48）：

> Locate the active workspace's transcripts before fanning out. Use only that workspace's directory. Don't glob across every project's directory. That crosses workspace boundaries and reads private chats from unrelated projects.

> Survey recent agent conversations within that scope for recurring patterns. Run multiple parallel subagents across slices of history (e.g. last 2-4 weeks, split into 3 slices so each has enough material).

> Cross-check across slices before elevating a signal. Patterns seen in 2+ slices are high-confidence. Lone signals are weak and usually get dropped.

护栏与评估（L94-96、L104）：

> - **Don't overfit to one conversation.** A preference stated once and contradicted another time is noise. Require multiple instances before codifying it.

> A `-mode` skill is subjective output. A `create-skill`-style test/iterate benchmark loop isn't useful here. Vibe-check with the user: does it read like them? Did it miss anything? Then ship.

### correct（skills/correct/SKILL.md）

定位与假设（L7-9、L11）：

> The operator keeps correcting agents in this repo for the same mistakes. Change the repo so the next agent can't make them.

> Assume every contributor is an agent that sees only the files it opened, copies the nearest example, and takes the shortest path that compiles.

层级（L19-22 列表头）：

> 1. **Eliminate it with architecture.** Give each piece of state one owner and each task one supported way.
> 2. **Enforce it with types so the bad state can't be written.**
> 3. **Test the behavior.**
> 4. **Write docs or agent rules last, only for judgment calls.**

证明与规则表（L26、L28-30）：

> Then fix the most frequent classes now, one commit each. Prove each new check fails on a real past mistake. Run the same command locally and in CI. Exceptions go on the offending line with a reason, an expiry date, and a human's approval.

> Last, keep a table in the agent instruction file that pairs each rule with what enforces it. When the operator corrects you, fix the mistake and add the rule.

### reflect（skills/reflect/SKILL.md）

定位与不自动改（L7-9、L57-59）：

> Mine the current conversation for durable learnings, then route them into skill edits.

> Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit. The user picks the subset and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

三评审与模型行（L41-45 表）：

> | Judgment | `reflect judgment, divergent, synthesizer` | `claude-opus-5-5-xhigh` | `references/judgment-reviewer.md` |
> | Tooling | `reflect tooling` | `grok-4.7-xhigh-fast` | `references/tooling-reviewer.md` |
> | Divergent | `reflect judgment, divergent, synthesizer` | `claude-opus-5-5-xhigh` | `references/divergent-reviewer.md` |

Backlog 与缓存（L61、L63）：

> File each Backlog item to your team's devex or backlog tracker without waiting. Only the Accepted list waits for approval.

> Never edit a skill under `plugins/cache/`. Before approval, show its destination: ... After approval, copy the skill folder there and edit the copy. Never open a PR or push.

### sharpen（skills/sharpen 全文 SKILL.md）

> I want a deeper version of this task, not a bigger one. Before rewriting it, do four things:
> 1. Say what a top professional in this field would do here that I'm not asking for.
> 2. Name the rawest material they would start from instead of what has already been digested for me.
> 3. Name the specific methods and tools they would use.
> 4. Say what, other than you or me, would show the result is right.
> Then rewrite my prompt to ask for exactly that.

> Leave choices that are mine to make open instead of deciding them.

### in-your-own-words（skills/in-your-own-words 全文）

> Restate in your own words what you think the user's goals are and what problem they're trying to solve.

### typescript-best-practices（skills/typescript-best-practices/SKILL.md）

frontmatter（L3-6）：

```yaml
description: TypeScript best practices. Use when reading or editing any .ts or .tsx file.
paths: ["**/*.ts", "**/*.tsx"]
disable-model-invocation: true
```

规则表（L14-29 表头与每行首句）：

> | Rule | Summary |
> |------|---------|
> | Discriminated unions | Model variants with a `kind` literal discriminant so impossible states can't be represented. No optional-field bags. |
> | Branded types | Brand primitives with `& { readonly __brand: "X" }` so they can't be mixed up. Validate once at the boundary. A brand comes from a verifying type guard (`input is AgentId`), never from `as`. |
> | Constructive modeling | Build the shape so the illegal value can't be constructed. `[T, ...T[]]` for non-empty, `[T, T][]` for even length, `start` plus `duration` for a range. |
> | Simplest total type | Keep `T[]` while every operation on it stays total. Strengthen to `NonEmpty<T>` only where the loose type forces `!`, a cast, or a "should never happen" throw. |
> | `unknown` over `any` | External data is `unknown`. |
> | Schemas before guards | Before hand-writing a property-by-property type guard, use the repository's runtime schema library and infer the type from the schema, such as `z.infer`. |
> | No `as` casts | Every `as` is a runtime crash waiting. Cast only after validation. |
> | Narrowing hierarchy | Discriminant switch > `in` operator > `typeof`/`instanceof` > user-defined type guard > `as`. |
> | Type guards | Must verify the claim. A lying guard is worse than `as` because the bug hides behind a name that says it's safe. Name them `isX` or `hasX`. |
> | Exhaustiveness | Inline `const _exhaustive: never = x;` in default arms so the compiler errors when a new variant is added. |
> | `satisfies` over `as` | Validates the value without widening literal types. |
> | Boundary validation | Parse where data crosses in, into a named domain type. `Record<string, unknown>` (however spelled) stops at that parse. Trust types inside. |

## 24 个 principle 的名称与触发句（poteto-mode/SKILL.md Principles 清单逐字，L45-80）

[benny 三个的行为级摘录见上一个 group 段。principle 的「决策面」以各自 SKILL.md 的正文名句为据，此处记录 poteto-mode 清单的原文行]

> - **Laziness Protocol.** Refactoring, sizing a diff, or tempted to add abstractions, layers, or signal threading. Bias to deletion and the smallest change that solves the problem.

> - **Foundational Thinking.** Starting a task, choosing core types and data structures, or sequencing scaffold-versus-feature work. Get the data structures right so downstream code becomes trivial, and build the verification scaffold before the feature code.

> - **Redesign From First Principles.** Integrating a new requirement into an existing design. Don't bolt it on; redesign as if the requirement had been a foundational assumption from the start.

> - **Attack the Premise.** Two or more fixes that share one premise have failed the same gate. Write the premise down, and test it directly before writing another fix that assumes it.

> - **Subtract Before You Add.** Adding something to an evolving system. Remove first: dead code, redundant validators, one-shot tests, then keep the plan to subtract. Add on the simpler base, per Laziness Protocol.

> - **Minimize Reader Load.** Reviewing or shaping code that's hard to trace. Count layers and hidden state, collapse one-caller wrappers, shrink mutable scope.

> - **Outcome-Oriented Execution.** Planned rewrites and migrations with explicit phase boundaries. Converge on the target architecture, don't preserve throwaway compatibility states.

> - **Experience First.** Product, UX, or feature-scope tradeoffs. Choose user delight over implementation convenience.

> - **Exhaust the Design Space.** A novel design or product call with nothing in the codebase or industry to copy. Build 2-3 competing approaches, prototype them, and compare side by side before committing.

> - **Build the Lever.** Non-trivial repetitive work: bulk edits, migrations, analyses, checks. Build a tool (codemod, script, generator, or skill your subagents follow) instead of doing it by hand.

> - **Model the Domain.** Writing stateful logic, or code that branches a lot or repeats a shape assumption across files. Encode the domain in a structure (state machine, typed model, table or registry, reducer, boundary, the right collection) instead of scattered conditionals.（L58）

> - **Boundary Discipline.** Wiring validation, error handling, or framework adapters. Concentrate guards at system boundaries (CLI, config, network, external APIs); trust internal types and keep business logic in pure functions.（L59）

> - **Type-System Discipline.** Designing types, reviewing a function signature, or writing code in any statically-typed language. Make illegal states unrepresentable, brand semantic primitives, parse external data at boundaries. For TypeScript syntax, see the `typescript-best-practices`.（L60）

> - **Make Operations Idempotent.** Designing commands, lifecycle steps, or processing loops that run amid crashes, restarts, and retries. Converge to the same end state regardless of partial prior runs.（L61）

> - **Migrate Callers then Delete Legacy APIs.** Introducing a new internal API while old callers still exist. Migrate callers and delete the old API in the same wave instead of preserving compatibility layers.（L62）

> - **Separate Before Serializing Shared State.** Concurrent actors might write to the same file, branch, key, or state object. Eliminate the sharing first; serialize structurally only when one shared writer is a real invariant.（L63）

> - **Prove It Works.** After a task, before declaring done. Verify against the real artifact, not a proxy or "it compiles".（L67）

> - **Fix Root Causes.** Debugging. Trace each symptom back to the first place the system went wrong and fix it there. A guard is a fix only when the state it handles is legitimate.（L68）

> - **Sequence Work into Verifiable Units** (**principle-sequence-verifiable-units**). Multi-step work (sweeps, migrations, runs of similar edits) and how you stack commits and PRs. Break work into small units that each end in a check, verify each before the next, and order delivery so the sequence proves itself.（L69，显式括号 slug 的唯一原则名）

> - **Test Behavior, Not Implementation.** Writing, changing, or keeping a test. Assert what the code's users can observe, so the test fails when that behavior breaks and keeps passing when only the internals change.（L70）

> - **Explain the Number.** Before you measure, and before you trust, report, or act on a number you measured. Find what limits it, and rule out that it never happened.（L71）

> - **Guard the Context Window.** Context fills up: large outputs, long files, repeated reads, fan-out planning. Route to a subagent, keep summaries in the main thread.（L75）

> - **Never Block on the Human.** Tempted to ask "should I do X?" on reversible work. Proceed, present the result, let the human course-correct.（L76）

> - **Encode Lessons in Structure.** You catch yourself writing the same instruction a second time. Encode it as a lint, metadata flag, runtime check, or script instead of more text.（L80）

## benny 三个（automations/benny/skills/*/SKILL.md）

### triage（automations/benny/README.md:5、triage-issue-reports/SKILL.md）

benny README:5「the files in this directory are dormant setup and automation sources. they do not appear as slash skills」为入口声明原文。

frontmatter（triage L2-5）：

```yaml
description: Triage Slack issue reports with one thread-only verdict, evidence review, cause-aware routing, tracker dedupe, and fail-closed ticket creation. Use only from the configured Benny triage automation.
disable-model-invocation: true
```

body 指令（L9-11、L13-28 硬规则）：

```markdown
# Triage issue reports

Classify one Slack report and post one useful verdict in its source thread. Create a tracker issue only for a clear, new bug. Do not reproduce or fix it here.
...
## Hard safety rules

- The source channel and root thread coordinates are immutable.
- Never post a root message in the source channel.
- Never post to another channel, broadcast a reply, send a DM, or start a replacement thread.
- Preflight the source parent before any tracker write and immediately before the verdict post.
- If the parent is missing, deleted, inaccessible, or uncertain, stop with no writes.
- Post one substantive verdict. Do not narrate progress.
- The coordinator is the only Slack poster.
- Delegated workers return findings only. They must be read-only and receive no Slack credentials or write actions.
- Every child prompt must forbid `SendSlackMessage`, `PostToSlack`, `chat.postMessage`, and every other Slack write.
- Never create an issue that cannot link back to the source thread.
- Prefer no ticket over a guessed or duplicate ticket.
```

与 pstack 共享技能的连接（L71-73、L28）：

> Use pstack's `how` skill to trace the path from the reported action to the observed result. Use `why` when the report looks like a regression or touches defensive code.

> - Apply pstack's `principle-minimize-reader-load` and `unslop` skills to the final verdict.

### reproduce-and-fix-issues

frontmatter（L2-5）与 body 定位（L9-11）：

```yaml
description: Reproduce triaged Slack bugs through a configured app-control adapter, verify existing fixes, and open a bounded draft pull request only after before-and-after proof. Use only from the configured Benny repro automation.
disable-model-invocation: true
```

> Wait for a trusted triage marker in the source thread. Reproduce the exact symptom through the target app's real UI. Verify an existing fix when one exists. Attempt a bounded fix only after a confirmed repro.

硬规则（L13-28 中代表条款）：

> - The exact discriminating symptom must appear twice through real UI interaction.
> - State inspection may confirm an observation. It must not inject or force the symptom.
> - No confirmed repro means no authored fix.
> - Existing pull requests or commits switch the run to verify mode. Do not author over them.

与 pstack 共享连接（L161、L262、L295）：

> 用 pstack 的 `how`、`why` 做有限排查；cheap test path 时用 `tdd`；merged 最终用 `unslop`（行内英文以文件为准）

### setup-benny

frontmatter（L2-5）与定位（L9-11）：

```yaml
description: Configure Benny and prepare its triage and repro automations. Use when installing Benny or changing its Slack, tracker, repository, routing, control, model, or budget settings.
disable-model-invocation: true
```

> Benny ships as a dormant automation pack inside pstack. The plugin manifest exposes only pstack's normal skill root; this file and the two operational files are not slash skills.

> Do not create or update an automation until the user explicitly asks. Never put a secret value in plugin files, prompts, or committed configuration.
