# 跨 Harness 编排官方文档摘录

> Source: Claude Code docs `https://code.claude.com/docs/en/sub-agents` 与 `https://code.claude.com/docs/en/agent-teams`; Codex docs `https://developers.openai.com/codex/subagents`; OpenCode docs `https://opencode.ai/docs/agents/`; OMO `https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/guide/orchestration.md`
> Collected: 2026-10-27
> Published: Unknown

本机版本：Claude Code `2.1.311`；Codex CLI `0.164.0`；OpenCode `v2.2.0`；OMO `5.1.48 (engine: senpi 2026.10.25-2)`。

## Claude Code

`https://code.claude.com/docs/en/sub-agents`：

> Subagents are specialized AI assistants that handle specific types of tasks.

> Subagents work within a single session.

> To run many independent sessions in parallel and monitor them from one place, see background agents. For separate sessions that pass messages to each other, see cross-session messaging. For a coordinated team of sessions Claude spawns and supervises, see agent teams.

`https://code.claude.com/docs/en/agent-teams`：

> Agent teams are experimental and disabled by default. Enable them by setting `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in your settings.json or environment.

> One session acts as the team lead, coordinating work, assigning tasks, and synthesizing results. Teammates work independently, each in its own context window, and communicate directly with each other.

> Subagents report results back to the main agent. In agent teams, teammates share a task list, claim work, and communicate directly with each other.

> Use subagents when you need quick, focused workers that report back. Use agent teams when teammates need to share findings, challenge each other, and coordinate on their own.

## Codex

`https://developers.openai.com/codex/subagents`：

> ChatGPT Work and Codex can run subagent workflows by spawning specialized agents in parallel and then collecting their results in one response.

> Current Codex releases enable subagent workflows by default.

> Use `/subagents` to inspect and switch between agent threads while they run. The main thread collects the subagent results into its final response.

> Codex handles orchestration across agents, including spawning new subagents, routing follow-up instructions, waiting for results, and closing agent threads.

> When many agents are running, Codex waits until all requested results are available, then returns a consolidated response.

## OpenCode

`https://opencode.ai/docs/agents/`：

> There are two types of agents in OpenCode; primary agents and subagents.

> General: A general-purpose agent for researching complex questions and executing multi-step tasks. Has full tool access except `todowrite`, so it can make file changes when needed. Use this to run multiple units of work in parallel.

> Subagents can be invoked automatically by primary agents for specialized tasks based on their descriptions, or manually by @ mentioning a subagent in your message.

> When subagents create child sessions, use `session_child_first` to enter the first child session from the parent.

## OMO

`https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/guide/orchestration.md`：

> omo-senpi turns one coding session into a coordinated team by separating planning from execution. The main agent (the session you're typing into) does the thinking and the orchestration; everything else is delegated through the `task` tool.

> `mass-ulw`: When tasks have real ordering (C needs A and B first), `mass-ulw` defines a run for the `workflow` tool from an eval cell: nodes with `id`, `prompt`, `category`, and `dependsOn`. One run covers one phase; the next phase is a new run.

> Team mode is for overlapping lanes that need to exchange discoveries mid-flight. The main agent becomes the lead of background member children (`team_create`), sends work with `task_send`, tracks it through `task_create` / `task_list` / `task_update`, and tears down with `team_delete`.

> The main agent spawns these through the `task` tool, and you can ask for them by name.

## 本机配置旁证

- Codex `~/.codex/config.toml` 含 `multi_agent = true`、`multi_agent_v2 = true`、`[agents] max_threads = 6`、`max_depth = 2`。
- 上述配置只作旁证，回答中的能力判断以官方文档为准。
