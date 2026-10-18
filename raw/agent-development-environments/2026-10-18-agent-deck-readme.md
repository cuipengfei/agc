# Agent Deck — README 关键段落摘录

> Source: https://github.com/asheshgoplani/agent-deck (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"Terminal session manager for AI coding agents. One TUI for Claude, Gemini, OpenCode, Codex, and more.","pushed":"2026-10-18T14:17:42Z","stars":1109,"url":"https://github.com/asheshgoplani/agent-deck"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

**Agent Deck is mission control for your AI coding agents.** Running Claude Code on ten projects, OpenCode on five more, another agent somewhere in the background? One terminal shows every session — running, waiting, or done — and one keystroke switches between them. Groups, search, forking, git worktrees, cost tracking, and a phone-controlled [conductor](#conductor) keep a whole fleet manageable.

https://github.com/user-attachments/assets/e4f55917-435c-45ba-92cc-89737d0d1401

Beyond one-off PRs, we're looking for 1-2 regular co-maintainers: people who want to own an area (a tool integration, the TUI, the web view, CI) and help triage and review. The validation pipeline does the heavy lifting; maintainers steer.

```bash
agent-deck uninstall              # Interactive uninstall
agent-deck uninstall --keep-data  # Remove binary only, keep sessions
```

<details>
<summary>Shell completion</summary>

`agent-deck completion <bash|zsh|fish>` prints a completion script for commands and subcommands (`agent-deck se<Tab>` → `session`, `agent-deck session st<Tab>` → `start`/`stop`), plus live resource names where it matters — `agent-deck remote update <Tab>` offers your configured remotes, `agent-deck session set-parent <Tab> <Tab>` offers session titles at both positions, and `agent-deck -p <Tab>` offers your profiles.

```bash
# bash
echo 'source <(agent-deck completion bash)' >> ~/.bashrc

# zsh
echo 'source <(agent-deck completion zsh)' >> ~/.zshrc

# fish
agent-deck completion fish > ~/.config/fish/completions/agent-deck.fish
```

```bash
agent-deck                        # Launch TUI
agent-deck add . -c claude        # Add current dir with Claude
agent-deck session fork my-proj   # Fork a supported session
agent-deck session send my-proj --message-file task.md # Send a multiline prompt
agent-deck session remove my-proj # Remove stopped/errored session from registry (transcripts preserved)
agent-deck mcp attach my-proj exa # Attach MCP to session
agent-deck skill attach my-proj docs --source pool --restart # Attach skill + restart
agent-deck web                    # Start web UI on http://127.0.0.1:8420
```

> **⚠️ Changed in v1.9.55, extended after v1.16.5:** in the new-session dialog (`n`), **Enter advances to the next field** on every row — Name, Tool, Model, Reasoning effort, Path, checkboxes and each Claude Options row — and only the trailing **`[ Create session ]`** button (or **Ctrl+S from any field**) creates the session, so walking the form with Enter never launches a session before you have chosen the model, path or options. `↓`/`Space` open the model list. The dialog also remembers your last-used tool. Restore the old Enter-creates-from-any-row behavior with `[ui].new_session_enter_advances = false`.

From the main menu, `o` and `Shift+Q` open a message composer above the footer.
Press `Enter` to submit, `Ctrl+J` for a newline, or `Esc` to cancel.
`Ctrl+X`, then `E`, opens the draft in `$VISUAL` / `$EDITOR` (fallback: `vi`);
returning from the editor restores the draft without sending it.
Queueing uses native Claude/OpenCode 2 queueing where available and waits for
the current turn to finish on other commands.
OpenCode 2 queueing uses its session API and requires a detected session ID;
unconfirmed delivery is reported without retrying or falling back to terminal keys.
The main-menu composer currently supports local sessions only, not remote-session rows.

| Key | Action |
|-----|--------|
| `Enter` | Attach to session |
| `Ctrl+Q` | Detach from session |
| `n` | New session |
| `f` / `F` | Fork (quick / dialog) |
| `A` / `Shift+U` | Archive / unarchive session |
| `^` | Show archived sessions |
| `m` | MCP Manager |
| `o` | Send a message to the selected session (a busy Claude session queues it, no interrupt) |
| `Shift+Q` | Queue a message after the current turn |
| `s` | Skills Manager |
| `$` | Cost Dashboard |
| `M` | Move session to group |
| `S` | Settings |
| `/` / `G` | Search / Global search |
| `r` / `R` | Rename / Restart session |
| `d` | Delete |
| `b` | Re-run worktree setup script |
| `E` | Container shell (sandboxed sessions) |
| `c` / `C` | Copy last AI response / session info (repo, path, branch) |
| `V` / `Y` | Copy visible terminal text / a fenced code block |
| `Shift+drag` | Select text natively (`Option+drag` in iTerm2) — see below |
| `?` | Full help |

Five minutes from zero to a Telegram bot that watches every Claude session you have running.

```bash
# 1. Create a Telegram bot via @BotFather, grab the token + your user ID from @userinfobot.
# 2. Run the wizard — it sets up the conductor, bridge daemon, and heartbeat in one shot.
agent-deck conductor setup work --description "Work fleet"
agent-deck session start conductor-work
# 3. Message your bot:  /status
```

That's it. From now on every other agent-deck session you run is supervised by a single
"conductor" session that answers routine questions, escalates the interesting ones to your
phone, and never lets a `waiting` worker rot.

![Fleet topology: phone → conductor → child sessions, with watchers on the side](docs/conductor/fleet-topology.svg)

### Fork Sessions

Try different approaches without losing context. Fork Claude, OpenCode, Pi, Codex, and Oh My Pi sessions instantly. Each fork inherits the parent conversation history through the tool's native fork support.

- Press `f` for quick fork, `F` to customize name/group
- Fork your forks to explore as many branches as you need
- Codex forking requires a codex CLI with `codex fork <session-id>` support (verified with `codex-cli 0.137.0`)

Attach MCP servers without touching config files. Need web search? Browser automation? Toggle them on per project or globally. Agent Deck handles the restart automatically.

- Press `m` to open, `Space` to toggle, `Tab` to cycle scope (LOCAL/GLOBAL), type to jump
- Define your MCPs once in `$XDG_CONFIG_HOME/agent-deck/config.toml` (default `~/.config/agent-deck/config.toml`), then toggle per session — see [Configuration Reference](skills/agent-deck/references/config-reference.md)
