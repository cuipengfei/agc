# CLI Agent Orchestrator — README 关键段落摘录

> Source: https://github.com/awslabs/cli-agent-orchestrator (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"Multi-agent orchestration for AI coding CLIs — Claude Code, Kiro, Codex, and more, coordinated in isolated tmux sessions","pushed":"2026-10-18T12:47:42Z","stars":1447,"url":"https://github.com/awslabs/cli-agent-orchestrator"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

<!-- An absolute raw URL, not a repo-relative path: this file is also the PyPI
     long description (see `readme` in pyproject.toml) and PyPI cannot resolve
     relative paths.

[![PyPI version](https://img.shields.io/pypi/v/cli-agent-orchestrator.svg)](https://pypi.org/project/cli-agent-orchestrator/)
[![Python versions](https://img.shields.io/pypi/pyversions/cli-agent-orchestrator.svg)](https://pypi.org/project/cli-agent-orchestrator/)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/awslabs/cli-agent-orchestrator)

CAO runs a local `cao-server`, starts provider CLIs in isolated terminal
sessions, and gives a supervisor tools for coordinating workers. The agents
remain full CLI processes with their native authentication and capabilities.
See [CODEBASE.md](CODEBASE.md) for the runtime architecture and package layout.

- Python 3.10 or later
- tmux 3.3 or later
- [uv](https://docs.astral.sh/uv/)
- At least one supported provider CLI, authenticated before you launch CAO:
  [Kiro CLI](docs/kiro-cli.md), [Claude Code](docs/claude-code.md),
  [Codex CLI](docs/codex-cli.md), [Antigravity CLI](docs/antigravity-cli.md),
  [Hermes](docs/hermes.md), [Kimi CLI](docs/kimi-cli.md),
  [MiniMax Code](docs/minimax-code.md),
  [GitHub Copilot CLI](docs/copilot-cli.md),
  [OpenCode CLI](docs/opencode-cli.md), [Oh My Pi(OMP) CLI](docs/omp-cli.md),
  [Cursor CLI](docs/cursor-cli.md), or
  [Grok Build CLI](docs/grok-cli.md)

4. Observe the supervisor in the attached launch terminal, open the
   [Web UI](docs/web-ui.md) at `http://localhost:9889`, or follow the
   [tmux guide](docs/tmux.md) to attach to its session.

5. Stop the named session when finished:

   ```bash
   cao shutdown --session {session-name}
   ```

   To stop every CAO session instead, run `cao shutdown --all`.

- [Control-plane selection](docs/control-planes.md): choose the Web UI, shell
  CLI, operations MCP server, or plugins.
- [Web UI](docs/web-ui.md) and [MCP Apps](docs/mcp-apps.md): browser and
  host-rendered fleet interfaces.
- [Flows](docs/flows.md) and [workflows](docs/workflows.md): scheduled runs and
  multi-step pipelines.
- [Launch decisions](docs/decisions.md): local routing settings and content-free records.
- [Skills](docs/skills.md): install, scope, and author reusable agent guidance.
- [Memory](docs/memory.md) and [self-learning](docs/self-learning.md):
  persistent cross-session memory, and the opt-in loop that turns workflow
  outcomes into lessons and promoted instructions.
- [AI-DLC portfolio example](examples/aidlc-portfolio/README.md): coordinate
  parallel AI-DLC intents across repositories and isolated worktrees.
- [Cross-zone robot transport](examples/robotics/cross-zone-transport/README.md):
  coordinate simulated transport, measured custody handoffs, and independent checks.
- [Tool restrictions](docs/tool-restrictions.md): roles, allowlists, and
  provider enforcement.
- [Kubernetes deployment](examples/cao-clusters/kubernetes/eks/README.md): run a supervisor and worker fleet on
  Amazon EKS, with shared workspace, per-pod state, and credential delivery.
- [Updating CAO](docs/updating.md): update an installed uv tool.

- [Ephemeral agents](docs/ephemeral-agents.md): opt-in create-only profiles and their limits.
- [Agent profiles](docs/agent-profile.md): profile schema, discovery, provider
  selection, and overrides.
- [HTTP API and PTY WebSocket](docs/api.md): route-family overview and terminal
  streaming contract.
- [Agent plugins](docs/agent-plugins.md): installing portable Agent Plugins
  1.0.0 packages, and CAO's own operator and contributor packages. Every
  surface — the CLI, TUI, web panel, and the `/plugins*` HTTP routes — is built
  but **gated off by default** pending a naming decision. Set
  `CAO_AGENT_PLUGINS_ENABLED` to open it; until then the routes answer `404`,
  exactly as an unregistered path would.
- [Event plugins](docs/plugins.md): outbound events, installation, and authoring.
- Provider behavior:
  [Kiro CLI](docs/kiro-cli.md), [Claude Code](docs/claude-code.md),
  [Codex CLI](docs/codex-cli.md), [Antigravity CLI](docs/antigravity-cli.md),
  [Hermes](docs/hermes.md), [Kimi CLI](docs/kimi-cli.md),
  [MiniMax Code](docs/minimax-code.md),
  [GitHub Copilot CLI](docs/copilot-cli.md),
  [OpenCode CLI](docs/opencode-cli.md), [Oh My Pi(OMP) CLI](docs/omp-cli.md),
  [Cursor CLI](docs/cursor-cli.md), and
  [Grok Build CLI](docs/grok-cli.md).
- [Security policy](SECURITY.md): vulnerability reporting and deployment
  guidance.
