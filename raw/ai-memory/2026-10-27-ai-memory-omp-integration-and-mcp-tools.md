# ai-memory 的 OMP 接入与 MCP 工具摘录

> Source: https://github.com/akitaonrails/ai-memory (docs/install.md; docs/ARCHITECTURE.md; crates/ai-memory-cli/src/commands/install_hooks.rs)
> Collected: 2026-10-27
> Published: Unknown

## 一、`docs/install.md:2263-2336` —「Oh My Pi / OMP」「Pi」「OMP profiles」

### Oh My Pi / OMP

```bash
docker run --rm akitaonrails/ai-memory:latest \
    install-mcp --client omp \
    --server-url "http://homelab:49374/mcp" \
    --auth-token "$TOKEN"

# Extension — write to ~/.omp/agent/extensions/ai-memory-omp.ts.
# If you have the local wrapper installed, prefer `--apply`:
ai-memory install-hooks --agent omp --apply \
    --server-url "http://homelab:49374" \
    --auth-token "$TOKEN"
```

Restart OMP after installing or changing the extension; extensions are
loaded at startup. The ai-memory CLI accepts `--client omp` (or
`--client oh-my-pi`) for MCP and `--agent omp` (or `--agent oh-my-pi`)
for hooks; both target OMP's native `.omp` integration surface.

### Pi

