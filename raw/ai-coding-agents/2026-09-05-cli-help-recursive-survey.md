# 四 Agent CLI 递归 --help 调查（codex / opencode / omo / omp）

- Source: 本 repo 研究会话，对本机安装四款 CLI 的递归 `--help` 输出捕获
- Collected: 2026-09-05
- Published: Unknown
- 方法：顶层 `--help` → 按各页 `Commands:` 段递归子命令 → 对声明 action 的命令逐个探 `<cmd> <action> --help`。全部输出保存在会话当时的 `/tmp/help/{codex,opencode,omo,omp}/`；本文件按 AGENTS.md「只放必要摘录」收录顶层 help 全文与关键子命令页。
- 版本：codex 0.153.4（bun 全局安装，`@openai/codex`）；opencode 1.2.19；omo（oh-my-opencode，OpenCode 插件管理层）；omp（oh-my-pi）。

## 覆盖计数（脚本输出）

- omo：16 个独立页（11 顶层 + config migrate + mcp oauth + oauth login/logout/status）。陷阱记录：最初按 `omo config --help` 输出里出现的词猜了 `config show/validate/reset/init/agents/...` 与 `mcp add/list/status/remove` 共 16 条路径，逐一执行后发现全部返回父级 help——那些词只是父页正文里的描述文字，不是子命令。最终按 `Commands:` 段真实列出的项递归。
- opencode：59 个独立页（debug 子树最深：13 个子命令，其中 lsp/rg/file/snapshot 再下钻一层共 11 叶）。
- codex：65 个独立页（最深三层：`plugin marketplace add/list/remove/upgrade`、`app-server daemon bootstrap/...`、`debug app-server send-message-v2`）。
- omp：39 个独立页。omp 是单层文档结构：对 62 个声明 action（`config list/get/set/reset/path/init-xdg`、`plugin install/...`、`auth-broker serve/token/login/...`、`ps list/info/logs/stop/kill/restart`、`worktree list/clear/add` 等）逐个执行 `<cmd> <action> --help`，**62 个全部回落到父级 help 页，0 个返回独立 action help 页**——action 及其 flag 的文档全部平铺在父命令一页内。
- 合计：179 个独立 help 页。

## 顶层 help 全文

### `codex --help`

```
$ codex --help

Codex CLI

If no subcommand is specified, options will be forwarded to the interactive CLI.

Usage: codex [OPTIONS] [PROMPT]
       codex [OPTIONS] <COMMAND> [ARGS]

Commands:
  agents            Browse all agent sessions on the shared local app-server daemon
  exec              Run Codex non-interactively [aliases: e]
  review            Run a code review non-interactively
  login             Manage login
  logout            Remove stored authentication credentials
  mcp               Manage external MCP servers for Codex
  plugin            Manage Codex plugins
  mcp-server        Start Codex as an MCP server (stdio)
  app-server        [experimental] Run the app server or related tooling
  remote-control    [experimental] Manage the app-server daemon with remote control enabled
  completion        Generate shell completion scripts
  update            Update Codex to the latest version
  doctor            Diagnose local Codex installation, config, auth, and runtime health
  sandbox           Run commands within a Codex-provided sandbox
  debug             Debugging tools
  apply             Apply the latest diff produced by Codex agent as a `git apply` to your local
                    working tree [aliases: a]
  resume            Resume a previous interactive session (picker by default; use --last to continue
                    the most recent)
  queue             Queue a message for an existing session
  archive           Archive a saved session by id or session name
  delete            Permanently delete a saved session by id or session name
  migrate-rollouts  Inspect or migrate legacy local sessions to paginated thread history
  unarchive         Unarchive a saved session by id or session name
  fork              Fork a previous interactive session (picker by default; use --last to fork the
                    most recent)
  cloud             [EXPERIMENTAL] Browse tasks from Codex Cloud and apply changes locally
  exec-server       [EXPERIMENTAL] Run the standalone exec-server service
  features          Inspect feature flags
  help              Print this message or the help of the given subcommand(s)

Arguments:
  [PROMPT]
          Optional user prompt to start the session

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

      --remote <ADDR>
          Connect the TUI to a remote app server endpoint.
          
          Accepted forms: `ws://host:port`, `wss://host:port`, `unix://`, or `unix://PATH`.

      --remote-auth-token-env <ENV_VAR>
          Name of the environment variable containing the bearer token to send to a remote app
          server websocket

      --strict-config
          Error out when config.toml contains fields that are not recognized by this version of
          Codex

  -i, --image <FILE>...
          Optional image(s) to attach to the initial prompt

  -m, --model <MODEL>
          Model the agent should use

      --oss
          Use open-source provider

      --local-provider <OSS_PROVIDER>
          Specify which local provider to use (lmstudio or ollama). If not specified with --oss,
          will use config default or show selection

  -p, --profile <CONFIG_PROFILE_V2>
          Layer $CODEX_HOME/<name>.config.toml on top of the base user config

  -s, --sandbox <SANDBOX_MODE>
          Select the sandbox policy to use when executing model-generated shell commands
          
          [possible values: read-only, workspace-write, danger-full-access]

      --approve-for-me
          Route approval requests through automatic review using the workspace-write sandbox

      --dangerously-bypass-approvals-and-sandbox
          Skip all confirmation prompts and execute commands without sandboxing. EXTREMELY
          DANGEROUS. Intended solely for running in environments that are externally sandboxed

      --dangerously-bypass-hook-trust
          Run enabled hooks without requiring persisted hook trust for this invocation. DANGEROUS.
          Intended only for automation that already vets hook sources

  -C, --cd <DIR>
          Tell the agent to use the specified directory as its working root

      --add-dir <DIR>
          Additional directories that should be writable alongside the primary workspace

  -a, --ask-for-approval <APPROVAL_POLICY>
          Configure when the model requires human approval before executing a command

          Possible values:
          - on-request: The model decides when to ask the user for approval
          - never:      Never ask for user approval Execution failures are immediately returned to
            the model

      --search
          Enable live web search. When enabled, the native Responses `web_search` tool is available
          to the model (no per‑call approval)

      --no-alt-screen
          Disable alternate screen mode
          
          Runs the TUI in inline mode, preserving terminal scrollback history.

  -h, --help
          Print help (see a summary with '-h')

  -V, --version
          Print version
```

### `opencode --help`

```
$ opencode --help

⠀                                ▄     
█▀▀█ █▀▀█ █▀▀█ █▀▀▄ █▀▀▀ █▀▀█ █▀▀█ █▀▀█
█  █ █  █ █▀▀▀ █  █ █    █  █ █  █ █▀▀▀
▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀  ▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀

Commands:
  opencode completion          generate shell completion script
  opencode acp                 start ACP (Agent Client Protocol) server
  opencode mcp                 manage MCP (Model Context Protocol) servers
  opencode [project]           start opencode tui                                          [default]
  opencode attach <url>        attach to a running opencode server
  opencode run [message..]     run opencode with a message
  opencode debug               debugging and troubleshooting tools
  opencode providers           manage AI providers and credentials                   [aliases: auth]
  opencode agent               manage agents
  opencode upgrade [target]    upgrade opencode to the latest or a specific version
  opencode uninstall           uninstall opencode and remove all related files
  opencode serve               starts a headless opencode server
  opencode web                 start opencode server and open web interface
  opencode models [provider]   list all available models
  opencode stats               show token usage and cost statistics
  opencode export [sessionID]  export session data as JSON
  opencode import <file>       import session data from JSON file or URL
  opencode github              manage GitHub agent
  opencode pr <number>         fetch and checkout a GitHub PR branch, then run opencode
  opencode session             manage sessions
  opencode plugin <module>     install plugin and update config                      [aliases: plug]
  opencode db                  database tools

Positionals:
  project  path to start opencode in                                                        [string]

