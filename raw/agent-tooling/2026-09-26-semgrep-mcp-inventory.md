# Semgrep MCP：包形态、工具清单与实测边界

> Source: PyPI JSON API（semgrep 1.178.0 元数据）; semgrep develop 分支 `cli/src/semgrep/mcp/server.py`、`utilities/utils.py` 直读; `semgrep mcp --help`; 本机 stdio JSON-RPC 探针（initialize + tools/list）; 7 工具逐一实测; 全仓双路扫描（MCP `semgrep_scan` + CLI `semgrep scan --config p/default`）
> Collected: 2026-09-26
> Published: 2026-09-26

## 包形态与安装

- PyPI `semgrep` 最新 1.178.0，`provides_extra: null`——无 extras，`pip install semgrep` 即完整功能。
- 27 条 `requires_dist` 中无任何 `extra ==` 条件。`mcp==1.29.0` 是核心依赖，不是可选件。
- 安装命令：`uv tool install semgrep`，装完 `semgrep --version` 报 1.178.0，且 `semgrep mcp` 直接可用。
- 旧独立仓库 `semgrep/mcp` 已废弃，代码并入主 CLI（`cli/src/semgrep/mcp`）。运行方式是 CLI 子命令：
  - `semgrep mcp`：stdio 模式（默认），挂进 MCP 配置用这个。
  - `semgrep mcp -t streamable-http`：HTTP 模式，端口 8000。

## 工具注册清单（server.py register()）

`register()` 注册 9 个工具：

- `semgrep_rule_schema`
- `get_supported_languages`
- `semgrep_findings`
- `semgrep_scan_with_custom_rule`
- `semgrep_scan`
- `semgrep_scan_remote`
- `get_abstract_syntax_tree`
- `semgrep_scan_supply_chain`
- `semgrep_whoami`

`deregister_tools()` 按传输与部署形态裁剪：

- stdio 传输：移除 `semgrep_whoami`（它要 OAuth 登录的 JWT，JWT 只在 streamable-http/SSE 连托管服务时才有）。
- 本地模式：移除 `semgrep_scan_remote`（hosted 专属，`is_hosted()` 只读 `SEMGREP_IS_HOSTED`）。
- hosted 模式：移除 `semgrep_scan` 和 `semgrep_scan_supply_chain`。

所以本地 stdio 部署实际暴露 7 个工具。每个工具还有独立 env 开关（`TOOL_DISABLE_ENV_VARS`），如 `SEMGREP_SCAN_DISABLED`、`SEMGREP_SCAN_SUPPLY_CHAIN_DISABLED`、`SEMGREP_FINDINGS_DISABLED` 等 8 个，设 `true` 即从工具列表删除对应工具。

另有：

- 2 个 prompt（`mcp.add_prompt` 注册，不是工具）：`write_custom_semgrep_rule`、`setup_semgrep_mcp`。
- 2 个 resource：`semgrep://rule/schema`、`semgrep://rule/{rule_id}/yaml`。
- 1 个自定义 HTTP 路由：`GET /health`。

## 各工具语义边界（源码可证）

- `get_abstract_syntax_tree`：入参是 `code`（代码内容字符串）+ `language`，不是文件路径。只解析给定代码的语法结构，不提供仓库级 references 或调用图。
- `semgrep_findings`：查询 Semgrep AppSec Platform 上历史扫描的存量结果，不做新扫描。需要 `SEMGREP_APP_TOKEN`，否则报错 `SEMGREP_APP_TOKEN must be set`。
- `semgrep_whoami`：只认 JWT，不认 API token。
- `semgrep_scan`：入参 `code_files: [{path}]`，绝对路径。
- `semgrep_scan_with_custom_rule`：入参 `code_files: [{path, content}]` + `rule`（YAML 字符串）。

## stdio 探针实测

对 `semgrep mcp` 直接发 JSON-RPC `initialize` + `tools/list`：server 自报 `semgrep 1.178.0`，返回 7 个工具 + 2 个 prompt，与源码分析一致。

## 7 工具逐一测试驾驶结果

| 工具 | 结果 |
|---|---|
| `semgrep_scan` | 扫本仓库 `src/agc_sync/policy.py`：0 findings、0 errors，OSS 引擎，干净返回 |
| `semgrep_scan_with_custom_rule` | 自定义规则（禁 `eval`/`os.system`）精确命中两处，行号列号全对 |
| `get_abstract_syntax_tree` | 返回完整 AST JSON，f-string 拼接结构可辨 |
| `get_supported_languages` | 返回 60+ 语言标识符 |
| `semgrep_rule_schema` | 第一次失败：从 semgrep.dev 拉 schema，读超时只有 2 秒，超时挂；重试成功，返回完整规则 JSON schema |
| `semgrep_scan_supply_chain` | 报错：需要本地常驻 `semgrep daemon`。工具文档未写此前提 |
| `semgrep_findings` | 按预期报 `SEMGREP_APP_TOKEN must be set`，无 token 即空壳 |

## 扫描验证方法论

MCP `semgrep_scan` 返回空时看不到跑了哪些规则，单看 MCP 空结果不足以证明干净；需 CLI `semgrep scan --config p/default` 交叉验证才敢下「代码无问题」结论。（2026-09-26 对 agc 仓库的一次性双路扫描结果不入库，仅存此方法论。）

## 语言支持（官方 supported-languages 页）

Semgrep Code 支持 35+ 语言。GA 档含 Python、JavaScript、TypeScript、Go、Java、C#、Kotlin、Ruby、Scala、Swift、Rust、PHP、C/C++、Terraform、JSON 等；Beta 含 Elixir、Dart；Experimental 含 Bash、Dockerfile、HTML、YAML、Lua 等。开源引擎与商业 Pro 引擎成熟度分级不同，C/C++ 在开源版是 experimental。

## 实战建议

- 主力用 `semgrep_scan`（改完代码扫）+ `semgrep_scan_with_custom_rule`（项目规范固化），完全本地、无外部依赖。
- `semgrep_rule_schema` 失败就重试一次；agent 使用时应知道它可能超时。
- 供应链扫描要么起 `semgrep daemon` 常驻，要么在 agent 指引里写明「未起 daemon 时不要调 `semgrep_scan_supply_chain`」。
- `semgrep_findings` 配了 `SEMGREP_APP_TOKEN` 才有意义。
