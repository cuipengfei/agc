# OMP CLI 全量命令参考（v18.10.1 help + omp.sh/docs/cli）

> Source: 本机 `omp --help`（v18.10.1）输出直采；omp.sh/docs/cli 页面 Tavily advanced extract
> Collected: 2026-10-12
> Published: 2026-10-12

## omp --help 完整输出（本机 v18.10.1）

```
omp v18.10.1

USAGE
  $ omp [COMMAND]

ARGUMENTS
  MESSAGES   Messages to send (prefix files with @)

FLAGS
      --model=<value>                   Model to use (fuzzy match: "opus", "gpt-5.2", or "openai/gpt-5.2")
      --smol=<value>                    Smol/fast model for lightweight tasks (or PI_SMOL_MODEL env)
      --slow=<value>                    Slow/reasoning model for thorough analysis (or PI_SLOW_MODEL env)
      --plan=<value>                    Plan model for architectural planning (or PI_PLAN_MODEL env)
      --goal=<value>                    Start fresh in goal mode (interactive only; bypasses autoResume; no positional prompt, startup plan mode, or explicit resume)
      --prewalk                         Switch from the active model to a fast/cheap model at the first edit/write after the plan's todo list exists (default off; see prewalk.enabled)
      --no-prewalk                      Disable prewalk even if prewalk.enabled is set
      --prewalk-into=<value>            Target model for prewalk (default the "smol" role)
      --plan-yolo                       Force read-only plan mode at start, auto-approve the plan on the model's first resolve call, then switch to --plan-yolo-into to implement it
      --plan-yolo-into=<value>          Target model for plan-yolo execution (default the "smol" role)
      --provider=<value>                Provider to use (legacy; prefer --model)
      --api-key=<value>                 API key (defaults to env vars)
      --system-prompt=<value>           System prompt (default: coding assistant prompt)
      --system-prompt-template=<value>  Handlebars system prompt template (mutually exclusive with --system-prompt)
      --append-system-prompt=<value>    Append text or file contents to the system prompt
      --allow-home                      Allow starting in ~ without auto-switching to a temp dir
      --profile=<value>                 Use an isolated profile for auth, sessions, settings, and caches
      --alias=<value>                   Create a shell shortcut for the selected profile and exit
      --cwd=<value>                     Directory to start in (overrides the launch cwd)
      --mode=<value>                    Output mode: text (default), json, rpc, or rpc-ui
      --config=<value>                  Load an extra config.yml-style overlay for this run (repeatable)
      --add-dir=<value>                 Add a workspace directory beyond the working directory (repeatable)
  -p, --print                           Non-interactive mode: process prompt and exit
  -c, --continue                        Continue previous session
  -r, --resume=<value>                  Resume a session (by ID prefix, path, or picker if omitted)
      --from-claude                     Import a Claude Code session into OMP
      --from-codex                      Import a Codex session into OMP
      --session-dir=<value>             Directory for session storage and lookup
      --no-session                      Don't save session (ephemeral)
      --models=<value>                  Comma-separated model patterns for Ctrl+P cycling
      --no-tools                        Disable all built-in tools
      --no-lsp                           Disable LSP tools, formatting, and diagnostics
      --no-pty                           Disable PTY-based interactive bash execution
      --tools=<value>                   Comma-separated list of tools to enable (default: all)
      --thinking=<value>                Set thinking level: off, minimal, low, medium, high, xhigh, max, auto
      --service-tier=<value>            OpenAI service tier for this session (none omits service_tier)
      --hide-thinking                   Hide thinking blocks in TUI output (display only, does not disable model thinking)
      --advisor                         Enable the advisor runtime (passively reviews each turn and injects notes)
      --external-thinking               Use a private scratchpad while disabling supported GPT, Claude, and Gemini reasoning (at your own risk: providers have flagged this request shape as abuse)
      --hook=<value>                    Load a hook/extension file (can be used multiple times)
  -e, --extension=<value>               Load an extension file (can be used multiple times)
      --no-extensions                   Disable extension discovery (explicit -e paths still work)
      --no-skills                       Disable skills discovery and loading
      --skills=<value>                  Comma-separated glob patterns to filter skills (e.g., git-*,docker)
      --no-rules                        Disable rules discovery and loading
      --export=<value>                  Export session file to HTML and exit
      --no-title                        Disable title auto-generation
      --no-ui                           With --mode rpc or rpc-ui: run extensions headless (rpc-ui tool UI remains enabled)
      --print-thoughts                  Include thinking blocks in print mode text output
      --max-time=<value>                Stop the session after this duration (e.g., 600, 10m, 1h)
      --auto-approve                    Auto-approve all tool calls (skip approval prompts)
      --approval-mode=<value>           Override tools.approvalMode for this session (always-ask|write|yolo)

EXAMPLES
  # Interactive mode
    omp
  # Interactive mode with initial prompt
    omp "List all .ts files in src/"
  # Start working on a goal immediately
    omp --goal "Investigate the importer"
  # Include files in initial message
    omp @prompt.md @image.png "What color is the sky?"
  # Non-interactive mode (process and exit)
    omp -p "List all .ts files in src/"
  # Continue previous session
    omp --continue "What did we discuss?"
  # Create a shell shortcut for a work profile
    omp --profile work --alias omp-work
  # Use different model (fuzzy matching)
    omp --model opus "Help me refactor this code"
  # Limit model cycling to specific models
    omp --models claude-sonnet,claude-haiku,gpt-4o
  # Export a session file to HTML
    omp --export ~/.omp/agent/sessions/--path--/session.jsonl

COMMANDS
  acp            Run omp as an ACP (Agent Client Protocol) server over stdio
  agents         Manage bundled task agents
  anonymize      Write a shareable copy of a session and its subagents: turn contents redacted, metadata kept, paths and literals replaced by consistent mock tokens
  auth           Export or import stored provider credentials (API keys and OAuth logins) as JSON
  auth-broker    Manage the omp auth-broker (credential vault)
  auth-gateway   Run an auth-gateway: an HTTP forward proxy backed by the configured broker, or JSON lines on stdio with your own credentials
  bench          Benchmark models: TTFT/prefill vs decode throughput with p50/p95, across chat, prefill, generation, and prompt-cache workloads, or single-user vs parallel load (--detailed)
  browser-relay  Run the local CDP relay that lets the browser prelude drive your own Chrome tabs
  cleanse        Detect and fix project diagnostics with weighted parallel subagents
  clip           Upload a /record recording to live.omp.sh as a public clip and print its URL
  collab         List active local Collab host metadata without URLs; use collab link <instanceId|pid> to retrieve a control link (--view for view-only)
  commit         Generate a commit message and update changelogs
  completions    Print a shell completion script (bash, zsh, or fish)
  compress       Rewrite a text file into the dense prompt register, reporting what it drops
  config         Manage configuration settings
  dry-balance    Dry-run OAuth account balancing across random session ids
  find           Semantic search: describe a behavior, get the files and line ranges that implement it
  gallery        Preview tool, composer, and status-line renderers in a deterministic visual gallery
  gc             Run storage garbage collection
  git            Interactive fullscreen git UI: split diff viewer, staging sidebar, and commit composer
  grep           Test grep tool
  grievances     View, clean, or push reported tool issues (auto-QA grievances)
  if-bench       Benchmark instruction following and working memory: one cached thread of glyph array actions with a moving cat-sound directive
  images         Inspect, diagnose, probe, and purge image publication backends
  install        Install or link an extension package (alias of `plugin install`/`plugin link`)
  join           Join a shared collab session (same as /join)
  login          Log in to a model provider (terminal counterpart of /login)
  models         List, search, and refresh available models
  play           Replay a /record session recording in the terminal (space pauses, q quits)
  plugin         Manage plugins (install, uninstall, list, etc.)
  predict        Type a prompt and compare every word-completion engine's ghost text live
  ps             List and control daemon-supervised background processes (logs, stop, kill, restart)
  read           Show what the read tool will return for a path, URL, or internal URI
  render         Draw a session's entire thread through the production transcript pipeline (with repaint timing)
  say            Synthesize text with the local TTS engine and play it through the speakers
  search         Test web search providers
  session        Hand a session to another machine: pack it, unpack it, or mark the local copy moved
  setup          Run onboarding setup or install dependencies for optional features
  share          Share a saved session via an encrypted link (same as /share)
  shell          Interactive shell console
  skill          Install, search, publish, and manage skills on the Skillshare registry (skills.omp.sh)
  ssh             Manage SSH host configurations
  stats          View usage statistics
  stream         Broadcast local omp session screens and chat to your public live channel
  tiny-models    Download tiny local models (session titles, memory, word completion)
  token          Get the API key or OAuth token for a provider
  toks           Count a file or text with every embedded offline tokenizer (OpenAI, Claude, Qwen, …)
  ttsr           Inspect and test Time-Traveling Stream Rules (TTSR)
  update         Check for and install updates
  usage          Show provider usage limits for every authenticated account
  worktree       Add, list, or clear git worktrees (clone-first when enabled)
```

