# 17 个 coding agent 四源能力调查（workpool + 主会话补漏）

- Source: 本 repo 研究会话（OMP workpool caps17，5 并发 task worker）+ 主会话 MCP 工具直调
- Collected: 2026-09-05
- Published: Unknown
- 采集方式：每个 agent 四路——context7（resolve+query-docs）、DeepWiki（ask_question）、web 搜索（firecrawl/ddgs/jina/tavily）、code 搜索（grep.app）。worker 报告为原文收录，未改写。主会话补漏部分为工具输出原文摘录。


## worker 报告原文：pi-mono（caps17#1）

### pi-mono

- **context7**: Pi framework (parent of pi-mono) documented in Context7 with 2006+ snippets. Hooks API exposes granular lifecycle events (session start/switch/branching/compaction/shutdown) and a `session_before_compact` hook that lets extensions supply custom summaries or abort compaction [verified]. Shared summarization enforces `toolChoice: "none"` with an explicit guard rejecting tool-call responses in branch summaries [verified]. Session-manipulation methods are restricted to `HookCommandContext` slash commands to prevent deadlocks [verified].
- **deepwiki**: Four operational modes (Interactive TUI, Print, JSON lines, JSON-RPC 2.0 + Node.js SDK) make it embeddable in diverse workflows [single-source]. Session tree structure enables in-place branching without new files (`/tree` to navigate history) [single-source]. Extensibility via Extensions (custom tools/events/UI/commands), Skills (Agent Skills standard), Prompt Templates, Themes, and shareable Pi Packages [single-source]. Core philosophy is minimalism: sub-agents, plan mode, permission popups are not baked in but provided via extensions/skills [single-source].
- **web**: 无结果 (firecrawl_search 402, jina_search_web Payment Required)
- **code**: 无结果 (grep.app 两次查询均未返回匹配)


## worker 报告原文：claurst（caps17#3）

### claurst
- **context7**: Managed-agents architecture with manager-executor model: configurable manager/executor models, concurrency limits, executor isolation (`worktree`/`remote`), budget splits (percentage/fixed/USD caps) [context7: /kuberwastaken/claurst]. AgentTool supports spawning sub-agents with named teams, background/async launch, and multi-agent swarm integration [context7: /kuberwastaken/claurst]. 40+ built-in tools covering file ops, shell, search, git, notebooks, desktop automation [context7: /kuberwastaken/claurst].
- **deepwiki**: Clean-room Rust reimplementation of Claude Code CLI — derived from exhaustive behavioral spec, ensuring legal/technical independence [single-source: DeepWiki]. Goal System with durable multi-turn objectives verified via `GoalCompleteTool` [single-source: DeepWiki]. Auto-compaction for conversation history [single-source: DeepWiki]. ACP (Agent Client Protocol) backend for IDE integration (e.g. Zed) via JSON-RPC 2.0 over stdio [single-source: DeepWiki]. Speech modes `/caveman` and `/rocky` for token compression [single-source: DeepWiki]. 15+ LLM providers + MCP support; open-source, no telemetry [single-source: DeepWiki].
- **web**: 无结果 — firecrawl_search 返回 402, jina_search_web 返回 Payment Required.
- **code**: Rust monorepo (`cli`, `core`, `tools`, `tui`, `commands`, `query`, `mcp` crates). Plugin system with enable/disable/reload (`/plugin` command) [mcp__grep_app_github_searchgithub]. Named agent definitions from `.claurst/agents/*.md` or plugins, with per-agent cost tracking [mcp__grep_app_github_searchgithub]. Slash command framework (`/help`, `/compact`, `/model`, `/config`, `/cost`, etc.) [mcp__grep_app_github_searchgithub]. MCP manager integrated into command context with OAuth flow support [mcp__grep_app_github_searchgithub].


## worker 报告原文：DeepSeek-Reasonix（caps17#4）

### DeepSeek-Reasonix

- **context7**: [verified] Prefix-cache-first loop architecture: append-only history aligned with DeepSeek's byte-stable prefix cache achieves >90% cache hit rates and ~1/5 input token cost on long sessions. Session state (JSONL) is persisted explicitly so the provider prefix cache stays warm across restarts; idle >24h resumes against cold cache. System prompt byte-swap detection logs cache invalidation (misses billed at 10× hit pricing). [Source: `/esengine/deepseek-reasonix` 734 snippets, High reputation, Benchmark 72.37]
- **deepwiki**: [verified] Multi-model composable sessions: can run executor + planner simultaneously in separate cache-stable sessions. Config-driven extensibility via TOML (any OpenAI-compatible endpoint). MCP client (stdio/http). Permission gates (`deny`/`ask`/`allow`) + file-write sandbox confined to `workspace_root`. Snapshot-based rewind for code and conversation. Single CGO-free Go binary cross-compiled for macOS/Linux/Windows (amd64/arm64), no Node.js runtime. [Source: DeepWiki `esengine/DeepSeek-Reasonix`]
- **web**: 无可用结果（jina Payment Required；firecrawl/ddgs 无返回）
- **code**: [single-source] 真实产品级交付物：桌面端构建产物（darwin-arm64/amd64、Windows、Linux）、发布通道脚本、崩溃报告 Worker、VS Code 扩展入口。非纯原型。 [Source: `mcp__grep_app_github_searchgithub` `esengine/DeepSeek-Reasonix`]

## worker 报告原文：Codewhale（caps17#5）

### Codewhale
- **context7**: DeepSeek-first agentic terminal for open-source/open-weight coding models; 3328 snippets, High reputation [context7 /hmbown/codewhale]. Feature flags: shell_tool, subagents, web_search, apply_patch, MCP, exec_policy [context7 CONFIGURATION.md]. Non-interactive stream-JSON mode with structured exit codes for harness/backend wrappers [context7 MODES.md]. Builder sub-agents with write boundaries (type=builder, model_strength, cwd) for targeted code modifications [context7 delegate/SKILL.md]. Parallel sub-agents via natural language prompts [context7 GUIDE.md].
- **deepwiki**: 无收录 (Repository not found) [deepwiki]
- **web**: Terminal-native Rust coding agent, MIT license, ~40.9k GitHub stars [ddgs single-source]. DeepSeek V4 focused; streams reasoning blocks in real-time [ddgs single-source]. Approval-gated workspace editing [ddgs single-source]. Auto mode selects best model and thinking level per turn [ddgs single-source]. Bring-your-own-model (BYOM), runs locally [ddgs single-source].
- **code**: Self-updater with SHA256 checksum verification and atomic binary replacement (crates/cli/src/update.rs) [grep_app]. Isolated per-workspace Cargo cache topology with sccache support and CNB mirror override (scripts/dev-cache.sh) [grep_app]. Release channel management (stable/beta) with version comparison [grep_app].

## worker 报告原文：aider（caps17#9）

### aider

- **context7**: [verified] Tree-sitter-powered repo map: token-budget-aware, PageRank-based ranked tags map covering 20+ languages (Python, JS/TS, Go, Rust, Java, Ruby, PHP, OCaml, etc.). `subtree_only` mode scopes map to current subdirectory. [Source: `/aider-ai/aider` 6040 snippets, Benchmark 73.74]
- **deepwiki**: 无收录（DeepWiki 未索引该仓库）
- **web**: [verified] Four edit modes matching risk to task; native git integration with auto-commits per turn; voice-coding loop via Whisper; 100+ LLM providers via LiteLLM; coordinated multi-file edits in single operation; image/URL chat support. [Source: DDGS `aider coding agent features`]
- **code**: [verified] 广泛分发：NixOS nixpkgs 官方打包；tree-sitter tag queries 被 OpenClaude 等下游项目直接复用；Apache-2.0 许可。 [Source: `mcp__grep_app_github_searchgithub` `aider-ai/aider`]

