# Ekko Studio — README 关键段落摘录

> Source: https://github.com/EKKOLearnAI/ekko-studio (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"Ekko Studio is a local-first AI workspace for multi-agent chat, coding, and visual workflows, available on desktop and the web.","pushed":"2026-10-18T14:06:52Z","stars":11459,"url":"https://github.com/EKKOLearnAI/ekko-studio"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

<p align="center">
  A local-first AI workspace for multi-agent chat, coding, and visual workflows.<br/>
  Available as a desktop app and self-hosted web console, with support for<br/>
  <a href="https://github.com/NousResearch/hermes-agent">Hermes Agent</a>, Ekko Agent, and 14 coding-agent integrations, including Claude Code and Codex.<br/>
  Bring conversations, group collaboration, voice, files, and devices together in one place.
</p>

<p align="center">
  <a href="https://github.com/EKKOLearnAI/ekko-studio/releases/latest">Download Ekko Studio Desktop</a>
  ·
  <a href="https://ekkostudio.xyz/#/docs/getting-started">Documentation</a>
  ·
  <code>npm install -g ekko-studio && ekko-studio-web start</code>
</p>

Ekko Studio was previously named Hermes Studio / Hermes Web UI. The GitHub
repository is `EKKOLearnAI/ekko-studio`. The primary npm package is
`ekko-studio`, with the `ekko-studio-web` command. The legacy `hermes-web-ui`
package and command remain supported and receive the same releases.

![Ekko Studio conversation with a completed task plan and usage summary](./docs/screenshots/overview/workspace.png)

| Area | What Ekko Studio does |
| --- | --- |
| Multi-agent runtime | Connects the agents listed below with streaming responses, tool traces, generated-file previews, persistent sessions, and standalone desktop chat windows. |
| Studio workspace | Provides shared chats, group chat, global-agent runs, workflows, files, voice, media, devices, themes, logs, usage, and App connectivity across agent runtimes. |
| Agent control planes | Keeps Hermes profiles, providers, models, memory, skills, plugins, jobs, Kanban, channels, and runtime management in their owning agent module. |
| Automation | Builds executable visual workflows and connects the supported runtimes through schedules, approval gates, group-chat rooms, platform channels, and MCP servers. |
| Workspace tools | Provides a file browser, web terminal, Desktop Agent Browser, screenshot capture, voice input/output, coding-agent runners, device discovery, Journey graph, and performance views. |
| Distribution | Ships as a desktop app for Windows/macOS/Linux, an npm CLI package, and a Docker image. |

Scoped mode uses isolated session configuration; supported runtimes can use the selected Studio provider/model. Global mode uses the CLI's existing configuration and sign-in. Available models, tools, and context controls depend on the runtime.
See [native coding agents](./docs/native-coding-agents.md), [Antigravity CLI](./docs/antigravity-cli.md), and [DSH setup](./docs/dsh-management.md) for details.

- Start a conversation from responsive Agent cards; Ekko is the initial default, and Studio remembers the last agent, model, workspace, launch mode, and reasoning options
- Real-time chat streaming over Socket.IO `/chat-run`; Studio dispatches each run to the selected runtime adapter
- Multi-session management — create, rename, delete, switch between sessions
- **Self-built session database** — local SQLite storage for Studio sessions; Hermes state.db remains a read-only source for Hermes history APIs
- Session grouping by source (Telegram, Discord, Slack, etc.) with collapsible accordion
- Active session indicator — live sessions pin to top with spinner icon
- Sessions sorted by latest message time
- Markdown rendering with syntax highlighting and code copy
- Tool call detail expansion (arguments / result)
- Profile-scoped file uploads, clipboard image/file paste, and workspace attachments
- File download support — download uploaded files and agent-generated files by resolved path across local, Docker, SSH, and Singularity backends
- Inline previews for generated HTML, PDF, DOCX, PPTX, XLSX, CSV, images, Markdown, and source files
- Session search — Ctrl+K search across the Studio local session database; read-only Hermes history sessions are not included
- Session categories, message references, compression progress, and durable background delegation results
- Persistent task cards with live step progress, approval prompts, and clarification questions
- Profile-aware model selector with runtime-specific provider/model availability
- Per-turn token usage, cache hits, estimated cost, and generation speed; supported runtimes also expose context usage and compression controls

- Credentials and channel behavior settings write to `.env` and `config.yaml` under the selected Hermes profile
- Per-platform configured/unconfigured status detection
- Gateway autostart is opt-in under Hermes settings; ordinary Studio chat does not require a platform Gateway

- Total token usage breakdown (input / output)
- Session count with daily average
- Estimated cost tracking & cache hit rate
- Model usage distribution chart
- 30-day daily trend (bar chart + data table)

- Profile-aware Kanban board for planning and tracking agent work
- Task creation, updates, and status movement from the dashboard
- Uses the Hermes Kanban CLI and its task storage, with Studio authentication and profile access controls

- Vue Flow canvas for the supported Agent catalog, with file/image attachments and runtime-specific launch settings
- Directed edges, structured conditions, success/failure routes, loops, and approval gates
- Import/export for portable workflow definitions and profile-aware workspaces
- Run budgets, deadlines, stop/rerun controls, and persisted execution history
- Frozen run snapshots, node conversations, edge decisions, and evidence playback on the canvas

- Create, rename, delete, and switch between Hermes profiles
- Clone existing profile or import from archive (`.tar.gz`)
- Export profile for backup or sharing
- Profile-scoped configuration, cache, uploads, sessions, jobs, usage, memory, skills, plugins, providers, and model visibility
- Account-bound profile access: super administrators can manage every profile; regular administrators only see and use profiles assigned to their account

- Browse files on remote backends (local, Docker, SSH, Singularity)
- Upload, download, rename, copy, move, and delete files
- Store uploaded files under the selected/requested Hermes profile while keeping downloads path-based for agent-generated artifacts outside the upload directory
- Create directories
- Preview and edit supported files with syntax highlighting, then attach workspace files back to a chat
