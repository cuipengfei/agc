# Tern 官方文档：Concepts / Guides / Reference / Examples 摘录与调研笔记

> Source: https://docs.stencil.so/tern/ (concepts, guides, reference, examples sections)
> Collected: 2026-10-20
> Published: Unknown

官方文档站每个页面同时以 `.md` 形式发布（`protocol/surfaces.md`、`index.md`），`print.html` 为全书单页版。官方目录页数：Overview 1、Concepts 6、Guides 13、Elements 10、Styles 3、Surface Protocol 9、Examples 7、Scripts 21、Reference 12，合计 82 个内容页面。

本文件分两部分：「逐字摘录」为官方页面原文；「调研笔记」为七个调研线程（ConceptsScout、GuidesScout、ProtocolScout、ScriptsScout、ExamplesScout、ReferenceScout、ElementsScout）对全书逐页阅读后的中文摘要，非逐字。

## 逐字摘录：官方 Glossary（Reference › Glossary）

> Session — A named set of tabs in a window, as `cx.session` reads it; a window can hold several.

> Daemon — The session daemon: the per-user process that owns the panes and runs the host halves for this machine. Windows attach to it.

> Block — A pane whose program is Lua: a block type defined by a plugin's host half and started by the palette, "Open with", a route decision, `cx:new_block` or a workspace. It lives in the daemon's pane table like a shell and draws through the surface protocol.

> Lens block — The block in a shell pane that holds a claimed command's raw output and shows its lens view; Raw shows the output itself.

> Lens — A plugin's native view of a command's output. The manifest's globs claim the command; the host half's `open`, `line`, `finish` and `view` turn the captured lines into a view shown in a lens block.

> Replica — One copy of a pane's screen: the daemon's, each attached window's, iOS's, the web tab's. Only the host runs Lua; replicas learn claims from the catalog and views from the host.

> Catalog — What a host's plugins provide, as data: every plugin's id, name, version, status, block types, lens rules and concatenated styles, plus the folder's problems. The host sends it to every window, iOS and the web tab, so they list block types and make lens claims without running Lua.

> Claim — A lens's decision to take a command line, made by the manifest's `match` globs alone: the first Ready plugin by id, then its first lens in manifest order whose glob matches `program args…`. Claims are declarative so every replica reaches the same decision.

> Window key — The key that names a window's sessions in the daemon; panes see it as `$TERN_WINDOW_KEY`, and `tern` commands pick one with `--window`. A host effect goes to every window with the pane's window key.

> Rehydration — Rebuilding a lens block's state after the worker lost it (reload, daemon restart, eviction): the host replays the block's saved command and raw output through `open`, `line` and `finish` before handling the block's event.

> Budget — The time limit on one call into Lua: 2 s on the host, 50 ms in a window, 4 ms for chrome formatters and `available`. A call that runs past it fails and its hook is disabled until reload.

> VM — One Luau virtual machine: one per plugin on each host (in its worker) and one per plugin in each window. Sandboxed, 256 MiB, budgeted. Nothing is shared between VMs except the data folder.

> Worker — The thread a host runs one plugin's host half on, with its own VM. Workers run in parallel; each handles its plugin's requests, events and callbacks one at a time.

> Effect — A request host Lua makes of the windows showing a pane: a toast, an open, or a clipboard copy. Effects travel from the host to the windows as data.

> Spawn filter — The host `spawn` event: a synchronous handler that may rewrite every process pane's program, arguments, directory and environment before it starts, waited on for at most 50 ms per plugin.

> Chrome — The window around the panes: tab titles, the window title, the status line. Plugins shape it with formatters and CSS.

> Formatter — A pure window function that computes chrome text: `tern.chrome.tab_title`, `window_title` or `status`. It gets a small input table, no `cx`, a 4 ms budget, and its results are cached by input until `tern.chrome.refresh()` or a reload.

> Segment — One item a `tern.chrome.status` formatter adds to the status line: text, optional icon, tone and click action.

> Workspace — A tab layout a window half builds with `cx.layout`, typically from `window_start`.

> Launch — A table describing what a new pane runs: `cwd`, `command`, or `block` with `args`.

> Kind — A block type's full name, `<plugin>.<block>` (`k8s.pods`). Route decisions, `cx:new_block` and `launch.block` take it.

