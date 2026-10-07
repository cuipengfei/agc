# Semgrep MCP：工具清单、传输条件与实测边界

> Sources: PyPI JSON API + semgrep develop 分支源码直读 + 本机 stdio 探针与 7 工具实测, 2026-09-26; 1.179.0 七工具复核, 2026-10-07
> Raw: [2026-09-26-semgrep-mcp-inventory](../../raw/agent-tooling/2026-09-26-semgrep-mcp-inventory.md); [2026-10-07-semgrep-1179-recheck](../../raw/agent-tooling/2026-10-07-semgrep-1179-recheck.md)
> Updated: 2026-10-07

## Overview

Semgrep 的 MCP server 是主 CLI 的子命令（`semgrep mcp`，stdio 默认；`-t streamable-http` 走 8000 端口），不是独立包。`register()` 注册 9 个工具，经 `deregister_tools()` 按传输与部署形态裁剪后，本地 stdio 部署实际暴露 7 个。PyPI 包无 extras，`mcp==1.29.0` 是核心依赖，装完 CLI 即可用。实测发现两个文档未写的前提：供应链扫描需要常驻 `semgrep daemon`，规则 schema 要联网拉取且 2 秒超时。

## 包形态

PyPI `semgrep` 1.178.0，`provides_extra: null`，无 extras；27 条 `requires_dist` 中 `mcp==1.29.0` 是核心依赖。安装：`uv tool install semgrep`。旧独立仓库 `semgrep/mcp` 已废弃，代码并入主 CLI（`cli/src/semgrep/mcp`）。

## 工具清单（9 注册，本地 stdio 实见 7）

`register()` 注册 9 个工具：`semgrep_rule_schema`、`get_supported_languages`、`semgrep_findings`、`semgrep_scan_with_custom_rule`、`semgrep_scan`、`semgrep_scan_remote`、`get_abstract_syntax_tree`、`semgrep_scan_supply_chain`、`semgrep_whoami`。

`deregister_tools()` 裁剪规则：

- stdio 传输移除 `semgrep_whoami`（要 OAuth JWT，只在 streamable-http/SSE 连托管服务时才有）。
- 本地模式移除 `semgrep_scan_remote`（hosted 专属）。
- hosted 模式移除 `semgrep_scan` 和 `semgrep_scan_supply_chain`。

另有 2 个 prompt（`write_custom_semgrep_rule`、`setup_semgrep_mcp`，`mcp.add_prompt` 注册，不是工具）、2 个 resource（`semgrep://rule/schema`、`semgrep://rule/{rule_id}/yaml`）、1 个 `/health` 路由。8 个 `TOOL_DISABLE_ENV_VARS` 开关可按工具禁用。

## 语义边界（源码可证）

- `get_abstract_syntax_tree` 收代码内容字符串 + `language`，不是文件路径；只解析给定代码的语法结构，不提供仓库级 references 或调用图。
- `semgrep_findings` 查平台历史扫描的存量结果，不做新扫描；需要 `SEMGREP_APP_TOKEN`。
- `semgrep_scan` 收绝对路径；`semgrep_scan_with_custom_rule` 收 `code_files: [{path, content}]` + YAML 规则串。

## 实测边界

stdio JSON-RPC 探针（`initialize` + `tools/list`）：server 自报 `semgrep 1.178.0`，7 工具 + 2 prompt，与源码一致。

7 工具逐一测试驾驶：

- `semgrep_scan`、`semgrep_scan_with_custom_rule`、`get_abstract_syntax_tree`、`get_supported_languages`：直接成功，结果正确（自定义规则精确命中 `eval`/`os.system`，行号列号全对）。
- `semgrep_rule_schema`：第一次失败——从 semgrep.dev 拉 schema，读超时只有 2 秒；重试成功。
- `semgrep_scan_supply_chain`：报错需要本地常驻 `semgrep daemon`，工具文档未写此前提。
- `semgrep_findings`：按预期报 `SEMGREP_APP_TOKEN must be set`。

## 2026-10-07 复核（1.179.0）

七工具重测，行为与 1.178.0 一致（工具集合不变、daemon/token 两个前提不变）。新增边界：

- **`semgrep_scan_with_custom_rule` 的 `code_files` 路径必须相对**：给绝对路径报 `Failed to create temporary files: Untrusted path must be relative`；改相对路径后命中精确。
- **p/default 规则集拉取同样会超时**（10 秒），重试成功——之前只记录过 rule_schema 的 2 秒超时。
- 非安全规则实测：一条 `print(...)` 风格规则扫本仓库 cli.py，命中 6 处、行列全对——自定义规则不限安全主题，风格与项目约定类规则同样可用。

## 调用时机

- 改完代码 → `semgrep_scan`；动依赖后 → `semgrep_scan_supply_chain`（需先起 daemon）；进仓库前 → `semgrep_findings`（需 token）；默认规则不够 → `semgrep_rule_schema` + prompt `write_custom_semgrep_rule` 造规则，再用 `semgrep_scan_with_custom_rule` 扫。

## See Also

- [MCP 配置与验证阶梯](../harness-engineering/mcp-setup-validation.md)
- [Headroom 0.39 配置与兼容性](headroom-039-config-and-compat.md)
