# OMP 机制核查材料——用于课程概念映射

> Source: OMP 内建文档 `omp://*`、`skill://omp` 及其 references、已安装包 `@oh-my-pi/pi-coding-agent` 源码（`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/`）、`xd://eval/*` 文档
> Collected: 2026-11-07
> Published: Unknown（随本机安装版本与内建文档快照）

本文件保存映射文章所需的 OMP 一手事实。每条注明文档路径或源码位置；不收录凭据、用户配置中的敏感值或未核实的功能断言。

## 1. 指令与上下文的三条载入通道

### 1.1 普通 context files：`AGENTS.md` / `CLAUDE.md`

- 来源：`omp://context-files.md`。
- 用户级与项目级指令文件由 discovery provider 发现，合并后注入系统提示的 `<repo-rules>`。
- 支持 `@path` 引用展开（最多 5 跳），可把项目原则、ADR 等文件挂入指令树。
- 加载时有按内容归一化的去重/包含折叠，避免同一段内容在系统提示与多个文件中重复出现；`disabledProviders` 与 `disabledExtensions` 可过滤发现来源。

### 1.2 `.omp/RULES.md`：Rulebook 管线中的强制 sticky rule

- 来源：`omp://rulebook-matching-pipeline.md`。
- 用户级 `~/.omp/agent/RULES.md` 与项目级 `<cwd>/.omp/RULES.md` 不走普通 context-files，而走 rule 管线，分别命名为 `RULES` 与 `RULES@project`，强制 `alwaysApply: true`，注入 `<generic-rules>`。
- Rule 分三桶，优先级为 **TTSR > Always-Apply > Rulebook**。非强制规则只在 `<domain-rules>` 暴露摘要，按需 `read rule://<name>` 读取正文。
- 来源优先级：native(100) > omp-plugins(90) > agents(70) > cursor(50) = windsurf(50) > cline(40) > github(30) > builtin-defaults(1)；同名规则 `first-wins`，被遮蔽项标 `_shadowed`，可用 `/extensions` 查看。

### 1.3 Skills 的渐进披露

- 来源：`omp://skills.md`、`omp://system-prompt-customization.md`。
- 系统提示只列 `name + description`，命中后 `read skill://<name>` 才加载正文；附属 `references/`、`scripts/`、`assets/` 按需读取。
- `/skillful off` 可关闭该披露目录（`src/slash-commands/builtin-modes.ts` 中 `/skillful` 说明）。
- Skill 的 `allowed-tools` 写法与 OMP 子代理的 `tools:` 白名单是两个层面：OMP 在 subagent 定义（`.omp/agents/*.md` 或 task 配置）上限制工具面，见 `omp://task-agent-discovery.md`。

## 2. TTSR 与规则反馈

来源：`omp://ttsr-injection-lifecycle.md`、`omp://rulebook-matching-pipeline.md`、`src/export/ttsr.ts`。

- `condition`：正则匹配流式文本或工具参数，可在流中触发中断或注入。
- `astCondition`：ast-grep 结构模式；对 `edit`/`write` 在工具调用前基于将生成的完整源码快照判定，用于拦截新增反模式。
- `question`：自然语言是非题，在完成态调用 judge 模型；`JUDGED_RULE_THRESHOLD = 0.7`（`src/export/ttsr.ts:58`），`yes` 概率达到阈值才投递 warning，**永不流中匹配、永不中断流**。
- 注入去重键为 `(ruleName, scopeKey, matchKey)`；`repeatMode` 与 generation token、resume state 控制重放与重复注入。

## 3. Advisor / Watchdog：独立反馈与分级

来源：`omp://advisor-watchdog.md`、`skill://omp/references/advisor.md`。

- 由 `advisor.enabled`、模型角色和可选 `WATCHDOG.yml` roster 启用；对主 agent transcript 的增量执行独立模型审阅，把建议注入主会话。
- `advise` 的严重度为 **`blocker` / `concern` / `nit`**。
- 主会话与 Advisor 的 toolResult 渲染支持折叠：成功工具可只显示 `→ tool(args) ⇒ ok · N lines`（只有行数，不送正文），失败工具保留错误首行预览；参数/错误预览有长度截断。
- 默认沉默是规则编写基线；`maxNotesPerUpdate` 限制每轮条数，`Duplicate advice ignored.` 抑制重复，`[in progress — more steps follow]` 期间挂起非紧急建议。
- Advisor 建议只是评审输入，**不等于用户授权**（`skill://omp/references/advisor.md` 的 `advisor-is-not-authorization`）。

## 4. 计算型与推断型控制的执行面

- **计算型**：工具参数 JSON Schema 归一化与校验（`omp://ai-schema-normalize.md`）、extension 的 `tool_call` 结构化拦截（`omp://extensions.md`）、TTSR 的 `condition`/`astCondition`、`eval` 持久 Python/JS 内核（`omp://tools/eval.md`）、`lsp` 编译器级诊断（`omp://tools/lsp.md`）。
- **推断型**：主模型、Advisor、以及 `judge` 模型角色。`judge` 用于 `find` 文件相关性打分（`omp://tools/find.md`）、`auto-prewalk` 任务分类（`src/auto-prewalk/classifier.ts:31` 的 `AUTO_PREWALK_MIN_PROBABILITY = 0.7`）、TTSR `question` 判定。

