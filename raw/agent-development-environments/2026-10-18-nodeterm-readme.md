# Nodeterm — README 关键段落摘录

> Source: https://github.com/eneskirca/nodeterm (official README)
> Collected: 2026-10-18
> Published: Unknown

## GitHub API 指标快照（2026-10-18）

```json
{"archived":false,"desc":"Node-based terminal manager for AI coding agents — tmux-backed terminals and parallel agent sessions as draggable nodes on an infinite pan/zoom canvas. macOS, Linux, and a browser Server Edition.","pushed":"2026-10-18T13:18:52Z","stars":2039,"url":"https://github.com/eneskirca/nodeterm"}
```

## README 关键段落（按 ADE 判断关键词筛选，保留原文，完整段落边界）

**A node-based terminal manager — your terminals and agents on an infinite canvas.**

Multiple real terminals live as draggable nodes on a single pan/zoom canvas, and every
project doubles as a **Trello-style board of live Claude Code sessions**. Built for
people with ADHD and scattered workflows: a spatial layout instead of a stack of
hidden tabs.

[![Platform](https://img.shields.io/badge/platform-macOS%20(arm64%20%2B%20x64)%20·%20Linux%20(x64)%20·%20Windows%20(x64%2C%20beta)-black)](https://nodeterm.dev)
[![Built with Electron](https://img.shields.io/badge/built%20with-Electron-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/license-BUSL--1.1-blue)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/eneskirca/nodeterm?style=flat)](https://github.com/eneskirca/nodeterm/stargazers)
[![Latest release](https://img.shields.io/github/v/release/eneskirca/nodeterm?include_prereleases&sort=semver)](https://github.com/eneskirca/nodeterm/releases)
<!-- Installer downloads only (.dmg + .AppImage + .deb + .rpm + .exe across every release), kept live by
     .github/workflows/download-badge.yml, which writes a shields endpoint JSON to the `badges` branch.
     shields' github/downloads/…/total reads ~14× higher because electron-updater's own traffic
     (latest-*.yml polls, mac .zip deltas, blockmaps) is counted as downloads there. -->
[![Downloads](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Feneskirca%2Fnodeterm%2Fbadges%2Fdownloads.json)](https://github.com/eneskirca/nodeterm/releases)

<a href="https://trendshift.io/repositories/103825?utm_source=repository-badge&amp;utm_medium=badge&amp;utm_campaign=badge-repository-103825" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/repositories/103825" alt="eneskirca%2Fnodeterm | Trendshift" width="250" height="55"/></a>

<div align="center">
  <a href="docs/assets/hero-tour.mp4">
    <img src="docs/assets/hero-tour.webp" alt="nodeterm in 30 seconds — the canvas, sessions that survive a restart, agents and the notch, the kanban board, dictation, the iPhone" width="900" />
  </a>
  <br/>
  <sub>▶ <a href="docs/assets/hero-tour.mp4">Watch the 30-second tour with sound</a></sub>
</div>

Stacked terminal tabs hide context — you lose track of what's running where. nodeterm
turns that into a **map**: every shell is a node you can place, group, label, and zoom
into. Sessions are spatial and persistent, so your mental model stays intact across
restarts. And because the app is built around a clean service seam, the same canvas runs
three ways — as the **desktop app for macOS, Linux and Windows (beta)**, as a **self-hosted browser app**
you reach from anywhere (Server Edition), and an **iOS companion** that attaches to the
same live sessions.

Right-click the canvas to open a **terminal** — or an AI **agent**. Each runs in its own
persistent tmux session, next to **sticky notes** (link one to feed an agent context),
**Monaco editors**, **diff views**, and **web/video** nodes — arranged spatially, like a
map. Quit the app, even **restart the machine** — every session comes back.

</td>
<td><img src="docs/assets/canvas-tour.webp" alt="The canvas — right-click to add Claude Code, a terminal, a sticky note, an editor and a diff; link the note to Claude; restart, and every session comes back" /></td>
</tr>
<tr>
<td width="42%" valign="middle">

Hook-driven status — no output scraping: pulsing **RUNNING / NEEDS YOU** badges,
**subagent** cards with live transcripts, a per-node **context meter**, and OS
notifications. Click the ping, answer the permission prompt right in the node, and get
told the moment the turn is **done**. On a MacBook, agents live in the **notch** too.

</td>
<td><img src="docs/assets/agents-tour.webp" alt="Agent status — subagent fan-out with a context meter; a permission prompt lights the notch and posts a macOS notification; Go jumps to the node; ✓ Approve in its header" /></td>
</tr>
<tr>
<td width="42%" valign="middle">

### One project, two views

Every project is a canvas — **and also a kanban board**. Cards *are* your live
sessions: drag them across columns while the agent keeps running, open a card into a
**live card modal** (the real session + members, due date, priority, comments), and
assign teammates. Toggle with `⌘⇧B`.
<br/><sub>▶ <a href="docs/assets/kanban-launch.mp4">Watch the board video with sound</a></sub>

</td>
<td><img src="docs/assets/kanban-launch.webp" alt="The kanban board — ⌘⇧B turns the canvas into cards, drag one to Done while it keeps running, the card modal with the live Claude Code session and comments" /></td>
</tr>
<tr>
<td width="42%" valign="middle">

### Your sessions, anywhere

**Pair your phone** with one QR — *scan with the nodeterm iOS app* — and the **same
live session continues in your pocket**, E2E encrypted **over the relay, not just your
LAN**. The same canvas also runs self-hosted in any browser (Server Edition).

</td>
<td><img src="docs/assets/remote-tour.webp" alt="Pair your phone — scan the QR, every session is one tap away, the real Claude Code on the iPhone, answer its permission prompt from there" /></td>
</tr>
<tr>
<td width="42%" valign="middle">

- **Session continuity (tmux)** — terminals keep running across node remounts *and* full
  app restarts, including live processes; machine reboots restore scrollback and resume
  agent sessions (`claude --resume`). The macOS app **ships its own tmux**, so this works
  with nothing installed; a tmux already on your system is always used in preference to it,
  and terminals opened before an upgrade stay as they were until you refresh the node.
- **Agent superpowers** — **context links** so agent nodes read each other's transcripts
  on demand; Claude-only **branch a conversation** and **managed accounts** for several
  logged-in Claude identities side by side; agents can drive the canvas (open nodes,
  spawn teams, verify each other's work) via the built-in canvas-control CLI.
- **Remote / SSH projects** — open a project on a remote host over SSH; terminals, files,
  git, and even the board run there while the canvas stays local.
- **Source control** — VS Code-style stage/unstage, discard, branch switch/create,
  commit, push/sync/publish, **worktrees**, and `gh` sign-in — backed by system `git`.
- **GitHub Issues on Kanban** – opt-in issue cards, exact label-to-column mapping,
  All / GitHub / Sessions filtering, and two-way move, close, and reopen sync. See
  [setup and security details](./docs/github-issues-kanban.md).
- **AI commit messages & terminal names** — bring-your-own local agent CLI run read-only
  on the staged diff or captured output.
- **Your sessions, in your pocket** — **nodeterm mobile** (iOS) attaches to the same live
  tmux sessions: watch an agent work, answer a "needs you", or type into any terminal
  from your phone — plus push notifications and a mobile board view.
- **Power & sleep** — while an agent is working, nodeterm keeps the machine from
  idle-sleeping, and lets go the moment it finishes (on by default; toggle in the setup
  tour or Settings → Behavior). It lets the machine sleep anyway on battery below 5% or
  when the machine runs critically hot. No app can hold a machine awake through a closed lid
  (a Mac with the lid closed stays awake only while plugged in with an external display) —
  for overnight runs keep the laptop open and plugged in, or run the agents on a box
  that doesn't sleep via the [Server Edition](./docs/SERVER.md).
- **Command palette** (⌘K), **file explorer** (⌘⇧E), **markdown view** (⌘M),
  **undo/redo**, and a native macOS dark UI.
- **Auto-update & in-app announcements** — the app checks a self-hosted feed and
  surfaces a "Restart to update" banner and product news.
