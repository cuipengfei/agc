# Alibaba Open Code Review（ocr）：六阶段审查管线、双模式边界与本机接入

> Sources: alibaba/open-code-review v1.14.3 (commit f6379f71) 源码与本机接入实测, 2026-11-25
> Raw: [Alibaba Open Code Review (v1.14.3) 源码摘录与本机接入实测](../../raw/agent-tooling/2026-11-25-alibaba-open-code-review-source-and-local-setup.md); [Open Code Review 经 8787/4140 Copilot 网关 Responses 跨实例 401 与 {ocr_session_key} 修复证据](../../raw/copilot-gateway/2026-11-25-ocr-responses-cross-instance-401-and-session-key.md)
> Updated: 2026-11-25

## Overview

`alibaba/open-code-review`（命令名 `ocr`，本机版本 `v1.14.3` / `f6379f71`）是一个用 Go 编写的本地代码审查命令行程序。它通过六阶段混合管线把确定性规则与受限 LLM 循环结合起来，并提供需要独立配置模型凭据的原生模式（`ocr review` / `/skill:open-code-review`）和直接复用宿主 Agent 模型的委派模式（`ocr delegate` / `/skill:open-code-review-delegate`）。

## 软件形态与六个运行入口

`ocr` 的核心是平台原生 Go 二进制文件（通过 npm 包 `@alibaba-group/open-code-review` 或 GitHub Release `opencodereview-linux-amd64` 分发），向外暴露六个运行面：

1. **CLI 主程序（`cmd/opencodereview/root.go`）**：提供 `ocr review`（审查工作区、`-c` 单提交、`-b` 分支差异、`--preview` 预览文件选择、`--resume` 断点续跑、`--no-filter` 跳过反思过滤）、`ocr scan`（目录全量扫描）与 `ocr delegate`（供宿主 Agent 调用的确定性子命令）。
2. **交互式终端配置向导（`ocr config provider` / `ocr config model`）**：基于 TUI 选择内置或自定义服务商、填写 API Key 并自动触发连通性测试。
3. **本地只读网页端（`ocr viewer`，`internal/viewer/server.go`）**：在本地启动只读 HTTP 服务并打开浏览器，回放 `~/.opencodereview/sessions/` 下的 JSONL 历史会话，支持将评论标记为 `resolved` 或 `ignored`。
4. **Agent Skills 与 Plugins 包装层**：包含 `skills/open-code-review` 与 `skills/open-code-review-delegate` 两个通用技能，以及 Claude Code、Codex、Cursor、Kimi Code、Copilot CLI、OpenCode 的插件清单；包装层自身不含审查引擎，运行时全部调用本机的 `ocr` 二进制。
5. **编辑器插件与 ACP 适配器**：`extensions/` 下的 VS Code、IntelliJ IDEA 插件与 `acp/` 下的 `ocr-acp`（JSON-RPC 2.0 over stdio）。
6. **GitHub PR 本地临时目录隔离脚本（`skills/open-code-review/scripts/review_pr.py`）**：没有任何远程云沙盒或容器隔离；审远程 PR 时在本机 `~/.cache/opencodereview/pr-review/` 下创建独立 bare repo 与只读 `git worktree`，拉取时指定 `-c core.hooksPath=/dev/null` 与 `--no-recurse-submodules`，检出后直接删除被审 PR 自带的 `.opencodereview` 目录；若检测到 PR 修改了 `.gitignore`、`.gitmodules`、`.gitattributes` 或本地 `~/.opencodereview/config.json` 配置了外部 MCP 服务器，立即以退出码 `3` 终止拒绝自动运行。

## 六阶段审查管线：确定性代码与 LLM 的分界

一次完整的原生审查（`ocr review`）按顺序经过六个阶段：

