# Orca CLI — 官方文档摘录

> Source: https://www.onorca.dev/docs/cli/overview (official Orca docs)
> Collected: 2026-10-18
> Published: Unknown

## 关键段落（保留原文）

The Orca CLI is the `orca` command-line interface for scripting a running Orca editor from any shell. Use it to create and inspect worktrees, drive agent terminals, open files and diffs, automate the built-in browser, run scheduled automations, share HTML/Markdown artifacts, and control Orca-native tools from scripts or AI agents.

It ships with the desktop app; register it under Settings → General → Orca CLI. Orca keeps its own `orca` command first on a terminal's `PATH` even when a shell startup file adds an older global install, so scripts and agents call the CLI that matches the running app.

## Worktree commands

```
orca worktree ps --json
orca worktree create --repo id:<repoId> --name my-task --issue 123 --json
orca worktree create --repo id:<repoId> --name review-pr-123 --pr 123 --json
orca worktree current --json
orca worktree set --worktree active --comment "reproduced bug" --json
orca worktree rm --worktree id:<id> --force --json
```

## Terminal commands

```
orca terminal list --json
orca terminal read --json
orca terminal send --text "continue" --enter --json
orca terminal wait --for tui-idle --timeout-ms 30000 --json
orca terminal create --worktree path:/projects/app --command "npm test" --json
orca terminal split --direction vertical --command "npm run dev" --json
```

For tracked multi-agent work, use Orchestration instead of plain terminal prompts.
