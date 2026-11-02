# OMP 自定义 sub-agent：定义、工具名适配与验证

> Sources: 用户提供的《OMP 自定义 Sub-agents 与 Role 跨机器复刻文档》，2026-11-02；OMP @oh-my-pi/pi-coding-agent 18.15.0 源码与本机实测，2026-11-02
> Raw: [自定义 sub-agent 部署与工具名适配](../../raw/omp-config/2026-11-02-custom-subagent-deployment.md); [冒烟：自报模型 ID 核验绑定链](../../raw/omp-config/2026-11-02-subagent-smoke-test-selfreported-models.md); [agent 定义与 @role 绑定](../../raw/omp-config/2026-11-01-agent-role-model-binding-example.md)
> Updated: 2026-11-02

## Overview

用户级 sub-agent 写在 `~/.omp/agent/agents/<name>.md`，frontmatter 写配置、正文写 system prompt。本机据此部署了 4 个自定义 agent（librarian、oracle、qa、frontend），各绑一个 model role，配两个新 role（architect、designer）。跨机器复刻要替换三样东西：模型 provider、MCP 工具注册名、manifest 同步归属。验证分两段：写入前用 `Settings.loadReadOnly` + `discoverAgents()` 断言，写入后让 agent 自报模型 ID 核验绑定链。

## 文件形态与字段

用户级 `~/.omp/agent/agents/*.md`，项目级 `<project>/.omp/agents/*.md`。frontmatter 必需 `name` 与 `description`，正文即 `systemPrompt`；常用可选字段 `tools`、`spawns`、`model`、`thinkingLevel`、`readSummarize`、`prewalk`、`advisor`、`output`、`blocking`、`structured`、`autoloadSkills`。`main` 与 `sub` 是保留名。

`tools` 只有缺失或 YAML null 才选内置默认工具集；空数组等于不选任何内置工具。`spawns` 缺省但 `tools` 含 `task` 时按兼容规则视为 `*`。

本机四个 agent 的实际配置：

| agent | tools 条数 | 绑定 role | thinkingLevel | readSummarize | 职责 |
|---|---:|---|---|---|---|
| `librarian` | 13 | `@smol` | high | false | 只读外部文档与上游仓库考证 |
| `oracle` | 6 | `@architect` | high | false | 架构选型、疑难排障、计划阻塞项审查 |
| `qa` | 7 | `@task` | high | false | 真机运行表面端到端冒烟验证 |
| `frontend` | 未声明 | `@designer` | high | — | 前端组件、设计令牌复用、HTML/SVG 可视化 |

四个文件合计 178 行；`frontend` 不写 `tools`，拿到内置默认工具集。

## frontmatter 键名：连字符与 camelCase 等效

`parseFrontmatter()` 默认 `rawKeys = false`，解析后用 `normalizeFrontmatterKeys()` 递归把含连字符的键转成 camelCase（`kebabToCamel()` 注释即 `"thinking-level" -> "thinkingLevel"`，pi-utils/src/frontmatter.ts:14-18、26-49、145）。agent 入口 `parseAgent()` 用默认选项调用，未传 `rawKeys: true`（task/agents.ts:111-115），所以 agent 文件同样走归一化。

因此 `thinking-level` 与 `thinkingLevel`、`read-summarize` 与 `readSummarize` 都受支持；`parseAgentFields()` 读的是归一化后的 camelCase 字段（helpers.ts:368-379）。官方 v18.14.2 文档本身用连字符写法，并注明 `read-summarize: false` 会 normalized to `readSummarize`。

需要原样保留键名的是严格规范 loader：`rawKeys: true` 只出现在 skillshare/pack.ts:70 与 discovery/agent-plugins.ts:166 这类按规范校验 `allowed-tools` 的路径。

消费点在 executor.ts:4331：`...(agent.readSummarize === false ? { "read.summarize.enabled": false } : undefined),`。字符串 `"false"` 经 `parseBoolean` 归一，最终仍严格比较。

## 跨机器复刻的三个替换点

