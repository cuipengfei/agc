# Agent of Empires — README 关键段落摘录

> Source: https://github.com/agent-of-empires/agent-of-empires (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"Manage multiple Claude Code, OpenCode agents from either TUI or Web for easy access on mobile. Also supports Mistral Vibe, Codex CLI, Gemini CLI, Pi.dev, Copilot CLI, Factory Droid Coding.","pushed":"2026-10-18T14:18:45Z","stars":3366,"url":"https://github.com/agent-of-empires/agent-of-empires"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

A session manager for AI coding agents on Linux and macOS. Run agents in
parallel across branches, monitor them from the TUI or a browser, and keep each
one in a persistent session with optional worktree and container isolation.

<table align="center">
  <tr>
    <td align="center" valign="middle">
      <img src="docs/assets/web-desktop.gif" alt="Web dashboard on a laptop" width="560">
      <br><sub><b>Desktop</b>: full dashboard, terminal, and diffs</sub>
    </td>
    <td align="center" valign="middle">
      <img src="docs/assets/web-mobile.gif" alt="Web dashboard on a phone" width="200">
      <br><sub><b>Phone</b>: structured view</sub>
    </td>
  </tr>
</table>

- TUI, web, CLI, and HTTP API surfaces
- Status detection, notifications, and persistent tmux sessions
- Git worktrees and multi-repo workspaces
- Docker, Podman, and Apple Containers sandboxing
- Structured and terminal views, including mobile access
- Diff review, profiles, repo hooks, and custom agent commands

Each agent runs in its own [tmux](https://github.com/tmux/tmux/wiki) session, so your agents keep running when you close the TUI, disconnect SSH, or your terminal crashes. Reopen `aoe` and everything is where you left it. The key shortcut to know: **`Ctrl+b d`** detaches from a session and returns to the TUI.

```bash
aoe                          # Launch the TUI (press ? for help)
aoe add --cmd claude         # Create a session running Claude Code
aoe serve                    # Start the web dashboard
```

**What happens when I close aoe?** Nothing. Sessions are tmux sessions running in the background; they are removed only when you delete them.

**Can I use AoE over SSH?** Yes. Sessions persist across disconnects; reconnect and run `aoe` again.

**How is this different from plain tmux?** tmux gives you persistent sessions. AoE adds agent-aware status detection, git worktree management, container sandboxing, a web dashboard with phone access, and a diff viewer around them. You can still `tmux attach` to any AoE session directly.
