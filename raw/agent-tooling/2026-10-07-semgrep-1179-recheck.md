# semgrep 1.179.0 MCP 七工具复核记录

> Source: 本会话实测（MCP 工具直调 + CLI 交叉验证），agc 仓库
> Collected: 2026-10-07
> Published: Unknown

## 复核背景

wiki/agent-tooling/semgrep-mcp.md 基于 1.178.0（2026-09-26）。本机已升 1.179.0，逐工具复测。

## 逐工具结果（2026-10-07，semgrep 1.179.0）
- `semgrep_scan`（绝对路径，src/agc_sync 六文件）：第一次同样因 registry 拉取 p/default 超时失败；重试成功，`"results": []`，六文件全扫。另跑 `semgrep scan --config p/default --quiet src/agc_sync` 交叉验证，终端无输出；因管道未保留退出码，此条证据等级低于 MCP 直返的零发现，两条记录并存。
- `get_supported_languages`：正常，返回全量语言清单。
- `get_abstract_syntax_tree`：正常，喂 `import os; os.system('ls -la')` + python，返回完整语法树（ImportAs/DotAccess/Call 结构）。
- `semgrep_rule_schema`：第一次拉取超时（`Failed to download config ... HTTP GET timed out after 10.0 seconds`），重试成功，返回完整规则 schema。
- `semgrep_scan`（绝对路径，src/agc_sync 六文件）：第一次同样因 registry 拉取 p/default 超时失败；重试成功，`"results": []`，六文件全扫。CLI `semgrep scan --config p/default --quiet src/agc_sync` 交叉验证同样零发现，两边互相印证。
- `semgrep_scan_with_custom_rule`：**路径必须相对**。第一次给绝对路径 `/tmp/semgrep-demo/cleanup.py` 报 `Failed to create temporary files: Untrusted path must be relative`；改相对路径 `cleanup.py` 后规则 `subprocess.call(..., shell=True)` 精确命中第 5 行第 5 列。
- `semgrep_scan_supply_chain`：`Error executing tool ... Supply Chain scan requires an active Semgrep daemon to be running.`（与 1.178.0 一致）
- `semgrep_findings`：`SEMGREP_APP_TOKEN environment variable must be set or user must be logged in to use this tool`（与 1.178.0 一致）

## 非安全能力实测

规则：

```yaml
rules:
  - id: no-print
    pattern: print(...)
    languages: [python]
    message: 直接 print 调用
    severity: INFO
```

对 src/agc_sync/cli.py 全文扫描，命中 6 处（L31C13、L49C17、L56C13、L57C13、L58C13、L95C9），行列精确。证明自定义规则不限安全主题，风格/约定类规则同样可用。

## 版本差异

1.178.0 → 1.179.0 未见行为差异；本地 stdio 暴露的工具集合不变（7 个）。
