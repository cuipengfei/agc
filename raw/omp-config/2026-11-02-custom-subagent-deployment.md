# 自定义 sub-agent 部署：4 个 agent、工具名适配与发现验证

> Source: 用户提供的《OMP 自定义 Sub-agents 与 Role 跨机器复刻文档》（附件，2026-11-02）；本机 `/home/cpf/.omp/agent/config.yml`、`/home/cpf/.omp/agent/agents/*.md`、`/home/cpf/code-inside/agc/manifest.json`；安装包 `@oh-my-pi/pi-coding-agent` 18.15.0 的 `src/discovery/helpers.ts`、`src/task/executor.ts`、`src/task/discovery.ts`
> Collected: 2026-11-02
> Published: Unknown

## 附件文档的三个必须替换点

附件以 `/root` 那台机器为「本机」写的，搬到当前 WSL 机器时有三个硬性替换点。

1. **模型 provider**：附件用 `copilot-api/*` 与 `copilot-api-chat/*`。当前机器 `config.yml` 的 `enabledModels` 里没有这两个 provider，实际有 c8787、c8787-chat、justwoker、motomoto-chat、opencode-zen、opencode-go、kimi-code、kimi-claw、deepseek、sensenova、openrouter、openai-codex、typesafe-zen、nvidia、kiro。
2. **MCP 工具名**：frontmatter `tools` 里写的是工具注册名，随各机器 MCP 服务配置变化。
3. **同步归属**：`manifest.json` 原本没有 `omp/agent/agents` 条目，需要新增才能把 agent 定义纳入 AGC 版本化。

## frontmatter 键名只认 camelCase

`parseAgentFields()`（helpers.ts:368-379）逐字行为：

- thinking 只读 `frontmatter.thinkingLevel`（字符串）；`thinkingLevel` 不是字符串时回退读字符串型 `frontmatter.thinking`；两者都不认时 `thinkingLevel` 为 undefined。
- read 摘要只读 `parseBoolean(frontmatter.readSummarize)`。
- 安装包 `src/` 全树搜索 `read-summarize` 与 `thinking-level`，命中的只有注释里的自然语言写法（如 `thinking-level resolution`），没有任何解析路径。连字符写法会被静默忽略，不报错。
- 消费点：`executor.ts:4331` 逐字 `...(agent.readSummarize === false ? { "read.summarize.enabled": false } : undefined),`。

## 本机四个 agent 的 frontmatter（逐字）

### librarian.md（49 行，13 个 tools）

```yaml
name: librarian
description: 只读外部文档与开源仓库考证员。用于查阅第三方库官方文档、GitHub 上游源码、Issue 与 PR 历史、版本语义差异以及真实工程用法示例。
tools: read, grep, glob, web_search, github, mcp__context7_resolve_library_id, mcp__context7_query_docs, mcp__deep_wiki_ask_wiki_question, mcp__deep_wiki_read_wiki_structure, mcp__deep_wiki_read_wiki_contents, mcp__grep_app_github_searchgithub, mcp__search_tavily_tavily_search, mcp__search_tavily_tavily_extract
model: "@smol"
thinkingLevel: high
readSummarize: false
```

### oracle.md（56 行，6 个 tools）

```yaml
name: oracle
description: 只读架构顾问、深层疑难排障与执行计划审查员。用于复杂方案取舍、多次修复未果的根因推理，以及动手前的计划阻塞项（Blocker）把关。
tools: read, find, grep, glob, ast_grep, lsp
model: "@architect"
thinkingLevel: high
readSummarize: false
```

### qa.md（40 行，7 个 tools）

```yaml
name: qa
description: 独立真机验证与端到端冒烟测试员。在真实 CLI、服务端口与运行表面执行正反面场景并记录实测证据，不修改业务源码。
tools: read, find, grep, glob, bash, eval, debug
model: "@task"
thinkingLevel: high
readSummarize: false
```

### frontend.md（33 行，未声明 tools）

```yaml
name: frontend
description: 前端界面、UI/UX、设计系统与 HTML/SVG 可视化实现员。先行提取并复用项目设计变量，交付风格统一、交互完整的前端代码。
model: "@designer"
thinkingLevel: high
```

四个文件合计 178 行。`frontend` 不写 `tools`，按 helpers.ts:335-337 的规则「只有缺失或 null 才选默认工具集」，它拿到的是内置默认工具集。

## MCP 工具名映射（附件写法 → 本机写法）

