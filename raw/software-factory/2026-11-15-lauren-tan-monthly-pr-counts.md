# Lauren Tan 每月 PR 数量的公开说法核对摘录

> Source: https://x.com/mvanhorn/article/2111481455906103390; https://thenewstack.io/agentic-verification-distributed-systems; https://developer.tenten.co/pstack-verification-agent-merge; https://www.youtube.com/watch?v=6hxp0SpGxz8
> Collected: 2026-11-15
> Published: Unknown（各来源 2026-08-31 至 2026-10-10 不等，mvanhorn 长文与 tenten 页未标注日期）

本文件摘录各来源关于 Lauren Tan（poteto，SpaceXAI Grok 团队）每月 PR 数量的原文，用于核对 distort《Verification Engineering》一文中的「merged PRs going from 809 to 10,926 a month」说法。

## distort 文章中的说法（2026-11-12）

That's how she showed her merged PRs going from 809 to 10,926 a month, the agents didn't get smarter, the checks got longer

## Matt Van Horn X 长文（mvanhorn/article/2111481455906103390）

标题：Who Is Lauren Tan, aka Poteto? The Architect Behind Grok Bot, and the Engineer Elon Keeps Reposting

第 7 节「2,500 PRs and the trust curve」：

On September 21 she posted the talk that made her famous outside the AI crowd. It was supposed to be her talk at Cursor Compile London. She skipped the event to run a Grok Bot livestream, so she put the talk on X for free instead.

It is her most-liked post ever: 18,484 likes and 3,944,957 views. The PR counts are her own: about 1,000 in July, about 2,000 in August by the talk, and 2,500 in the post. She is careful to say she never set out to hit a number. The talk is really about trust.

## The New Stack（agentic-verification-distributed-systems）

Lauren Tan, an engineer on the Grok team at SpaceXAI, who previously worked at Cursor and Meta, recently published a guide to her personal agent workflow: pstack. The attention-grabbing number is that pstack has let her ship 2,000 pull requests (PRs) a month to production with high confidence. That's one engineer shipping nearly 100 PRs per working day.

## tenten 汇总（pstack-verification-agent-merge）

表格逐项：

| Figure | Value | Source and date |
| --- | --- | --- |
| Guide, Part 1 | Roughly 2,000 PRs a month | Lauren Tan via The Neuron, August 31, 2026 |
| Talk title | 2,500 PRs in a month | Lauren Tan, September 21, 2026 |
| August close | 2,462 PRs | The Neuron, September 10, 2026 |
| Interview wording | "2,000 or however many" | Matt Pocock interview, October 2, 2026 |

Tan posted the talk behind the number on September 21, 2026, under the title "how i shipped 2,500 PRs last month to production", so the month in question is August. The Neuron, in a September 10, 2026 explainer, cites her own guide for a more exact 2,462 PRs in production for August. Tan's own guide (Part 1, August 31, 2026) put it at roughly 2,000 PRs a month, according to The Neuron, and several summaries repeat that figure. In the interview she is looser still, saying "2,000 or however many." Nobody outside her team has audited any of these counts.

## YouTube 访谈（6hxp0SpGxz8，2026-10-10 发布）

Description 引文：

"Right now, I'm running 30+ agents in a loop with /pstack. I shipped 1,000 PRs last month—and this month, I'll 2x that."

Transcript [39:15]：

"the obvious thing people ask me when when they when I tell them, 'Oh, I shipped 2,000 and 2,500 pull requests last month.'"

Transcript [0:38]：

"2,500 PRs last month to production got about 3 million views or something on X"
