# `plannotator inbox --help` 摘录（0.28.42）

> Source: 本机 `/home/cpf/.local/bin/plannotator inbox --help`，版本 0.28.42，输出 408 行；`/home/cpf/.local/bin/plannotator --version` 报 0.28.42
> Collected: 2026-10-31
> Published: Unknown

## 是什么

> The Plannotator Inbox is one local window per machine where you leave the person messages, questions, files to annotate and guided reviews. It binds 127.0.0.1 whatever `PLANNOTATOR_REMOTE` and `PLANNOTATOR_PORT` say; the person may publish the window over their tailnet, but the MCP server and agent tools answer only on this computer. Its data lives in `/home/cpf/.plannotator/inbox` (the data dir is set by `PLANNOTATOR_DATA_DIR`). The person reads your message there and answers when they can. Nothing holds your session open: you send, then keep working or end your turn.

## 何时使用

> Use it for: A question you cannot settle from the code or the conversation, which can wait for an answer. … A blocker: say what stops you (a `Stopped:` line, below). … Long work you finished: one short summary, with the files to look at in `attachments`. … A plan, document, HTML prototype or diagram the person should read and annotate (`attachments`). … Work that outlasts your reply …: a card on the person's Board (card), kept current as it moves. Only while the person has the Board on.

> Do not use it for: Something new the person raised in this chat that needs no pictures or files … A checklist, a status update or a decision written as `:::action` blocks … A sign-off on this plan, document or diff before you go on: use a Plannotator review (plan review, `plannotator annotate`, `plannotator review`).

> One thread per work stream, unless the person says otherwise.

## 如何到达

> 1. If you have a tool named `plannotator_inbox` (Claude Code, Pi, OpenCode), use it …
> 2. Otherwise use the stdio MCP server: `/home/cpf/.local/bin/plannotator inbox mcp`. "Connecting other agents" below shows how to register it.
> 3. Only as a fallback: Streamable HTTP at `http://127.0.0.1:<port>/mcp`. The port can change when the Inbox restarts …

> Every call starts a stopped Inbox in the background, without a browser tab, so never run `plannotator inbox` just to send. Bare `plannotator inbox` is for the person: it opens the window.

## 项目与会话身份

> The `plannotator_inbox` tool fills `project_path`, `agent_session`, `agent_host`, `agent_name` for you. It files your messages under the folder your session started in. … The stdio server fills `project_path` (its working folder, or `PLANNOTATOR_CWD`) and `agent_session`: the session's own id when a Claude Code or Pi session started it …; in Codex, your thread …; else one id per process, so pass `agent_session` yourself to keep your threads across restarts.

## 工具清单与关键行为

工具：`send_message`、`read_thread`、`search`、`resolve_message`、`wait_for_reply`、`get_guide_brief`、`submit_guide`，Board 打开时另有 `card`。

### send_message

> Arguments: `body`, `subject`, `thread`, `reply_to`, `supersedes`, `done`, `attachments`, `idempotency_key`.

> Returns `message_id`, `thread_id`, `new_thread`, `cursor` and the thread's `url`, and `actions` … when the body has `:::action` blocks.

> `attachments`: files to show the person beside your message … Markdown, plain text, config and data files, Mermaid and Graphviz sources and HTML open in Plannotator's viewers; images (PNG, JPEG, GIF, WebP, SVG, AVIF, BMP, ICO) show in the message; videos (MP4, MOV, WebM) play beside it, and the person comments at moments (each comment comes back with its time, `At 1:42 (102.4 s of 7:41)`, and the path of the paused frame, which you can read) …

### wait_for_reply

> Arguments: `thread_id`, `message_id`, `cursor`, `timeout_seconds`.

> It returns the reply as soon as it lands. Otherwise, after about 50 seconds (`timeout_seconds`, at most 50), it returns `{ status: "waiting", cursor }`: call it again with that `cursor` to keep waiting. A resolved thread answers `status: "resolved"` at once. When the person marks your latest message in the thread 👍 Looks good instead of replying, it returns `{ status: "acknowledged", acks: [{ message_id, label, at }], cursor }`: no reply is coming for it.

### card（Board）

> Keep a card on the person's Board for work that outlasts the reply it was asked in … The Board is something the person turns on (Settings → Capabilities in the Inbox); while it is off the Inbox does not list `card`, and a call answers `board_off` and writes nothing.

> `column`: `backlog` … `designing` … `your_look` … `building` … `your_review` … `shipped` … `dropped`. … Waiting on the person wins over work you keep doing beside it.

