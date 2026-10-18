# AI DevKit — README 关键段落摘录

> Source: https://github.com/codeaholicguy/ai-devkit (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"The control plane for AI coding agents.","pushed":"2026-10-18T07:50:55Z","stars":1649,"url":"https://github.com/codeaholicguy/ai-devkit"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

- **One config for every agent** — `.ai-devkit.json` reconciles setup across the coding tools your team uses
- **One console for running sessions** — `agent console` is a live TUI dashboard for supervising local agents across providers
- **Cross-agent communication** — `agent send` lets you route prompts, logs, and test output to running agents
- **Memory retrieval without context bloat** — `@ai-devkit/memory` stores decisions, conventions, and fixes in local SQLite so agents search when needed instead of carrying everything in every prompt
- **Composable engineering skills** — `dev-lifecycle`, `verify`, `tdd`, review, debugging, security, docs, and simplification skills combine into reliable workflows

Run `npx ai-devkit@latest init` and your project gets:

| What you need | What AI DevKit installs |
|---------------|-------------------------|
| One setup source | `.ai-devkit.json` for the agents and workflow you choose |
| Running-agent visibility | `agent list`, `agent detail`, and `agent console` |
| Addressable agents | `agent send`, `--stdin`, `--wait`, and agent groups where supported |
| Retrieval-based memory | Local SQLite memory exposed through MCP and CLI, searched only when useful |
| Composable senior-engineer workflow | `dev-lifecycle` plus verification, TDD, debugging, review, security, docs, and simplification skills |

- multiple terminals with no shared control surface
- separate `CLAUDE.md` / `.cursor/rules` / `AGENTS.md` / MCP setup per tool
- no easy way to send context, logs, or follow-up work to a running agent
- the agent forgetting yesterday's conventions
- "I've successfully implemented the feature" with a red build
- the agent diving into code without a plan and producing the wrong thing

Before AI DevKit, your agents are powerful but scattered. After AI DevKit, they have shared setup, a control surface, searchable memory, communication paths, and reusable skills that travel with your repo without bloating every prompt.

| Without AI DevKit | With AI DevKit |
|-------------------|----------------|
| You manage agents as isolated terminal tabs | You supervise them from `ai-devkit agent console` |
| You hand-maintain every agent setup | One config reconciles agent files, skills, and MCP setup |
| You copy logs and context between sessions | `agent send` routes prompts and stdin to running agents |
| You repeat project rules in every chat | Agents retrieve relevant memory and docs only when useful |
| The agent jumps from prompt to code | `dev-lifecycle` guides requirements, design, planning, implementation, testing, and review |
| "Done" means the agent stopped editing | "Done" requires fresh verification output |

One wizard. Pick your agents, install the control-plane pieces you need, and give every tool the same operating model. It writes project-local files you can review and commit. Re-run it whenever your agent list or workflow changes.

```
your-project/
├── .ai-devkit.json              # single source of truth (re-run init anytime)
├── .claude/                     # or .cursor/, .codex/, etc. per agent you picked
│   ├── skills/                  # dev-lifecycle, verify, memory, tdd, ...
│   └── settings.json            # MCP servers wired up (incl. @ai-devkit/memory)
└── docs/ai/
    ├── requirements/            # phase 1 — what to build, why
    ├── design/                  # phase 2 — how it'll be built
    ├── planning/                # phase 3 — task-by-task plan
    ├── implementation/          # phase 4 — execution notes
    └── testing/                 # phase 5 — coverage strategy
```

# Open the live terminal UI
ai-devkit agent console

AI DevKit memory is local SQLite knowledge for project decisions, coding conventions, and reusable fixes. Agents retrieve it when a task needs context instead of carrying every fact in every prompt.

```bash
# Store a reusable project convention
ai-devkit memory store \
  --title "API handlers return DTOs" \
  --content "REST handlers should return response DTOs instead of domain entities." \
  --tags "api,backend" \
  --scope "repo:codeaholicguy/ai-devkit"

- `memory` retrieves relevant project knowledge without stuffing all context into the session
- `verify` blocks completion claims without fresh test or build evidence
- `tdd` pushes test-first implementation when behavior changes
- `structured-debug` keeps debugging reproducible instead of guess-and-patch
- `security-review`, `document-code`, and `simplify-implementation` add focused review passes when the task needs them

| Failure mode | AI DevKit behavior |
|--------------|--------------------|
| Agent starts coding too early | `dev-lifecycle` forces requirements, design, planning, implementation, tests, and review |
| Agent says "done" without proof | `verify` blocks completion claims without fresh test/build evidence |
| Agent commits unrelated local changes | `dev-commit` checks diffs, stages explicit paths, validates, and reports the SHA/status |
| Agent forgets project decisions | `memory` gives it a local, searchable knowledge base across sessions and projects |
| New behavior ships without tests | `tdd` pushes test-first implementation |
| Debugging becomes guess-and-patch | `structured-debug` makes it reproduce, hypothesize, fix, and verify |
| Existing code is opaque | `document-code` maps entry points, dependencies, and behavior |
| Implementation gets bloated | `simplify-implementation` reduces complexity before code ships |
| Documentation is hard to follow | `technical-writer` audits docs for novice-user clarity |

| Static rules files | AI DevKit |
|--------------------|-----------|
| Tell one agent what you prefer | Reconciles setup across supported agents |
| Do not show what is running | Lists, inspects, and controls live sessions |
| Cannot send work between sessions | Routes prompts, stdin, and channel messages to agents |
| Depend on the agent remembering every rule | Stores and searches reusable project knowledge |
| Cannot prove a task is complete | Requires fresh command output before completion claims |
