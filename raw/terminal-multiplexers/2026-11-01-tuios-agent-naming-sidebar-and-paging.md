# TUIOS Agent 命名、侧栏区块与翻页

> Source: 当前会话用户消息与 CLI 结果；https://github.com/Gaurav-Gosain/tuios/issues/1384；https://github.com/Gaurav-Gosain/tuios/pull/1388；https://github.com/Gaurav-Gosain/tuios/releases/tag/v0.12.1；v0.12.1 internal/config/constants.go、internal/input/keyboard_terminal.go、internal/input/copymode_handlers.go
> Collected: 2026-11-01
> Published: Unknown

## 用户原文

> when omp is idle, in tuios side bar, it looks ok, but when omp running, in tuios side bar, it shows bun

> that is not user expectation

> is this bug? known bug? reported bug?

> for tuios, can the same be done? now it only works for page down, which goes to bottom, not one page down. and for page up, it just not work

## 当前会话状态读取（结果归纳）

Agent=omp，state=working，身份来源=report，ForegroundCmd=bun。因此命名变化与 Agent 身份上报是不同信息。用户预期忙闲都显示 OMP，仅状态标记变化。

## Issue 原文

# Issue #1384: [FEATURE]: Rail: label agent panes with their own title instead of "claude N"

State: CLOSED
State reason: COMPLETED
Author: @zoneblaze
Created: 2026-10-30T15:22:49Z
Updated: 2026-10-30T19:15:42Z
URL: https://github.com/Gaurav-Gosain/tuios/issues/1384

## Body

### What is the feature?

Let the rail label an agent pane with the title its program sets, such as Claude Code's session name, instead of the program name plus a position number.

### Why do you want this?

I run 8–12 Claude Code panes in one session and name each one with `claude -n <name>` or `/rename` (`bob-dol-discover`, `cody-1`, …). The pane borders, `list-windows` (`display_name`) and `list-agents` all show those names. The rail shows `claude 1` … `claude 11`, so I can't tell which row is which pane without counting. The numbers also shift when an earlier pane closes, so `claude 7` doesn't stay the same agent.

### Proposed Solution

`railWindowLabel` (`internal/app/session_tree.go`) ranks custom name, then foreground command, then shell title. Its comment assumes the title is always `"<cwd> - <shell>"`, but agent harnesses set an informative title. Either:

1. When the pane has a detected agent harness and a title that is neither empty nor just the program name, rank that title above the foreground command; or
2. Add a rail option, e.g. `appearance.sidebar.pane_label = "auto" | "title" | "command"`.

For repeated labels (`internal/sessiontree/sessiontree.go`, `Title += " " + strconv.Itoa(i+1)`), use a suffix that stays with the pane, such as a number given when the pane is created or the short window id, so a row keeps its label when another pane closes.

### Alternatives Considered

`tuios set-window --name` works, because a custom name always comes first. But it has to be done by hand for every pane, and it fixes the label, so a later `/rename` or auto-title never shows. A Claude Code hook that copies the title into the custom name after every turn would also work, but it duplicates information tuios already has, and every harness would need one.

### Impact

Anyone who runs several panes of the same agent harness (Claude Code, opencode) in one session. Possible downside: churning titles. The rail's existing 200 ms debounce (`sidebar_title_debounce.go`) already handles bursts.

Environment: tuios 0.11.1 (Homebrew, pure-Go backend), macOS 26; behaviour confirmed in the source on `main` at 0083dd332.

## Comments (2)

### @Gaurav-Gosain · 2026-10-30T16:21:03Z

Thanks for writing this up so clearly @zoneblaze! You're right that the rail should use those names, since the borders, `list-windows` and `list-agents` all have them already. I'd go with your first option, so it works without a setting, and give the repeated labels a number that stays with the pane. I'm starting on it now and I'll link the PR here.

URL: https://github.com/Gaurav-Gosain/tuios/issues/1384#issuecomment-6527688774

### @Gaurav-Gosain · 2026-10-30T19:15:41Z

This is in now with #1388, and it will be in the next release. A pane named with `claude -n` or `/rename` shows that name on the rail. An agent with no name gets a short id that stays with its pane, like `claude 41ae`, so the rows stop shifting when a pane closes. Thanks for the report @zoneblaze! Let me know if a harness you use still shows the wrong name.

URL: https://github.com/Gaurav-Gosain/tuios/issues/1384#issuecomment-6531492750

## PR 原文

# Pull Request #1388: feat(rail): name an agent's row by the title it set

