# awesome-software-factories: 清单原文摘录与 API 原始值

> Source: https://github.com/varun1505/awesome-software-factories (README) + GitHub API + 各仓库 README
> Collected: 2026-10-29
> Published: Unknown

## GitHub API 原始值（stargazers_count/pushed_at，2026-10-29）


- OpenHands/OpenHands: stargazers_count=92184, pushed_at=2026-10-29T12:32:48Z, archived=False, description='🙌 OpenHands: AI-Driven Development'


- multica-ai/multica: stargazers_count=54233, pushed_at=2026-10-29T13:58:43Z, archived=False, description='Make humans and AI agents work as one team — open-source and self-hostable.'


- superplanehq/superplane: stargazers_count=8379, pushed_at=2026-10-29T14:08:44Z, archived=False, description='Open source factory for one-shot engineering'


- builderz-labs/mission-control: stargazers_count=6410, pushed_at=2026-10-28T16:26:12Z, archived=False, description='Self-hosted control plane for AI agents: dispatch tasks, review runs, track spend, and operate OpenClaw, Claude Code, Codex, and other runtimes.'


- generalaction/emdash: stargazers_count=6109, pushed_at=2026-10-26T16:28:05Z, archived=False, description='Emdash is the Open-Source Agentic Development Environment (🧡 YC W26). Run multiple coding agents in parallel. Use any provider.'


- e2b-dev/E2B: stargazers_count=14606, pushed_at=2026-10-29T01:33:21Z, archived=False, description='Open-source, secure environment with real-world tools for enterprise-grade agents.'


- superradcompany/microsandbox: stargazers_count=8860, pushed_at=2026-10-29T14:05:11Z, archived=False, description='🧱 easy, fast, programmable and local-first microVM runtime and library'


- goossaert/backlog-loop: stargazers_count=0, pushed_at=2026-09-25T21:27:56Z, archived=False, description=None


- stratonext/software-factory: stargazers_count=11, pushed_at=2026-10-09T03:21:31Z, archived=False, description='Local Software Factory'


- BeeverForge/openfactory-core: stargazers_count=8, pushed_at=2026-10-28T21:45:23Z, archived=False, description='OpenFactory is now BeeverForge. This is the legacy OpenFactory 0.7 line, which gets security fixes only until BeeverForge 1.0. New work, issues and releases: github.com/BeeverForge/beeverforge-oss'


- BeeverForge/beeverforge-oss: stargazers_count=1, pushed_at=2026-10-28T23:06:42Z, archived=False, description='An autonomous software factory: tickets in, reviewed pull requests out. Apache-2.0, runs on your machines, no vendor lock-in.'


- mosonlab/anneal: stargazers_count=191, pushed_at=2026-09-26T06:51:46Z, archived=False, description='You write the specs. It clears the board: coding agent chains plan, review, implement, verify and merge unattended on your own machine, on the GPT and Claude subscriptions you already have.'


- tellahq/opensession: stargazers_count=404, pushed_at=2026-10-29T11:24:04Z, archived=False, description=None

## OpenHands/OpenHands README 原文摘录

