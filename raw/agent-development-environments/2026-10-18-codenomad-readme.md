# CodeNomad — README 关键段落摘录

> Source: https://github.com/NeuralNomadsAI/CodeNomad (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"CodeNomad: The command center that puts AI coding on steroids.","pushed":"2026-10-18T13:46:35Z","stars":2628,"url":"https://github.com/NeuralNomadsAI/CodeNomad"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

CodeNomad is a **desktop and browser workspace for OpenCode V2** — built for developers who work across projects, long conversations, and Git worktrees. It connects to OpenCode's shared background service, keeping your sessions accessible from CodeNomad and compatible terminal clients.

![CodeNomad 0.20 workspace with project tabs, nested sessions, a conversation timeline, and the Status panel](docs/screenshots/workspace-0.20.png)

- **🚀 Projects and desktop windows** — Keep multiple projects open, with per-window tabs, drafts, attachments, and view restoration.
- **🧠 Sessions and full-history navigation** — Browse nested sessions, fork conversations, search beyond loaded messages, and jump through long histories with a timeline and previews.
- **🌳 Git worktrees** — Create and select worktrees, move a session with its subsessions, and review Git changes without leaving the workspace.
- **💬 Rich conversations** — Markdown, code, diffs, tool-result images, configurable reasoning/tool visibility, and `/btw` for a temporary side question.
- **📎 Files and attachments** — Pick, paste, or drop device files; use `@` references for project files and browse your workspace from the file panel.
- **🌐 Remote access** — Connect to a CodeNomad server from a desktop client or browser, with password authentication and HTTPS support. Or turn on **Remote Control** to pair a phone or another computer from anywhere through an [OpenTunnel](https://github.com/anomalyco/opentunnel) relay, without opening ports: TLS ends on your machine.
- **🧩 Tools and previews** — Monitor native background shells, manage MCP connections and Global/Project plugin activation, and open web tools as SideCars.
- **🔎 Agent-driven browser previews** — Let your agent open and inspect a visible web preview in Electron or Windows Tauri, without a Developer Mode switch.
- **🎙️ Voice input and speech** — Dictate prompts and listen to responses.
- **⌨️ A workspace you can adapt** — Command palette, notifications, customizable panels, independent light/dark palettes, and multiple interface languages.

Open a project folder, connect your model provider, and start a session. Git must be available to the CodeNomad backend for repository and worktree features; see [Requirements](#requirements).

Run on your development machine and access it through a browser. Install Node.js/npm and OpenCode V2 on that host first; Node.js 24 LTS is the recommended runtime (see [Requirements](#requirements)).

> **Self-signed certificate:** On first launch with HTTPS enabled (the default), your browser will show a "Your connection is not private" warning. This is expected — the server generates a local self-signed certificate automatically. Click **Advanced → Proceed to localhost** to continue. For local-only use without the warning, run with `--https=false --http=true`.

- **One shared OpenCode service** owns sessions and messages. Closing a CodeNomad tab, window, or backend leaves that service running. Desktop tabs, drafts, and layout are restored separately for each window.
- **Use an existing CLI or install from CodeNomad.** Executables on `PATH` are preferred; the setup screen also supports a selected executable and a shared user npm installation. The former private CodeNomad OpenCode installation is no longer used.
- **Updating the CLI and restarting its service are separate actions.** Use the explicit service controls in Preferences when you want the running daemon to use an updated executable.
- **Remote users should upgrade their CodeNomad server too.** The 0.20 UI requires CodeNomad server 0.20.0 or later.

SideCars let you open web tools running on the CodeNomad server host inside CodeNomad as tabs. Start the service separately, then add it in **Preferences → SideCars**.

Session web previews are also available from the conversation toolbar. Agent-driven native browser automation is supported in Electron and Windows Tauri; other Tauri platforms use an iframe preview. See [Browser Automation](dev-docs/BROWSER_AUTOMATION.md) for platform details.

- **[OpenCode V2](https://opencode.ai/v2/docs/)** — 2.0.7 minimum; 2.0.21 recommended for CodeNomad 0.20.0. Install/select it through desktop setup or provide a compatible CLI on the server host.
- **[Git](https://git-scm.com/downloads)** — a prerequisite for full functionality (repository identity, Git operations and worktrees). Git must be executable in the CodeNomad backend's `PATH`; it is not bundled with the desktop installers.
- **Node.js and npm** — required for the standalone npm server and source builds, bundled with desktop releases. Use **Node.js 24 LTS**; development and release builds use the version in [`.node-version`](.node-version) (currently 24.20.0).

On Windows, install [Git for Windows](https://gitforwindows.org/) with the option to use Git from the command line and third-party software. A per-user installation is sufficient and does not require administrator rights; install into a user-writable directory and make Git available in the user `PATH`. On macOS or Linux, follow the [platform installation instructions](https://git-scm.com/downloads). Fully quit and restart CodeNomad after installation so its backend inherits the updated `PATH`. For a remote server, install Git on the server host for the account running CodeNomad and restart that server process, not just the browser. A Git installation available only inside WSL does not satisfy the Windows backend's requirement.

**Without Git, CodeNomad tolerates a degraded, directory-only mode.** You can open a folder and talk to your agent, including asking it to help install Git. The backend supplies the agent with Git availability and backend platform context before prompts and custom commands; there is no blocking Git installation screen. Git operations and worktree management require Git. Session access is restricted to the explicitly opened physical folder; open another checkout separately to access its conversations. The agent's shell and the CodeNomad backend can run on different hosts, so installation help must target the backend account and environment. Git availability is rechecked on subsequent sends and the agent context is removed once it is available.
