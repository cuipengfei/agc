# TUIOS — README 关键段落摘录

> Source: https://github.com/Gaurav-Gosain/tuios (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"A terminal window manager that knows what your agents are doing. Tiling panes, workspaces, sessions that survive restarts, and one Inbox for every coding agent.","pushed":"2026-10-18T14:18:38Z","stars":5469,"url":"https://github.com/Gaurav-Gosain/tuios"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/brand/banner-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="./assets/brand/banner-light.png">
    <img alt="tuios: a terminal window manager that knows what your agents are doing. Tilly, a small purple CRT whose screen is a tiled layout, stands beside the tuios wordmark and a tiled terminal session." src="./assets/brand/banner-light.png" width="100%">
  </picture>

  <a href="https://github.com/Gaurav-Gosain/tuios/releases"><img src="https://img.shields.io/github/release/Gaurav-Gosain/tuios.svg" alt="Latest Release"></a>
  <a href="https://pkg.go.dev/github.com/Gaurav-Gosain/tuios?tab=doc"><img src="https://godoc.org/github.com/Gaurav-Gosain/tuios?status.svg" alt="GoDoc"></a>
  <a href="https://deepwiki.com/Gaurav-Gosain/tuios"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
  <br>
  <a title="This tool is Tool of The Week on Terminal Trove, The $HOME of all things in the terminal" href="https://terminaltrove.com/"><img src="https://cdn.terminaltrove.com/media/badges/tool_of_the_week/png/terminal_trove_tool_of_the_week_green_on_dark_grey_bg.png" alt="Terminal Trove Tool of The Week" style="width: 250px;" /></a>
</div>

TUIOS is a modern terminal multiplexer and window manager built with Go. It provides a vim-like modal interface with multiple terminal panes, workspaces, BSP tiling, kitty graphics protocol support, and a command palette, all running inside your existing terminal. A daemon keeps sessions alive, reaches sessions on your other machines, and lets the coding agents in your panes report their state and message each other.

Built on the Charm stack (Bubble Tea v2, Lipgloss v2), TUIOS features event-driven rendering for near-zero idle CPU usage, flicker-free kitty image passthrough, and comprehensive keyboard/mouse interaction.

Full documentation is available at **[tuios.dev](https://tuios.dev)** (hosted) or in the [`docs/`](./docs/) folder. To try tuios without installing it, take the guided tour at **[tuios.dev/learn](https://tuios.dev/learn)**: the real app, compiled to WebAssembly, with a practice shell in every pane.

### Quick Links
- **[Getting Started](https://tuios.dev/docs/getting-started)**: Install and first session
- **[Keybindings](docs/KEYBINDINGS.md)**: Default keys and how to rebind them
- **[BSP Tiling](docs/BSP_TILING.md)**: Tiling with preselection and split control
- **[Layout Modes](docs/LAYOUT_MODES.md)**: BSP, master-stack and scrolling layouts, aggregate view, multifocus
- **[Configuration](docs/CONFIGURATION.md)**: Customize keybindings, themes, and behavior
- **[Hooks](docs/HOOKS.md)**: Run shell commands on window, session and agent events
- **[Themes](docs/THEMES.md)**: Built-in themes and custom theme JSON
- **[Glyph sets](docs/GLYPHS.md)**: The characters the chrome is drawn with
- **[CLI Reference](docs/CLI_REFERENCE.md)**: All command-line options
- **[Tape Scripting](docs/TAPE_SCRIPTING.md)**: Automate workflows
- **[Sessions](docs/SESSIONS.md)**: Daemon mode, attach/detach, other machines, and what survives
- **[Agents](docs/AGENT_STATE.md)**: Running coding agents in tuios: state, the Inbox, approvals, fleets, other machines, grants and MCP
- **[Program Status](docs/PROGRAM_STATUS.md)**: OSC 7501 from any program, `tuios status`, and the reports tuios sends to its own terminal
- **[tmux Shim](docs/TMUX_SHIM.md)**: Run tools that drive tmux, such as Claude Code agent teams
- **[Control Protocol](docs/protocol.md)**: JSON verb protocol for driving the daemon
- **[Architecture](docs/ARCHITECTURE.md)**: Technical design

**[GitHub Releases](https://github.com/Gaurav-Gosain/tuios/releases)**: Pre-built binaries for Linux, macOS, Windows, FreeBSD and OpenBSD, with a `checksums.txt`. The `tuios-ghostty_*` archives are `tuios` built on the [libghostty-vt emulator](./docs/ghostty-vt.md), for Linux, macOS and Windows on amd64 and arm64.

<table>
  <tr>
    <td width="50%"><a href="https://tuios.dev/docs/layout-modes"><img src="https://tuios.dev/shots/overview-800.webp" width="400" alt="tuios with four tiled panes: a git diff, a Go file, test output and a build. The sidebar lists the session, its files and four agents with their states."></a><br><b>Panes and the rail.</b> Tiled panes, and every agent's state at a glance.</td>
    <td width="50%"><a href="https://tuios.dev/docs/agent-inbox"><img src="https://tuios.dev/shots/inbox-800.webp" width="400" alt="The tuios Inbox listing an approval marked risky, a question and an errored agent, with the reason the approval is risky."></a><br><b>The Inbox.</b> Everything your agents wait on, in one list.</td>
  </tr>
  <tr>
    <td width="50%"><a href="https://tuios.dev/docs/agent-inbox#reviewing-an-agents-changes"><img src="https://tuios.dev/shots/review-800.webp" width="400" alt="The tuios review view: a file list on the left and a highlighted diff on the right, with keys for notes, hunks and files."></a><br><b>Review.</b> Read an agent's changes and send notes back to it.</td>
    <td width="50%"><a href="https://tuios.dev/docs/configuration"><img src="https://tuios.dev/shots/settings-800.webp" width="400" alt="The tuios settings page searched for theme. The Theme row carries a dot because it differs from the default."></a><br><b>Settings.</b> Every option on one page, applied at once.</td>
  </tr>
</table>

### Core
- **Multiple Terminal Panes**: Create, resize, drag, and organize terminal sessions
- **9 Workspaces**: Independent workspace isolation with instant switching
- **Modal Interface**: Vim-inspired Window Management and Terminal modes
- **Command Palette**: Fuzzy-searchable action launcher (<kbd>Ctrl</kbd>+<kbd>P</kbd>)
- **Launcher**: Fuzzy search everything on `$PATH` plus your installed desktop apps (<kbd>Alt</kbd>+<kbd>Space</kbd>), ranked by what you actually run. <kbd>Enter</kbd> starts it; <kbd>Tab</kbd> opens a shell with the command typed but not entered, so you can add arguments. App icons are drawn where the terminal supports kitty graphics.
- **Pane Zoom**: Zoom any pane with <kbd>z</kbd> (WM mode) or <kbd>Prefix</kbd>+<kbd>z</kbd>. It takes 95% of the screen by default; set `appearance.zoom_size = 100` for fullscreen. A fullscreen zoom hides the shared borders, and the dockbar shows a **Z** indicator.
- **Session Rail**: A sidebar with sessions, terminals, files, git state and agents, on by default on the right (`appearance.sidebar.enabled`)
- **Settings Page**: Change options in the app with <kbd>Prefix</kbd>+<kbd>,</kbd>
- **Popups**: `tuios popup -- fzf` runs a command in a floating pane that closes when it exits