## worker 报告原文：OMP（caps17#10）

### OMP (oh-my-pi)
- **context7**: 5161 snippets, High reputation, Benchmark 75.13 [context7 /can1357/oh-my-pi]. TTSR (Time Traveling Stream Rules): regex conditions tested against streamed output, scoped to specific tool arguments (e.g. `tool:write(*.ts)`), injects corrective markdown body mid-stream without context tax [context7 omfg-user.md, ttsr-injection-lifecycle.md]. Rulebook matching pipeline normalizes rules from multiple config formats with precedence resolution [context7 rulebook-matching-pipeline.md].
- **deepwiki**: 31+ built-in tools, 14 LSP ops, 28 DAP ops [deepwiki]. Python/Bun persistent workers with tool-calling (agent can call its own read/search/task from inside kernels) [deepwiki]. Debugger integration driving lldb/dlv/debugpy for stepping, frames, evaluation [deepwiki]. Web search chains 23 ranked providers [deepwiki]. Desktop interaction via `computer` tool (screenshots, native input, clipboard) [deepwiki]. Token-budget-aware compaction with visual "snapcompact" archives [deepwiki]. Mnemopi autonomous memory with vector embeddings, configurable backends (local/hindsight/mnemopi) [deepwiki]. Rust core (~80k LOC) with in-process ripgrep/glob/find and 58 ported builtins eliminating fork/exec [deepwiki]. Hashline editing with content-hash anchors reducing token usage [deepwiki]. Subagents with schema-validated objects across isolated worktrees [deepwiki]. Advisor role for inline second-model review [deepwiki]. `/collab` live relay sessions with read-write/read-only terminal/browser join [deepwiki]. ACP (Agent-Computer Protocol) editor plugin for Zed [deepwiki]. Inherits Cursor MDC, Cline .clinerules, Copilot applyTo [deepwiki]. Multi-mode CLI: TUI, one-shot direct, print mode, RPC over stdio NDJSON, Node.js SDK [deepwiki].
- **web**: Fork of Pi (84k stars) that bolted on 31 tools, LSP, debugger, and Rust core [ddgs YUV.AI]. Terminal-first agent running as interactive TUI, one-shot CLI, RPC server, or ACP plugin inside editors like Zed [ddgs AgentRiot]. IDE-grade tooling target for power users who want LSP/debuggers/subagents in a terminal [ddgs Standard Compute]. Multi-model split with advisor loop and subagents for parallel work [ddgs YouTube].
- **code**: SDK `@oh-my-pi/pi-coding-agent` exposes CreateAgentSessionResult, AgentSession, PromptOptions, TaskTool, agent lifecycle registry, and persisted subagent registration [grep_app can1357/oh-my-pi]. Subagent LSP integration tests with worktree isolation handles [grep_app can1357/oh-my-pi]. Soft-request budget executor with async job manager and subprocess runner [grep_app can1357/oh-my-pi]. Third-party harness integration (emdash, cmux) showing global bun/npm install paths and brew tap distribution [grep_app generalaction/emdash, manaflow-ai/cmux].

## worker 报告原文：Grok Build（caps17#14）

### Grok Build

- **context7**: [verified] Full-screen TUI + headless mode (scripting/CI) + editor integration via Agent Client Protocol (ACP) over stdio JSON-RPC. Architecture: Session Manager + Tools Registry + MCP Servers. Git worktree support for parallel isolated sessions (`--worktree=feat`). Render modes: `--minimal` scrollback-native (sticky preference) vs `--fullscreen`. [Source: `/xai-org/grok-build` 1564 snippets, High reputation, Benchmark 78.29]
- **deepwiki**: [verified] Plan mode: explores codebase and presents plan for approval before edits. Cross-session memory + project rules via `AGENTS.md`. Built-in tools: `read_file`, `grep`, `run_terminal_command`; extensible via MCP. Shell command approval gates + `--yolo` auto-approve. Session resume (`--resume`, `-c`). [Source: DeepWiki `xai-org/grok-build`]
- **web**: [single-source] 8 parallel sub-agents; Arena mode; launched May 2026 as beta for SuperGrok/X Premium Plus subscribers; lowest xAI input/output rates in live catalog. [Source: DDGS `xAI grok build coding agent cli features`]
- **code**: [verified] Gentoo 官方 overlay 打包 (`grok-build-bin`)。第三方安全包装器（roborev）为其维护工具 allowlist/denylist，说明工具集具有可审计的固定接口。内置 MCP meta-tools (`search_tool`/`use_tool`) 即使显式设 `--tools` 也保持常开。 [Source: `mcp__grep_app_github_searchgithub` `xai-org/grok-build`]

## worker 报告原文：OpenCode（caps17#15）

### OpenCode
- **context7**: 3179 snippets, High reputation, Benchmark 85.83 [context7 /anomalyco/opencode]. Client/server architecture: TUI client + server with OpenAPI 3.1 spec endpoint, supports multiple clients and programmatic interaction via `opencode serve` [context7 server.mdx]. LSP exclusively over stdio (StreamMessageReader/Writer); no generic TCP proxy [context7 client.ts]. LSP client assignment gates by project boundary, file extension, and root detection — notably does NOT consult ignore patterns, so files inside ignored directories can still receive LSP services [context7 lsp.ts].
- **deepwiki**: Triple interface: terminal TUI, desktop app (tabs, macOS/Windows/Linux), IDE extension [deepwiki]. 75+ LLM providers via Models.dev including local models; compatible with existing subscriptions (Claude Pro/Max, ChatGPT Plus/Pro, GitHub Copilot) [deepwiki]. OpenCode Zen: curated model set benchmarked specifically for coding agents [deepwiki]. Specialized agents: Build (default, full tools), Plan (restricted analysis), General (multi-step), Explore (read-only), Scout [deepwiki]. Multi-session parallel agents on same project with shareable session links [deepwiki]. Privacy-first: no code/context data stored, user owns all generated code without license restrictions [deepwiki].
- **web**: Fully open-source MIT-licensed, runs entirely locally [ddgs codexpedite.com]. Built by Anomaly Innovations team behind SST [ddgs codexpedite.com]. ~160-162K GitHub stars [ddgs codexpedite.com, explainx.ai]. Go-based CLI; costs nothing beyond API calls [ddgs openaitoolshub.org]. Provider-agnostic covering Anthropic, OpenAI, Google, and local Ollama models [ddgs openaitoolshub.org].
- **code**: `opencode serve` topology used in third-party harnesses (e.g. oh-my-openagent) for plugin-origin promptAsync and concurrent runner split testing, demonstrating programmatic server usage [grep_app code-yeongyu/oh-my-openagent].

## worker 报告原文：crush（caps17#19）

