# Coding Agent 候选发现：wide → narrow → deep

> Source: GitHub API 搜索 + 厂商 CLI 点名 + awesome-list 提取 + SWE-bench 名单 + README 机制词扫描
> Collected: 2026-09-04
> Published: Unknown

验证级别：`[RUN]` = 本会话执行并记录输出；`[README]` = 官方 README 原文摘录；`[SEARCH]` = 搜索结果，未逐条直读；`[USER]` = 用户标注裁定。

本文件记录一次 coding agent 候选发现的全流程，包括枚举方法、过滤逻辑、以及最终候选名单。

---

## A. 枚举方法（Wide 轮）

五路并行，合计 pool 1112 个仓库：

| 路 | 方法 | 产出 |
|---|---|---|
| GitHub 搜索 | 22 轮 query（topic + 描述关键词 + 语言 + star 门槛） | 736 个唯一命中 |
| 厂商官方 CLI | 点名 29 个（Anthropic/OpenAI/Google/Qwen/Kimi/xAI/DeepSeek/GitHub/Block/Charm/…） | 29 个 |
| awesome-list | 5 份 README 提取 slug（bradAGI、zhijiewong × 2、pablodz、1shiharat） | ~380 个 slug |
| SWE-bench | `SWE-bench/experiments/contents/evaluation/lite` 目录列表 | 63 个提交目录 |
| benchmark 榜单 | tbench.ai 尝试读取 | 失败（JS 渲染，未取到数据） |

已知未覆盖：crates.io、Homebrew/AUR、fork 网络、Product Hunt/Show HN。

## B. 过滤（Narrow 轮）

三层门：

1. **去重**：剔除 wiki 已有八家（can1357/oh-my-pi、deepseek-ai/deepseek-harness、1jehuang/jcode、PrimeIntellect-ai/prime-agent、xai-org/grok-build、anomalyco/opencode、sst/opencode、Gitlawb/openclaude、code-yeongyu/oh-my-openagent）
2. **存活**：非 archived、非 fork、`pushed` 在 2025-09 之后
3. **相关**：描述/topics 命中 coding/agent/terminal/CLI 相关词，排除 awesome-list、skill、plugin、MCP server、framework、orchestration

过滤后 151 个候选，按 star 排序取前 8 个进深挖。

## C. 深挖（Deep 轮）

对 8 个决赛选手的 README 做机制词扫描（interrupt|abort|inject|replay|checkpoint|resume|event.?sourc|append.?only|compaction|hook|plugin|sdk|watchdog|subagent|doom|stall|rollback|undo|snapshot|worktree|parallel|background agent|headless|acp|mcp）。

### C.1 DeepCode 的机制信号

`[README]` HKUDS/DeepCode README 原文摘录：

```
- Sessions that survive resume, compaction, and a second window
- Hooks see the whole lifecycle: before and after the model, before and after every tool call,
  even before context compaction — so your extensions can add context when it matters
- Parallel agents without file collisions
- Headless automation
```

### C.2 hermes-agent 的机制信号

`[README]` NousResearch/hermes-agent README 摘录：

```
- Interrupt-and-redirect mid-stream
- Spawn parallel subagents for research, then synthesize the results
```

### C.3 claurst 的机制信号

`[README]` Kuberwastaken/claurst README 摘录：

```
- Plugin system for community extensions
- Fork chats, queue messages, and attach files
- Parallel subagent fan-out: agent / teamcreate task types
```

### C.4 open-swe 的层定位

`[README]` langchain-ai/open-swe README 原文：

```
An open source software factory built on Deep Agents by LangChain.
```

```
Each cloud coding thread is bound to its own persistent sandbox
```

```
Deep Agents is the harness
```

```
Runs tasks from the web dashboard, GitHub, Slack, and Linear
```

判断：不是 terminal-first CLI harness，是编排层/软件工厂。入口是 dashboard/GitHub/Slack/Linear，交付物是 PR，不是本地文件。harness 在 `langchain-ai/deepagents`，open-swe 是包它的那层。

### C.5 aider 的机制面

`[README]` Aider-AI/aider README 全文 12328 字节。机制词扫描命中：

