# Terminal graphics protocols landscape — Q&A with corrections

> Source: conversation with user, 2026-10-17; web search results (linked inline)
> Collected: 2026-10-17
> Published: Unknown

会话问答摘录。问题：「SIXEL、Kitty 之外还有哪些同类协议？」随后用户指出表格省略了 SIXEL 却提 kitty，要求解释。

## 第一轮回答（含被撤回的部分）

第一轮把协议切成「老式」「现代」「不走协议的字符渲染」三档，并把以下未取证项列进了表格与正文，被指超出本轮证据后**撤回**，不再作为事实陈述：

- NAPLPS（Telidon / Videotex，1980s 北美矢量协议）——仅文献印象，无来源
- Terminology（Enlightenment）私有内联图像协议——编码细节未核实
- DomTerm、Jexer 的自有图形方案——生态很小，未取证
- 「TGP 有时专指 kitty 那套（CRAN terminalgraphics 包用法）」——别名说法未取证
- Ghostty、Konsole 支持 kitty graphics protocol——未取证
- 「任何终端都能跑」的字符伪图像表述——不成立，字符色块仍依赖终端支持相应颜色控制，tmux/远端链路也可能影响显示

## 修正后的单表（SIXEL 归位）

修正理由（用户问「why omit sixel in the table and mention kitty?」）：第一轮按出身把 SIXEL 归进「老式」节，导致它既不在表里又被当作活协议单独提，kitty 因在现代节里占了表行——同一件事的两种处理，是构造不一致。修正后按「是否仍在实际使用」单表排列，历史出身单独标注：

| 协议 | 类型 | 起始标记 | 出身 | 当前实际使用 |
|---|---|---|---|---|
| SIXEL | 位图 | `ESC P q` | DEC VT 系列，1980s | 仍在使用（ttyd 1.7.7、TUIOS、OMP 都实现，据本仓库矩阵文章） |
| Kitty graphics protocol | 位图 | `ESC _ G` | kitty 终端，2020s | 仍在使用（Herdr、TUIOS、OMP 实现，据本仓库矩阵文章） |
| iTerm2 IIP（inline images） | 位图 | `OSC 1337 ; File =` | iTerm2 | 仍在使用（ttyd、OMP 实现，据本仓库矩阵文章） |
| ReGIS | 矢量 | `ESC P p`（DCS 前缀 + `p`） | DEC，VT330/VT340 | 少见，Contour 明确实现 |
| Tektronix 4010/4014 mode | 矢量（存储管） | 进入靠终端私有模式切换，之后走 GVT 字符序列 | Tektronix，1970s | 少见；支持者未逐条核实 |

历史矢量的补充说明：

- ReGIS 在 xterm 的支持程度未确认（本轮只确认 Contour）；Tektronix 4014 mode 在 xterm 的具体启用序列未逐条查证。
- SIXEL、Kitty、iTerm2 IIP 是矩阵文章链路（ttyd/Herdr/TUIOS/OMP）的全部候选；ReGIS 与 Tektronix 与图像协议链路无关。

## 不走协议的字符渲染（另一类，不是协议）

| 技术 | 每格容量 | 依赖 |
|---|---|---|
| 半块字符（U+2580 ▀ / U+2584 ▄ / U+2588 █） | 2 像素（上下半格各一色） | 终端支持前景/背景色（256 色或真彩色） |
| Braille patterns（U+2800 区） | 2×4 点阵 | 终端支持 Braille 字形 |

只能在支持相应颜色控制、且字形可用的终端里显示；tmux、远端链路、字体都可能影响效果。

## 本轮来源

- Kitty graphics protocol 文档：https://sw.kovidgoyal.net/kitty/graphics-protocol/
- SIXEL 终端支持清单：https://www.arewesixelyet.com/
- Tektronix 4010/4014 mode（VT100.net 手册第 13 章）：https://vt100.net/docs/vt3xx-gp/chapter13.html
- ReGIS（Contour 文档）：https://contour-terminal.org/demo/regis-graphics/

 advisor 判据更正（贯穿本轮）：Tektronix 4010/4014 的当前实现写「xterm / Contour 模拟」超出来源——搜索结果只确认了 VT100.net 手册，Contour 来源只支持 ReGIS，支持者标注为未核实。
