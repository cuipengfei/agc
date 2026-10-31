# Plannotator Inbox 与 OMP 接通

> Sources: backnotprop/plannotator 官方指南 `docs/agent-guides/inbox-notifications-and-agents.md`，2026-10-31；本机 `plannotator` 0.28.42 的 `inbox --help` 与 CLI 实测，2026-10-31
> Raw: [本机接通 Inbox 的实测记录（OMP）](../../raw/herdr-plannotator/2026-10-31-plannotator-inbox-omp-session-evidence.md); [`plannotator inbox --help` 摘录](../../raw/herdr-plannotator/2026-10-31-plannotator-inbox-cli-help.md); [Inbox MCP 通道、唤醒与指令同步](../../raw/herdr-plannotator/2026-10-31-plannotator-inbox-mcp-guide.md); [Plannotator Inbox 产品页](../../raw/herdr-plannotator/2026-10-31-plannotator-inbox-product-page.md)
> Updated: 2026-10-31

## Overview

OMP 通过 Plannotator 的 Pi 扩展获得 Inbox 能力：开关按主机解析，Pi 与 OMP 默认关闭；工具只在会话启动时注册，并且要求本机已经运行过一次 Inbox（`inbox/inbox.json` 存在）。工具缺席时可以用 stdio 服务器直接发消息。Inbox 只监听 `127.0.0.1`，线程与答复以文件形式存放在 `~/.plannotator` 下，许可证是 MIT 或 Apache 2.0。

## 开关链

| 层级 | 形式 | 优先级 |
|---|---|---|
| 环境变量 | `PLANNOTATOR_INBOX_TOOL=1` 或 `0` | 最高，对所有主机生效 |
| 配置文件 | `~/.plannotator/config.json` 的 `inboxTool`：`true`、`false` 或按主机 `{ "pi": true }` | 次之 |
| 主机默认 | Claude Code 默认开；Pi 与 OpenCode 默认关 | 兜底 |

Pi 默认关闭的原因是 Pi 把每个工具的定义随每次请求发送，体积与 token 成本一直在付。插件把 OMP 归入 `pi` 主机，因此 `{ "pi": true }` 同时覆盖 Pi 与 OMP。

## 注册门与会话时序

主机在启动时决定一次（Claude Code 与 OpenCode 在进程启动时，Pi 每个会话或 `/reload`），并且只有在 `inbox/inbox.json` 存在时才注册工具。这条门决定：工具出现在此后启动的会话里，不会出现在已经在运行的会话里。Claude Code 例外，它总是注册，第一次调用时启动 Inbox。

Inbox 运行过之后，带工具的会话在启动时会额外收到一行提示，说明何时该用 Inbox；`config.json` 的 `inboxReminder`（`false` 或按主机）可以关掉这一行。

本会话的时序是这条规则的一个实例：

| 阶段 | 观察结果 |
|---|---|
| 会话开始 | 工具清单里没有 `plannotator_inbox`；插件 0.28.42 已安装，两处开关已打开 |
| 会话中段 | 用 stdio 服务器 `plannotator inbox mcp` 发消息成功，`tools/list` 返回 8 个工具 |
| 会话后段 | `plannotator_inbox` 的 `read_thread` 调用成功 |

工具在同一个会话的后段出现，与文档“只在启动时注册”的说法不完全一致；这两条事实都记录在此，具体机制未追踪。

## 本机启用现状

- `~/.plannotator/config.json` 写入 `"inboxTool": { "pi": true }`。
- `~/.omp/agent/.env` 写入 `PLANNOTATOR_INBOX_TOOL=1`，文件权限 600；用 `dotenv` 16.6.1 解析复核，共 9 个键，该键为 `1`。
- 用扩展自带的 `resolveInboxTool` 实测：环境变量分支与配置文件分支都返回 `true`。
- Inbox 首次启动地址 `http://localhost:42583/`，pid 88355。

`plannotator inbox --notes` 支持的宿主清单是 `claude-code`、`codex`、`gemini`、`qwen`、`pi`、`opencode`、`cursor`，不含 OMP；`pi` 写入 `~/.pi/agent/AGENTS.md`。

## stdio 通道

`plannotator inbox mcp` 启动一个无状态的 stdio MCP 服务器，也会在后台启动已停止的 Inbox，不开浏览器标签页。

返回的工具：`send_message`、`read_thread`、`search`、`resolve_message`、`wait_for_reply`、`get_guide_brief`、`submit_guide`、`card`（Board 打开时）。

`send_message` 的关键返回字段：`message_id`、`thread_id`、`new_thread`、`cursor`、`url`。会话身份方面，stdio 服务器用工作目录或 `PLANNOTATOR_CWD` 填 `project_path`；没有宿主会话标识时每个进程一个 id，需要跨重启保持线程就要自己传 `agent_session`。用 CLI 建卡时记录的 agent 身份显示为 `Pi`。

发送时带 `idempotency_key` 可以让重试返回同一条消息，不会重复投递。

## 等回复

`wait_for_reply` 在回复到达时立即返回；否则约 50 秒后返回 `{ status: "waiting", cursor }`，带同一个 cursor 再调即可继续等待。线程已归档时立即返回 `status: "resolved"`；对方用 👍 Looks good 代替回复时返回 `status: "acknowledged"`。

不同宿主的回复到达方式：

| 宿主 | 回复如何到达 |
|---|---|
| Claude Code、Pi、OpenCode 2（带 `plannotator_inbox` 工具） | 会话空闲后作为新消息自动到达，以 `Plannotator Inbox: <subject> (<reply id>)` 开头 |
| Codex 0.149 或更新版本（stdio） | 自动进入该 Codex 线程 |
| OpenCode 1、其他 MCP 客户端、`codex exec` | 没有唤醒，必须调 `wait_for_reply` 或稍后 `read_thread` |

## Board 的项目语义

`card list --anyone --json` 在本文件夹从未给 Inbox 发过消息时返回 `{ project: null, cards: [], total: 0 }`，文本提示 `No cards: the Inbox has never had a message from this folder's project.`，退出码 0。

`project: null` 表示这个文件夹对应的项目在 Inbox 里还没有记录，不表示“未关联”。除 `list` 外的卡片操作会直接拒绝：

```text
card_no_project: This folder's project has no Board yet: the Inbox has never had a message from it.
Send one with send_message first, or pass the project_path of a project the Inbox knows.
```

从这个文件夹发出第一条消息时项目随之建立；之后建卡、移卡都能成功。Board 关闭时所有卡片调用返回 `board_off` 且不写入；icebox 只有人能操作。

本机实测：发第一条消息后项目 `agc` 建立，`card create` 得到 `crd_01M69598X3N03BCJ5T8RM7Y1CF`（列 `your_look`），回复到达后用 `card ship` 把它移到 shipped。

## 边界

浏览器界面与新会话的自动注册未验证；`plannotator_inbox` 在本会话后段出现的机制未追踪。stdio 通道的调用用一次性客户端脚本完成，脚本未入库。

## See Also

- [Plannotator Inbox 通知与标注面](plannotator-inbox-notifications-and-annotations.md) — 通知触发、铃声与标注能力
- [Plannotator agent tool 注入与 Quick Labels 机制](plannotator-agent-tool-and-quick-labels.md) — agent 工具开关链与 OMP 的 .env 注入通道
- [Plannotator OMP 插件运行机制](plannotator-omp-plugin-mechanism.md) — 插件注册与 HTTP 服务链路