## 5. 状态、压缩与会话交接

### 5.1 状态分层

- Session JSONL 树：append-only + leaf pointer，自动落盘与恢复（`omp://session.md`）。
- `todo`：分 phase 任务清单；`TodoTracker.checkCompletion()` 在仍有未完成项时阻止提前收尾（`omp://tools/todo.md`）。
- `context_notes`：16 KiB UTF-8、整体替换语义的持久笔记本，跨 rollover 保留（`omp://tools/context-notes.md`）。
- `memory.backend`：见第 6 节。
- `artifact://` / blob：大输出与二进制外置（`omp://blob-artifact-architecture.md`）。

### 5.2 实验性上下文 rollover

来源：`omp://compaction.md`、`omp://tools/context-notes.md`、`omp://tools/new-context.md`。

- `compaction.experimentalContextManagement: true` 后，自动/无显式 mode/focus 的 compact 走「笔记换窗」，不调用 summarization model。
- 上下文逼近阈值、落在 `speculationLeadTokens` 范围时注入 `<context-window-reminder>`，提醒先写 `context_notes`；`new_context` 在当前 turn 结束后换到新窗口。
- 保留笔记本、最近用户请求与边界后的 tool call/result；完整原始历史仍可按行号读 `history://current/full`。

### 5.3 `checkpoint` 与 `rewind` 的边界

来源：`omp://tools/checkpoint.md`、`omp://tools/rewind.md`。

- `checkpoint(goal)` 记录会话树节点；`rewind(report)` 在 `turn_end` 自动从 checkpoint 分支，把中间探索从活动分支剪除，并将 report 写成 `branch_summary`。
- **只回滚会话上下文，不回滚磁盘文件、Git、artifact 或 blob**。

### 5.4 `/handoff`

来源：`omp://handoff-generation-pipeline.md`。

- 复用当前会话的 live cache prefix 生成结构化交接文档，自动附带 `<files>` 读写清单，作为 `CompactionEntry` 原地提交。

## 6. 五种 memory backend

来源：`omp://memory.md`、`omp://mnemosyne-memory-backend.md`。

- `off`：关闭。
- `local`：两阶段管线；Phase 2 跨会话合并生成 `MEMORY.md`、`memory_summary.md`，并自动生成/按输出集对齐修剪 `skills/`。
- `mnemopi`：本地 SQLite；recall 按来源可信度加权（`stated` > `unknown` > `inferred` > `imported` > `tool`），有只读 `[facts]`；`memory_edit` 支持 `update`/`invalidate`/`forget`；约 12 小时记录经 sleep consolidation 提炼为 episodic/facts。子代理不拥有独立记忆保留与数据库关闭权，由顶层会话统管。
- `hindsight`：远程银行；`mental-models` 支持 `source_query` 与 `refresh_after_consolidation`，见 `src/hindsight/mental-models.ts`。
- `sharpshooter`：从用户每轮输入提取增量，自动维护项目 `architecture.md`、`product.md`、`style.md`。

## 7. 知识固化与自我改进

### 7.1 `learn` / `manage_skill` / `retain` / `memory_edit`

- `learn`：保存教训到长期记忆，并可在同一调用创建或更新 `~/.omp/agent/managed-skills/<name>/SKILL.md`（`omp://tools/learn.md`）。
- `manage_skill`：创建/更新/删除受管技能，立即刷新当前会话技能表（`omp://tools/manage_skill.md`）。
- `retain` / `recall` / `reflect`：持久事实的写入、检索与综合（`omp://tools/retain.md` 等）。
- `/omfg <complaint>`：从当前会话历史提取复现模式，生成 regex/AST/question TTSR 规则并拿近期历史验证，落盘 `.omp/rules/`（`src/modes/controllers/omfg-controller.ts`）。

### 7.2 `/ratchet`：held-out hillclimbing Eval 闭环

来源：`xd://eval/ratchet`、`src/ratchet/ratchet.ts`、`src/prompts/tools/ratchet.md`。

- 用例规模 15–100，含 should-fire 与 should-not-fire 正负例。
- 三道人类审批门：`inputs`、`grader`、`plan`，绑定内容 hash。
- 冻结 train/test split（默认 40% held-out），测试集不生成 transcript 以防偷看。
- 评分优先级：确定性程序检查 → pairwise 盲测 judge → pointwise 可核查 rubric；judge 模型与被测模型分离。
- 预检要求 Oracle 约 100%、Null 约 0%。
- 每轮只改一个变量，记录 `vN/change.md` 与 `change.patch`；宿主 gate 按 test-split paired delta 与 `hold: ["cost_usd"]` 成本护栏自动 `keep` 或 `git apply -R` 回退；停滞时用 `judge_batch` 对失败原因做五分类归因。

### 7.3 `/autoresearch`

来源：`src/autoresearch/index.ts`。

