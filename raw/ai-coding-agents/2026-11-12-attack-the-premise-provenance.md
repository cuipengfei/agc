# Attack the Premise 的提交历史与来源检索

> Source: https://github.com/cursor/plugins/pull/329; https://github.com/cursor/plugins/pull/633; https://api.github.com/repos/cursor/plugins/commits?path=pstack/skills/principle-attack-the-premise/SKILL.md&per_page=100; https://github.com/cursor/plugins/blob/main/pstack/skills/principle-attack-the-premise/SKILL.md; grep.app 与网页搜索查询记录（见正文）
> Collected: 2026-11-12
> Published: Unknown

## PR #329：新增原则文件

URL：https://github.com/cursor/plugins/pull/329

- State: MERGED
- Author: @poteto
- Created: 2026-09-07T21:33:38Z
- Updated: 2026-09-07T22:14:15Z
- Title: pstack: density and mannered-prose pass across the skills, two new principle leaves

PR 正文 Why：

Every pstack skill loads into the agent's context. This pass removes the prose that carried no instruction and adds two principle leaves that earned their place in evals.

PR 正文 Scope 中的相关项：

- New leaves `principle-attack-the-premise` and `principle-test-behavior-not-implementation`, registered in the mode skill, README, and guide.

文件清单：

- `pstack/skills/principle-attack-the-premise/SKILL.md` [ADDED] (+23 -0)

对应的文件历史提交：

