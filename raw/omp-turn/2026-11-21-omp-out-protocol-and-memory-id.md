# OMP out:// 协议与 memory:// ID 获取路径

> Source: 本机 OMP 19.0.1 源码与上游 GitHub 提交记录（2026-11-21）
> Collected: 2026-11-21
> Published: Unknown

## out:// 提交记录

commit 93d0f52332089d249eea6a6b55d597fa7c4d9228（2026-10-29）：
`feat: added agent mid-turn replies via out://`

```text
- Introduced `out://` internal URL scheme for mid-task agent-to-user replies.
- Configured bash redirects (`> out://`) and direct `write` tool calls to route
  Markdown to the interactive TUI transcript.
- Replies stream live in the transcript without cutting off the agent's turn
  or closing the tool card.
- Implemented `ReplyWriteComponent` in the TUI to render reply prose alongside
  assistant messages.
- Enforced a 64 KiB payload limit per reply to prevent excessive transcript growth.
- Added `out.enabled` setting; replies are on by default in TUI sessions and off
  in non-interactive sessions.
```

commit 6568d96ded425c16190a9ecafbf2652c83852111（2026-10-30）：
`fix(eval): drew out:// replies sent from eval cells`

```text
- Bridged tool.write to out:// and tool.bash redirects to out:// now reach the
  eval call's details.replies, live and in the final result, so transcripts draw
  them after the eval card.
- Bridge callers with no reply sink (browser tab scripts, eval-defined tools)
  and backgrounded cells refuse such replies instead of reporting "Shown to the
  user." for text nobody sees.
```

## out:// 行为

写入方式：
- `write` 工具直接调用 `write out://`。
- `bash` 工具通过 `> out://` 重定向。

读取限制：
- Agent 无法通过 `read out://` 读取自己的输出。
- `out://` 仅支持写入，不支持读取。

渲染方式：
- OMP TUI 将内容渲染为普通 assistant 回复样式。
- 在 eval 调用中，内容出现在 `details.replies` 中，绘制在 eval 卡片之后。

用途：
- 工具执行期间（当前 turn 卡在工具执行阶段时），脚本或 Agent 需要向用户发中间消息。
- 不中断当前 turn，工具继续执行。

上限：64 KiB。

## memory://<id> 的获取路径

OMP Mnemopi 记忆系统的 ID 获取流程：

1. 调用 `recall` 工具，传入自然语言查询。
2. `recall` 返回相关性排序的记忆列表，每条包含内容摘要和 ID。
3. 摘要末尾的 `...` 表示截断；需要全文时使用 `read memory://<id>`。

示例（本会话实测）：
- `recall` 查询 "Herdr OMP 自定义 widgets widget header footer setWidget setStatus" 返回 8 条结果，包含 ID `d1a95ea0302870be` 和 `c4d8607706ba9ad1`。
- `read memory://d1a95ea0302870be` 读取完整内容。

来源：pi-coding-agent 的 Mnemopi 记忆工具，本机使用 mnemopi 后端。
