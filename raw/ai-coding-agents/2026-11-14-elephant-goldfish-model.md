---
source: github.com/google/elephant-goldfish-model（README、docs/harnesses.md、AI_POLICY.md、skills/egm-review/SKILL.md、.claude-plugin/agents/design_critic.md 原文，via raw.githubusercontent.com）
collected: 2026-11-14
published: Unknown（仓库创建 2026-09-13，各文件随 main 变化）
---

# google/elephant-goldfish-model 仓库一手材料

## 仓库元数据（gh api repos/...，2026-11-14 采集）

- created: 2026-09-13T16:31:06Z
- description: Open-source plugin for designing and reviewing software with agents
- forks: 1398
- open_issues: 104
- pushed: 2026-11-14T03:30:16Z
- license: Apache-2.0
- stars: 18713
- README 末行：Apache 2.0. This is not an officially supported Google product.

## README 关键原文摘录

定位句与角色分工：

> Develop ideas with context and review documents with fresh eyes. EGM is an open-source plugin for AI assistants.
>
> **Elephant** holds your project context and drafts the specification. **Goldfish** reviewers examine the draft and referenced source material without the earlier conversation, helping expose unstated assumptions and blind spots. **You** make the architectural trade-offs and approve the specification before implementing.

How it works 表：

- Elephant：Your project, requirements, and earlier decisions — Explore the problem and draft the specification.
- Goldfish：The document and its referenced source material, without the earlier conversation — Find missing assumptions, unclear requirements, and implementation risks.
- You：The goals and constraints that matter — Resolve trade-offs, approve the design, and decide what to build.


硬性隔离声明：

> Goldfish reviews require fresh subagent contexts. If your agent cannot create them, EGM stops the review. A review does not replace tests or human judgment.

技能清单（7 个）：

- Brainstorm — Test an idea and write a concept brief.
- Draft — Turn a brief or existing notes into a design document.
- Resolve — Work through review findings and agree on changes.
- Bootstrap — Create or update documentation for an existing codebase.
- Review — Review a design with fresh agents across five stages.
- Review loop — Run a configured group of reviewers for a specific review task.
- Drift report — Compare checked-in documents with the current source code.

产物路径：brief 存 `concepts_brief.md`，draft 存 `design_draft.md`，批准后的规格存 `docs/designs/`。评审入口示例：`/egm:egm-review docs/designs/webhooks.md`。


Choose a skill 段原文：

> You can use each skill when you need it. You do not have to follow the full sequence.
## docs/harnesses.md 关键原文摘录

### 一套文本、多份清单

> EGM is one set of skills and personas. This repository serves as the plugin source for each supported harness. No harness gets a fork of the skill text.

### Manifests（docs/harnesses.md 原文）

> Root `plugin.json` is the canonical source for plugin identity, version, description, and publisher metadata. It follows the portable Agent Plugins 1.0.0 format; the `$schema` key is omitted because omp routes manifests that declare it to a strict validator that rejects `disable-model-invocation`. Update shared values there first, then update the compatibility manifests; unit tests reject metadata drift. Keep platform-specific fields in their existing manifests until installation tests justify removing them.
>
> Marketplace files are discovery catalogs pointing to this package, not copies of its skills. In particular, `.agents/plugins/` contains the Codex catalog, while `agents/` contains reviewer personas. All hosts share the same `skills/`, `agents/`, and `resources/` content.

Manifests 表（各宿主清单与技能/子代理来源）：

- Antigravity：`plugin.json`；skills/（default）；agents/（default）
- Claude Code：`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`；skills/（default）；Claude adapters and orchestrators listed in plugin.json `agents`
- Claude Cowork：`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`；skills/（default）；Subagents run inside Cowork; hooks n/a
- Codex：`.codex-plugin/plugin.json`、`.agents/plugins/marketplace.json`；skills path；Not shipped; general-purpose subagent reads the persona file
- ChatGPT：`plugin.json`、`.codex-plugin/plugin.json`；`.agents/plugins/marketplace.json` for workspace import；skills path；Detect native tools; general-purpose agent reads the persona
- omp：`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json`（Claude-compatible fallback）；skills/（default）；Personas from `agents/`/`.claude-plugin/agents/` register as native `task` agents
- Muse：`.claude-plugin/plugin.json`（Claude-compatible fallback）；skills/（default）；10 adapters import as agents; tool projections unsupported