- 在专用 git 分支上运行 `init_experiment` → `run_experiment` → `log_experiment`，按 `METRIC` 与噪声倍数自动 commit 保留或回滚丢弃。

## 8. 介入、审批与提交前确认

- 全局 `tools.approvalMode`：`always-ask` / `always-ask-cached` / `write` / `yolo`（`omp://approval-mode.md`）。
- 工具级 `tools.approval`：`allow` / `prompt` / `deny`；`bash.patterns` 对命令做 allow/deny/prompt；`restrictedFolders` 对目录强制审批。
- `always-ask-cached` 缓存目录/文件授权，减少重复弹窗；`computer` 等安全敏感工具即使 yolo 也可强制确认。
- Plan 审批：`xd://propose` 提交 `local://<slug>-plan.md`，批准后进入执行（`omp://resolve-tool-runtime.md`、`omp://session-tree-plan.md`）。
- `ast_edit` 先 staged proposal，再由 `xd://resolve` 应用或 `xd://reject` 丢弃（`omp://tools/ast-edit.md`）。
- Plannotator `annotate`/`review` 支持 `gate: true` 的人工 Approve。
- `bashInterceptor` 只是把部分 shell 调用导向专用工具的偏好层，**不是安全边界**（`omp://bash-tool-runtime.md`）。

## 9. 执行验证分离的内置实现

- `/cleanse`：动态发现 checker，按文件派发 worker 修改，修改后**强制重跑独立 verification pass**；未消诊断如实报 `unresolved`/`stalled`（`src/cleanse/loop.ts`）。
- `/review`：冻结本地 diff 或 PR/MR 补丁，交独立评审流程（`src/extensibility/custom-commands/bundled/review/index.ts`）。
- `security_scan`：preflight 生成不可变计划并锁定 git tree digest、模型、凭据与 `knowledge_base_paths` SHA-256；finding 的 `validate` 用原生工具独立复核证据（`omp://tools/security_scan.md`）。
- `TodoTracker.checkCompletion()`：todo 未完成时拦截收尾。

## 10. 外层循环与编排

- `/loop`：`builtin-modes.ts` 支持次数/时长上限，以及 `--until '<cmd>'` / `--while '<cmd>'` 用外部命令退出码作为硬 verifier。
- `/goal`：`set/show/pause/resume/drop/budget`，维护 `verified-complete` / `budget-limited` 等状态。
- `/green`：盯 CI → 读失败日志 → 修代码 → 原子推分支与 tag → 重盯 CI 直到全绿（`src/prompts/ci-green-request.md`）。
- `task`：批量并发子代理（上限 32），独立上下文，可选 git worktree 隔离；`outputSchema` + `schemaMode` 强制结构化交接（`omp://tools/task.md`）。
- `write agent://<id>` / Vibe Mode：持久 worker 多轮消息与只读 director（`omp://vibe-mode.md`）；Agent Hub `Alt+A` 监控与唤醒（`omp://agent-hub.md`）。
- `workflowz`：在 `eval` 内核用 `agent()` / `workpool()` / `wait()` 编排确定性 DAG（`omp://magic-keywords.md`、`xd://eval/agents`）。

## 11. 内部 Harness 的三个扩展点对应

来源：`omp://extensions.md`、`omp://prewalk.md`。

- **pre-step**：`input`、`before_agent_start`、`tool_call` 钩子；`tool_call` 可返回 `{ block: true, reason }` 或改写参数。
- **request**：`context` 钩子（单次替换发给 LLM 的消息列表而不改 JSONL）、`before_provider_request` 钩子、以及 `prewalk`/`auto-prewalk` 按任务切换模型。
- **turn-stopping**：`turn_end`、`session_stop` 钩子可请求 continuation；内核还固化 `TodoTracker.checkCompletion()` 与 checkpoint 未 rewind 禁止 yield 的 guard。

## 12. 环境与代码锚定

- Bash：`direnv`/`devenv` 预检与 watched-path 变化检测、shell rc aliases/functions/options 快照（`omp://bash-tool-runtime.md`、`src/exec/direnv.ts`）。
- Eval：JS 受管依赖环境与项目级 `%environment project`（`src/eval/js/package-installer.ts`）。
- 插件：`omp-plugins.lock.json` 与按版本缓存目录（`skill://omp/references/marketplace.md`）。
- 模型：`models.yml` 精确 ID/endpoint/headers；task 支持 `provider/model-id@upstream:level` 精确 pin。
- 文件修改：Hashline `[FILENAME#TAG]` 快照校验与 seen-line guard，防止在过期上下文上盲改（`omp://tools/edit.md`）。

## 13. 反向报告与代码图

- `write xd://report_issue`：当工具输出与文档描述不符时，写入 grievance 记录（`src/tools/report-tool-issue.ts`）。
- 内置 `read` 裸读代码默认只给声明签名；`lsp` symbols、`find` 提供符号与语义导航。
- 跨服务/全仓调用拓扑不由核心内置；本机通过 MCP `mcp__codegraph_explore` 与 `mcp__graphify_*` 提供代码图与影响面查询。
