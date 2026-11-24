# Alibaba Open Code Review (v1.14.3) 源码摘录与本机接入实测

> Source: https://github.com/alibaba/open-code-review (tag v1.14.3, commit f6379f71); 本机安装与原型实验实测
> Collected: 2026-11-25
> Published: 2026-11-25

## 1. 仓库形态与命令入口

仓库：`https://github.com/alibaba/open-code-review`
本机安装版本：`open-code-review v1.14.3 (f6379f71) linux/amd64`
npm 包名：`@alibaba-group/open-code-review`（`https://www.npmjs.com/package/@alibaba-group/open-code-review`）
安装脚本：`https://open-codereview.ai/install.sh`、`https://open-codereview.ai/install.ps1`
Linux x86_64 Release 二进制：`https://github.com/alibaba/open-code-review/releases/latest/download/opencodereview-linux-amd64`（校验文件 `sha256sum.txt`）

`cmd/opencodereview/root.go` 注册的顶层子命令：
- `ocr review`：审查本地 Git 改动（默认 workspace、`-c` 单提交、`-b` 分支对比、`--preview` 仅预览文件选择、`--resume` 断点续跑、`--no-filter` 跳过反思过滤）。
- `ocr scan`：全量目录/文件扫描。
- `ocr delegate`：供外部宿主 Agent 调用的确定性辅助子命令（`ocr delegate preview` 与 `ocr delegate rule`）。
- `ocr viewer`（`internal/viewer/server.go`）：在本地启动只读 HTTP 服务并打开浏览器，回放 `~/.opencodereview/sessions/` 下的 JSONL 会话，支持将评论标记为 resolved 或 ignored。
- `ocr config`（`cmd/opencodereview/config_cmd.go`、`provider_tui.go`）：交互式 TUI（`ocr config provider` / `ocr config model`）与非交互式 `get/set/unset/list`。
- `ocr llm`（`cmd/opencodereview/llm_cmd.go`）：`ocr llm test` 与 `ocr llm providers`。
- 其他运行面：`acp/`（`ocr-acp` JSON-RPC 2.0 over stdio 适配器）、`extensions/`（VS Code 与 IntelliJ IDEA 插件）。

## 2. 六阶段审查管线源码摘录

### 阶段 1：确定性文件筛选与单文件 Token 熔断

`internal/agent/selection.go`（`ClassifyFiles` 按顺序判定排除原因）：
1. `ExcludeBinary`：`d.Binary` 为 true。
2. `ExcludeSecret`：`allowlist.IsSecretPath(d.NewPath)`（读取 `internal/config/allowlist/default_secret_patterns.json`：`"**/.ssh/**"`, `"**/id_rsa"`, `"**/id_dsa"`, `"**/id_ecdsa"`, `"**/id_ed25519"`, `"**/.netrc"`, `"**/_netrc"`, `"**/.npmrc"`, `"**/.pypirc"`, `"**/.dockercfg"`；该拦截不可被用户规则覆盖）。
3. `ExcludeIgnored`：内置忽略目录（`node_modules/`、`vendor/`、`target/` 等）或 `.gitignore` 命中。
4. `ExcludeExtension`：`internal/config/allowlist/allowed_ext.go` 与 `supported_file_types.json`（共 143 种代码/配置后缀；不含 `.md` 和 `.txt`）。
5. `ExcludeDefaultPath`：`internal/config/allowlist/default_exclude_patterns.json`（含 `"**/*_test.go"`, `"**/*.test.{js,jsx,ts,tsx,mts,cts}"`, `"**/*.spec.{js,jsx,ts,tsx,mts,cts}"`, `"**/__tests__/**"`, `"**/test/**/*_test.py"`, `"**/tests/**/*_test.py"`, `"**/*_test.py"`, `"**/test_*.py"`, `"**/testdata/**"`, `"**/fixtures/**"`, `"**/*.generated.*"`, `"**/package-lock.json"`, `"**/pnpm-lock.yaml"`, `"**/*.min.{js,css}"`, `"**/dist/**"` 等）。
6. `ExcludeDeleted`：纯删除文件（`Deleted == true`），不发起审查任务，仅保留路径供上下文参考。
7. `ExcludeOversize`：单文件 Diff Token 数 `> PromptTokenLimit(maxTokens)`。在 `internal/agent/agent.go` 中默认 `MAX_TOKENS = 200000`，`PromptTokenLimit` 取 80% 即 `160000` Tokens（约 160,000 Tokens）。

