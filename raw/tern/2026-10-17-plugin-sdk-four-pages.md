# Tern Plugin SDK 四页原始摘录

> Source: https://docs.stencil.so/tern/index.html; https://docs.stencil.so/tern/toc.html; https://docs.stencil.so/tern/concepts/packages.md; https://docs.stencil.so/tern/concepts/architecture.md; https://docs.stencil.so/tern/concepts/support-matrix.md; https://docs.stencil.so/tern/reference/cli.md
> Collected: 2026-10-17
> Published: Unknown

本材料保留四页官方英文原文的关键段落。官方目录的分类数量为 Overview 1、Concepts 6、Guides 13、Elements 10、Styles 3、Surface Protocol 9、Examples 7、Scripts 21、Reference 12；各项相加为 82 个内容页面。

## Packages and Manifests

A plugin is a directory holding a `plugin.toml` manifest, up to two Luau entry files, and whatever modules and style sheets they use. This page covers the package layout, the manifest, where packages and their data live, how plugin things are named, and how a folder that is not a usable plugin is reported.

Only `plugin.toml` and the entries it names are required. Entry and style paths are relative to the package directory and cannot leave it. Nothing else in the folder is read unless an entry `require`s it or a handler reads it with `tern.fs`.

`plugin.toml` uses schema 1. Unknown keys are errors, at the top level and inside every table, so a typo fails the package instead of being ignored.

Blocks and lenses are declared in the manifest and defined in Lua, and the two must agree. The manifest half is what every replica knows from the catalog (block titles and icons, lens claims) without running Lua; the Lua half is what the host runs. Defining an undeclared id raises inside the entry (`tern.block.define: block "x" is not declared in plugin.toml`); declaring an id the entry never defines fails the plugin once the entry finishes (`block x is declared in plugin.toml but not defined with tern.block.define`). `[[blocks]]` and `[[lenses]]` therefore require a `host` entry.

Paths in these pages use two placeholders. `<config>` is Tern's configuration directory and `<state>` its state directory:

| Platform | `<config>` | `<state>` |
| --- | --- | --- |
| macOS | `~/Library/Application Support/Tern` | `~/Library/Application Support/Tern` |
| Linux | `$XDG_CONFIG_HOME/tern` (`~/.config/tern`) | `$XDG_STATE_HOME/tern` (`~/.local/state/tern`) |
| Windows | `%APPDATA%\Tern` | `%LOCALAPPDATA%\Tern` |
| Any, with `TERN_CONFIG_DIR` set | `$TERN_CONFIG_DIR` | `$TERN_CONFIG_DIR` |

Packages live in `<config>/plugins/`; `tern plugin dir` prints it. On iOS the folder is the app's `Documents/Plugins`, which the Files app shows as On My iPhone (or iPad) › Tern › Plugins. iOS has no command line or `git`: copy a package folder there.

Each plugin gets `<state>/plugin-data/<id>/`, created when one of its VMs starts. Lua sees its absolute path as `tern.plugin.data`; programs run with `tern.process.run` get it as the `TERN_PLUGIN_DATA` environment variable. `tern.kv` keeps its values in `kv.json` there, rewritten through a temporary file and a rename on every `tern.kv.set`.

Both halves of a plugin, and the window half in every window, share this folder and one `tern.kv` store: each VM re-reads `kv.json` when the file's modification time or length changed, so a `get` sees other VMs' writes and a `set` never writes back a stale copy. Two `set`s at the same instant still race, and the last rename wins.

Two keys in `<config>/settings.json` decide which plugins load. Each machine reads its own settings; nothing syncs between hosts.

| Key | Default | Effect |
| --- | --- | --- |
| `plugins` | `true` | `false` loads no plugin at all. |
| `plugins_disabled` | `[]` | Plugin ids that stay unloaded (status Disabled). |