| 阶段 | 确定性代码（零 LLM 参与） | 自然语言提示词 + LLM（动态推理） |
|---|---|---|
| **1. 文件筛选与体积熔断**（`internal/agent/selection.go`） | 按固定顺序过滤：① `ExcludeBinary` 二进制文件；② `ExcludeSecret` 强制拦截 `default_secret_patterns.json`（`.ssh`、`id_rsa`、`id_ed25519`、`.npmrc` 等，用户规则无权覆盖）；③ `ExcludeIgnored` 跳过 `node_modules/`、`vendor/`、`target/` 及 `.gitignore`；④ `ExcludeExtension` 校验是否在 `supported_file_types.json` 的 143 种后缀白名单内（不含 `.md`、`.txt`）；⑤ `ExcludeDefaultPath` 跳过 `default_exclude_patterns.json` 命中的测试/生成/锁文件；⑥ `ExcludeDeleted` 跳过纯删除文件；⑦ `ExcludeOversize` 单文件 Diff 超过 `MAX_TOKENS = 200000` 的 80%（`160000` Tokens）直接跳过。 | 无。 |
| **2. 文件分组**（`internal/agent/grouping.go`） | 待审文件数 `< 4`（`minFilesForGrouping = 4`）时不调用 LLM：总改动行数 `< 200`（`smallDiffTotalLineLimit = 200`）合为 1 组，`>= 200` 行拆为单文件 1 组。LLM 分组后，代码强制切分超过 `maxGroupFiles = 10` 的组、将超 `160000` Tokens 的组拆回单文件，并兜底遗漏文件。 | 待审文件数 `>= 4` 时调用 `callGroupingLLM`（`grouping_task_system.md`），仅发送 `[index] path (+added/-deleted)` 列表（不含 Diff 正文），返回二维整数索引数组。 |
| **3. 规则匹配**（`internal/config/rules/system_rules.go`） | 按 CLI `--rule` > 项目 `.opencodereview/rule.json` > 全局配置 > 内置 `system_rules.json`（70+ 种规则）匹配通配符；对 `.m` 后缀通过读取文件内容区分 MATLAB 与 Objective-C；同组规则按路径排序去重以保持 Prompt Cache 稳定。 | 规则正文为语言专属审查指令。例如 `go.md` 明文规定 `"Prefer under-reporting over false positives"`、默认不审 `*_test.go`，且禁报 `gofmt`/`go vet`/`staticcheck` 已覆盖项。 |
| **4. 审前风险规划**（`internal/agent/agent.go`） | 仅当组内最大单文件增删行数 `>= 50`（`PLAN_MODE_LINE_THRESHOLD = 50`），或组内文件数 `>= 2` 且总增删行数 `>= 100`（`PLAN_MODE_GROUP_LINE_THRESHOLD = 100`）时触发；生成的 `<step1_analysis>` 在第 2 轮起由 `stripAnalysisFromFirstUserMessage` 剥离。 | 调用 `runPlanTask`（`plan_task_system.md`），在不执行工具的前提下列出高/中/低风险疑似点及待调用工具计划，注入主审查第 1 轮。 |
| **5. 主审查循环**（`internal/agent/agent.go`、`internal/reviewtask/tools.go`） | 默认最多并发运行 `maxConcurrency = 8` 个文件组；每组默认最多 2 轮（`effort=low/medium/high` 对应 1/2/3 轮），单组工具调用上限 `MAX_TOOL_CALLS = 100`。`code_comment` 工具只收 `existing_code` 原代码片段，不收行号。 | 模型在 6 个受限工具中选择：`file_read`（每次限 500 行）、`code_search`（限 100 条）、`file_read_diff`、`file_find`（限 100 条）、`code_comment`、`task_done`。 |
| **6. 行号定位与反思过滤**（`internal/diff/resolver.go`、`relocation.go`、`review_filter_task_system.md`） | `ResolveComment` 剥除首尾空白与 `+`/`-` 后，依次尝试本文件 Hunk 新侧精确滑窗、新侧忽略空行滑窗、旧侧滑窗、新文件全文匹配，以及 `RelocateAcrossFiles` 同次改动跨文件唯一匹配自动转移来计算行号。<br>反思过滤硬性豁免五大主题（内存安全、并发、声明/ABI 一致性、行为/兼容性变更、未使用参数），工具参数将 `analysis` 排在 `comment_ids` 前。 | 仅当前述确定性匹配全部返回 `0:0` 时，调用 `ReLocateComment`（`re_location_task_system.md`）让 LLM 重提代码片段再跑一次 `ResolveComment`；仍失败则置为 `0:0` 文件级评论。<br>反思过滤由 LLM 仅在 Diff 字面原文直接反驳评论或代码不在该文件 Diff 中时剔除评论。 |