### 安装入口

- Claude Code：`claude plugin marketplace add google/elephant-goldfish-model && claude plugin install egm@egm`
- Codex CLI：`codex plugin marketplace add google/elephant-goldfish-model && codex plugin add egm@egm`
- Antigravity CLI：`agy plugin install https://github.com/google/elephant-goldfish-model`
- omp：`omp plugin marketplace add google/elephant-goldfish-model && omp plugin install egm@egm`
- Muse：`git clone https://github.com/google/elephant-goldfish-model.git && muse plugins install ./elephant-goldfish-model --scope user && muse plugins approve egm`

Antigravity IDE（standalone）：插件与 skill 能从 `~/.gemini/config/plugins/egm/` 加载，但 standalone 不暴露 `invoke_subagent`，因此 `/egm-brainstorm` 与 `/egm-review` 不可用。

### 隔离：父轮次与 host 指令文件是两项独立结果

> A Goldfish review needs a fresh context. If a harness has no subagent tool, the review skills stop instead of running in the same context. Check actual tool availability rather than inferring it from the product name.
>
> Fresh conversation context does not mean that the host omits its instruction files. Codex's `fork_context: false` and `fork_turns: "none"` isolate parent turns; they do not establish that project or user instructions are excluded.

Support Status 段：

> **Antigravity CLI**, **Claude Code**, and **Codex** pass automated installation and end-to-end workflow fixtures. Reviewer isolation evidence is narrower: parent-turn isolation and host-instruction exclusion are separate results.
>
> Claude reviewer adapters set `omitClaudeMd: true`; see the Claude integration. For Codex, issue #237 reports that Codex CLI 0.166.0 supplied project and user `AGENTS.md` files despite `fork_turns: "none"`. For Antigravity CLI, the same issue reports project `AGENTS.md` and `GEMINI.md` in reviewer context. These are reported host-instruction leaks, not evidence that parent conversation turns leaked. The Codex test and recorded Antigravity run check parent-turn isolation only; neither verifies instruction-file exclusion. No host-specific exclusion control is verified here for Codex or Antigravity.

### omp 验证状态（#186）

> **omp** has a working installation path. Skills are invoked as `/skill:egm-<command>` (omp registers one command per skill; it has no `/egm-*` namespace). Community-verified on omp v18.12.6: all seven skills discover and resolve, and all nine reviewer personas register as subagents. End-to-end workflow fixtures are not yet automated for omp.

### Muse 的工具白名单不生效

> **Muse** (1.4.14) has a working installation path. `muse plugins validate` reports the plugin valid with all seven skills and all ten agent adapters supported; every agent tool projection is unsupported, so Claude tool allowlists do not restrict Muse reviewers.

### 其他宿主边界

- Claude Cowork（#105）、ChatGPT Work（#106）：有可用安装路径，云端 trace 验证有缺口。
- Windsurf（2026-06-02 更名 Devin Desktop，#376）：实验性 workspace 路由；Devin CLI 3000.12.43（2026-11-10）通过路由、人类暂停、只读 reviewer 与父标记隔离且每次文件写入被拒，因此没有工作流跑到最终产物。

### 产物目录策略

brief/draft/report 默认写工作目录；指令文件可用 `EGM artifact directory: .dev/docs` 指定；路径经符号链接解析后落在外部的会要求确认；批准后的规格提交到 `docs/designs/`。

## skills/egm-review/SKILL.md 关键原文摘录

frontmatter：

```yaml
name: egm-review
license: Apache-2.0
disable-model-invocation: true
description: >-
  Orchestrates the EGM Goldfish Review Protocol. Used as part of the EGM
  process to perform design document reviews. Executes five review phases:
  Initial Zoom Out Review, Comprehension Review, Design Critique, Intermediate
  Zoom Out Review, and Implementation Readiness.
```

Delegation 段（隔离硬要求）：