### crush
- **context7**: Per-workspace SQLite with WAL mode, exclusive data-dir flock, reference-counted connection pool [context7: /charmbracelet/crush]. Detached background server (Unix socket / Windows named pipe) with auto-start, health probe, idle shutdown (60s) [context7: /charmbracelet/crush]. Multi-client attach/detach session model with grace timers (30s create / 10s detach) [context7: /charmbracelet/crush]. Hook engine with PreToolUse hooks, parallel execution, timeout, dedup, and Crush+Claude Code compat env vars [context7: /charmbracelet/crush]. Bash-powered `crushrc` configuration with builtins, dynamic logic, and secrets integration [context7: /charmbracelet/crush]. LSP client manager with auto-discovery and on-demand startup [context7: /charmbracelet/crush]. Agent Skills open standard support (SKILL.md discovery) [context7: /charmbracelet/crush].
- **deepwiki**: Multi-model support — switch models mid-session while preserving context [single-source: DeepWiki]. LSP integration for codebase context [single-source: DeepWiki]. MCP (HTTP, stdio, SSE) + Agent Skills extensibility [single-source: DeepWiki]. Bash-powered `crushrc` config system (like `.bashrc`) with dynamic logic and env expansion [single-source: DeepWiki]. Hooks — user-defined shell commands on agent events (block/rewrite/inject/auto-approve) [single-source: DeepWiki]. Dual mode: interactive Bubble Tea TUI + non-interactive CLI (`crush run`) [single-source: DeepWiki].
- **web**: 无结果 — jina_search_web 返回 Payment Required; firecrawl_search 返回 402.
- **code**: 无结果 — grep_app_github_searchgithub 两路查询（`crush`、`crush agent skill`）均未返回 charmbracelet/crush 相关代码，仅命中 Ceph/FreeRDP/Headroom 等无关仓库.


## worker 报告原文：goose（caps17#20）

### goose
- **context7**: General-purpose AI agent with three interfaces: native desktop app (macOS/Linux/Windows), full CLI, and embeddable API [context7 README]. Built in Rust for performance and portability [context7 README]. Subrecipes system: YAML-defined reusable workflows with parallel execution, parameter passing, and sequential control (`sequential_when_repeated`) [context7 docs]. MCP Apps support with explicit resource capability declaration [context7 docs].
- **deepwiki**: MCP client with 70+ extensions for database access, API interactions, GitHub operations, etc. [deepwiki aaif-goose/goose]. Agent Client Protocol (ACP): decouples agents from editors — Goose acts as both ACP server (Zed/JetBrains connect directly) and ACP client (orchestrates Claude Code, Codex, Copilot as providers) [deepwiki]. Multi-model routing within a single session: "Lead" model for planning + "Worker" model for execution, optimizing speed/cost/reliability [deepwiki]. Code Mode: agent writes code that programmatically calls multiple tools, reducing context window load [deepwiki]. Context Revision: summarizes with smaller LLMs and algorithmically prunes old/irrelevant content [deepwiki].
- **web**: Open-source Apache-2.0; originally incubated at Block (Square, Cash App), donated to Linux Foundation's Agentic AI Foundation (AAIF) in Dec 2025 [ddgs → aaif.io, aipedia.wiki]. 25+ LLM providers including Ollama, Ramalama, Docker Model Runner [ddgs → runlocalai.co]. Local-first positioning: often the only viable option for orgs where code cannot leave controlled infrastructure [ddgs → baeseokjae.github.io].
- **code**: No results found (mcp__grep_app_github_searchgithub tried "repo:aaif-goose/goose async fn", "repo:aaif-goose/goose fn main", and "goose run extension") [single-source].


## worker 报告原文：openinterpreter（caps17#21）

### openinterpreter
- **context7**: 2159 snippets, High reputation, Benchmark 57.88 [context7 /openinterpreter/openinterpreter]. Sandbox modes: `read-only` | `workspace-write` | `danger-full-access`; approval policies: `untrusted` | `on-request` | `never` [context7 sandbox.md]. Per-command sandbox override via CLI (`interpreter --sandbox read-only "audit the auth flow"`) [context7 sandbox.md]. Configurable model reasoning effort/summary, personality (friendly/pragmatic/none), web_search cached mode [context7 config.md]. Codex SDK compatibility layer [context7 codex-network.md].
- **deepwiki**: Harness emulation: adapts system prompts, tool schema, message conversion and response handling for specific models (kimi-code, claude-code, deepseek-tui) via `/harness` while keeping native Rust runtime — does not shell out to external agent CLI [deepwiki]. Local-first persistent state under `~/.openinterpreter` with session resume [deepwiki]. Platform-specific sandboxing: Seatbelt (macOS), Bubblewrap (Linux) with network/file-system permission controls [deepwiki]. Drop-in Codex SDK replacement; ACP agent for Zed/VS Code integration [deepwiki]. Computer-use QA skill via `agent-browser` and `trycua` for web/native app operation [deepwiki]. Multi-layered config: built-in defaults → user config → project config → CLI overrides [deepwiki].
- **web**: Native sandboxing on macOS, Linux, Windows [ddgs GitHub]. Switch providers/models from TUI with `/model`; inspect/switch Rust-native harnesses with `/harness` [ddgs GitHub]. ~65,600+ stars; forked from OpenAI Codex, rewritten in Rust to make low-cost models (DeepSeek, Qwen, Kimi) perform like Claude Code [ddgs CoddyKit]. Package reusable workflows the agent auto-discovers; project-specific persistent guidance [ddgs openinterpreter.com].
- **code**: Embeddable as a Python library (`from interpreter import interpreter`, `OpenInterpreter`, `AsyncInterpreter`) used in third-party agents and services [grep_app]. ODS wraps it as a configurable service with custom LLM API base and auto_run [grep_app Osmantic/ODS]. OpenInterpreter/01 uses `AsyncInterpreter` with TTS/STT pipelines (coqui, cartesia, deepgram, faster-whisper) [grep_app OpenInterpreter/01]. aiwaves-cn/agents wraps it as `CodeInterpreterTool` [grep_app aiwaves-cn/agents]. AgentPilot loads dynamic Python profiles with AST manipulation to strip interpreter boilerplate [grep_app jbexta/AgentPilot]. OpenBMB/IoA runs it inside FastAPI with Pydantic models [grep_app OpenBMB/IoA].

## worker 报告原文：DSH（caps17#23）

### DSH (deepseek-harness)

- **context7**: [verified] Cordis "everything-is-a-plugin" kernel: model adapter, tool registry, session log, agent loop are all swappable Cordis plugins. Capability Seams pattern — service interfaces with interchangeable implementations (filesystem, tools, subprocesses). Append-only Session Log as single source of truth; Surfaces as in-memory projections for UI/reasoning. [Source: `/deepseek-ai/deepseek-harness` 5528 snippets, High reputation, Benchmark 77.82]
- **deepwiki**: [verified] Agent loop structured in "turns" (input→output) and "steps" (single LLM request + tool executions). Tool Execution Waterfall: pre-execution approval → core call → post-processing. Code Mode with `run_code` tool for generated-code execution. Python SDK drives harness over newline-delimited JSON-RPC on stdio. Live patch reload modifies runtime behavior without restart. [Source: DeepWiki `deepseek-ai/deepseek-harness`]
- **web**: [verified] Two-tool coding agent preset (persistent bash + str_replace_editor) ships in developer preview. Community plugin topic index at `github.com/topics/dsh-plugin`. Explicitly labeled developer preview with compatibility-breaking changes expected. [Source: DDGS `deepseek harness DSH coding agent plugin cordis capabilities`]
- **code**: [verified] Third-party design-tool integration exists (OpenDesign × DSH workflow with artifact preview). Official AGENTS.md documents npm scoping (`@deepseek-ai/dsh-*`), vendored package rescoping, and CI e2e key policy. [Source: `mcp__grep_app_github_searchgithub` `deepseek-ai/deepseek-harness`]

