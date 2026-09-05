# 四 Agent CLI 能力面对比（codex / opencode / omo / omp）

> Sources: 本机实测（codex-cli 0.153.4、opencode 1.18.29、omo v4.19.4、omp 18.1.10），2026-09-05
> Raw: [四 Agent CLI 递归 --help 调查](../../raw/ai-coding-agents/2026-09-05-cli-help-recursive-survey.md); [版本号更正](../../raw/ai-coding-agents/2026-09-05-cli-survey-version-correction.md)（原 raw 第 7 行 opencode 版本误记为 1.2.19，正确为 1.18.29）; [证明强度收窄](../../raw/ai-coding-agents/2026-09-05-version-correction-proof-strength.md)
> Updated: 2026-09-05

对四款本机安装的 agent CLI 做递归 `--help` 调查：顶层 → 按 `Commands:` 段递归 → 对声明 action 的命令逐个探 `<cmd> <action> --help`。合计 179 个独立 help 页（omo 16、opencode 59、codex 65、omp 39）。

两个方法学发现：

- **假路径陷阱**（omo）：`omo config --help` 正文里出现的 show/validate/init 等词只是描述文字，不是子命令；逐一执行全部返回父级 help。必须按 `Commands:` 段真实列出的项递归，不能按文本猜路径。
- **omp 是单层文档**：62 个声明 action（`config list/get/...`、`plugin install/...`、`auth-broker serve/...` 等）逐个探 `--help`，62 个全部回落到父级页，0 个有独立 action help——action 文档全部平铺在父命令一页。

## 一、运行 agent 的方式

| 组 | codex | opencode | omo | omp |
|---|---|---|---|---|
| 交互 TUI（默认） | `codex`（裸调） | `opencode`（默认） | — | `omp`（裸调） |
| 非交互单发 | `exec [PROMPT]`（别名 `e`） | `run [message..]`（`--command`、`--format json`） | `run <message>` | `omp -p "…"` |
| 代码审查 | `review` / `exec review` | — | — | — |

`codex review` 与 `codex exec review` 都是非交互（help 原文「Run a code review non-interactively」）；差别在输出形态：`exec review` 额外有 `--json` 事件流与 `--output-schema`，面向 CI；裸 `review` 面向人。TUI 内的 `/review` 是第三条路，结果留在会话里。`exec` 独有 `--ephemeral`（不落盘）与 `--ignore-rules`（不加载 execpolicy）。omp 侧是模式开关：`--mode=text|json|rpc|rpc-ui`。

## 二、安全护栏

| 组 | codex | opencode | omp |
|---|---|---|---|
| 沙箱/审批 | `-s read-only\|workspace-write\|danger-full-access`、`-a on-request\|never` | `--auto`（自动批准未显式 deny 的权限） | `--approval-mode=always-ask\|write\|yolo` |
| 规则层 | `--ignore-rules`（execpolicy `.rules`） | — | TTSR：`ttsr test\|list\|scan` |
| Hook 信任 | `--dangerously-bypass-hook-trust` | — | — |
| 全跳过 | `--dangerously-bypass-approvals-and-sandbox`（别名 `--yolo`） | — | — |

三家的一键放开是同轴的：codex `--yolo` / opencode `--auto` / omp `--approval-mode yolo`。差异：codex 的 execpolicy 规则与 hook trust 各有独立开关（`--ignore-rules`、`--dangerously-bypass-hook-trust`），omo 还提供 `install --codex-autonomous` 把 Codex 配成免审批。详见 [Codex bypass 开关与 execpolicy 的关系](../../raw/ai-coding-agents/2026-09-05-codex-bypass-switches-and-execpolicy.md)。

## 三、会话管理

| 组 | codex | opencode | omp |
|---|---|---|---|
| 续上 | `resume [--last]` | `-c/--continue`、`-s/--session` | `-c/--continue`、`-r/--resume` |
| 分叉 | `fork [--last]`、`exec fork` | `--fork` | `--fork` |
| 归档/删除 | `archive`、`delete`、`unarchive`、`migrate-rollouts` | `session list`、`session delete` | `gc`（支持 `--blobs`/`--archive`/`--wal` 等维护选项；实际执行效果未验证） |
| 排队发消息 | `queue --thread <T> --message <TEXT>` | — | — |
| 导入导出 | — | `export [--sanitize]`、`import` | `--export=<file>`（HTML）、`--from-claude`、`--from-codex` |
| 分享 | — | `run --share` | `share SESSION [--gist]` |

## 四、分布式 / 服务化

| 组 | codex | opencode | omp |
|---|---|---|---|
| 起本地服务 | `app-server`（`--listen stdio://\|unix://\|ws://`） | `serve`（headless）、`web` | — |
| 连接远端 | `--remote ws://…` | `attach <url>` | `join <LINK>`（协作会话链接） |
| 守护进程 | `app-server daemon start\|stop\|restart\|bootstrap\|version` | — | `ps list\|info\|logs\|stop\|kill\|restart`（通用后台进程管家） |
| 远控配对 | `remote-control start\|stop\|pair` | — | — |
| 云端任务 | `cloud exec\|status\|list\|apply\|diff`（Codex Cloud） | — | — |
| 协议暴露 | `mcp-server`、`app-server generate-ts\|generate-json-schema` | `acp`（Agent Client Protocol） | `acp` |
| 局域网发现 | — | `--mdns`、`--cors` | — |

