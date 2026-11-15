# Herdr TUI — agent 支持与会话文档摘录（2026-11-15）

> Source: https://herdr.dev/tui/docs/ (concepts, quick-start, session-state, connecting-machines, agents, install), 2026-11-15 查阅
> Collected: 2026-11-15
> Published: 2026-11-15（docs 当前版）

## concepts — 架构

- 「Herdr runs a background server that owns panes and processes; clients attach and detach freely.」
- 「Disconnecting a client does not stop agents.」
- 「Machines: each machine runs its own server; `herdr machine add` brings SSH machines into the same sidebar.」
- 「No web or mobile clients.」

## quick-start — 启动

- 「Run `herdr` in a project directory; a workspace is created automatically (or use the default session).」
- 「Run `claude`, `codex`, `pi`, `opencode`, or any other agent inside a pane.」
- 「`ctrl+b q` detaches; the server keeps everything running.」

## session-state — 会话状态

- 「State lives in `session.json`, `session-snapshots/`, and optionally `session-history.json`.」
- 「Snapshots let a new client restore pane layout and running commands.」

## connecting-machines — 多机

- 「`herdr machine add <host>` adds a machine over SSH; panes on that machine appear in the same sidebar.」
- 「Each machine runs its own server; sessions do not span machines.」

## agents — 支持与检测

- 「Herdr detects agents by foreground process, screen contents, and integrations.」
- 「Supported agents include Claude Code, Codex, Gemini CLI, OpenCode, OMP, opendev, and Goose.」（支持表含 OMP 一行）
- 「OMP: status requires the omp integration; session resume: `omp --resume`.」（原文为支持表内的两列：status 需要集成、resume 命令）
- 「`blocked` means the agent is waiting for you.」

## install — 平台

- 「Linux / macOS / Windows, x86_64; ARM64 via emulation.」（下载页与 install 文档一致：提供 Linux、macOS、Windows 的 x86_64 包，ARM64 走仿真）
