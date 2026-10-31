# Plannotator Inbox 产品页

> Source: https://plannotator.ai/inbox
> Collected: 2026-10-31
> Published: Unknown

## 定位

> An async surface for your long‑running agents

> Coding agents now work for hours. Over a run they have questions. They hit blockers. They produce plans and prototypes and diffs you need to review. The Inbox is where all of that arrives while they keep working. You read it like mail and answer when you get to it. Reviewing and annotating is the native Plannotator experience. The agent picks up your answer and goes on.

> Local. Claude Code and Pi and OpenCode and any MCP agent. Open source.

## 为什么不用 agent 自己的窗口

> The agent's window is for the run you are watching. Long runs are the ones you are not watching. With several agents going you are not sitting in any of their windows. Their questions and blockers and reviews need somewhere to land that is not a scrollback.

> The Inbox is that place. Every agent writes to it. Each item is a thread with its context attached. You open it when you are ready. You answer or annotate once. The agent continues from there.

## 三步流程

> 01 An agent writes to the Inbox while it works. A question with options. A blocker. A plan or a prototype or a diff to review.
> 02 You answer in the Inbox. Pick an option. Annotate the file with Plannotator. Send.
> 03 The agent gets the answer. It arrives as the session's next turn. The thread shows "Delivered to Claude Code".

## 一次运行里会收到什么

> The plan: The agent drafts a plan and asks what it cannot decide alone. The plan opens next to the thread. You comment on a line and pick the answers. Nothing reaches the agent until you send. If the agent edits the plan after sending it the Inbox says so and opens the version it sent.

> A prototype: The agent attaches the prototype. It opens inside the Inbox at full screen. You pin comments on the parts to change. The comments go with your next send. Markdown and HTML and Mermaid and Graphviz. Plannotator's annotation tools.

> The guided review: At the end of the run the agent sends a guided review. The change is split into sections in reading order. Each section has its diff and a short summary. Every file is checked against the real diff. You read the whole change in one sitting.

## 接入

> Plannotator's Claude Code mod and Pi extension and OpenCode plugin write to the Inbox on their own and wake the agent when you send. Claude Code has the Inbox tool on by default; for Pi and OpenCode, turn it on in the Inbox's Settings (it applies from the next Pi session or OpenCode start).

> Any other agent connects to the Inbox as a local MCP server.

- Claude Code：`claude plugin marketplace add backnotprop/plannotator`、`claude plugin install plannotator@plannotator`，然后退出并重启 Claude Code；需要 Claude Code 2.1.287 或更新版本，macOS 或 Linux；Windows 用 Other MCP agent 的 MCP 命令。
- Pi：`pi install npm:@plannotator/pi-extension`，然后在 Inbox 的 Settings 里打开 Pi，再开新会话或 `/reload`。
- OpenCode 2：`{ "plugins": [{ "package": "@plannotator/opencode@latest" }] }`；OpenCode 1：`{ "plugin": ["@plannotator/opencode@latest"] }`。
- 其他 MCP 客户端：`codex mcp add plannotator-inbox -- plannotator inbox mcp` 或等价的 stdio 配置。

> The tool is off by default on Pi because Pi sends every tool's definition with each request.

## 本地与许可

> - Listens on `127.0.0.1`. Opens in your browser.
> - Threads and answers are files under `~/.plannotator`.
> - Part of Plannotator. MIT or Apache 2.0.

> coming The same inbox hosted and on your phone.

## 安装

> `curl -fsSL https://plannotator.ai/install.sh | bash`

> `plannotator inbox` — It opens in your browser. You only run this once: from then on, agents start the Inbox in the background when they write to it.