> A Goldfish runs in a fresh context with no conversation history. Spawn each subagent with your harness's subagent tool (Antigravity: `invoke_subagent`; Claude Code: `Agent`; Codex: `spawn_agent`). Each subagent is defined in `agents/<file>.md`, and its frontmatter `name` (for example `egm-zoom-out`) is the subagent type to request where your harness registers named subagents. Otherwise spawn a general-purpose subagent and tell it to read that persona file first. Pass the prompt verbatim and wait for the report. If your harness cannot nest subagents, use direct dispatch instead of the synthesizer. See `docs/harnesses.md`. If your harness has no subagent tool, stop and tell the user: a review in the same context is not a Goldfish review.

Execution Constraints（CRITICAL）要点：

- Artifact-First Delivery (MANDATORY)：禁止直接把大段提案、草稿、摘要或计划贴进聊天面板；必须写文件再给路径。
- Plain-English Standard：概念简报、摘要与交流用简单直接的平实英文；禁止空泛宣传形容词（seamless、robust、blazingly fast）与装饰副词（seamlessly、effortlessly、literally、drastically、obviously）。
- Default to Stress-Testing：不默认同意；主要指令是压力测试。
- No Glazing：禁止把观点称作 great、brilliant、smart。
- Critique First：即使观点强，先讲错、缺、险，再讲优点。
- Reject Echo-Chamber Framing：不把用户的框套回来。
- Generate Counter-Arguments：每个策略都要列用户没看到的、最强反方论证、反方是否成立。
- Earn Your Agreement：只在经受严格客观审查后同意。
- Banned Adjectives：禁止 brilliant、great、smart、correct、perfect、excellent、spot-on。
- Banned Apologies：被质疑或纠正时禁止 polite apologies，直接给修正后的技术逻辑或权衡。
- Interaction Invariants：交互门必须是单问题、单工具调用、无 (Recommended) 前缀。

五阶段与产物（Subflow: Uninterrupted Full Flow）：

- Step 5（Initial Zoom Out）：`egm-synthesizer` + `[egm-zoom-out, egm-inventive-catalyst]` on full file → `zoom_out_report.md`
- Step 6（Comprehension Test）：`egm-comprehension` 直派（不用 synthesizer，保留 paraphrase）on FeatureRange & DetailedRange → `comprehension_report.md`
- Step 7（Critic Review）：`egm-review-loop` in-thread on FeatureRange with `[egm-design, egm-structural, egm-style]` → `critic_report.md`
- Step 8（Intermediate Zoom Out）：同 Stage 5 子流程，加 `intermediate_zoom_out_report.md`
- Step 9（Implementation Readiness Test）：`egm-review-loop` on DetailedRange with `[egm-implementation-readiness, egm-codebase-details, egm-style]` → `implementation_readiness_report.md`
- 跨阶段合并：按 🔴 Blocker / 🟡 Major / 🟢 Nit 汇总，构建 Traceability Matrix，写 `consolidated_review_report.md`

预设（Step 2）：

- 0 Interactive review with all review rubrics（step-by-step, check in after each review）
- 1 Consolidated report with all review rubrics（runs full flow without stopping）
- 2 Feature spec only（evaluate design without considering implementation）
- 3 Implementation plan only（evaluate design for implementation readiness）

语义切分（Step 3）：以 `## Detailed Implementation Plan`（或 Implementation Plan / Work Breakdown / Implementation Steps）为边界，上为 FeatureRange（1..L-1）、下为 DetailedRange（L..End）。

## .claude-plugin/agents/design_critic.md 摘录

frontmatter：

```yaml
name: egm-design
description: Architecture and design critic.
license: Apache-2.0
tools: [Read, Grep, Glob]
model: inherit
color: yellow
omitClaudeMd: true
```

正文：

> Read `${CLAUDE_PLUGIN_ROOT}/agents/design_critic.md` before reviewing. Follow that canonical persona's instructions. This adapter defines your Claude tool and context restrictions. Resolve bundled standards against `${CLAUDE_PLUGIN_ROOT}`. Remain read-only and use only the task and explicitly supplied review context. Before returning findings, read the target and every supplied standard. If a required file cannot be read, report an incomplete review instead of a verdict.

## AI_POLICY.md 摘录

> We encourage using AI tools when developing changes for our codebase. However, purely autonomous contributions are not accepted; human contributors must review, understand, and explain every submitted change.

Operational Rules：

