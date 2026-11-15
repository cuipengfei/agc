# Herdr Annotate 快捷键完整清单

> Source: 本机 `~/.config/herdr/config.toml` 与 `herdr-plugin.toml` 实测
> Collected: 2026-11-15
> Published: 2026-11-15

## 本机 Herdr Annotate 版本

`herdr plugin list --plugin annotate` 关键输出行：

```
version: 0.9.10
commit: 29643fb4...
```

## 快捷键绑定（全部来自本机 config.toml）

prefix 默认为 `Ctrl+B`。以下快捷键在 Herdr TUI 内生效。

### 终端批注（Terminal Annotation）

| 快捷键 | 绑定命令 | 行为 |
|---|---|---|
| `Ctrl+B` → `a` | `annotate.capture` | 对当前终端选中的文字打开批注对话框 |
| `Ctrl+B` → `Shift+A` | `annotate.copy-context` | 复制全部活跃批注为 Markdown 到剪贴板（不归档） |
| `Ctrl+B` → `Ctrl+A` | `annotate.copy-archive` | 复制全部活跃批注并归档（从活跃列表移除） |
| `Ctrl+B` → `Ctrl+V` | `annotate.paste-archive` | 将批注粘贴到 Agent 输入框（不发送），成功后归档 |
| `Ctrl+B` → `Ctrl+S` | `annotate.send-archive` | 将批注发送给 Agent（粘贴并回车），成功后归档 |
| `Ctrl+B` → `m` | `annotate.manage` | 打开批注管理器（查看/编辑/删除所有批注） |

### 审阅（Review）

| 快捷键 | 绑定命令 | 行为 |
|---|---|---|
| `Ctrl+B` → `o` | `annotate.open` | 打开当前目录文档审阅（plannotator-tui overlay） |
| `Ctrl+B` → `Shift+O` | `annotate.last` | 审阅 Agent 最近一条回复（plannotator-tui overlay） |

### 其他已配置快捷键（非 annotate）

| 快捷键 | 行为 |
|---|---|
| `Ctrl+B` → `t` | 打开临时 shell popup |
| `Ctrl+B` → `Alt+B` | 打开 btop 系统监视器 |

## annotate 插件 action 完整清单（herdr-plugin.toml）

| action id | 说明 |
|---|---|
| `capture` | 对终端选区打开批注对话框 |
| `copy-context` | 复制全部批注为 Markdown（不归档） |
| `copy-archive` | 复制并归档 |
| `paste-archive` | 粘贴到 Agent 输入框并归档 |
| `send-archive` | 发送给 Agent 并归档 |
| `manage` | 打开批注管理器 |
| `open` | 打开文档审阅 |
| `last` | 审阅 Agent 最近回复 |
| `last-newest` | 审阅 Agent 最新回复（按时间排序取最新） |
| `terminal` | 打开终端审阅（plannotator-tui herdr terminal） |

注：`last-newest` 与 `terminal` 未在本机 config.toml 中绑定快捷键，可通过 `herdr plugin action` 手动触发。

## TUI overlay 内的按键（plannotator-tui）

在 plannotator-tui overlay 打开时（审阅文档或 Agent 回复）：

| 按键 | 行为 |
|---|---|
| `a` | 标记 Looks Good（👍） |
| `c` | 写评论（💬 Comment） |
| `d` | 标记删除（✗ Delete） |
| `q` / `Esc` | 退出 overlay |

网页版 Plannotator 的 Quick Labels（`Verify this`、`Clarify this` 等）存在浏览器 Cookie 里，TUI overlay 没有这个功能；TUI 用 `a`/`c`/`d` 三个键覆盖等价的标注动作。

## 证据边界

- 以上快捷键绑定全部来自本机 `~/.config/herdr/config.toml` 第 41–93 行的实测读取。
- `herdr-plugin.toml` 的 action 清单来自插件安装目录下的 `herdr-plugin.toml` 与 `lite/herdr-plugin.toml`。
- TUI overlay 内的 `a`/`c`/`d` 按键行为来自 plannotator-tui 的源码与实际使用反馈；不同版本的 plannotator-tui 可能有差异。