> The icebox is the person's pause: you cannot put a card there or move one out of it (`card_icebox_person_only`, `card_iceboxed`), and only the person restores a card they dropped (`card_dropped_by_person`) … A card or thread of another project is refused (`card_other_project`): pass that project's `project_path`.

> create: `title`: 2–5 words naming the work ("Pi update fix"), never a sentence; status goes in `say`.

## 线程

> 1. `reply_to` (a message id): that message's thread, as a reply. …
> 2. `thread` (a name, 1 to 120 characters, one line): the newest open thread of that name in this project, from any session. With none open, a new thread under that name. …
> 3. Neither: your session's own thread, the newest unnamed thread your session started in this project while it is open, else a new one. …

> Resolved means done: the next message starts a new thread, while `reply_to` still reaches a resolved thread. A thread keeps its first message's subject.

## 回复如何到达

> With the `plannotator_inbox` tool in Claude Code, Pi or OpenCode 2, the person's reply arrives in your session by itself as a new message once the session is idle, starting with the line `Plannotator Inbox: <subject> (<reply id>)`. End your turn instead of waiting.

> In Codex 0.149 or later … the person's reply arrives in your thread by itself too …

> OpenCode 1 has the tool but no wake, and nothing wakes another MCP client (or `codex exec`): call wait_for_reply, or read_thread later.

> The person answers in one reply per session, even when the answers are on several of your messages: then "Answers to your questions" has a `### Your message <id>` heading per message.

> The reply is the person's answer to you: their words, then an "Answers to your questions" section, then their comments on the text of your messages ("Feedback on your message from <time> (<message id>)": the exact words they selected, quoted, then their comment), then their annotations on any attached files.

## 问题语法

> `:::question` picks one choice, `:::question-multi` any number, `:::question-text` free text (so does a block with no choices).

> `Recommended: <label>` marks yours … Keep A, B, C order.

Inbox 专用行：`Stopped: <why>`、`Holds up: <name>; <name>`、`Replaces: <message id>/<key>`。决策行：`Stakes:`、`Shows:`、`Why:`、`Reversible: no — <why>`。行动项 `:::action` 只用于人必须亲自完成、agent 无法自己做的阻塞。

> Never use it for a decision or a question (ask a :::question), for anything you can do yourself, or as a checklist or a status update: one block per real blocker, and most messages need none.

## 工具开关与注册门

> The `plannotator_inbox` tool is on by default in Claude Code, off by default in Pi and OpenCode. `PLANNOTATOR_INBOX_TOOL=1` or `0` turns it on or off everywhere, and config.json `inboxTool` takes `true`, `false` or one per host (`{ "pi": true }`); the environment variable wins. A host decides once, at start (Claude Code and OpenCode when the process starts, Pi per session or `/reload`), and registers the tool only if the Inbox has run once on this machine by then (`inbox/inbox.json` exists); Claude Code registers it anyway, and its first call starts the Inbox. So the tool appears in sessions started after that, never in one already running. Once the Inbox has run here, a session with the tool also gets one line at its start saying when to use the Inbox; config.json `inboxReminder` (`false`, or one per host) turns that line off.

## 给 agent 指令文件加说明

> Plannotator can add a short note about the Inbox to an agent's instructions, so it sends decisions and finished work here while the person is away. Only with the person's yes: show them this list, then run `plannotator inbox --notes <ids>` with only the agents they agreed to (comma-separated).

受支持的 id：`claude-code`、`codex`、`gemini`、`qwen`、`pi`、`opencode`、`cursor`。OMP 不在清单里；`pi` 写的是 `~/.pi/agent/AGENTS.md`。

## 命令与退出码

```text
plannotator inbox [--background | --no-open | --open] [--tailscale]
plannotator inbox mcp
plannotator inbox status [--json]
plannotator inbox stop
plannotator inbox restart [--tailscale]
plannotator inbox link --offer [--tailscale] | link <code> | link --list
plannotator inbox unlink <machine>
plannotator inbox --notes <ids>
```

> `plannotator inbox status` … Exit 0 running, 1 not running, 2 not answering.

> `plannotator inbox --background`  Start it detached without opening a browser, print its URL and exit

> `--tailscale` is the person's choice: never add it to a start you run. The MCP server and the agent tools answer only on this computer.

## 数据与删除

> Everything lives in `/home/cpf/.plannotator/inbox`: threads by project, the versions of the files you sent, and `inbox.json` (where the running Inbox is).

> Never run uninstall, delete threads or projects, or edit these files for the person.
