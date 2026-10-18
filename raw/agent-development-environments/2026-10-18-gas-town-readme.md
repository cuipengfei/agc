# Gas Town — README 关键段落摘录

> Source: https://github.com/gastownhall/gastown (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"Gas Town - multi-agent workspace manager","pushed":"2026-10-18T00:11:20Z","stars":18405,"url":"https://github.com/gastownhall/gastown"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

Gas Town is a workspace manager that lets you coordinate multiple AI coding agents (Claude Code, GitHub Copilot, Codex, Gemini, and others) working on different tasks. Instead of losing context when agents restart, Gas Town persists work state in git-backed hooks, enabling reliable multi-agent workflows.

| Challenge                       | Gas Town Solution                            |
| ------------------------------- | -------------------------------------------- |
| Agents lose context on restart  | Work persists in git-backed hooks            |
| Manual agent coordination       | Built-in mailboxes, identities, and handoffs |
| 4-10 agents become chaotic      | Scale comfortably to 20-30 agents            |
| Work state lost in agent memory | Work state stored in Beads ledger            |

    Town --> Mayor
    Town --> Rig1[Rig: Project A]
    Town --> Rig2[Rig: Project B]

    Rig1 --> Crew1[Crew Member<br/>Your workspace]
    Rig1 --> Hooks1[Hooks<br/>Persistent storage]
    Rig1 --> Polecats1[Polecats<br/>Worker agents]

    Rig2 --> Crew2[Crew Member]
    Rig2 --> Hooks2[Hooks]
    Rig2 --> Polecats2[Polecats]

    style Mayor fill:#e1f5ff,color:#000000
    style Town fill:#f0f0f0,color:#000000
    style Rig1 fill:#fff4e1,color:#000000
    style Rig2 fill:#fff4e1,color:#000000
```

### Rigs 🏗️

Project containers. Each rig wraps a git repository and manages its associated agents.

Your personal workspace within a rig. Where you do hands-on work.

Git-backed issue tracking system that stores work state as structured data.

**Bead IDs** (also called **issue IDs**) use a prefix + 5-character alphanumeric format (e.g., `gt-abc12`, `hq-x7k2m`). The prefix indicates the item's origin or rig. Commands like `gt sling` and `gt convoy` accept these IDs to reference specific work items. The terms "bead" and "issue" are used interchangeably—beads are the underlying data format, while issues are the work items stored as beads.

A three-tier watchdog system keeps agents healthy:

- **Witness** - Per-rig lifecycle manager. Monitors polecats, detects stuck agents, triggers recovery, manages session cleanup.
- **Deacon** - Background supervisor running continuous patrol cycles across all rigs.
- **Dogs** - Infrastructure workers dispatched by the Deacon for maintenance tasks (e.g., Boot for triage).

Per-rig merge queue processor. When polecats complete work via `gt done`, the Refinery batches merge requests, runs verification gates, and merges to main using a Bors-style bisecting queue. Failed MRs are isolated and either fixed inline or re-dispatched.

Federated work coordination network linking Gas Towns through DoltHub. Rigs post wanted items, claim work from other towns, submit completion evidence, and earn portable reputation via multi-dimensional stamps. See [Wasteland](docs/WASTELAND.md).

| Tool | Version | Notes |
|---|---|---|
| Git | 2.20+ | Worktree support |
| Go | 1.26.2+ (see `go.mod`) | Required for the Linux and Windows paths and for macOS source builds. Not needed for `brew install gastown` or Docker setup. |
| Beads (`bd`) | 0.57.0+ | Required for native installs. Homebrew and Docker supply it; source/native Go paths install it with `go install`. |
| sqlite3 | any | Used by convoy database queries. Usually pre-installed on macOS and Linux. |
| ICU4C dev headers | varies | Required for source builds that compile the ICU-backed query layer. Use `libicu-dev` on Debian/Ubuntu, `libicu-devel` on Fedora/RHEL, `icu4c` on macOS, and MSYS2 ICU packages for native Windows. |
| tmux | 3.0+ | Required for `gt up` and the tmux-backed roles (Mayor, Witnesses, Refineries, polecats). Optional only for minimal-mode workflows where you run runtime instances manually. |
| Claude Code CLI | latest | Default runtime. See [Runtime Configuration](#runtime-configuration) for alternatives (Codex, Copilot, Gemini, Cursor). |

Start the long-lived services. `gt up` boots Dolt, the daemon, the Deacon, the Mayor, and per-rig Witnesses and Refineries.

Use `gt rig add` to clone a repository into your HQ as a rig.

```bash
gt rig add myproject https://github.com/you/repo.git
```

Rig names accept letters, digits, and underscores. Hyphens, dots, spaces, and path separators are not allowed. Use `my_project` instead of `my-project`.

To set a custom beads prefix for the rig, pass `--prefix`.

```bash
gt rig add myproject https://github.com/you/repo.git --prefix mp
```

```bash
gt crew add yourname --rig myproject
cd myproject/crew/yourname
```

The Mayor coordinates work across rigs.

```bash
gt mayor attach
```

```bash
export GIT_USER="<your name>"
export GIT_EMAIL="<your email>"
export FOLDER="/path/to/empty/dir"   # empty directory or existing Gas Town HQ
export DASHBOARD_PORT=8080           # optional, host port for the dashboard

```bash
gt enable                         # enable Gas Town global state
gt shell install                  # install shell integration
gt up --restore                   # start services and restore worker settings
gh auth login                     # optional: required for private GitHub rigs
gt mayor attach
```

The dashboard port is exposed from the container to the host. Treat it as a trusted local-network surface, and do not point `FOLDER` at a host workspace that a native `gt` install is using at the same time.

### Getting Started
Run
```shell
git config --global user.name "Your Name" &&
git config --global user.email "you@example.com" &&
gt install ~/gt --shell --git &&
cd ~/gt &&
gt up &&
gt doctor --fix &&
gt config agent list &&
gt mayor attach
```
and tell the Mayor what you want to build!

    You->>Mayor: Tell Mayor what to build
    Mayor->>Convoy: Create convoy with beads
    Mayor->>Agent: Sling bead to agent
    Agent->>Hook: Store work state
    Agent->>Agent: Complete work
    Agent->>Convoy: Report completion
    Mayor->>You: Summary of progress
```

```bash
# 1. Start the Mayor
gt mayor attach

```bash
# Attach to Mayor
gt mayor attach

Run individual runtime instances manually. Gas Town just tracks state.

Gas Town supports multiple AI coding runtimes. Per-rig runtime settings are in `settings/config.json`.
