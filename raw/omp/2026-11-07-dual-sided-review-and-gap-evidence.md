# 双端原件复核与缺口反证检索记录

> Source: 本次 7 个并行只读 scout 复核结果及主代理对课程归档、`omp://`、`skill://omp`、`xd://eval/*` 与本机 `@oh-my-pi/pi-coding-agent/src/` 的直接核验
> Collected: 2026-11-07
> Published: Unknown（复核工作记录）

## 复核范围与方法

- **课程端**：`~/geekbang-agent-harness/` 全部 34 个文件（开篇词、直播回放、01–30 讲、结束语、结课测试说明）逐篇读取核对；其中结课测试 `geekbang-1030954.txt` 仅含题量与分值说明，无具体题目正文。
- **OMP 端**：`omp://` 文档树（133 份内建文档条目）及核心机制文档、全部 34 个 `omp://tools/*.md`；`skill://omp` 顶层与现存 9 份 `references/*.md`，以及独立 `skill://omp-plannotator-inbox`；`xd://eval/ratchet|judge|agents|archive|helpers`；本机 `@oh-my-pi/pi-coding-agent/src/` 中相关实现。
- **判定口径**：直接对应（OMP 有原生机制实现）；部分对应/形态不同（实现核心子集或以不同机制覆盖，注明未内置部分）；真缺口（经文档与源码反证检索仍未找到通用内置机制）。

## 一、课程端勘误（初稿表述 → 原件事实）

| 编号 | 初稿表述 | 原件事实 | 出处 |
|---|---|---|---|
| C-1 | 「按架构压缩」归在第 21 讲 | 第 21 讲是输出/过程/风格/结构四角度锚定；「按架构压缩」「微服务边界索引」明确出自第 29 讲 | `geekbang-1022682.txt`；`geekbang-1029430.txt:10-18` |
| C-2 | 「自我纠正 = ReAct」 | 第 02 讲：ReAct 是推理—行动—观察三步；自我纠正循环是其特殊形式，多出第四步自我纠正，对应内层 PDCA | `geekbang-1007826.txt` |
| C-3 | 第 23 讲仅写 `learn→manage_skill + /omfg` | 第 23 讲原文未提 `learn` 或 `/omfg`，核心是以 Skill 为资产、以 Eval 驱动生命周期管理/验证/抽象/维护，含触发精度/输出质量/效率三信号、正负例与「卸掉 Skill 的裸模型基线」净提升对比 | `geekbang-1024389.txt:5-22` |
| C-4 | 第 25 讲仅写「多 Agent 编排」 | 补齐：token 3–10 倍成本、「嫉妒税（某某-Envy）」、仅限严格工作流/多路并发/上下文隔离、TradingAgents 四层与「该结构化就结构化、该对话才对话」、状态文件 + `/loop` 与 Subagent（`context: fork`）两种替代 | `geekbang-1025999.txt:4-6,19-43` |
| C-5 | 结束语含「三层闭环」 | 结束语原文无此术语；保留「把判断外包出去，不是驾驭，是缴械」及 Guides/Steering 归人、Action 归 Agent、Sensors 尽量归机器的分工 | `geekbang-1030948.txt:8-16` |
| C-6 | 第 05 讲原则清单混入「知识固化」且漏「可复现性优先」 | 第 05 讲六项为双层循环、仓库即规范、渐进式信息披露、计算/推断分离、最小干预、可复现性优先；知识固化是第 06 讲主题 | `geekbang-1010541.txt`；`geekbang-1011295.txt` |
| C-7 | 原文两处内部细节出入（备案，不改写成统一规则） | 第 10 讲掌握率阈值正文「超过 90%」与示例脚本 `>= 0.90` 不完全一致；第 06 讲演示对话把 PDCA 写成「Plan, Do, Action, Check」且有 `<80%` 与 `50–80%` 分支重叠 | `geekbang-1014410.txt`；`geekbang-1011295.txt` |

## 二、OMP 端勘误（初稿表述 → 文档/源码事实）