> Frame — One batch of surface protocol ops a block sends: the diff between two views, or raw ops from `cx:frame`. Frames over 64 KiB are chunked.

> Surface — The structured-view layer of a pane's screen that blocks and lens blocks draw into, over the surface protocol.

> View — What a block's `view` or a lens's `view` returns: regions of nodes for a block, one node for a lens.

> Node — One element of a view: `{k = kind, p = props, c = children}`, built with `tern.ui`.

> Span — A run of styled text in a node: `{t = text, s = style?}`.

> Tone — A semantic color name for spans, badges, rows and segments: `accent`, `success`, `warning`, `error`, `info`, `muted`, …

> Dock, layer, main — The three regions of a block's view: `main` is the block's area, `dock` a strip under it, `layer` above it.

> State — A block's value returned by `init`, passed to every handler, persisted through `save`; or a lens capture's value returned by `open`.

> Lens state — The value a lens's `open` returns, kept by the worker for the latest 256 captures per plugin and rebuilt by rehydration.

> Package — A directory with `plugin.toml`, its entries, styles and modules.

> Manifest — `plugin.toml`, schema 1.

> Status — Ready, Disabled or Failed; each half keeps its own.

> Disabled — A plugin status: turned off by the `plugins` or `plugins_disabled` setting. It loads nothing and claims nothing.

> Problem — A plugins-folder entry that is not a usable plugin, with the reason.

> Ready — A plugin status: loaded and running.

> Plugin order — Plugin id order, and within one plugin registration order. Everything plugins take turns at (overrides, routes, formatters, the spawn filter, claims, window events) runs in it.

> Plugins folder — `<config>/plugins/` (`tern plugin dir`), or the Files app's Tern › Plugins on iOS.

> Data folder — `<state>/plugin-data/<id>/`, shared by both halves of a plugin: `tern.plugin.data`, `TERN_PLUGIN_DATA`, home of `kv.json`.

> Link — A `<name>.path` file in the plugins folder naming a package directory elsewhere; `tern plugin link` writes it. Also: a hyperlink clicked in a pane, which `tern.route.link` may take.

> Override — A window handler that runs before a built-in command (`tern.override`); a truthy return skips the built-in.

> Route — A window handler consulted before Tern opens a file (`tern.route.open`) or a clicked link (`tern.route.link`); the first decision wins.

> Command — A palette row. Built-in commands have ids (`split_right`); a plugin registers its own with `tern.command`, named `plugin.<plugin>.<id>`.

> Action — A name the keymap can run: a built-in command id (`new_tab`), a keymap-only action (`palette`, `goto_tab:3`), a view chord (`editor.toggle_comment`), or a plugin action (`plugin.<plugin>.<id>`). `tern.bind` binds chords to actions; status segments run one on click.

> Chord — A key combination as `tern.bind` and `keys` spell it (`cmd+shift+h`), or a sequence of them (`ctrl+a>c`).

> Context — Which half a VM runs: `tern.context` is `"host"` or `"window"`. Each context has its own members.

> cx — The handler context object passed to a handler: an effect cx, a block cx or a window cx, depending on the caller. A window `cx` is valid only during the call that received it.

> Half — One of a plugin's two parts: the host half (`host.luau`) and the window half (`window.luau`). They usually run in different processes, often on different machines; on the same machine they share only the data folder.

> Hook — The name a call into Lua runs under (`pods.view`, `command <id>`, `focus`, `timer`). It appears in failure toasts and is the unit a budget trip disables.

> Disabled hook — A hook whose call tripped its budget: later calls of it in that VM are skipped until the next reload.

> Reload — Dropping a context's VMs and loading every plugin again, after a change in the plugins folder, `tern plugin reload`, or Preferences. Running blocks restart from their last `save`.

> Glob — A pattern with `*` (any run) and `?` (one character). Lens `match` globs are case-sensitive over the command; block `files` globs ignore ASCII case over the file name.

> Role — A string a node or block exposes for CSS: a node's `role` prop becomes `data-role`; a lens block's role is `lens.plugin.<plugin>.<lens>`; a plugin block's surface carries `data-surface="plugin.<plugin>.<block>"`.

> Decision — What a `tern.route.open` or `tern.route.link` handler returns to take over an open or a link: `{block = kind, args?}`, `{url = …}`, `{path = …, how?}` or `{handled = true}`; `nil` declines.