## worker 报告原文：jcode（caps17#24）

### jcode
- **context7**: 2214 snippets, High reputation, Benchmark 59.52 [context7 /1jehuang/jcode]. Blazing-fast, multi-model coding agent harness built for multi-session workflows, infinite customizability, and performance, featuring swarm coordination and over 30 tools [context7 description].
- **deepwiki**: Extreme performance: sub-millisecond frame renders, ~27.8MB RAM idle (without local embeddings), jemalloc for long-running servers [deepwiki]. Multi-model orchestration: native Anthropic, OpenAI, Google, OpenRouter with OAuth subscriptions and direct API keys via `jcode login` [deepwiki]. 30+ built-in tools including `agentgrep` which injects file-structure context into search results so the agent understands context without full-file reads [deepwiki]. Persistent memory: local ONNX-based embeddings per turn/response, cosine-similarity recall, periodic consolidation via memory sideagent and ambient mode [deepwiki]. Swarm coordination: multiple agents collaborate in the same repository with automatic file-conflict resolution, direct messages/broadcasts, and recursive swarm spawning where agents act as coordinators [deepwiki]. Self-development loop: rebuild, test, and hot-reload its own binary, modifying its own source code and continuing work across sessions automatically [deepwiki]. TypeScript SDK (`@1jehuang/jcode-sdk`): `launch()` for isolated instances, `connect()` for automating running instances, structured output with JSON schema validation and corrective retries, event streaming for live UIs [deepwiki].
- **web**: "The most RAM efficient harness" [ddgs GitHub]. Session resume supported for codex, claude code, opencode, and pi [ddgs GitHub]. Skills are not all loaded on startup; the conversation is embedded as a semantic vector and skills are auto-injected on embedding hits similar to memories [ddgs GitHub]. ~18.2k stars, primarily Rust, native iOS application coming soon [ddgs SkillsLLM].
- **code**: TypeScript SDK (`@1jehuang/jcode-sdk`) implements stable protocol v1 boundary between jcode runtime and clients, communicating NDJSON over the harness API; ships bundled in the released binary so SDK consumers do not need a Rust toolchain [grep_app 1jehuang/jcode]. Third-party adoption: onecli uses it as a sandbox-supervisor harness with bundled binary pinning and auto-update suppression [grep_app onecli/onecli]. BennyKok/omg.dev runs long-lived JCode sessions through the official SDK backend [grep_app BennyKok/omg.dev].

## worker 报告原文：Prime Agent（caps17#25）

### Prime Agent
- context7:
  1. 提供 SDK 与 CLI，支持交互式、非交互式、管道输入及多 provider/模型切换 [context7]
  2. AI 工具包支持跨 provider 会话内 handoff、自动模型发现、token/成本追踪、上下文持久化 [context7]
  3. ACP 协议通过 `_meta` 信封暴露子 agent 状态，支持会话级 MCP server 与子 agent 扇出 [context7]
- deepwiki: 无收录
- web: 无结果 (搜索工具额度耗尽)
- code:
  1. 被第三方工具链（OmniRoute、DeepSpark）识别为「self-improving RLM coding harness」，支持 OpenAI/Codex 兼容路由 [single-source, grep.app]
  2. 运行时使用 IPython kernel + forkserver，具备孤儿进程日记与父进程死亡轮询的进程隔离机制 [single-source, grep.app]

## worker 报告原文：Claude Code（caps17#27）

### Claude Code
- **context7**: Plugin architecture with 5 component types (Commands, Agents, Skills, Hooks, MCP Servers) each with distinct activation lifecycle [context7: /anthropics/claude-code]. Agent creation system prompt enforces structured JSON output (`identifier`, `whenToUse`, `systemPrompt`) and project-specific `CLAUDE.md` context awareness [context7: /anthropics/claude-code]. Code explorer agent uses on-demand progressive discovery (Glob/Grep/LS/Read) — no pre-indexing [context7: /anthropics/claude-code]. Multi-component workflow command chains static analysis → deep review agent → standards skill → report template [context7: /anthropics/claude-code].
- **deepwiki**: Nested subagents up to depth 3; dynamic background workflows via `/workflows`; Agent Teams (research preview) [single-source: DeepWiki]. SSE keepalive pings for long-thinking idle timeout resilience; auto-compaction with clear fallback guidance; session state preservation across restarts/updates including background processes and worktrees [single-source: DeepWiki]. Sandbox security: strict network allowlisting + dangerous-flag filtering (`--force`, `--amend`) requiring explicit permission [single-source: DeepWiki]. Plugin ecosystem: commands, specialized agents, skills, hooks from local dirs or marketplace [single-source: DeepWiki]. IDE integration (VS Code resizable panels, session groups), remote control (mobile/web), screen reader mode [single-source: DeepWiki].
- **web**: Cowork feature — extends agent capabilities to non-coders with local folder access and parallel task queuing [tavily: the-decoder.com]. Agent Skills as cross-ecosystem reusable workflows (not Code-only) for domain-specific expertise [tavily: tessl.io / platform.claude.com]. "Turn issues into PRs" — full GitHub/GitLab workflow integration (issue → code → tests → PR) from terminal [tavily: claude.com]. Agentic search for codebase understanding without manual context file selection [tavily: claude.com]. Anthropic strategic vision: coding agents as "universal everything agents" where code execution is the core integration mechanism [tavily: cobusgreyling.substack.com].
- **code**: Third-party ecosystem integration: NousResearch/hermes-agent consumes Claude Code credentials (`~/.claude.json`); AutoGPT embeds `ClaudeCodeBlock` for E2B sandbox execution; OpenDesign lists Claude Code as primary supported agent alongside Codex/Cursor/Gemini [mcp__grep_app_github_searchgithub]. `claude-code-history-viewer` and `oh-my-claudecode` (32.6k stars) extend session management and orchestration around Claude Code [mcp__grep_app_github_searchgithub].


## worker 报告原文：OMO（caps17#28）

### OMO (oh-my-opencode)

- **context7**: [verified] 主仓库实际演进为 `oh-my-openagent`（8012 snippets, Benchmark 80.62）。多模型编排：Claude、GPT、Kimi、GLM、Gemini 等并行调度。LSP 全 IDE 能力（hover、go-to-definition、find-references、rename、code-actions）。AST-Grep 结构化搜索替换覆盖 25 种语言。内置 MCP 套件：Context7 文档查询、Exa 网页搜索、grep.app 代码搜索；skills 可携带自有 MCP server。 [Source: `/code-yeongyu/oh-my-openagent` 8012 snippets, Benchmark 80.62]
- **deepwiki**: [verified] 多智能体编排：`sisyphus` 主协调器 + `hephaestus` 深度专家 + `oracle`/`librarian`/`explore` 并行执行。`ultrawork`/`ulw` 为主要自主模式。skills 可内嵌 MCP（task-scoped）。 [Source: DeepWiki `code-yeongyu/oh-my-opencode` / `oh-my-openagent`]
- **web**: [verified] OpenCode 社区插件（非官方）。PyPI 发布 `py-code-agent-omo`。官方站点 `omo.dev`。关键词 `ultrawork`（或 `ulw`）触发多智能体协作。 [Source: DDGS `oh-my-opencode OMO coding agent features capabilities`]
- **code**: [verified] 仓库别名体系：`oh-my-opencode`、`oh-my-openagent`、`@code-yeongyu/oh-my-opencode` 均被识别为同一插件包。中文社区翻译/安装脚本存在（OpenCodeChineseTranslation）。Olares 官方文档将其列为 OpenCode 多智能体工作流用例。 [Source: `mcp__grep_app_github_searchgithub` `code-yeongyu/oh-my-opencode`]

