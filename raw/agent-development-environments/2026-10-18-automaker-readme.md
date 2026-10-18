# Automaker — README 关键段落摘录

> Source: https://github.com/AutoMaker-Org/automaker (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":null,"pushed":"2026-05-22T16:38:23Z","stars":3229,"url":"https://github.com/AutoMaker-Org/automaker"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

> **[!TIP]**
>
> **Learn more about Agentic Coding!**
>
> Automaker itself was built by a group of engineers using AI and agentic coding techniques to build features faster than ever. By leveraging tools like Cursor IDE and Claude Code CLI, the team orchestrated AI agents to implement complex functionality in days instead of weeks.
>
> **Learn how:** Master these same techniques and workflows in the [Agentic Jumpstart course](https://agenticjumpstart.com/?utm=automaker-gh).

**Stop typing code. Start directing AI agents.**

> **[!IMPORTANT]**
>
> **Claude Agent SDK billing changes on June 15, 2026.** If you use Automaker's **Claude** provider, agent usage moves to a separate monthly credit pool (no longer your subscription limits) that you must claim once. Other providers (Codex, Copilot, Cursor, Gemini, OpenCode) are unaffected. → [See details](#powered-by-claude-agent-sdk)

- [What Makes Automaker Different?](#what-makes-automaker-different)
  - [The Workflow](#the-workflow)
  - [Powered by Claude Agent SDK](#powered-by-claude-agent-sdk)
  - [Why This Matters](#why-this-matters)
- [Security Disclaimer](#security-disclaimer)
- [Community & Support](#community--support)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
- [How to Run](#how-to-run)
  - [Development Mode](#development-mode)
  - [Interactive TUI Launcher](#interactive-tui-launcher-recommended-for-new-users)
  - [Building for Production](#building-for-production)
  - [Testing](#testing)
  - [Linting](#linting)
  - [Environment Configuration](#environment-configuration)
  - [Authentication Setup](#authentication-setup)
- [Features](#features)
  - [Core Workflow](#core-workflow)
  - [AI & Planning](#ai--planning)
  - [Project Management](#project-management)
  - [Collaboration & Review](#collaboration--review)
  - [Developer Tools](#developer-tools)
  - [Advanced Features](#advanced-features)
- [Tech Stack](#tech-stack)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Testing & Quality](#testing--quality)
  - [Shared Libraries](#shared-libraries)
- [Available Views](#available-views)
- [Architecture](#architecture)
  - [Monorepo Structure](#monorepo-structure)
  - [How It Works](#how-it-works)
  - [Key Architectural Patterns](#key-architectural-patterns)
  - [Security & Isolation](#security--isolation)
  - [Data Storage](#data-storage)
- [Learn More](#learn-more)
- [License](#license)

Automaker is an autonomous AI development studio that transforms how you build software. Instead of manually writing every line of code, you describe features on a Kanban board and watch as AI agents powered by Claude Agent SDK automatically implement them. Built with React, Vite, Electron, and Express, Automaker provides a complete workflow for managing AI agents through a desktop application (or web browser), with features like real-time streaming, git worktree isolation, plan approval, and multi-agent task execution.

Traditional development tools help you write code. Automaker helps you **orchestrate AI agents** to build entire features autonomously. Think of it as having a team of AI developers working for you—you define what needs to be built, and Automaker handles the implementation.

1. **Add Features** - Describe features you want built (with text, images, or screenshots)
2. **Move to "In Progress"** - Automaker automatically assigns an AI agent to implement the feature
3. **Watch It Build** - See real-time progress as the agent writes code, runs tests, and makes changes
4. **Review & Verify** - Review the changes, run tests, and approve when ready
5. **Ship Faster** - Build entire applications in days, not weeks

### Powered by Claude Agent SDK

Automaker leverages the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) to give AI agents full access to your codebase. Agents can read files, write code, execute commands, run tests, and make git commits—all while working in isolated git worktrees to keep your main branch safe. The SDK provides autonomous AI agents that can use tools, make decisions, and complete complex multi-step tasks without constant human intervention.

> **[!IMPORTANT]**
>
> **Claude Agent SDK billing change (effective June 15, 2026)**
>
> This applies **only to Automaker's Claude provider**, which is built on the Claude Agent SDK. If you run agents with other providers (Codex, Copilot, Cursor, Gemini, OpenCode), they are billed through those services and are unaffected. Anthropic is moving programmatic Agent SDK usage out of your normal subscription rate limits and onto a **separate, dollar-denominated monthly credit pool**. Interactive use (Claude.ai chat, Claude Code in your terminal/IDE) keeps using your existing subscription limits, but the Agent SDK, the `claude -p` command, and apps built on it like Automaker draw from this new credit instead.
>
> - **Monthly credit by plan:** Pro `$20`, Max 5x `$100`, Max 20x `$200` (Team Standard `$20`, Team Premium `$100`, Enterprise `$20–$200`). Credit is metered at standard API rates, refreshes each billing cycle, and does **not** roll over.
> - **You must claim the credit once.** It is a one-time opt-in through your Claude account; after that it refreshes automatically each cycle. Team/Enterprise admins receive instructions by email, and each member claims their own credit.
> - **When the credit runs out:** Further Agent SDK usage either flows to usage credits at standard API rates (only if you have usage credits enabled) or stops until the credit refreshes.
>
> See Anthropic's [official guidance](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan) for the authoritative details.

The future of software development is **agentic coding**—where developers become architects directing AI agents rather than manual coders. Automaker puts this future in your hands today, letting you experience what it's like to build software 10x faster with AI agents handling the implementation while you focus on architecture and business logic.
