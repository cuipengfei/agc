# Jean — README 关键段落摘录

> Source: https://github.com/coollabsio/jean (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"A dev environment for AI agents.","pushed":"2026-10-18T13:41:30Z","stars":1339,"url":"https://github.com/coollabsio/jean"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

A dev environment for AI agents. Run Claude, Codex, Cursor, OpenCode, Pi, Command Code, Grok, Kimi Code, and Antigravity in parallel - each in its own git worktree - on your laptop or your own server.

## About the Project

Jean is an opinionated AI agent workspace. It has strong opinions about how AI-assisted development should work: every task gets its own git worktree, agents run in parallel, and git work, reviews, terminals, and GitHub, Linear, and Sentry integrations live in one cohesive workflow.

Run it as a native desktop app, as a headless `jean-server` on Linux, or both: the desktop app shows local and remote projects together in one sidebar, grouped by server.

<p align="center"><img src="screenshots/worktrees.webp" width="820" alt="Project view with worktrees, linked pull requests, diff stats and labels" /></p>

<table>
<tr>
<td><img src="screenshots/recent-sessions.webp" width="400" alt="Recent tab with sessions from many projects, next to parallel session tabs" /><br /><sub><b>Recent sessions & parallel agents</b></sub></td>
<td><img src="screenshots/terminal.webp" width="400" alt="Terminal panel next to an agent session" /><br /><sub><b>Built-in terminal</b></sub></td>
</tr>
<tr>
<td><img src="screenshots/diff-review.webp" width="400" alt="Split diff viewer with a file list" /><br /><sub><b>Diff review with line comments</b></sub></td>
<td><img src="screenshots/magic-commands.webp" width="400" alt="Magic command palette" /><br /><sub><b>Magic commands</b></sub></td>
</tr>
<tr>
<td><img src="screenshots/magic-prompts.webp" width="400" alt="Magic Prompts settings with backend, model, reasoning and mode" /><br /><sub><b>Magic prompts</b></sub></td>
<td><img src="screenshots/issues.webp" width="400" alt="New session dialog with open GitHub issues" /><br /><sub><b>Start from an issue, PR, Linear or Sentry</b></sub></td>
</tr>
</table>

- **Project & Worktree Management** - Multi-project support, linked projects for cross-project context, git worktree automation (create, archive, restore, delete), worktree labels and filters, custom project avatars
- **Session Management** - Multiple sessions per worktree, Recent tab across all projects, execution modes (Plan, Build, Yolo) with plan approval flows, `/goal` tracking, session recap/digest, saved contexts with AI summarization, archiving with retention settings, recovery, auto-naming, canvas views
- **AI Backends** - Claude, Codex, Cursor, OpenCode, Pi, Command Code, Grok, Kimi Code, and Antigravity (beta). Model selection and thinking/effort levels with per-mode overrides, MCP server support, multi-agent collaboration, file picker & image attachments, chat search, notification sounds, custom system prompts, custom CLI profiles
- **Magic Commands & Prompts** - Investigate issues/PRs/workflows/security alerts, code review with finding tracking, AI commit messages, PR content generation, merge conflict resolution, release notes generation; every prompt is editable with its own backend, model, effort, and mode
- **Mr. Robot (beta)** - Polls open GitHub issues, creates one worktree per issue, drafts a plan, and can execute approved plans
- **Integrations** - GitHub (Issues, PRs, Security Alerts, Advisories, Dependabot, checkout PRs as worktrees, auto-archive on merge), Linear, Sentry, CodeRabbit
- **Developer Tools** - Multi-dock terminal (floating, left, right, bottom), built-in browser (desktop app), command palette, open in editor (Zed, VS Code, VSCodium, Cursor, Xcode, IntelliJ), git operations (status, stash, revert, fetch/merge with conflict detection), diff viewer (unified & side-by-side) with line comments, file browser with preview and editing (`Cmd/Ctrl+Shift+B`), usage and token tracking
- **Opinionated Plugins** - One-click RTK (cuts tool-output tokens 60-90%) and Caveman (terse Claude replies)
- **Local + Remote** - Add any number of `jean-server` instances to the desktop app (or install one over SSH); their projects appear next to your local ones and every action runs on the server that owns the project
- **Web Access** - Every Jean instance (desktop or headless server) can serve the full UI over HTTP/WebSocket with token auth, including on phones
- **Customization** - Themes (light/dark/system), custom fonts, configurable keybindings, mobile swipe gestures

## Web Access

Every Jean instance can run **Web Access**: an embedded HTTP + WebSocket server
that serves the same UI in a browser. That applies to both:

| Mode | How you get Web Access |
| --- | --- |
| **Native desktop** (macOS / Windows / Linux) | Settings → **Web Access** - enable the HTTP server, set port/bind address, copy the token URL |
| **Headless server** (`jean-server`) | Always on - the process *is* the Web Access endpoint |

Web Access binds a normal TCP port (default **3456**). For access beyond the
local machine, prefer a private mesh VPN rather than exposing the port to the
public internet:

- **[Tailscale](https://tailscale.com/)** (recommended) - prefer
  `jean-server --host 127.0.0.1` plus `tailscale serve --bg 3456` so the
  browser gets real HTTPS (clipboard and other secure-context APIs work).
  Binding the Tailscale IP directly (`--host tailscale`) is HTTP-only and
  browsers will treat it as an insecure origin.
- Other options: WireGuard, ZeroTier, SSH tunnel, or a reverse proxy with TLS
  in front of `127.0.0.1`

1. Open **Settings → Web Access**
2. Enable **HTTP server** (optionally turn on **Auto-start**)
3. Set **Port** and **Bind address** (`127.0.0.1` for local only, LAN IP,
   `0.0.0.0`, or your Tailscale IP)
4. Open the shown URL (includes `?token=...`) in a browser, or share it with
   devices that can reach that host

The desktop app can work with any number of Jean servers at the same time:

1. Open the server menu at the top of the project sidebar → **Connections**
   (onboarding also offers this step)
2. Click **Add remote** and either:
   - **Install via SSH** - enter SSH user, host/IP, and ports; Jean installs
     `jean-server` on that machine for you, or
   - **Existing URL** - paste the Web Access URL and access token
3. Projects from Local and every enabled remote appear together in one sidebar,
   grouped by server. Use the **All servers** filter to focus on one host.