```
| [**Self-host your way**](https://docs.openhands.dev/openhands/usage/agent-canvas/backend-setup/vm)                   | Run agents locally, in Docker, on VMs, or anywhere you can run an agent server backend                                                   |
| [**Switch between different backends**](https://docs.openhands.dev/openhands/usage/agent-canvas/backends)            | Switch between local, remote, and cloud agents without losing focus                                                                      |
| [**Create automations**](https://docs.openhands.dev/openhands/usage/agent-canvas/prebuilt-automations)               | Create automations and workflows that integrate with Slack, GitHub, Linear, and more. Run on a schedule or in response to webhook events |
| [**Integrate with the tools you use**](https://docs.openhands.dev/openhands/usage/agent-canvas/prebuilt-automations) | Connect your automations with third-party services like Slack, GitHub, Notion, and more to automate workflows                            |
| [**Bring your own model**](https://docs.openhands.dev/openhands/usage/settings/llm-settings#llm-profiles)            | Use with any LLM                                                                                                                         |
| [**Use with any agent**](https://docs.openhands.dev/openhands/usage/agent-canvas/acp-agents)                         | Use with OpenHands, Claude Code, Codex, Gemini, Pi, OpenCode, or any agent with Agent-Client Protocol (ACP).                             |
> This runs the agent-server directly on the machine you're installing on — the agent will have full access to your filesystem!
### Option 2: With a Docker Sandbox
- Docker: Docker Desktop on macOS/Windows, or Docker Engine/Docker Desktop on Linux.
- A host directory for `PROJECTS_PATH` containing the project folders you want the agent to access. Create it before starting the container.
### Option 3: With Multiple Docker Sandboxes
> This runs the agent-server directly on the machine you're installing on — the agent will have full access to your filesystem!
| [`OpenHands/OpenHands`](https://github.com/OpenHands/OpenHands)                   | Agent Canvas frontend, user-facing control center, backend selection, and local-stack orchestration.      |
| [`OpenHands/software-agent-sdk`](https://github.com/OpenHands/software-agent-sdk) | Python SDK, Agent Server, agents, tools, conversations, workspaces, events, and the canonical server API. |
| [`OpenHands/typescript-client`](https://github.com/OpenHands/typescript-client)   | Browser-compatible TypeScript client for the Agent Server API.                                            |
| [`OpenHands/automation`](https://github.com/OpenHands/automation)                 | Automation definitions, scheduling, webhooks, run history, and dispatching.                               |
- [Development guide](./docs/DEVELOPMENT.md), including [embedding Canvas components in a host app](./docs/DEVELOPMENT.md#css-isolation-and-host-app-customization) (load `@openhands/agent-canvas/styles.css` once next to the component imports)
- [Self-hosting guide](./docs/SELF_HOSTING.md)
```


## multica-ai/multica README 原文摘录

```
- **[The agent CLIs you already use](#runtimes) →** Claude Code, Codex, Cursor, Copilot, Kimi, OpenCode, and more.
- **[Agents as teammates](https://multica.ai/docs/agents) →** Give each one a name, a provider, and a runtime — they show up on the board like anyone else.
- **[Squads](https://multica.ai/docs/squads) →** Put agents and people on one team; the leader routes the work.
- **[Skills](https://multica.ai/docs/skills) →** Turn a solved problem into a playbook every agent reuses.
- **[Your own runtime](https://multica.ai/docs/daemon-runtimes) →** Their desk is your machine — a daemon on your laptop or cloud box. Code never leaves it.
- **[Assign an issue](https://multica.ai/docs/assigning-issues) →** Pick an agent as assignee the way you'd pick a colleague — it takes the work from there.
- **[Projects](https://multica.ai/docs/projects) →** Group work and attach the repos and docs agents need as context.
- **Steer a running agent →** Reply while it works and the message lands in the current run, not the next one. Claude Code, Codex, Grok, and Kiro today.
- **Usage analytics →** See what each run cost, per agent and per issue.
- **[Review gates](https://multica.ai/docs/issues) →** Work lands in review, not in main. You decide what ships.
- **[Inbox](https://multica.ai/docs/inbox) →** Get pinged when an agent needs a call, not for every step.
- **[Self-host everything](SELF_HOSTING.md) →** Docker Compose or Helm, on your own infrastructure.
- **[Your Git host](https://multica.ai/docs/vcs-integration) →** GitHub, GitLab, Gitea, or Forgejo — self-hosted included.
- **[Workspaces](https://multica.ai/docs/workspaces) →** Separate agents, issues, and settings per team.
- **[Roles](https://multica.ai/docs/members-roles) and [access scopes](https://multica.ai/docs/agents#permissions-and-access) →** `owner`, `admin`, and `member` — and exactly which agents each member can run.
- **[Security model](https://multica.ai/docs/security-model) →** What an agent can reach, and what it can't.
- **[Slack, Feishu/Lark, DingTalk, WeCom, and Telegram](https://multica.ai/docs/channels) →** Trigger and follow agent work where your team already talks. New Feishu/Lark connections are open to mainland-China Feishu only for now; DingTalk, WeCom, and Telegram are [community-maintained](https://multica.ai/docs/community-maintained).
- **Web, [desktop](https://multica.ai/docs/desktop-app), and [mobile](https://multica.ai/docs/mobile-app) →** The same workspace on macOS, Windows, Linux, iPhone, and iPad — the iOS app builds from source today, not yet on the App Store.
- **[CLI and API](https://multica.ai/docs/cli) →** Every surface is scriptable. Agents drive Multica through the same CLI you do.
- **Self-host** — run the whole stack on your own infrastructure; see below.
### Your first agent in five minutes
## Runtimes
| Provider | CLI | Provider | CLI |
| Cursor Agent | `cursor-agent` | GitHub Copilot CLI | `copilot` |
| Get an agent doing something today | [Quickstart](https://multica.ai/docs/cloud-quickstart) · [Tutorial](https://multica.ai/docs/tutorial) |
| Create and configure agents | [Agents](https://multica.ai/docs/agents) · [Create an agent](https://multica.ai/docs/agents-create) · [Skills](https://multica.ai/docs/skills) |
| Get work to an agent | [Triggering agents](https://multica.ai/docs/triggering-agents) · [Assigning issues](https://multica.ai/docs/assigning-issues) · [Mentions](https://multica.ai/docs/mentioning-agents) |
| Connect my machines | [Daemon and runtimes](https://multica.ai/docs/daemon-runtimes) · [Install an agent runtime](https://multica.ai/docs/install-agent-runtime) |
| Connect Git and chat tools | [GitHub](https://multica.ai/docs/github-integration) · [Self-hosted Git](https://multica.ai/docs/vcs-integration) · [Channels](https://multica.ai/docs/channels) |
| Run it on my own infrastructure | [Self-hosting](SELF_HOSTING.md) · [Security model](https://multica.ai/docs/security-model) · [Environment variables](https://multica.ai/docs/environment-variables) |
| Work out why an agent is stuck | [Runs](https://multica.ai/docs/tasks) · [Troubleshooting](https://multica.ai/docs/troubleshooting) |
| Web | Next.js 16 (App Router) |
| Desktop | Electron, sharing the web UI packages |
| Backend | Go (Chi router, sqlc, gorilla/websocket) |
| Agent runtime | Local daemon executing any [supported agent CLI](#runtimes) |
```