> How — Where a file opens: `default`, `beside` (or `split`), `below`, `tab`, `replace` or `preview`.

> Block cx — The `cx` every block handler receives: effects plus `pane`, `cwd`, `cols`, `rows`, `render`, `save`, `exit`, `frame`, `blob`.

> Effect cx — The `cx` of lens `open` and `event` and of host event handlers; it has only `toast`, `open` and `copy`.

> Window cx — The `cx` of commands, binds, overrides, routes, window events, window timers, process and fetch callbacks: `session`, `layout`, `run`, `open`, `new_block`, `command`, `toast`, `copy`.

> Block type — A `[[blocks]]` declaration plus its `tern.block.define` implementation.

> Lens id — `plugin.<plugin>.<lens>`; a lens block's role is `lens.` followed by it.

> Event — A notification `tern.on` subscribes to. Host events (`command_finished`, `pane_exited`, …) and window events (`focus`, `tab_created`, …) are separate sets.

> Failed — A plugin status: its entry raised or tripped its budget while loading, or left a declared block or lens undefined.

> Region — See Dock, layer, main.

> Sheet — A global style sheet in a window's cascade: a plugin's manifest styles (`plugin:local:<id>:styles`), a `tern.css` sheet (`plugin:local:<id>:<name>`), or a remote host's plugin styles (`plugin:<host>:<id>:styles`).

## 逐字摘录：Reference › Limits（全文为查找表）

> Every fixed cap, timeout and default the plugin runtime applies, with its value and what happens at the edge. None of them are configurable.

- `plugin.toml` size: 64 KiB → Problem `plugin.toml is larger than 64 KiB`
- Manifest schema: `1` → Problem `unsupported schema N`
- Plugin, block and lens ids: `^[a-z][a-z0-9-]{0,31}$` (1–32 bytes)
- Plugin `name`: 1–64 Unicode characters
- Total `styles` size: 256 KiB, after joining
- Plugins per host: 64 valid packages, by id
- Default icon: `puzzle`
- Memory per VM: 256 MiB
- Host call budget: 2 s per call, including running `host.luau` → the hook is disabled in that VM until reload
- Window call budget: 50 ms per call → hook disabled
- Chrome formatters and `available`: 4 ms per call → hook disabled
- Disabled hook: Until the VM is replaced by a reload
- `spawn` filter wait: 50 ms per plugin → that plugin's answer is discarded
- Retiring worker on reload: 3 s to release its blocks
- `cx` request rounds after one call: 8
- Lens capture states per plugin: 256 — finished captures dropped first, least recently used first; a dropped capture is rebuilt from the block's output on its next event
- Lens blocks whose plugin the host remembers: 4096
- `tern plugin reload` wait: 60 s → `the session daemon did not answer`, exit 124
- View tick while the command runs: One `view` per 250 ms per block, and only after new lines
- Captured output per command: 16 MiB → the capture is abandoned; the output stays ordinary terminal text
- A lens view waiting for its block: 5 s
- `tern.parse.json_tree` nodes: 5000
- Built-in lenses also stop at 5000 rows and add `tern.ui.overflow(n)`'s line
- Frame message size: 64 KiB → split into chunks
- Pending input from the pane: 16 MiB
- CSI or SS3 key sequence: 64 bytes
- Chrome formatter cache: 256 inputs per formatter
- Pane and tab ids in Lua: The host's own id below 2^44; a remote host's tag above it
- `tern.process.run` output: 16 MiB per stream
- `tern.fetch` response body: 16 MiB; timeout 30 s unless `timeout_ms`; redirects 10
- `tern.json.encode` nesting: 128 levels; integers exact up to 2^53
- `tern.process` on iOS: Not available
- Change batching: 300 ms; fallback poll interval: 2 s; poll fingerprint depth: 8 directory levels; size: 10,000 entries
- Log file rotation: 16 MiB per file, two old files kept; default filter `warn,stencil=info`

## 逐字摘录：Reference › Events

> The two contexts have separate event sets: host events describe the panes running on one machine and are heard by the host half there; window events describe what one Tern window shows and are heard by the window half in that window.

Host events (6): `spawn`, `command_started` `{pane, line, cwd?}`, `command_finished` `{pane, line, status, took_ms}`, `cwd` `{pane, path}`, `title` `{pane, title}`, `pane_exited` `{pane, status}`.