Pi does not read a native `mcp.json`. ai-memory supports Pi through one
generated TypeScript extension at `~/.pi/agent/extensions/ai-memory-pi.ts`; the
same file captures lifecycle events and bridges ai-memory's HTTP MCP tools into
Pi with `pi.registerTool`. When `PI_CODING_AGENT_DIR` is set (it relocates
Pi's whole `~/.pi/agent` home), the extension is written to
`$PI_CODING_AGENT_DIR/extensions/ai-memory-pi.ts` instead.

The Pi and OMP extensions use distinct filenames (`ai-memory-pi.ts` and
`ai-memory-omp.ts`) so installing one never overwrites the other. They are
not interchangeable: only Pi's bridges MCP tools.

#### OMP profiles

`omp --profile <name>` relocates OMP's agent home to
`~/.omp/profiles/<name>/agent`. Point the installers at the same profile so
the extension and MCP entry are installed in that directory:

```bash
ai-memory install-hooks --agent omp --profile work --apply
# Or pass OMP_PROFILE to each installer:
OMP_PROFILE=work ai-memory install-hooks --agent omp --apply
OMP_PROFILE=work ai-memory install-mcp --client omp --apply
```

`--profile` takes precedence over `OMP_PROFILE`. The legacy `PI_PROFILE` is
used only when `OMP_PROFILE` is unset. Names are trimmed and validated using
OMP's rules. An empty environment value, a whitespace-only name or `default`
selects the default profile; an explicit `--profile ""` is rejected.

A named profile ignores `PI_CODING_AGENT_DIR`. The default profile uses it
unless it points to the named profile directory exported by a parent OMP
process. `PI_CONFIG_DIR` changes the `.omp` root relative to your home using
OMP's path-joining rules; it does not replace an explicit agent directory.
The extension and `mcp.json` stay in the agent directory even when sessions
move to XDG storage. See [native adapter behavior](managed-workstreams.md#native-adapter-behavior)
for the session paths.

`uninstall --profile <name>` removes the profile's integration files. It also
checks the default profile and the legacy `~/.omp` locations, including when
`PI_CONFIG_DIR` selects a different root.

```bash
ai-memory install-hooks --agent pi --apply \
    --server-url "http://homelab:49374" \
    --auth-token "$TOKEN"

# `install-mcp --client pi` prints this guidance instead of writing mcp.json:
ai-memory install-mcp --client pi --server-url "http://homelab:49374/mcp"
```

Restart Pi after installing or changing the extension. OMP / Oh My Pi remains
separate and continues to use `.omp` paths.

## 二、`docs/ARCHITECTURE.md:511-518` — 捕获正文上限

Lifecycle bodies have content limits independent of the 10 MiB HTTP request
limit. User prompts and post-compaction summaries are capped UTF-8-safely at
16 KiB; notification and tool excerpts are capped at 2 KB. Native
`ai-memory hook` commands apply the event-specific cap before local spooling
and transport, and the server repeats it when parsing every request so direct
and older clients cannot bypass it. The typed sanitizer boundary then applies a
16 KiB backstop to every durable observation body after redaction. The
separately gated Claude Code assistant/Stop excerpt remains capped at 2 KB.

## 三、`docs/ARCHITECTURE.md:735-766` — MCP 工具表（16 行）

| Tool | Hint | Purpose |
|---|---|---|
| `memory_query` | read-only | FTS5 + entity-match + graph RRF + optional vector RRF + observation-evidence stream (on by default) search, followed by bounded kind/tier/pinned/tag authority adjustment and raw fallback. … |
| `memory_recent` | read-only | Most-recently-updated `is_latest=1` pages. |
| `memory_read_page` | read-only | Fetch the FULL body of a single wiki page by `path` or by top FTS5 hit for a `query`; optional `workspace` + `project` targets a named sibling workspace/project. … |
| `memory_read_session_observations` | read-only | Page through ONE session's raw hook observations (`ObservationRecord` with full sanitized body, capped per row by `body_max_chars`), restricted to the rows that landed in the resolved scope and to sessions the caller may see; `total` and `elided_other_scope` report the in-scope count and the rows the session left in another project. … |
| `memory_status` | read-only | Counts, paths, version, plus the `scope` that answered: `workspace`, `project`, and `resolved_by` (`explicit`, `session`, `shared_slot`, `startup_seed`, `default`, `default_after_mismatch`). Unscoped reads resolved by `startup_seed` or `default_after_mismatch` also log a server warning. |
| `memory_briefing` | read-only | Structured counts/activity/rules/slots/recent snapshot. … |
| `memory_handoff_begin` | destructive | Open an owner-scoped handoff for the next agent; `shared=true` deliberately publishes it to the project. Optional `workspace` + `project` targets a named sibling workspace/project. |
| `memory_handoff_list` | read-only | List open own/shared handoffs with inspectable body and identity fields; does not claim or expire. Root-only `any_owner=true` recovers across operators. Optional `workspace` + `project` targets a named sibling workspace/project. |
| `memory_handoff_accept` | destructive | Fetch + ack an open own/shared handoff. … |
| `memory_handoff_cancel` | destructive | Mark an exact visible open handoff id expired when it was created by mistake; root-only `any_owner=true` recovers across operators. |
| `memory_consolidate` | destructive | LLM-driven page rewrite. … |
| `memory_write_page` | destructive | Write durable wiki knowledge when the user explicitly asks to remember/annotate it. … |
| `memory_delete_page` | destructive | Delete a single page by exact `path`; `scope: "profile"` deletes from the caller's cross-project profile. Fires the admission chain (op=delete); idempotent. Optional `expected_page_id` deletes only if that is still the latest version; otherwise nothing is deleted and the call returns `reason: "precondition_failed"`. |
| `memory_restore_page` | destructive | Admin only, like `/admin/restore-page`. Without `rev`, list the git checkpoints that changed `path`. With `rev`, write that version (body and frontmatter metadata) back through the `memory_write_page` path (sanitizer, admission, slots, supersession), including a deleted page. Project pages only, not `scope: "profile"`. |
| `memory_forget_sweep` | destructive | Retention pass: evict cold pages through the wiki layer, purge aged tombstone ancestry, and hard-delete TTL-expired pages. `dry_run=true` for preview. |
| `memory_lint` | destructive | Rule-based + LLM contradiction findings → `wiki/_lint/`. … |

## 四、`crates/ai-memory-cli/src/commands/install_hooks.rs` — OMP 扩展注释与生成的扩展片段

### 4.1 注释（`:5503-5510`）

```
5503: /// Generate an Oh My Pi extension at `<agent dir>/extensions/ai-memory-omp.ts`
5504: /// (see [`omp_extension_path`]).
5505: ///
5506: /// OMP discovers direct `*.ts` / `*.js` files under its agent dir's
5507: /// `extensions/` at startup, so no separate settings merge is needed. The extension uses OMP's
5508: /// lifecycle API for capture and `before_agent_start` for handoff injection.
5509: fn apply_to_omp_extension(
5510:     server_url: &str,
```

### 4.2 生成的扩展片段（`:6055-6090`）

```
6055:     return text.length > 0 ? text : undefined;
6056:   }} catch (_e) {{
6057:     return undefined;
6058:   }}
6059: }}
6060:
6061: export default function AiMemoryExtension(api: any): void {{
6062:   api.on("session_start", (_event: any, ctx: any) => {{
6063:     startSession(ctx);
6064:   }});
6065:
6066:   api.on("before_agent_start", async (event: any, ctx: any) => {{
6067:     startSession(ctx);
6068:     postHook("user-prompt", {{
6069:       ...sessionPayload(ctx),
6070:       prompt: event?.prompt,
6071:       imageCount: Array.isArray(event?.images) ? event.images.length : undefined,
6072:     }});
6073:
6074:     const id = sessionID(ctx);
6075:     if (!id || handoffChecked.has(id)) return;
6076:     handoffChecked.add(id);
6077:     const handoff = await fetchHandoff(ctx?.cwd ?? "", id);
6078:     if (!handoff) return;
6079:     return {{
6080:       message: {{
6081:         customType: "ai-memory-handoff",
6082:         content: handoff,
6083:         display: false,
6084:         attribution: "agent",
6085:       }},
6086:     }};
6087:   }});
6088:
6089:   api.on("tool_call", (event: any, ctx: any) => {{
6090:     startSession(ctx);
```

## 五、`DATA_HANDLING.md:21-33` — 默认嵌入模型与首次下载

```text
The out-of-the-box default is local embeddings: the config template leaves
`embedding_provider` unset, which selects in-process `local` embeddings
(all-MiniLM-L6-v2, 384-dim) with no API key and no cloud calls. That
default carries one network behavior: on the first start, when the model
files are not already present, the server downloads three files (~87 MB
total, sha256-pinned in source) from `huggingface.co` in the background,
and hybrid search enables on the next restart. Nothing stored is sent; the
transfer is a download, so your host's address and the timing of the
request are visible to Hugging Face and its CDN, and no content goes with
them. To avoid the download entirely, set `embedding_provider = "none"`,
or pre-seed the files offline as
[`docs/airgapped-install.md`](docs/airgapped-install.md) and
[`docs/local-embeddings.md`](docs/local-embeddings.md) describe.
```