## 本机真实提交上的原型实测边界

在本仓 3 个真实提交上按 `selection.go` 与 `resolver.go` 逻辑实测：

| 提交 | 原始文件数 | 筛选后保留文件数 | 原始 Diff 字符 | 筛选后字符（保留比例） | 实测剔除明细与覆盖边界 |
|---|---:|---:|---:|---:|---|
| `ebd28b2` | 24 | 17 | 96,445 | 77,972 (80.8%) | 剔除 6 个 `.md`/`.txt` 与 1 个 `test_check_skill.py`；但 3 个 `*.test.mjs` 因 `**/*.test.{js,jsx,ts,tsx,mts,cts}` 未包含 `.mjs` 而保留进入审查 |
| `c5d94ed` | 19 | 5 | 143,876 | 34,116 (23.7%) | 剔除 10 个纯删除文件、3 个 `.md`/`.txt`/`.lock` 与 1 个 `test/extension.test.js`；但 `test/smoke.js` 因未命中 `*.test.js` 而保留进入审查 |
| `4057ba8` | 21 | 12 | 60,278 | 33,046 (54.8%) | 剔除 9 个 `*.test.ts` 与 `fixtures/*.ts` |

在 `ebd28b2` Diff 上对 `ResolveComment` + `RelocateAcrossFiles` 的 5 类偏差实测：① 带 `+` 前缀与缩进偏移精确定位到 `font-registration.mjs:21-22`；② 漏掉中间空行精确定位到 `check-skill.py:6-10`；③ 挂在 `cli.mjs` 下的 `classifyFonts` 代码片段自动重定位至 `font-check.mjs:13-14`；④ 引用已删除旧行定位到 `font-check.mjs` 旧侧第 `15` 行；⑤ 捏造的不存在代码 `export function parseCliOptions(args) {` 返回 `0:0` 拦截假行号。

## Native 模式、Delegate 模式与本机纯 Skill 对比

| 维度 | Native 模式（`/skill:open-code-review`） | Delegate 模式（`/skill:open-code-review-delegate`） | 本机纯 Skill（`code-review` / `ponytail-review`） |
|---|---|---|---|
| **底层命令** | `ocr review --audience agent -b "context"`（支持 `--format json`、`--output <path>`） | `ocr delegate preview` + `ocr delegate rule --format=json` | 直接由宿主 Agent 运行 `git diff` 与宿主工具 |
| **模型与凭据** | 需在 `~/.opencodereview/config.json` 单独配置 provider | 零额外配置，直接复用宿主 Agent 当前模型 | 零额外配置，直接复用宿主 Agent 当前模型 |
| **确定性文件筛选** | 完整 7 步筛选 + 单文件 `160000` Tokens 熔断 | 复用筛选，但 `delegate_cmd.go` 将 `MaxTokens` 设为 `0`（关闭单文件体积熔断） | 无硬性预过滤，默认读取全部改动文件（含 `.md` 与测试文件） |
| **分组、规划、滑窗行号定位、反思过滤、Viewer 会话记录** | 完整运行全部六个阶段，写入 `~/.opencodereview/sessions/` | **全部不运行**（由宿主 Agent 自行填 `file:line`，不写 `sessions/`） | 无内置滑窗重定位或独立过滤，但可用宿主 LSP、CodeGraph 与测试执行验证 |

## 本机安装、8787 网关配置与跨实例 401 修复

### 1. 本机安装与更新