| 编号 | 初稿表述 | 文档/源码事实 | 出处 |
|---|---|---|---|
| O-1 | `RULES.md` 属于普通 context-files（`<repo-rules>`） | 用户级与项目级 `.omp/RULES.md` 走 rule 管线（`RULES`/`RULES@project`），强制 `alwaysApply: true`，注入 `<generic-rules>` | `omp://rulebook-matching-pipeline.md`；`omp://context-files.md` |
| O-2 | 笼统写「TTSR 拦截流式输出 + judged rules」 | TTSR 三触发器：`condition`（正则流式，可中断）、`astCondition`（`edit`/`write` 后检查源码快照）、`question`（完成态 judge，`yes>=0.7` 投递 warning，不中断流） | `omp://ttsr-injection-lifecycle.md`；`src/export/ttsr.ts:58` |
| O-3 | memory backend 混为单一机制，漏 `local` Phase 2 与 `sharpshooter` | 五种 backend 职责不同：`off`/`local`/`mnemopi`/`hindsight`/`sharpshooter`；local Phase 2 生成 `MEMORY.md`、`memory_summary.md` 与 `skills/`；sharpshooter 自动维护 `architecture.md`/`product.md`/`style.md` | `omp://memory.md`；`omp://mnemosyne-memory-backend.md` |
| O-4 | `checkpoint`/`rewind` 仅称状态机，未声明非文件/非 Git 边界 | 只回滚会话树上下文并保留 `branch_summary`；不回滚磁盘文件、Git、artifact 或 blob | `omp://tools/checkpoint.md`；`omp://tools/rewind.md` |
| O-5 | 漏 `/ratchet`、`/autoresearch`、`/green`、`/review`、`/cleanse`、`jevify`、`chillax`、Hashline 快照锁、`ast_edit` + `xd://resolve` | 均为本机文档/源码中存在的机制：ratchet 为 held-out Eval hillclimbing；cleanse 为诊断修复 + 独立复验；green 为 CI 循环；jevify 为批量 judge 与不确定项升级；Hashline 与 ast_edit 提供修改锚定与 staged 审批 | `src/ratchet/ratchet.ts`；`src/autoresearch/index.ts`；`src/cleanse/loop.ts`；`src/prompts/ci-green-request.md`；`omp://magic-keywords.md`；`omp://tools/edit.md`；`omp://tools/ast-edit.md` |
| O-6 | 把 `bashInterceptor` 当安全边界 | `bashInterceptor` 只是 shell 调用导向专用工具的偏好层；执行审批在 `bash.patterns` 与 `approvalMode` | `omp://bash-tool-runtime.md`；`omp://approval-mode.md` |

## 三、七项候选缺口的确定性反证检索