Window events (11): `window_start`, `focus` `{pane, tab}`, `pane_created` `{pane}`, `pane_closed` `{pane}`, `tab_created` `{tab}`, `tab_closed` `{tab}`, `command_started` `{pane, line}` (no `cwd`), `command_finished` `{pane, line, status, took_ms}`, `cwd` `{pane, path}`, `title` `{pane, title}`, `canvas_action` `{pane, owner, act, node, value?, mods?, text?, title?, about?}`.

> Several events exist in both contexts under the same name. They describe the same thing from different places. … A window half with two windows open hears each window event once per window.

> `command_started`: A shell in a pane on this host began running a command line: the shell's integration reported OSC 133;C. Panes without shell integration never fire it.

> The session queues events as they happen. After each render the window hands the queue to the plugins: for each event in order, every plugin in id order, and within a plugin every handler in registration order. Each handler gets a fresh `cx`.

> `spawn` is not a notification: it is a synchronous filter over every process pane this host is about to start (shells, and panes started with a command). Plugin blocks are not filtered. … The pane waits at most 50 ms for each plugin's answer.

> The web client runs no Lua; its window hears nothing.

## 逐字摘录：Reference › Built-in Actions

> Commands are the palette's rows; actions are the wider set of names the keymap runs, which includes every command.

| Name form | Example | `tern.bind` | `tern.override` / `cx:command` |
| --- | --- | --- | --- |
| Command id | `new_tab`, `layout:rail` | yes | yes |
| Keymap-only action | `palette`, `goto_tab:3`, `text:\e` | yes | no |
| View chord | `editor.toggle_comment`, `sqlite.write` | （表格截断，形式存在） | |
| Plugin command | `plugin.hello.say_hi` | yes | no（rejects） |
| Plugin function bind | `plugin.hello.bind.0` | （由 `tern.bind` 函数式注册产生） | no |

> A window plugin's `tern.command` with id `say_hi` in plugin `hello` becomes the action `plugin.hello.say_hi`. … It is not a built-in command, so `tern.override` and `cx:command` reject it. A function passed to `tern.bind` gets the action name `plugin.<id>.bind.<n>`, `n` counting that plugin's function binds from 0.

> Plugin binds sit above Tern's defaults and the keyboard preset and below the user's `keybinds`. Plugins only add keys: a bind on keys the defaults or preset already bind, or that starts or is started by one of their sequences, is left out.

动作页面逐组列出内置命令（按域分组，如 `notebook.*`、`board.*`、`editor.*` 等），全量名单见原页。

## 逐字摘录：Reference › Command Line

Synopsis：`tern plugin list|reload|dir|install SRC [--force]|remove ID|link DIR|unlink ID|types DIR`，通用 `--json`、`--window KEY`、`--help`。

> `tern plugin` manages the packages in this machine's plugins folder and asks the session daemon to reload them. It works on files and on the running daemon only; it never runs plugin Lua itself. iOS has no command line.

Exit codes：`0` success；`1` verb failed（reload 在新 catalog 有 Failed/problem 时也退 1）；`2` usage error；`124` daemon 60 s 未应答 reload。

> "The daemon" is the session daemon on this machine's socket (`$TERN_DAEMON_SOCKET`, else `daemon.sock` in the runtime or settings directory). `tern plugin` never starts one.

`list` 打印运行中 daemon 的 catalog；无 daemon 时直接读目录与设置，不运行任何 Lua，每个设置允许的包显示 `ready`——window 入口加载失败不会在此显示为 failed。

## 逐字摘录：Concepts › Lifecycle and Reload

> Plugins load when the process that runs them starts, and reload as a whole whenever their folder changes or someone asks. A reload replaces every VM in that context; running blocks carry over through their saved state, and running lens captures finish where they started.

> Both halves start from the same scan of the plugins folder: packages sorted by id, problems set aside, ids turned off by the settings marked Disabled.

> Host halves load when the session daemon starts, before it restores saved panes, so restored blocks find their block types.

> Window halves load when a window is created, after Tern's own style sheets and before the keymap is first applied.

> Wherever plugins take turns (overrides, routes, chrome formatters, the `spawn` filter, lens claims), the order is plugin id order.