Options:
  -h, --help          show help                                                            [boolean]
  -v, --version       show version number                                                  [boolean]
      --print-logs    print logs to stderr                                                 [boolean]
      --log-level     log level                 [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure          run without external plugins                                         [boolean]
      --port          port to listen on                                        [number] [default: 0]
      --hostname      hostname to listen on                          [string] [default: "127.0.0.1"]
      --mdns          enable mDNS service discovery (defaults hostname to 0.0.0.0)
                                                                          [boolean] [default: false]
      --mdns-domain   custom domain name for mDNS service (default: opencode.local)
                                                                [string] [default: "opencode.local"]
      --cors          additional domains to allow for CORS                     [array] [default: []]
  -m, --model         model to use in the format of provider/model                          [string]
  -c, --continue      continue the last session                                            [boolean]
  -s, --session       session id to continue                                                [string]
      --fork          fork the session when continuing (use with --continue or --session)  [boolean]
      --prompt        prompt to use                                                         [string]
      --agent         agent to use                                                          [string]
      --auto          auto-approve permissions that are not explicitly denied (dangerous!)
                                                                          [boolean] [default: false]
      --mini          start the minimal interactive interface             [boolean] [default: false]
      --no-replay     disable mini session history replay on resume and after resize       [boolean]
      --replay-limit  cap visible mini replay to the newest N messages                      [number]
```

### `omo --help`

```
$ omo --help

Usage: oh-my-opencode [options] [command]

The ultimate OpenCode plugin - multi-model orchestration, LSP tools, and more

Options:
  -v, --version                         Show version number
  -h, --help                            Display help for command

Commands:
  install|setup [options]               Install and configure oh-my-opencode
                                        with interactive setup
  cleanup|uninstall [options]           Clean managed Codex Light state and
                                        repair project-local legacy Codex
                                        artifacts
  run [options] <message>               Run opencode with todo/background task
                                        completion enforcement
  get-local-version [options]           Show current installed version and check
                                        for updates
  doctor [options]                      Check oh-my-opencode installation health
                                        and diagnose issues
  config                                Manage unified OMO configuration
  refresh-model-capabilities [options]  Refresh the cached models.dev-based
                                        model capabilities snapshot
  version                               Show version information
  boulder [options]                     Show boulder progress, elapsed time, and
                                        per-task statistics
  ulw-loop [args...]                    Run the Codex LazyCodex ulw-loop CLI
  mcp                                   MCP server management
  help [command]                        display help for command
```

### `omp --help`

```
$ omp --help

omp v18.1.10

USAGE
  $ omp [COMMAND]

ARGUMENTS
  MESSAGES   Messages to send (prefix files with @)

FLAGS
      --model=<value>                 Model to use (fuzzy match: "opus", "gpt-5.2", or "openai/gpt-5.2")
      --smol=<value>                  Smol/fast model for lightweight tasks (or PI_SMOL_MODEL env)
      --slow=<value>                  Slow/reasoning model for thorough analysis (or PI_SLOW_MODEL env)
      --plan=<value>                  Plan model for architectural planning (or PI_PLAN_MODEL env)
      --prewalk                       Switch from the active model to a fast/cheap model at the first edit/write after the plan's todo list exists (default off; see prewalk.enabled)
      --no-prewalk                    Disable prewalk even if prewalk.enabled is set
      --prewalk-into=<value>          Target model for prewalk (default the "smol" role)
      --plan-yolo                     Force read-only plan mode at start, auto-approve the plan on the model's first resolve call, then switch to --plan-yolo-into to implement it
      --plan-yolo-into=<value>        Target model for plan-yolo execution (default the "smol" role)
      --provider=<value>              Provider to use (legacy; prefer --model)
      --api-key=<value>               API key (defaults to env vars)
      --system-prompt=<value>         System prompt (default: coding assistant prompt)
      --append-system-prompt=<value>  Append text or file contents to the system prompt
      --allow-home                    Allow starting in ~ without auto-switching to a temp dir
      --profile=<value>               Use an isolated profile for auth, sessions, settings, and caches
      --alias=<value>                 Create a shell shortcut for the selected profile and exit
      --cwd=<value>                   Directory to start in (overrides the launch cwd)
      --mode=<value>                  Output mode: text (default), json, rpc, or rpc-ui
      --config=<value>                Load an extra config.yml-style overlay for this run (repeatable)
      --add-dir=<value>               Add a workspace directory beyond the working directory (repeatable)
  -p, --print                         Non-interactive mode: process prompt and exit
  -c, --continue                      Continue previous session
  -r, --resume=<value>                Resume a session (by ID prefix, path, or picker if omitted)
      --from-claude                   Import a Claude Code session into OMP
      --from-codex                    Import a Codex session into OMP
      --session-dir=<value>           Directory for session storage and lookup
      --no-session                    Don't save session (ephemeral)
      --models=<value>                Comma-separated model patterns for Ctrl+P cycling
      --no-tools                      Disable all built-in tools
      --no-lsp                        Disable LSP tools, formatting, and diagnostics
      --no-pty                        Disable PTY-based interactive bash execution
      --tools=<value>                 Comma-separated list of tools to enable (default: all)
      --thinking=<value>              Set thinking level: off, minimal, low, medium, high, xhigh, max, auto
      --service-tier=<value>          OpenAI service tier for this session (none omits service_tier)
      --hide-thinking                 Hide thinking blocks in TUI output (display only, does not disable model thinking)
      --advisor                       Enable the advisor runtime (passively reviews each turn and injects notes)
      --external-thinking             Use a private scratchpad while disabling supported GPT, Claude, and Gemini reasoning (at your own risk: providers have flagged this request shape as abuse)
      --hook=<value>                  Load a hook/extension file (can be used multiple times)
  -e, --extension=<value>             Load an extension file (can be used multiple times)
      --no-extensions                 Disable extension discovery (explicit -e paths still work)
      --no-skills                     Disable skills discovery and loading
      --skills=<value>                Comma-separated glob patterns to filter skills (e.g., git-*,docker)
      --no-rules                      Disable rules discovery and loading
      --export=<value>                Export session file to HTML and exit
      --no-title                      Disable title auto-generation
      --print-thoughts                Include thinking blocks in print mode text output
      --max-time=<value>              Stop the session after this duration (e.g., 600, 10m, 1h)
      --auto-approve                  Auto-approve all tool calls (skip approval prompts)
      --approval-mode=<value>         Override tools.approvalMode for this session (always-ask|write|yolo)

EXAMPLES
  # Interactive mode
    omp
  # Interactive mode with initial prompt
    omp "List all .ts files in src/"
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
  acp            Run Oh My Pi as an ACP (Agent Client Protocol) server over stdio
  agents         Manage bundled task agents
  auth-broker    Manage the omp auth-broker (credential vault)
  auth-gateway   Run an auth-gateway forward proxy backed by the configured broker
  bench          Benchmark models: TTFT/prefill vs decode throughput with p50/p95, across chat, prefill, generation, and prompt-cache workloads
  browser-relay  Run the local CDP relay that lets the browser prelude drive your own Chrome tabs
  cleanse        Detect and fix project diagnostics with weighted parallel subagents
  commit         Generate a commit message and update changelogs
  completions    Print a shell completion script (bash, zsh, or fish)
  compress       Rewrite a text file into the dense prompt register, reporting what it drops
  config         Manage configuration settings
  dry-balance    Dry-run OAuth account balancing across random session ids
  gallery        Preview tool, composer, and status-line renderers in a deterministic visual gallery
  gc             Run storage garbage collection
  git            Interactive fullscreen git UI: split diff viewer, staging sidebar, and commit composer
  grep           Test grep tool
  grievances     View, clean, or push reported tool issues (auto-QA grievances)
  if-bench       Benchmark instruction following and working memory: one cached thread of glyph array actions with a moving cat-sound directive
  images         Inspect, diagnose, probe, and purge image publication backends
  install        Install or link an extension package (alias of `plugin install`/`plugin link`)
  join           Join a shared collab session (same as /join)
  models         List, search, and refresh available models
  plugin         Manage plugins (install, uninstall, list, etc.)
  ps             List and control daemon-supervised background processes (logs, stop, kill, restart)
  read           Show what the read tool will return for a path, URL, or internal URI
  render         Draw a session's entire thread through the production transcript pipeline (with repaint timing)
  say            Synthesize text with the local TTS engine and play it through the speakers
  search         Test web search providers
  setup          Run onboarding setup or install dependencies for optional features
  share          Share a saved session via an encrypted link (same as /share)
  shell          Interactive shell console
  ssh            Manage SSH host configurations
  stats          View usage statistics
  tiny-models    Download tiny local models (session titles + memory)
  token          Get the API key or OAuth token for a provider
  ttsr           Inspect and test Time-Traveling Stream Rules (TTSR)
  update         Check for and install updates
  usage          Show provider usage limits for every authenticated account
  worktree       Add, list, or clear git worktrees (clone-first when enabled)

Environment Variables:
  # Core Providers
  ANTHROPIC_API_KEY          - Anthropic Claude models
  ANTHROPIC_OAUTH_TOKEN      - Anthropic OAuth (takes precedence over API key)
  CLAUDE_CODE_USE_FOUNDRY    - Enable Anthropic Foundry mode (uses Foundry endpoint + mTLS)
  FOUNDRY_BASE_URL           - Anthropic Foundry base URL (e.g., https://<foundry-host>)
  ANTHROPIC_FOUNDRY_API_KEY  - Anthropic token used as Authorization: Bearer <token> in Foundry mode
  ANTHROPIC_CUSTOM_HEADERS   - Extra headers for Foundry or any custom ANTHROPIC_BASE_URL gateway (e.g., "user-id: USERNAME")
  CLAUDE_CODE_CLIENT_CERT    - Client certificate (PEM path or inline PEM) for mTLS
  CLAUDE_CODE_CLIENT_KEY     - Client private key (PEM path or inline PEM) for mTLS
  NODE_EXTRA_CA_CERTS        - CA bundle path (or inline PEM) for server certificate validation
  OPENAI_API_KEY             - OpenAI GPT models
  GEMINI_API_KEY             - Google Gemini models
  COPILOT_GITHUB_TOKEN      - GitHub Copilot

  # Additional LLM Providers
  AZURE_OPENAI_API_KEY       - Azure OpenAI models
  GROQ_API_KEY               - Groq models
  CEREBRAS_API_KEY           - Cerebras models
  XAI_API_KEY                - xAI Grok models
  OPENROUTER_API_KEY         - OpenRouter aggregated models
  KILO_API_KEY               - Kilo Gateway models
  MISTRAL_API_KEY            - Mistral models
  ZAI_API_KEY                - z.ai models (ZhipuAI/GLM)
  UMANS_AI_CODING_PLAN_API_KEY - Umans AI Coding Plan models
  ABLITERATION_API_KEY       - Abliteration uncensored GLM models
  UMANS_WEBSEARCH_PROVIDER    - Umans gateway web search backend (native or exa)
  MINIMAX_API_KEY            - MiniMax models
  OPENCODE_API_KEY           - OpenCode Zen/OpenCode Go models
  CURSOR_ACCESS_TOKEN        - Cursor AI models
  CLINE_API_KEY              - ClinePass subscription models
  AI_GATEWAY_API_KEY         - Vercel AI Gateway
  WAFER_SERVERLESS_API_KEY   - Wafer Serverless (pay-as-you-go)
  YOLO_AUTO_API_KEY          - Yolo-Auto flat-rate Qwen models

  # Cloud Providers
  AWS_PROFILE                - AWS Bedrock (or AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY)
  GOOGLE_CLOUD_PROJECT       - Google Vertex AI (requires GOOGLE_CLOUD_LOCATION)
  GOOGLE_APPLICATION_CREDENTIALS - Service account for Vertex AI

  # Search & Tools
  EXA_API_KEY                - Exa web search
  BRAVE_API_KEY              - Brave web search
  PERPLEXITY_API_KEY         - Perplexity web search API key (optional; anonymous fallback)
  PERPLEXITY_COOKIES         - Perplexity web search (session cookie)
  TAVILY_API_KEY             - Tavily web search
  TINYFISH_API_KEY           - TinyFish web search
  FIRECRAWL_API_KEY          - Firecrawl web search + fetch reader backend
  ANTHROPIC_SEARCH_API_KEY   - Anthropic web search (override; isolates search from main ANTHROPIC_API_KEY)
  ANTHROPIC_SEARCH_BASE_URL  - Anthropic web search base URL (override; pairs with ANTHROPIC_SEARCH_API_KEY)

  # Configuration
  OMP_PROFILE                 - Named profile for isolated agent state (same as --profile)
  Use `omp --profile <name> --alias <command>` to create a shell shortcut for a profile
  PI_CODING_AGENT_DIR        - Session storage directory (default: ~/.omp/agent)
  PI_PACKAGE_DIR             - Override package directory (for Nix/Guix store paths)
  PI_SMOL_MODEL              - Override smol/fast model (see --smol)
  PI_SLOW_MODEL              - Override slow/reasoning model (see --slow)
  PI_PLAN_MODEL              - Override planning model (see --plan)
  PI_NO_PTY                  - Disable PTY-based interactive bash execution
  For complete environment variable reference, see:
  docs/environment-variables.md
Available Tools (default-enabled unless noted):
  read          - Read file contents
  bash          - Execute bash commands
  edit          - Edit files with find/replace
  write         - Write files (creates/overwrites)
  grep          - Search file contents
  glob          - Find files by glob pattern
  lsp           - Language server protocol (code intelligence)
  python        - Execute Python code (requires: omp setup python)
  notebook      - Edit Jupyter notebooks
  browser       - Browser automation (Puppeteer)
  computer      - Native host desktop capture and input (disabled by default)
  task          - Launch sub-agents for parallel tasks
  todo          - Manage todo/task lists
  web_search    - Search the web
  ask           - Ask user questions (interactive mode only)

Plugin Options:
  --plugin-dir <path>        Load plugin from directory (repeatable)

Useful Commands:
  omp agents unpack           - Export bundled subagents to ~/.omp/agent/agents (default)
  omp agents unpack --project - Export bundled subagents to ./.omp/agents
```


## 关键子命令页摘录


### codex

#### `codex exec`

```
$ codex exec --help

Run Codex non-interactively

Usage: codex exec [OPTIONS] [PROMPT]
       codex exec [OPTIONS] <COMMAND> [ARGS]

Commands:
  resume  Resume a previous session by id or pick the most recent with --last
  fork    Fork a previous session by id into a new session
  review  Run a code review against the current repository
  help    Print this message or the help of the given subcommand(s)

Arguments:
  [PROMPT]
          Initial instructions for the agent. If not provided as an argument (or if `-` is used),
          instructions are read from stdin. If stdin is piped and a prompt is also provided, stdin
          is appended as a `<stdin>` block

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

      --strict-config
          Error out when config.toml contains fields that are not recognized by this version of
          Codex

  -i, --image <FILE>...
          Optional image(s) to attach to the initial prompt

  -m, --model <MODEL>
          Model the agent should use

      --oss
          Use open-source provider

      --local-provider <OSS_PROVIDER>
          Specify which local provider to use (lmstudio or ollama). If not specified with --oss,
          will use config default or show selection

  -p, --profile <CONFIG_PROFILE_V2>
          Layer $CODEX_HOME/<name>.config.toml on top of the base user config

  -s, --sandbox <SANDBOX_MODE>
          Select the sandbox policy to use when executing model-generated shell commands
          
          [possible values: read-only, workspace-write, danger-full-access]

      --approve-for-me
          Route approval requests through automatic review using the workspace-write sandbox

      --dangerously-bypass-approvals-and-sandbox
          Skip all confirmation prompts and execute commands without sandboxing. EXTREMELY
          DANGEROUS. Intended solely for running in environments that are externally sandboxed

      --dangerously-bypass-hook-trust
          Run enabled hooks without requiring persisted hook trust for this invocation. DANGEROUS.
          Intended only for automation that already vets hook sources

  -C, --cd <DIR>
          Tell the agent to use the specified directory as its working root

      --add-dir <DIR>
          Additional directories that should be writable alongside the primary workspace

      --thread-source <SOURCE>
          Source classification for newly created or forked threads

      --skip-git-repo-check
          Allow running Codex outside a Git repository

      --ephemeral
          Run without persisting session files to disk

      --ignore-user-config
          Do not load `$CODEX_HOME/config.toml`; auth still uses `CODEX_HOME`

      --ignore-rules
          Do not load user or project execpolicy `.rules` files

      --output-schema <FILE>
          Path to a JSON Schema file describing the model's final response shape

      --color <COLOR>
          Specifies color settings for use in the output
          
          [default: auto]
          [possible values: always, never, auto]

      --json
          Print events to stdout as JSONL

  -o, --output-last-message <FILE>
          Specifies file where the last message from the agent should be written

  -h, --help
          Print help (see a summary with '-h')

  -V, --version
          Print version
```

#### `codex exec review`

```
$ codex exec review --help

Run a code review against the current repository

Usage: codex exec review [OPTIONS] [PROMPT]

Arguments:
  [PROMPT]
          Custom review instructions. If `-` is used, read from stdin

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --uncommitted
          Review staged, unstaged, and untracked changes

      --base <BRANCH>
          Review changes against the given base branch

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --commit <SHA>
          Review the changes introduced by a commit

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

      --strict-config
          Error out when config.toml contains fields that are not recognized by this version of
          Codex

      --title <TITLE>
          Optional commit title to display in the review summary

  -m, --model <MODEL>
          Model the agent should use

      --dangerously-bypass-approvals-and-sandbox
          Skip all confirmation prompts and execute commands without sandboxing. EXTREMELY
          DANGEROUS. Intended solely for running in environments that are externally sandboxed

      --dangerously-bypass-hook-trust
          Run enabled hooks without requiring persisted hook trust for this invocation. DANGEROUS.
          Intended only for automation that already vets hook sources

      --thread-source <SOURCE>
          Source classification for newly created or forked threads

      --skip-git-repo-check
          Allow running Codex outside a Git repository

      --ephemeral
          Run without persisting session files to disk

      --ignore-user-config
          Do not load `$CODEX_HOME/config.toml`; auth still uses `CODEX_HOME`

      --ignore-rules
          Do not load user or project execpolicy `.rules` files

      --output-schema <FILE>
          Path to a JSON Schema file describing the model's final response shape

      --json
          Print events to stdout as JSONL

  -o, --output-last-message <FILE>
          Specifies file where the last message from the agent should be written

  -h, --help
          Print help (see a summary with '-h')
```

#### `codex review`

```
$ codex review --help

Run a code review non-interactively

Usage: codex review [OPTIONS] [PROMPT]

Arguments:
  [PROMPT]
          Custom review instructions. If `-` is used, read from stdin

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --strict-config
          Error out when config.toml contains fields that are not recognized by this version of
          Codex

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --uncommitted
          Review staged, unstaged, and untracked changes

      --base <BRANCH>
          Review changes against the given base branch

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

      --commit <SHA>
          Review the changes introduced by a commit

      --title <TITLE>
          Optional commit title to display in the review summary

  -h, --help
          Print help (see a summary with '-h')
```

#### `codex queue`

```
$ codex queue --help

Queue a message for an existing session

Usage: codex queue [OPTIONS] --thread <THREAD> --message <TEXT>

Options:
      --thread <THREAD>
          Session UUID or exact session name

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --message <TEXT>
          Message text to queue

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

      --remote <ADDR>
          Connect the TUI to a remote app server endpoint.
          
          Accepted forms: `ws://host:port`, `wss://host:port`, `unix://`, or `unix://PATH`.

      --remote-auth-token-env <ENV_VAR>
          Name of the environment variable containing the bearer token to send to a remote app
          server websocket

  -i, --image <FILE>...
          Optional image(s) to attach to the initial prompt

  -m, --model <MODEL>
          Model the agent should use

      --oss
          Use open-source provider

      --local-provider <OSS_PROVIDER>
          Specify which local provider to use (lmstudio or ollama). If not specified with --oss,
          will use config default or show selection

  -p, --profile <CONFIG_PROFILE_V2>
          Layer $CODEX_HOME/<name>.config.toml on top of the base user config

  -s, --sandbox <SANDBOX_MODE>
          Select the sandbox policy to use when executing model-generated shell commands
          
          [possible values: read-only, workspace-write, danger-full-access]

      --approve-for-me
          Route approval requests through automatic review using the workspace-write sandbox

      --dangerously-bypass-approvals-and-sandbox
          Skip all confirmation prompts and execute commands without sandboxing. EXTREMELY
          DANGEROUS. Intended solely for running in environments that are externally sandboxed

      --dangerously-bypass-hook-trust
          Run enabled hooks without requiring persisted hook trust for this invocation. DANGEROUS.
          Intended only for automation that already vets hook sources

  -C, --cd <DIR>
          Tell the agent to use the specified directory as its working root

      --add-dir <DIR>
          Additional directories that should be writable alongside the primary workspace

      --strict-config
          Error out when config.toml contains fields that are not recognized by this version of
          Codex

  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

  -h, --help
          Print help (see a summary with '-h')
```

#### `codex app-server`

```
$ codex app-server --help

[experimental] Run the app server or related tooling

Usage: codex app-server [OPTIONS] [COMMAND]

Commands:
  daemon                Manage the local app-server daemon
  proxy                 Proxy stdio bytes to the running app-server control socket
  generate-ts           [experimental] Generate TypeScript bindings for the app server protocol
  generate-json-schema  [experimental] Generate JSON Schema for the app server protocol
  help                  Print this message or the help of the given subcommand(s)

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

      --code-mode-host <URL>
          Connect to a remote code-mode host instead of starting a local host

      --strict-config
          Error out when config.toml contains fields that are not recognized by this version of
          Codex

      --listen <URL>
          Transport endpoint URL. Supported values: `stdio://` (default), `unix://`, `unix://PATH`,
          `ws://IP:PORT`, `off`
          
          [default: stdio://]

      --stdio
          Use stdio as the transport (equivalent to `--listen stdio://`)

      --analytics-default-enabled
          Controls whether analytics are enabled by default.
          
          Analytics are disabled by default for app-server. Users have to explicitly opt in via the
          `analytics` section in the config.toml file.
          
          However, for first-party use cases like the VSCode IDE extension, we default analytics to
          be enabled by default by setting this flag. Users can still opt out by setting this in
          their config.toml:
          
          ```toml [analytics] enabled = false ```
          
          See https://developers.openai.com/codex/config-advanced/#metrics for more details.

      --ws-auth <MODE>
          Websocket auth mode for non-loopback listeners
          
          [possible values: capability-token, signed-bearer-token]

      --ws-token-file <PATH>
          Absolute path to the capability-token file

      --ws-token-sha256 <HEX>
          Hex-encoded SHA-256 digest of the capability token

      --ws-shared-secret-file <PATH>
          Absolute path to the shared secret file for signed JWT bearer tokens

      --ws-issuer <ISSUER>
          Expected issuer for signed JWT bearer tokens

      --ws-audience <AUDIENCE>
          Expected audience for signed JWT bearer tokens

      --ws-max-clock-skew-seconds <SECONDS>
          Maximum clock skew when validating signed JWT bearer tokens

  -h, --help
          Print help (see a summary with '-h')
```

#### `codex app-server daemon`

```
$ codex app-server daemon --help

Manage the local app-server daemon

Usage: codex app-server daemon [OPTIONS] <COMMAND>

Commands:
  bootstrap               Install durable local app-server management for SSH-driven use
  start                   Start the local app server daemon if it is not already running
  restart                 Restart the local app server daemon
  enable-remote-control   Enable remote control for future starts and a currently running managed
                          daemon
  disable-remote-control  Disable remote control for future starts and a currently running managed
                          daemon
  stop                    Stop the local app server daemon
  version                 Print local CLI and running app-server versions as JSON
  help                    Print this message or the help of the given subcommand(s)

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

  -h, --help
          Print help (see a summary with '-h')
```

#### `codex app-server generate-ts`

```
$ codex app-server generate-ts --help

[experimental] Generate TypeScript bindings for the app server protocol

Usage: codex app-server generate-ts [OPTIONS] --out <DIR>

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

  -o, --out <DIR>
          Output directory where .ts files will be written

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

  -p, --prettier <PRETTIER_BIN>
          Optional path to the Prettier executable to format generated files

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

      --experimental
          Include experimental methods and fields in the generated output

  -h, --help
          Print help (see a summary with '-h')
```

#### `codex cloud`

```
$ codex cloud --help

[EXPERIMENTAL] Browse tasks from Codex Cloud and apply changes locally

Usage: codex cloud [OPTIONS] [COMMAND]

Commands:
  exec    Submit a new Codex Cloud task without launching the TUI
  status  Show the status of a Codex Cloud task
  list    List Codex Cloud tasks
  apply   Apply the diff for a Codex Cloud task locally
  diff    Show the unified diff for a Codex Cloud task
  help    Print this message or the help of the given subcommand(s)

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

  -h, --help
          Print help (see a summary with '-h')

  -V, --version
          Print version
```

#### `codex features`

```
$ codex features --help

Inspect feature flags

Usage: codex features [OPTIONS] <COMMAND>

Commands:
  list     List known features with their stage and effective state
  enable   Enable a feature in config.toml
  disable  Disable a feature in config.toml
  help     Print this message or the help of the given subcommand(s)

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

  -h, --help
          Print help (see a summary with '-h')
```

#### `codex features list`

```
$ codex features list --help

List known features with their stage and effective state

Usage: codex features list [OPTIONS]

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

  -h, --help
          Print help (see a summary with '-h')
```

#### `codex mcp login`

```
$ codex mcp login --help

Usage: codex mcp login [OPTIONS] <NAME>

Arguments:
  <NAME>
          Name of the MCP server to authenticate with oauth

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --scopes <SCOPE,SCOPE>
          Comma-separated list of OAuth scopes to request

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --oauth-client-registration <AUTO|CIMD|DCR>
          OAuth client-registration strategy for this login only
          
          [possible values: auto, cimd, dcr]

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

  -h, --help
          Print help (see a summary with '-h')
```

#### `codex plugin marketplace`

```
$ codex plugin marketplace --help

Add, list, upgrade, or remove configured plugin marketplaces

Usage: codex plugin marketplace [OPTIONS] <COMMAND>

Commands:
  add      Add a local or Git marketplace to the configured marketplace sources
  list     List plugin marketplaces Codex is currently considering and their roots
  upgrade  Refresh configured Git marketplace snapshots
  remove   Remove a configured marketplace source by name
  help     Print this message or the help of the given subcommand(s)

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

  -h, --help
          Print help (see a summary with '-h')
```

#### `codex debug app-server send-message-v2`

```
$ codex debug app-server send-message-v2 --help

Usage: codex debug app-server send-message-v2 [OPTIONS] <USER_MESSAGE>

Arguments:
  <USER_MESSAGE>
          

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

  -h, --help
          Print help (see a summary with '-h')
```

#### `codex login`

```
$ codex login --help

Manage login

Usage: codex login [OPTIONS] [COMMAND]

Commands:
  status  Show login status
  help    Print this message or the help of the given subcommand(s)

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --with-api-key
          Read the API key from stdin (e.g. `printenv OPENAI_API_KEY | codex login --with-api-key`)

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --with-access-token
          Read the access token from stdin (e.g. `printenv CODEX_ACCESS_TOKEN | codex login
          --with-access-token`)

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

      --device-auth
          

  -h, --help
          Print help (see a summary with '-h')
```

#### `codex sandbox`

```
$ codex sandbox --help

Run commands within a Codex-provided sandbox

Usage: codex sandbox [OPTIONS] [COMMAND]...

Arguments:
  [COMMAND]...
          Full command args to run under the Linux sandbox

Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
          Use a dotted path (`foo.bar.baz`) to override nested values. The `value` portion is parsed
          as TOML. If it fails to parse as TOML, the raw string is used as a literal.
          
          Examples: - `-c model="o3"` - `-c 'sandbox_permissions=["disk-full-read-access"]'` - `-c
          shell_environment_policy.inherit=all`

      --sandbox-state-json <JSON>
          JSON value from `codex/sandbox-state-meta` to apply directly

      --enable <FEATURE>
          Enable a feature (repeatable). Equivalent to `-c features.<name>=true`

      --sandbox-state-readable-root <SANDBOX_STATE_READABLE_ROOT>
          Add a readable root to the supplied sandbox state. Repeat for multiple roots

      --disable <FEATURE>
          Disable a feature (repeatable). Equivalent to `-c features.<name>=false`

      --sandbox-state-disable-network
          Disable direct network access in the supplied sandbox state

  -P, --permission-profile <NAME>
          Named permissions profile to apply from the active configuration stack

  -p, --profile <CONFIG_PROFILE>
          Layer $CODEX_HOME/<name>.config.toml on top of the base user config

  -C, --cd <DIR>
          Working directory used for profile resolution and command execution

      --include-managed-config
          Include managed requirements while resolving an explicit permissions profile

  -h, --help
          Print help (see a summary with '-h')
```


### opencode

#### `opencode run`

```
$ opencode run --help

opencode run [message..]

run opencode with a message

Positionals:
  message  message to send                                                     [array] [default: []]

Options:
  -h, --help         show help                                                             [boolean]
  -v, --version      show version number                                                   [boolean]
      --print-logs   print logs to stderr                                                  [boolean]
      --log-level    log level                  [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure         run without external plugins                                          [boolean]
      --command      the command to run, use message for args                               [string]
  -c, --continue     continue the last session                                             [boolean]
  -s, --session      session id to continue                                                 [string]
      --fork         fork the session before continuing (requires --continue or --session) [boolean]
      --share        share the session                                                     [boolean]
  -m, --model        model to use in the format of provider/model                           [string]
      --agent        agent to use                                                           [string]
      --format       format: default (formatted) or json (raw JSON events)
                                          [string] [choices: "default", "json"] [default: "default"]
  -f, --file         file(s) to attach to message                                            [array]
      --title        title for the session (uses truncated prompt if no value provided)     [string]
      --attach       attach to a running opencode server (e.g., http://localhost:4096)      [string]
  -p, --password     basic auth password (defaults to OPENCODE_SERVER_PASSWORD)             [string]
  -u, --username     basic auth username (defaults to OPENCODE_SERVER_USERNAME or 'opencode')
                                                                                            [string]
      --dir          directory to run in, path on remote server if attaching                [string]
      --port         port for the local server (defaults to random port if no value provided)
                                                                                            [number]
      --variant      model variant (provider-specific reasoning effort, e.g., high, max, minimal)
                                                                                            [string]
      --thinking     show thinking blocks                                                  [boolean]
  -i, --interactive  run in direct interactive split-footer mode          [boolean] [default: false]
      --auto         auto-approve permissions that are not explicitly denied (dangerous!)
                                                                          [boolean] [default: false]
```

#### `opencode serve`

```
$ opencode serve --help

opencode serve

starts a headless opencode server

Options:
  -h, --help         show help                                                             [boolean]
  -v, --version      show version number                                                   [boolean]
      --print-logs   print logs to stderr                                                  [boolean]
      --log-level    log level                  [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure         run without external plugins                                          [boolean]
      --port         port to listen on                                         [number] [default: 0]
      --hostname     hostname to listen on                           [string] [default: "127.0.0.1"]
      --mdns         enable mDNS service discovery (defaults hostname to 0.0.0.0)
                                                                          [boolean] [default: false]
      --mdns-domain  custom domain name for mDNS service (default: opencode.local)
                                                                [string] [default: "opencode.local"]
      --cors         additional domains to allow for CORS                      [array] [default: []]
```

#### `opencode web`

```
$ opencode web --help

opencode web

start opencode server and open web interface

Options:
  -h, --help         show help                                                             [boolean]
  -v, --version      show version number                                                   [boolean]
      --print-logs   print logs to stderr                                                  [boolean]
      --log-level    log level                  [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure         run without external plugins                                          [boolean]
      --port         port to listen on                                         [number] [default: 0]
      --hostname     hostname to listen on                           [string] [default: "127.0.0.1"]
      --mdns         enable mDNS service discovery (defaults hostname to 0.0.0.0)
                                                                          [boolean] [default: false]
      --mdns-domain  custom domain name for mDNS service (default: opencode.local)
                                                                [string] [default: "opencode.local"]
      --cors         additional domains to allow for CORS                      [array] [default: []]
```

#### `opencode attach`

```
$ opencode attach --help

opencode attach <url>

attach to a running opencode server

Positionals:
  url  http://localhost:4096                                                     [string] [required]

Options:
  -h, --help          show help                                                            [boolean]
  -v, --version       show version number                                                  [boolean]
      --print-logs    print logs to stderr                                                 [boolean]
      --log-level     log level                 [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure          run without external plugins                                         [boolean]
      --dir           directory to run in                                                   [string]
  -c, --continue      continue the last session                                            [boolean]
  -s, --session       session id to continue                                                [string]
      --fork          fork the session when continuing (use with --continue or --session)  [boolean]
  -p, --password      basic auth password (defaults to OPENCODE_SERVER_PASSWORD)            [string]
  -u, --username      basic auth username (defaults to OPENCODE_SERVER_USERNAME or 'opencode')
                                                                                            [string]
      --mini          start the minimal interactive interface             [boolean] [default: false]
      --no-replay     disable mini session history replay on resume and after resize       [boolean]
      --replay-limit  cap visible mini replay to the newest N messages                      [number]
```

#### `opencode db`

```
$ opencode db --help

opencode db

database tools

Commands:
  opencode db [query]     open an interactive sqlite3 shell or run a query                 [default]
  opencode db path        print the database path

Positionals:
  query  SQL query to execute                                                               [string]

Options:
  -h, --help        show help                                                              [boolean]
  -v, --version     show version number                                                    [boolean]
      --print-logs  print logs to stderr                                                   [boolean]
      --log-level   log level                   [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure        run without external plugins                                           [boolean]
      --format      Output format                 [string] [choices: "json", "tsv"] [default: "tsv"]
```

#### `opencode session`

```
$ opencode session --help

opencode session

manage sessions

Commands:
  opencode session list                list sessions
  opencode session delete <sessionID>  delete a session

Options:
  -h, --help        show help                                                              [boolean]
  -v, --version     show version number                                                    [boolean]
      --print-logs  print logs to stderr                                                   [boolean]
      --log-level   log level                   [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure        run without external plugins                                           [boolean]
```

#### `opencode export`

```
$ opencode export --help

opencode export [sessionID]

export session data as JSON

Positionals:
  sessionID  session id to export                                                           [string]

Options:
  -h, --help        show help                                                              [boolean]
  -v, --version     show version number                                                    [boolean]
      --print-logs  print logs to stderr                                                   [boolean]
      --log-level   log level                   [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure        run without external plugins                                           [boolean]
      --sanitize    redact sensitive transcript and file data                              [boolean]
```

#### `opencode import`

```
$ opencode import --help

opencode import <file>

import session data from JSON file or URL

Positionals:
  file  path to JSON file or share URL                                           [string] [required]

Options:
  -h, --help        show help                                                              [boolean]
  -v, --version     show version number                                                    [boolean]
      --print-logs  print logs to stderr                                                   [boolean]
      --log-level   log level                   [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure        run without external plugins                                           [boolean]
```

#### `opencode pr`

```
$ opencode pr --help

opencode pr <number>

fetch and checkout a GitHub PR branch, then run opencode

Positionals:
  number  PR number to checkout                                                  [number] [required]

Options:
  -h, --help        show help                                                              [boolean]
  -v, --version     show version number                                                    [boolean]
      --print-logs  print logs to stderr                                                   [boolean]
      --log-level   log level                   [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure        run without external plugins                                           [boolean]
```

#### `opencode github`

```
$ opencode github --help

opencode github

manage GitHub agent

Commands:
  opencode github install  install the GitHub agent
  opencode github run      run the GitHub agent

Options:
  -h, --help        show help                                                              [boolean]
  -v, --version     show version number                                                    [boolean]
      --print-logs  print logs to stderr                                                   [boolean]
      --log-level   log level                   [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure        run without external plugins                                           [boolean]
```

#### `opencode debug`

```
$ opencode debug --help

opencode debug

debugging and troubleshooting tools

Commands:
  opencode debug config        show resolved configuration
  opencode debug lsp           LSP debugging utilities
  opencode debug rg            ripgrep debugging utilities
  opencode debug file          file system debugging utilities
  opencode debug scrap         list all known projects
  opencode debug skill         list all available skills
  opencode debug snapshot      snapshot debugging utilities
  opencode debug startup       print startup timing
  opencode debug agent <name>  show agent configuration details
  opencode debug v2            debug v2 catalog and built-in plugins
  opencode debug info          show debug information
  opencode debug paths         show global paths (data, config, cache, state)
  opencode debug wait          wait indefinitely (for debugging)

Options:
  -h, --help        show help                                                              [boolean]
  -v, --version     show version number                                                    [boolean]
      --print-logs  print logs to stderr                                                   [boolean]
      --log-level   log level                   [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure        run without external plugins                                           [boolean]
```

#### `opencode debug lsp`

```
$ opencode debug lsp --help

opencode debug lsp

LSP debugging utilities

Commands:
  opencode debug lsp diagnostics <file>      get diagnostics for a file
  opencode debug lsp symbols <query>         search workspace symbols
  opencode debug lsp document-symbols <uri>  get symbols from a document

Options:
  -h, --help        show help                                                              [boolean]
  -v, --version     show version number                                                    [boolean]
      --print-logs  print logs to stderr                                                   [boolean]
      --log-level   log level                   [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure        run without external plugins                                           [boolean]
```

#### `opencode debug file`

```
$ opencode debug file --help

opencode debug file

file system debugging utilities

Commands:
  opencode debug file read <path>     read file contents as JSON
  opencode debug file list <path>     list files in a directory
  opencode debug file search <query>  search files by query

Options:
  -h, --help        show help                                                              [boolean]
  -v, --version     show version number                                                    [boolean]
      --print-logs  print logs to stderr                                                   [boolean]
      --log-level   log level                   [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure        run without external plugins                                           [boolean]
```

#### `opencode debug rg`

```
$ opencode debug rg --help

opencode debug rg

ripgrep debugging utilities

Commands:
  opencode debug rg files             list files using ripgrep
  opencode debug rg search <pattern>  search file contents using ripgrep

Options:
  -h, --help        show help                                                              [boolean]
  -v, --version     show version number                                                    [boolean]
      --print-logs  print logs to stderr                                                   [boolean]
      --log-level   log level                   [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure        run without external plugins                                           [boolean]
```

#### `opencode debug snapshot`

```
$ opencode debug snapshot --help

opencode debug snapshot

snapshot debugging utilities

Commands:
  opencode debug snapshot track         track current snapshot state
  opencode debug snapshot patch <hash>  show patch for a snapshot hash
  opencode debug snapshot diff <hash>   show diff for a snapshot hash

Options:
  -h, --help        show help                                                              [boolean]
  -v, --version     show version number                                                    [boolean]
      --print-logs  print logs to stderr                                                   [boolean]
      --log-level   log level                   [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure        run without external plugins                                           [boolean]
```

#### `opencode mcp auth`

```
$ opencode mcp auth --help

opencode mcp auth [name]

authenticate with an OAuth-enabled MCP server

Commands:
  opencode mcp auth list  list OAuth-capable MCP servers and their auth status         [aliases: ls]

Positionals:
  name  name of the MCP server                                                              [string]

Options:
  -h, --help        show help                                                              [boolean]
  -v, --version     show version number                                                    [boolean]
      --print-logs  print logs to stderr                                                   [boolean]
      --log-level   log level                   [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure        run without external plugins                                           [boolean]
```

#### `opencode providers login`

```
$ opencode providers login --help

opencode providers login [url]

log in to a provider

Positionals:
  url  opencode auth provider                                                               [string]

Options:
  -h, --help        show help                                                              [boolean]
  -v, --version     show version number                                                    [boolean]
      --print-logs  print logs to stderr                                                   [boolean]
      --log-level   log level                   [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure        run without external plugins                                           [boolean]
  -p, --provider    provider id or name to log in to (skips provider selection)             [string]
  -m, --method      login method label (skips method selection)                             [string]
```

#### `opencode agent create`

```
$ opencode agent create --help

opencode agent create

create a new agent

Options:
  -h, --help                  show help                                                    [boolean]
  -v, --version               show version number                                          [boolean]
      --print-logs            print logs to stderr                                         [boolean]
      --log-level             log level         [string] [choices: "DEBUG", "INFO", "WARN", "ERROR"]
      --pure                  run without external plugins                                 [boolean]
      --path                  directory path to generate the agent file                     [string]
      --description           what the agent should do                                      [string]
      --mode                  agent mode            [string] [choices: "all", "primary", "subagent"]
      --permissions, --tools  comma-separated list of permissions to allow (default: all).
                              Available: "bash, read, edit, glob, grep, webfetch, task, todowrite,
                              websearch, lsp, skill"                                        [string]
  -m, --model                 model to use in the format of provider/model                  [string]
```


### omo

#### `omo run`

```
$ omo run --help

Usage: oh-my-opencode run [options] <message>

Run opencode with todo/background task completion enforcement

Options:
  -a, --agent <name>            Agent to use (default: from CLI/env/config,
                                fallback: Sisyphus)
  -m, --model <provider/model>  Model override (e.g., anthropic/claude-sonnet-4)
  -d, --directory <path>        Working directory
  -p, --port <port>             Server port (attaches if port already in use)
  --attach <url>                Attach to existing opencode server URL
  --on-complete <command>       Shell command to run after completion
  --json                        Output structured JSON result to stdout
  --no-timestamp                Disable timestamp prefix in run output
  --verbose                     Show full event stream (default: messages/tools
                                only)
  --session-id <id>             Resume existing session instead of creating new
                                one
  -h, --help                    Display help for command

Examples:
  $ bunx oh-my-opencode run "Fix the bug in index.ts"
  $ bunx oh-my-opencode run --agent Sisyphus "Implement feature X"
  $ bunx oh-my-opencode run --port 4321 "Fix the bug"
  $ bunx oh-my-opencode run --attach http://127.0.0.1:4321 "Fix the bug"
  $ bunx oh-my-opencode run --json "Fix the bug" | jq .sessionId
  $ bunx oh-my-opencode run --on-complete "notify-send Done" "Fix the bug"
  $ bunx oh-my-opencode run --session-id ses_abc123 "Continue the work"
  $ bunx oh-my-opencode run --model anthropic/claude-sonnet-4 "Fix the bug"
  $ bunx oh-my-opencode run --agent Sisyphus --model openai/gpt-5.6-sol "Implement feature X"

Agent resolution order:
  1) --agent flag
  2) OPENCODE_DEFAULT_AGENT
  3) .omo/omo.jsonc "default_run_agent"
  4) Sisyphus (fallback)

Available core agents:
  Sisyphus, Hephaestus, Prometheus, Atlas

Unlike 'opencode run', this command waits until:
  - All todos are completed or cancelled
  - All child sessions (background tasks) are idle
```

#### `omo boulder`

```
$ omo boulder --help

Usage: oh-my-opencode boulder [options]

Show boulder progress, elapsed time, and per-task statistics

Options:
  -d, --directory <path>  Working directory
  -w, --work-id <id>      Filter to a specific work
  --json                  Output as JSON
  -h, --help              Display help for command
```

#### `omo ulw-loop`

```
$ omo ulw-loop --help

Usage: oh-my-opencode ulw-loop [options] [args...]

Run the Codex LazyCodex ulw-loop CLI

Options:
  -h, --help  Display help for command
```

#### `omo doctor`

```
$ omo doctor --help

Usage: oh-my-opencode doctor [options]

Check oh-my-opencode installation health and diagnose issues

Options:
  --status               Show compact system dashboard
  --verbose              Show detailed diagnostic information
  --json                 Output results in JSON format
  --platform <platform>  Doctor target platform: opencode, codex (choices:
                         "opencode", "codex")
  -h, --help             Display help for command

Examples:
  $ bunx oh-my-opencode doctor            # Show problems only
  $ bunx oh-my-opencode doctor --status   # Compact dashboard
  $ bunx oh-my-opencode doctor --verbose  # Deep diagnostics
  $ bunx oh-my-opencode doctor --json     # JSON output
  $ omo doctor --platform=codex           # Codex/LazyCodex diagnostics only
```

#### `omo config`

```
$ omo config --help

Usage: oh-my-opencode config [options] [command]

Manage unified OMO configuration

Options:
  -h, --help         Display help for command

Commands:
  migrate [options]  Migrate legacy OMO configuration into ~/.omo/omo.jsonc
  help [command]     display help for command
```

#### `omo config migrate`

```
$ omo config migrate --help
Usage: oh-my-opencode config migrate [options]

Migrate legacy OMO configuration into ~/.omo/omo.jsonc

Options:
  --dry-run   Print the transform, backup move plan, and conflicts without new
              migration writes
  --json      Print machine-readable migration output
  -h, --help  Display help for command
```

#### `omo mcp`

```
$ omo mcp --help

Usage: oh-my-opencode mcp [options] [command]

MCP server management

Options:
  -h, --help      display help for command

Commands:
  oauth           OAuth token management for MCP servers
  help [command]  display help for command
```

#### `omo mcp oauth`

```
$ omo mcp oauth --help
Usage: oh-my-opencode mcp oauth [options] [command]

OAuth token management for MCP servers

Options:
  -h, --help                      display help for command

Commands:
  login [options] <server-name>   Authenticate with an MCP server using OAuth
  logout [options] <server-name>  Remove stored OAuth tokens for an MCP server
  status [server-name]            Show OAuth token status for MCP servers
  help [command]                  display help for command
```

#### `omo mcp oauth login`

```
$ omo mcp oauth login --help
Usage: oh-my-opencode mcp oauth login [options] <server-name>

Authenticate with an MCP server using OAuth

Options:
  --server-url <url>    OAuth server URL (required if not in config)
  --client-id <id>      OAuth client ID (optional, uses DCR if not provided)
  --scopes <scopes...>  OAuth scopes to request
  -h, --help            display help for command
```

#### `omo install`

```
$ omo install --help

Usage: oh-my-opencode install|setup [options]

Install and configure oh-my-opencode with interactive setup

Options:
  --no-tui                          Run in non-interactive mode (requires all
                                    options)
  --claude <value>                  Claude subscription: no, yes, max20
  --openai <value>                  OpenAI/ChatGPT subscription: no, yes
                                    (default: no)
  --gemini <value>                  Gemini integration: no, yes
  --copilot <value>                 GitHub Copilot subscription: no, yes
  --platform <platform>             Install target platform: opencode, codex,
                                    both (choices: "opencode", "codex", "both")
  --opencode-zen <value>            OpenCode Zen access: no, yes (default: no)
  --zai-coding-plan <value>         Z.ai Coding Plan subscription: no, yes
                                    (default: no)
  --kimi-for-coding <value>         Kimi For Coding subscription: no, yes
                                    (default: no)
  --opencode-go <value>             OpenCode Go subscription: no, yes (default:
                                    no)
  --bailian-coding-plan <value>     Bailian Coding Plan subscription: no, yes
                                    (default: no)
  --minimax-cn-coding-plan <value>  MiniMax Coding Plan (minimaxi.com)
                                    subscription: no, yes (default: no)
  --minimax-coding-plan <value>     MiniMax Coding Plan (minimax.io)
                                    subscription: no, yes (default: no)
  --vercel-ai-gateway <value>       Vercel AI Gateway: no, yes (default: no)
  --codex-autonomous                Configure Codex with approval never, full
                                    filesystem access, and network enabled
  --no-codex-autonomous             Leave existing Codex permission settings
                                    unchanged
  --skip-auth                       Skip authentication setup hints
  -h, --help                        Display help for command

Examples:
  $ bunx oh-my-opencode install
  $ npx lazycodex-ai install --no-tui
  $ bunx oh-my-opencode install --no-tui --platform=both --claude=max20 --openai=yes --gemini=yes --copilot=no
  $ omo install --platform=codex --codex-autonomous
  $ bunx oh-my-opencode install --no-tui --claude=no --gemini=no --copilot=yes --opencode-zen=yes

Model Providers (Priority: Native > Copilot > OpenCode Zen > Z.ai > Kimi > Bailian > MiniMax > Vercel):
  Claude        Native anthropic/ models (Opus, Sonnet, Haiku)
  OpenAI        Native openai/ models (GPT-5.6 Sol for Oracle)
  Gemini        Native google/ models (Gemini 3.1 Pro, Flash)
  Copilot       github-copilot/ models (fallback)
  OpenCode Zen  opencode/ models (opencode/claude-opus-5, etc.)
  Z.ai          zai-coding-plan/glm-5.2 (visual-engineering fallback)
  Kimi          kimi-for-coding/kimi-k3 (Sisyphus/Prometheus fallback)
  Bailian       bailian-coding-plan/ models (Qwen, GLM, Kimi fallback)
  MiniMax       minimax-coding-plan/MiniMax-M3 (utility fallback)
  MiniMax CN    minimax-cn-coding-plan/MiniMax-M3 (utility fallback)
  Vercel        vercel/ models (universal proxy, always last fallback)
```


### omp

#### `omp ttsr`

```
$ omp ttsr --help

Inspect and test Time-Traveling Stream Rules (TTSR)

USAGE
  $ omp ttsr [ACTION] [SNIPPET] [FLAGS]

ARGUMENTS
  ACTION    TTSR action (test|list|scan)
  SNIPPET   Inline snippet text to test (ttsr test) or directory to scan (ttsr scan)

FLAGS
      --file=<value>     Snippet file path, or - for stdin (ttsr test)
  -r, --rule=<value>     Rule markdown file to test in isolation (skips project rule loading)
      --source=<value>   Match source: text, thinking, or tool (inferred from --file when omitted)
      --tool=<value>     Tool name when source is tool (e.g. edit, write); defaults to edit
  -p, --path=<value>     Candidate file path for scope/glob matching and AST language inference
      --agent=<value>    Agent name to evaluate rule `agents` scoping as (ttsr test); defaults to main
  -v, --verbose          Show every evaluated rule, not just triggered ones
      --json             Output JSON
      --no-gitignore     Include files excluded by .gitignore (ttsr scan)
      --max-bytes=<int>  Maximum file size to scan in bytes; 0 disables the limit (ttsr scan)

EXAMPLES
  omp ttsr list
  omp ttsr test 'const x: any = 1'
  omp ttsr test src/foo.ts
  omp ttsr test --file src/foo.ts
  omp ttsr test --file src/foo.ts --source text
  omp ttsr test --rule .omp/rules/no-any.md --source tool --path src/foo.ts 'const x: any = 1'
  omp ttsr test --agent scout 'const x: any = 1'
  echo 'Box::leak(&mut v)' | omp ttsr test --file - --path src/lib.rs
  omp ttsr test --source tool --tool edit --path src/foo.ts 'const x: any = 1'
  omp ttsr scan
  omp ttsr scan src/
  omp ttsr scan -r .omp/rules/no-any.md src/
```

#### `omp auth-broker`

```
$ omp auth-broker --help

Manage the omp auth-broker (credential vault)

USAGE
  $ omp auth-broker [ACTION] [SOURCE] [FLAGS]

ARGUMENTS
  ACTION   Sub-command (serve|token|login|logout|import|migrate|status|list)
  SOURCE   OAuth provider id (login/logout) or path (import)

FLAGS
      --json              Output JSON
  -b, --bind=<value>      Bind address for `serve` (host:port)
      --regenerate        Regenerate the bearer token
      --via=<value>       SSH user@host for remote login (login --via=user@host)
      --provider=<value>  Override provider id for `import` (e.g. when JSON `type` is unrecognized)
      --include-disabled  Import credentials whose JSON has `disabled: true` (import)
      --from-local        migrate source: local SQLite + env vars (required for `migrate`)
      --include-env       Capture env-var API keys for providers not yet on broker (migrate)
      --include-oauth     Also upload OAuth from local SQLite during migrate (default skips them)
      --dry-run           Print actions without executing (import / login --via / migrate)

EXAMPLES
  # Boot the broker against the local SQLite store
    omp auth-broker serve
  # Boot on a non-default port
    omp auth-broker serve --bind=127.0.0.1:9000
  # Print the bearer token
    omp auth-broker token
  # Rotate the bearer token
    omp auth-broker token --regenerate
  # List supported OAuth providers
    omp auth-broker list
  # Local login (run on the broker host)
    omp auth-broker login anthropic
  # Interactive provider selection
    omp auth-broker login
  # Remote login over SSH tunnel
    omp auth-broker login anthropic --via=user@broker
  # Log out of a provider (interactive without provider arg)
    omp auth-broker logout anthropic
  # Import a CLIProxyAPI auth dump
    omp auth-broker import ~/.cliproxy/auth
  # Import a single CLIProxyAPI JSON, overriding the provider mapping
    omp auth-broker import ~/.cliproxy/auth/claude-foo.json --provider anthropic
  # Preview a migration from local store + env vars to the configured broker
    omp auth-broker migrate --from-local --include-env --dry-run
  # Apply the migration
    omp auth-broker migrate --from-local --include-env
  # Health-check the configured remote broker
    omp auth-broker status
```

#### `omp auth-gateway`

```
$ omp auth-gateway --help

Run an auth-gateway forward proxy backed by the configured broker

USAGE
  $ omp auth-gateway [ACTION] [FLAGS]

ARGUMENTS
  ACTION   Sub-command (serve|token|status|check)

FLAGS
      --json          Output JSON (token/status/check)
  -b, --bind=<value>  Bind address for `serve` (host:port)
      --regenerate    Regenerate the gateway bearer token (token)
      --no-auth       Disable inbound bearer-token auth (serve). Useful when bound to loopback — any caller is allowed.
      --strict        For `check`: additionally probe each credential against its provider's chat-completion endpoint. Slower; consumes a tiny amount of quota per credential.

EXAMPLES
  # Boot the gateway against the configured broker
    omp auth-gateway serve
  # Boot on a non-default port
    omp auth-gateway serve --bind=127.0.0.1:4000
  # Print the gateway bearer token (creates one on first run)
    omp auth-gateway token
  # Rotate the gateway bearer token
    omp auth-gateway token --regenerate
  # Run on loopback without any bearer (anyone on this host can call)
    omp auth-gateway serve --no-auth
  # Show local gateway + broker config status
    omp auth-gateway status
  # Probe each broker credential to see which one is producing 401s
    omp auth-gateway check
  # Same, machine-readable for scripts
    omp auth-gateway check --json
  # Strict check — also exercises each credential with a real chat-completion ping
    omp auth-gateway check --strict
```

#### `omp config`

```
$ omp config --help

Manage configuration settings

USAGE
  $ omp config [ACTION] [KEY] [VALUE...] [FLAGS]

ARGUMENTS
  ACTION   Config action (list|get|set|reset|path|init-xdg)
  KEY      Setting key
  VALUE    Value (for set/reset)

FLAGS
      --json  Output JSON
```

#### `omp plugin`

```
$ omp plugin --help

Manage plugins (install, uninstall, list, etc.)

USAGE
  $ omp plugin [ACTION] [TARGETS...] [FLAGS]

ARGUMENTS
  ACTION    Plugin action (install|uninstall|list|link|doctor|features|config|enable|disable|marketplace|discover|upgrade)
  TARGETS   Packages, paths, or plugin names

FLAGS
      --json             Output JSON
      --fix              Attempt to fix issues (doctor)
      --force            Force install
      --dry-run          Show actions without applying changes
  -l, --local            Operate on local plugin directory
      --enable=<value>   Enable a feature
      --disable=<value>  Disable a feature
      --set=<value>      Set plugin config (key=value)
      --scope=<value>    Install scope: "user" (default) or "project"
```

#### `omp bench`

```
$ omp bench --help

Benchmark models: TTFT/prefill vs decode throughput with p50/p95, across chat, prefill, generation, and prompt-cache workloads

USAGE
  $ omp bench MODELS... [FLAGS]

ARGUMENTS
  MODELS   Model selectors (provider/model or fuzzy id, e.g. opus)

FLAGS
      --runs=<int>                 Requests per model (default: 9 for mix, 10 chat, 5 prefill/generation)
      --max-tokens=<int>           Max output tokens per request (default: chat 512, prefill 64, generation 2048, cache 64)
      --prompt=<value>             Custom prompt text (requires --profile chat or generation)
      --profile=<value>            Benchmark workload (default mix rotates all): chat (balanced), prefill (large cache-busted input, measures input processing), generation (long forced output, measures sustained decode)
      --prefill-bytes=<int>        Synthetic input size for prefill challenges (default: 32768)
      --service-tier=<value>       Service tier applied per model family (default: configured `tier.*` settings; `none` omits it)
      --json                       Output JSON
      --par=<int>                  Execute runs with N parallel queries/requests (default: 4)
      --cache                      Run independent cold/warm prompt-cache pairs (not supported for openai-codex-responses)
      --cache-prefix-file=<value>  Stable prompt prefix file for --cache
      --cache-prefix-bytes=<int>   Stable prefix byte budget for --cache (default: 8192)
      --cache-pairs=<int>          Cold/warm pairs per model for --cache (default: 1)
      --cache-concurrency=<int>    Concurrent cache pairs for --cache; each pair remains sequential (default: 1)

EXAMPLES
  # Compare two models across mixed challenges (chat, prefill, generation)
    omp bench anthropic/claude-opus-4-5 openai/gpt-5.2
  # Fuzzy selectors work
    omp bench opus sonnet
  # Average over 3 runs each
    omp bench opus gpt-5.2 --runs 3
  # Isolate prompt-ingestion speed with a 64 KiB cache-busted input
    omp bench opus sonnet --profile prefill --prefill-bytes 65536
  # Isolate sustained decode throughput
    omp bench opus sonnet --profile generation
  # Force priority serving tier
    omp bench openai-codex/gpt-5.5:low --runs 10 --service-tier priority
  # Measure one cold/warm prompt-cache pair
    omp bench openai/gpt-5.6 --cache --json
```

#### `omp if-bench`

```
$ omp if-bench --help

Benchmark instruction following and working memory: one cached thread of glyph array actions with a moving cat-sound directive

USAGE
  $ omp if-bench MODELS... [FLAGS]

ARGUMENTS
  MODELS   Model selectors (provider/model or fuzzy id, e.g. opus)

FLAGS
      --turns=<int>       Maximum turns per model; turn N issues N actions (default: 24)
      --length=<int>      Character-array length, even, 8-26 (default: 24)
      --max-tokens=<int>  Max output tokens per turn (default: 32768)
      --nya-max=<int>     Longest accepted cat sound in nya{1,N} (default: 8)
      --par=<int>         Models benchmarked concurrently (default: 4)
      --json              Output JSON

EXAMPLES
  # Compare three models on the incremental array machine
    omp if-bench opus sonnet gpt-5.2
  # Go deeper, one model at a time
    omp if-bench opus --turns 40 --par 1
  # Shorter array, tighter cat sound
    omp if-bench sonnet --length 12 --nya-max 2
  # Machine-readable per-turn transcript
    omp if-bench opus --json
```

#### `omp gc`

```
$ omp gc --help

Run storage garbage collection

USAGE
  $ omp gc [FLAGS]

FLAGS
      --apply                          Apply changes (default is dry-run)
      --json                           Output JSON
      --agent-dir=<value>              Agent directory to maintain
      --blobs                          Sweep unreferenced blobs
      --archive                        Archive cold sessions
      --wal                            Checkpoint history/model database WAL files
      --cold-archive-after-days=<int>  Minimum session age before archiving
      --retain-newest-global=<int>     Always keep this many newest sessions active
      --retain-newest-per-cwd=<int>    Always keep this many newest sessions per cwd active
```

#### `omp ps`

```
$ omp ps --help

List and control daemon-supervised background processes (logs, stop, kill, restart)

USAGE
  $ omp ps [ACTION] [NAME] [FLAGS]

ARGUMENTS
  ACTION   list (default), info, logs, stop, kill, or restart (list|info|logs|stop|kill|restart)
  NAME     Process name (required for every action except list)

FLAGS
  -a, --all             List every project and global service scope (list)
  -j, --json            Emit machine-readable JSON
      --plain           Static listing instead of the interactive monitor (list)
      --dir=<value>     Target another project directory instead of the current one
      --global=<value>  Target a machine-global service scope (e.g. browser-relay)
  -f, --follow          Keep streaming new output (logs)
      --head            Read from the beginning instead of the tail (logs)
  -n, --lines=<int>     Number of log lines, max 1000 (logs)
      --grep=<value>    Regex filter applied to log lines (logs)
      --timeout=<int>   Grace period in seconds before hard kill (stop)

EXAMPLES
  omp ps
  omp ps --all
  omp ps logs web --follow
  omp ps stop web
  omp ps kill web
  omp ps info relay --global browser-relay
```

#### `omp share`

```
$ omp share --help

Share a saved session via an encrypted link (same as /share)

USAGE
  $ omp share SESSION [FLAGS]

ARGUMENTS
  SESSION   Session id (prefix) or path to a session .jsonl

FLAGS
      --gist  Upload to a secret GitHub gist instead of the share server
```

#### `omp commit`

```
$ omp commit --help

Generate a commit message and update changelogs

USAGE
  $ omp commit [FLAGS]

FLAGS
      --push             Push after committing
      --dry-run          Preview without committing
      --no-changelog     Skip changelog updates
      --legacy           Use legacy deterministic pipeline
  -c, --context=<value>  Additional context for the model
  -m, --model=<value>    Override model selection
```

#### `omp render`

```
$ omp render --help

Draw a session's entire thread through the production transcript pipeline (with repaint timing)

USAGE
  $ omp render [SESSION] [FLAGS]

ARGUMENTS
  SESSION   Session file path or id prefix (default: most recent for cwd)

FLAGS
  -w, --width=<int>    Render width in columns (default: terminal width)
      --height=<int>   Viewport height in rows (default: terminal height)
  -t, --timing         Print phase timings and emitted byte counts to stderr
      --repaint=<int>  Benchmark N extra full clear-scrollback repaints (the /tree navigation frame)
      --plain          Strip ANSI styling from the output
  -q, --quiet          Suppress transcript output (benchmark runs)

EXAMPLES
  omp render
  omp render 01a0285c --plain
  omp render ~/.omp/agent/sessions/--work-pi--/big.jsonl -q -t --repaint 5
  omp render -w 200 > thread.ansi
```

#### `omp models`

```
$ omp models --help

List, search, and refresh available models

USAGE
  $ omp models [ACTION] [PATTERN] [FLAGS]

ARGUMENTS
  ACTION    ls (default) | find | refresh | <provider>
  PATTERN   Filter/search substring, or provider name (required for find)

FLAGS
      --json               Output JSON
  -e, --extension=<value>  Load an extension file before listing (repeatable)
      --no-extensions      Disable extension discovery (explicit -e paths still work)
      --config=<value>     Load an extra config.yml-style overlay for this run (repeatable)

EXAMPLES
  # List every available model, grouped by provider
    omp models
  # List one provider's models (any provider name works)
    omp models openai-codex
  # Find models by substring
    omp models find minimax
  # Force a fresh catalog fetch (replaces rm -rf ~/.omp/models.db)
    omp models refresh
  # Machine-readable output
    omp models --json
```

#### `omp usage`

```
$ omp usage --help

Show provider usage limits for every authenticated account

USAGE
  $ omp usage [ACTION] [FLAGS]

ARGUMENTS
  ACTION   Optional subcommand to execute (invalidate|clients)

FLAGS
  -j, --json              Output usage reports as JSON
  -p, --provider=<value>  Only show usage for this provider id (e.g. anthropic)
  -r, --redact            Redact account emails/ids (shortest unique prefix) for sharing screenshots
      --history           Show recorded usage-limit history (hourly snapshots) instead of a live snapshot
  -d, --days=<int>        History window in days (with --history or clients)

EXAMPLES
  # Detailed per-account usage breakdown across all providers
    omp usage
  # Only Anthropic accounts
    omp usage --provider anthropic
  # Redact account identifiers for screenshots
    omp usage --redact
  # Machine-readable output
    omp usage --json
  # Usage-limit trend over the last 30 days
    omp usage --history --days 30
  # Per-client token burn (which machine/app spent what) over the last 30 days
    omp usage clients --days 30
  # Invalidate cached usage reports for all providers
    omp usage invalidate
  # Invalidate cached usage reports for a specific provider
    omp usage invalidate --provider anthropic
```

#### `omp dry-balance`

```
$ omp dry-balance --help

Dry-run OAuth account balancing across random session ids

USAGE
  $ omp dry-balance [MODEL] [FLAGS]

ARGUMENTS
  MODEL   Model selector (provider/model or fuzzy id). Defaults to the configured default model.

FLAGS
      --model=<value>      Model selector (same syntax as --model on omp)
      --count=<int>        Number of random session ids to try
      --concurrency=<int>  Maximum concurrent credential resolutions
      --json               Output JSON
      --bench              Send one live benchmark request per OAuth account

EXAMPLES
  # Dry-run the configured default model with 100 random session ids
    omp dry-balance
  # Dry-run a specific model
    omp dry-balance anthropic/claude-sonnet-4-5
  # Larger run with bounded concurrency
    omp dry-balance --model openai-codex/gpt-5-codex --count 1000 --concurrency 64
  # Benchmark every OAuth account in parallel
    omp dry-balance --bench
  # Machine-readable output
    omp dry-balance --json
```

#### `omp cleanse`

```
$ omp cleanse --help

Detect and fix project diagnostics with weighted parallel subagents

USAGE
  $ omp cleanse [REQUEST] [FLAGS]

ARGUMENTS
  REQUEST   What to detect and fix (e.g. "ts errors"); a discovery agent works out the command

FLAGS
  -n, --agents=<int>   Maximum number of file-disjoint subagents
  -m, --model=<value>  Subagent model selector
  -t, --tests          Also run configured project test suites
  -a, --all            Run every discovered checker without the interactive picker

EXAMPLES
  omp cleanse
  omp cleanse --all
  omp cleanse "ts errors"
  omp cleanse -n 8
  omp cleanse -m opus
  omp cleanse -t
  omp cleanse --agents 12 --model anthropic/claude-opus-4-6
```

#### `omp compress`

```
$ omp compress --help

Rewrite a text file into the dense prompt register, reporting what it drops

USAGE
  $ omp compress FILES... [FLAGS]

ARGUMENTS
  FILES   Files or glob patterns to compress

FLAGS
  -o, --out=<value>    Write the approved text here instead of stdout (single file)
  -i, --inPlace        Overwrite each source file with its approved text
  -r, --rounds=<int>   Maximum drafts per file before giving up
  -n, --agents=<int>   Files compressed concurrently
  -m, --model=<value>  Model selector

EXAMPLES
  omp compress prompts/tools/read.md
  omp compress notes.md -o notes.compressed.md
  omp compress 'src/prompts/**/*.md' -i
  omp compress a.md b.md c.md -i -n 8
  omp compress spec.md -r 5 -m opus
```
