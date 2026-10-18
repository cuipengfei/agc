# Tern — 架构文档关键段落摘录

> Source: https://docs.stencil.so/tern/concepts/architecture.html (official Tern Plugin SDK docs)
> Collected: 2026-10-18
> Published: Unknown

## Where each half runs（原文表格）

| Situation | Host half | Window half |
|---|---|---|
| Desktop window attached to the session daemon | In the daemon | In the window |
| Desktop window running its panes without a daemon | In the window's process, on worker threads | In the window |
| Remote host attached to your window | On the remote host, in its daemon, from its plugins folder | Yours applies to every pane in your windows, remote ones included |
| iOS client | Not run (host entries are skipped) | Run, interpreted |
| Web tab | Not run (no Lua) | Not run (no Lua) |

## Web tab（原文段落）

The web tab runs no Lua at all. It still receives the catalog of its one host, the machine serving the page, so it opens the same lens blocks and shows the same plugin blocks and views as any other replica, styled by the plugins' manifest `styles` from that catalog. Only `tern.css` sheets, which window halves add, are missing there.

## The two halves（原文表格）

| | Host half | Window half |
|---|---|---|
| Entry | `host = "host.luau"` | `window = "window.luau"` |
| `tern.context` | `"host"` | `"window"` |
| Runs in | The session daemon, or a window that runs its panes without one | Every Tern window on the machine |
| Owns | Block types, command lenses, pane hooks, the `spawn` filter, `tern.pane` | Commands, key binds, overrides, routes, chrome formatters, `tern.css`, window events, `cx.layout` |
