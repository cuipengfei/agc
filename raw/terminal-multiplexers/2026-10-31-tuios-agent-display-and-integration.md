# TUIOS agent display and integration

> Source: tuios 0.12.0 CLI (`integration install`, `doctor agents`); Gaurav-Gosain/tuios `docs/AGENT_STATE.md`, `docs/KEYBINDINGS.md`
> Collected: 2026-10-31
> Published: Unknown

## `tuios integration install omp claude-code codex opencode` (verbatim)

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

## `tuios doctor agents` (verbatim, 摘录已安装项)

```
claude-code  /home/cpf/.bun/bin/claude
             integration installed, current (v3)
codex        /home/cpf/.bun/bin/codex
             integration installed, current (v1)
opencode     /home/cpf/.bun/bin/opencode
             integration installed, current (v5)
```

同一命令中其余行为 `not on PATH` 或 `integration not installed`（gemini-cli、amp、antigravity、copilot、crush、cursor-agent、devin）。`omp` 未出现在该输出中；omp 侧安装结果以上面 install 输出里的 `oh-my-pi: installed in ...` 为准。

## 文档摘录（摘要，非逐字）

- `docs/AGENT_STATE.md`：Session Rail 的 agents 区块按 "you" 优先级分组（Needs you → Done unread → Working → At rest），每个 agent 两行，第一行状态符号与名称，第二行当前工具调用、上下文占比与 subagent 列表；状态符号使用 ▲ ■ ● ◊ ○ ×；侧栏宽度 ≤30 列时 agent 窗口只在 agents 区块出现。
- `docs/KEYBINDINGS.md`：Agents View 用 `Ctrl+b i` 打开；跨 agent 跳转用 `Ctrl+b o` / `Ctrl+b O` / `Ctrl+b J` / `Ctrl+b K`；侧栏聚焦后用 `j`/`k`/`Enter`/`v`/`r`。

以上两段为文档内容摘要，未逐字抄录。
