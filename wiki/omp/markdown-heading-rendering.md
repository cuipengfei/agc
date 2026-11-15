# Markdown 标题的 TUI 渲染：彩色 ### 的来源与两种消除方式

> Sources: 本机 OMP 安装包源码直读（pi-tui/src/components/markdown.ts、pi-tui/src/theme/tui-adapters.ts、pi-tui/src/chat/assistant-message.ts），2026-11-15; 本机 ~/.omp/agent/config.yml，2026-11-15
> Raw: [OMP Markdown 标题渲染源码摘录](../../raw/omp/2026-11-15-markdown-heading-rendering-source.md)
> Updated: 2026-11-15

## Overview

LLM 输出的始终是带 `#` 的原始 Markdown。OMP TUI 收到文本后解析 heading token 的 depth，去掉原来的 `#`，再按级别决定怎么画到终端上。一级、二级标题画成不带 `#` 的彩色粗体；三级及以下标题则由 `#styleHeading` 固定把 `"#".repeat(depth)` 重新拼回文字前面再整行着色，这就是用户看到的彩色 `###`。

根因是两层：终端无法像 HTML 那样给六级标题设置连续字号；OMP 在 depth >= 3 时选择了「拼回 # 前缀」的固定实现。改显示不需要 fork OMP，两个办法见文末。

## 渲染分支

| LLM 输出 | depth | 绘制结果 | 源码位置 |
|---|---|---|---|
| `#` | 1 | 标题色 + 粗体 + 下划线，不带 `#`；支持 `TERMINAL.textSizing` 且宽度够时先尝试 2 倍字号 | markdown.ts:4216-4228, 4853 |
| `##` | 2 | 标题色 + 粗体，不带 `#` | markdown.ts:4854 |
| `###` 至 `######` | >= 3 | 标题色 + 粗体，拼回 `` `${"#".repeat(depth)} ${headingText}` `` | markdown.ts:4855 |

配色默认来自 `tui.colorfulMarkdown`（默认开启，tui-adapters.ts:203）：heading 按 depth 取 `COLORFUL_HEADING_COLORS = ["magenta", "yellow", "blue"]`（tui-adapters.ts:281, 288-290），即 H1 品红、H2 黄、H3 及更深统一蓝色。基础 heading 用单一 `mdHeading` 色，被 colorfulMarkdownRoles 在对象展开时覆盖（tui-adapters.ts:319-323）；关闭 colorfulMarkdown 后所有标题共用 `mdHeading` 色，`#` 前缀规则不变。本机 config.yml 没有覆盖 colorfulMarkdown，保持默认开启。

一级标题的 2 倍字号只在终端支持 text-sizing 协议且行宽够时生效；条件不满足时走普通分支，即粗体 + 下划线。

## 为什么终端做不到 HTML 那样

网页可以给 h1 到 h6 设连续递减的字号。终端是固定大小的字符格子网格，传统终端所有文字同字号；支持 OSC 66 / Kitty text-sizing 的终端也只能按整数倍占格（OMP 对 depth 1 用 2 倍），做不出六级字号梯度。OMP 因此只用颜色、粗体、下划线和 `#` 前缀四样来区分六级。

## 消除彩色 ### 的两个办法

**办法一：官方扩展渲染器，只改屏幕显示（兜底）**

配置项 `extensionRenderers.assistantText`（本机 config.yml:640-641 当前为 `false`）开启后，OMP 在把文字画上屏幕前调用扩展注册的 renderer。机制（assistant-message.ts:552-601）：

- 渲染器只作用于 `structuredClone` 出的深拷贝，历史、复制、导出内容保留原始文本；
- 每个 renderer 拿到上一个 renderer 的输出，返回 string 即替换；
- renderer 抛异常或返回非 string 时保留输入原样绘制，只记一次日志。

扩展在 renderer 里跳过 fenced code block，把正文里的 `### 标题` 改写为 `## 标题` 或 `**标题**` 即可。改写后 OMP 走 depth 2 分支或 bold 样式，屏幕上不再出现 `###`。改写后的效果尚未在本机实测。

**办法二：用户级规则限制标题层级（从源头）**

在用户级规则里写明回答最多使用 `##`，更细的条目用粗体、列表或表格。模型从生成源头不输出 `###` 及以下标题，TUI 自然只有干净的彩色标题。

两个办法同时用：办法一兜底任何模型的意外输出，办法二让输出本身更规整。

## 证据边界

- 全部结论来自本机安装包源码直读与 config.yml 核对；不同 OMP 版本行号可能漂移。
- 办法一中扩展改写后的实际显示效果未实测。
- 本机未改动任何配置或安装扩展。

## See Also

- [OMP 在 Herdr 多路复用器下的 Kitty 能力与开关](kitty-capabilities-and-gates.md) — OSC 66 文字缩放的判定链与当前链路为何不发送
- [OMP 界面图标：三档 symbolPreset 与 Glyph Protocol](symbol-presets-and-glyph-protocol.md) — 另一组 TUI 表面主题（图标字形）的机制