## superplanehq/superplane README 原文摘录

```
SuperPlane turns high-confidence backlog issues into verified, review-ready
pull requests so engineers can focus on work that needs judgment.
SuperPlane lets AI agents fully automate routine development work. It
coordinates coding agents, source control, CI, review, approvals and feedback
The factory continuously evaluates which backlog issues agents can handle with
high confidence. It applies the same workflow-level guardrails to every run,
checks the result and sends failures back to the agent with actionable context.
helps refine the plan, and identifies decisions that need your input before
SuperPlane checks the agent's work and sends failures back for correction.
An agent review assesses merge confidence and highlights remaining concerns,
can also wait for an event from your tools, call an agent, or ask a person for
approval.
SuperPlane imports the issues and assesses which tasks are suitable for an agent.
### Turn backlog issues into work agents can deliver
### Bring verified changes to human review
- Read the [product overview](https://docs.superplane.com/get-started/overview/) to learn how SuperPlane coordinates agents and verification.
### Self-host
- Use Docker Compose on one Linux VM.
- [X](https://x.com/superplanehq) for product updates
```


## builderz-labs/mission-control README 原文摘录

```
### Start with Docker
| Tasks | Inbox, assignment, execution, review, Aegis quality gate, and completion receipts |
| Agents | Registration, presence, sessions, runtime adapters, configuration, and workspace sync |
| Operations | Activity stream, schedules, alerts, webhooks, logs, token use, and cost views |
| Governance | Roles, API keys, security events, trust signals, approvals, audits, and evals |
| Interfaces | Web UI, CLI, MCP server, OpenAPI-described REST API, WebSocket, and SSE |
- one agent on one machine already stays understandable from its native CLI;
- you need a managed multi-tenant SaaS rather than a self-hosted control plane;
- you want an agent framework to define planning and tool use;
- your deployment cannot tolerate alpha schema or API changes.
## Connect an agent
## Product surfaces
### Tasks and quality review
### Agents and runtimes
| [Quickstart](docs/quickstart.md) | Register an agent and run the first task loop |
| [Agent setup](docs/agent-setup.md) | Sources, identities, SOUL files, and heartbeats |
| [Orchestration](docs/orchestration.md) | Dispatch, handoffs, workflows, and review gates |
| [CLI and MCP](docs/cli-agent-control.md) | Headless commands and agent tools |
| [CLI integration](docs/cli-integration.md) | Claude Code, Codex, and gateway-free connections |
| [Deployment](docs/deployment.md) | Local, Docker, standalone, reverse proxy, and VPS setup |
| [Support](SUPPORT.md) | Questions, bugs, feature proposals, and security-report routing |
| [Release process](RELEASE.md) | Versioning, tags, images, and release checks |
| Boundaries | REST/OpenAPI, MCP, CLI, WebSocket, and SSE |
- Keep Mission Control on a trusted network unless a TLS reverse proxy and
- Use the hardened Compose overlay for production-like container deployments.
- Treat agent messages, skill packages, webhooks, and MCP content as untrusted input.
- Report vulnerabilities through [SECURITY.md](SECURITY.md), not a public issue.
| Docker cannot reach the gateway | Set `OPENCLAW_GATEWAY_HOST=host.docker.internal` |
| Browser WebSocket cannot connect | Leave `NEXT_PUBLIC_GATEWAY_HOST` empty or set a browser-reachable host |
## Project status and support
- Bugs and feature proposals: [GitHub Issues](https://github.com/builderz-labs/mission-control/issues)
- Vulnerabilities: [private reporting instructions](SECURITY.md)
```

