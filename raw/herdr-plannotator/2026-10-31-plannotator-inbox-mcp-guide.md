# Inbox MCP 通道、唤醒与指令同步（官方 agent 指南摘录）

> Source: `backnotprop/plannotator` main：`docs/agent-guides/inbox-notifications-and-agents.md`
> Collected: 2026-10-31
> Published: Unknown

## MCP 工具与传输

> Tools: `send_message`, `read_thread`, `search`, `resolve_message`, `wait_for_reply`, `get_guide_brief`, `submit_guide`; `card` (the Board's cards, only while the Board is on; see "The Board").

> Transports: stdio through `plannotator inbox mcp` (the harness picker's commands use it), or Streamable HTTP at `http://127.0.0.1:<port>/mcp`. The window says to prefer the command, because the port can change.

> (`packages/server/inbox-mcp.ts`, `@modelcontextprotocol/server` 2.2.0, stateless)

> Character limits: server instructions stay under Claude Code's 2,048 characters.

> Answers: success is `structuredContent` plus one line. A refusal is `isError` with `<snake_code>: <message>`.

> `wait_for_reply` returns a reply as soon as it lands, or `{ status: "waiting", cursor }` after 50 s.

## 退出与唤醒

> With the `plannotator_inbox` tool in Claude Code, Pi or OpenCode 2, the person's reply arrives in your session by itself as a new message once the session is idle … End your turn instead of waiting.

> In Codex 0.149 or later (the TUI, the Codex app, the IDE extension), through the stdio server, the person's reply arrives in your thread by itself too: the Inbox puts it into your thread with `codex queue` … When send_message says the reply arrives by itself, end your turn instead of waiting, and do not call wait_for_reply.

> In Qwen Code 0.24 or later in a terminal (macOS and Linux), through the stdio server, the person's reply arrives in your session by itself too …

> OpenCode 1 has the tool but no wake, and nothing wakes another MCP client (or `codex exec`): call wait_for_reply, or read_thread later.

## 结果大小：窗口化读取

> **Windowed read_thread** (`packages/server/inbox-mcp-read.ts`, `windowedThread`): the header …; then the newest `limit` messages in full (`INBOX_THREAD_WINDOW`, 6); the person's earlier messages in full, newest first, while their bodies total `INBOX_EARLIER_PERSON_BYTES` (12 KB …) …

> A body over `INBOX_BODY_CUT_BYTES` (16 KB) is cut with a marker naming the `expand` call …

> `send_message` and `submit_guide` refuse a `thread` shaped like a message id (`msg_` + 26 ULID characters, any case …) with `validation_error: thread: "<id>" is a message id, and thread takes a name. To write in an existing thread, pass reply_to <id> instead.`

## 写给"本会话可能只记得标题"的线程

> `INBOX_REPLY_TO_CHECK` ("Before reply_to into a thread you have not read in this context window, call read_thread with no id and match the subject." …)

> send_message's result then adds one line when the message names an existing thread … that this session has not looked at for 3 hours (`INBOX_THREAD_STALE_MS`) or ever: `You have not read this thread since <time>; its subject is "<subject>" (thread name "<name>").`

## 规则同步到每个宿主

> **One thread per work stream** … Verbatim, once, on every surface with no exceptions.

> **Follow through** … `INBOX_FOLLOW_THROUGH_RULE` …: "Be proactive about Inbox updates and about replying to the person through the Inbox when you think they would want you to. Don't withhold important updates or decisions, and don't batch updates to send later: proactivity is better than procrastination."

> **Chat or Inbox** … a decision in the Inbox stays there; when the person writes in the chat, the agent says there what waits and links the thread … but never also asks it in the chat with a blocking question tool (AskUserQuestion or similar) …

> `INBOX_SUBAGENT_RULE` ("If another agent started you, report to it instead.")

> **Guidance parity** … `tests/inbox-guidance-parity.test.ts` builds each surface from its source … and checks the core sentences … verbatim on each …