## worker 报告原文：Grok Build 第二次（caps17#26）

### Grok Build
- **context7**: Subagent system with concurrency control (sampling_limit up to 32), type toggle switches, and per-type model routing [context7 /xai-org/grok-build]. Custom subagent roles definable via TOML with dedicated capabilities, models, and prompt files [context7 docs]. `spawn_subagent` API supports background execution, isolation levels (`none`/`worktree`), and `resume_from` for conversation continuation [context7 docs]. ACP architecture: JSON-RPC over stdio with Session Manager + Tools Registry + MCP Servers [context7 docs]. Capability Modes: four-tier permission system (`read-only`, `read-write`, `execute`, `all`) [context7 docs].
- **deepwiki**: Comprehensive toolset: file operations, shell execution, web search/fetch, subagent management, memory search, and `AskUserQuestionTool` for structured user queries without full plan mode [deepwiki xai-org/grok-build]. Agent definitions use Markdown + YAML frontmatter with minijinja templating, supporting `allowlist`/`denylist` tool control and behavioral policies (`permissionMode`: acceptEdits/plan/dontAsk/default) [deepwiki]. Auto-discovers `AGENTS.md`, `Claude.md`, `SKILL.md` — imports rules/skills from Claude/Cursor ecosystems [deepwiki]. Session management: automatic save/resume, scrollback with inline diffs, full-replace compaction strategy [deepwiki]. Three operation modes: Interactive TUI, Headless (plain/json/streaming-json), and ACP IDE embedding [deepwiki].
- **web**: Plan Mode blocks edits until user approves step-by-step strategy [ddgs → theaidude.net]. 8 parallel sub-agents with Arena Mode automated evaluation [ddgs → sdd.sh]. Local-first privacy model: zero codebase data sent to xAI servers [ddgs → sdd.sh]. SWE-bench Verified 70.8% at $0.20/M tokens; pricing $1 input/$2 output per 1M tokens [ddgs → sdd.sh, tokencost.app]. `/goal` command for long-running autonomous execution with built-in verification [ddgs → thenews92.com]. Headless JSON mode with durable CLI sessions resumable on follow-up [ddgs → teamday.ai].
- **code**: No direct Grok Build code found; `spawn_subagent` pattern search returned implementations from unrelated repos (openhuman, zeroclaw, ironclaw, codex) [single-source].


## 主会话补漏：DeepCode（caps17#2/#18 均因 workpool yield bug 失败，由主会话手动四路）

### context7 resolve
Available Libraries:

- Title: DeepCode
- Context7-compatible library ID: /hkuds/deepcode
- Description: DeepCode is an open agentic coding system that utilizes multi-agent AI to transform ideas, research papers, and natural language into high-quality, production-ready code, including complex algorithms, frontend, and backend development.
- Code Snippets: 1132
- Source Reputation: High
- Benchmark Score: 68.33

### context7 query-docs（节选）
### Execute a verify-loop

Source: https://github.com/hkuds/deepcode/blob/main/docs/guide/goals-and-headless.md

Run a goal repeatedly until a test command passes or the token budget is exhausted.

```console
deepcode loop "keep calc.add working while refactoring" \
    -w ./myproj -t "python -m pytest -q" --token-budget 200000
```

--------------------------------

### Run a Durable Goal

Source: https://github.com/hkuds/deepcode/blob/main/docs/HEADLESS_AND_AUTOMATION.md

Execute long-running goals or resume them headlessly, optionally specifying test commands for verification.

```console
deepcode loop "Implement the requested feature and verify it"
```

```console
deepcode loop "Implement the requested feature" \
  --test-cmd "python -m pytest -q"
```

```console
deepcode loop --resume <session-id>
```

### Goals, automation, and headless runs > Goals — an objective the session keeps

Source: https://github.com/hkuds/deepcode/blob/main/docs/guide/goals-and-headless.md

A goal is a durable objective that persists across turns, interruptions, and session resumes. The agent reports progress against the goal rather than just responding to individual messages. Users can manage goals using subcommands like show, edit, pause, resume, and wait, and the agent automatically closes the goal once it determines the work is complete.

--------------------------------

### News > Agent Capabilities

Source: https://github.com/hkuds/deepcode/blob/main/README.md

DeepCode agents now suppor

### DeepWiki ask_question（节选）
DeepCode is a coding agent designed for real software engineering tasks, offering a unified experience across CLI and Desktop interfaces . Its main capabilities and advantages stem from its layered architecture, robust session handling, extensible hook system, and several unique features that enhance control, durability, and verification  .

## Architecture
DeepCode employs a layered, multi-process architecture that decouples the `Agent Kernel` from `Application Services` and the `Interface Layer` .

### Process Boundaries
In Desktop mode, DeepCode operates across three primary process boundaries:
1.  **Interface Process**: Handles the user interface (React/TypeScript UI) and a Rust RPC Bridge .
2.  **Application Server Process**: Manages services like `TurnService` and `ThreadService` via JSON-RPC 2.0, and uses an SQLite projection for mapping .
3.  **Agent Kernel**: Contains the `AgentRunner`, `AgentHook Pipeline`, `ToolRegistry`, and `AgentSession` .

The CLI, however, collapses these into a single process that directly invokes the Application Services .

### Core Components
*   **Agent Kernel (`AgentRunner`)**: The `AgentRunner` in `core/agent_runtime/runner.py` is the core of DeepCode, implementing a tool-using execution loop that manages LLM interaction with the local environment . It is stateless regarding long-term history and operates on an `AgentRunSpec` for a single turn .
*   **Event-Sourced Communication (`AgentSession`)**: The `AgentSession` in `core/events/session.py` bridges the kernel and the outside world, consuming `Op` submissions and emitting `Event` messages for real-time telemetry .
*   **Application Services**: This layer manages durable entities, including `TurnService` for orchestrating turn execution and `SessionRuntimeRegistry` for managing live `AgentSession` instances .
*   **Dual-Persistence Strategy**: DeepCode uses `SessionStore` (JSONL) as the source of truth for conversation history and a `SQLite Projection` for fast querying and metadata management .

## Session Handling
DeepCode provides durable sessions that are stored locally and linked to their original project . This allows users to start DeepCode from any directory, find previous projects and sessions, and continue work seamlessly between CLI and Desktop . A session stores not just chat text, but also tool calls, permission decisions, goals, model configuration, and verification records .