| 缺口项 | 检索关键词与范围 | 命中结果 | 最终定性 |
|---|---|---|---|
| A. 第 09 讲：外部知识依赖 `SOURCE.md` 自动更新 | `SOURCE\.md`、`knowledge_base_paths`、`source_query`、`refresh_after_consolidation`、`stale`（`src/` 与 `omp://`） | `SOURCE\.md` 0 命中；`knowledge_base_paths` 仅见 `tools/security-scan.ts` 扫描入参 SHA-256；`source_query`/`refresh_after_consolidation` 见 `hindsight/mental-models.ts`（心智模型刷新） | **部分对应**：有心智模型刷新与扫描知识库哈希锁，无通用外部文档依赖清单与自动拉取器 |
| B. 第 11 讲：指令文件语义腐化审计 | `context-file`、`AGENTS\.md`、`cleanse`、`doctor`、`deprecated` | `capability/context-file.ts` 有归一化包含折叠；rulebook 有同名 `first-wins` 遮蔽；未见针对指令正文的语义矛盾检测或行数/过期审计器 | **部分对应**：有加载期去重与遮蔽可见性，无指令正文静态矛盾/腐化审计工具 |
| C. 第 18 讲：项目级 `init.sh` 与 Skill 版本强校验 | `direnv`、`devenv`、`environment`、`sandbox`、`lock`、`docker`、`init\.sh` | `init\.sh` 0 命中；`exec/direnv.ts`、`exec/bash-executor.ts` 有 direnv/devenv 预检与 shell rc 快照；`eval/js/package-installer.ts` 有依赖环境管理 | **部分对应**：有 direnv/rc 快照与 Eval 依赖锁，无项目级 `init.sh` 一键复现与第三方 Skill commit 强制校验器 |
| D. 第 19 讲：全仓存量违规基线账本 | `ast_grep`、`ast_edit`、`astCondition`、`rulebook`、`baseline` | `capability/rule.ts` 有 `astCondition` 实时拦截；`tools/ast-grep.ts`、`ast-edit.ts` 支持结构化搜索与改写；未见 ArchUnit `FreezingArchRule` 式存量违规冻结账本 | **部分对应**：有实时 AST 拦截与批量改写，无全仓存量违规冻结账本 |
| E. 第 22 讲：通用执行期低置信度自动升级人工 | `confidence`、`escalat`、`threshold`、`0\.70`、`0\.7\b` | 命中 `auto-prewalk/classifier.ts:31`（0.7）、`export/ttsr.ts:58`（0.7）、`prompts/system/jevify-notice.md`（批量分类不确定项人工复读提示）；主执行循环未见「置信度低自动暂停并升级人工审批」机制 | **真缺口**：0.70 阈值仅用于 prewalk 路由与 TTSR 事后判定，向人提问靠模型主动调 `ask`，无通用执行期低置信度自动升级 |
| F. 第 29 讲：跨服务边界拓扑索引 | `codegraph`、`service-map`、`api\.contract`、`find`、`symbols` | 核心 `src/` 中 `codegraph`/`service-map` 0 命中；内置有 `find` 与 `lsp` symbols、`read` 声明签名；跨服务图由外部 MCP `mcp__codegraph_explore`、`mcp__graphify_*` 提供 | **部分对应**：内置文件骨架与 LSP 符号，跨服务边界拓扑靠外部 MCP 补齐 |
| G. 第 30 讲：业务探针失败自动回写架构知识库 | `ratchet`、`autoresearch`、`report_issue`、`grievance`、`learn` | 命中 `tools/report-tool-issue.ts`（`write xd://report_issue`）、`ratchet/ratchet.ts`、`autoresearch/index.ts`；未见「业务测试跑挂后自动改写仓库架构文档」硬编码接线 | **部分对应**：有工具 QA 反向报告与 Eval 闭环，业务探针回写需由 Skill 指令引导 Agent 执行 |

## 四、复核后的映射判定汇总

- **直接对应**：四骨干与四子系统、内外双层循环、计算/推断分离、渐进披露、最小干预与工具网关、执行验证分离、反馈优先与 TTSR、Advisor 三级反馈与成功静默、上下文预算/Checkpoint/换窗、知识固化、Skills 写法、锚定与结构化交接、Loop 工程与 `/goal`/`/loop` verifier、多 Agent 三种形态、内部 Harness 三扩展点、Workspace 两段式下发、Eval 驱动自我改进（`/ratchet`、`/autoresearch`）。
- **部分对应/形态不同**：上表 A、B、C、D、F、G 六项，均在映射文章中注明「已具备的部分」与「未内置的部分」。
- **真缺口**：上表 E——通用执行期按模型置信度自动停机升级人工。
- **OMP 超出课程描述的机制**：provider/fallback 与用量路由、secrets 混淆、E2E collab、security_scan 双通道、eval kernel（workpool/judge/ratchet/archive）、blob/artifact 外置、TUI 与多 launch mode、Vibe 持久 worker、prewalk 模型交接、Hashline 快照防漂移与 `xd://resolve` 延迟提交。

## 五、证据边界

- 本记录只证明复核时点本机文档与源码中的机制；不推断未来版本或上游未安装功能。
- 「真缺口」均附已检索范围；不将「未在本文档出现」扩大为「OMP 永远不可能通过扩展实现」。
- 本次复核未修改 `raw/`、`wiki/` 之外的任何 OMP 配置或源码，未发起新的外部网络抓取。