app-server 的已证客户端：help 原文点名 VS Code IDE extension；`--remote` 让 TUI 连远端 daemon；`agents` 浏览共享 daemon；`daemon bootstrap` 支持 SSH 驱动的远程管理。`generate-ts`/`generate-json-schema` 导出协议绑定 → 可自建客户端（推论）。「Codex Cloud 前端跑 app-server」是架构推断，help 未直证。

## 五、凭据与 provider

| 组 | codex | opencode | omp |
|---|---|---|---|
| 登录/登出 | `login [--with-api-key --device-auth]`、`login status`、`logout` | `providers login\|list\|logout` | `token PROVIDER [--raw --force-refresh --account N]` |
| 凭据库 | — | — | `auth-broker serve\|token\|login\|logout\|import\|migrate\|status\|list`（vault，支持 `--via=user@host`） |
| 出站代理 | — | — | `auth-gateway serve\|token\|status\|check` |
| 配额 | — | `stats`（用量/花费） | `usage`、`usage clients`、`dry-balance [--bench]`（多账号均衡演练） |
| 模型清单 | `debug models` | `models [provider]` | `models ls\|find\|refresh` |

## 六、MCP

| 组 | codex | opencode | omo |
|---|---|---|---|
| 增删查 | `mcp add\|list\|get\|remove` | `mcp add\|list` | — |
| OAuth | `mcp login\|logout`（`--oauth-client-registration auto\|cimd\|dcr`、`--oauth-resource`） | `mcp auth\|logout\|auth list`、`mcp debug` | `mcp oauth login\|logout\|status` |

codex 的 OAuth 最深：多了 CIMD/DCR 注册策略与 resource 参数。

## 七、配置 / 插件 / 特性开关

| 组 | codex | opencode | omo | omp |
|---|---|---|---|---|
| 配置读写 | `-c key=value`（dotted TOML）、`--strict-config` | — | `config migrate [--dry-run]` | `config list\|get\|set\|reset\|path\|init-xdg` |
| 特性开关 | `features list\|enable\|disable` | — | — | `plugin features <plugin>`、`--enable/--disable` |
| 插件 | `plugin add\|list\|remove`、`plugin marketplace add\|list\|remove\|upgrade` | `plugin <module> [-g --force]` | — | `plugin install\|uninstall\|list\|link\|doctor\|features\|config\|enable\|disable\|marketplace\|discover\|upgrade` |
| 升级/卸载 | `update` | `upgrade`、`uninstall` | `get-local-version` | `update [--check --plugins --canary --stable]` |

两种 features 命令不同物：codex `features` 是全局运行时特性门（详见 [Codex 特性门系统](codex-feature-flags.md)）；omp `plugin features` 是插件粒度的可选特性开关。本机实测：`ponytail` 与 `plannotator/pi-extension` 两个 npm 插件返回 `No optional features available`；marketplace 插件 `better-harness` 返回 `Plugin ... not found`——marketplace 插件不在 features 命名空间。

## 八、调试 / 探测

| 组 | codex | opencode | omp |
|---|---|---|---|
| 健康检查 | `doctor [--json --all]` | — | `doctor [--json]` |
| 调试子树 | `debug models`、`debug prompt-input`、`debug app-server send-message-v2` | `debug config\|lsp\|rg\|file\|scrap\|skill\|snapshot\|startup\|agent\|v2\|info\|paths\|wait`（13 个） | — |
| 直接探测工具 | — | `debug file read\|list\|search`、`debug rg files\|search`、`debug lsp diagnostics\|symbols\|document-symbols`、`debug snapshot track\|patch\|diff` | `read`、`grep`、`search`、`render`（重放 session 渲染）、`gallery`、`shell` |
| 压测 | — | — | `bench`（TTFT/prefill/decode + `--cache`）、`if-bench`（指令跟随） |

opencode 的 `debug` 子树最厚，把 agent 内部工具（file/rg/lsp/snapshot）当 CLI 直接暴露。

## 九、各自独有的「不成对」命令

| codex | opencode | omp |
|---|---|---|
| `apply <TASK_ID>`（把 agent 产的 diff 打上去） | `db [query]` / `db path`（CLI 暴露 DB 查询面） | `commit`（生成 commit message + changelog） |
| `exec-server` / `exec-server forward`（注册成远端执行环境） | `pr <number>`（拉 PR 分支跑 agent） | `git`（全屏 git UI） |
| | `github install` / `github run` | `cleanse`、`compress`、`tiny-models`、`say`、`browser-relay`、`grievances`、`images`、`ssh`、`worktree`、`join`、`share`、`stats` |

## 结构差异结论

- **codex**：把 agent 做成可远控、可上云的服务——app-server daemon、WebSocket 协议绑定导出、Codex Cloud 任务、execpolicy 规则层。
- **opencode**：把 agent 做成本地 HTTP 服务 + 可探测的本地库——`serve`/`web`/`attach`/`mdns`，`db` 与 13 个 debug 子命令把内部掀开。
- **omo**：不是 agent，是 OpenCode 的插件管理层——11 个顶层命令一半是装/清/查，核心动作只有 `run`（等 todo 与后台任务全结束才返回）和 `boulder`（看进度）。
- **omp**：工具最多的单机——39 个命令里一大组（broker/gateway/ps/say/images/grievances/cleanse/compress/if-bench）别家没有对应物；文档全部平铺一层。

## See Also

- [Codex 特性门系统](codex-feature-flags.md)
- [AI Coding Agent 对比：真正独特优势（19 家）](4-agent-comparison.md)
