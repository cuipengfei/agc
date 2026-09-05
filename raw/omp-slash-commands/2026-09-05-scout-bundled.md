# OMP 内置扩展 slash 命令（Bundled / SDK 注入）

> 调查范围：GreenCommand、ReviewCommand（bundled）与 /autoresearch（SDK 无条件注入）。
> 版本：@oh-my-pi/pi-coding-agent v18.1.10

---

## /green（无别名）

- **描述**: `Generate a prompt to iterate on CI failures until the branch is green`
- **子命令**: 无。不接受任何参数（`_args` 被忽略）。
- **机制**:
  1. 命令实例化于 `extensibility/custom-commands/loader.ts:158-163`，通过 `loadBundledCommands` 压入 bundled 数组（最低优先级，可被用户/项目命令覆盖）。
  2. 执行时调用 `getHeadTagContext` 读取当前 git 分支、HEAD 处的 tag、push remote（`bundled/ci-green/index.ts:17-35`）。
  3. 将收集到的 `{ headTag, branch, remote }` 代入 `prompts/ci-green-request.md` 模板渲染（`bundled/ci-green/index.ts:45`）。
  4. 返回渲染后的 prompt 文本，由 OMP 作为 user message 送入对话。
- **场景**: 推送代码后 CI 变红，需要 agent 自动循环修复直到分支变绿。特别适用于有 tag 绑定到 HEAD 的发布流程（tag 会随 atomic push 一起移动）。
- **收益**: 用户无需手动编写长 prompt 指导 agent 如何迭代修 CI；命令自动生成包含完整流程（watch workflow → 定位失败 → 最小修复 → push → 重 watch）的指令，且正确处理 atomic branch+tag push 语义。
- **证据**: 源码实证（`bundled/ci-green/index.ts` 完整可读，`ci-green-request.md` 模板结构清晰）。

---

## /review（无别名）

- **描述**: `Launch interactive code review`
- **子命令/参数**:
  - 直接传入 GitHub PR URL（`https://github.com/owner/repo/pull/N`）或 `pr://owner/repo/N` — 直接对该 PR 做 diff review，无需交互菜单（`bundled/review/index.ts:423-428`）。
  - 其余文本作为 `extraInstructions` 附加到 review prompt 中。
  - 无参数且 TUI 可用时，弹出选择菜单（`bundled/review/index.ts:432-503`）。
- **机制**:
  1. 命令实例化于 `extensibility/custom-commands/loader.ts:164-169`。
  2. **PR 直接模式**：若参数中解析出 PR 引用，调用 `gh.getOrFetchPrDiff` 拉取 PR unified diff，经 `buildReviewPromptFromDiff` 构建 review prompt（`bundled/review/index.ts:354-374`）。
  3. **Headless 模式**（无 UI）：返回 `review-headless-request.md` 渲染结果，要求创建 1 个 reviewer task（`bundled/review/index.ts:430`）。
  4. **交互菜单模式**（TUI）：提供 4 类选项：
     - **Detected PR**：扫描最近对话历史中的 PR URL（`findRecentPrRefs`，回溯 `REVIEW_CONTEXT_PR_LIMIT=3` 条，取最近的用户/assistant 文本内容）—— `bundled/review/index.ts:400-420`。
     - **Base branch**：选择 base 分支后，用 `git mergeBase` 找共同祖先，再 `diffText({ base: mergeBase, head: currentBranch })` 获取 PR-style diff（`bundled/review/index.ts:535-555`）。
     - **Uncommitted**：获取工作区未提交 diff（git: staged+unstaged；jj: `jj diff --git`），`bundled/review/index.ts:608-616`。
     - **Commit**：列出最近 20 条 commit，选择后 `git showCommit` 获取 diff（`bundled/review/index.ts:573-593`）。
     - **Custom**：用户输入自定义审查指令，如有未提交 diff 则一起渲染，否则纯自定义 prompt（`bundled/review/index.ts:595-606`）。
  5. **Diff 处理管道**：
     - `parseDiff` 将 unified diff 切分为 per-file stats，统计 +/- 行数（`bundled/review/index.ts:155-196`）。
     - `getExclusionReason` 按硬编码正则排除 lock 文件、构建产物、minified、snapshot、binary、vendor 等噪音（`bundled/review/index.ts:86-110`）。
     - `getRecommendedAgentCount` 按总变更行数与文件数推荐 reviewer agent 数量（1–16 个），分为 tiny/small/medium/large/huge 五档（`bundled/review/index.ts:199-214`）。
     - `buildReviewPrompt` 渲染 `review-request.md`，内含：文件列表与扩展名表格、被排除文件清单、agent 数量与按本地性分组建议、diff 全文（若不超过 `MAX_DIFF_CHARS=50_000` 且文件数 ≤ `MAX_FILES_FOR_INLINE_DIFF=20`）或逐文件预览（否则要求 reviewer 自行运行 diff 命令）。