Watching 机制表：macOS FSEvents recursive；Linux inotify（package directories up to 8 levels deep）；Windows ReadDirectoryChangesW；iOS 与 watch 失效处 2 s 轮询（8 levels, 10,000 entries）；变化 300 ms 批处理；任何变化重载该上下文全部插件。

> What survives a reload — Running blocks: Moved to the new worker and restarted: `init(cx, args, saved)` runs with the state their `save` returned last. … Running lens captures: Finish on the old worker, under the old code. … Finished lens captures: Their Lua state goes with the old VM; the next event from such a block rebuilds it on the new worker. … Hooks, the `spawn` filter, timers, pending process and fetch callbacks: End with the old VM. … `tern.kv`, files in the data folder: Unchanged.

> Daemon restart: When the daemon starts and finds the state file of one that stopped (quit, crashed, or the machine restarted), it loads plugins first and then restores the saved panes. Shells come back as login shells; a plugin block comes back as the same block type, started from the state its `save` returned last, at its last size, on a blank screen.

> Upgrade in place (Unix): An upgrade hands the daemon over to the new build without ending any program: shells keep their pseudoterminals, screens and scrollback. Plugin blocks have no pseudoterminal: the plugins stop before the handover, their last saved state is kept, and the new daemon starts each block again from it.

> Lens rehydration: Lens state lives only in the worker's VM, for the most recent 256 captures per plugin. A lens block outlives it: after a reload, a daemon restart or upgrade, or once the capture is evicted, the block still holds its command line, working directory, raw output, width and exit status. When such a block sends an event … The worker claims the command against its plugin's `match` globs again; if they still claim it, it runs `open`, then `line` for each line of the saved output replayed at the block's width, then `finish` when the command had finished, and then the event's handler, and sends the new view. If the globs no longer claim the command, nothing runs.

> Preferences › Plugins shows the worse of the host's and the window's status for each local plugin.

## 逐字摘录：Concepts › Architecture（关键段）

> Tern's panes, and the authoritative copy of each pane's screen, live in the session daemon. Windows attach to the daemon and mirror the screens; when a window quits, its panes keep running.

> UI state is different: a window's tabs, focus, palette, keymap, chrome and style sheets belong to that window and are mutated on its UI thread, one event at a time.

> A plugin block is a daemon pane like a shell, except that its program is a Lua table instead of a process.

> A command lens reads a shell command's output and shows a native view in its place. Unlike a block, the pane's output belongs to the shell, and every replica of the pane (the daemon's screen, each window's mirror, iOS, the web tab) parses the same bytes and decides on its own, at the moment the command starts, whether the output becomes a lens block.

> Only the host runs Lua, so the decision cannot depend on Lua. Whether a command gets a plugin lens is decided by the manifest's `match` globs alone, which every replica has from the host's catalog.

> So the host feeds the captured lines to the plugin's worker, and sends the views it produces to every replica as separate messages, at most once per 250 ms per block while the command runs and once when it finishes.

Where each half runs 表：桌面窗口 + daemon → host 在 daemon、window 在窗口；无 daemon 的窗口 → host 在窗口进程 worker 线程；远程 host → host half 在远程机的 daemon（来自远程机的 plugins 目录），本机 window half 适用于所有 pane 含远程；iOS → 不跑 host 入口，window half 解释执行；Web tab → 不跑任何 Lua，收 catalog。

## 逐字摘录：Guides › Command Lenses（关键段）

> A lens turns the output of a shell command into a native view: a table, a chart, a list of diagnostics. The plugin's manifest decides which command lines it claims, and its host half reads the output line by line and returns a view, while Tern keeps the raw output one click away.

认领流程：1. Tern reads the line as a simple command. A line that isn't one stays plain terminal output. 2. It tries the plugins' `match` globs. On a match, the command's output is diverted into a block that the claiming lens reads. 3. Otherwise it asks the built-in lenses, and with no taker the output stays plain terminal output.

命令行解析规则：leading `VAR=value` assignments are skipped；wrapper programs are skipped with their options: `sudo`, `doas`, `exec`, `time`, `nice`, `nohup`, `env`, `command`, `builtin`, `caffeinate`, `npx`, `bunx`, `pnpx`, `uvx`, `pipx`；the program loses its directories；redirections of stderr and stdin are removed。

