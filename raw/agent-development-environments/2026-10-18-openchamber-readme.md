# OpenChamber — README 关键段落摘录

> Source: https://github.com/openchamber/openchamber (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"Agentic Development Environment based on OpenCode AI agent","pushed":"2026-10-18T14:14:06Z","stars":11783,"url":"https://github.com/openchamber/openchamber"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

[![GitHub stars](https://img.shields.io/github/stars/openchamber/openchamber?style=flat&labelColor=100F0F&color=66800B)](https://github.com/openchamber/openchamber/stargazers)
[![GitHub release](https://img.shields.io/github/v/release/openchamber/openchamber?style=flat&labelColor=100F0F&color=205EA6)](https://github.com/openchamber/openchamber/releases/latest)
[![Discord](https://img.shields.io/badge/Discord-join.svg?style=flat&labelColor=100F0F&color=8B7EC8&logo=discord&logoColor=FFFCF0)](https://discord.gg/ZYRSdnwwKA)
[![Support the project](https://img.shields.io/badge/Support-Project-black?style=flat&labelColor=100F0F&color=EC8B49&logo=patreon&logoColor=FFFCF0)](https://www.patreon.com/openchamber)

**OpenChamber is an open-source workspace for running and reviewing AI coding work on desktop, web, VS Code, and mobile.**

Start agent work, see what changed, and take it through review and release. Your projects and sessions remain available when you switch devices or step away.

<p>
<picture><source media="(prefers-color-scheme: dark)" srcset="docs/references/mobile/new_session_dark.png"><img src="docs/references/mobile/new_session_light.png" width="30%" alt="OpenChamber mobile new session"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="docs/references/mobile/chat_dark.png"><img src="docs/references/mobile/chat_light.png" width="30%" alt="OpenChamber mobile chat"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="docs/references/mobile/context_usage_dark.png"><img src="docs/references/mobile/context_usage_light.png" width="30%" alt="OpenChamber mobile context and usage"></picture>
</p>

Give a session a finish line with **Session Goals**. OpenChamber checks the result after every turn and keeps the agent working until it completes the goal, gets blocked, or reaches the limit you set. It can continue after you close the app.

Use **Multi-run** to give the same task to up to five models, each in its own session and optionally its own worktree. See what each one actually built, choose the best result, or use **Fusion** to combine the strongest parts into a new session.

Open your app beside the conversation with **Preview**. Point at an element to send the agent its screenshot, styles, position, and browser errors. No more trying to explain "this thing here." The desktop app can do the same with any web page in its built-in browser.

Start a session from a GitHub issue or pull request with its context attached. Send failed checks or review comments back to the agent, then update or merge the pull request from OpenChamber.

Open the same projects and sessions from Desktop, Web/PWA, VS Code, iOS, or Android. Check progress, answer questions, review changes, and reattach to a running terminal.

### Track work across projects

See which sessions are working, waiting, finished, or failed, along with approvals, scheduled tasks, provider limits, token use, and costs. Organize sessions into folders and keep notes, todos, and reusable project actions nearby.

Run a prompt once, daily, weekly, or on a cron schedule. Scheduled tasks can use Session Goals, so they continue toward an outcome instead of stopping after one response.

| Surface | Role |
| --- | --- |
| **Desktop** | The complete workspace for macOS, Windows, and Linux, with multiple windows, Mini Chat, remote machines, SSH, and native notifications |
| **Web / PWA** | Open your workspace in a browser, install it as an app, and stay up to date through background notifications |
| **VS Code** | Keep sessions beside your code, send selections to the agent, open results in the editor, and compare parallel runs |
| **iOS / Android** | Review and steer work away from your desk, receive completion alerts, and use the terminal with touch controls |
| **CLI / Server** | Run OpenChamber on a workstation or server, schedule work, manage remote access, and keep it available after login |

Download the latest release from [GitHub Releases](https://github.com/openchamber/openchamber/releases/latest). Desktop bundles the matching OpenCode CLI, so no separate OpenCode installation is required.

### CLI for Web and PWA

Requires Node.js 24.14+. CLI/Web and VS Code use your installed [OpenCode CLI](https://opencode.ai).

- [Quick start](packages/docs/content/docs/quickstart.mdx)
- [Installation](packages/docs/content/docs/install.mdx)
- [Connect devices](packages/docs/content/docs/connect-devices.mdx)
- [Private Relay](packages/docs/content/docs/private-relay.mdx)
- [Multi-run](packages/docs/content/docs/multi-run.mdx)
- [Session Goals](packages/docs/content/docs/session-goals.mdx)
- [Changes Walkthrough](packages/docs/content/docs/walkthrough.mdx)
- [Preview and dev servers](packages/docs/content/docs/preview.mdx)
- [GitHub workflows](packages/docs/content/docs/github.mdx)
- [Mobile](packages/docs/content/docs/mobile.mdx)
- [Security](packages/docs/content/docs/security.mdx)
- [Troubleshooting](packages/docs/content/docs/troubleshooting.mdx)

OpenChamber is an independent project and is not affiliated with the OpenCode team.