Key aspects of session handling include:
*   **Resumability**: Sessions can be resumed, restoring not only what the agent said but also what it did, including tool calls and their results .
*   **Concurrency Control**: Each session has one live writer, enforced by an OS lock, preventing crashes when multiple interfaces (Desktop and CLI) access the same session  .
*   **Context Management**: Project rules, persistent memory, Skills, and long-conversation compaction help the agent maintain context throughout complex work . Context pressure is measured based on the provid

### tavily web（DeepCode 查询结果摘录）
- Introducing DeepCode by HKUDS: AI-Powered Coding Platform | Mrugendrasinh Rahevar posted on the topic | LinkedIn
  https://www.linkedin.com/posts/mrugendrasinh-rahevar_github-hkudsdeepcode-deepcode-open-activity-7364892599897276417-3TbI
  Excited to share DeepCode by HKUDS—an open-source AI-powered platform for agentic coding!  The key features are: 1. Paper2Code: Effortlessly converts complex algorithms from research papers into high-quality, production-ready code, accelerating algorithm reproduction. 2. Text2Web(Automated Front-End Web Development): Translates plain textual descriptions into fully functional, visually appealing front-end web code for rapid interface creation. 3. Text2Backend(Automated Back-End Development): [...] The Chrome DevTools MCP server adds debugging capabilities to your AI agent. chrome-devtools-mcp
- GitHub - HKUDS/DeepCode: "DeepCode: Open Agentic Coding (Agent Harness & Loop Engineering & Multi-Agent Orchestration)" · GitHub
  https://github.com/HKUDS/DeepCode
  DeepCode is not designed to make an Agent look busier. It is designed to help you finish real software engineering work more reliably.

## Core capabilities

DeepCode provides a complete local Coding Agent workflow. CLI and Desktop are two ways to use the same Agent, Sessions, models, Skills, permissions, and task state.

DeepCode Agent Harness and verification loop

### Work directly in your repository [...] Skills turn team conventions, domain knowledge, review methods, and repeated workflows into reusable Agent capabilities. DeepCode includes pinned upstream Skills for authoring, review, se
- DeepCode - Open Source Multi-Agent Text-to-Code Overview
  https://www.youtube.com/watch?v=WzjG8EIVPAE
  Evaluation of HKUDS/DeepCode, an ambitious "Open Agentic Coding" platform originating from The University of Hong Kong's Data Intelligence Lab. This system is designed to automate complex code generation by leveraging a multi-agent AI framework, translating high-level concepts into production-ready software. Key features include Paper2Code for converting research papers into code, Text2Web for front-end development, and Text2Backend for server-side logic, all aimed at streamlining the software [...] analyst. Its whole job is to solve that classic vague stakeholder request problem that every de
- DeepCode: Open Agentic Coding
  https://arxiv.org/html/2512.07921v1
  | Code Generation Agent | Synthesizes executable source code based on the architectural plan and retrieved references. It implements functional interfaces and integrates distinct modules into a cohesive codebase. |
| Automated Validation Agent | Executes a rigorous quality assurance loop. It performs static analysis, generates unit tests, and iteratively debugs the codebase to verify functional correctness and adherence to specifications. | [...] | command\_executor | A runtime environment interface permitting the execution of shell commands (e.g., pytest, pip install). It establishes a feedba
- DeepCode download | SourceForge.net
  https://sourceforge.net/projects/deepcode-agentic.mirror
  DeepCode is an agentic coding platform built around a multi-agent architecture that turns high-level inputs, including research papers, documents, and natural-language requirements, into working software artifacts. It positions itself as an “open agentic coding” system that can handle tasks like paper-to-code reproduction, frontend generation, and backend implementation by decomposing problems into structured steps and coordinating specialized agents. The system description highlights an [...] highlights an orchestration layer that plans, assigns subtasks, and adapts strategies as complexity c

### grep.app code：repeat_guard 等（见下方「borrowed from dsh」专项）


## 主会话补漏：Reasonix web（tavily 结果摘录）
- GitHub - esengine/DeepSeek-Reasonix: DeepSeek-native AI coding agent for your terminal. Engineered around prefix-cache stability — leave it running.
  https://github.com/esengine/deepseek-reasonix
  Config-driven. Providers, the agent, enabled tools, and plugins are all declared in `reasonix.toml`. No hardcoded models.
 Multi-model & composable. DeepSeek ships as a preset; any OpenAI-compatible endpoint is a config entry, not new code. Optionally run two models together (executor + planner) in separate, cache-stable sessions. [...] | Makefile | Makefile |  |  |
| README.md | README.md |  |  |
| README.zh-CN.md | README.zh-CN.md |  |  |
| REASONIX.md | REASONIX.md |  |  |
| SECURITY.md | SECURITY.md |  |  |
| dev | dev |  |  |
| go.mod | go.mod |  |  |
| go.sum | go.sum |  |  |
| prod\_fas
- Reasonix is a terminal-based AI coding agent built specifically for DeepSeek, designed to keep token costs low through stable prefix caching across long sessions. - DeepSeek-only, engineered around byte-stable prefix-cache mechanics - 99.82% cache hit rate in a real single-day workload - ~$12 cost instead of ~$61 on the same workload without cache - Top-3 in LLM velocity on Oosmetrics, with active Discord community
  https://www.threads.com/@githubprojects/post/DYrmTDplBUE/reasonix-is-a-terminal-based-ai-coding-agent-built-specifically-for-deep-seek?hl=en
  93

3

5

Log in or sign up for ThreadsSee what people are talking about and join the conversation.
Log in with username instead [...] # Thread

6.4K views

githubprojects's profile picture

githubprojects

Reasonix is a terminal-based AI coding agent built specifically for DeepSeek, designed to keep token costs low through stable prefix caching across long sessions.

- DeepSeek-only, engineered around byte-stable prefix-cache mechanics - 99.82% cache hit rate in a real single-day workload - ~$12 cost instead of ~$61 on the same workload without cache - Top-3 in LLM velocity on Oosmetrics, wit
- DeepSeek-Reasonix download | SourceForge.net
  https://sourceforge.net/projects/deepseek-reasonix.mirror
  DeepSeek Reasonix is a DeepSeek-native AI coding agent designed for terminal-based software development. It is built around prefix-cache stability, which helps reduce token costs during long sessions and allows users to leave the agent running across extended workflows. Reasonix includes a coding mode with filesystem and shell tools, a lighter chat mode, one-shot task execution, health checks, session utilities, and project-scoped memory. It supports reviewed SEARCH/REPLACE edits, plan mode, [...] edits, plan mode, MCP servers, web search, hooks, skills, semantic indexing, transcript replay, e
- reasonix - AI Agents on GitHub | SkillsLLM
  https://skillsllm.com/skill/reasonix
  reasonix is an open-source ai agents skill for AI coding assistants such as Claude Code, Codex CLI, and ChatGPT, built by esengine. DeepSeek-native AI coding agent for your terminal. Engineered around prefix-cache stability — leave it running. It has 378 GitHub stars.

### Is reasonix safe to use? [...] Discover and explore open-source AI skills for Claude Code, Codex CLI, and ChatGPT.

### Categories

### Resources

### Site

# reasonix

by esengine

DeepSeek-native AI coding agent for your terminal. Engineered around prefix-cache stability — leave it running.

