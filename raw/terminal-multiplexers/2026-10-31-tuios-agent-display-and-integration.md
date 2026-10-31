# TUIOS agent display and integration

> Source: docs/AGENT_STATE.md, docs/KEYBINDINGS.md (Gaurav-Gosain/tuios); tuios CLI 0.12.0 outputs (integration status, doctor agents, integration install)
> Collected: 2026-10-31
> Published: Unknown

## CLI outputs (verbatim)
### `tuios integration status` (before install)
```
claude-code: not installed: run tuios integration install claude-code
codex: not installed: run tuios integration install codex
opencode: not installed: run tuios integration install opencode
omp: not installed: run tuios integration install omp
```

### `tuios integration install omp claude-code codex opencode`
```
oh-my-pi: installed in /home/cpf/.omp/agent/extensions/tuios-omp-agent-state.ts
Claude Code: installed in /home/cpf/.claude/settings.json (previous copy in /home/cpf/.claude/settings.json.tuios.bak)
Claude Code: skill installed in /home/cpf/.claude/skills/tuios/SKILL.md
Codex: installed in /home/cpf/.codex/hooks.json (previous copy in /home/cpf/.codex/hooks.json.tuios.bak)
Codex: skill installed in /home/cpf/.agents/skills/tuios/SKILL.md
opencode: installed in /home/cpf/.config/opencode/plugins/tuios-agent-state.js
  also changed /home/cpf/.config/opencode/plugins/tuios-agent-state/index.js
  also changed /home/cpf/.config/opencode/plugins/tuios-agent-state/tui.js
opencode: skill already installed and current in /home/cpf/.agents/skills/tuios/SKILL.md
```

### `tuios doctor agents`
```
omp: v1 installed, current
claude-code: v3 installed, current
codex: v1 installed, current
opencode: v5 installed, current
```

## Source excerpts
- From `docs/AGENT_STATE.md`: Session Rail agents grouped by priority Needs you → Done unread → Working → At rest; entries two lines (status symbol + name/wait/queue, tool call + ctx% + subagents); symbols ▲ ■ ● ◊ ○ ×; auto-dedupe when sidebar width ≤ 30.
- From `docs/KEYBINDINGS.md`: Agents View `Ctrl+b i` (Live/Thread/Changes/approvals a/r); switches `Ctrl+b o/O/J/K`; sidebar focus `s`/`Ctrl+b e` + `j/k/Enter/v/r`.
- `daemon.agent_autodetect = true` is fallback when hooks not installed.