### 阶段 2：文件分组（确定性阈值 + LLM 语义分组）

`internal/agent/grouping.go`：
- 常量：`minFilesForGrouping = 4`，`smallDiffTotalLineLimit = 200`，`maxGroupFiles = 10`。
- 当待审文件数 `< 4`（`len(diffs) < minFilesForGrouping`）：
  - 若所有待审文件的增删总行数 `< 200`（`totalDiffLines(diffs) < smallDiffTotalLineLimit`），直接合并为 1 个组，不调用 LLM。
  - 若总行数 `>= 200`，拆分为每个文件独立 1 组，不调用 LLM。
- 当待审文件数 `>= 4`：调用 `callGroupingLLM`（使用 `internal/config/template/prompts/grouping_task_system.md`），仅发送 `[index] path (+added/-deleted)` 列表（不含 Diff 正文），由 LLM 返回二维整数索引数组。随后确定性代码执行 `splitOversizedGroups`（超过 `maxGroupFiles = 10` 切分）、Token 预算校验（单组总 Diff Token 超过 `PromptTokenLimit(a.maxTokens)` 时退回单文件组）及遗漏文件单文件兜底。

### 阶段 3：确定性规则匹配与内置语言规则

`internal/config/rules/system_rules.go` 与 `system_rules.json`：
- 四层优先级：CLI `--rule` > 项目 `.opencodereview/rule.json` > 全局配置 `~/.opencodereview/config.json` > 内置 `system_rules.json`（70+ 种语言与框架规则文档）。
- 对 `.m` 后缀通过读取文件内容（检查 `@interface`、`@implementation`、`#import` 等）确定性区分 MATLAB 与 Objective-C。
- 同组多文件的规则按路径排序并按内容去重，固定拼装顺序以保证多轮请求命中 Prompt Cache。
- `internal/config/rules/rule_docs/go.md` 摘录：明确写明 `"Prefer under-reporting over false positives — false positives erode reviewer trust."` 以及 `"Review production code only by default; test files (*_test.go) are out of scope unless explicitly configured."`，并禁止报告 `gofmt`、`goimports`、`go vet`、`staticcheck` 已覆盖的格式或基础静态检查问题。

### 阶段 4：审前风险规划（Plan 阶段）

`internal/agent/agent.go`：
- 触发阈值常量：`PLAN_MODE_LINE_THRESHOLD = 50`（单文件最大改动行数），`PLAN_MODE_GROUP_LINE_THRESHOLD = 100`（多文件组总改动行数）。
- `shouldRunPlan`：仅当组内最大单文件增删行数 `>= 50`，或组内文件数 `>= 2` 且总增删行数 `>= 100` 时调用 `runPlanTask`（使用 `plan_task_system.md` / `plan_task_user.md`）。生成的 `<step1_analysis>` 仅注入主审查第 1 轮，第 2 轮起由 `stripAnalysisFromFirstUserMessage` 剥离。

### 阶段 5：主审查循环与受限工具集

`internal/agent/agent.go`、`internal/reviewtask/tools.go`、`internal/config/toolsconfig/tools.json`：
- 默认最多并发运行 8 个文件组（`maxConcurrency = 8`）；每组默认最多 2 轮（`effort=medium` 对应 2 轮，`low` 1 轮，`high` 3 轮），工具调用上限 `MAX_TOOL_CALLS = 100`。
- 内置 6 个只读/受限工具：
  1. `file_read`：每次最多读取新文件 500 行。
  2. `code_search`：正则搜索，最多返回 100 条匹配。
  3. `file_read_diff`：按需查看同次改动中其他文件的 Diff。
  4. `file_find`：按 glob 查找文件名，最多返回 100 条路径。
  5. `code_comment`：提交审查问题；参数为 `file_path`、`existing_code`（原代码片段，不填行号）、`comment`、`severity`、`category`。
  6. `task_done`：结束当前组审查。

### 阶段 6：行号定位与反思过滤（Review Filter）

