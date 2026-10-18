# OpenRig — README 关键段落摘录

> Source: https://github.com/mvschwarz/openrig (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"Build your own network of agents from Claude Code, Codex and Pi: persistent teams with roles, shared context and owned work.","pushed":"2026-10-18T13:46:21Z","stars":7772,"url":"https://github.com/mvschwarz/openrig"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

A harness wraps a model. A rig wraps your harnesses. Define your agent team in YAML, boot it with one command. Claude Code and Codex in the same rig, managed as one system.

OpenRig is open-source software for building and running your own network of agents. It turns AI coding agents from a pile of terminal sessions into a persistent, organized team. Talk to a lead agent about the outcome you want; it can coordinate specialists across teams and bring you results and decisions that need your attention. Start with a repository and one useful change, then keep the team's work and context at the same addresses.

![The OpenRig TUI: the build rig as a graph, then as a table of seats with runtime, model, context and state, then one seat in detail (real recording, 10 seconds)](assets/readme/openrig-agents-working.gif)

A team seat with no permission policy, per-seat choice or (for Codex) named profile launches with OpenRig's [team default](docs/reference/rig-spec.md#team-launch-defaults): Claude runs ordinary `rig` commands, project reads and common tests without prompting, while lifecycle commands such as `rig up` and `rig down` still ask; Codex also gets the OpenRig workspace and its pod's state directory as writable directories. Before launching, your agent recommends keeping that default, and offers to remember selected OpenRig commands in your native settings only if you want that, at personal project scope unless you explicitly choose user-wide sessions. It is not global YOLO or permission to invent work. On Yes, the agent [adds and verifies native rules](docs/reference/getting-started.md#have-your-agent-configure-permissions); No or no answer keeps the team default and leaves settings unchanged. An existing explicit choice is reused. Say “Undo the OpenRig command allowances added by this setup” to remove only its additions.

The desktop may need an Automation approval; SSH/headless sessions may have no
display. Herdr can show first-run panels, and an 80×24 window can cramp the view.
Follow [the OpenRig view checks and next steps](docs/reference/getting-started.md#what-can-interrupt-installation-and-the-openrig-view).
Herdr is visible only inside a terminal you can see. Changing the shared TUI to
`:terminals` does not open that terminal. The agent checks the visible window when
it has desktop access and says what it could not verify otherwise. Over headless
SSH, it asks you to open a new terminal window or tab and gives the exact connection
and attachment command for the current view. If you choose a manual attachment
after a failure,
ask the installing agent for the exact command using your current operator
session; run that in a new terminal window.

As shipped, `starter` uses both Claude Code and Codex. With only one of them, ask
the kernel operator to adapt it: it writes a copy of the team for your providers
under the same name. [The naming guide](docs/reference/topology-naming.md) explains
how their pods and roles grow and how to name your own team. `first-project` is
starter's old name and still starts it,
unless you already have a rig named `first-project` or `starter`: then it refuses
and names the `rig up <name> --existing` command that brings that rig back.
Show the selected runtime, configured model and command before launch; confirm the
account supports the model instead of silently falling back. The kernel starts
automatically and selects from available authenticated providers independently of
these teams. A missing unused provider is not a setup requirement.

Check project-seat readiness with `rig ps --nodes --rig starter` and resolve any authentication, trust or permission prompt before assigning work. If a seat stopped at such a prompt before its startup context arrived, `rig ps` shows the `rig seat continue <seat>` command that delivers it once the prompt is answered. Then give the builder one bounded outcome from your repository:

OpenRig writes instance state, provider integration and workspace files as part
of setup and operation. These include **trust settings and executable hooks**.
The summary below follows this source revision; check `rig --version` when
using a published package, since repository guidance can be ahead of npm.

| When | What changes and why |
| --- | --- |
| **npm installation** | Installs the CLI (`rig` and `openrig-tui`), bundled components and dependencies under your npm prefix (with Bun, under Bun's global directory). OpenRig's postinstall checks the Node.js version and that the SQLite module loads; Bun may block this script. It does not run daemon or provider setup. |
| **`rig setup`** | Attempts missing tools and writes an OpenRig block in `~/.tmux.conf` for mouse support and scrollback. Installs herdr by default on macOS and Linux unless declined with `--no-herdr`; an unavailable herdr install is a warning. On macOS the installing agent offers Ghostty, and `--ghostty` attempts it after acceptance. Existing cmux settings are left unchanged. `--full` adds workstation tools. `--dry-run` shows setup's plan without applying it. |
| **Daemon startup** | Creates/updates instance state under `OPENRIG_HOME` (normally `~/.openrig`), including its database and managed plugin resources. Seeds the `openrig-skills` discovery skill, the `refocusing` skill and the person-facing `rigs` skill in `~/.claude/skills` and `~/.agents/skills`, subject to existing version ownership. With `runtime.codex.hooks_enabled` enabled (the default), writes Codex hook configuration and trust records as described below—even before a rig launches. |
| **Rig/seat launch and attachment** | Creates tmux sessions, supplies seat identity and daemon connection environment, and projects selected guidance, skills, plugins and runtime resources into the workspace. Managed startup pre-trusts the workspace. Claude context collection can also be provisioned for attached sessions and refreshed during monitoring. In a Git repository, newly created files under `.codex/plugins/shared:openrig-core/` (or the unqualified `.codex/plugins/openrig-core/`) are added to the repository's Git `info/exclude` inside an `# BEGIN OpenRig generated files` block; new `AGENTS.md`, `CLAUDE.md` and `CLAUDE.local.md` files stay visible with a warning. |
| **Bundle install** (`rig bundle install`, or `rig up` with a `.rigbundle` or GitHub link) | Writes the bundle's files into the install target: `--target`, or the current directory for `rig up` and for a GitHub link. `rig bundle install` with a local archive needs `--target`. Routes its declared skills, plugins and context packs into your libraries. A GitHub link's archive is kept under `OPENRIG_HOME/bundle-imports/`, and installs are recorded in `OPENRIG_HOME/bundle-audit.jsonl`. A bundle that carries a project creates it under `workspace.projects_root` and records it, with the rig's association, in the workspace catalog. |
| **Explicit permission configuration** | The built-in bootstrap does **not** add `rig` command allow rules to your settings files; a team seat with no permission policy, per-seat choice or (for Codex) named profile gets the per-launch [team default](docs/reference/rig-spec.md#team-launch-defaults) instead. Agent-guided setup recommends keeping it and requires your actual answer before the agent [adds remembered rules at your chosen scope](docs/reference/getting-started.md#have-your-agent-configure-permissions). No/no answer keeps the team default and preserves settings; existing choices and stricter rules remain relevant. Broader access is separate. |
