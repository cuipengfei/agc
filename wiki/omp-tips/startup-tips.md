# OMP 启动提示全表

> Sources: OMP upstream source code
> Raw: [OMP Startup Tips 源码取证](../../raw/omp-tips/2026-09-09-startup-tips-source.md)
> Updated: 2026-09-09

## 28 条提示

来源 `packages/coding-agent/src/modes/components/tips.txt`（27 条）+ `welcome.ts`（1 条条件提示）。

| # | 提示 |
|---|---|
| 1 | 懒得打「继续」？直接发一个 `.` |
| 2 | 你可以用 `/btw` 问一个旁支问题 |
| 3 | 用 `/tan` 把当前会话 fork 到后台 agent |
| 4 | Ctrl+D 可以退出，但草稿会保留 |
| 5 | 想知道你最「虐待」哪个模型？跑 `omp stats` |
| 6 | 试试任务隔离，创建 CoW worktree |
| 7 | 需要便宜的嵌套模型调用？用 `completion(x...)`。有一大堆批量任务？让 clanker 去用 |
| 8 | 代码像意大利面？用 `/omfg` 抱怨一下 |
| 9 | 每个 kitty/tmux/cmux/zellij/wezterm 分屏都保持独立会话 — `omp -c` 恢复最近的 |
| 10 | 在消息里打出 `ultrathink` 来触发更难的多步推理 — 输入时看它变成彩虹色 |
| 11 | 在消息里说 `orchestrate` 来驱动多阶段并行子 agent 任务 — 输入时看它发光 |
| 12 | 在消息里说 `workflowz` 来用 eval 驱动并行子 agent — 输入时看它发光 |
| 13 | 同一 provider 登录多个账号 — 再 `/login` 一次 — omp 自动跨账号负载均衡 |
| 14 | 跑一遍 `omp auth-broker serve`，所有机器都能拉取 live token；`omp auth-gateway` 作为 drop-in 代理，任何 OpenAI 兼容客户端都能连 |
| 15 | 按 alt+p（或 /switch）切换 provider，ctrl+p 循环角色模型 smol→slow→etc |
| 16 | 按 ctrl+r 搜索你的提示历史并复用过去消息 |
| 17 | `/force read` 把下一回合钉死在指定工具上，当模型总抓错工具时 |
| 18 | `/copy code` 把最后一块代码抓到剪贴板 — `/copy cmd` 抓最后一条 shell/python 命令 |
| 19 | `/shake` 把沉重的工具结果撕出上下文来回收 token，不用完整 `/compact` — `/shake images` 只丢图片 |
| 20 | 实时协作：`/collab` 通过端到端加密中继共享你的会话 — 队友跑 `/join <link>` 来 watch 和 prompt |
| 21 | 按左箭头键两下（`← ←`）打开 **Agent Hub** — 聚焦子 agent 时返回主会话 |
| 22 | 碰到 Codex 限速？`/usage reset` 花掉一个已保存的重置额度来立即恢复配额 |
| 23 | 没有原生 tool_calling？`PI_DIALECT=glm|kimi|anthropic…` 本地帮他们 roll |
| 24 | 打开 `/advisor` 挂载第二个模型，每回合静默审查并注入建议 |
| 25 | 试着用 `->` 开头，然后写列表（1. 做 X，2. 做 Y）— 这是 yield-queue shorthand，把消息加入队列等待处理 |
| 26 | 按 shift+tab 循环 reasoning effort 档位 |
| 27 | lint/type 错误堆积？`omp cleanse`（或 /cleanse）用并行子 agent 追捕并修复 — esc 取消 |
| 28 | 条件提示：symbol preset 为 `unicode` 时，10% 概率显示「请使用 nerdfont 😭」|

## 机制

**加权随机**：普通 tip 权重 1，`[NEW]` 结尾权重 4。

**第 28 条锁存**：`#nagRoll` 用 `??=` 锁存；切到 `nerd` preset 后重新读取会绕过已锁存的 nag。

**显示控制**：
- `startup.quiet` — 跳过欢迎屏
- `startup.showSplash` — 控制 splash

## 相关机制

- **Agent Hub**（`← ←`）：`input-controller.ts:590-603`，空编辑器双击左箭头打开；聚焦子 agent 时返回主会话
- **`omp -c`**：`main.ts:1027-1029`，`SessionManager.continueRecent(cwd)`，恢复最近会话
- **`->` yield-queue**：`queue-input.ts:20-23`，把消息加入 yield 队列，等当前处理完成后再消费

## See Also

- [OMP Auth Broker 与 Gateway](../omp-auth/auth-broker-gateway.md) — 第 14 条的安全边界与用例
- [OMP 工作模式与 Magic Keywords](../omp-modes/modes-and-magic-keywords.md) — 第 10–12 条的关键词机制
