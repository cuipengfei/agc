# 终端图像协议支持矩阵

> Sources: tsl0922 (ttyd), 2024-03-30; xtermjs (xterm.js), 2024-02-26; herdrdev (Herdr), 2026-08-20; Gaurav-Gosain (TUIOS), 2026; can1357 (OMP), 2026
> Raw: [ttyd 图像协议](../../raw/terminal-graphics/2026-10-17-ttyd-image-protocol-support.md); [Herdr 图像协议](../../raw/terminal-graphics/2026-10-17-herdr-graphics-protocol.md); [TUIOS SIXEL 支持](../../raw/terminal-graphics/2026-10-17-tuios-sixel-support.md); [OMP 图像协议](../../raw/terminal-graphics/2026-10-17-omp-image-protocols.md)
> Updated: 2026-10-17

## 概述

终端图像显示依赖一条链路上每个环节支持相同的图像协议。常见的三种协议——SIXEL、Kitty graphics、iTerm2 inline image protocol (IIP)——彼此独立，没有自动转换。如果应用发出 SIXEL 而中间层只处理 Kitty graphics，图像不会显示；反之亦然。OMP 在 v18.11.2 实现了全部三种协议，但具体走哪条路径由终端能力检测或 `PI_FORCE_IMAGE_PROTOCOL` 环境变量决定。

## 协议简述

| 协议 | 起始序列 | 来源 |
|---|---|---|
| SIXEL | `\x1bPq` | DEC VT 系列终端的位图图形协议 |
| Kitty graphics | `\x1b_G` | kitty 终端引入，支持传输、放置、删除、Unicode 占位符、动画帧 |
| iTerm2 IIP | `\x1b]1337;File=` | iTerm2 终端的内联图像协议，支持 PNG/JPEG/GIF |

## 各组件支持情况

### ttyd 1.7.7：SIXEL + iTerm2 IIP，无 Kitty

ttyd 把 xterm.js 前端编译进二进制，版本锁定在 `html/package.json`。1.7.7 的依赖：

- `@xterm/addon-image` 版本 `^0.7.0`，锁定到 xterm.js 5.4.0
- addon-image 0.7.0 的官方 README 开头写明：「Supports SIXEL and iTerm's inline image protocol (IIP)」
- 没有 Kitty graphics 的提及

ttyd 通过 `-t enableSixel=true` 客户端选项加载 ImageAddon：

```ts
case 'enableSixel':
    if (value) {
        terminal.loadAddon(register(new ImageAddon()));
        console.log('[ttyd] Sixel enabled');
    }
    break;
```

`enableSixel` 默认关闭，需要显式开启。客户端选项也可通过 URL 参数 `?enableSixel=true` 传入，优先级高于服务端参数。

iTerm2 IIP 默认开启（`iipSupport: true`），不需要额外配置。

### Herdr 0.9.5：Kitty graphics only，SIXEL NOT_PLANNED

Herdr 的图像显示路径只实现 Kitty graphics protocol，配置项为 `terminal.kitty_graphics`，默认开启。

维护者在 #3030（Herdr 0.8.0 报告）中说明：Herdr 的图像路径当前只支持 Kitty graphics，`img2sixel` 发出的是 Sixel，属于独立协议；Mintty 外部终端的支持不会透传，因为 Herdr 解析 pane 输出并重新绘制 pane。增加 Sixel 解析和渲染属于新增图形协议支持，不是修复已有行为。

#4330（Herdr 0.9.1，foot 终端）进一步确认：`terminal.kitty_graphics` 启用的是 Kitty graphics，不是 Sixel 渲染或传递，因此只支持 Sixel 的外部终端无法通过该路径显示 pane 图像。

两个 issue 均关闭为 NOT_PLANNED。维护者指出，Herdr 解析 pane 输出并重新绘制，外部终端的 SIXEL 能力不会透传；增加 SIXEL 属于新增协议支持，不是修复已有行为。

Reporter 在 #4330 中的分析指出实现层面的限制：Herdr VT（`libghostty-vt`）只实现了 Kitty passthrough（`src/kitty_graphics.rs`），没有 SIXEL 路径。

### TUIOS：Kitty graphics 完整渲染 + SIXEL passthrough

TUIOS 从 v0.8.3 起同时支持两种协议，但角色不同：

**Kitty graphics**（完整渲染）：
- 全量图像渲染，支持无闪烁视频播放
- `mpv --vo=kitty` 可用（shm 和 base64 两种方式）
- 图像 ID 跨帧复用实现无闪烁
- 支持动画帧（`a=f` 帧编辑转发到 host）
- 共享内存支持（`t=s` passthrough）

**SIXEL**（passthrough，实验性）：
- v0.8.3 release notes：「A pane's sixel image shows on the host, cut to the visible part of the pane」
- popups、borders 和 `clear` 对图像的作用方式与对文本相同
- 外部终端有 Kitty graphics 但没有 SIXEL 时，TUIOS 把 SIXEL 转换为 Kitty 图像
- 外部终端两者都没有时，显示一个方框
- README 当前标注 SIXEL 为「experimental」，附注「no pixel-level clipping yet」（原文：`Sixel image passthrough (experimental, no pixel-level clipping yet)`）