State: MERGED
Draft: false
Author: @Gaurav-Gosain
Base: main
Head: feat/rail-agent-titles
Merge state: UNKNOWN
Created: 2026-10-30T17:31:58Z
Updated: 2026-10-30T19:15:28Z
URL: https://github.com/Gaurav-Gosain/tuios/pull/1388

## Body

Fixes #1384

Thanks to @zoneblaze for the report, the source trace and the first proposal. I built that proposal, with no new setting.

The rail now shows the title that an agent set, such as the name from `claude -n` or `/rename`. A custom name still comes first. When several agents show only the program, each row now has a suffix that stays with the pane. Other repeated rows keep their plain numbers.

![Six panes on a real daemon. Two rows show bob-dol-discover and cody-1, and the rest show claude with the start of the window id.](https://github.com/user-attachments/assets/9feb9aa5-253d-4877-ac5d-d6e8b845d87a)

After the first pane closes, the other rows keep their labels: `9af0` is gone, and `a34b`, `2fbc` and `fbe3` do not change.

![The same rail after the first pane closes.](https://github.com/user-attachments/assets/7e1a4355-abce-430a-b260-0eb56fa62f12)

## Which titles count

`harness.TitleLabel` removes the mark in front of the title, then decides if the title has a name in it. I measured Claude Code, opencode, Pi and Crush on the installed programs. The other shapes come from each manifest's title comment.

| Harness | Title | Row |
| --- | --- | --- |
| Claude Code | `✳ Claude Code`, `◐ Claude Code` | `claude` |
| Claude Code | `✳ bob-dol-discover`, `◐ cody-1` | the name |
| opencode | `OpenCode` | `opencode` |
| opencode | `OC \| fix the test` | `fix the test` |
| Pi | `π - app` | `pi` |
| Pi | `π - fix-the-test - app` | `fix-the-test` |
| Crush | `crush ~/src/app` | `crush` |
| Amp | `fix the test - amp - ~/src/app`, `⠹ fix the test` | `fix the test` |
| Amp | `Plugin confirmation needed - amp - ~/src/app` | `amp` |
| Grok | `review - grok`, `review ⠧ Running tests`, `⚠ Action Required - review - grok` | `review` |
| Codex | `⠋ codex`, `Action Required - codex` | `codex` |
| Letta | `⠹ letta`, `[ ! ] Action Required \| letta` | `letta` |
| Any | empty, `~/src/app - fish`, `user@host:~/src`, `~/src/app`, `Terminal 8bf1c038` | the program |

Gemini CLI, Qwen Code, Hermes and Kiro write only status in the title. For example, Gemini CLI writes its current thought there. Their rows always show the program, because the name would change with each thought.

## The suffix

An agent row that shows only the program gets the start of the window id, such as `claude 41ae`. This is the case in the issue, where a number must not move to another agent. Nothing new is stored, because the id already exists and is saved with the session. It does not change on a reattach, and `tuios focus-window 41ae` accepts it. If two rows with one label start the same way, the suffix grows until they differ.

The other stable number is the tmux shim's `PaneNumber`. It has up to ten digits, and that is too wide for a rail row.

All other repeated rows keep their position, as they do today: `fish 2`, and `twin 3` for two agents with the same name. These numbers still change when an earlier pane closes.

## A fix to the title on a watched pane

A state sync wrote its title on every window. A sync is built earlier than the output this client reads, so it could put the last title back. The pane then kept the old title until the program set another one. A title that changes the agent's state sends a sync, so that kind of title lost the race often. The bug was on main too, but only the title bar showed it. Now only a pane this client does not watch takes its title from a sync.

## Other places

All the rail's paths use `railWindowLabel`: the panes of this session, the panes of other sessions, panes on a workspace this client does not watch, and the Inbox lookup. The GUI bridge sends the raw pieces, so it computes no label here. A GUI that draws its own label needs its own change.

One limit: the listing of another session puts a custom name in the title field. A custom name in that listing goes through the same shape rules, so a name such as `✳ logs` shows as `logs` there.

## Measured

Each idle window is 10 seconds with a real client and daemon.

| Case | Ticks | Renders | Bytes written | Context switches |
| --- | --- | --- | --- | --- |
| Spinner at 4 Hz in a watched pane, before this change | 0 | 0 | 0 | 828 |
| Spinner at 4 Hz in a watched pane, this change | 0 | 0 | 0 | about 800 |
| Same, with the raw title on the row (control) | 40 | 40 | 0 | 2046 |
| Title newer than the client's copy, on a hidden workspace | 2 to 3 | 0 | 0 | about 300 |

- A real title change reaches the row through the existing 200 ms debounce. A title on a hidden workspace reaches it through the daemon's listing.
- `railWindowLabel` takes 150 to 250 ns for an agent pane and 40 ns for a shell, with no allocations. It runs once per pane on a polled tick.
- `BuildSession` takes 4.8 µs and 17 allocations for 12 repeated agent rows.
- The stripped binary grows by 4096 bytes, from 48,873,735 to 48,877,831.

I also tried a guard for a hidden pane's frozen title in `tickPolledWork`. It changed no number, with or without a clock, so I left it out.

## Tests

- `TestRailNamesAnAgentByItsTitle` runs stand-in programs that the detector names as nine harnesses, and it sets the titles above.
- `TestRailRepeatedLabelStaysWithItsPane` closes the first of several agents that show only the program. It also checks a title on a hidden workspace, two agents with one name, and two shells with one label.
- `TestIdleCostStaysLow` has two new cases for the idle cost.
- `e2e/tui/NEGATIVE_CONTROLS.md` records thirteen controls. Each one fails at the step it names.
- `just check --changed` passes.
- The rail's labels are described in `docs/AGENT_STATE.md`, under "The name on a row".

## Files (10)

- docs/AGENT_STATE.md [MODIFIED] (+35 -0)
- e2e/tui/NEGATIVE_CONTROLS.md [MODIFIED] (+42 -0)
- e2e/tui/idle_test.go [MODIFIED] (+95 -0)
- e2e/tui/rail_agent_prefix_test.go [MODIFIED] (+472 -0)
- internal/app/inbox_lifecycle.go [MODIFIED] (+1 -1)
- internal/app/session.go [MODIFIED] (+9 -1)
- internal/app/session_tree.go [MODIFIED] (+37 -11)
- internal/app/sidebar_title_debounce.go [MODIFIED] (+1 -1)
- internal/harness/title_label.go [ADDED] (+215 -0)
- internal/sessiontree/sessiontree.go [MODIFIED] (+51 -1)

## Comments (1)

### @github-actions · 2026-10-30T18:02:00Z

<!-- tuios-binary-size -->
### Binary size

| target | this change | main | change | room under the ceiling |
|---|---:|---:|---:|---:|
| darwin/arm64 | 45328098 bytes | 45328050 bytes | +48 bytes (+0.0 KiB) | 4671902 bytes |
| linux/amd64 | 48840864 bytes | 48836768 bytes | +4096 bytes (+4.0 KiB) | 1159136 bytes |

The ceiling is 50000000 bytes for each target. Main's size is from main at 1ca882ba0685 (https://github.com/Gaurav-Gosain/tuios/actions/runs/41102461025).

State the size cost in the pull request body. CI fails only above the ceiling.

URL: https://github.com/Gaurav-Gosain/tuios/pull/1388#issuecomment-6529894706

## 版本说明核对（已读发布说明归纳）

v0.12.1 发布说明列出 Agent names in the rail 并链接 #1388。Issue 类型为 FEATURE、已完成，PR 已合并；与用户现象属于相关的标题优先级问题，OMP 工作时显示 bun 的具体情况未单独列出。后续 tuios --version 实测为 0.12.1，但没有完成该症状的忙闲对照验收。restart-server 帮助说明会停止 pane 内程序，不能作为无影响的刷新动作。

## 固定名称 workaround（只提出，未执行）

set-window --help 说明自定义名称替代 shell 动态标题。使用前应确认目标 pane ID；不要依赖未读取的变量或把焦点 pane 当作调用 pane。固定名称不会随以后运行的程序变化。

## 侧栏区块定义（源码原文片段）

```go
const SidebarDefaultSections = "sessions:25,terminals,files:25,agents:34"

// SidebarSectionNames are the sections appearance.sidebar.sections may name.
//
// This is membership as well as order. A section left out of the layout is a
// section the rail does not draw, and that is the only way to turn one off:
// there is no second switch per section, because a switch cannot say where a
// thing goes and two spacers would have no switch to share.
var SidebarSectionNames = []string{"sessions", "terminals", "files", "agents", "git", SidebarSectionCustom, SidebarSectionPane}

```

## 快捷键查询与处理（已读取结果归纳）

未修饰 PgUp/PgDn 发送给 pane 应用。默认 Shift+PgUp/Shift+PgDn 调用 terminal_scroll_page_up/terminal_scroll_page_down。keyScrollsPane 要求主屏且程序未启用鼠标模式；alternate-screen 或启用鼠标模式时传递给应用。

复制模式先按 Ctrl+B 再按 [；pgup 分支 cursor.PageUp，pgdown 分支 cursor.PageDown；Esc 返回正常输入。整页查看 TUIOS 保存的输出，不等同读取应用内部保存但未输出的历史。此次只查询，未改快捷键。