## omp.sh/docs/cli 页面正文（2026-10-12 Tavily advanced extract）

### Command-line shape

```
omp [launch flags] [@files...] [messages...]
omp launch [launch flags] [@files...] [messages...]
omp <command> [arguments] [command flags]
```

`launch` is the default command. If the first non-flag word is not a registered command, omp treats the remaining words as the initial request. For example, `omp "fix the build"` launches a session, while `omp models` lists models. Use an explicit `omp launch …` when a request begins with a command name.

All long options that take a value accept either `--flag value` or `--flag=value`. Use `--` to stop parsing flags:

```
omp -- "Explain why --force is dangerous here"
```

A loaded extension can add launch flags. `omp --help` shows those in addition to the built-in surface below.

### Launch input and entry modes

Plain positional arguments are joined into the initial request. Prefix a path with `@` to attach it. Text is included as context; supported images are sent as image input. When stdin is not a TTY, omp reads it automatically. No `-` marker is required. A missing or unreadable `@file` makes the command fail instead of silently omitting it. `@file` arguments are not expanded in rpc or rpc-ui mode.

### Output and protocol modes

| Entry | What happens |
|---|---|
| `omp` | Interactive text mode: opens the TUI and keeps the session running. |
| `omp -p`, `omp --print` | Headless text mode: processes the request, writes the answer, and exits. |
| `omp -p --mode json` | Writes a newline-delimited structured event stream for automation. |
| `omp --mode rpc` | Runs the JSON-RPC server over stdio. |
| `omp --mode rpc-ui` | Runs RPC with UI extension events enabled. |
| `omp --mode acp`, `omp acp` | Runs an Agent Client Protocol server over stdio. |

