# Tern Surface Protocol

> Sources: Stencil (Tern docs), 2026-10-17; verticalrectangle (tern-video-block), 2026-10-17; 会话问答, 2026-10-17
> Raw: [Tern TSP 与探测修正](../../raw/terminal-graphics/2026-10-17-tern-tsp-and-probe-commands.md)
> Updated: 2026-10-17

## Overview

Tern 是 Stencil 的终端，其图形编排不走 SIXEL / iTerm2 IIP 这类终端图像协议路线，而是走自家 TSP（Tern Surface Protocol）：程序把 UI 树发给 Tern，由终端自己排版、绘制。omp 与 Tern 配合时走的就是这条路：`terminal-image-protocol-matrix.md` 里的 `chartFence` 机制。

## TSP 概念

TSP 里终端不是被逐字节转义序列驱动的，而是接收一个由程序发来的 UI 树。文档描述：程序构造树，Tern 负责排版绘制与配色（用其显示正文的调色板）。

图像在 TSP 里是一个 `image` 节点，官方文档定义原文：

> An image from a blob (animations play)

即程序发图像数据块（blob），Tern 原生画出来，动画照常播放。

## 图表绘制路径与 omp 的配合

omp 的 `table-chart.ts` 有两条图表交付路径（依据其模块 docstring）：

- 一般终端：`TableChartFigure`，由 omp 把 SVG 光栅化成终端图像。
- TSP 终端（如 Tern）：`chartFence`，把 SVG 包成 ```` ```svg ```` 围栏交给终端的 `md` 节点，由终端自己绘制。

omp 的 `TerminalId` 枚举里 Tern 是独立一项，所以 omp 对 Tern 大概率走 `chartFence` 围栏分支。此为源码依据的机制描述；某次会话实际走了哪条路径未从屏幕判定过。

## Tern 对图像协议的支持证据

| 协议 | 证据状态 |
|---|---|
| TSP `image` 节点 | 官方文档明确支持 |
| Kitty graphics | 第三方来源：`verticalrectangle/tern-video-block` README 实测声明「draws through the kitty graphics protocol (frames sent by file path)」「tested in Tern only」。**注意**：该仓库与列它的 `awesome-tern` 都是社区产物，非 Stencil 官方背书 |
| SIXEL | 官方文档（protocol/elements/transport/theme/handshake 各页与全书 print）未见提及，未找到支持证据 |
| iTerm2 IIP | 同上，未找到证据 |

证据边界：Tern 的 SIXEL/iTerm2 状态标为「未找到证据」，不等于「不支持」。

## See Also

- [终端图像协议支持矩阵](terminal-image-protocol-matrix.md) — 全景协议表与 omp 图表机制
