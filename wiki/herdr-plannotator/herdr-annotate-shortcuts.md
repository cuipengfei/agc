# Herdr Annotate 快捷键清单

> Sources: 本机 herdr config.toml 与 herdr-plugin.toml 实测，2026-11-15
> Raw: [Herdr Annotate 快捷键完整清单](../../raw/herdr-plannotator/2026-11-15-herdr-annotate-shortcut-inventory.md)
> Updated: 2026-11-15

## Overview

Herdr Annotate 插件（本机版本 0.9.10）在 Herdr TUI 里提供终端批注、文档审阅、Agent 回复审阅三组能力。所有快捷键通过 `~/.config/herdr/config.toml` 的 `[[keys.command]]` 绑定，prefix 默认为 `Ctrl+B`。

## 终端批注

| 快捷键 | 命令 | 行为 |
|---|---|---|
| `Ctrl+B` → `a` | `annotate.capture` | 对终端选中文字打开批注对话框 |
| `Ctrl+B` → `Shift+A` | `annotate.copy-context` | 复制全部批注为 Markdown（不归档） |
| `Ctrl+B` → `Ctrl+A` | `annotate.copy-archive` | 复制全部批注并归档 |
| `Ctrl+B` → `Ctrl+V` | `annotate.paste-archive` | 粘贴批注到 Agent 输入框，成功后归档 |
| `Ctrl+B` → `Ctrl+S` | `annotate.send-archive` | 发送批注给 Agent（粘贴并回车），成功后归档 |
| `Ctrl+B` → `m` | `annotate.manage` | 打开批注管理器 |

## 审阅

| 快捷键 | 命令 | 行为 |
|---|---|---|
| `Ctrl+B` → `o` | `annotate.open` | 打开当前目录文档审阅 |
| `Ctrl+B` → `Shift+O` | `annotate.last` | 审阅 Agent 最近一条回复 |

## 未绑定的 action

`herdr-plugin.toml` 还注册了 `last-newest`（审阅最新回复）和 `terminal`（打开终端审阅），但本机 config.toml 未给它们绑定快捷键，可手动触发。

## TUI overlay 按键

plannotator-tui overlay 打开时：`a` = Looks Good，`c` = Comment，`d` = Delete，`q`/`Esc` = 退出。网页版 Plannotator 的 Quick Labels 存在 Cookie 里，TUI 没有这个功能。

## 证据边界

快捷键绑定来自本机 `config.toml` 第 41–93 行实测。TUI overlay 按键行为来自 plannotator-tui 源码与使用反馈，不同版本可能有差异。

## See Also

- [Herdr + Plannotator 工具链全量 Reference](toolchain-reference.md)
- [Plannotator 能标注哪些面](plannotator-annotatable-surfaces.md)
