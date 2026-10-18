# CCManager — README 关键段落摘录

> Source: https://github.com/kbwo/ccmanager (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"Coding Agent Session Manager for Claude Code / Gemini CLI / Codex CLI / Cursor Agent / Copilot CLI / Cline CLI / OpenCode / Kimi CLI","pushed":"2026-10-18T08:01:17Z","stars":1265,"url":"https://github.com/kbwo/ccmanager"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

# CCManager - AI Code Agent Session Manager

CCManager is a CLI application for managing multiple AI coding assistant sessions (Claude Code, Gemini CLI, Codex CLI, Cursor Agent, Copilot CLI, Cline CLI, OpenCode, Kimi CLI) across Git worktrees and projects.

- Run multiple AI assistant sessions in parallel across different Git worktrees
- **Multi-project support**: Manage multiple git repositories from a single interface
- Support for multiple AI coding assistants (Claude Code, Gemini CLI, Codex CLI, Cursor Agent, Copilot CLI, Cline CLI, OpenCode, Kimi CLI)
- Switch between sessions seamlessly
- Visual status indicators for session states (busy, waiting, idle)
- Create, merge, and delete worktrees from within the app
- **Restore sessions after a restart**: reopen the sessions that were running when CCManager last exited or crashed
- **Copy Claude Code session data** between worktrees to maintain conversation context
- **`.worktreeinclude` support**: carry gitignored project files (`.env`, local certs) into newly created worktrees
- Configurable keyboard shortcuts
- Command presets with automatic fallback support
- Configurable state detection strategies for different CLI tools
- Status change hooks for automation and notifications
- Devcontainer integration
- **Auto Approval (experimental)**: Automatically approve safe prompts using AI verification

Both tools solve the same problem - managing multiple Claude Code sessions - but take different approaches.

**If you love tmux-based workflows, stick with Claude Squad!** It's a great tool that leverages tmux's power for session management.

### 👁️ Real-time session monitoring
CCManager shows the actual state of each Claude Code session directly in the menu:
- **Waiting**: Claude is asking for user input
- **Busy**: Claude is processing
- **Idle**: Ready for new tasks

Claude Squad doesn't show session states in its menu, making it hard to know which sessions need attention. While Claude Squad offers an AutoYes feature, this bypasses Claude Code's built-in security confirmations - not recommended for safe operation.

- **Ctrl+E**: Return to menu from active session
- **Escape**: Cancel/Go back in dialogs

1. **Through the UI**: Select **Global Configuration** → **Configure Shortcuts** from the main menu
2. **Configuration file**: Edit `~/.config/ccmanager/config.json` or `.ccmanager.json` for per-project settings (see [Per-Project Configuration](#per-project-configuration))

## Per-Project Configuration

CCManager supports per-project configuration by placing a `.ccmanager.json` file in your git repository root. Project settings are merged with the global config (`~/.config/ccmanager/config.json`), with project settings always taking priority.

For detailed configuration options and examples, see [docs/project-config.md](docs/project-config.md).

Then just ask — "set this repo up to run codex in ccmanager", "notify me when a session is waiting for input", "why is my `.ccmanager.json` being ignored?". See [plugins/ccmanager-config/README.md](plugins/ccmanager-config/README.md).

Each assistant has its own state detection strategy to properly track:
- **Idle**: Ready for new input
- **Busy**: Processing a request
- **Waiting**: Awaiting user confirmation

CCManager supports configuring the command and arguments used to run Claude Code sessions, with automatic fallback options for reliability.

1. Navigate to **Global Configuration** → **Configure Command Presets**
2. Set your desired arguments (e.g., `--resume` for resuming sessions)
3. Optionally set fallback arguments
4. Save changes

When running the `claude` command with the default (`claude`) detection strategy, CCManager automatically appends `--teammate-mode in-process` to the CLI arguments. This prevents conflicts between Claude Code's agent teams feature and ccmanager's PTY-based session management.

- **Automatic**: No configuration needed. CCManager injects the flag for all `claude` command sessions.
- **Override**: If you explicitly specify `--teammate-mode` in your preset args, your value takes priority.
- **Non-claude commands**: Other AI assistants (Gemini, Codex, etc.) are not affected.

## Creating Worktrees in the Background

Creating a worktree (generating the branch name, `git worktree add`, copying files, running worktree hooks) can take a while in large repositories. The loading screen shown during creation can be left at any time:

- **Wait**: stay on the loading screen and everything behaves as before — errors and hook failures are shown right away, and a prompt-first worktree opens its new session automatically.
- **Continue in the background**: press `Enter` to return to the menu and keep working. The menu lists the creations still running for the project; when one finishes, the new worktree appears in the list. A prompt-first session is started without switching to it, and any failure is shown as an error on the menu.

## Session Data Copying

CCManager can copy Claude Code session data (conversation history, context, and project state) when creating new worktrees, allowing you to maintain context across different branches.

- **Seamless Context Transfer**: Continue conversations in new worktrees without losing context
- **Configurable Default**: Set whether to copy session data by default
- **Per-Creation Choice**: Decide on each worktree creation whether to copy data
- **Safe Operation**: Copying is non-fatal - worktree creation succeeds even if copying fails

When creating a new worktree, CCManager:
1. Asks whether to copy session data from the current worktree
2. Copies all session files from `~/.claude/projects/[source-path]` to `~/.claude/projects/[target-path]`
3. Preserves conversation history, project context, and Claude Code state
4. Allows immediate continuation of conversations in the new worktree

1. Navigate to **Global Configuration** → **Configure Worktree**
2. Toggle **Copy Session Data** to set the default behavior
3. Save changes

The default choice (copy or start fresh) will be pre-selected when creating new worktrees.