- **场景**: 需要审查 PR、未提交更改、某个 commit 或提供自定义审查重点时。适合在 TUI 中快速触发，也支持无头模式用于脚本化/自动化审查。
- **收益**: 自动聚合多种审查源（PR/branch/commit/uncommitted），智能过滤噪音文件，按 diff 体量自动决定 reviewer 数量与分工，diff 过大时自动降级为“自行运行 diff”指令而不是硬塞超上下文。
- **证据**: 源码实证（`bundled/review/index.ts` 完整可读，`review-request.md` / `review-headless-request.md` / `review-custom-request.md` 模板存在）。

---

## /autoresearch（无别名）

- **描述**: `Toggle builtin autoresearch mode, or pass off / clear, or a goal message.`
- **注册位置**: `autoresearch/index.ts:126`（`api.registerCommand`）；由 `sdk.ts:2133` 在 `!restrictToolNames` 分支内通过 `inlineExtensions.push(createAutoresearchExtension)` 无条件注入。注意：`restrictToolNames` 为 true 时（如子 agent 指定了严格工具白名单）该扩展不会被加载。
- **参数补全**（`getArgumentCompletions`）:
  - `off` — 关闭 autoresearch 模式
  - `clear` — 重置 worktree 到 baseline 并关闭活跃 session
  - 其余输入不补全（返回 `null`）
- **子命令/参数**:
  - **空参数 + 当前已启用** → 关闭模式（`autoresearch/index.ts:139-145`）。
  - **`off`** → 关闭模式（`autoresearch/index.ts:147-153`）。
  - **`clear` / `clear --keep-tree` / `clear --reset-tree`** → 调用 `handleClear`：
    - 默认行为：若当前在 `autoresearch/*` 分支且 session 记录了 `baselineCommit`，则 `git reset --hard` 到 baseline 并 `git clean`；随后关闭 session、清理 legacy artifacts、卸载实验工具（`autoresearch/index.ts:390-448`）。
    - `--keep-tree`：跳过 worktree 重置。
    - `--reset-tree`：即使不在 `autoresearch/*` 分支也强制重置。
  - **任意其他文本** → 作为 `goalArg` 启用或恢复 autoresearch：
    - 调用 `ensureAutoresearchBranch` 创建/切换到 `autoresearch/{slug}` 分支（`autoresearch/index.ts:155-162`）。
    - 若该分支已存在活跃 session，则恢复 session 状态并发送 resume prompt（`command-resume.md` 模板）；否则新建 session（`autoresearch/index.ts:164-192`）。
    - 启用后自动注册 4 个实验工具：`init_experiment`, `run_experiment`, `log_experiment`, `update_notes`（`autoresearch/index.ts:120-124`）。
- **机制**:
  1. **状态管理**：每个 session 维护一个 `AutoresearchRuntime`，存储在 `runtimeStore`（按 session ID 隔离）中。状态包括 `autoresearchMode`、`goal`、`state`（实验结果数组）、`lastRunSummary` 等（`autoresearch/index.ts:28-70`）。
  2. **持久化**：使用 SQLite 存储（`storage.ts`），按分支管理 session 与 run 记录。`rehydrate` 在 `session_start/session_switch/session_branch/session_tree` 时自动从 DB 恢复状态（`autoresearch/index.ts:28-93`）。
  3. **系统提示注入**：`before_agent_start` 事件处理器检查若在活跃分支且 mode 开启，则向 agent 注入 `prompt.md`（已有 session）或 `setupPromptTemplate`（无 session）渲染的系统提示，内含：当前 goal、baseline commit、最近 3 条实验结果、pending run、最优结果对比、unjustified runs 等（`autoresearch/index.ts:302-389`）。
  4. **自动 Resume**：`agent_end` 时若存在 pending run（已执行但未记录结果的 run）或 `autoResumeArmed` 标志，则发送 `autoresearch-resume` 类型消息触发下一轮（`autoresearch/index.ts:245-281`）。
  5. **Dashboard**：通过 `dashboard.ts` 在 OMP 状态栏/overlay 展示当前实验进度（`ctrl+x` 切换 dashboard，`ctrl+shift+x` 显示 overlay）。
- **场景**: 需要进行反复实验迭代的优化任务（如性能调优、超参搜索、基准测试改进）。适合让 agent 在一个隔离的 git 分支上自主运行实验、记录结果、自动恢复失败/未完成的运行。
- **收益**: 
  - 自动创建隔离的 `autoresearch/*` 分支，避免污染主分支。
  - 内置实验生命周期（init → run → log → update_notes），agent 有结构化工具可用。
  - 自动记录 baseline 与每次运行结果，支持“保留/回滚/标记”语义。
  - 大 diff 或长时间运行后，session 重新连接可无缝恢复历史实验上下文。
  - dashboard 提供可视化进度，无需人工跟踪每次运行的命令与指标。
- **证据**: 源码实证（`autoresearch/index.ts` 完整可读，`sdk.ts:2133` 注入点确认）。