> Some lines are never lensed, because the output on the screen isn't the program's alone: pipelines (`du -sh * | sort -h`), lists (`clear; du`, `make && du`), stdout redirections (`du > sizes.txt`), subshells, heredocs, and command substitution in the program word.

> A capture that turns interactive (the alternate screen, keypad or mouse modes, a cursor position query) or passes 16 MiB is aborted: the block is dropped and everything captured is replayed into the terminal grid.

关闭粒度表：One block → Switch it to Raw；Every lens, built-in and plugin → Turn off Settings › Terminal › Native command output；One plugin's lenses → Turn the plugin off in Preferences › Plugins (it adds the id to `plugins_disabled` in `settings.json`)；One lens → Narrow or remove its `match` patterns in the manifest; there is no per-lens switch。

## 逐字摘录：Examples › Example Plugins（示例表）

> Seven complete plugins ship in the SDK under `plugins/examples/`.

| Example | What it does | Halves | Surfaces it demonstrates |
| --- | --- | --- | --- |
| Terraform Plans (`terraform`) | Shows `terraform plan` and `tofu plan` as summary badges, diagnostics and resources grouped by action; a click copies an address | Host | Command lens with `match` globs, line-by-line parsing, badge tones, collapsible sections, click actions through the lens `event` cx, role-scoped manifest CSS |
| Review Queue (`review-queue`) | Lists the pull requests waiting for your review, polled from `gh` every two minutes | Host, window | Block with keys, events and saved state; `tern.process.run` with timeouts; `tern.timer` polling; error views; a palette command and key bind that open the block with `cx:new_block` |
| JSON Explorer (`jsonx`) | Browses JSON files as a collapsible tree and copies jq paths | Host, window | File-backed block from `files` globs and launch args; `tern.fs.read` behind a size check; list selection and scrolling; saved state; `tern.route.open` with a switch kept in `tern.kv` |
| Long-Running Commands (`longrun`) | Toasts slow commands as they finish and keeps their history | Host, window | `command_started`/`command_finished` host hooks, toasts, a history block with a live clock, a status segment, a module shared by both halves |
| Directory Variables (`dirvars`) | Loads `.tern-env` files into each new shell's environment | Host | The `spawn` filter and its time limit, `cwd` hooks that hint when the files change, a parser module |
| Project Workspaces (`workspaces`) | Opens the tabs and splits a project describes in `.tern/workspace.json` | Window | `cx.layout:tab` layouts, `window_start`, a `new_tab` override, a status segment, manifest CSS |
| Canvas Dashboard (`canvas-demo`) | Keeps a persistent dashboard with a Refresh action | Window | `cx.canvas` ownership, replica reads, keyed patches and owner-only `canvas_action` handlers |

## 调研笔记（agent 摘要，非逐字）

### ConceptsScout（concepts 章节 5 页）

- manifest 未知键一律报错；插件 id 前缀一切命名（block/lens/命令/样式/数据目录）；`require("tern")` 返回全局表，其余相对包目录解析，越界即失败。
- 两半共享数据目录与 `tern.kv`（kv.json 每次 set 经临时文件+rename 原子改写，跨 VM 按 mtime/长度重读，并发 set 后写者赢）。
- 设置开关：`plugins`（默认 true）与 `plugins_disabled`（默认 []）。
- 样式：manifest `styles` 拼成 `plugin:local:<id>:styles`（≤256 KiB）；远程宿主为 `plugin:<host>:<id>:styles`；window 可运行时 `tern.css`。
- reload 触发：文件变化（300 ms 合并）→ 整批 reload；`tern plugin reload` 需 daemon。
- daemon 重启/原地升级：先加载插件再恢复 pane；shell 保住 pty；Windows 无原地升级。
- 失败上报：handler raise → "Plugin x: hook failed" toast；entry 挂 → "failed to load"。
- 日志：`tern::plugin` target，默认 warn+；`STENCIL_LOG` 可开 debug。
- 平台能力：host half 仅桌面 daemon；iOS 只 window half（解释器、无 CLI、轮询 watch、`tern.process.run` 抛错、fetch 可用）；web tab 零 Lua。
- 信任模型：「Installing a plugin means trusting it」；无审查、无签名、无权限清单；`tern` API 可及用户能及的一切；建议手动 clone+checkout 后装目录。
- JIT：桌面 CPU 支持时 Luau 原生代码生成；iOS 永远解释执行。