1. Human Accountability：Every pull request must have a human author who has personally reviewed, tested, and verified every line of changed code.
2. Interactive Code Review：Contributors must directly defend their changes in review. Copying maintainer review comments into an LLM and pasting unverified model responses back into review threads is prohibited.
3. EGM Design Requirement & Two-Stage Alignment：Contributors planning features or large changes (`> 100` non-test lines or `>= 3` core files in `skills/` or `agents/`) should reach out via Feature Inquiry Issue（`design-ready`），再提交并合并一份用 `/egm-brainstorm`、`/egm-draft`、`/egm-review` 创作的 `docs/designs/<name>.md`（`pr-ready`），最后提交实现 PR。
4. No Artificial PR Splitting：Do not artificially split a single logical feature or refactoring into multiple smaller pull requests (e.g., two 60-line PRs) to bypass the 100-line scope threshold.

## Scorecard（2026-11-13 快照，OpenSSF Scorecard API）

- date: 2026-11-13T16:08:37Z
- repo commit: 964a4f1ecd333961375c35cb37ed09364dab5e4e
- scorecard version: v5.6.0
- overall: 6.7

逐项分数（完整 17 项）：

- Dependency-Update-Tool: 10（update tool detected；Dependabot: .github/dependabot.yml:1）
- Code-Review: 10（all changesets reviewed）
- Dangerous-Workflow: 10（no dangerous workflow patterns detected）
- Binary-Artifacts: 10（no binaries found in the repo）
- Maintained: 0（project was created within the last 90 days. Please review its contents carefully；Warn: Repository was created within the last 90 days.）
- Packaging: -1（packaging workflow not detected；Warn: no GitHub/GitLab publishing workflow detected.）
- Token-Permissions: 10（GitHub workflow tokens follow principle of least privilege；Warn: jobLevel 'contents' permission set to 'write': .github/workflows/release.yml:86；其余 14 条 Info 均为 read/none）
- Pinned-Dependencies: 5（dependency not pinned by hash detected -- score normalized to 5；Warn 7 条 pipCommand not pinned by hash：cursor-native.yml:39、release.yml:42、release.yml:43、tests.yml:78、tests.yml:79、tests.yml:105、tests.yml:106；Info: 29/29 GitHub-owned GitHubAction pinned、1/1 third-party pinned、0/7 pipCommand pinned、3/3 npmCommand pinned）
- CII-Best-Practices: 0（no effort to earn an OpenSSF best practices badge detected）
- Vulnerabilities: 10（0 existing vulnerabilities detected）
- SAST: 0（SAST tool is not run on all commits -- score normalized to 0；Warn: 0 commits out of 30 are checked with a SAST tool）
- License: 10（license file detected；FSF or OSI recognized license: Apache License 2.0）
- Fuzzing: 0（project is not fuzzed；Warn: no fuzzer integrations found）
- Branch-Protection: 6（branch protection is not maximal on development and all release branches；Warn: required approving review count is 1 on branch 'main'；Warn: no status checks found to merge onto branch 'main'；其余 Info 均满足）
- Signed-Releases: 0（Project has not signed or included provenance with any releases.；Warn 4 条：v0.1.1 not signed、v0.1.0 not signed、v0.1.1 no provenance、v0.1.0 no provenance）
- Security-Policy: 10（security policy file detected；Info: github.com/google/.github/SECURITY.md:1）
- CI-Tests: 10（30 out of 30 merged PRs checked by a CI test -- score normalized to 10）
- Contributors: 10（project has 3 contributing companies or organizations -- score normalized to 10；Info: GoogleCloudPlatform, google, techup labs）

## releases 与标签（gh api，2026-11-14 采集）

- v0.1.1：published 2026-11-06T21:50:31Z；assets：egm-claude-0.1.1.zip（198 下载，124 KB）、egm-openai-0.1.1.zip（140 下载，107 KB）、SHA256SUMS（101 下载，0 KB）
- v0.1.0：published 2026-10-27T07:46:34Z；assets：egm-claude-0.1.0.zip（182 下载，112 KB）、egm-openai-0.1.0.zip（156 下载，95 KB）、SHA256SUMS（79 下载，0 KB）
- tags：v0.1.1、v0.1.0
- 无签名、无 provenance 资产。