- **CLI 安装**：`bun add -g @alibaba-group/open-code-review` 安装至 `/home/cpf/.bun/bin/ocr`（`v1.14.3 (f6379f71) linux/amd64`）。其 Node 启动器 `bin/ocr.js` 默认每 18 分钟（记录于 `~/.opencodereview/last-update-check`，可通过 `OCR_UPDATE_INTERVAL` 调整或 `OCR_NO_UPDATE=1` 关闭）在后台触发 `scripts/update.js` 检查 `https://registry.npmjs.org/@alibaba-group%2Fopen-code-review/latest` 并调用 `npm i -g`；使用 Bun 全局安装时可通过重跑 `bun add -g @alibaba-group/open-code-review@latest` 升级。
- **Skills 安装**：`skills add -g -y alibaba/open-code-review` 将两个技能安装至 `~/.agents/skills/open-code-review` 与 `~/.agents/skills/open-code-review-delegate`，OMP 通过 `skills.enableAgentsUser: true` 自动发现。

### 2. 经 8787/4140 网关跑 `openai-responses` 的 401 根因与修复

当 `custom_providers.cop` 配置为 `url: "http://localhost:8787"`、`protocol: "openai-responses"`、`model: "gpt-6.1-sol"` 时，未配额外请求头运行 `ocr llm test` 会在工具回传轮报错：

> `POST "http://localhost:8787/responses": 401 Unauthorized {"message":"input item ID does not belong to this connection","code":""}`

**根因链**：
1. Headroom（`8787`）在 `OPENAI_RESPONSES_ROOT_PATHS` 中同时注册了 `/responses` 与 `/v1/responses`，将请求转发至 `http://localhost:4140/v1/responses`（`body_mutated=false`）。
2. 虽然 `ocr review` 主循环（`internal/llmloop/loop.go:336`）会设置 `ChatRequest.SessionID` 从而写入 body 的 `prompt_cache_key`，但 **`ocr llm test`（`cmd/opencodereview/llm_cmd.go:107-116`）构造 `ChatRequest` 时未设置 `SessionID`**。
3. `4140` sticky-router（`router/state.ts:940-961`）既找不到 session header 也找不到 `prompt_cache_key`，记录 `sid=-` 并对两轮请求分别执行 `pickLeastLoaded`（`reason=new`），导致第 1 轮（HTTP 200）与第 2 轮工具结果回传落到不同 Copilot 实例（实测日志 `<INSTANCE_A>:4144 -> <INSTANCE_B>:4145`、`<INSTANCE_C>:4146 -> <INSTANCE_B>:4145`）。
4. `responses_client.go:530-571` 在第 2 轮通过 SDK `ToParam()` 重放第 1 轮原生输出项（保留实例绑定的 item `id` 与 `reasoning.encrypted_content`），被另一实例拒绝返回 401。

**修复配置**：
利用 `internal/llm/sessionkey.go:20` 的 `{ocr_session_key}` 占位符（`NewOpenAIResponsesClient` 初始化时调用 `NewSessionKey()` 生成每客户端 UUIDv4，并在每次请求时展开到 `extra_headers`）：

```bash
ocr config set custom_providers.cop.extra_headers 'x-session-id={ocr_session_key}'
```

设置后，`4140` 路由器识别 `x-session-id`，两轮请求携带相同 `sid` 固定在同一实例（实测 `<INSTANCE_C>:4146 reason=new` → `<INSTANCE_C>:4146 reason=sticky`），`ocr llm test` 通过并输出 `✓ Tool-call round trip verified`。

### 3. AGC 仓库追踪

`~/.opencodereview/config.json` 已通过 `manifest.json` 的 `open-code-review-config` 条目（`protected: true`）映射至仓库 `open-code-review/config.json`（提交 `06c57ee`），同步时自动将 `api_key` 脱敏为 `<REDACTED>` 并保留 `"x-session-id": "{ocr_session_key}"`。

## See Also

- [OMP 动态 Session Identity 与 Sticky Routing](../omp-config/dynamic-session-identity-sticky-routing.md)
- [本机 sticky-router：模型目录与重启状态](../copilot-gateway/sticky-router-model-discovery-and-restart.md)
- [Reverify：确定性验证的适用边界与 rollover 实际价值](reverify.md)