> **裁剪层级说明（关系未验证）**
> 两条来源讲的是不同裁剪层级，未排除可同时成立：TUIOS v0.8.3 release notes 说 SIXEL 图像会裁到 pane 可见区域（cut to the visible part of the pane），当前 README 说 SIXEL passthrough 尚无像素级裁剪（no pixel-level clipping yet）。前者指 pane 可见区域裁剪，后者指像素级裁剪，来源未说明两者如何配合，关系未验证。

v0.8.3 release notes 还说明：pane 只有在 host 实际绘制 SIXEL 时才被告知支持 SIXEL。chafa、timg、lsix 和 yazi 在其他 host 上使用文本回退。这项功能在 daemon 模式、`tuios ssh` 和 `tuios-web` 中均可用。

### OMP v18.11.2：三种协议均支持

OMP 在 `terminal-capabilities.ts` 中定义了三种图像协议枚举：

```ts
export enum ImageProtocol {
    Kitty = "\x1b_G",
    Iterm2 = "\x1b]1337;File=",
    Sixel = "\x1bPq",
}
```

`renderImage()` 函数根据 `TERMINAL.imageProtocol` 分发到三条路径之一：

- **Kitty**：`a=t` 一次传输 + `a=p` 多次放置，或 Unicode 占位符（`U=1`）；支持 `d=A`（删除全部）、`d=i`（删除单个 placement）
- **SIXEL**：通过 Rust 原生绑定 `encodeSixel`（来自 `@oh-my-pi/pi-natives`）编码，支持同步和异步两种方式
- **iTerm2**：OSC 1337;File= 序列

协议选择机制：

1. `PI_FORCE_IMAGE_PROTOCOL` 环境变量可强制指定 `kitty`/`sixel`/`iterm2`/`off`
2. 终端能力检测：SIXEL 通过 XTSMGRAPHICS 几何应答或 DA1 属性 4 检测；Kitty 通过终端识别检测
3. Windows Terminal ≥1.22 单独判定 SIXEL 支持（通过 `WT_SESSION` 和 `TERM_PROGRAM_VERSION`）
4. Warp 在 macOS/Linux 上使用 Kitty graphics，在 Windows/WSL 上返回 `null`（不选图像协议）

`autoGraph` 图表输出走与一般图像相同的终端图像路径：图表先生成 SVG，`TableChartFigure` 以光栅化的终端图像显示（docstring：`as a terminal image rasterized in omp's theme`）。Tern 终端走独立的 TSP（Tern Surface Protocol）：`chartFence` 把 SVG 作为 SVG 代码围栏交给终端的 `md` 节点，由终端自己绘制，不经过图像协议路径。图表模式由 `TableChartMode` 定义（`table-chart.ts`）：`smart` 在语义决定处由模型修正本地推断，`always` 对每个判为数值的表格绘出本地最优推断，`off` 时表格保持为表格。

## 链路兼容性

### ttyd + Herdr：无协议重叠

| 环节 | SIXEL | Kitty | iTerm2 |
|---|---|---|---|
| ttyd 1.7.7（前端） | ✅ | ❌ | ✅ |
| Herdr 0.9.5（中间层） | ❌ | ✅ | ❌ |

ttyd 和 Herdr 没有共同支持的图像协议。应用（如 OMP）发出 SIXEL 时被 Herdr 阻断；发出 Kitty graphics 时 ttyd 前端无法显示。开启 `enableSixel=true` 只激活 ttyd 前端的 SIXEL 接收能力，无法补全 Herdr 缺少的 SIXEL 渲染。

这个限制只影响图像和图形图表。普通文字、颜色、文本表格和常规 TUI 功能不受影响。

### TUIOS 作为中间层的优势

TUIOS 同时支持两种协议。按 v0.8.3 release notes 描述的支持方向：pane 应用发出 SIXEL、外部终端只有 Kitty graphics 时，TUIOS 把 SIXEL 转换为 Kitty 图像显示。Herdr 缺少这类转换能力。

## OMP 在 Herdr pane 内的特殊处理

OMP 的终端能力解析器将 Herdr 标记为需要显式覆盖图像协议。在 Herdr pane 中，自动协议选择会被设为 `null`，除非通过 `PI_FORCE_IMAGE_PROTOCOL` 显式指定。但即使强制设为 `kitty`，ttyd 1.7.7 前端也无法渲染 Kitty graphics；强制设为 `sixel`，Herdr 也不会传递 SIXEL。强制协议无法绕过中间层缺失。

## See Also

- [ttyd 前端编译模型与 xterm 版本锁定](../terminal-multiplexers/ttyd-frontend-compilation.md)
- [Herdr + Plannotator 工具链全量 Reference](../herdr-plannotator/toolchain-reference.md)
