# mcp_excalidraw 仓库实证（GitHub API，2026-08-30 快照）

> Source: GitHub API repos/yctimlin/mcp_excalidraw（metadata、package.json、commits、contributors）
> Collected: 2026-08-30
> Published: Unknown

## 仓库元数据

- full_name: yctimlin/mcp_excalidraw
- stargazers_count: 2362
- license: MIT
- archived: false
- updated_at: 2026-08-29T20:13:49Z
- description: "MCP server and Claude Code skill for Excalidraw — programmatic canvas toolkit to create, edit, and export diagrams via AI agents with real-time canvas sync."
- GitHub Releases：无（`gh release list` 空）；分发走 npm 包 `mcp-excalidraw-server` 与 ghcr.io Docker 镜像

## package.json 关键字段（v2.0.0）

- name: mcp-excalidraw-server; version: 2.0.0; license: MIT
- engines: node >=20.0.0
- bin: mcp-excalidraw-server / excalidraw-canvas → dist/bin.js
- dependencies: @excalidraw/excalidraw ^0.18.1、@excalidraw/mermaid-to-excalidraw ^1.1.3、@modelcontextprotocol/core 2.0.0、@modelcontextprotocol/server 2.0.0、cors、dotenv、express ^4.22.2、mermaid ^11.17.0、react ^18.3.1、winston、ws ^8.21.3、zod ^3.22.4、zod-to-json-schema
- scripts 含 `test:bind`（check-local-bind.mjs）与 `test:mcp`（check-mcp-stdio.mjs）两个冒烟检查

## 最近 commits（2026-08-30 采集）

- 2026-08-21 fix: harden npm release workflow (#105)
- 2026-08-19 chore: refresh production dependencies before 2.0.0 release (#104)
- 2026-08-08 chore: release 2.0.0 — interchange-grade exports & MCP 2026-07-28 (#99)
- 2026-08-08 feat: support MCP protocol revision 2026-07-28 (#98)
- 2026-08-04 fix: preserve edited text inside shapes (#92)
- 2026-08-04 Fix/export fidelity (#95)
- 2026-07-22 fix: prevent duplicate WebSocket connections and ensure unique element IDs during conversion (#91)
- 2026-07-17 feat: add scrollToElementIds to set_viewport for multi-element zoom-to-fit (#86)
- 2026-07-17 feat: Obsidian .excalidraw.md export/import (vault-native format) (#90)
- 2026-07-16 Fix dark mode on the canvas frontend (#89)
- 2026-07-06 Merge pull request #87 from yctimlin/feat/cli-first

## Contributors（GitHub API，全量 18 人）

yctimlin 58；frNNcs 8；ycsahara 5；gianluca-venturini 2；Songmengdi 2；acercyc 1；anxkhn 1；ctchen222 1；gitgasm 1；danielsvane 1；f-arslan 1；Frank1603 1；guzalv 1；liujordan 1；kweinmeister 1；fif911 1；scttfrdmn 1；PhantomPayne 1

近 100 个 commit 的作者分布与上表一致（yctimlin 58，约占三分之二）。
