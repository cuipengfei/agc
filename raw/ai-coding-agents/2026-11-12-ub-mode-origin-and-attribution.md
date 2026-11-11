# ub-mode 来源、署名与提交记录

> Source: https://github.com/unclebob/ub-mode/blob/master/README.md; https://github.com/unclebob/ub-mode/blob/master/LICENSE; https://api.github.com/repos/unclebob/ub-mode/commits?per_page=100; https://github.com/unclebob/crapper/blob/master/LICENSE; https://github.com/unclebob/dryer/blob/master/LICENSE; https://github.com/unclebob/mutator/blob/master/LICENSE
> Collected: 2026-11-12
> Published: Unknown

## README 中的派生声明

`ub-mode` is an agent skill that enforces disciplined software engineering principles when writing or changing code. It is loosely based on portions of [@poteto](https://github.com/poteto)'s rules (`poteto-mode` / `pstack`), reduced and paired with deterministic quality-gate tools:

1. **First Make it Work** — Laziness Protocol, Foundational Thinking, TDD, Redesign From First Principles, Attack the Premise, Subtract Before You Add, Outcome-Oriented Execution, Build the Lever, and Architecture (Model the Domain, Boundary Discipline, Type System Discipline, Make Operations Idempotent, Separate Before Serializing Shared State).
2. **Then Make it Right** — Fix Root Causes, Sequence Work into Verifiable Units, Test Behavior (Not Implementation), [Crapper](https://github.com/unclebob/crapper) (`CRAP < 10`), [Dryer](https://github.com/unclebob/dryer) (duplication `< 0.8`), [Mutator](https://github.com/unclebob/mutator) (cover the uncovered, kill the survivors, delete dead code), and Refactoring.
3. **Practice** — Keep a Log, Guard the Context Window, Worktree Cleanup, and Commit and Push in small ordered commits.

README 的 Companion Tool Repositories 一节列出：

- [unclebob/crapper](https://github.com/unclebob/crapper) — Computes cyclomatic complexity, test coverage, and CRAP score per function so every function stays under the CRAP threshold (`< 10`).
- [unclebob/dryer](https://github.com/unclebob/dryer) — Detects structural code duplication so duplicate blocks (`>= 0.8` similarity) are eliminated.
- [unclebob/mutator](https://github.com/unclebob/mutator) — Runs mutation testing to expose uncovered code and surviving mutants that tests fail to catch.
- [unclebob/uml-viewer](https://github.com/unclebob/uml-viewer) — Visualizes components, coverage, CRAP, mutation scores, and dependency directions.

## LICENSE 署名

MIT License

Copyright (c) 2026 Robert C. Martin

## GitHub API 提交记录

请求：`GET https://api.github.com/repos/unclebob/ub-mode/commits?per_page=100`

返回数量：5。以下为返回的 SHA、提交作者、作者日期和提交标题。

| SHA | Author | Date | Subject |
|---|---|---|---|
| 3da62bf3fcfd2034de41f30d920d2739e566171f | Robert C. Martin | 2026-11-02T15:08:29Z | Add MIT license |
| 57a8bdd28e45ed41900ace0bafa2ff76dd9ed70f | Robert C. Martin | 2026-10-25T16:07:58Z | Remove crap4clj and clj-mutate references from README |
| 826dab640e2af1e16cb6a42c682bb1177aed7060 | Robert C. Martin | 2026-10-25T16:07:11Z | Note that ub-mode is loosely based on portions of @poteto's rules |
| ff4e602c321fb3ff5b74ca53c3955c4a61533fb6 | Robert C. Martin | 2026-10-25T16:05:10Z | Document companion tool repositories in README |
| 7d7720cd7a1c51863c32a028f6e987d233bc2ad6 | Robert C. Martin | 2026-10-25T16:04:08Z | Initial commit of ub-mode skill |

初始提交日期（按作者时间）：2026-10-25。完整作者时间为 2026-10-25T16:04:08Z。

## 配套工具 LICENSE 署名

三个 LICENSE 均为 BSD Zero Clause License，并含有同一署名行：

Copyright (C) 2026 by Robert C. Martin <unclebob@cleancoder.com>