### GuidesScout（guides 章节 12 页）

- 渲染周期：每 handler 后 view diff → 一帧 → title → save（JSON 变了才存）。
- 打开 block 的入口：调色板 "New <title> block"、文件菜单 "Open with"（manifest `files` globs）、路由 `{block}`、`cx:new_block`、layout launch。
- Override：按插件 id 序、首个返回真值者赢；handler 期间插件被移出窗口，`cx:command` 直跑内置无递归。
- Route：route.open 先于内置；origin 八种（palette/files/drop/link/system/cli/carly）；file:// 先 link 后 open；终端打印的路径直接进 open。
- Keymap 四层：Defaults → Preset → Plugin binds → User keybinds，用户层总是赢。
- 宿主事件需 shell 集成；`tern.pane.write(pane, text)` 伪终端打字（带 `\r` 执行）。
- Carly：`cx:ask_carly`、`tern.carly.schedule`（最多 50 个任务；事件任务默认 12h 过期；check 在独立 VM 同步跑）。
- 样式级联：Tern sheets 在前、插件 sheets 在后（同特异性插件赢）；顺序随 reload 变化，文档不承诺。
- `tern.fs` 同步阻塞所在线程；`tern.process.run` 异步；`tern.fetch` 从上下文所在机器发出。
- 跨页差异：宿主 `command_started` 带 `cwd?`，窗口同名事件无 `cwd`；`tern plugin list` 显示宿主目录状态，Preferences 徽章取两半较坏者。

### ReferenceScout（reference 章节 11 页）

- `tern.context` / `tern.plugin{id,name,dir,data}`；`tern.now()` 单调毫秒。
- `tern.json.array()` 保空数组、`tern.json.null` 显式 null。
- 清单键集：schema/id/name/version/description/icon/host/window/styles/blocks/lenses；icon 取自 Tern 内置集（`puzzle` 兜底）。
- 块渲染循环：init 崩溃 = 面板打印错误并 exit 1。
- Carly：桌面端独立会话 VM；`tern.carly.export` ≤16 个，名 `[a-z][a-z0-9_]{0,23}`；`tern.carly.context` 4 ms、每插件 400 字符/共 1600。
- 错误五通道：raised error / handler toast / problem / failed status / CLI stderr（退出码 0/1/2/124）。
- 两级校验：文本规则（install/link 时查文件本身）与包规则（每次扫描时查目录）。
- 未逐字取全：api-window 中段签名、173 内置命令全名单。

### ExamplesScout（examples 章节 7 页）

- 工作区文件 `.tern/workspace.json`：命名标签页、分屏、每窗格目录/命令；TabSpec 拆分树（叶子 launch、内节点 split+两子树、cwd 向下继承）；`TERN_WORKSPACE` 环境变量启动时恢复。
- `.tern-env` 目录变量文件：目录至 HOME 链上收集、逐字节审批后注入新 shell；`TERN_DIRVARS` 列出已应用文件（farthest-first、`:` 分隔）；审批记录存 kv（`approved:<path>`），内容变更即失效。
- longrun：阈值 `threshold_ms` 默认 15 s；历史 50 条；交互程序清单（编辑器/分页/ssh/REPL）排除在外。
- review-queue：Problem 三分类 missing/auth/failed；回调须先校验 pane 仍属当前运行（pane ID 重启复用，查 `tern.pane.list()`）。
- jsonx：先 `wc -c` 测尺寸再读（>4 MiB 拒绝）。
- terraform：`ui.overflow` 超 200 行的组尾部 "… N more"。

## 逐字摘录：资料入口 URL

Examples 页原文：

> Seven complete plugins ship in [the SDK](../index.md#the-sdk) under [`plugins/examples/`](https://github.com/stencil-hq/tern-sdk/tree/main/plugins/examples).

> git clone https://github.com/stencil-hq/tern-sdk

SDK 与社区列表入口（awesome-tern 仓库自述原文）：

> Plugins, apps, tools and resources for [Tern](https://stencil.so/tern), Stencil's terminal. —— https://github.com/theblazehen/awesome-tern

> [tern-sdk](https://github.com/stencil-hq/tern-sdk) ★ 62 · 2026-10-16 - Official repository of Surface Protocol SDKs for Rust, Python, Go and TypeScript, plus the Luau type definitions (`tern.d.luau`) and example plugins.