| 附件写法 | 本机注册名 |
|---|---|
| `mcp__deepwiki_ask_wiki_question` | `mcp__deep_wiki_ask_wiki_question` |
| `mcp__deepwiki_read_wiki_structure` | `mcp__deep_wiki_read_wiki_structure` |
| `mcp__deepwiki_read_wiki_contents` | `mcp__deep_wiki_read_wiki_contents` |
| `mcp__grep_searchgithub` | `mcp__grep_app_github_searchgithub` |
| `mcp__tavily_search` | `mcp__search_tavily_tavily_search` |
| `mcp__tavily_extract` | `mcp__search_tavily_tavily_extract` |

`mcp__context7_resolve_library_id`、`mcp__context7_query_docs` 与本机同名，未改。`read`、`grep`、`glob`、`find`、`ast_grep`、`lsp`、`bash`、`eval`、`debug`、`web_search`、`github` 是核心工具名，不随机器变化。

## modelRoles 新增两键

`/home/cpf/.omp/agent/config.yml:73-74` 逐字：

```yaml
  architect: c8787/gpt-6.1-sol:high
  designer: sensenova/glm-5.2:high
```

角色从 13 键增到 15 键。`smol`（`c8787/gpt-6-luna:high`）与 `task`（`opencode-go/deepseek-v4.1-flash:max`）保持原值未动。

## 发现验证输出（2026-11-02 实测）

`Settings.loadReadOnly` + `discoverAgents("/home/cpf/code-inside/agc", "/home/cpf")` + `getPerCallModelAdvertisement` 合并输出：

```json
{
  "roleCount": 15,
  "architect": "c8787/gpt-6.1-sol:high",
  "designer": "sensenova/glm-5.2:high",
  "totalAgents": 10,
  "found": [
    { "name": "librarian", "model": ["@smol"], "thinkingLevel": "high", "readSummarize": false, "tools": 13, "spawns": null, "source": "user" },
    { "name": "oracle", "model": ["@architect"], "thinkingLevel": "high", "readSummarize": false, "tools": 6, "spawns": null, "source": "user" },
    { "name": "qa", "model": ["@task"], "thinkingLevel": "high", "readSummarize": false, "tools": 7, "spawns": null, "source": "user" },
    { "name": "frontend", "model": ["@designer"], "thinkingLevel": "high", "tools": null, "spawns": null, "source": "user" }
  ],
  "perCallSelectorCount": 6,
  "perCallSelectors": [
    "c8787/gpt-6-luna:high",
    "c8787/gpt-6-luna:max",
    "c8787/gpt-6.1-sol:high",
    "opencode-go/deepseek-v4.1-flash:max",
    "sensenova/glm-5.2:high",
    "sensenova/glm-5.2:max"
  ]
}
```

要点：

- 四个 agent 全部 `source: "user"`，即从 `~/.omp/agent/agents/` 发现；`totalAgents` 为 10，等于原 6 个 bundled 加这 4 个新增。
- `model` 是数组且保留 `@role` 原文，说明 frontmatter 的 role 别名在此阶段不展开，展开发生在模型解析阶段。
- 新增两个 role 的值都落在既有 6 个 per-call 许可 selector 内，许可面零扩大。
- `discoverAgents()` 返回 `{ agents: AgentDefinition[] }`，是数组不是以 name 为键的 Map；按 Map 方式写的断言会直接报错。

## manifest 条目（逐字）

`/home/cpf/code-inside/agc/manifest.json:272-278`：

```json
    {
      "name": "omp-agent-agents",
      "source": "~/.omp/agent/agents",
      "repo": "omp/agent/agents",
      "protected": false,
      "directory": true
    }
```

同文件 279-280 行是 `]` 与 `}`，条目位于 `entries` 数组末尾。

## 同步与提交记录

- 新增条目后 `./pull.sh` 拉入 5 个文件（`omp/agent/config.yml` 与 4 个 agent 文件）。
- 提交 `bcea58e`：6 文件、187 行新增（`manifest.json` 7 行、frontend 33、librarian 49、oracle 56、qa 40、`config.yml` 2）。
- push `87e6289..bcea58e  master -> master`。
- 复跑 `./pull.sh --dry-run`（2026-11-02）：`updated=0 would_update=0 unchanged=75 missing=0 protected_slots=45`，仓库副本与来源一致。

## 凭据边界教训

定位 provider 清单时对 `~/.omp/agent/models.yml` 做了全域 grep，输出把某 provider 的明文 API key 带进了会话记录。此后对该文件只做定向键读取，不复述任何值。同类边界：`models.yml`、`.env`、`auth.json` 这类文件不应按通配模式整体扫描。

## 未验证边界

frontmatter `tools` 里的 MCP 名字是否与本机实际注册名逐一对上，只在 spawn 时才会暴露。本轮冒烟调用只要求讲笑话，没有触发 MCP 工具路径，因此 librarian 的 6 个 MCP 工具名仍未实测。