`internal/diff/resolver.go` 与 `internal/diff/relocation.go`：
- `ResolveComment` 确定性滑动窗口匹配顺序：
  1. 将 `existing_code` 按行切分并调用 `normalizeLine`（去首尾空白、剥除首字符 `+` 或 `-` 再去空白）。
  2. 在目标文件 Diff Hunk 的新侧（新增行 + 上下文行）做连续行精确匹配（`matchConsecutive`）。
  3. 在目标文件 Diff Hunk 的新侧忽略空行后做连续行匹配。
  4. 在目标文件 Diff Hunk 的旧侧（删除行 + 上下文行）做连续行匹配。
  5. 在工作树新文件全文做连续行匹配（含忽略空行回退）。
- `RelocateAcrossFiles`：若当前文件未命中，遍历同次改动的全部其他文件 Diff 执行 `resolveFromHunk`；若在且仅在唯一一个其他文件中命中，自动将该评论的 `FilePath` 和行号迁移至该文件。
- `ReLocateComment`（`internal/diff/relocation.go`）：仅当前述确定性匹配全部返回未命中（`0:0`）时，调用一次 LLM（`re_location_task_system.md`）从原 Diff 中重新提取精确代码片段，再次调用 `ResolveComment`；若仍失败则保留 `0:0` 作为文件级评论。

`internal/config/template/prompts/review_filter_task_system.md`（反思过滤）：
- 五大受保护主题（Protected Topics）一律豁免、禁止过滤：
  1. Memory safety & resource lifecycle（内存安全与资源生命周期）
  2. Concurrency & synchronization（并发与同步）
  3. Declaration / linkage / ODR / ABI consistency（声明、链接与 ABI 一致性）
  4. Behavioral / compatibility / contract changes（行为与兼容性变更）
  5. Unused / ignored function parameters（未使用或忽略的函数参数）
- 其余评论仅当 Diff 原文字面直接反驳该评论的核心断言，或被评代码根本不在该文件 Diff 中时才允许剔除。工具参数顺序将 `analysis` 排在 `comment_ids` 之前。

## 3. Native 技能与 Delegate 技能源码对比

- `skills/open-code-review/SKILL.md`（Native 模式）：
  - 调用 `ocr review --audience agent -b "context"`（需要 JSON 时用 `--format json`，防截断写文件用 `--output <path>`；支持 `--preview` 预览文件数）。
  - 远程 PR 辅助脚本 `skills/open-code-review/scripts/review_pr.py`：在本地缓存目录 `~/.cache/opencodereview/pr-review/` 下创建独立 bare repo 与只读 `git worktree`；拉取时传 `-c core.hooksPath=/dev/null` 与 `--no-recurse-submodules`；检出后直接 `shutil.rmtree` 删除被审 PR 自带的 `.opencodereview` 目录；若检测到 PR 修改了 `.gitignore`、`.gitmodules`、`.gitattributes` 或本地 `~/.opencodereview/config.json` 配置了外部 MCP 服务器，立即以退出码 `3` 终止拒绝自动运行。
- `skills/open-code-review-delegate/SKILL.md` 与 `cmd/opencodereview/delegate_cmd.go`（Delegate 模式）：
  - `ocr delegate preview`：复用 `selection.go` 文件筛选，但在 `delegate_cmd.go` 中将 `MaxTokens` 设为 `0`（关闭单文件 160,000 Token 体积熔断）。
  - `ocr delegate rule --format=json`：按路径解析规则并将命中相同规则的文件归组输出 JSON。
  - Delegate 模式不运行 `grouping.go`、`runPlanTask`、`main_task_system.md` 主循环、`ResolveComment`/`RelocateAcrossFiles`/`ReLocateComment`、`review_filter_task_system.md` 以及 `~/.opencodereview/sessions/` 持久化。

## 4. 本机真实提交上的原型实测结果（2026-11-25）

在本仓 3 个真实提交上运行复刻 `selection.go` 与 `resolver.go` 的测试结果：