`# Add to your Claude Code skil
- DeepSeek Reasonix: What Builders Should Know - Verdent Guides
  https://www.verdent.ai/guides/deepseek-reasonix
  Reasonix is an open-source, MIT-licensed terminal coding agent designed natively around DeepSeek's API. Its distinguishing feature is a cache-first loop engineered around DeepSeek's prefix-cache stability, aimed at keeping token costs low across long sessions. It defaults to DeepSeek-V4-Flash with per-turn or per-session escalation to V4-Pro, supports MCP natively, includes a plan mode, and ships both a CLI and a prerelease desktop client. It's a community project listed in DeepSeek's [...] Reasonix is an open-source, MIT-licensed terminal coding agent designed exclusively around DeepSeek's AP

## 主会话补漏：Prime Agent web（tavily 结果摘录）
- Prime Agent: A Self-Improving RLM Harness | alphaXiv
  https://www.alphaxiv.org/abs/2608.23552
  View Paper
PrimeIntellect-ai/prime-agent

## From the authors

View full on X

Prime Intellect

Prime Intellect@PrimeIntellect

Introducing Prime Agent:

A self-improving RLM harness for coding and long-running autonomous tasks.

Designed to be both token-efficient and expressive through programmatic tool calling, context as a variable, multi-agent messaging, and a self-modifiable harness state.

Prime Intellect

Prime Agent is a general-purpose coding harness [...] Prime Agent is introduced as a standardized, open-source RLM (Recursive Language Model) harness designed to provide a robust "com
- Prime Agent: A self-improving RLM agent - Prime Intellect
  https://www.primeintellect.ai/blog/prime-agent
  Today, we are launching Prime Agent, our self-improving coding harness designed around two abstractions, the Recursive Language Model (RLM) [citation] and Continual Harness [citation]. Modern harness designs were built around the capabilities of earlier generations of models, and they do not reflect what frontier models can do today: fixed tool-calling schemas and context compaction force the model to work around its own scaffolding instead of leveraging it. Static, hand-engineered sub-agents, [...] Prime Agent's harness state lives in the persistent IPython kernel as `rlm.harness`, immediatel
- Paper page - Prime Agent: A Self-Improving RLM Harness
  https://huggingface.co/papers/2608.23552
  Prime Agent raises ARC-AGI-3 RHAE Best@1 from 30% to 95.5% and matches or exceeds native and popular harnesses across long-context coding, GPU-kernel generation, emulator construction, and autonomous nanoGPT speedruns. On Factorio, we find refinement allows for continuous technology progression and dedicated subagents enable parallelized work. Code is available at [...] ## Abstract

Prime Agent is an open-source harness that uses recursive subagents, persistent computation, and agent-to-agent coordination to extend language models' long-horizon capabilities across coding and reasoning tasks.


- Prime Intellect on X: "Introducing Prime Agent: A self-improving RLM harness for coding and long-running autonomous tasks. Designed to be both token-efficient and expressive through programmatic tool calling, context as a variable, multi-agent messaging, and a self-modifiable harness state." / X
  https://x.com/PrimeIntellect/status/2085086999267144083
  Aug 7

  Read the full blog

  @PrimeIntellect

  Prime Intellect

  @PrimeIntellect

  Aug 7

  [Prime Agent: A self-improving RLM agent

  Today, we are launching Prime Agent, our self-improving coding harness designed around two abstractions, the Recursive Language Model (RLM) [citation] and Continual Harness [citation]. Modern harness...](/i/article/2085612369154281546)
 @botirkhaltaevv

  Botir Khaltaev

  Modal

  Aug 5

  I can’t believe my eyes. At the eod it was a harness problem [...] Aug 5

  Prime Agent is a general-purpose coding harness On ARC-AGI-3, it scores 95.5%, surpassing t
- PrimeIntellect-ai/prime-agent: A self-improving RLM agent for coding ...
  https://github.com/PrimeIntellect-ai/prime-agent
  ## Repository files navigation

Prime Intellect

### Prime Agent: A Self-Improving RLM Harness

Documentation • Verifiers • PRIME-RL

CI   Build Binaries   arXiv

PrimeIntellect-ai%2Fprime-agent | Trendshift

Prime Agent is an open-source coding and research agent for general and long-running work. It is designed around two core abstractions: [...] ```
@article karten2026prime title{Prime Agent: A Self-Improving RLM Harness}{} author{Karten, Seth and Zhang, Alex L. and Thomas, Kevin and Müller, Sebastian and Bakouch, Elie and Auras, Daniel and Senghaas, Mika and Obeid, Fares and Dunas, Konstan

## 主会话补漏：goose code（grep.app subrecipes，节选）
Repository: aaif-goose/goose
Path: documentation/src/pages/recipes/data/recipes/rpi-research.yaml
URL: https://github.com/aaif-goose/goose/blob/main/documentation/src/pages/recipes/data/recipes/rpi-research.yaml
License: Apache-2.0

Snippets:
--- Snippet 1 (Line 5) ---
description: "Research and document codebase for a specific topic using parallel sub-agents"

instructions: |
  **CRITICAL: THIS IS A STRUCTURED WORKFLOW. FOLLOW THESE STEPS EXACTLY IN ORDER.**
  **DO NOT improvise. DO NOT skip steps. DO NOT use tools outside this workflow.**
  **YOU MUST use the subrecipes (find_files, analyze_code, find_patterns) - they are your sub-agents.**

  ## YOUR ONLY JOB: DOCUMENT THE CODEBASE AS IT EXISTS TODAY
  - DO NOT suggest improvements or changes
  - DO NOT critique the implementation
  - ONLY describe what exists, where it exists, and how it works


--- Snippet 2 (Line 27) ---

  ### STEP 3: SPAWN PARALLEL SUBRECIPES (REQUIRED)
  You MUST call these subrecipe tools to do the research:

  - **find_files**: Find WHERE files and components live
  - **analyze_code**: Understand HOW specific code works
  - **find_patterns**: Find examples of existing patterns

  Call multiple subrecipes in parallel. Example:


Repository: aaif-goose/goose
Path: documentation/src/pages/recipes/data/recipes/openapi-to-locust.yaml
URL: https://github.com/aaif-goose/goose/blob/main/documentation/src/pages/recipes/data/recipes/openapi-to-locust.yaml
License: Apache-2.0

Snippets:
--- Snippet 1 (Line 51) ---
    default: "true"
    description: "Whether to include authentication handling in tests"

sub_recipes:
  - name: analyze_openapi
    path: "./subrecipes/analyze-openapi.yaml"
    values:
      analysis_depth: "comprehensive"

  - name: generate_task_sets
    path: "./subrecipes/generate-task-sets.yaml"

  - name: generate_locustfile
    path: "./subrecipes/generate-locustfile.yaml"

  - name: generate_support_files
    path: "./subrecipes/generate-support-files.yaml"

extension

## 主会话核验：openinterpreter harness 仿真（grep.app，repo 级源码直证）

查询：`{"query": "harness", "repo": "openinterpreter/openinterpreter"}`，输出摘录：

```
Repository: openinterpreter/openinterpreter
Path: codex-rs/tools/src/harness.rs
License: Apache-2.0

#[derive(Debug, Clone, Eq, PartialEq, Default)]
pub enum Harness {
    #[default]
    Native,
    ClaudeCode,
    ClaudeCodeBare,
    DeepSeekTui,
    ...
    Terminus2,
    Minimal,
    Other(String),
}

impl Harness {
    pub fn from_config_name(name: Option<&str>) -> Self {
        match name {
            None | Some("") => Self::Native,
            Some("claude-code") => Self::ClaudeCode,
            Some("claude-code-bare") => Self::ClaudeCodeBare,
```

```
Path: codex-rs/core/src/harness/request.rs

//! chat-completions harness emulation.
//!
//! `client.rs` resolves a [`ChatHarnessRoute`] and calls
//! [`build_chat_harness_request`]; everything harness-specific — guidance
//! injection, per-harness request building, and response-stream
//! postprocessing — lives here. Adding a chat harness means adding a route
//! arm in this module, not editing the client.
```

```
Path: codex-rs/core/src/harness/guidance.rs

pub(crate) fn guidance_for_harness(harness: &Harness) -> Option<&'static str> {
    match harness {
        Harness::KimiCli => Some(KIMI_CLI_GUIDANCE),
        Harness::Native
        | Harness::ClaudeCode
        | Harness::ClaudeCodeBare
        | Harness::DeepSeekTui
        | Harness::KimiCode
        | Harness::LittleCoder
        | Harness::MiniSweAgent
        | Harness::Minimal
        | Harness::OpenCode
        | Harness::Pi
        | Harness::QwenCode
        | Harness::SweAgent
        | Harness::Terminus2
        | Harness::ZCode
        | Harness::Other(_) => None,
    }
}
```

```
Path: codex-rs/core/src/harness/routing.rs

pub(crate) enum MessagesHarnessRoute {
    ClaudeCode,
    ZCode,
}

/// Which claude-code tool/prompt surface a non-Messages wire should shape.

pub(crate) enum ChatHarnessRoute {
    DeepSeekTui,
    KimiCode,
    KimiCli,
```

另见 `codex-rs/app-server/src/interpreter_catalog.rs`（`InterpreterHarness` / `HarnessDefinition { id, label, description, wire_apis }`）与 `codex-rs/tui/src/chatwidget/model_popups.rs`（`HARNESS_SELECTION_VIEW_ID`）。

## 主会话核验：DeepCode 多模块自证 borrowed from dsh（grep.app）

查询：`{"query": "borrowed from dsh", "repo": "HKUDS/DeepCode"}`，输出摘录（文件头 docstring 原文）：

`core/agent_runtime/repeat_guard.py`:

> """Advisory repeat-call reminders — a soft loop-breaker, not a circuit breaker.
>
> Borrowed from dsh's ``repeat-tool-reminder`` guard. The tracker watches the
> stream of tool calls for runs of consecutive calls to the same tool with
> identical canonicalized arguments, and at configured run lengths returns an
> escalating reminder for the runner to inject as a user-visible message. It
> never delays, rewrites, or blocks a call ...

`core/agent_runtime/pruner.py`:

> """Model-free middle-pruning of oversized tool results (dsh's pruner).
>
> Borrowed from dsh's ``compaction-tool-result-pruner``: before spending a
> model round-trip on a summarization pass, land a free reduction by cutting
> the MIDDLE out of every oversized tool result ...

`core/harness/agents/structured_result.py`:

> """Structured sub-agent results via a forced capture tool.
>
> Borrowed from dsh's in-process subagent providers, which implement the
> ``outputSchema`` capability "with a forced capture tool" ...

`core/harness/agents/external_backend.py`:

> """External CLIs (Codex, Claude Code) as one-shot sub-agent backends.
>
> Borrowed from dsh's ``subagent-codex`` / ``subagent-claude-code`` provider
> contracts ...

`tests/test_repeat_call_reminder.py`:

> """Advisory repeat-call reminders (``core.agent_runtime.repeat_guard``).
>
> The contract under test, borrowed from dsh's repeat-tool-reminder guard: ...

`tests/test_manual_compact.py`:

> """Manual `/compact` — on-demand summarization of resident context.
>
> The contract under test, borrowed from dsh's `/compact` command: ...

`tests/test_tool_call_timeout.py`:

> """Per-tool declared timeouts (``Tool.timeout_s``) enforced by the runner.
>
> The contract under test, borrowed from dsh's tool-call timeout policy: ...

`tests/test_tool_result_pruner.py`:

> """Model-free tool-result pruning and prefix-aligned summarization (dsh ⑥).
>
> The contract under test, borrowed from dsh's compaction-tool-result-pruner
> and its prefix-cache-reuse note: ...

`tests/test_external_subagent_backend.py`:

> """External CLI sub-agent backends (``core.harness.agents.external_backend``).
>
> The contract under test, borrowed from dsh's subagent providers: ...

`cli/tui/theme.py`:

> """Visual vocabulary for the DeepCode TUI — one place, no magic strings.
> ...
> borrowed from dsh's terminal palette and adapted to DeepCode's own brand: ...

## pi-mono web/code 补路（caps17-1 补充回复，IRC 原文要点）

- tavily 可通（pi-mono 条）：skills 生态、git-checkpoint 扩展每轮 stash 供 /fork 恢复、TerminalBench 排名第二、无内置 MCP（推荐 tmux 多实例）。
- code 路：pi-tui 差分渲染被第三方 zcode-cli 复用（grep.app）。

## 证据边界说明

- worker 报告为子代理采集原文，内部已标注 [context7]/[deepwiki]/[single-source] 等来源标签；DeepWiki 回答是仓库材料的二手综合。
- DeepCode 的 workpool 两次派发（caps17#2、caps17#18）均因 workpool yield 机制 bug 失败，四路由主会话手动补齐。
- claurst web 路：firecrawl 402 + jina Payment Required，未再试 tavily。
- Codewhale、aider 的 DeepWiki 路：仓库未被索引（not found）。
- crush web/code 路初轮失败（firecrawl 402 / grep.app 无匹配），caps17-3 补路回复（IRC 原文）：

> **web (tavily)**：Agent Skills 开放标准支持，文件夹+SKILL.md 自动发现 [tavily: github.com/charmbracelet/crush]；初始化时分析代码库生成 AGENTS.md 上下文文件 [tavily: github.com/charmbracelet/crush]；HN 对比 vs OpenCode：Pros=TUI 好看+diff 窗口信息密度高；Cons=无 Anthropic SSO / 无 Copilot 登录、planning 差（单命令执行非 batch）、速度慢、token 消耗更高 [tavily: news.ycombinator.com]；第三方博客：model-agnostic 是核心卖点，可接本地模型避 vendor lock-in [tavily: grahamhelton.com]
>
> **code (grep_app)**：外部生态已将 crush 作为标准 agent kind 接入：akitaonrails/ai-memory（AgentKind enum 含 Crush）、standardagents/dmux（agent launch 配置含 crush CLI 路径）等；crushrc 实现：Bash 脚本内置命令（provider add / model add / option / mcp add 等），30s loadTimeout 防 hung，.crushrc > crushrc 优先级覆盖，运行时可通过 bash tool 执行配置命令实时改当前 session（不自动写回文件）；自带内置 skill `crush-config` 专门指导 crush 自身配置


## 主会话补漏：Prime Agent 官方博客 pi 血统核验（tavily_extract 原文摘录）

URL: https://www.primeintellect.ai/blog/prime-agent

> ## Acknowledgements
>
> Prime Agent is built on top of `pi`. We thank the authors of `pi` for their valuable work.

同页 benchmark 表将 Pi-mono (w/ sub-agents) 列为对照 harness 之一（OOLONG、LongBenchPro、ManyIH 等）。
