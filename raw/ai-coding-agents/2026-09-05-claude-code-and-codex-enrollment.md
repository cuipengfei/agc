# Claude Code 与 Codex CLI 入列：四源调查 + 双向反向核查

- Source: 本 repo 研究会话（OMP task 三 scout 并行）+ 主会话对本机安装二进制的一手核验
- Collected: 2026-09-05
- Published: Unknown
- 本机参照版本：Claude Code `2.1.261`（`/home/cpf/.bun/install/global/node_modules/@anthropic-ai/claude-code-linux-x64/claude`，206MB）、Codex CLI `codex-cli 0.153.4`（`@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/bin/codex`，258.7MB）
- 采集方式：三个只读 scout（CodexFourLane 四源能力调查、CodexUnique 与 ClaudeCodeUnique 双向 B→A 反向核查），报告原文收录未改写；主会话另做本机 `--help` 抓取与二进制字符串扫描，作为一手 A 侧证据。
- 证据边界：scout 报告内的 `[verified]` 是各 scout 自评，不代表主会话认可其裁定。主会话在末节逐条给出**修正后的裁定**，并说明推翻理由。两个 scout 在「云端任务交接」与「守护进程架构」两条轴上互相宣称对方没有，构成互证性矛盾，已在末节裁决。
- scout 报告中出现的 Hermes Agent、Deep Agents Code、gajae-code、Cursor 均**不在本仓 19 家名单内**，仅作旁证。


## worker 报告原文：Codex CLI 四源能力调查（CodexFourLane）
- scout 自述架构摘要：Rust workspace (codex-rs/) with 80+ crates. Key crates: codex-cli (multitool entrypoint), codex-core (agent engine), codex-tui (interactive UI), codex-exec (headless/CI mode), codex-app-server (JSON-RPC IDE server), codex-config (TOML schema), codex-apply-patch (patch tool), codex-hooks (lifecycle hooks), codex-rollout (session persistence), codex-linux-sandbox (Landlock/seccomp), codex-sandboxing (Seatbelt), codex-mcp-server / rmcp-client (MCP), codex-tools (tool specs), codex-skills / ext/skills (skills system). CLI dispatches via clap::Parser to subcommands (exec, tui, mcp, mcp-server, login, etc.).

## OpenAI Codex CLI

### Lane 1: context7
- Library ID `/openai/codex` resolved with **2153 code snippets**, Source Reputation **High**, Benchmark Score **79.38**. Available versions include `rust_v0_29_1_alpha_7` and `rust-v0.75.0`; no exact match for 0.153.4. [grade: verified — context7 resolve-library-id + query-docs]
- `~/.codex/config.toml` primary schema (`ConfigToml`) contains keys: `model`, `review_model`, `model_provider`, `model_context_window`, `model_auto_compact_token_limit`, `approval_policy`, `approvals_reviewer`, `sandbox_mode`, `sandbox_workspace_write`, `default_permissions`, `permissions`, `mcp_servers`, `mcp_oauth_credentials_store`, `model_providers`, `skills`, `plugins`, `marketplaces`, `hooks`, `features`, `profiles`, `history`, `web_search`, `tools`, `agents`, `memories`, `project_doc_fallback_filenames`, `allow_login_shell`, `notify`, `instructions`, `developer_instructions`, `include_permissions_instructions`, `include_apps_instructions`, `include_collaboration_mode_instructions`, `include_environment_context`, `model_instructions_file`, `compact_prompt`, `experimental_use_unified_exec_tool`, `oss_provider`, `service_tier`, `personality`, `sqlite_home`, `log_dir`, `debug`, `file_opener`, `tui`, `hide_agent_reasoning`, `show_raw_agent_reasoning`, `model_reasoning_effort`, `plan_mode_reasoning_effort`, `model_reasoning_summary`, `model_verbosity`, `model_catalog_json`, `chatgpt_base_url`, `openai_base_url`, `experimental_realtime_ws_base_url`, `experimental_realtime_webrtc_call_base_url`, `experimental_realtime_ws_model`, `realtime`, `experimental_thread_config_endpoint`, `experimental_thread_store`, `projects`, `check_for_update_on_startup`, `disable_paste_burst`, `analytics`, `feedback`, `apps`, `desktop`, `otel`, `windows`, `notice`, `experimental_compact_prompt_file`. [grade: verified — direct read of codex-rs/config/src/config_toml.rs via context7 query-docs + GitHub raw]
- Sandbox presets: `Sandbox.read_only`, `Sandbox.workspace_write`, `Sandbox.full_access`. [grade: verified — context7 query-docs, SDK Python docs]
- Thread start parameters include `historyMode` (`"paginated"` / `"legacy"`), `sandbox`, `permissions`, `environments`, `selectedCapabilityRoots`, `sessionStartSource` (`"clear"` vs `"startup"`). [grade: verified — context7 query-docs, app-server README]
- Hooks inline TOML config example shows `[[PreToolUse]]` with `matcher = "^Bash$"`, handler `type = "command"` or `type = "mcp_tool"`, plus `command_windows`, `timeout`, `statusMessage`, `additionalContextLimit`. [grade: verified — context7 query-docs, hooks_tests.rs]
- `Stop` and `UserPromptSubmit` events bypass matcher evaluation (`=> true`); all other 10 events evaluate regex matchers. [grade: verified — direct read of codex-rs/hooks/src/engine/dispatcher.rs via context7]
- `apply_patch` format uses `*** Begin Patch` / `*** End Patch` envelope with `*** Add File:`, `*** Update File:`, `*** Delete File:` headers; new lines prefixed with `+`. [grade: verified — context7 query-docs, core prompt fixtures]
- `ToolSpec` enum defines `web_search` as a built-in Responses API tool with `external_web_access`, `indexed_web_access`, `filters`, `user_location`, `search_context_size`, `search_content_types`. [grade: verified — direct read of codex-rs/tools/src/tool_spec.rs via context7]
- Python SDK input types: `TextInput`, `ImageInput` (URL), `LocalImageInput` (path), `SkillInput`, `MentionInput`. [grade: verified — context7 query-docs, SDK Python docs]
- Subagent model override logic (`apply_requested_spawn_agent_model_overrides`) only overrides `model` and `reasoning_effort`, **never** `model_provider`. [grade: verified — direct read of codex-rs/core/src/tools/handlers/multi_agents_common.rs via context7]

### Lane 2: DeepWiki
- **Architecture / crate layout**: `codex-cli` is the multitool binary using `clap::Parser`. `codex-core` provides the central agent engine. `codex-tui` handles interactive UI. `codex-exec` handles headless execution. `codex-config` manages TOML loading. `codex-app-server` provides JSON-RPC server for IDE integrations. Workspace uses root `Cargo.toml` with `workspace = true` dependency inheritance. [grade: verified — DeepWiki ask_question on architecture]
- **Agent loop**: Async `Op`/`Event` pattern. `CodexThread::submit()` enqueues `Op` (UserInput, InterAgentCommunication, Interrupt). Events consumed via `SessionIo` receiver (AgentMessageContentDelta, TurnStartedEvent, TurnCompleteEvent). `submission_loop` processes sequentially, managing `ActiveTurn` states. [grade: verified — DeepWiki ask_question on agent loop]
- **Session persistence**: Rollout files in JSONL at `~/.codex/sessions/YYYY/MM/DD/rollout-TIMESTAMP-UUID.jsonl`. Each line is a `RolloutLine` wrapping `RolloutItem` (ResponseItem, EventMsg, SessionMeta, TurnContext). `RolloutRecorder` uses background `RolloutWriterTask` via `RolloutCmd` channel (AddItems, Persist, Flush, Shutdown). Metadata indexed in SQLite (`state_5.sqlite`) via `StateRuntime`. Resume via `thread/resume` or `thread/fork`; `reconstruct_history_from_rollout` rebuilds history. Compressed rollouts materialized back to plain JSONL on resume. [grade: verified — DeepWiki ask_question on session persistence]
- **Sandboxing / approval**: macOS uses Seatbelt (`sandbox-exec`) with dynamically generated SBPL from `PermissionProfile`; sensitive dirs `.git`/`.codex` kept read-only. Linux uses Bubblewrap (`bwrap`) as default filesystem sandbox with `--bind` for writable roots, plus seccomp and `no_new_privs`; Landlock is a legacy fallback (`use_legacy_landlock`). Approval states: `ExecApprovalRequirement` enum — `Skip`, `NeedsApproval`, `Forbidden`. Calculated by `ToolOrchestrator`. [grade: verified — DeepWiki ask_question on sandbox + direct read of landlock.rs]
- **AGENTS.md**: Discovered by walking from project root (`.git` marker) to CWD. `AGENTS.override.md` preferred over `AGENTS.md` in same directory. Contents concatenated with `--- project-doc ---` separator. `AgentsMdManager` caches and refreshes on environment/trust changes. Deeper nested files take precedence. [grade: verified — DeepWiki ask_question on AGENTS.md]
- **MCP**: Client mode: `codex mcp` subcommand (list, add, login, logout); `McpConnectionSet` aggregates tools as `mcp__servername__toolname`. Server mode: `codex mcp-server` exposes JSON-RPC over MCP transport for thread/turn/account/config/approval control. [grade: verified — DeepWiki ask_question on MCP]
- **Hooks / extension points**: 12 event types: SessionStart, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, SessionEnd, SubagentStart, SubagentStop, Stop, Interrupt. Dispatched by `ClaudeHooksEngine`. Discovery scans User/Project/System config layers and plugins. `execute_handlers` calls `run_command` for external processes. Outcome structs per event (e.g., `PreToolUseOutcome`). Configurable in `hooks.json` or `[hooks]` inline TOML. [grade: verified — DeepWiki ask_question on hooks + direct read of hooks/src/lib.rs]
- **Exec mode**: `codex exec` runs headless. `run_main` parses `Cli`, loads config, initializes `InProcessAppServerClient`. Output modes: `EventProcessorWithHumanOutput` (ANSI to stderr) or `EventProcessorWithJsonOutput` (`--json`, JSONL to stdout). Args: `prompt`, `--image`/`-i`, `--model`, `--output-schema`, `--json`, `--output-last-message`/`-o`, `--ephemeral`, `--worktree`, `--auto-review`/`--approve-for-me`, `--dangerously-bypass-approvals-and-sandbox`. Subcommands: `resume`, `fork`, `review`. [grade: verified — DeepWiki ask_question on exec]
- **Skills / subagents**: Skills defined by `SKILL.md` with YAML frontmatter in `.codex/skills/` or `.agents/skills/`. `SkillProviders` load from host filesystem (`HostSkillProvider`). `SkillsExtension` manages registry. Subagents spawned via `spawnAgent` tool; inherit parent model by default; `model` field only set on explicit user request. [grade: verified — DeepWiki ask_question on skills/subagents]