- git integration（auto-commit、diff、undo）
- add images and web pages to the chat
- web chat interface

未命中：hook、plugin、interrupt、abort、inject、replay、compaction、subagent、parallel、background、script、automate、watchdog、rollback、snapshot、worktree、event sourcing。

判断：老派 pair 编程范式，没有现代 harness 的机制面。这是 README 层面的证据，不代表源码里一定没有。

### C.6 claw-code 的刷量特征

`[RUN]` ultraworkers/claw-code：

```
stars=195087 created=2026-06-23 forks=108156 issues=41 watchers=195087
```

fork/star 比 0.55（正常项目通常 <0.1），issue 仅 41 个，描述自承是「博物馆展品」。判断：刷量特征明显，star 数不能当信号。

## D. 用户标注后的最终名单

`[USER]` 用户对候选清单做了 29 条标注，最终裁定：

### 值得看（8）

| 候选 | stars | 语言 | 一句 |
|---|---|---|---|
| badlogic/pi-mono | 101,754 | TypeScript | OMP 上游 |
| HKUDS/DeepCode | 16,523 | Python | README 机制密度最高 |
| Kuberwastaken/claurst | 10,345 | Rust | plugin + chat forking + 子 agent 扇出 |
| esengine/DeepSeek-Reasonix | 35,396 | Go | 描述提 prefix-cache stability |
| Hmbown/Codewhale | 40,912 | Rust | 只看过描述，未深挖 |
| charmbracelet/crush | 27,902 | Go | Charm 出品，TUI 好 |
| aaif-goose/goose | 53,906 | Rust | 有 harness-level 研究点名 |
| openinterpreter/openinterpreter | 68,237 | Rust | 开源模型 pair 工具 |

### 低优先（1）

| 候选 | 一句 |
|---|---|
| Aider-AI/aider | README 无现代 harness 机制面，只有 git integration + auto-commit |

### 已移除（16）

| 候选 | 移除原因 |
|---|---|
| anthropics/claude-code | 用户已了解 |
| openai/codex | 用户已了解 |
| NousResearch/hermes-agent | 用户质疑不是 coding agent |
| google-gemini/gemini-cli | Out of scope |
| github/copilot-cli | Out of scope |
| OpenHands/OpenHands | web 平台层，非 terminal-first |
| continuedev/continue | README 明说停更 |
| plandex-ai/plandex | 最后 push 2025-10-03，停 11 个月 |
| cline/cline | IDE 扩展层 |
| Kilo-Org/kilocode | IDE 扩展层 |
| TabbyML/tabby | 补全工具，无 agent loop |
| ultraworkers/claw-code | 刷量特征明显 |
| coleam00/Archon | 编排层 |
| stablyai/orca | 编排层 |
| herdrdev/herdr | 编排层 |
| BloopAI/vibe-kanban | 编排层 |
| langchain-ai/open-swe | 编排层（software factory，非 CLI harness） |
| SWE-bench 学术集（63 个） | 大多是 2024 年跑分器，非日常 harness |

注：MoonshotAI/kimi-cli、XiaomiMiMo/MiMo-Code 在第一轮标注中被移除（Out of scope），未计入上表。

## E. 方法学教训

1. **topic + star 搜索精度差**：22 轮查询 736 个命中，大多是 skills 仓库、awesome-list、MCP server、框架。真正有效的召回是厂商点名 + awesome-list。
2. **README 机制词扫描是便宜的先行代理**：能在不读源码的情况下筛出机制密度高的候选。但它是负证据（没扫到 ≠ 没有），不能当排除依据。
3. **用户标注比自动过滤更准**：自动过滤把 hermes-agent 排第 2，用户一眼就判它不是 coding agent。
4. **star 数会骗人**：claw-code 195k star 但 fork/star 比 0.55、issue 仅 41，明显刷量。

## F. 证据边界

- 全部 GitHub API 数据为 2026-09-04 时点快照
- README 摘录为原文直读，未读源码
- 未安装或运行任何候选
- tbench.ai 榜单未取到数据（JS 渲染）
- crates.io、Homebrew/AUR、fork 网络、Product Hunt/Show HN 未覆盖