`--mode text` is the default. `--print` controls whether text/JSON runs exit after the request; protocol modes remain servers.

### Launch flags — Workspace and configuration

| Flag | Effect |
|---|---|
| `--cwd` | Start in this directory instead of the shell's current directory. |
| `--add-dir` | Add another workspace directory. Repeat to add more than one. |
| `--allow-home` | Allow a session to start in `~`. |
| `--profile` | Use isolated auth, sessions, settings, and caches for a named profile. |
| `--alias` | Create a shell shortcut for the selected `--profile`, then exit. |
| `--config` | Add a YAML settings overlay for this process. Repeatable; later files win. |

Configuration merges in this order: built-in defaults, global configuration, project configuration, files from `PI_CONFIG_FILES`, repeated `--config` files, then runtime overrides such as launch flags.

### Launch flags — Saved sessions

| Flag | Effect |
|---|---|
| `-c`, `--continue` | Continue the latest session associated with the current project. |
| `-r [id|path]`, `--resume [id|path]`, `--session [id|path]` | Resume by ID prefix or JSONL path. With no value, open the session picker. |
| `--fork` | Fork a saved session into a new session. |
| `--from-claude` | Import a Claude Code session. |
| `--from-codex` | Import a Codex session. |
| `--session-dir` | Override the directory used for session storage and lookup. |
| `--no-session` | Keep this run ephemeral instead of saving it. |
| `--provider-session-id` | Reuse an externally issued provider session ID for continuity and cache scoping. |
| `--no-title` | Skip automatic session-title generation. |
| `--export [output.html]` | Render a saved JSONL session as HTML and exit. |

### Launch flags — Models and reasoning

| Flag | Effect |
|---|---|
| `--model` | Select a model by fuzzy ID, provider/model, or configured role. |
| `--provider` | Legacy provider hint. Prefer `--model`. |
| `--api-key` | Supply the selected provider's credential for this run. |
| `--smol` | Override the fast/lightweight model role. |
| `--slow` | Override the thorough reasoning model role. |
| `--plan` | Override the planning model role. |
| `--models` | Restrict the models available to Ctrl+P cycling. Patterns may include effort. |
| `--thinking` | Set off, minimal, low, medium, high, xhigh, max, or auto. |
| `--service-tier` | Override the OpenAI-family tier: none, auto, default, flex, scale, or priority. |
| `--provider-session-id` | Reuse a provider-side session ID. |
| `--prompt-cache-key` | Override the provider prompt-cache key for this session. |
| `--hide-thinking` | Hide thinking blocks in the TUI without changing model reasoning. |
| `--print-thoughts` | Include thinking blocks in print-mode text output. |
| `--external-thinking` | Use a private scratchpad while disabling supported provider reasoning. |

