# Hosted Agents vs Self-Hosted Agents：来源摘录

> Source: Meta Newsroom; Meta AI Research; xAI/Cursor Grok Bot documentation; OpenAI ChatGPT Dots; Nous Research Hermes documentation; OpenClaw documentation; XDA Developers
> Collected: 2026-10-14
> Published: 2026-09-08 for Meta Muse; Unknown for other pages

## Meta Muse

Source: https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/

Published: September 8, 2026.

> Muse is a personal AI agent. It doesn’t just answer questions, it actually does the work. It helps people stay on top of things, takes tasks and projects off their plate, and turns long-term goals into action plans.

> Muse runs on Muse Secure VM, a dedicated secure computer with its own browser, and can work on a person’s behalf across the apps they use daily, learning from conversations, reflecting on what matters to them, and getting sharper along the way.

> Each person stays in control of their Muse and decides how much access it gets.

> For tasks that take more time, Muse keeps working after people close the app, and comes back when something changes or when it needs approval, like before it sends an email or makes a purchase.

> When it comes time to pay, Muse can checkout with Link built by Stripe ... Link’s wallet for agents generates a one-time-use card so your real card details stay hidden.

> Later this year, Meta will introduce Muse Confidential VM, where the whole VM, including a person’s data and conversations with Muse, is encrypted with a key only they hold, so not even Meta can access it.

## Meta Muse security details

Source: https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse

Published: September 8, 2026.

> You and your Muse share your own dedicated computer in the cloud. This is where your Muse lives and where all data and credentials for any service you connect are securely stored.

> Each Virtual Machine(VM) is an isolated linux box with a browser and enough storage, CPU, and memory to do real work — like compiling code the agent writes, developing custom skills and handling concurrent sub-agents and crons.

> Sentinel is the sole permission authority for connector actions and network egress.

> The agent never sees real tokens, which means any attempt to coerce the agent to reveal the actual secrets via prompt-injection or otherwise is futile.

> Muse has a real up-to-date Chromium based browser running behind a virtualization layer. Users can see what Muse is doing in the browser and take over at any time.

> Muse Confidential VM is intended to cryptographically and verifiably prevent Meta from accessing data in your VM. ... plan to deliver this capability later this year.

The security page also states that Muse can make mistakes, prompt injection remains an open problem, and the described architecture is the launch architecture.

## Grok Bot

Source: https://docs.x.ai/grok-bot/overview

> Grok Bot gives you Bots you can keep around: AI teammates with names, jobs, and context that compounds over time.

> Each Bot works on a persistent cloud computer with a browser, filesystem, and terminal, so tasks finish in your real tools instead of as chat drafts.

> Grok Bot runs on macOS, Windows, Linux, iOS, and Android, and is included with every paid individual Cursor plan and with the Cursor Teams plan. You can also link an individual SuperGrok, SuperGrok Plus, or SuperGrok Heavy subscription.

> Each Bot has a computer. Your Bots run on a persistent cloud computer with a browser, filesystem, and terminal.

> Bots coordinate with each other. Your Bots can run in parallel, message each other, share context in group chats, and pass ownership of a task.

> Bots learn workflows from demonstration. Walk a Bot through a multi-step path once, and it can save the path as a skill and rerun it on a schedule.

> Context compounds. A named Bot keeps its memory, files, browser sessions, and preferences across sessions instead of resetting on every task.

> All of your Bots use the same cloud computer, sharing its files, browser sessions, and app logins ... the computer belongs to your account, not to an individual Bot.

> A site can still block automation, expire a session, or require a human step. The Bot hands those steps to you rather than working around them.

## OpenAI Dots

Source: https://chatgpt.com/features/dots/

Page title: Dots: Always-on agents built to handle everything | ChatGPT.

The page metadata describes Dots as agents that learn priorities, take on ongoing tasks, and keep making progress between conversations.

## Dots and OpenClaw user comparison

Source: https://www.xda-developers.com/openais-dots-gave-me-what-wanted-from-openclaw-without-the-hassle/

The article is an individual hands-on comparison. It describes Dots as reducing setup and maintenance compared with OpenClaw, while also describing limits around inspectability and control of Dots memory. It is evidence about one user's experience, not a controlled benchmark of task success, reliability, or cost.

## Hermes skills

Source: https://hermes-agent.nousresearch.com/docs/user-guide/features/skills

> Skills are on-demand knowledge documents the agent can load when needed. They follow a progressive disclosure pattern to minimize token usage and are compatible with the agentskills.io open standard.

> All skills live in ~/.hermes/skills/ — the primary directory and source of truth. ... The agent can modify or delete any skill.

> Learning a skill from sources (/learn) is the fast way to turn something you already know ... into a reusable skill.

The page documents local skill directories, agent-created skills, external skill directories, scheduling through learned workflows, and progressive disclosure. It does not establish that Hermes has a ready-made Gmail plus Calendar workflow with approval-before-send.

## OpenClaw browser

Source: https://docs.openclaw.ai/tools/browser

> OpenClaw can run a dedicated Chrome/Brave/Edge/Chromium profile that the agent controls.

> The agent opens tabs, reads pages, clicks, and types in this isolated lane.

> The built-in user profile attaches to your real signed-in Chrome session instead, via Chrome DevTools MCP.

> This browser is not your daily driver. It is a safe, isolated surface for agent automation and verification.

The page documents browser profiles, direct tab control, clicks, typing, snapshots, screenshots, downloads, remote browsers and hosted CDP providers. It does not establish that the complete Gmail plus Calendar daily-review workflow is available without additional configuration.