Preferences › Plugins edits both and reloads the plugins of the session and the window when either changes. Both halves read `settings.json` again at every load and reload (the daemon, the window, and a window's own host runtime when no daemon runs), so a hand edit takes effect everywhere at the next reload. A headless run (`tern shot`, `tern serve`) loads plugins only with the `plugins fixtures` scenario command, which reads the two keys from `settings.json` too.

A folder that cannot be a plugin is a **problem**: it is listed with its error and loads nothing. A valid package has a **status**.

| Status | Meaning |
| --- | --- |
| Ready | Loaded; its entries ran. |
| Disabled | Turned off by `plugins` or `plugins_disabled`. |
| Failed | An entry raised while loading, or left a declared block or lens undefined; the error is kept. |

## Architecture

An entry that only declares blocks and lenses never needs a `window.luau`, and a plugin that only adds commands and styles never needs a `host.luau`. One plugin can do both.

| | Host half | Window half |
| --- | --- | --- |
| Entry | `host = "host.luau"` | `window = "window.luau"` |
| Runs in | The session daemon, or a window that runs its panes without one | Every Tern window on the machine |
| Owns | Block types, command lenses, pane hooks, the `spawn` filter, `tern.pane` | Commands, key binds, overrides, routes, chrome formatters, `tern.css`, window events, `cx.layout` |
| Budget per call | 2 s | 4 ms for chrome formatters and `available`, 50 ms for everything else |

Tern's panes, and the authoritative copy of each pane's screen, live in the session daemon. Windows attach to the daemon and mirror the screens; when a window quits, its panes keep running. Anything a plugin adds to a pane has to live on that side too, or it would disappear with the window that added it and never reach the other windows, the iOS client or the web tab. That is the host half.

UI state is different: a window's tabs, focus, palette, keymap, chrome and style sheets belong to that window and are mutated on its UI thread, one event at a time. That is the window half, and it gets a `cx` for exactly that access.

The split follows from those two facts rather than from a choice of API: host code never touches a window, and window code never owns a pane's content.

| Situation | Host half | Window half |
| --- | --- | --- |
| Desktop window attached to the session daemon | In the daemon | In the window |
| Desktop window running its panes without a daemon | In the window's process, on worker threads | In the window |
| Remote host attached to your window | On the remote host, in its daemon, from its plugins folder | Yours applies to every pane in your windows, remote ones included |
| iOS client | Not run (host entries are skipped) | Run, interpreted |
| Web tab | Not run (no Lua) | Not run (no Lua) |

**Web tab.** The web tab runs no Lua at all. It still receives the catalog of its one host, the machine serving the page, so it opens the same lens blocks and shows the same plugin blocks and views as any other replica, styled by the plugins' manifest `styles` from that catalog. Only `tern.css` sheets, which window halves add, are missing there.

A plugin block is a daemon pane like a shell, except that its program is a Lua table instead of a process. It is opened, resized and closed through the same routes as a shell, it exists in the session that created it, and its view is attached to that pane, so it survives reload and reaches every replica: the other windows, the iOS client, the web tab. The host renders the root element into the pane, with a fixed 10 Hz frame budget.

A command lens reads a shell command's output and shows a native view in its place. Whether a command gets a plugin lens is decided by the manifest's `match` globs alone, which every replica has from the host's catalog. This is why a lens's `open` handler cannot decline: by the time it runs on the host, every replica has already opened the block. Narrow the globs instead.

## Support Matrix

| Capability | macOS | Linux | Windows | iOS | Web tab |
| --- | --- | --- | --- | --- | --- |
| Host half (`host` entry) | Yes, in the daemon | Yes, in the daemon | Yes, in the daemon | No; host entries are skipped | No |
| Window half (`window` entry) | Yes | Yes | Yes | Yes | No |
| `tern.process.run` | Yes | Yes | Yes | Raises `tern.process is not available on iOS` | Not applicable |
| `tern.fetch` | Yes | Yes | Yes | Yes | Not applicable |
| Plugin blocks visible | Yes | Yes | Yes | Yes, from attached hosts | Yes, from the serving host |
| Lens views visible | Yes | Yes | Yes | Yes, from attached hosts | Yes, from the serving host |
| Plugin CSS | Local packages and attached remote hosts | Same | Same | Files-app packages and attached hosts | The serving host's manifest `styles`; no `tern.css` |

**Web tab.** The web tab (`tern web serve`) has a single host, the machine serving the page, and loads no plugins of its own. It receives that host's catalog, so it opens the same lens blocks as every other replica and shows plugin blocks, lens views and effects (toasts, clipboard, opens). It also installs the manifest `styles` of the host's Ready plugins from that catalog, as `plugin:0:<id>:styles`, so plugin blocks and lens views look as they do in a desktop window, and it re-installs them when the host's plugins reload. Sheets a window half adds with `tern.css` never reach it, since no window half runs there.

## Command Line

`tern plugin` manages the packages in this machine's plugins folder and asks the session daemon to reload them. It works on files and on the running daemon only; it never runs plugin Lua itself. iOS has no command line: copy packages into the Files app's Tern › Plugins folder instead.

Every verb prints nothing on success; pass `--json` for one JSON value on stdout, so these verbs can be scripted. The verbs that change the folder also tell the daemon to reload and report the result, so an automation can tell "written" from "written and reloaded cleanly".

| Exit | Meaning |
| --- | --- |
| 0 | Everything requested succeeded. |
| 1 | The verb failed, or a reload finished with Failed plugins / folder problems. |
| 2 | Usage error: bad flags, a bad path, a malformed id. |
| 124 | The daemon did not answer within 60 s. |

`install`, `remove`, `link` 和 `unlink` change the plugins folder and then ask the daemon to reload every plugin, waiting up to 60 s for the new catalog. Reported after that, without changing the exit code:

| Outcome | Text mode | `--json` |
| --- | --- | --- |
| No daemon is running | `no daemon running; changes apply at next start` | same |
| The reload succeeded and everything loaded | nothing | nothing |
| Plugins failed or the folder has problems | One `list` line per Failed plugin, then `problem …` lines | same |
| The reload request failed | `the daemon did not reload its plugins: <error>` | same |

The source is checked before anything is copied, by the loader's own check: the manifest passes every text rule, the entries it names exist, and the style sheets it names can be read and fit the size limit. The copy follows symbolic links, leaves out `.git`, is staged in a dot-named sibling the loader skips, and is renamed into place; replacing an existing copy moves the old one aside first and puts it back if the rename fails.

Writes `DIR/tern.d.luau`, the Luau definition file for the `tern` module that this Tern ships, creating `DIR` if needed. Point your editor's Luau language server at it for completions and checks of the `tern` API in both halves. It doesn't touch the plugins folder or the daemon.