### Lane 3: Web
- Hooks first shipped in **v0.114** (March 2026), expanded to PreToolUse/PostToolUse in **v0.117.0**, UserPromptSubmit in PR #14626 (March 2026), promoted to stable in **v0.124.0** (April 2026). Inline `[hooks.]` tables in `config.toml` now supported alongside `hooks.json`. [grade: single-source — community blog / DEV article, not official changelog]
- Hooks **do not fire** for `apply_patch` or MCP tool calls in current builds; `PreToolUse` only covers shell tool (`Bash`). `deny` is the only reliably actionable decision; `allow`/`ask`/`updatedInput` are parsed but rejected by Codex today. [grade: single-source — agenticcontrolplane.com blog, symposium.dev reference; note: this is a limitation claim that may be version-specific]
- `codex exec --full-auto` suppresses per-step approval but **keeps hooks firing**, unlike Claude Code `--dangerously-skip-permissions` which disables hooks entirely. [grade: single-source — agenticcontrolplane.com blog]
- CLI version progression: `0.96.0` (Feb 2026) introduced Thread Compact API & Unified Exec. `0.132.0`–`0.135.0` shipped in late May 2026. `0.145.0` (July 2026) added paginated history, Bedrock, audio I/O, multi-agent V2 stabilization. `0.146.0` added session management, agent plugins, thread forking. `0.151.0` added new app approval modes. `0.152.0` added Vim mode enhancements. Latest cited: `0.153.0-alpha.2` (Sep 2026, changelogs.directory). [grade: single-source — third-party changelog aggregators; version 0.153.4 not explicitly found in public search results]
- Cloud/desktop features (Codex Cloud, Codex Desktop App, CoCo) are **separate from the CLI** and should not be conflated with `codex-rs` mechanisms. [grade: verified — multiple web sources distinguish CLI vs cloud]
- Web search tool mode controlled by `web_search` config key: `disabled`, `cached`, `indexed`, `live`. [grade: single-source — web blog / unofficial guide]
- Profiles in `config.toml` bundle provider + model + reasoning effort + sandbox: e.g. `[profiles.codex-fast] model = "openai/gpt-5.3-codex" model_provider = "ofox" model_reasoning_effort = "low"`. [grade: single-source — ofox.ai blog]
- Skills, subagents, hooks, MCP, and AGENTS.md are documented as a combined extensibility pattern in community guides. [grade: single-source — community blog]

### Lane 4: Code
- **Workspace members count**: 80+ crates in `codex-rs/Cargo.toml` including `apply-patch`, `hooks`, `linux-sandbox`, `mcp-server`, `rmcp-client`, `rollout`, `skills`, `tools`, `tui`, `exec`, `app-server`, `config`, `core`, `protocol`, `state`, `thread-store`, `cloud-tasks`, `cloud-tasks-client`, `ext/agent`, `ext/skills`, `ext/mcp`, `ext/web-search`, `ext/goal`, `ext/queue`, `ext/memories`, `guardian-v2`, `guardian-context`, `execpolicy`, `shell-command`, `shell-escalation`, `process-hardening`, `network-proxy`, `responses-api-proxy`, `model-provider`, `models-manager`, `ollama`, `lmstudio`, `codex-mcp`, `feedback`, `features`, `install-context`, `analytics`, `history`, `secrets`, `http-client`, `websocket-client`, `otel`, `realtime-webrtc`, `voice-host`, `v8-poc`, `worktree`, `workload-identity`, `bwrap`, `stdio-to-uds`, `windows-sandbox-service`, `mxc-sandbox`. [grade: verified — direct read of codex-rs/Cargo.toml]
- **apply-patch crate** (`codex-rs/apply-patch/src/lib.rs`): Exports `parse_patch`, `StreamingPatchParser`, `ApplyPatchFileUpdateMode` (`NormalizeToLf` / `PreserveLineEndings`), `ApplyPatchArgs`, `ApplyPatchAction`, `AppliedPatchDelta`. Self-invokes via `CODEX_CORE_APPLY_PATCH_ARG1` (`--codex-run-as-apply-patch`). Uses `codex-exec-server` filesystem sandbox context. [grade: verified — direct read]
- **Hooks crate** (`codex-rs/hooks/src/lib.rs`): Defines `HOOK_EVENT_NAMES` array of 12 strings and `HOOK_EVENT_NAMES_WITH_MATCHERS` array of 9 strings. Exports per-event outcome/request types (`PreToolUseOutcome`, `PostToolUseOutcome`, `UserPromptSubmitOutcome`, `SessionStartOutcome`, `SessionEndOutcome`, `StopOutcome`, `InterruptOutcome`, `PreCompactOutcome`, `PostCompactOutcome`, `PermissionRequestOutcome`). Hook state keys formatted as `{source}:{event_key}:{group_index}:{handler_index}`. [grade: verified — direct read]
- **Exec mode entrypoint** (`codex-rs/exec/src/main.rs`): `TopCli` flattens `CliConfigOverrides` and `Cli`; calls `run_main(inner, arg0_paths).await`. Also handles arg0 dispatch to `codex-linux-sandbox` binary. [grade: verified — direct read]
- **ToolSpec** (`codex-rs/tools/src/tool_spec.rs`): `ToolSpec` enum with variants `Function`, `Namespace`, `ToolSearch`, `WebSearch`, `Freeform`. `WebSearch` serializes as `{"type":"web_search"}` with `external_web_access`, `indexed_web_access`, `filters`, `user_location`, `search_context_size`, `search_content_types`. [grade: verified — direct read]
- **Linux sandbox** (`codex-rs/linux-sandbox/src/landlock.rs`): `apply_permission_profile_to_current_thread` sets `PR_SET_NO_NEW_PRIVS`, installs network seccomp filter (`install_network_seccomp_filter_on_current_thread`), and optionally installs Landlock filesystem rules. Seccomp denies `ptrace`, `process_vm_readv/writev`, `io_uring_*`, and network syscalls (`connect`, `accept`, `bind`, `listen`, `sendto`, `socket` except `AF_UNIX`). Two network seccomp modes: `Restricted` and `ProxyRouted`. [grade: verified — direct read]
- **Rollout recorder** (`codex-rs/rollout/src/recorder.rs`): `RolloutRecorder` struct with `tx: Sender<RolloutCmd>` and `writer_task: Arc<RolloutWriterTask>`. Commands: `AddItems(Vec<RolloutItem>)`, `Persist { ack }`, `Flush { ack }`, `Shutdown { ack }`. Rollouts stored in `~/.codex/sessions/` with optional compression; `thread/revert` creates new immutable rollout file with `rollout_id_override`. Metadata extracted via `apply_rollout_item` into SQLite. [grade: verified — direct read]
- **Config profiles**: `ConfigProfile` imported from `profile_toml` into `ConfigToml`. `profile` key selects from `profiles` HashMap. [grade: verified — direct read of config_toml.rs lines 1-50]
- **Approval policy**: `approval_policy` field typed as `Option<AskForApproval>` in `ConfigToml`. [grade: verified — direct read]
- **grep.app failures**: All four grep.app queries returned "No results found" for `repo:openai/codex` scoped searches, including simple queries for `apply_patch` and `sandbox`. This prevented code-search lane from surfacing additional file paths via grep.app. [grade: verified — tool output logs]

