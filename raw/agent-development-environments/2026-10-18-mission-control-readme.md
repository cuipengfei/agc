# Mission Control — README 关键段落摘录

> Source: https://github.com/builderz-labs/mission-control (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"Self-hosted control plane for AI agents: dispatch tasks, review runs, track spend, and operate OpenClaw, Claude Code, Codex, and other runtimes.","pushed":"2026-10-12T01:31:17Z","stars":6365,"url":"https://github.com/builderz-labs/mission-control"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

An open-source project by [Builderz Labs](https://builderz.dev), created and maintained by [nyk](https://nyk.dev).
It works with OpenClaw, Claude Code, Codex, and other runtimes - it is not part of any one of them.

<img src="docs/mission-control-overview.png" alt="Mission Control overview dashboard with active sessions, live activity, fleet status per runtime, and the task pipeline" width="900">

> [!WARNING]
> Mission Control is alpha software. APIs, schemas, and configuration may change between
> releases. Read the [security guidance](#security-boundary) before exposing it to a network.

| Area | Shipped surface |
|---|---|
| Tasks | Inbox, assignment, execution, review, Aegis quality gate, and completion receipts |
| Agents | Registration, presence, sessions, runtime adapters, configuration, and workspace sync |
| Operations | Activity stream, schedules, alerts, webhooks, logs, token use, and cost views |
| Knowledge | Memory browser, relationship graph, skills registry, and local skill synchronization |
| Governance | Roles, API keys, security events, trust signals, approvals, audits, and evals |
| Interfaces | Web UI, CLI, MCP server, OpenAPI-described REST API, WebSocket, and SSE |

The runtime is self-hosted and workspace-aware. SQLite stores local control-plane state.
Shared workspaces can use deployment-level runtime integrations. Strict workspaces block
those integrations until the underlying resources carry workspace ownership. A gateway is
optional for task, project, agent, scheduler, webhook, alert, and cost work; live session
messaging needs a connected runtime gateway.

![Mission Control operator field notes](docs/operator-field-notes.webp)

- one agent on one machine already stays understandable from its native CLI;
- you need a managed multi-tenant SaaS rather than a self-hosted control plane;
- you want an agent framework to define planning and tool use;
- your deployment cannot tolerate alpha schema or API changes.

Agent views combine registration state, heartbeats, sessions, configuration, local runtime
discovery, and workspace files.

![Mission Control agents panel showing a five-agent squad with roles, heartbeats, and workspace conventions](docs/mission-control-agents.png)

The memory browser and relationship graph inspect filesystem-backed memory and linked
session knowledge. The Skills Hub discovers local skill roots and scans registry content
before installation.

| Guide | Use it for |
|---|---|
| [Quickstart](docs/quickstart.md) | Register an agent and run the first task loop |
| [Agent setup](docs/agent-setup.md) | Sources, identities, SOUL files, and heartbeats |
| [Orchestration](docs/orchestration.md) | Dispatch, handoffs, workflows, and review gates |
| [CLI and MCP](docs/cli-agent-control.md) | Headless commands and agent tools |
| [CLI integration](docs/cli-integration.md) | Claude Code, Codex, and gateway-free connections |
| [Deployment](docs/deployment.md) | Local, Docker, standalone, reverse proxy, and VPS setup |
| [Security hardening](docs/SECURITY-HARDENING.md) | Network, container, CSP, and secret controls |
| [Support](SUPPORT.md) | Questions, bugs, feature proposals, and security-report routing |
| [OpenClaw compatibility](docs/openclaw-config-compatibility.md) | Config and state-directory behavior |
| [Release process](RELEASE.md) | Versioning, tags, images, and release checks |

```text
Web UI ─┐
CLI ────┼── auth ─ dispatch ─ events ─ policy ─ receipts
MCP ────┤                                      │
REST ───┘                         SQLite + agent runtimes
```

| Layer | Technology |
|---|---|
| Application | Next.js 16 App Router, React 19, TypeScript 5 |
| Interface | Tailwind CSS 4, Zustand, Recharts, xterm.js |
| State | SQLite through better-sqlite3, with WAL mode |
| Boundaries | REST/OpenAPI, MCP, CLI, WebSocket, and SSE |
| Access | Session cookies, API keys, Google sign-in, and role checks |
| Validation | Zod at input boundaries |
| Verification | Vitest, Playwright, ESLint, TypeScript, build, and API parity checks |

- Keep Mission Control on a trusted network unless a TLS reverse proxy and
  `MC_ALLOWED_HOSTS` are configured.
- Replace or securely store generated credentials before broader access.
- Use the hardened Compose overlay for production-like container deployments.
- Treat agent messages, skill packages, webhooks, and MCP content as untrusted input.
- Report vulnerabilities through [SECURITY.md](SECURITY.md), not a public issue.

Access controls and security inspection surfaces are included, but alpha status
still applies. Read [SECURITY-HARDENING.md](docs/SECURITY-HARDENING.md) before relying on a
network-accessible deployment.

| Symptom | Check |
|---|---|
| Login returns an internal error after changing Node versions | Run `pnpm rebuild better-sqlite3` |
| Docker cannot reach the gateway | Set `OPENCLAW_GATEWAY_HOST=host.docker.internal` |
| Browser WebSocket cannot connect | Leave `NEXT_PUBLIC_GATEWAY_HOST` empty or set a browser-reachable host |
| Password text after `#` disappears | Quote `AUTH_PASS` or use `AUTH_PASS_B64` |

## Project status and support

Release notes live in [CHANGELOG.md](CHANGELOG.md). Open issues are the current roadmap;
the project does not promise dates for unassigned work.