1. 文件筛选体积变化：
   - `ebd28b2`：原始改动 24 个文件（96,445 字符） -> 保留 17 个文件（77,972 字符，保留比例 80.8%）；剔除 6 个 `ExcludeExtension`（`.md`、`.txt`）与 1 个 `ExcludeDefaultPath`（`tools/tern-maintain/python_tests/test_check_skill.py`）。同提交的 `experiment-runner.test.mjs`、`font-check.test.mjs`、`function-analysis.test.mjs` 因 `default_exclude_patterns.json` 的 `**/*.test.{js,jsx,ts,tsx,mts,cts}` 未包含 `.mjs` 而保留进入审查。
   - `c5d94ed`：原始改动 19 个文件（143,876 字符） -> 保留 5 个文件（34,116 字符，保留比例 23.7%）；剔除 10 个 `ExcludeDeleted`、3 个 `ExcludeExtension`（`.md`、`.txt`、`.lock`）与 1 个 `ExcludeDefaultPath`（`test/extension.test.js`）。同提交的 `test/smoke.js` 因未命中 `*.test.js` 而保留进入审查。
   - `4057ba8`：原始改动 21 个文件（60,278 字符） -> 保留 12 个文件（33,046 字符，保留比例 54.8%）；剔除 9 个 `ExcludeDefaultPath`（`*.test.ts` 与 `fixtures/*.ts`）。
2. 行号定位与跨文件纠偏（基于 `ebd28b2`）：
   - Case 1（带 `+` 前缀与缩进偏移）：在 `tools/tern-maintain/font-registration.mjs` 中精确定位到 `21-22`（`mode=hunk_new_exact`）。
   - Case 2（模型漏掉源文件中间空行）：在 `tools/tern-maintain/ci/check-skill.py` 中精确定位到 `6-10`（`mode=hunk_new_noblank`）。
   - Case 3（跨文件张冠李戴，评论挂在 `cli.mjs` 但代码属于 `font-check.mjs`）：自动重定位至 `tools/tern-maintain/font-check.mjs:13-14`（`mode=hunk_new_exact`）。
   - Case 4（引用已删除的旧行）：在 `tools/tern-maintain/font-check.mjs` 中定位到旧侧行号 `15`（`mode=hunk_old`）。
   - Case 5（模型改写/捏造的不存在代码 `export function parseCliOptions(args) {`）：返回 `0:0`（`UNLOCATED`），拦截伪造行号。

## 5. 本机安装、自动更新机制与 AGC 仓库同步（2026-11-25）

- 本机 CLI 安装：
  `bun add -g @alibaba-group/open-code-review` -> 安装 `@alibaba-group/open-code-review@1.14.3` 与 `@alibaba-group/ocr-linux-x64`，二进制位于 `/home/cpf/.bun/bin/ocr`（底层原生二进制 `/home/cpf/.bun/install/global/node_modules/@alibaba-group/ocr-linux-x64/bin/opencodereview`）。
- 启动器自动更新机制（`bin/ocr.js` 与 `scripts/update.js`）：
  每次运行 `ocr` 时检查 `~/.opencodereview/last-update-check` 的 mtime；若距上次检查超过 18 分钟（可通过 `OCR_UPDATE_INTERVAL` 修改，或设 `OCR_NO_UPDATE=1` 关闭），在后台 detached 启动 `scripts/update.js` 请求 `https://registry.npmjs.org/@alibaba-group%2Fopen-code-review/latest` 并调用 `npm i -g @alibaba-group/open-code-review@<version>`。
- 本机 Skills 安装：
  `skills add -g -y alibaba/open-code-review` -> 安装至 `~/.agents/skills/open-code-review`（含 `SKILL.md` 与 `scripts/review_pr.py`）和 `~/.agents/skills/open-code-review-delegate`（含 `SKILL.md`）。OMP 因 `omp/agent/config.yml` 开启 `skills.enableAgentsUser: true` 与 `skills.enableSkillCommands: true` 自动发现并暴露 `/skill:open-code-review` 与 `/skill:open-code-review-delegate`。
- AGC 仓库同步配置（提交 `06c57ee`）：
  `manifest.json` 新增单文件受保护条目 `open-code-review-config`（`source: "~/.opencodereview/config.json"`, `repo: "open-code-review/config.json"`, `protected: true`）。`python3 -m unittest discover -s tests -v` 运行 50 个测试全部通过（`Ran 50 tests in 0.083s, OK`）。