1. **模型 provider**。附件原值用 `copilot-api/*`、`copilot-api-chat/*`，本机 `enabledModels` 无这两个 provider，必须换成目标机存在的 provider。本机映射：`architect` → `c8787/gpt-6.1-sol:high`，`designer` → `sensenova/glm-5.2:high`，`smol` 与 `task` 沿用现值。
2. **MCP 工具注册名**。frontmatter `tools` 写的是工具注册名，随各家 MCP 配置变化。本机把 `mcp__deepwiki_*` 换成 `mcp__deep_wiki_*`、`mcp__grep_searchgithub` 换成 `mcp__grep_app_github_searchgithub`、`mcp__tavily_*` 换成 `mcp__search_tavily_tavily_*`；`mcp__context7_*` 与核心工具名在本机同名，不需改。
3. **同步归属**。`manifest.json` 原本没有 agent 目录条目，需新增 `omp-agent-agents`（`source: ~/.omp/agent/agents`、`repo: omp/agent/agents`、`directory: true`）才能纳入版本化。

## role 与模型的连接

两个新 role 落在既有 per-call 许可集合内，授权面不扩大：

```yaml
modelRoles:
  architect: c8787/gpt-6.1-sol:high
  designer: sensenova/glm-5.2:high
```

角色从 13 键增到 15 键，per-call 许可 selector 实测仍为 6 个。`discoverAgents()` 返回的 `model` 字段保留 `@role` 原文（如 `["@smol"]`），说明别名在这一阶段不展开，展开发生在模型解析阶段。发现结果为 `source: "user"`，`totalAgents` 为 10（原 6 个 bundled 加 4 个新增）。

## 验证方法

**写入前断言**（确定性，不需要真实调用）：`Settings.loadReadOnly({ agentDir, cwd })` 取 `modelRoles` 计数与新增键值；`discoverAgents(cwd, home)` 取 `agents` 数组，按 name 建索引核对 `model`、`thinkingLevel`、`readSummarize`、`tools.length`、`source`；`getPerCallModelAdvertisement(settings)` 核对许可 selector 集合没有意外扩大。注意 `discoverAgents()` 返回 `{ agents: AgentDefinition[] }`，是数组，不是以 name 为键的 Map。

**写入后冒烟**（真实 spawn）：给每个 agent 一个固定小任务并要求自报模型 ID。这是最省 token 的绑定链核验手段，因为它同时证明 discovery、prompt 注入、role→模型解析三段都通。本机四条结果：

| agent | 自报 ID | 耗时 | 对应 role |
|---|---|---|---|
| `qa` | `opencode-go/deepseek-v4.1-flash` | 7.8s | `@task` |
| `librarian` | `c8787/gpt-6-luna` | 8.0s | `@smol` |
| `oracle` | `c8787/gpt-6.1-sol` | 11.4s | `@architect` |
| `frontend` | `sensenova/glm-5.2` | 1m25s | `@designer` |

四个 ID 与映射逐一对应。派遣摘要显示 `using librarian, oracle, qa, frontend`，说明 batch 内每个 item 的 `agent` 都按名解析，没有回落到默认 `task`。若 agent 名未生效，摘要会显示通用 task worker。

## 证据边界

- 自报 ID 只到模型族，缺 `:high`/`:max` 后缀。这条路径证明 model 族绑定正确，不能证明 thinking 档位按配置生效。
- 冒烟调用没有触发 MCP 工具路径，因此 `librarian` 那 6 个 MCP 工具名是否与本机注册名逐一对上，仍未实测；第一次真正的第三方库考证任务才会暴露。
- 单次耗时样本不足以判断 `frontend`（1m25s）明显慢于另外三个是模型特性还是网络抖动。
- 冒烟不证明 prompt 正文的行为质量，也不覆盖结构化输出与 `outputSchema` 路径。
- 新增 agent 在已开启的会话里，工具描述可能仍是启动时的快照；preflight 每次重载设置，但描述广播不刷新。完整生效以下一个会话为准。

## 凭据边界

定位 provider 清单时对 `~/.omp/agent/models.yml` 做全域 grep，会把 provider 明文 API key 带进会话记录。此后对该文件只做定向键读取；同类文件（`models.yml`、`.env`、`auth.json`）不应按通配模式整体扫描。

## See Also

- [OMP per-call model 与许可机制](per-call-model-and-allowlist.md) — 按次 `model` 的许可来源、accept 与 reject 规则，以及 agent frontmatter 作为许可来源的边界
- [OMP 配置语义手册](config-semantics.md) — subagent 并行度四道闸门（maxConcurrency、async.maxJobs、maxInFlightRequests、batch）
