# Plannotator 能标注哪些面：三条终端入口与时效边界

> Sources: 本机 `@plannotator/pi-extension` 源码，2026-09-27；本机 `herdr-annotate` 0.9.10 清单与 README，2026-11-15
> Raw: [Plannotator OMP 插件 slash command 归属与浏览器服务链路](../../raw/herdr-plannotator/2026-09-27-plannotator-omp-plugin-slash-command-and-serving.md); [Herdr Annotate 0.9.10 升级实测与配置边界](../../raw/herdr-plannotator/2026-11-15-herdr-annotate-0-9-10-upgrade.md)
> Updated: 2026-11-15

## 问题

长期使用 Plannotator 的人会希望：coding agent 的所有对话都能直接标注，不必每轮手动跑一次 `/plannotator-last`。本机可用入口的实际形态决定了这件事能做到哪一步。

## OMP 侧的 `/plannotator-last`

插件处理器调用 `getRecentAssistantMessages(ctx, 25)`，取当前会话分支最近 25 条 assistant 消息；返回多于一条时把它们作为候选交给界面挑选，`startLastMessageAnnotationSession` 接收该列表。

三个边界：

- 候选列表在命令执行时生成。打开页面之后产生的新消息不会自动进入该页面。
- 候选是 assistant 的文本消息。用户消息、工具调用与工具结果不在列表内。
- 一次打开可以在候选之间切换并按同一批次提交反馈，因此「一次打开标注多条近期回复」是可做的。

## Herdr Annotate 侧的入口

0.9.10 清单包含 11 个 action，其中与标注直接相关的有六条：

| action | 作用 | 上下文 |
|---|---|---|
| `annotate.capture` | 对当前终端选择打开评论弹窗 | pane |
| `annotate.open` | 在 `plannotator-tui` 打开聚焦 pane 的目录，反馈回传该 pane 的 agent | workspace、pane |
| `annotate.gate` | 同上，带 Approve 按钮 | workspace、pane |
| `annotate.last` | 审阅聚焦 agent 的最近消息，先给候选选择 | pane |
| `annotate.last-newest` | 审阅最新消息，跳过候选选择 | pane |
| `annotate.terminal` | 审阅聚焦 pane 最近的终端输出（最后 200 行） | pane |

`annotate.open`、`gate`、`last`、`last-newest`、`terminal` 的平台限定为 `["macos", "linux"]`。

其余五个 action 不走审阅界面：`copy-context`（把全部批注复制为 Markdown）、`copy-archive`（复制后归档）、`paste-archive`（粘贴进 agent 输入框但不发送，随后归档）、`send-archive`（作为 agent 下一条消息发送，随后归档）、`manage`（浏览、编辑、复制、归档、恢复、删除已保存的批注）。

## 结论

本机没有持续更新的完整对话页面。可用的三个入口都按次打开：

1. 终端选择文字的即时评论（`capture`）。
2. 文档与 agent 回复审阅（`open`、`gate`、`last`、`last-newest`，由 `plannotator-tui` 承载）。
3. 终端输出审阅（`terminal`，最后 200 行）。

想要「一次打开、覆盖整个会话、后续消息自动进入」，当前版本不提供。能做到的最近形态是一次打开后在同一候选列表中切换最近的若干条 assistant 消息。

## 与 Inbox 的区别

Inbox 是 agent 主动发来的消息、问题与文件，它服务「agent 找人」。本文讨论的三个入口服务「人标注 agent 已产出的内容」，两者不重叠。

## 证据边界

处理器与数量来自本机安装包源码直读。200 行与 11 个 action 来自 `herdr-annotate` 0.9.10 的 README 与清单。未在浏览器或终端界面中实际点开这些入口验证交互，`annotate.terminal` 的目视效果未确认。

## See Also

- [Plannotator OMP 插件运行机制](plannotator-omp-plugin-mechanism.md)
- [Plannotator Inbox 与 OMP 接通](plannotator-inbox-omp-connection.md)
- [Herdr + Plannotator 工具链全量 Reference](toolchain-reference.md)