### Launch flags — Prewalk and plan execution

| Flag | Effect |
|---|---|
| `--prewalk` | After a plan todo list exists, switch to a fast model at the first edit or write. Off by default. |
| `--no-prewalk` | Disable prewalk even when configuration enables it. |
| `--prewalk-into` | Choose the prewalk target; the default is the smol role. |
| `--plan-yolo` | Start in read-only plan mode, auto-approve the first resolved plan, then execute it. |
| `--plan-yolo-into` | Choose the model that executes a plan-yolo plan; the default is smol. |

### Launch flags — Capabilities, approvals, and runtime

| Flag | Effect |
|---|---|
| `--tools` | Make only the named built-in capabilities available for this run. |
| `--no-tools` | Disable all built-in capabilities. |
| `--no-lsp` | Disable language-server features. |
| `--no-pty` | Disable PTY-backed interactive shell execution. |
| `--approval-mode` | Use always-ask, write, or yolo for this session. |
| `--auto-approve`, `--yolo` | Skip approval prompts for all operations. |
| `--advisor` | Enable passive per-turn review and injected advice. |
| `--max-time` | Stop after positive seconds or a duration such as 5s, 10m, or 1h. |

### Launch flags — Extensions, hooks, skills, and rules

| Flag | Effect |
|---|---|
| `-e, --extension` | Load an extension file. Repeatable. |
| `--hook` | Load a hook/extension file through the same loader. Repeatable. |
| `--trusted-extension` | Load a trusted extension from an absolute path. Repeatable; cannot be combined with -e, --extension, or --hook. |
| `--plugin-dir` | Add a local plugin directory to discovery. Repeatable. |
| `--no-extensions` | Disable extension discovery. Explicit -e and --hook paths still load. |
| `--skills` | Keep only skills matching the comma-separated glob patterns. |
| `--no-skills` | Disable skill discovery and loading. |
| `--no-rules` | Disable rules discovery and loading. |

### Launch flags — Prompt and output

| Flag | Effect |
|---|---|
| `--system-prompt` | Replace the default system prompt. |
| `--append-system-prompt` | Append readable file contents or literal text to the default prompt. |
| `-p, --print` | Process the request without the TUI, then exit. |
| `--mode` | Select text, json, rpc, rpc-ui, or acp. |
| `--print-thoughts` | Include reasoning blocks in print-mode text output. |
| `--no-title` | Skip the background title-generation request. |
| `-h, --help` | Print help and exit. |
| `-v, --version` | Print the installed version and exit. |

### Subcommand index（文档页列出的命令）

文档页 subcommand index 列出以下命令：launch, acp, agents, auth-broker, auth-gateway, bench, browser-relay, cleanse, commit, completions, compress, config, dry-balance, gallery, gc, grep, grievances, images/img, install, join, models, plugin, ps, read, render, say, search/q, setup, share, shell, ssh, stats, tiny-models, token, ttsr, update, usage, worktree/wt。

### 文档页 gc flag 表

文档页 gc flag 表只列出：`--apply`, `--json`, `--agent-dir`, `--blobs`, `--archive`, `--wal`, `--cold-archive-after-days`, `--retain-newest-global`, `--retain-newest-per-cwd`。未列出 `--stale`, `--stale-retain-newest`, `--stale-retain-days`。文档页另一处把参数写作 `--retain-newest-per-project`，本机实际 flag 名是 `--retain-newest-per-cwd`。

## 本机 help 与文档页的差异

### 本机 help 有、文档页 subcommand index 未列出的 14 个命令

`anonymize`, `auth`, `clip`, `collab`, `find`, `git`, `if-bench`, `login`, `play`, `predict`, `session`, `skill`, `stream`, `toks`

### 文档页有、本机 help FLAGS 段未列出的 flag

`--fork`, `--provider-session-id`, `--prompt-cache-key`, `--trusted-extension`, `--yolo`, `--session`（作为 `--resume` 的别名出现）
