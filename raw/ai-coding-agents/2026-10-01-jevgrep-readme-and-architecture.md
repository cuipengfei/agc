# jevgrep（dzhng/jevgrep）README 与架构文档取证摘录

> Source: https://github.com/dzhng/jevgrep （README，经 GitHub API 抓取）; https://github.com/dzhng/jevgrep/blob/main/docs/architecture.md （raw 全文抓取）
> Collected: 2026-10-01
> Published: Unknown

本文件是对 jevgrep 仓库 README 与 `docs/architecture.md` 的取证摘录，只保留承重事实与逐字原文。抓取时点仓库元数据（GitHub API）：Stars: 1967 · Forks: 130 · Issues: 27；Language: TypeScript；License: MIT License。

抓取日期 2026-10-01：README 经 GitHub API 获取，架构文档经 raw.githubusercontent.com 获取。

## README 逐字摘录

### 定位与形态

"Find code by asking what it does. In our ten-task SWE-bench comparison, Jevgrep successfully completed the same 8 of 10 tasks as the baseline, at lower cost."

"Jevgrep gives them a place to start: ask a repository question, and `jg` returns relevant files, reading leads, and verbatim source excerpts in one stdout response. It uses [Jev](https://vercel.com/ai-gateway/models/jev) to judge relevance across folders, files, and declarations."

安装：`npm install -g @dzhng/jevgrep`。

"Requires Node.js 22+, macOS or Linux, and a key for Vercel AI Gateway, TypeSafe, OpenRouter, OpenCode Zen, or a custom TypeSafe-compatible endpoint. No separate Python, Bun, or ripgrep installation is required to use `jg`."

"Provider selection requires **0.3.0 or newer**."

### Skill 安装器

"Installing the CLI alone does not teach your coding agent to use it. **Install the skill as well**, from the project where your agent works: `jg skill`"

"The installer detects your coding agents (Claude Code, Codex, OpenCode and others) and asks where to install. Add `--global` for a user-wide install, or `--yes` for unattended installation."

"`jg skill` delegates to the [skills CLI](https://github.com/vercel-labs/skills) and needs npm/npx plus network access."

### 检索行为描述

"Jevgrep explores the repository hierarchy and follows qualifying branches. It selects files using content previews, then identifies useful source units and surrounding context. It keeps qualifying file locations even when it cannot confidently return an excerpt; it does not force every search into a fixed top-two list."

"The summary and compact file list come first, followed by selected source with line references, then detailed declaration and call locations. Python, TypeScript/JavaScript, Go and Rust support declaration parsing; other text uses a fallback. The output is evidence for the agent to use, not a generated answer or a guarantee that every relevant file was found."

"When you already know an exact symbol or path, a direct read or `rg` search may be all you need. Jevgrep is most useful for questions that span unfamiliar files."

### 基准声明（README 自报）

"**Same intelligence, ~30% lower coding-agent cost.** Both Jevgrep and the no-Jev baseline solved **8/10 tasks**. Full Sol cost fell from **$7.62 to $5.44**—a measured **28.6% reduction**, rounded to ~30%—including failed attempts and excluding Jev cost."

"This comparison uses ten tuned Python SWE-bench tasks, one frozen installed package and the exact public skill in this repository. It measures task success and cost, not a speed improvement or guaranteed savings on every repository."

"The [0.4.3 total-cost rerun](evals/results/total-cost-2026-09-28.md), including Jev, measured **25.8% lower total cost with the same 8/10 tasks solved**. The older ~30% graphic above reports Sol-only cost."

"The [0.5.0 evaluation](evals/results/combined-cost-research-2026-09-28.md) retained 8/10 solves while reducing native Jev cost by about 59% versus that 0.4.3 run. Combined Sol-plus-Jev cost was 2–3% higher, accepted as a small tradeoff for this release. These single-run observations do not establish statistical equivalence or a speed improvement."

### 凭据与本地状态

"Searches send eligible source content to Jev through the provider selected during auth. Default filesystem filtering respects ignore files and excludes hidden, dependency/build, binary, and obvious credential files. These filters are not a guarantee that all sensitive information has been removed; choose a search root you intend to send."

"`jg auth` asks for your provider, then saves its key in an owner-only config file. Re-running auth replaces that setup; searches always use the saved provider. `jg doctor` checks it with synthetic input. Existing saved keys without a provider remain Vercel keys. Environment-based credentials and endpoint overrides are not used; run `jg auth` if you previously relied on them."

"Evaluation answers are cached locally by default. The CLI writes its output to stdout and does not create report files."

## docs/architecture.md 逐字摘录

### 遍历与候选产生

"Hierarchical traversal uses directory metadata and content previews to decide where to explore. It does not upload the entire tree first. Keep files that pass relevance criteria without a fixed top-N limit. Weak positive navigation floods without strong evidence are suppressed. Navigation estimates alone do not justify an unbounded search: a navigation byte budget applies until source selection has confirmed useful code."

"Reaching the budget reports incomplete discovery so the caller can narrow the root."

"A healthy negative file preview does not trigger an exhaustive scan of unseen source. This limits upload cost but can miss relevant code later in a file. Completion means the planned search finished, not that every relevant byte was found."

"A relationship pass can recover implementations of the same class contract across platforms."

"Contextual follow-up can recover concretely referenced code and retract earlier selections when valid evidence rejects them. A failed judgment must not erase previously obtained evidence."

### 解析

"Python, Go and Rust use packaged Tree-sitter WASM grammars in a shared cancellable worker. This avoids a Python installation requirement and the startup cost of embedding an interpreter. TypeScript/JavaScript use the TypeScript compiler parser; other eligible text remains searchable through bounded chunks."

### Provider

"The core owns traversal, source eligibility, evaluation and cache identity. Native state and question objects pass through the AI SDK; source text is a field inside those objects. Provider selection changes transport and authentication, not retrieval semantics."

## 未覆盖（本轮未做）

- 未本机安装、未注册、未调用任何端点；`packages/core/src/retrieve.ts` 等源码未逐行核对。
- README 基准声明未独立复验。
- 请求 body 的逐字段形状（是否有波次字段等）未验证。
