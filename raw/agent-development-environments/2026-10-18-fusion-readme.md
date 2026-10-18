# Fusion — README 关键段落摘录

> Source: https://github.com/Runfusion/Fusion (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"Your Software Factory - build faster and better with multi node agents that work 24/7","pushed":"2026-10-18T03:24:23Z","stars":1279,"url":"https://github.com/Runfusion/Fusion"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

<a href="https://runfusion.ai">
  <img src="https://runfusion.ai/fusion-dashboard.png" alt="Fusion dashboard: Planning, Todo, In Progress, In Review, Done kanban columns with active task cards" width="900" />
</a>

Describe a task in plain language. A planning agent reads your project, understands context, and writes a full `PROMPT.md` plan — steps, file scope, acceptance criteria. Then Fusion plans, reviews, executes, and reviews again, in an isolated git worktree, with a human approval gate wherever you want one.

That launches the dashboard. Subcommands forward through: `npx runfusion.ai task create "fix X"`, `npx runfusion.ai --help`, etc. (Or verbosely: `npx @runfusion/fusion dashboard`.)

```bash
curl -fsSL https://runfusion.ai/install.sh | sh
fusion dashboard
```

```bash
brew install runfusion/fusion/fusion
fusion dashboard            # or: fn dashboard
```

```bash
npm install -g @runfusion/fusion
fn dashboard                # or: fusion dashboard
```

```bash
pnpm dev dashboard
```

Then click the `Open:` URL printed in the terminal. It embeds a bearer token
(`http://localhost:4040/?token=fn_...`) that the browser captures to
`localStorage` on first visit and reuses automatically thereafter. On the
server side, Fusion now persists the dashboard/daemon token in
`~/.fusion/settings.json` on first authenticated run and reuses it on later
starts unless you override it (`--token`, `FUSION_DASHBOARD_TOKEN`,
`FUSION_DAEMON_TOKEN`) or disable auth with `--no-auth`. See
[CLI reference → fn dashboard → Authentication](./docs/cli-reference.md#fn-dashboard)
for full precedence and reset/revocation options.

1. **AI Setup** — Use a simplified quick-start provider list (recommended providers plus any already-connected providers), then expand **Advanced provider settings** only if you need additional providers or setup details. You only need one provider to get started. Deprecated Google Gemini CLI / Antigravity provider entries are intentionally hidden; Google/Gemini API key, Google Generative AI, Vertex, and Cloud Code paths remain supported.
2. **GitHub (Optional)** — Connect GitHub for issue import and PR management
3. **First Task** — Create your first task or import from GitHub (if no project is active, onboarding first prompts you to register/select a project directory)

The wizard is **dismissible and non-blocking** — click **Skip for now** to use the dashboard immediately. Re-trigger it later from **Settings → Authentication → Reopen onboarding guide**.

|  |  |
|---|---|
| 🧠 **AI planning** | Describe a task in plain language. Planning agents turn it into a `PROMPT.md` plan with steps, file scope, and acceptance criteria. |
| 🔁 **Selectable workflows** | Built-ins cover coding, quick fixes, review-heavy work, stepwise execution, plugin-gated Compound Engineering, and PR lifecycle fragments. Pick a workflow per task or author custom ones in the [Workflow Editor](./docs/workflow-editor.md). |
| 🛡️ **Planner oversight** | Per-task or per-workflow oversight level (`off` / `observe` / `steer` / `autonomous`) governs how closely a planner overseer watches and intervenes — merge/PR and destructive actions always require explicit human confirmation. See [Settings Reference](./docs/settings-reference.md#workflow-settings) and [Dashboard Guide](./docs/dashboard-guide.md). |
| 🌳 **Worktree isolation** | Each task runs in its own branch and worktree (`fusion/{task-id}`). Parallel tasks. Zero conflicts. Optional [worktrunk](https://github.com/max-sixty/worktrunk) delegation via [`worktrunk.enabled`](./docs/settings-reference.md#worktree-backend-settings) (see [WorktreeBackend abstraction](./docs/architecture.md#worktreebackend-abstraction)). |
| 🗄️ **PostgreSQL by default** | Fusion uses zero-config embedded PostgreSQL for local runtime metadata. Legacy SQLite files are one-time migration inputs only; use a shared external database for [multi-project and multi-node](./docs/multi-project.md) setups. ([Storage](./docs/storage.md)) |
| ⚡ **Smart merge controls** | Passing every gate? Fusion squash-merges and moves on. Opt into manual approval anywhere, inherit the live global auto-merge default, or set explicit per-task auto/manual overrides. |
| 🛰️ **Multi-node mesh** | Laptop, Mac mini, Linux server, cloud VM, phone — all synced. Desktop, mobile, web. |
| 🧩 **Any model** | Anthropic, OpenAI, Ollama, Google Generative AI, Z.ai, Kimi K3, local runtimes, and user-defined [custom providers](./docs/dashboard-guide.md#custom-providers). Local and cloud coexist, with workflow model/fallback lanes configurable per project. |
| 🏢 **Agent companies** | Import pre-built teams — 440+ agents across 16 companies — and run them autonomously for weeks. |
| 📬 **Inter-agent messaging** | Built-in mailbox between agents. Delegate, clarify, coordinate; engineer-role agents can opt into backlog auto-claim when you want implementation help beyond executor-only pickup. |
| 🗨️ **Agent chat** | Direct chat, task chat that proactively narrates step progress, failures, and review outcomes, attachments, in-chat question cards, resumable streams, and experimental multi-agent Chat Rooms where mentioned members respond directly and ambient members can join up to a cap. ([Chat docs](./docs/dashboard-guide.md#chat-view)) |
| 🗺️ **Missions** | Hierarchical planning (Mission → Milestone → Slice → Feature → Task) with autopilot and validation contracts. |
| 🔬 **Research** | Bounded research runs with web search, GitHub, local docs, and LLM synthesis (plus runtime builtin WebSearch/WebFetch support in planning + synthesis flows when available). Turn findings into tasks. ([Docs](./docs/research.md)) |
| 🧪 **Self-improvement** | Agents reflect on their own output and update their prompts as they learn your codebase. |
| 🔓 **Open source. MIT.** | No vendor lock-in. Run it on your own hardware. Shipping weekly. |

<div align="center">
  <img src="./demo/assets/dashboard-tokyo.png" alt="Fusion board: Triage, Todo, In Progress, In Review, Done columns with live task cards across the Tokyo Night theme" width="900" />
</div>