| SHA | Author | Date | Subject |
|---|---|---|---|
| e8d856f0273b42ebafe0ec3546bd645709e7c1b0 | lauren | 2026-09-07T22:14:11Z | pstack: density and mannered-prose pass across the skills, two new principle leaves (#329) |

该提交中的 `pstack/skills/principle-attack-the-premise/SKILL.md` 状态为新增，additions 为 23，deletions 为 0。

## PR #633：修改原则表述

URL：https://github.com/cursor/plugins/pull/633

- State: MERGED
- Author: @poteto
- Created: 2026-10-15T01:50:23Z
- Updated: 2026-10-18T19:50:15Z
- Title: pstack: restate four overspecified principles as reasoning, not rules

PR 正文对 `principle-attack-the-premise` 的说明：

**`principle-attack-the-premise`**. "Take a census of which actors hold the imbalance" became "find an observation that would come out differently if the premise were false". The census was one example of that test. It does not fit failures that are not distributed by actor, for example failures distributed by time of day.

文件清单：

- `pstack/skills/principle-attack-the-premise/SKILL.md` [MODIFIED] (+6 -8)

对应的文件历史提交：

| SHA | Author | Date | Subject |
|---|---|---|---|
| e5136d82418d2db3165ea1050d17577cd618cc05 | lauren | 2026-10-15T05:36:44Z | pstack: restate four overspecified principles as reasoning, not rules (#633) |

PR #633 的创建日期与上述修改提交日期均为 2026-10-15。

## 当前上游文件

URL：https://github.com/cursor/plugins/blob/main/pstack/skills/principle-attack-the-premise/SKILL.md

```markdown
---
name: principle-attack-the-premise
description: "Apply when two or more fixes that share one premise have failed the same gate. Write the premise down and test it directly before you write another fix that assumes it."
disable-model-invocation: true
---

# Attack the Premise

When two or more fixes that share one premise have failed the same gate, suspect the premise, not the fixes.

**Why:** Each failed fix is evidence against the belief it assumed. A third fix on the same premise spends effort where the evidence already says the cause is not.

**Pattern:**
- **Write the premise down.** The premise is the one sentence that every failed fix assumed.
- **Test the premise before the next fix.** Find an observation that would come out differently if the premise were false, and make it. Look at how the failures are distributed, not only at how large they are. Make the check rerunnable per [Build the Lever](../principle-build-the-lever/SKILL.md).
- **Follow the evidence.** If it contradicts the premise, the cause is elsewhere. Look for what the failures have in common that the premise did not predict. If it confirms the premise, ask the next "why" per [Fix Root Causes](../principle-fix-root-causes/SKILL.md). The earlier fixes may have treated a consequence instead of the cause.
- **Remove the condition instead of compensating for it**, per the [Laziness Protocol](../principle-laziness-protocol/SKILL.md). If the evidence shows that one part always lands on the losing side, change what puts it there. A mechanism that cleans up after it leaves the cause in place and adds work on every run.

**Stop:** Do not start the next fix before the premise is written down and tested.

This principle is distinct from [Redesign from First Principles](../principle-redesign-from-first-principles/SKILL.md), which rebuilds a design around a new requirement. It questions a fact the current design assumes.
```

## 上游原则文件的归属检索记录

工具：grep.app GitHub 搜索。

- repo：`cursor/plugins`
- path：`pstack/skills/principle-`
- query：`(?i)(https?://|inspired by|based on|credit:)`
- useRegexp：`true`
- 结果：`No results found for your query.`

## 网页搜索记录一

查询：`"Attack the Premise" software engineering debugging principle`

返回的前 10 条标题与 URL：

1. `principle-attack-the-premise: Diagnose repeated fix failures ...` — https://skills.rest/skill/principle-attack-the-premise-igorganapolsky
2. `Principle Attack The Premise (Grade A) - Claude Skill` — https://www.skillsdirectory.com/skills/jaydubya818-principle-attack-the-premise
3. `principle-attack-the-premise: Diagnose failed fixes ...` — https://skills.rest/skill/principle-attack-the-premise-shtian
4. `Notes` — https://acairns.co.uk/notes
5. `plugins/pstack/skills/poteto-mode/SKILL.md at main` — https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md
6. `Jane Street Software Engineer Interview Guide` — https://prachub.com/interview-guide/jane-street-software-engineer-interview-questions-guide-2026
7. `ub-mode is an agent skill ...` — https://www.facebook.com/githunt/posts/ub-mode-is-a-free-self-hosted-alternative-to-sonarqubes-paid-code-quality-checks/122130030345471310/
8. `Poteto Mode - AI Skill for Any LLM` — https://www.typingmind.com/skills/cursor-poteto-mode
9. `backnotprop/pstack agent skills - QAI` — https://qai.io/skills/backnotprop/pstack
10. `ai` — https://acairns.co.uk/tags/ai

## 网页搜索记录二

查询：`"Attack the Premise" before:2026-09-07`

返回的前 10 条标题与 URL：

1. `Quick weakening/attack premises question` — https://7sage.com/discussion/16804/quick-weakening-attack-premises-question
2. `CMV: Most of the time, it's ineffective to attack the premises ...` — https://www.reddit.com/r/changemyview/comments/19am96e/cmv_most_of_the_time_its_ineffective_to_attack_the_premises/
3. `Are answers that attack the premise or conclusion always` — https://forum.powerscore.com/viewtopic.php?t=15229
4. `How to Weaken LSAT Arguments` — https://7sage.com/blog/weaken-lsat-arguments
5. `Effective Arguing; Beware of Logical Red-Herrings` — https://opexsociety.org/founders-desk/effective-arguing-beware-of-logical-red-herrings/
6. `If someone doesn't agree with the premise of your question ...` — https://www.quora.com/If-someone-doesnt-agree-with-the-premise-of-your-question-then-why-dont-they-ignore-or-assume-the-premise-to-be-true-instead-of-attacking-the-premise-and-answering-a-different-question-that-wasnt-what-you-were
7. `LSAT LR Flashcards` — 搜索结果只返回搜索跳转地址，未取得可长期引用的目标网址
8. `Debate tips: Focus on the premise, not the person` — https://www.facebook.com/mediummarkanthony/posts/debate-should-be-business-and-not-become-personal-soattack-the-premisenot-the-pe/10212640524562226/
9. `Are We There Yet? Timing and Floating-Point Attacks on ...` — 搜索结果只返回搜索跳转地址，未取得可长期引用的目标网址
10. `Fox's Andy McCarthy: “We really have to attack the premise ...` — 搜索结果只返回搜索跳转地址，未取得可长期引用的目标网址

该次查询的原始结果对第 7、9、10 条给出带搜索会话标识的跳转地址，已移除；这些目标网址的当前页面分别返回 HTTP 403、HTTP 418 与 HTTP 404，无法核实，因此不记录 URL。
