# OMP 界面图标：三档 symbolPreset 与 Glyph Protocol

> Sources: OMP 18.18.0 源码与安装包内联设置定义，2026-11-07
> Raw: [三档预设、符号键清单、字形包与协议](../../raw/omp/2026-11-07-omp-symbol-presets-and-glyph-protocol-source.md)
> Updated: 2026-11-07

## Overview

OMP 的界面图标由一个枚举设置 `symbolPreset` 控制，取值 `unicode`、`nerd`、`ascii`，默认 `unicode`。`nerd` 档使用 Nerd Font 私有区码位，但终端不需要安装修补字体：OMP 自带 270 个字形轮廓，启动时通过自有的 Glyph Protocol 把它们注册进终端。这套图标与聊天正文里的 emoji 短码表互相独立。

## 三档预设

| 键 | unicode | nerd | ascii |
|---|---|---|---|
| `status.success` | `✔` | `\uf00c` | `[+]` |
| `status.error` | `✘` | `\uf00d` | `[-]` |
| `status.warning` | `⚠` | `\uf12a` | `[!]` |
| `nav.cursor` | `❯` | `\uf054` | `>` |
| `tree.branch` | `├─` | `├─` | `\|-` |
| `progress.filled` | `━` | `━` | `=` |

`nerd` 档只把图标类换成私有区码位，制表符与进度条仍用普通 Unicode。`ascii` 档整体退化为多字符记号，用于字体覆盖最差的环境。

设置项在 appearance 页的 Theme 组，官方描述对 `nerd` 的说明是「需要 Nerd Font，或支持 Glyph Protocol 的终端（图标随带内数据下发）」。本机配置取值为 `nerd`。

## 符号键清单

`SymbolKey` 联合类型共 277 个键，分 24 类。数量最多的几类是：`icon` 57、`cmd` 44、`lang` 37、`tool` 24、`key` 18、`sep` 14、`status` 11、`boxSharp` 11、`tab` 10、`thinking` 7、`context` 6、`boxRound` 6，其余为树杈 5、导航 5、`format` 4、`md` 4、`chip` 3、`progress` 2、`boxDotted` 2、`checkbox` 2、`radio` 2，以及 `advisor`、`skill`、`btw` 各 1。

新增图标只需在这张表里加一个键，三档预设各给一个值。

## nerd 档的字形来源

`glyph-bundle.json` 收录 270 个私有区轮廓，生成自 `JetBrainsMono NFM Regular`（字体版本 2.304，Nerd Fonts 3.5.1），设计度量 `upm` 1000、`aw` 600、`lh` 1320。文件头注明由 `scripts/gen-glyphs.ts` 生成，不手工编辑。

## Glyph Protocol

协议用 APC 序列承载，格式为 `ESC _ 25a1 ; <verb> [; k=v]* [; payload] ESC \`，四个动词分别是 `s` 支持查询、`q` 覆盖查询、`r` 注册、`c` 清除。

握手时序：启动时在 DA1 探测之后发出 `s`；终端回复表示支持 `glyf` 时，OMP 一次性写入全部 270 个轮廓的注册，再对确认码位发一次 `q`，收到 `glossary` 类回复即确认字形已生效。

三条设计约束：

- 注册是即发即忘（`reply=0`），作用域限于当前会话。
- 只接受三段私有区：`0xe000`–`0xf8ff`、`0xf0000`–`0xffffd`、`0x100000`–`0x10fffd`，因此不会改到真实文字的字形。
- 确认码位是 `0xf0d57`，即状态行始终显示的 omp 标记（`icon.omp`）。

协议标识 `25a1` 取自 U+25A1 WHITE SQUARE 的小写十六进制；规范公开在 rio 终端的 `glyph-protocol.md`。

## 与 emoji 的分界

界面图标全部来自上述符号表，聊天里的 `:shortcode:` 补全用的是另一份独立的 emoji 表，例如 `mute` 对应 `🔇`。bash 命令行里的折叠标记（`🔇`、`⇡`、`⟵`、`⏱` 等）直接写在渲染逻辑里，既不随 `symbolPreset` 变化，也不参与字形注册；其中 `🔇` 是标准 emoji 码位 U+1F507，其余是普通 Unicode 文本符号。

## See Also

- [OMP Rust/TS architecture and pi-natives](rust-ts-architecture.md) — 原生插件与 TS 编排的分工
- [Node-API and napi-rs in OMP](napi-node-api.md) — 原生模块绑定方式
- [OMP bash 命令行折叠标记与 /dev/null 语义](../omp-tools/bash-shell-visualization-idioms.md) — 命令行里那批标记的含义