## 相关 issue 正文摘录

issue #237（open，标题未取，正文首段）：

> A Goldfish reviewer starts with no project context beyond what the review task passes it. That's what Claude Code does: the adapters set `omitClaudeMd: true`, and I confirmed a reviewer there sees no `CLAUDE.md` (user or project).
>
> On Codex and Antigravity, reviewers don't see the parent conversation (good), but the host still injects instruction files into them:
> - Codex：the project `AGENTS.md` and the user-level `~/.codex/AGENTS.md`, even with `fork_turns: "none"`
> - Antigravity：the project `AGENTS.md` and `GEMINI.md`
>
> Why it matters: these files often hold the team's assumptions about the system ("we always use X", "Y is out of scope"). A reviewer that starts with them is reviewing with the same assumptions...

issue #439（open，正文首段）：

> `_neutralize_bare_mentions` in `.github/scripts/review_pr.py` is the guard that wraps bare `@user`/`@org/team` mentions in backticks before a PR-review comment is posted, so the bot's own comment can't be used to ping someone who isn't actually relevant to the PR. It worked by splitting the comment on single backticks and skipping every other segment (treating those as inline code). That split ran before any fenced-code-block handling. A single stray, unpaired backtick inside a fenced block pairs with an unrelated backtick later in the same comment. Everything between those two backticks, including a real bare `@mention` sitting between them, gets misclassified...

issue #423（open）：Protect release tags and publish provenance with release assets。

> docs/releases.md says a release tag must never move and that published artifacts must not change under the same tag. Today that is a convention only: The repository has one ruleset and it targets the default branch. No rule stops a `v*` tag from being moved or deleted. Immutable releases are off. `v0.1.1` reports `isImmutable: false`.

issue #426（closed）：Publish the provenance bundle with release assets。

> The release workflow already attests the two runtime ZIPs, but the attestation bundle never reaches the release. The release carries only the ZIPs and `SHA256SUMS`, so OpenSSF Scorecard scores Signed-Releases 0 ("release artifact does not have provenance"). This change attaches the bundle to the draft release as `egm-<tag>.intoto.jsonl`...

## 贡献者与提交（gh api，2026-11-14 采集）

contributors per_page=8：

- n3wth：123
- dependabot[bot]：10
- briansuchy：6
- atrearyan：5
- YashDayani：5
- jpettitt：5
- mohabfekry：5
- atrearyanuf：3

最近 30 条提交的 author/committer/日期/消息（节选，来自 commits 接口）：

- Oliver Newth / GitHub / 2026-11-13 / Align the explainer section with the two-column page grid (#432)
- Oliver Newth / GitHub / 2026-11-12 / Publish the provenance bundle with release assets (#426)
- Oliver Newth / GitHub / 2026-11-12 / Add OpenSSF Scorecard workflow (#425)
- n3wth / GitHub / 2026-11-11 / Delete committed Claude runtime before release branch exists (#393)
- briansuchy / GitHub / 2026-11-10 / Add Stage-1 GitHub Actions PR triage review and gate CODEOWNERS (#380)
- dependabot[bot] / GitHub / 2026-11-09 / build(deps-dev): bump pytest from 8.3.5 to 9.0.3

PR #432 单条核实：merged_by = n3wth。PR 列表接口的 `merged_by` 字段统一返回 null。

## star 枚举失败记录

- REST `repos/.../stargazers?per_page=100`（Accept: application/vnd.github.star+json）返回 404。
- GraphQL `repository(owner, name) { stargazerCount stargazers(first: 5) { edges { starredAt } } }` 查询成功但 `edges` 为空。
- 结论：当前凭据无法枚举 stargazer 列表，star 时间序列与账号年龄分布未核实。

## 采集工具与命令

`gh api repos/google/elephant-goldfish-model`、`gh api .../commits`、`gh api .../pulls`、`gh api .../issues`、`gh api .../contributors`、`gh api .../releases`、`gh api .../git/trees/main?recursive=1`、`gh api .../issues/237`、`gh api .../issues/439`、`gh api .../issues/423`、`gh api .../issues/426`；raw.githubusercontent.com 直读；OpenSSF Scorecard API `https://api.securityscorecards.dev/projects/github.com/google/elephant-goldfish-model`。
