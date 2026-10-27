# ai-memory README 摘录

> Source: https://github.com/akitaonrails/ai-memory
> Collected: 2026-10-27
> Published: Unknown

## 1. 仓库事实

| 项 | 值 |
| --- | --- |
| Stars | 13.9k（精确 13,962；页面当前标签四舍五入显示 14.0k） |
| Forks | 994 |
| Commits | 4,811 Commits |
| License | MIT License |
| About | Solution for long term memory for agent coding CLIs and to facilitate handoff between different agent vendors |

> Long-term memory for AI coding agents. Quit Claude Code mid-task,
> start OpenAI Codex in the same directory, continue without
> re-explaining the architecture, the failed approaches, or the open
> questions.

## 2. Why ai-memory

> Your coding agent probably has a memory feature already. Claude Code takes its
> own notes, Cursor remembers some things, and every platform is adding more. They
> all have the same limits: the notes live on one machine, belong to one agent,
> and drop out of view when you switch tools or hand the work to a teammate.
>
> ai-memory removes those limits.

### It follows you across agents.

**It follows you across agents.** More than twenty harnesses (Claude Code,
Codex, Cursor, Gemini CLI, OpenCode, Grok, Devin, Kimi, Kiro, and others)
feed one shared memory.

### It can carry the session, not just a summary.

**It can carry the session, not just a summary.** Start agents with
`ai-memory run`: quit Claude Code, run `ai-memory run codex`, and Codex gets
the shared workstream plus a private, temporary local projection of Claude's
visible native history for exact details the bounded startup packet omitted.

### It follows you across projects.

**It follows you across projects.** A small profile of how you usually
work (your package manager, test layout, architecture habits) reaches
every new repository at session start, so you stop re-explaining yourself.

### It follows you across machines.

**It follows you across machines.** Memory lives in a server you run, on
the same laptop, a homelab box, or anywhere else, so the project you left
on the desktop is the project you resume on the laptop, with the same
knowledge and the same open questions.

### It works for a team.

**It works for a team.** Point everyone at one server, and what one
person's sessions learn, everyone's agents can retrieve.

### Your memory is plain markdown.

**Your memory is plain markdown.** The source of truth is a git-backed
wiki of ordinary `.md` files: `grep` it, open it in Obsidian, edit it by
hand, `rsync` it.

### It captures the work itself, silently.

**It captures the work itself, silently.** Lifecycle hooks record what
happened (prompts, tool calls, session boundaries), sanitize it at a typed
privacy boundary before anything is stored, and the server consolidates it
into readable pages.

### It ages memory without an LLM.

**It ages memory without an LLM.** Memory decays on a schedule you can
tune per tier, and memory you use decays *slower*: opening a page,
searching it, or reaching it through a link counts as use.

### It can also "dream", if you let it.

**It can also "dream", if you let it.** With an LLM configured, an opt-in
background pass rewrites whole clusters of cold notes into single coherent
pages while you are idle, and cancels as soon as you come back to work.

### It is honest about itself.

**It is honest about itself.** It ships as one self-contained binary.

## 3. How it works

```
capture ──▶ consolidate ──▶ recall ──▶ handoff
 hooks        session-end      search     next agent,
 observe      summaries as     + brief    any harness
 silently     wiki pages       injection
```

Agents emit sanitized observations through lifecycle hooks as you work.
At session end, observations become coherent markdown pages in the
project's wiki (optionally LLM-written; useful even without). The next
session, in any agent on any machine, gets a bounded brief and can search
everything: full-text, entities, links, and (optionally) vectors, fused
into one ranking. Cross-agent handoffs pass the baton explicitly.

## 4. Support matrix

> Every row below is a first-party integration (MCP registration, lifecycle
> hooks, or both) checked by CI. The full matrix with per-agent notes and
> caveats is in [`docs/support-matrix.md`](docs/support-matrix.md).

| Area | Status |
| --- | --- |
| Oh My Pi / OMP | Supported |
| Pi | Supported |
| Linux | Supported |
| macOS | Supported |
| Windows via WSL2 | Supported |

## 5. Coming from another tool?

> carries over from each tool and what you gain:

| Coming from… | What's similar | What you gain |
|---|---|---|
| **Mem0 / fact extractors** (LangMem) | Automatic per-turn capture | Memory compiles into readable **pages** you own and edit, not opaque fact rows; retrieval fuses FTS + entity + graph (+ local vectors) with no cloud API key |
| **Zep / Graphiti** (temporal KG) | Temporal reasoning, typed relations | Bi-temporal-lite (`as_of`, version-filtered search) and typed edges without standing up a graph database, in one binary |
| **mcp-memory-service** (fact rows, SQLite) | SQLite + local embeddings, hook capture, typed edges, honest numbers, and, on 2.4, per-tier decay curves, extractive compression, DBSCAN cold-cluster dedup, access reinforcement, and contradiction flagging | Human-editable markdown **pages** instead of fact-rows, cross-agent claim-once handoffs, and the same aging machinery done **zero-LLM by default, reversibly** (supersede-not-delete + `restore-page`), and **off by default** |
| **basic-memory** (file-first markdown) | Markdown-on-disk as the source of truth | Automatic lifecycle capture and a derived FTS/entity/graph index on top, cross-agent handoffs, and multi-user sharing built in |
| **Claude Code built-in memory** | "Remember my project" convenience, zero setup | Synced across machines and agents, searchable, team-capable, and captures tool lifecycle, unlike a per-laptop `MEMORY.md` |
| **Hindsight / OpenViking** (LLM or VLM in the loop) | Living pages / document memory with a background consolidation loop, plus, on 2.4, belief-strength confidence plus an opt-in LLM "dream" rewrite of cold clusters | A self-contained binary that runs zero-LLM by default and keeps memory in markdown files that are the source of truth, not a mirror; claim-once handoffs; the dream/belief features are **opt-in, off by default, and never delete a source** (vs a mandatory LLM loop) |
| **Supermemory / LiquidLM** (hosted memory API) | A managed second brain with automatic ingestion | Git-versioned markdown you own, no required API spend, offline operation, and per-project team sharing; ai-memory remembers *this repo*, not a general vault |

## 6. Quick start

### Linux and macOS (two commands, no root)

```bash
curl -fsSL https://github.com/akitaonrails/ai-memory/releases/latest/download/install.sh | sh
ai-memory setup
```

`install.sh` downloads the release for your OS and CPU, checks it against the
release's published SHA-256 checksum (it refuses to install without a match),
and links `~/.local/bin/ai-memory`. `ai-memory setup` then creates the data
directory with a bearer token in an owner-only file, starts a per-user service
(systemd `--user` or a launchd LaunchAgent), and wires MCP, hooks and Agent
Skills for every agent it finds, or the ones you name with `--agent`. It shows
the plan, with where it found each agent, and asks first: answer `y`, or type
the numbers of the agents to wire. `--plan` prints the plan and changes
nothing, `--web` shows the plan as a page in your browser and applies the agents
you tick there, `--yes` skips the question, and running it again changes nothing.
Afterwards, restart your agents and ask one of them "What do you remember
about this project?" to see it answer through ai-memory. Details, the environment
variables and how to verify the script before running it are in
[`docs/install.md`](docs/install.md#one-step-native-install-installsh--ai-memory-setup).
An AI agent installing ai-memory for you can follow
[`INSTALL_FOR_AGENTS.md`](INSTALL_FOR_AGENTS.md).

### Docker（`127.0.0.1:49374` 出处）

> The Docker quick-start below has **no authentication**: the container never
> runs `init`, so it starts without a token. The server binds to loopback only,
> so nothing outside the machine can reach it, but local processes and browser
> pages can. …

```bash
# 2. Start the server. `--restart unless-stopped` makes it come back
#    on docker daemon restart and on machine boot (provided your
#    docker service is enabled at boot — `sudo systemctl enable
#    docker` on most distros). Loopback-only bind (`127.0.0.1:49374`)
#    so nothing outside this machine can reach it. Omit the LLM /
#    EMBEDDING lines for zero-LLM mode — FTS5 search still works
#    without any keys.
docker run -d --name ai-memory \
    --restart unless-stopped \
    -p 127.0.0.1:49374:49374 \
    -v ai-memory-data:/data \
```

## 7. Architecture

> One Rust binary runs an MCP/HTTP server and owns one data directory:

```text
<data_dir>/
├── wiki/    # markdown source of truth, git-versioned
├── raw/     # immutable sanitized managed-workstream transcript segments
├── db/      # SQLite indexes, including FTS5, entities, and embeddings
├── models/  # reserved for local embedding models
└── logs/    # rolling tracing output
```

Hooks POST observations to the server. The server serializes writes
through one SQLite writer, compiles session observations into markdown
pages, and serves retrieval through FTS5, entity-match and graph-neighbor RRF,
optional vector RRF, an observation-evidence stream that lifts a session's
page when its captured turns match (on by default), bounded source-authority
adjustment, and bounded raw-observation fallback for non-global searches.

## 8. License

> MIT. See [LICENSE](LICENSE).