## backlog-loop README 关卡相关原文行

```
### External / shared install (recommended)
### Gate startup self-test — the mandatory check after any tool pull
### Gate-code freshness guard — the loop stops when its own code changes under it
### Post-stage verification gate
### RED-base dispatch guard
- **#2 Stage sandbox** — wired via `ai-jail` (same-host jail; `sandbox-exec` on
- **→ `atdd`**, the defect is a *missing test*: (c), (f), (h), (e-mutation), and both
| **apply-docs** | `apply-docs` | Applies the glossary edits and writes the ADRs that grill prepared, then advances to plan. *Why:* keeps grill a pure thinking step and makes documentation a committed, reviewable act separate from the conversation. |
| **atdd** | `stage-atdd` | Writes **failing** acceptance + inner tests for the current slice using triangulation (happy / boundary / negative / property) and confirms the RED gate (re-confirmed by the orchestrator's post-stage gate). Writes no production code. *Why:* tests authored before — and independently of — the implementation become honest, un-gameable evidence of behavior; triangulation blocks hard-coding. |
| **implement** | `stage-implement` | Writes production code until the committed tests pass and full `verify` is green — **without editing tests** (a staged-diff check enforces it, re-derived by the orchestrator's post-stage gate). *Why:* the test commit is a frozen contract; forbidding test edits prevents "moving the goalposts" to force a pass. |
| **plan** | `stage-feature` | Writes a rigorous plan decomposed into **thin vertical slices** (feature-phases), each with a behavioral rule, invariants, counterexamples, and forbidden shortcuts; sets the authoritative `total_phases`. *Why:* each slice is independently observable (a "tracer bullet"), so progress is visible and every feature-phase is independently testable. |
| **review** (integrity) | `stage-review` | An **independent** verifier reads the plan and diff *before* the tests and hunts the failure class where the *tests, or the test↔production relationship,* are the problem: test-gaming/overfitting, test tamper/immutability, mutation adequacy, and PBT/oracle coverage gaps. Owns its state transition; a PASS hands to review-correctness. *Why:* "do the tests pass?" is already known and worthless; reading plan-first catches the shortcuts and weak tests a green suite would hide. |
| **review-correctness** | `stage-review-correctness` | A second **independent**, fresh-session reviewer reasoning from the **spec** (plan rules + invariants + diff), **not** the tests, for correctness bugs that *pass* a green suite — logic/off-by-one, untested edges, error-handling/leaks, security, complexity blowups — scoped to correctness/stated requirements and filtered through a judge pass. A FAIL is a production bug → re-implement. Owns the advance to the next feature-phase / `done`. *Why:* 40–60% of LLM code carries bugs the tests miss, and independent spec/static review catches a largely disjoint ~65% ([CodeX-Verify](https://arxiv.org/pdf/2511.16708)). It is the quality gate that lets commits go straight to the branch. |
| `atdd` | **(c) alone** — the RED re-confirmation. Nothing else runs. | → `atdd` |
| `auth_retry` | `{max_consecutive_pauses: 3, backoff_initial_seconds: 30, backoff_max_seconds: 600, startup_probe: true}` | **transient-auth resilience** (`ai-jail` reuses the host `~/.claude`, which can expire mid-run → a stage 401s with no commit). A stage abort whose log carries a tight auth signature is treated as a **transient outage, not a crash**: the loop discards the partial tree, backs off (`backoff_initial_seconds` doubling to `backoff_max_seconds`), and re-runs the **same** stage **without** burning the crash/retry budget — so an out-of-band re-auth resumes cleanly. `max_consecutive_pauses` caps consecutive auth-pauses per stage (exceeding it flags for human with a *re-authenticate* reason, so a permanently-bad credential never spins). `startup_probe: true` runs a one-shot **token health-probe** at loop start (non-fake backends only) that `die`s with a *re-authenticate the host `~/.claude`, then restart* message **before** any stage is dispatched, catching an already-expired credential fast; set `false` to opt out. Independent of the usage-limit path. See SCHEMAS.md *Transient-auth resilience fields* |
| `auto_heal` | `true` | the [startup auto-heal](#startup-auto-heal--host-fault-flag-recovery) switch: clear + re-queue a stamped host-fault flag whose `flagged_by_tool_commit` differs from the running tool commit (at most once per tool-commit change; model-`blocked` flags never). **Project-local, not a trusted key** — `false` only reduces recovery; the gate re-judges every re-queued attempt regardless. See SCHEMAS.md *Startup auto-heal* |
| `contract` | `{enabled: false, assert_symbols: ""}` | **opt-in** contract-assertion floor — gate sub-check (g): when `enabled` and the plan declares ≥1 `[contract]` invariant, the changed production code must contain ≥1 runtime assertion (`assert_symbols`, lenient built-in default), rewinding a miss to `implement`. WEAK floor — confirms the change isn't assertion-free, **not** that the right contracts exist |
| `correctness_gate` | `{enabled: true, *_command: "", suppression_pattern: ""}` | the static-correctness stack `verify_command` runs: `typecheck_command` (strict), `lint_command` (warnings = errors), `sast_command`, `sanitizer_command` (native only), `dep_scan_command`, `secret_scan_command`; each empty ⇒ that layer is N/A for this repo. `analysis_command` is the static subset the gate sub-check **(e-analysis)** re-runs deterministically (inherited by `gate.analysis_command`). Each **non-empty** per-layer command is now **also re-run on a fresh worktree by gate sub-check (s1)** (exit 0 required; empty layer ⇒ skip), and (s2) scans the implement commit's added production lines for blanket suppressions — `suppression_pattern` overrides the built-in alternation (`@ts-nocheck` / `# type: ignore` / `eslint-disable` / `# noqa` / `# nolint` …); both gated by `enabled` (a trusted safer-bool: an in-repo `false` cannot switch off a trusted-on stack). **Scope of "mandatory":** the master switch defaults on and no *configured* layer can be weakened or suppressed — but (s1) is **self-gating per layer**, so an unconfigured layer is silently skipped rather than demanded. What forces a layer to exist at all is the toolchain **forcing rule** + a human-recorded `n/a`, not this key. See SCHEMAS.md *Static-correctness fields* |
| `gate.enabled` | `true` | run the deterministic post-stage verification gate after each committed stage |
| `gate.forbidden_pattern_scan` | `{matcher: ast-grep, rules: ""}` | structural matcher (`ast-grep`\|`semgrep`\|`regex`) + optional ruleset for the production forbidden-pattern scan — **gate sub-check (d), now wired** (always-on under the master switch): the host runs the human-selected `matcher` (read TRUSTED, so a session can't downgrade it) over the commit's changed production files, falling back to a conservative built-in REGEX (`log_warn`'d) when an AST tool/rules file is absent. Catches prod imports from tests/fixtures/fakes/`__mocks__` and `NODE_ENV=="test"` / `process.env.TEST` branches |
| `gate.mutation_command` / `gate.analysis_command` | `""` | the two (e)-family hooks — **same letter, different failure semantics**: **(e-mutation)** `mutation_command` runs the mutation-score check (inherits `mutation.command`, enforces `mutation.min_score`, off unless `mutation.enabled`) and a sub-threshold score rewinds to **`atdd`** (the defect is a missing kill-test); **(e-analysis)** `analysis_command` re-runs the static-correctness layers deterministically (inherits `correctness_gate.analysis_command`, off unless `correctness_gate.enabled`) and a failure rewinds to **`implement`** (the defect is in production). Both are trusted-wins reads |
| `gate.protected_phases` | `["implement","review","review-correctness"]` | the post-test-freeze stages the gate's freeze-protection sub-checks run against (the stages that must not modify tests); `implement` runs the full set, while `review`/`review-correctness` run the (a)/(b) subset (a failure rewinds to the same review stage); `atdd` is deliberately absent — its RED-gate sub-check (c) applies unconditionally |
| `gate.self_check` | `true` | **gate startup self-test** — before a real-backend loop dispatches any stage, run the gate's own unit suite (`test/test_core.sh && test/test_units.sh`) from the Tool install dir and refuse to start (`die`, exit non-zero, no dispatch) if it is RED. Read **trusted/stricter-wins** (like `gate.enabled`): an in-repo `false` can't disable a **trusted-on** self-test. ⚠ It *can*, however, disable a merely **default-on** one — `cfg_get_trusted_safer_bool` falls back to the `true` default only when **both** sources are silent, so an explicit in-repo `false` with no overlay present yields `false`. Pin `gate.self_check: true` in the trusted overlay if a sandboxed session must not be able to opt out. Never runs on `--backend fake`; detect-only. See *Gate startup self-test* |
| `gate.stale_check` | `true` | **gate-code freshness guard** — the loop content-fingerprints (`git hash-object`, never mtime) the `lib/*.sh` files its startup block sourced and re-checks them at every **between-stage checkpoint**; on a change it emits a `loop-stopped` notify naming the changed file, says "gate code changed on disk … restart required", and exits non-zero. **A restart is the intended response** — it re-sources the new code, and `gate.self_check` then validates it. Detect-only (never re-execs), never fires mid-stage, and **backend-agnostic** (the host's own code is stale under any backend). Read **trusted/stricter-wins**: an in-repo `false` can't disable a trusted-on guard. See *Gate-code freshness guard* |
| `hermetic_verify` | `{enabled: true, network_disable: "auto", fresh_checkout: "worktree"}` | clean-room re-run of `verify_command` on a **fresh throwaway `git worktree` of the commit** — the gate's sub-check (b) mechanism, run by `implement` as first line of defense. ⚠ **`network_disable` is currently inert**: `gate_net_wrap` (`lib/gate.sh:250`) only disables the network when a `net_disabled` wrapper is on `PATH`, and the tool ships none, so the re-run degrades to a direct run; `cfg_hermetic_network_disable` is defined but not yet read by any caller. **Deps are not lockfile-pinned either** — `gate_make_worktree` symlinks `gate.worktree_link_paths` (`node_modules/`, …) from the live repo and may run an optional, explicitly non-fatal `gate.worktree_install_command`. Both the network wrapper and the lockfile pin are **specified but not landed** (owned by the trust-the-green change, `docs/plans/0002` §(b)); the load-bearing part that *is* live is the fresh checkout, which catches a faked-green or working-tree-dependent verify |
| `implement` | (a) no staged test path → forcing: PBT-required-but-unconfigured → forcing: mutation-required-but-unconfigured → (f) PBT floor → (h) oracle-free floor → (b) hermetic verify → (d) forbidden-pattern scan → (g) contract floor → (e-mutation) score → (e-analysis) exit 0 → (s1)/(s2) static layers + suppression scan | → `atdd` **or** `implement`, per check (see below) |
| `logs_dir` | `.backlog-logs` | per-stage transcripts + the live `current.json` / `loop.pid` pointers (gitignored) |
| `mutation` | `{enabled: true, tool: "", command: "", min_score: 80, scope: "changed-files", business_logic_globs: [], pbt_command: ""}` | scored mutation-adequacy gate: when `enabled` (**default-on in the shipped template** — a fresh repo's business-logic work is mutation-scored, `command` populated per-repo by grill→apply-docs; ⚠ note the *absent-key* fallback in `lib/config.sh` is `false`, so a legacy repo predating this key is **off**, not on, until migrated — and `enabled` is a plain `cfg_get`, **not** a trusted read, so the backstop against a session switching it off is the forcing rule + a human-recorded `n/a`, not the overlay), `/stage-review` runs `command` over the stage's **changed files** (gate sub-check **(e-mutation)** re-runs it authoritatively, parsing the score from the engine's own output rather than the reviewer's self-report) and FAILs below `min_score`% (default 80, read stricter-wins from the overlay) → re-run `atdd` for kill-tests; `tool` records the **human-selected engine** (see *Per-project test toolchain*), documentation only; `business_logic_globs` (trusted-array) narrows the forcing rule's "changed a business-logic file" trigger so config/generated/wiring-only commits stop force-rejecting; `pbt_command` is a **spec-only** second engine command for property-scoped mutation (Rec B — not yet wired) |
| `oracle_free` | `{enabled: false, marker: "", min_per_phase: 1}` | **opt-in** oracle-free floor — gate sub-check (h): when `enabled`, each (c) oracle-free plan phase needs a committed test carrying the manufactured `marker` (the analogue of `pbt.import_symbol` — there is no canonical metamorphic/differential test token), rewinding a miss to `atdd`. Structural existence floor only |
| `pbt` | `{enabled: false, framework: "", import_symbol: "", min_per_rule: 1}` | property-based-testing block (mirrors `mutation`): `framework` is the **human-selected** PBT library `/stage-atdd` authors against (never model-picked); gate sub-check (f) greps committed tests under `test_paths` for `import_symbol` and rewinds to `atdd` if a non-N/A parametric plan property has fewer than `min_per_rule` property tests. **Scoped to the feature-phase being committed** — the floor reads only the plan's `## Phase <current_phase>` slice, so a thin vertical slice is judged on its own properties, never the whole plan's. `enabled:false` (a recorded N/A) waives the floor, and like `mutation.enabled` it is a plain `cfg_get` backstopped by the forcing rule. See *Per-project test toolchain* |
| `review_correctness.cross_family` | `{enabled: false, provider: "gemini", model: "gemini-3.5-flash", api_key_env: "GEMINI_API_KEY", endpoint: ".../v1beta", transport: "inline", timeout_s: 120, on_api_error: "warn"}` | **optional** second `review-correctness` pass under a **different model family** (Gemini) + **union gate**: when `enabled`, the orchestrator re-runs the *same* review body (only the model + transport differ) and FAILs the stage if *either* pass finds a real defect — a guard against LLM-judge self-preference bias; off ⇒ the Claude pass alone gates. `on_api_error` = `warn` (proceed on Claude) \| `block` (flag). See *Cross-family correctness review* below |
| `review`, `review-correctness` | (a) no staged test path → (b) hermetic verify, *conditionally skipped* on a provably empty diff (see *Skip the redundant review re-verify*) | → the same review stage |
| `smoke_command` | `""` | the fast "does it build + boot" check every stage runs at **stage start** to prove a GREEN base before nominal work (the boot ritual) — cheaper than `verify_command`; empty ⇒ a logged no-op (backwards-compatible). See *Boot smoke test* below |
| `stability` | `{green_reruns: 3, randomized_order: true, shuffle_flag: ""}` | accept GREEN only after N reruns + a randomized-order run all pass (catches flaky / order-dependent suites); gate sub-check (b) re-runs `verify_command` on **every** one of `green_reruns` runs plus one randomized-order pass appending `shuffle_flag` (empty ⇒ the order pass degrades to a plain rerun + `log_warn`) |
| `stop_on_flag` | `true` | `true` (the safe default) halts the loop the moment any task is flagged for human intervention, so a human resolves it before new work runs on a possibly-poisoned base; `false` skips the flagged task and continues onto the next ready task. An explicit per-repo value (`true` **or** `false`) is always honored. |
| `submodule_autoupdate` | `true` | `git submodule update --remote` on startup (no pointer commit) — **submodule topology only**; cleanly no-ops for an external/shared install (the tool isn't under the repo, so there is nothing to pull) |
| `test_immutability` | `{flakiness_reruns: 5, readonly_enforcement: "chmod", test_globs: []}` | prove a stable RED across N reruns before freezing a test; `readonly_enforcement` (`chmod` default / harness `hook` / `none`) is a **local opt-out** early-warning read-only courtesy on `implement`'s test files — **not** the guarantee, which is the post-stage gate over `gate.protected_phases` (+ the trusted-config overlay); `test_globs` empty ⇒ inherit `test_paths` |
| `test_paths` | `["tests/**","features/**","e2e/**","acceptance/**"]` | globs the post-stage gate treats as test files (an implement commit must stage none; excluded from the gate's production-code scans) |
| `toolchain` | `{selected: false, selected_at: "", search_dated: "", layers: {…}}` | per-project test-toolchain **selection provenance**, written once by apply-docs: `selected:true` only after grill's Part B2 + a successful install; `layers` records each layer's `status` (`selected`\|`n/a`), `choice`, `version`, `install`, `rationale`. A real-backend loop warns when `selected:false` (hard-fails with `--require-toolchain`) and the gate's forcing rule rejects protected stages that left a required layer unconfigured. See *Per-project test toolchain* |
| `verify_command` | `npm run verify` | the canonical verification command stages run — MUST run every enabled `correctness_gate` layer and exit non-zero if any fails |
```
