# Tern 官方文档地图

> Sources: Stencil official Tern documentation, 2026-10-20
> Raw: [Concepts、Guides、Reference、Examples 官方摘录](../../raw/tern/2026-10-20-official-docs-concepts-guides-reference.md)
> Updated: 2026-10-20

## Overview

官方文档站 https://docs.stencil.so/tern/ 全书共 82 个内容页面，分布在九个分区；每页同时发布 `.md` 版本，`print.html` 为全书单页版。SDK 仓库随带七个完整示例插件，社区维护有一份精选列表。本仓库 wiki/tern/ 下的文章按主题展开官方概念，本文给出获取入口与对应关系。

## 获取方式

每个页面以 `.md` 形式发布，例如 `protocol/surfaces.md`、`index.md`；`print.html` 汇集全书为单一页面，适合一次性抓取全文。SDK 仓库位于 github.com/stencil-hq/tern-sdk，内含 `plugins/examples/` 示例目录与 `tern.d.luau` 类型定义；社区列表位于 github.com/theblazehen/awesome-tern。

## 分区与页数

官方目录各分区页数：

| 分区 | 页数 |
| --- | --- |
| Overview | 1 |
| Concepts | 6 |
| Guides | 13 |
| Elements | 10 |
| Styles | 3 |
| Surface Protocol | 9 |
| Examples | 7 |
| Scripts | 21 |
| Reference | 12 |
| 合计 | 82 |

## 七个官方示例

SDK 随附示例（原文表述为 "Seven complete plugins ship in the SDK under `plugins/examples/`"）：

| Example | What it does | Halves | Surfaces it demonstrates |
| --- | --- | --- | --- |
| Terraform Plans (`terraform`) | Shows `terraform plan` and `tofu plan` as summary badges, diagnostics and resources grouped by action; a click copies an address | Host | Command lens with `match` globs, line-by-line parsing, badge tones, collapsible sections, click actions through the lens `event` cx, role-scoped manifest CSS |
| Review Queue (`review-queue`) | Lists the pull requests waiting for your review, polled from `gh` every two minutes | Host, window | Block with keys, events and saved state; `tern.process.run` with timeouts; `tern.timer` polling; error views; a palette command and key bind that open the block with `cx:new_block` |
| JSON Explorer (`jsonx`) | Browses JSON files as a collapsible tree and copies jq paths | Host, window | File-backed block from `files` globs and launch args; `tern.fs.read` behind a size check; list selection and scrolling; saved state; `tern.route.open` with a switch kept in `tern.kv` |
| Long-Running Commands (`longrun`) | Toasts slow commands as they finish and keeps their history | Host, window | `command_started`/`command_finished` host hooks, toasts, a history block with a live clock, a status segment, a module shared by both halves |
| Directory Variables (`dirvars`) | Loads `.tern-env` files into each new shell's environment | Host | The `spawn` filter and its time limit, `cwd` hooks that hint when the files change, a parser module |
| Project Workspaces (`workspaces`) | Opens the tabs and splits a project describes in `.tern/workspace.json` | Window | `cx.layout:tab` layouts, `window_start`, a `new_tab` override, a status segment, manifest CSS |
| Canvas Dashboard (`canvas-demo`) | Keeps a persistent dashboard with a Refresh action | Window | `cx.canvas` ownership, replica reads, keyed patches and owner-only `canvas_action` handlers |

## 概念导航

官方概念覆盖的知识块由本仓库文章分头展开：

| 知识块 | 展开文章 |
| --- | --- |
| 对象模型 | [Tern 对象模型：包含关系、数量与生命周期](object-model.md) |
| 设置（settings schema） | [Tern 设置项全集](settings-schema.md) |
| 命令透镜 | [Tern 命令透镜（command lens）](command-lenses.md) |
| 插件能力 | [Tern 插件能力全集](plugin-capabilities.md) |
| Surface Protocol 规范 | [Tern Surface Protocol 官方规范要点](tsp-official-spec.md) |
| 脚本接口 | [Tern 脚本与自动化面](scripting-surface.md) |
| 元素与样式 | [Tern 视图元素与样式体系](elements-and-styles.md) |
| 插件架构 | [Tern 插件架构与平台边界](plugin-architecture.md) |
| TSP 与 browser 后端 | [Tern：TSP 与 browser 后端](tsp-and-browser-backend.md) |
| 设置存储 | [Tern 设置存储位置](settings-storage.md) |
| inbox（attention 域） | [Tern Inbox 特征行为](inbox-feature.md) |

## See Also

- [Tern 对象模型：包含关系、数量与生命周期](object-model.md)