### Reverse-Check Verdicts (vs 17-project roster)
- **Rust workspace with 80+ specialized crates** — VERDICT: 真独有 (no other agent in the roster uses an 80-crate Rust workspace with this granularity). [grade: verified — source read of Cargo.toml]
- **`apply_patch` custom simplified diff format with standalone arg0-dispatch executable** — VERDICT: 同轴不同实现 (Claude Code, OMP, aider all have file-editing tools; none use this exact `*** Begin Patch` envelope format or arg0-dispatch crate architecture). [grade: verified — source read]
- **12-event hook system (`ClaudeHooksEngine`) with PreToolUse/PostToolUse/SubagentStart/SubagentStop/PreCompact/PostCompact** — VERDICT: 同轴不同实现 (Claude Code has hooks with similar event names; OMP has TTSR regex interrupt which is functionally different; DSH has Cordis plugin system; goose has MCP extensions). Competitors with hooks: Claude Code. Competitors without: OMP (TTSR instead), aider, openinterpreter, jcode, Prime Agent. [grade: single-source — source shows engine named "ClaudeHooksEngine", implying shared lineage with Claude Code]
- **macOS Seatbelt (`sandbox-exec`) + Linux Bubblewrap+seccomp + Windows restricted tokens, all with unified `PermissionProfile` abstraction** — VERDICT: 同轴不同实现 (Claude Code uses Seatbelt on macOS but no Linux sandbox by default; OMP has sandbox via disabledProviders; aider/goose have no comparable OS-level sandbox). [grade: verified — source read + DeepWiki]
- **MCP both client AND server mode (`codex mcp-server` JSON-RPC)** — VERDICT: 同轴不同实现 (OMP has MCP client support; Claude Code has MCP client; none in roster expose a full MCP server mode for external IDE control). [grade: verified — source + DeepWiki]
- **Rollout JSONL persistence with background writer task + SQLite metadata index (`state_5.sqlite`)** — VERDICT: 真独有 (no other roster agent uses this specific JSONL rollout + SQLite hybrid persistence). [grade: verified — source read]
- **`AGENTS.md` discovery with root-to-CWD walk, `AGENTS.override.md` precedence, and `--- project-doc ---` concatenation** — VERDICT: 同轴不同实现 (Claude Code uses `CLAUDE.md`; OMP uses `SKILL.md` and `CLAUDE.md` depending on provider; aider uses `.aider.conf.yml` + conventions; none use this exact override+concatenation logic). [grade: verified — source + DeepWiki]
- **`codex exec` headless mode with `--json` JSONL output, `--output-schema`, `--full-auto`, resume/fork/review subcommands** — VERDICT: 同轴不同实现 (Claude Code has `claude -p` non-interactive; OMP has task/hub and vibe mode; aider has `--message`; none have the exact `--json` event-stream + subcommand suite). [grade: verified — source + DeepWiki]
- **Profiles as named `ConfigProfile` bundles in `config.toml`** — VERDICT: 功能等价 (OpenInterpreter has profiles; Claude Code has project configs; OMP has config.yml roles; all achieve similar multi-config switching). [grade: single-source — web blog + source read]
- **Web search as built-in Responses API `ToolSpec::WebSearch`** — VERDICT: 功能等价 (Claude Code has web search via MCP; OMP can add web-search MCP; Grok Build has native web access; most can achieve similar capability via MCP or tool). [grade: verified — source read]
- **Image input via `LocalImageInput` / `--image` CLI flag** — VERDICT: 功能等价 (Claude Code supports image input; OMP supports image context; most frontier-model agents support vision). [grade: verified — source read + SDK docs]
- **Skills system with `SKILL.md` + YAML frontmatter in `.codex/skills/`** — VERDICT: 同轴不同实现 (OMP has SKILL.md in `.agents/skills/`; Claude Code has `.claude/skills/` in newer versions; the concept is shared but directory conventions differ). [grade: verified — source + DeepWiki]
- **Subagent delegation via `spawn_agent` tool with model inheritance and multi-agent V2** — VERDICT: 同轴不同实现 (OMP has task/hub batch dispatch with explicit agent roles; Claude Code has subagent spawning; DSH has multi-agent workflows; Codex's model-override-within-same-provider constraint is distinctive). [grade: verified — source read]
- **`model_provider` routing with extensible `model_providers` map (OpenAI, Bedrock, Ollama, LMStudio, plus custom)** — VERDICT: 同轴不同实现 (Claude Code is Anthropic-only; OMP supports multiple providers via config; OpenCode has Zen provider; Prime Agent has provider configs; Codex's native Bedrock/Ollama/LMStudio support is more built-in than most). [grade: verified — source read + web]
- **Compaction with `PreCompact`/`PostCompact` hooks and `model_auto_compact_token_limit`** — VERDICT: 同轴不同实现 (OMP has compaction via snapcompact/text-as-image; Claude Code has context compaction; Codex's hook-integrated compaction is distinctive). [grade: single-source — web + source read of hooks events]

### What Could NOT Be Confirmed
- Exact `0.153.4` version match: Most evidence comes from `main` branch GitHub source and DeepWiki/context7 indexes that may reflect newer commits. No official release notes for `0.153.4` specifically were found in public search. [grade: n/a]
- Whether `apply_patch` currently fires `PreToolUse` hooks: Community sources claim it does not; source code shows `PreToolUse` matcher filters on `tool_name` and only `Bash` is documented as emitted, but the hook infrastructure supports arbitrary tool names in matchers. [grade: n/a — version-dependent behavior]
- Whether `updatedInput`/`allow` decisions in hooks actually work: Community blogs claim only `deny` is reliably actionable in current builds. [grade: n/a — version-dependent behavior]
- `seatbelt.rs` exact path: Direct read of `codex-rs/core/src/seatbelt.rs` returned 404; actual Seatbelt logic confirmed in `codex-rs/sandboxing/src/` via DeepWiki but exact file not read. [grade: n/a]
- grep.app for `openai/codex`: All queries returned zero results, preventing supplemental code-search verification. [grade: n/a — tool failure reported]

## worker 报告原文：Codex CLI 独有性反向核查（CodexUnique）
- scout 自述架构摘要：OpenAI Codex CLI v0.153.4 is a Rust-based multitool dispatcher (codex-rs) with a clap-based CLI. It wraps a native platform binary that runs a shared local app-server daemon (SQLite+JSONL persistence, WebSocket attachable TUI), non-interactive exec mode, MCP server mode, first-party sandboxing (Linux: bubblewrap/Landlock/seccomp; macOS: Seatbelt), a declarative Starlark execpolicy engine, hook trust by hash, and first-party cloud task handoff.

## OpenAI Codex CLI (v0.153.4)

### 1. execpolicy `.rules` files — declarative command-execution policy DSL
- Codex ships a declarative, Starlark-based rules engine in `codex-rs/execpolicy` (source: `codex-rs/execpolicy/src/rule.rs`, `policy.rs`). Rules use `prefix_rule(pattern=[...], decision="allow|prompt|forbidden", justification=..., match=..., not_match=...)` and are evaluated with precedence `forbidden > prompt > allow`. Files live in `~/.codex/rules/default.rules` and project `.codex/` layers. A CLI `codex execpolicy check` can test commands against policy. [verified: official docs + source code]
- Competitors probed: **OMP** (TTSR is regex-based mid-stream injection into the model stream, not a command prefix policy; no execpolicy DSL) [verified]; **Claude Code** (`allowedTools`/`disallowedTools` are flat string lists, not a predicate DSL; no `.rules` files) [verified]; **DSH** (`ctx.sandbox` provides per-call runtime confinement, not a declarative command-prefix rule language) [verified]; **goose** (permission modes: Completely Autonomous/Manual Approval/Smart Approval/Chat; no file-based prefix rules) [verified]; **crush** (permission levels 1-4, `allowed_tools`/`disabled_tools` in crush.json; no predicate DSL) [verified]; **Reasonix** (reasonix.toml config-driven; no prefix-rule engine) [single-source]; **Codewhale** (`constitution.json` with sandbox modes; no prefix-rule DSL) [single-source].
- VERDICT: **真独有** — no probed competitor has a declarative Starlark command-prefix policy engine with inline unit tests (`match`/`not_match`) and host-executable constraints.

### 2. Hook trust persistence (hash-based)
- Codex hooks require explicit trust before running. Trust is persisted per-hook by hash; new or changed hooks are skipped until reviewed via `/hooks`. Managed hooks (system/MDM/cloud/requirements.toml) are trusted by policy and cannot be disabled from the user hook browser. The flag `--dangerously-bypass-hook-trust` bypasses this for one invocation. [verified: official docs + source code]
- Competitors probed: **Claude Code** (has hooks but no documented hash-based trust persistence; hooks run once configured without a review gate) [verified]; **OMP** (has `hooks.json`; no evidence of hash-based trust persistence) [verified]; **crush** (has hooks via crush-hook skill; no hash-based trust; composition is config-order based) [verified]; **DSH** (plugin-based hooks/events; no hash-based trust mechanism) [verified]; **OpenCode** (no documented hook trust persistence) [verified]; **goose** (no hooks system; extensions are MCP servers) [verified].
- VERDICT: **真独有** — no probed competitor implements hash-based hook trust with managed-vs-non-managed distinction and a dedicated bypass flag.

### 3. `codex sandbox` as a standalone top-level subcommand
- `codex sandbox [OPTIONS] [COMMAND]...` exposes the agent’s OS-level sandbox as a general-purpose tool for arbitrary user commands. Supports `--sandbox-state-json`, `--sandbox-state-readable-root`, and `--sandbox-state-disable-network`. [verified: local CLI help]
- Competitors probed: **Claude Code** (`/sandbox` is a TUI panel/status page for sandbox configuration; no `claude sandbox <command>` subcommand to run arbitrary commands inside the sandbox) [verified]; **OMP** (optional sandbox extension exists; no `omp sandbox` standalone subcommand) [verified]; **DSH** (`ctx.sandbox.confine()` is internal API; not exposed as a standalone CLI) [verified]; **OpenCode** (no `opencode sandbox` subcommand) [verified]; **goose** (no standalone sandbox subcommand) [verified]; **crush** (no standalone sandbox subcommand) [verified]; **aider** (no sandboxing at all) [verified]; **openinterpreter** (optional OpenSandbox backend; no standalone CLI subcommand) [verified].
- VERDICT: **真独有** — no probed competitor exposes their agent sandbox as a standalone CLI subcommand for arbitrary user commands.

### 4. app-server daemon architecture (shared local daemon + remote attach + queue)
- Codex runs a shared local app-server daemon (`codex app-server daemon`) that holds all sessions. The TUI can attach remotely via `--remote ws://|wss://|unix://` with bearer-token auth (`--remote-auth-token-env`). `codex agents` browses all sessions on the daemon. `codex remote-control start/stop/pair` manages the daemon. `codex queue --thread <UUID> --message <TEXT>` injects messages into an existing session from outside the session. [verified: local CLI help + docs]
- Competitors probed: **Claude Code** (has `--bg`, `claude agents`, `claude attach`, `claude remote-control`, and a supervisor daemon; however, bg sessions are separate worker processes, not a unified shared daemon that all sessions live inside; no `claude queue` command to inject messages into existing sessions) [verified]; **OMP** (has ACP/RPC concepts; no shared local app-server daemon with WebSocket attachable TUI and queue) [verified]; **OpenCode** (`opencode serve` is a headless HTTP API server for the client; not a shared daemon holding agent sessions with queue injection) [verified]; **DSH** (web UI profile has WebSocket connections; remote access is via third-party plugins; no unified local daemon with queue) [verified]; **goose** (no daemon architecture) [verified]; **crush** (no daemon architecture) [verified].
- VERDICT: **真独有** — the combination of a shared local daemon holding all sessions, WebSocket TUI attach with bearer auth, and an external `queue` command to inject messages into existing sessions is not replicated by any probed competitor. Claude Code has the most similar surface (bg/agents/attach/remote-control) but uses a supervisor-worker model, not a unified app-server.

### 5. `exec --output-schema <FILE>` — JSON Schema for final response
- In non-interactive exec mode, Codex can validate the model’s final response against a user-supplied JSON Schema file (`--output-schema <FILE>`). [verified: local CLI help]
- Competitors probed: **Claude Code** (has `--json-schema` used with `--output-format json` in print mode; validates structured output against JSON Schema) [verified].
- VERDICT: **同轴不同实现** — Claude Code has functionally equivalent `--json-schema`. Both constrain model final output with JSON Schema in non-interactive mode. Shipping order uncertain without exact release dates.

### 6. `--approve-for-me` — automated approval review via sandbox
- `codex exec --approve-for-me` routes approval requests through automatic review using the workspace-write sandbox, i.e. an internal automated reviewer answers approval prompts instead of the human. [verified: local CLI help]
- Competitors probed: **Claude Code** (`--permission-prompt-tool` routes permission prompts to an external MCP tool for automated handling; different implementation, same goal) [verified]; **goose** (Smart Approval mode automates some approvals based on risk; no sandbox-based automated reviewer) [verified]; **crush** (YOLO mode skips all prompts; not an automated reviewer) [verified]; **DSH** (has sandbox policy and approval flows; no `--approve-for-me` equivalent) [verified].
- VERDICT: **同轴不同实现** — Claude Code’s `--permission-prompt-tool` achieves the same goal (automated permission handling) by routing to an external MCP tool; Codex uses internal workspace-write sandbox review.

### 7. Config profile layering (`-p/--profile`) + `--strict-config` + feature flags
- Codex supports `-p/--profile <NAME>` to layer `$CODEX_HOME/<name>.config.toml` on top of the base user config. `--strict-config` errors on unrecognized fields. `--enable`/`--disable` toggle feature flags. [verified: local CLI help]
- Competitors probed: **OMP** (named profiles via `OMP_PROFILE` relocate config under `~/.omp/profiles/<profile>/`; comprehensive scope across auth, sessions, caches, tools, MCP, etc.; functionally equivalent layering) [verified]; **goose** (has `profiles.yaml` under `~/.config/goose` for configuration profiles) [verified]; **Claude Code** (has `--settings`/`--setting-sources`; no named profile file layering) [verified]; **OpenCode** (config layering exists: global, project, remote, env; no named profile files) [verified]; **crush** (`.crushrc` and crush.json; no named profile layering) [verified].
- VERDICT: **同轴不同实现** — OMP and goose both have named config profiles that layer on top of base config. The exact mechanism differs (TOML file vs YAML/JSON), but the capability is present.

### 8. `--ephemeral` (no session persistence)
- `codex exec --ephemeral` runs without persisting session files to disk. [verified: local CLI help]
- Competitors probed: **Claude Code** (has `--no-session-persistence` flag and `CLAUDE_CODE_SKIP_PROMPT_HISTORY` env var for ephemeral non-interactive runs) [verified]; **OMP** (no documented ephemeral flag) [verified]; **OpenCode** (no documented ephemeral mode) [verified]; **DSH** (no documented ephemeral mode) [verified]; **goose** (no documented ephemeral mode) [verified].
- VERDICT: **同轴不同实现** — Claude Code has functionally equivalent `--no-session-persistence`.

### 9. `migrate-rollouts` — legacy-to-paginated session migration tool
- `codex migrate-rollouts` inspects or migrates legacy local sessions (JSONL rollouts) to paginated thread history (SQLite-backed). This is a migration tool for Codex's own storage format evolution. [verified: local CLI help]
- Competitors probed: **Claude Code** (no equivalent legacy-session migration tool documented) [verified]; **OMP** (no equivalent migration tool) [verified]; **OpenCode** (no equivalent) [verified]; **DSH** (no equivalent) [verified]; **goose** (no equivalent) [verified].
- VERDICT: **真独有** — no probed competitor ships a dedicated CLI tool for migrating legacy session storage to a paginated thread history format.

### 10. `codex cloud` — first-party CLI→cloud task handoff
- `codex cloud exec/status/list/apply/diff` provides a first-party CLI-to-cloud task pipeline: submit tasks to Codex Cloud, check status, list tasks, and apply resulting diffs locally. [verified: local CLI help + docs]
- Competitors probed: **Claude Code** (`claude ultrareview` is a cloud-based multi-agent code review, but it is review-specific, not a general task submission pipeline; no `claude cloud exec` for arbitrary tasks) [verified]; **OpenCode** (no cloud task handoff) [verified]; **OMP** (no cloud task handoff) [verified]; **DSH** (no cloud task handoff) [verified]; **goose** (no cloud task handoff) [verified]; **crush** (no cloud task handoff) [verified].
- VERDICT: **真独有** — no probed competitor has a first-party CLI→cloud task handoff for general agent tasks (as opposed to review-only cloud features).

### 11. `codex review` — first-party non-interactive review subcommand
- `codex review` is a dedicated top-level subcommand for non-interactive code review with presets: uncommitted changes, base-branch comparison, specific commit, or custom instructions. [verified: local CLI help]
- Competitors probed: **Claude Code** (has `/review`, `/code-review`, and `claude ultrareview`; review capabilities exist but are not a single dedicated `review` subcommand with these presets) [verified]; **OpenCode** (no dedicated review subcommand) [verified]; **OMP** (no dedicated review subcommand) [verified]; **DSH** (no dedicated review subcommand) [verified]; **goose** (no dedicated review subcommand) [verified]; **crush** (no dedicated review subcommand) [verified].
- VERDICT: **真独有** — while Claude Code has review capabilities, no competitor has a dedicated top-level `review` subcommand with uncommitted/base-branch/commit/custom presets designed for CI integration.

### 12. `queue` — inject message into existing session from outside
- `codex queue --thread <THREAD> --message <TEXT>` queues a message for an existing session without entering the session. [verified: local CLI help]
- Competitors probed: **Claude Code** (`claude --bg` starts background sessions; `claude attach` enters them; no command to inject a message into a running session without attaching) [verified]; **OMP** (no `omp queue` command) [verified]; **OpenCode** (no `opencode queue` command) [verified]; **DSH** (no queue command for existing sessions) [verified]; **goose** (no queue command) [verified]; **crush** (no queue command) [verified].
- VERDICT: **真独有** — no probed competitor has a CLI command to asynchronously inject messages into an existing running session.

### 13. First-party OS-level sandboxing as default (Landlock/seccomp/Seatbelt/Bubblewrap)
- Codex defaults to OS-level sandboxing: Linux uses bubblewrap (modern) with Landlock fallback, seccomp network filters, PR_SET_NO_NEW_PRIVS, fresh /proc, read-only root, and a managed proxy mode (TCP→UDS→TCP bridge). macOS uses Seatbelt (sandbox-exec). [verified: multiple sources]
- Competitors probed: **Claude Code** (first-party default OS-level sandboxing: macOS Seatbelt, Linux/WSL2 bubblewrap + seccomp; functionally equivalent) [verified]; **DSH** (has `ctx.sandbox` with Linux bwrap/Landlock and macOS Seatbelt backends; sandbox is a core plugin, effectively first-party) [verified]; **OpenCode** (no built-in sandbox by default; experimental macOS sandboxing added via third-party PR/plugin) [verified]; **goose** (macOS sandboxing added via PR; not a cross-platform first-party default) [verified]; **crush** (no sandboxing by default) [verified]; **aider** (no built-in sandboxing) [verified]; **openinterpreter** (optional OpenSandbox backend) [verified]; **CodeWhale** (claims Seatbelt on macOS, bubblewrap on Linux) [single-source]; **Reasonix** (claims sandboxed per-turn actions) [single-source].
- VERDICT: **同轴不同实现** — Claude Code and DSH both ship first-party OS-level sandboxing with similar primitives (Seatbelt, bubblewrap, seccomp). Codex’s dual pipeline (bubblewrap modern + Landlock legacy) and managed proxy mode are specific implementation details, not a unique capability.

---

## Survivors (still plausibly 真独有 or 未知)

| # | Mechanism | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | execpolicy `.rules` files (Starlark DSL with prefix_rule, match/not_match, host_executable) | **真独有** | [verified] |
| 2 | Hook trust persistence (hash-based, managed/non-managed, `--dangerously-bypass-hook-trust`) | **真独有** | [verified] |
| 3 | `codex sandbox` standalone subcommand for arbitrary commands | **真独有** | [verified] |
| 4 | app-server daemon architecture (shared daemon + WebSocket attach + bearer auth + `queue`) | **真独有** | [verified] |
| 9 | `migrate-rollouts` legacy-to-paginated session migration | **真独有** | [verified] |
| 10 | `codex cloud` first-party CLI→cloud general task handoff | **真独有** | [verified] |
| 11 | `codex review` dedicated non-interactive review subcommand with presets | **真独有** | [verified] |
| 12 | `queue` message injection into existing sessions | **真独有** | [verified] |

## worker 报告原文：Claude Code 独有性反向核查（ClaudeCodeUnique）
- scout 自述架构摘要：Claude Code 2.1.261 distinctive mechanisms, B-first enumerated and reverse-checked against 17-project roster. Evidence sourced from Anthropic official docs (code.claude.com), leaked source derivatives (OpenClaude), clean-room reimplementation (claurst), and competitor repositories via Firecrawl developer search.

## Claude Code — Reverse-Check Report (17-project roster)

### Method
- **B-first enumeration** from `claude --help` 2.1.261 (confirmed by Main) + official docs + leaked source evidence.
- **Reverse-check** via Firecrawl developer search against: OMP, DSH, jcode, Prime Agent, OpenCode, OMO, OpenClaude, Grok Build, claurst, DeepSeek-Reasonix, Codewhale, crush, goose, openinterpreter, aider, Codex CLI.
- Evidence grades: `[verified]` = 2+ independent sources or direct source code; `[single-source]` = 1 source only; `未在已查材料中找到` = searched, found nothing.
- Derivative note: OpenClaude runs leaked Claude Code source; claurst is clean-room Rust reimplementation. Both are "originated here, cloned downstream" rather than independent arrivals.

---

## 1. `--system-prompt-snapshot on|off`
**What:** Records the system prompt once per conversation and reuses it verbatim on every request and resume. An existing record is sent as-is, so a later launch's different `--system-prompt` is ignored until compaction. This is deliberate prompt-cache byte-stability.

**Competitors probed:** DeepSeek-Reasonix, DSH, OMP, Codewhale, Hermes Agent, OpenCode, Codex CLI, claurst, OpenClaude.

**Evidence:**
- DeepSeek-Reasonix has `StaticPromptCache` that snapshots system prompt at session creation and never re-reads from disk mid-session `[verified]`. However, Reasonix does NOT have the "record once per conversation and ignore later `--system-prompt` until compaction" semantic.
- Hermes Agent has cross-session 1h prefix cache with stable system prefix block, but no snapshot-and-ignore-later-launches semantics `[single-source]`.
- Codex CLI has session-scoped `ModelClient` with turn-level settings, but no evidence of snapshotting system prompt and ignoring later changes `[single-source]`.
- OMP has had broken prompt caching (#3033, #10560) and does not head-anchor system+tools breakpoints reliably `[verified]`.
- claurst / OpenClaude: cloned downstream from Claude Code `[single-source]`.

**VERDICT: 真独有** (vs. full roster). Byte-stable prefix caching exists elsewhere (Reasonix, Hermes), but the specific "snapshot once, ignore subsequent `--system-prompt` changes until compaction" semantic is not attested in any competitor.

---

## 2. `--exclude-dynamic-system-prompt-sections`
**What:** Moves cwd/env/memory-paths/git-status out of the system prompt into the first user message specifically to improve *cross-user* prompt-cache reuse. Achieves ~82-98% cross-user cache sharing.

**Competitors probed:** Hermes Agent, DeepSeek-Reasonix, Codex CLI, OpenCode, OMP, DSH, claurst, OpenClaude.

**Evidence:**
- Hermes Agent has `prefix_and_2` strategy splitting volatile suffix from stable prefix, but the explicit goal is cross-*session* reuse, not cross-*user* `[single-source]`.
- DeepSeek-Reasonix freezes header bytes at session start and appends context updates as user-role messages, similar axis but not cross-user engineered `[verified]`.
- Codex CLI, OpenCode, OMP: no evidence of a flag or mechanism specifically designed for cross-user cache reuse `未在已查材料中找到`.
- claurst / OpenClaude: derivative implementations `[single-source]`.

**VERDICT: 真独有** (vs. full roster). The explicit cross-user cache reuse engineering (moving per-user dynamic sections to first user message) is not attested elsewhere. Reasonix and Hermes optimize within-session or cross-session, not cross-user.

---

## 3. `claude import [source]`
**What:** "Import config from another AI coding agent into Claude Code."

**Competitors probed:** Codex CLI, Hermes Agent, jcode, OMP, OMO, openinterpreter, aider, Cursor.

**Evidence:**
- Codex CLI has `/import` that imports FROM Claude Code and Cursor `[verified]`.
- Hermes Agent has `import-agent` that imports FROM Claude Code and Codex `[verified]`.
- jcode, OMP, OMO: no evidence of inbound import commands. OMP and jcode do session export/import in the *opposite* direction (exporting to Claude/Codex formats) `[single-source]`.
- Main confirmed `claude import` exists on 2.1.261 `[verified]`.
- Searched for Claude Code importing from others: found no public documentation or third-party sources describing this flow. The command is attested only by Main's `claude --help` extraction.

**VERDICT: 未知** (inbound direction unverified). Outbound import (others importing FROM Claude Code) is common. Whether Claude Code's `import` is bidirectional or only imports from specific sources could not be verified beyond Main's `claude --help` evidence. No competitor found with equivalent inbound import.

---

## 4. `auto-mode` subcommand (inspect/reset auto mode classifier configuration)
**What:** A persisted classifier picking mode/model, with a dedicated subcommand to inspect/reset its configuration.

**Competitors probed:** Codewhale, Deep Agents Code, OpenCode/OMO, OMP, DSH, Codex CLI, claurst.

**Evidence:**
- Codewhale has `/model auto` with per-turn heuristic routing between DeepSeek V4-Pro and V4-Flash `[verified]`. Has `[auto.router]` config section.
- Deep Agents Code (LangChain) has `--auto-classifier-model` and `/auto model` picker `[single-source]`.
- OpenCode/OMO has automatic model routing via Kimchi plugin (`opencode-kimchi`) and native multi-model stack routing `[verified]`.
- OMP has model routing and role-based model assignment, but no evidence of a persisted classifier with inspect/reset subcommand `未在已查材料中找到`.
- claurst: no `auto-mode` subcommand attested `未在已查材料中找到`.

**VERDICT: 同轴不同实现** (vs. Codewhale, Deep Agents Code, OpenCode/OMO). The axis (automatic model/classifier selection) is shared. Claude Code's subcommand inspect/reset surface is different from Codewhale's `/model auto` or OpenCode's plugin routing.

---

## 5. `respawn [id] --all`
**What:** Restart a background session so it runs the *current* Claude Code version while keeping the conversation. Version-migration of a live session.

**Competitors probed:** Codex CLI, OMP, OpenCode, DSH, jcode, Prime Agent, claurst, OpenClaude, openinterpreter.

**Evidence:**
- Codex CLI has app-server/ACP/MCP session resume and daemon spawn, but no evidence of "restart session with current binary version while keeping conversation" `未在已查材料中找到`.
- OMP has session resume via JSONL but no version-migration respawn `未在已查材料中找到`.
- openinterpreter has `/resume`, `/fork`, `/side` but no version-migration respawn `[single-source]`.
- claurst / OpenClaude: no equivalent attested `未在已查材料中找到`.

**VERDICT: 真独有** (vs. full roster). No competitor attested with version-migration respawn of live sessions.

---

## 6. `gateway` subcommand (enterprise auth/telemetry gateway shipped inside CLI)
**What:** Runs the Claude Apps Gateway inside the CLI binary itself — enterprise auth (OAuth 2.0 + IdP), managed settings delivery, upstream routing (Bedrock/AWS/GCP/Azure/Anthropic), and OTLP telemetry forwarding.

**Competitors probed:** Codex CLI, OpenCode, OMP, DSH, Prime Agent, Grok Build, goose, aider, openinterpreter, claurst.

**Evidence:**
- Codex CLI has no built-in enterprise gateway subcommand. Uses external app-server/ACP transports `未在已查材料中找到`.
- OpenCode, OMP, DSH: no built-in gateway subcommand `未在已查材料中找到`.
- Third-party gateways exist (LangWatch, TrueFoundry) that proxy Claude Code, but these are external tools, not subcommands of the CLI `[verified]`.
- claurst / OpenClaude: no gateway equivalent `未在已查材料中找到`.

**VERDICT: 真独有** (vs. full roster). No competitor ships an enterprise auth/telemetry/routing gateway as a built-in CLI subcommand.

---

## 7. `--restricted`
**What:** Precise capability-removal: drops Bash/PowerShell/REPL/code-runners and WebFetch unless `--tools` names them, ignores user/project/local settings while keeping managed settings, confines file tools to working dirs, refuses bypassPermissions, and requires human/permission-handler approval for writes to settings/git/tool-config files.

**Competitors probed:** Codex CLI, OpenInterpreter, goose, aider, DSH, OpenCode, OMP, claurst.

**Evidence:**
- Codex CLI has `--sandbox read-only` and `--dangerously-bypass-approvals-and-sandbox`. Sandbox is OS-level (Windows restricted token, macOS seatbelt). Read-only mode limits filesystem writes `[verified]`.
- OpenInterpreter has `sandbox_mode = read-only | workspace-write | danger-full-access` plus `approval_policy` — separate controls `[verified]`.
- goose has macOS sandboxing (v1.25.0) but no fine-grained capability-removal mode `未在已查材料中找到`.
- aider: no sandbox/capability-removal mode attested `未在已查材料中找到`.
- claurst: has plugin system with tool overlays but no `--restricted` equivalent `未在已查材料中找到`.

**VERDICT: 同轴不同实现** (vs. Codex CLI, OpenInterpreter). The axis (restrict agent capabilities for safety/evaluation) is shared. Claude Code's `--restricted` is a semantic capability-removal mode (drops tools, ignores settings, confines file access). Codex uses OS sandboxing + approval policy. OpenInterpreter uses sandbox mode + approval policy as separate controls. Different implementation axes.

---

## 8. `ultrareview` + `--environment` + `--cloud` + `--teleport`
**What:** Cloud-hosted multi-agent review of a branch/PR (`/code-review ultra`), self-hosted environment pools (`--environment ccpool_...`), cloud sessions (`--cloud`), and session teleport across environments (`--teleport`).

**Competitors probed:** Codex CLI, OpenCode, OMP, DSH, Codewhale, Prime Agent, Grok Build, crush, goose, openinterpreter, aider, claurst.

**Evidence:**
- Codex CLI has no cloud-hosted multi-agent review service `未在已查材料中找到`.
- OpenCode/OMP/DSH: no equivalent cloud review service `未在已查材料中找到`.
- Codewhale has code review features but no cloud-hosted multi-agent fleet `未在已查材料中找到`.
- openinterpreter, goose, aider, crush: no cloud review service `未在已查材料中找到`.
- claurst: no equivalent `未在已查材料中找到`.
- `teleport` is documented for Claude Code as transferring session context across environments (CLI ↔ VS Code, machine-to-machine) `[verified]`.

**VERDICT: 真独有** (vs. full roster). No competitor attested with a cloud-hosted multi-agent review service, environment pools, or session teleport. Cloud features are unique to Claude Code.

---

## 9. `--prompt-suggestions`
**What:** Emits a `prompt_suggestion` message predicting the *next user prompt* after each turn. Ghost-text UX in interactive mode; stream-json emission in print mode.

**Competitors probed:** Codex CLI, OpenCode, OMP, DSH, Codewhale, openinterpreter, claurst, gajae-code.

**Evidence:**
- gajae-code (GJC) explicitly ported this feature from Claude Code as a native implementation `[verified]`. This proves "originated here, cloned downstream."
- Codex CLI, OpenCode, OMP, DSH, Codewhale, openinterpreter: no equivalent next-prompt prediction feature attested `未在已查材料中找到`.
- claurst: no prompt suggestions attested `未在已查材料中找到`.

**VERDICT: 真独有** (originator). The mechanism originated in Claude Code; gajae-code cloned it downstream. No other competitor in the roster has an independent equivalent.

---

## 10. `--json-schema` structured-output validation
**What:** JSON Schema validation for structured output in print mode.

**Competitors probed:** Codex CLI, OpenCode, OMP, DSH, openinterpreter, claurst.

**Evidence:**
- Codex CLI has `codex exec --output-schema schema.json` for validated JSON output `[verified]`.
- OpenCode, OMP, DSH, openinterpreter: no direct equivalent attested `未在已查材料中找到`.
- claurst: no equivalent attested `未在已查材料中找到`.

**VERDICT: 同轴不同实现** (vs. Codex CLI). Both support structured JSON output via schema. Codex uses `--output-schema` on `exec`; Claude Code uses `--json-schema`. Same axis, different CLI surface.

---

## 11. `--bare` vs `--safe-mode` vs `--restricted` (three separately-specified de-featuring modes)
**What:** Three distinct de-featuring modes with separate semantics: `--bare` (sets `CLAUDE_CODE_SIMPLE=1`, hard-restricts auth to `ANTHROPIC_API_KEY/apiKeyHelper`), `--safe-mode` (legacy simpler mode), and `--restricted` (evaluation harness mode).

**Competitors probed:** Codex CLI, OpenInterpreter, goose, aider, DSH, OpenCode, OMP, claurst.

**Evidence:**
- Codex CLI has multiple sandbox/approval flags (`--sandbox read-only`, `--dangerously-bypass-approvals-and-sandbox`, `--full-auto`) but not three separately-specified de-featuring modes `[verified]`.
- OpenInterpreter has sandbox_mode + approval_policy as separate controls, not three de-featuring CLI modes `[verified]`.
- goose, aider, DSH, OpenCode, OMP: no evidence of three distinct de-featuring modes `未在已查材料中找到`.
- claurst: no equivalent `未在已查材料中找到`.

**VERDICT: 真独有** (vs. full roster). No competitor attested with three separately-specified de-featuring modes at CLI level.

---

## 12. Additional flags batch (`--from-pr`, `--worktree`, `--tmux`, `--brief`, `--forward-subagent-text`, `--include-hook-events`)

### 12a `--from-pr`
**What:** Resume session linked to a PR.
**Competitors probed:** Codex CLI, OMP, OpenCode, DSH, openinterpreter.
**Evidence:** No equivalent PR-linked session resume in competitors `未在已查材料中找到`.
**VERDICT: 真独有**

### 12b `--worktree`
**What:** Git worktree support (enter/switch worktrees).
**Competitors probed:** Codex CLI, OMP, aider, openinterpreter.
**Evidence:** aider has some git worktree awareness but not as a CLI flag `未在已查材料中找到`. Others: no equivalent `未在已查材料中找到`.
**VERDICT: 未知** (may exist in git-native tools like aider but not explicitly documented).

### 12c `--tmux` (iTerm2 native panes)
**What:** iTerm2 native tmux integration.
**Competitors probed:** Codex CLI, OMP, OpenCode, DSH, openinterpreter, crush.
**Evidence:** crush is a TUI framework but no iTerm2 tmux pane integration `未在已查材料中找到`. Others: no equivalent `未在已查材料中找到`.
**VERDICT: 真独有**

### 12d `--brief` (SendUserMessage tool for agent→user messages)
**What:** Tool for agents to send messages to users without full turn overhead.
**Competitors probed:** Codex CLI, OMP, OpenCode, DSH, openinterpreter, claurst.
**Evidence:** Codex CLI has `send_message` via ACP/app-server but not as a distinct `SendUserMessage` tool `未在已查材料中找到`. Others: no equivalent `未在已查材料中找到`.
**VERDICT: 未知** (may be functionally equivalent to Codex message passing but wire shape differs).

### 12e `--forward-subagent-text` with `parent_tool_use_id`
**What:** Forward subagent text with parent tool use ID for streaming context.
**Competitors probed:** Codex CLI, OMP, OpenCode, DSH, Codewhale.
**Evidence:** No competitor attested with this specific mechanism `未在已查材料中找到`.
**VERDICT: 真独有**

### 12f `--include-hook-events` in stream-json
**What:** Include hook lifecycle events in stream-json output.
**Competitors probed:** Codex CLI, OMP, OpenCode, claurst, OpenClaude.
**Evidence:** Codex CLI has JSONL stream events (`thread.started`, `turn.started`, etc.) but no hook-event inclusion `[verified]`. claurst has hooks but no `--include-hook-events` in output streams `未在已查材料中找到`.
**VERDICT: 真独有**

---

## Summary Table

| # | Mechanism | Verdict | Key Competitor Check |
|---|-----------|---------|---------------------|
| 1 | `--system-prompt-snapshot` | **真独有** | Reasonix/Hermes have prefix stability, not snapshot-and-ignore semantics |
| 2 | `--exclude-dynamic-system-prompt-sections` | **真独有** | Reasonix/Hermes optimize session-level, not cross-user |
| 3 | `claude import [source]` | **未知** | Others import FROM Claude Code; inbound direction unverified beyond `claude --help` |
| 4 | `auto-mode` subcommand | **同轴不同实现** | Codewhale `/model auto`, Deep Agents Code classifier, OpenCode routing |
| 5 | `respawn [id] --all` | **真独有** | No version-migration respawn elsewhere |
| 6 | `gateway` subcommand | **真独有** | No built-in enterprise gateway in any competitor |
| 7 | `--restricted` | **同轴不同实现** | Codex sandbox read-only, OpenInterpreter sandbox+approval are different axes |
| 8 | `ultrareview` + cloud/teleport | **真独有** | No cloud multi-agent review or session teleport in roster |
| 9 | `--prompt-suggestions` | **真独有** (originator) | gajae-code cloned it; no independent equivalents |
| 10 | `--json-schema` | **同轴不同实现** | Codex `exec --output-schema` is same axis |
| 11 | `--bare`/`--safe-mode`/`--restricted` | **真独有** | No three-mode de-featuring elsewhere |
| 12a | `--from-pr` | **真独有** | — |
| 12b | `--worktree` | **未知** | — |
| 12c | `--tmux` | **真独有** | — |
| 12d | `--brief` | **未知** | — |
| 12e | `--forward-subagent-text` | **真独有** | — |
| 12f | `--include-hook-events` | **真独有** | — |

**Survivors still plausibly 真独有 or 未知 (high confidence):** `--system-prompt-snapshot`, `--exclude-dynamic-system-prompt-sections`, `respawn --all`, `gateway`, `ultrareview`+cloud, `--prompt-suggestions` (as originator), `--bare`/`--safe-mode`/`--restricted` trio, `--from-pr`, `--tmux`, `--forward-subagent-text`, `--include-hook-events`.
---

## 主会话一手核验（本机安装版本，2026-09-05）

以下均为主会话直接执行/直读所得，非 scout 转述。

### Codex CLI 0.153.4 — `codex --help` / 子命令 help 原文摘录

顶层子命令全集：`agents  exec  review  login  logout  mcp  plugin  mcp-server  app-server  remote-control  completion  update  doctor  sandbox  debug  apply  resume  queue  archive  delete  migrate-rollouts  unarchive  fork  cloud  exec-server  features  help`

逐条描述原文：

- `agents` — "Browse all agent sessions on the shared local app-server daemon"
- `sandbox` — "Run commands within a Codex-provided sandbox"
- `mcp-server` — "Start Codex as an MCP server (stdio)"
- `queue` — "Queue a message for an existing session"
- `migrate-rollouts` — "Inspect or migrate legacy local sessions to paginated thread history"
- `cloud` — "[EXPERIMENTAL] Browse tasks from Codex Cloud and apply changes locally"
- `review` — "Run a code review non-interactively"
- `remote-control` — "[experimental] Manage the app-server daemon with remote control enabled"
- `--dangerously-bypass-hook-trust` — "Run enabled hooks without requiring persisted hook trust for this invocation. DANGEROUS. Intended only for automation that already vets hook sources"
- `-p, --profile <CONFIG_PROFILE_V2>` — "Layer $CODEX_HOME/<name>.config.toml on top of the base user config"
- `--approve-for-me` — "Route approval requests through automatic review using the workspace-write sandbox"
- `--remote <ADDR>` — "Connect the TUI to a remote app server endpoint." 接受形式 "`ws://host:port`, `wss://host:port`, `unix://`, or `unix://PATH`"
- `--remote-auth-token-env <ENV_VAR>` — "Name of the environment variable containing the bearer token to send to a remote app server websocket"

`codex exec --help`：

- `--ignore-rules` — "Do not load user or project execpolicy `.rules` files"
- `--output-schema <FILE>` — "Path to a JSON Schema file describing the model's final response shape"
- `--ephemeral` — "Run without persisting session files to disk"
- `--ignore-user-config` — "Do not load `$CODEX_HOME/config.toml`; auth still uses `CODEX_HOME`"
- `--thread-source <SOURCE>` — "Source classification for newly created or forked threads"

`codex sandbox --help`：

- `-P, --permission-profile <NAME>` — "Named permissions profile to apply from the active configuration stack"
- `--include-managed-config` — "Include managed requirements while resolving an explicit permissions profile"
- `--sandbox-state-json <JSON>` — "JSON value from `codex/sandbox-state-meta` to apply directly"
- `--sandbox-state-readable-root` — "Add a readable root to the supplied sandbox state. Repeat for multiple roots"
- `--sandbox-state-disable-network` — "Disable direct network access in the supplied sandbox state"

`codex features --help`：`list` — "List known features with their stage and effective state"（特性带 stage，不只是布尔开关）

`codex app-server --help`：子命令 `daemon` / `proxy`（"Proxy stdio bytes to the running app-server control socket"）/ `generate-ts`（"Generate TypeScript bindings for the app server protocol"）/ `generate-json-schema`。`--listen <URL>` — "Supported values: `stdio://` (default), `unix://`, `unix://PATH`, `ws://IP:PORT`, `off`"。另有 `--code-mode-host <URL>` — "Connect to a remote code-mode host instead of starting a local host"。

`codex remote-control --help`：`pair` — "Create and print a short-lived manual pairing code"

`codex debug --help`：`prompt-input` — "Render the model-visible prompt input list as JSON"；`models` — "Render the raw model catalog as JSON"

### Codex — 包内随附的第三方/自建二进制

`@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/` 内实际文件与体积：

- `bin/codex` 258.7MB
- `bin/codex-code-mode-host` 69.5MB（code-mode 独立宿主进程）
- `codex-path/rg` 5.4MB（自带 ripgrep）
- `codex-resources/bwrap` 0.5MB（自带 bubblewrap）
- `codex-resources/zsh/bin/zsh` 0.9MB（自带 zsh）

### Codex — 主二进制字符串扫描

execpolicy 相关（`bin/codex` 内可打印字符串，逐字）：

- `execpolicy/src/parser.rs`、`execpolicy/src/policy.rs`、`execpolicy/src/rule.rs`、`execpolicy/src/sandbox_migration.rs`
- `proposed execpolicy amendment: `
- `# network rule saved in execpolicy (`
- `Failed to apply execpolicy amendment: `
- `failed to persist network policy amendment to execpolicy: `
- `failed to apply execpolicy network rules while refreshing managed network proxy: `
- 同一结构体内出现 `proposed_execpolicy_amendment`、`proposed_network_policy_amendment`、`additional_permissions`、`available_decisions`，并有 `struct ExecApprovalRequestEvent with 17 elements`

hooks 相关：

- 事件名逐字连续出现：`pre_tool_use  permission_request  post_tool_use  pre_compact  post_compact  session_start  session_end  user_prompt_submit  subagent_start  subagent_stop  interrupt`
- 信任机制：`HookTrustStatus`、`SetHookTrusted`、`SetHookEnabled`、`bypass_hook_trust`、"`bypass_hook_trust` override must be a boolean"
- 其余类型：`HookScope`、`HookSource`、`HookRunStatus`、`HookHandlerType`、`HookExecutionMode`、`HookOutputEntry`、`HookStartedNotification`
- 实现与遥测：`core/src/hook_runtime.rs`、`codex.hooks.run`、`codex.hooks.run.duration_ms`、`mcp_tool_hook`、`run_legacy_after_agent_hook`
- **wire 字段与 Claude Code 同名**：`hookEventName`、`permissionDecision`、`permissionDecisionReason`、`additionalContext`、`suppressOutput`、`stopReason`、`updatedInput`、`updatedPermissions`、`updatedMCPToolOutput`、`PreToolUseDecisionWire`、`HookEventNameWire`

sandbox 相关：

- 三平台后端枚举同处一串：`MacosSeatbelt`、`LinuxSeccomp`、`WindowsRestrictedToken`
- `sandboxing/src/landlock.rs`、`seccompiler-0.5.0/src/backend/{condition,filter,rule}.rs`
- 特性开关：`use_linux_sandbox_bwrap`、`use_legacy_landlock`、`experimental_windows_sandbox`、`elevated_windows_sandbox`
- Windows 细节：`windowsSandboxLevel`、`windowsSandboxPrivateDesktop`、`windowsSandboxProxySettingsMode`
- 网络：`--apply-seccomp-then-exec`、`--allow-network-for-proxy`、`--proxy-route-spec`、`verify_fd_mounts`，并有 "`--apply-seccomp-then-exec` is incompatible with `--use-legacy-landlock`"
- 可序列化沙箱状态：`struct SandboxState with 4 elements`，字段名可见 `permissionProfile`、`codexLinuxSandboxExe`、`sandboxCwd`、`useLegacyLandlock`
- WSL 提示原文："Codex's Linux sandbox uses bubblewrap, which is not supported on WSL1 because WSL1 cannot create the required user namespaces. Use WSL2 for sandboxed shell commands."

桌面/浏览器控制的身份级作用域（顺带发现）：`ComputerUseMacosConfigToml` 带 `bundle_ids`、`ComputerUseWindowsConfigToml` 带 `aumids`/`publisher_name`/`product_name`；`BrowserUseOriginPolicyConfig` 带 `full_cdp_access`、`allow_history_access`、`default_origin_policy`。

### Codex — execpolicy 活体行为验证（主会话实测）

`codex execpolicy` 是真实子命令（未列在顶层 help 中）：

```
Execpolicy tooling
Commands:
  check  Check execpolicy files against a command
```

`codex execpolicy check --help`：`-r, --rules <PATH>` — "Paths to execpolicy rule files to evaluate (repeatable)"；`--pretty`。

本机 `~/.codex/rules/default.rules` 存在，32 行，每行都是 `prefix_rule(...)`，`decision` 直方图为 `{'allow': 32}` —— 即用户历次「总是允许」被逐条固化成 DSL 规则，pattern 是完整 argv token 数组。不含本机路径的样例行：

```
prefix_rule(pattern=["tmux"], decision="allow")
prefix_rule(pattern=["curl"], decision="allow")
prefix_rule(pattern=["sed", "s/<[^>]*>/ /g"], decision="allow")
prefix_rule(pattern=["rtk", "git", "add"], decision="allow")
```

主会话另写一个两行临时规则文件做端到端实测（`/tmp` 内，已删除）：

```
prefix_rule(pattern=["git", "status"], decision="allow")
prefix_rule(pattern=["rm", "-rf"], decision="forbidden")
```

实测输出（原文）：

- `codex execpolicy check --rules … -- git status` → `{"matchedRules":[{"prefixRuleMatch":{"matchedPrefix":["git","status"],"decision":"allow"}}],"decision":"allow"}`
- `… -- git push --force` → `{"matchedRules":[]}`（无匹配，无 decision，落回常规审批）
- `… -- rm -rf /` → `{"matchedRules":[{"prefixRuleMatch":{"matchedPrefix":["rm","-rf"],"decision":"forbidden"}}],"decision":"forbidden"}`

即：**这不是文档声称，而是可执行、可单测的命令前缀策略引擎**。

### Claude Code 2.1.261 — 二进制字符串扫描

Claude Code 现以原生二进制分发（206MB），但内部 JS bundle 可读，扫描可见压缩后源码。

prompt cache 工程（逐字）：

- `systemPromptSnapshot` 的字段说明："Record the conversation's system prompt once and reuse it verbatim on every later request and resume (recommended: true)."
- 另有 `systemPromptSnapshotHash`
- 自动启用条件（压缩源码原文）：`if(!nm()||e.systemPromptSnapshot===!1)return!1;if(e.systemPromptSnapshot===!0||a.CLAUDE_CODE_SESSION_KIND==="bg"||a.CLAUDE_CODE_REMOTE)return!0` —— 后台会话与远程会话默认开启
- `excludeDynamicSystemPromptSections` / 内部名 `excludeDynamicSections`，字段说明："When true, omit per-user dynamic sections (working directory, auto-memory path) from the cached system prompt and re-inject them as the first user message. Lets cross-user prompt caching hit on a static system prompt prefix. Tradeoff: the model sees t"（扫描处截断）
- CLI 帮助原文："Move per-machine sections (cwd, env info, memory paths, git status) from the system prompt into the first user message. Improves cross-user prompt-cache reuse. Only applies with the default system prompt (ignored with --system-prompt)."
- 可见分节 id：`env_info_static`、`env_info_simple`、`language`、`bg-session`、`scratchpad`、`memory${E}`
- 运行日志串：`[print.ts] restored excludeDynamicSections from prior worker epoch`、`[print.ts] excludeDynamicSections restore skipped: kill switch set`
- 另有 `artifactCorePromptCacheKeyBit`（对 tools/schema 计算 cache key 位）

hooks：

- `"PreToolUse": [{`、`hookSpecificOutput`、`hookEventName`
- "`permissionDecision` - \"allow\", \"deny\", or \"ask\" (PreToolUse only)"
- "`updatedInput` - Modified tool input (PreToolUse only)"
- "Only available for tool events: PreToolUse, PostToolUse, PermissionRequest."
- 表格行："| PreToolUse | Tool name | Run before tool, can block |"
- 重试语义原文："Return {\"hookSpecificOutput\":{\"hookEventName\":\"PermissionDenied\",\"retry\":true}} to tell the model it may retry."
- schema 片段可见 `asyncTimeout`、`UserPromptSubmit` 带 `additionalContext`/`sessionTitle`/`suppressOriginalPrompt`

审批固化：`alwaysAllowRules`、`askSuppressesAlwaysAllowRule`、`suppressAlwaysAllowRule`、`mcpAlwaysAllowOverride`、`toolAlwaysAllowedRule`，写入 `.claude/settings.local.json`。

sandbox：`seatbelt: built-in (macOS)`；Linux 侧 **不随包分发** bwrap，提示原文 "bubblewrap is required for subprocess env scrubbing and isolation. Install with: sudo apt-get install -y bubblewrap, set sandbox.bwrapPath in managed settings, or set CLAUDE_CODE_SUBPROCESS_"；另有 `bubblewrap (bwrap) not installed`、`CLAUDE_CODE_BUBBLEWRAP`、`sandbox_runtime`、`sandbox_runtime_seccomp`、`sandbox_runtime_srt_win`。

**负证据（用于 Codex hook trust 的反向核查）**：在整个 206MB 二进制中扫描 `hooktrust`、`trusthook` 两种大小写无关子串，命中数均为 **0**。`landlock` 命中数为 0。这是「已查材料中未找到」的一手版本，比「文档未记载」更强，但仍不排除以其他命名实现。

### OMP v18.1.10 — 反向核查用一手证据（`omp --help`）

- `--profile=<value>` — "Use an isolated profile for auth, sessions, settings, and caches"
- `--no-session` — "Don't save session (ephemeral)"
- `--from-claude` — "Import a Claude Code session into OMP"；`--from-codex` — "Import a Codex session into OMP"
- 顶层 help 中未见等价于 `codex queue` 的「从外部进程向已运行会话注入消息」子命令

---

## 主会话裁决：修正两个 scout 的裁定

两个 scout 各自给出过多 `真独有`（ClaudeCodeUnique 11 条、CodexUnique 8 条）。按本仓既有门槛（反向核查必须点名；「未找到」不等于「没有」；计数差异与成熟度差异不算能力差异；非 coding-agent 能力轴不计入）逐条降级：

**互证性矛盾，双杀两条**

1. 云端交接：ClaudeCodeUnique 判 Claude `ultrareview`/`--cloud`/`--teleport`/`--environment` 为真独有，理由是「Codex 无云端」；CodexUnique 判 `codex cloud` 为真独有，理由是「Claude 只有 review 专用」。主会话已本机核实两边都有第一方云端交接（`codex cloud` 与 `claude --cloud`/`ultrareview`/`--environment ccpool_`），故**两条同时降为同轴不同实现**；且托管服务本身不是 harness 机制轴。
2. 守护进程/后台会话：CodexUnique 判 app-server 守护进程为真独有，同时承认 Claude 有 `--bg`/`agents`/`attach`/`remote-control`，仅以「统一守护进程 vs supervisor-worker」区分——这是实现形态差异。**降为同轴不同实现**。残留子操作 `codex queue`（不 attach 直接向已运行会话注入消息）在已查的 6 家中未见等价物，单列为可能独有，只能标 `[single-source]`。

**因「未找到即独有」而降级**

3. Claude `respawn`（把后台会话在保留对话的前提下重启到当前版本）、`--from-pr`、`--brief`、`--worktree` 四条，scout 依据全是「未在竞品中找到」。**降为未知**。
4. Claude `--tmux`（iTerm2 原生 pane）、`--forward-subagent-text`、`--include-hook-events` 三条属终端 UX 与 stream-json 管线细节，不构成 coding-agent 能力轴。**移出独有性讨论**，与既有 Codewhale SHA256 自更新器同类处理。
5. Claude `--bare`/`--safe-mode`/`--restricted`「三种去功能化模式」为计数产物（「没人恰好有三种」不是能力）。**不计独有**；其中 `--restricted` 作为「移除工具能力」与 Codex「沙箱化进程」属不同轴，两 scout 均判同轴不同实现，予以采纳。
6. Claude `gateway`（CLI 内置企业级 auth/telemetry 网关）确为竞品所无，但属企业运维轴，与既有 claurst 预算切分同类处理。**移出核心独有性，仅记为相邻优势**。
7. CodexFourLane 的「80+ crate Rust workspace」与「rollout JSONL + SQLite 混合持久化」两条判真独有，前者是计数产物，后者是存储实现形态。**均降为同轴不同实现/不计**。
8. Codex `migrate-rollouts` 是 Codex 迁移自家存储格式的维护工具，与既有 Codewhale SHA256 同类。**移出独有性讨论**。
9. Codex `review` 子命令：Claude 有 `/review`、`/code-review`、`ultrareview`，OMP 有 reviewer/security-reviewer 子 agent。**降为同轴不同实现**。

**主会话本机证据反而加强的两条**

10. Codex **execpolicy `.rules` DSL**：不止官方文档，主会话已活体实测（见上）——可执行、按 argv 前缀匹配、`forbidden > prompt > allow` 优先级、`codex execpolicy check` 可单测；且二进制内 `proposed_execpolicy_amendment` / `proposed_network_policy_amendment` 证明**模型可提议规则修正并被持久化，含网络规则**。反向核查：Claude Code 的 `alwaysAllowRules` + `settings.local.json` 达到「审批固化为规则」同一目标，故「持久化审批」这一层是同轴；但「带解析器与内联单测的策略语言 + 模型提议修正」在已查竞品中无对应物。裁定 **真独有（收窄到 DSL 与修正提议层）**。
11. Codex **hash 化 hook trust**：官方文档 + 二进制 `HookTrustStatus`/`SetHookTrusted`/`bypass_hook_trust` + 反向核查 Claude Code 二进制 0 命中。裁定 **真独有**，`[verified]`。

**Claude Code 侧唯一站得住的独有候选**

12. `--exclude-dynamic-system-prompt-sections`：目标是 **cross-user** 前缀缓存命中（把 per-user 动态段移出被缓存的 system prompt），实现证据完整且自带 tradeoff 说明与 kill switch。反向核查：Reasonix `StaticPromptCache`、Hermes `prefix_and_2` 都只做 within-session / cross-session，未见任何竞品为跨用户共享前缀做工程。裁定 **可能独有**，`[single-source]`（Anthropic 自家实现 + 无竞品对应物，缺第二方独立佐证）。注意 scout 给的「~82-98% 跨用户缓存共享」数字**未在任何一手材料中找到，已弃用，不得写入 wiki**。
13. `--system-prompt-snapshot`：ClaudeCodeUnique 判真独有，但其自身证据显示 Reasonix 有 `StaticPromptCache`（会话创建时快照 system prompt 且不再从磁盘重读），同轴已存在。Claude 的差异是把快照连同 hash 记进会话、resume 时逐字重放。按「成熟度不是能力」原则，裁定 **同轴不同实现**（Claude 实现更完整）。
14. `claude import`（inbound 导入他家 agent 配置）：scout 自身证据显示 Codex 有 `/import`（从 Claude Code 与 Cursor 导入）、OMP 有 `--from-claude`/`--from-codex`（主会话已本机核实）。裁定 **同轴不同实现**，非未知。
15. `--prompt-suggestions`（预测下一条用户输入）：gajae-code 明确从 Claude Code 移植，属「此处首创、下游克隆」。但它是 UX 便利而非 harness 能力轴，记为**可能独有（次要轴）**。

**新增的横向结论（本轮最有价值的副产品）**

16. Codex 的 hook 引擎在源码中直接叫 `ClaudeHooksEngine`（CodexFourLane 直读 `codex-rs/hooks/src/lib.rs`），且 wire 字段 `hookEventName`/`permissionDecision`/`permissionDecisionReason`/`additionalContext`/`suppressOutput`/`stopReason`/`updatedInput` 与 Claude Code 完全同名（主会话在两个二进制中分别扫到）。事件名 Codex 用 snake_case、Claude 用 PascalCase。即 **OpenAI 在自家 harness 里实现了 Anthropic 的 hook 线格式**。这为「独有性稀少」提供了机制性解释：厂商之间在 hook、skills（双方都用 `SKILL.md` + YAML frontmatter）、AGENTS.md/CLAUDE.md 上正在收敛成事实标准。
17. Codex 事件集比 Claude 多 `post_compact` 与 `subagent_start`；Claude 有 Codex 未见的 `PermissionDenied` + `retry:true`（告诉模型可以重试）。两边互有增补，是共同演化而非单向抄袭。
