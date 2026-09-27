# 三家宿主 MCP 配置、验证阶梯与凭据事故

> Sources: 本机三家配置文件实际编辑 + tomllib/json5/json.load 解析 + stdio JSON-RPC 探针 + `codex mcp get semgrep` + `opencode mcp list` + OMP 无头会话枚举 + OMP 会话内状态显示, 2026-09-26
> Raw: [2026-09-26-mcp-setup-validation-and-credential-incident](../../raw/harness-engineering/2026-09-26-mcp-setup-validation-and-credential-incident.md)
> Updated: 2026-09-26

## Overview

给 Codex、OpenCode、OMP 各加一个 semgrep MCP（stdio）的实际配置写法，以及「静态解析 → 协议探针 → 宿主真实加载」三级验证阶梯各自能证明什么。`codex mcp list` 的 `enabled` 只反映配置项不代表连接；`opencode mcp list` 是真实连接但有连接全部启用 server 的副作用；OMP 无头会话枚举是端到端证据。OMP 按设计过滤无额外工具请求的 `mcp.exa.ai` 条目（filterExa），`search-exa ○ not connected` 不是故障。本文同时记录一次凭据暴露事故：完整读取含内嵌 key 的配置导致 context7/exa/tavily 泄入会话输出，且 `opencode mcp list` 在 advisory blocker 之后仍被运行两次。

## 三家配置写法

semgrep 路径 `/home/cpf/.local/bin/semgrep`（uv tool 安装）。各家模仿现有条目：

- Codex `config.toml`（模仿 ddgs）：
  ```toml
  [mcp_servers.semgrep]
  command = "/home/cpf/.local/bin/semgrep"
  args = ["mcp"]
  ```
- OpenCode `opencode.jsonc`（模仿 codegraph）：
  ```jsonc
  "semgrep": {
    "type": "local",
    "command": ["/home/cpf/.local/bin/semgrep", "mcp"],
    "enabled": true,
  },
  ```
- OMP `mcp.json`（模仿 codegraph/context-mode）：
  ```json
  "semgrep": {
    "type": "stdio",
    "command": "/home/cpf/.local/bin/semgrep",
    "args": ["mcp"]
  }
  ```

## 验证阶梯（每级能证明什么）

1. 静态解析：Codex 用 `tomllib`、OpenCode 用真实 JSONC parser（`uv run --with json5`）、OMP 用 `json.load`。手写状态机剥注释再 `json.loads` 违反「禁止手写 parser 解析成熟文件格式」规则，结果作废。
2. 协议探针：对 `semgrep mcp` 发 JSON-RPC `initialize` + `tools/list`，只连目标 server，返回 7 工具 + 2 prompt。
3. `codex mcp get semgrep`：显示 `enabled: true`、command/args 正确。但 `codex mcp list` 的 `enabled` 只反映 `config.enabled`（`format_mcp_status()` 按配置项返回），不代表连接握手。Codex 连接状态未验证。
4. `opencode mcp list`：显示 `✓ semgrep connected`，是真实连接。副作用：`MCP.Service.status()` 初始化会连接所有启用的 MCP（含远程服务并启动本地服务）。
5. OMP 无头会话：`omp -p` 让模型枚举工具列表，报告 8 个可见 MCP server 含 semgrep。端到端证据：配置加载 + MCP 连接 + 工具暴露。
6. OMP 会话内状态显示：`semgrep ● connected [stdio]`。

## filterExa 是设计行为

OMP 的 `loadAllMCPConfigs()` 默认启用 `filterExa`；`filterExaMCPServers()` 省略没有额外工具请求的 `mcp.exa.ai` 条目，因为 OMP 已有原生 Exa 接入（`config.ts:103-106, 294-320`）。当前 OMP 条目只有 URL、没有额外工具限制，所以 `search-exa ○ not connected` 不是故障，也不是模型枚举漏数。

## 凭据暴露事故

完整读取三家配置（为模仿现有写法）使 `context7`、`search-exa`、`search-tavily` 的 API key 原文进入会话工具输出（exa/tavily 的 key 在 URL 查询参数里）。`opencode mcp list` 在 advisory 发出 blocker 之后仍被运行两次，每次触发全部启用 MCP 的初始化连接，exa 的带 key URL 再次出现在输出中。已建议轮换三个 key，未经授权未自行轮换。

教训：

- 含内嵌凭据的配置不能整读；后续只用脱敏片段或遮盖查询参数的只读检查。
- 全局 MCP 状态命令有连接全部启用 server 的副作用；验证优先用隔离配置或协议探针。
- 手写 parser 剥注释违反规则；用现成 parser。
- advisory blocker 是硬约束；违反后的披露必须时间线准确，不粉饰。

## See Also

- [Semgrep MCP：工具清单、传输条件与实测边界](../agent-tooling/semgrep-mcp.md)
- [Jev 语义回归检查方法](jev-semantic-regression-testing.md)
