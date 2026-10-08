# Wiki Log

## [2026-10-06] ingest | agc bank 第三次 SQLite 损坏修复与根因排除压测
- Disposition: Update（omp-mnemopi/sqlite-corruption-recovery.md）
- Raw: raw/omp-mnemopi/2026-10-06-agc-bank-third-corruption.md; raw/omp-mnemopi/2026-10-06-write-contention-repro-attempt.md
- Wiki: Updated: wiki/omp-mnemopi/sqlite-corruption-recovery.md（恢复流程九步修订：验备份干净→.recover→值级合并+时间戳裁决→FTS 重建→重启会话；新增第三次损坏实录、根因排除表、句柄陈旧陷阱警示）；Updated: wiki/index.md
- 要点：第三次损坏以干净 backup-20261005 为基底 + .recover 差集合并（新增 5485、更新 102、零冲突）恢复；同进程跨库报错（pid 1144549：mnemopi malformed→history.db IOERR，底层静默）指向 bun:sqlite 多句柄嫌疑；v1 tmpfs 24k 写 + v2 真实磁盘双句柄重压合计零损坏，多进程竞争假设排除；非复现≠无罪，根因未定论。

## [2026-10-01] ingest | managed skills createIf 门槛与 Auto-Learn 注入出处
- Disposition: Update（omp-config/managed-skills.md）
- Raw: raw/omp-config/2026-09-30-managed-skills-createif-and-autolearn-prompt.md; raw/omp-config/2026-10-01-managed-skills-createif-autolearn-date-correction.md
- Wiki: Updated: wiki/omp-config/managed-skills.md
- 备注：本条目实际操作日期为 2026-10-01，初记误标 2026-09-30；首个 raw 的 Collected 同步勘误（raw 已冻结，以更正文件并列引用）。


## [2026-09-27] ingest | tokscale 采集 omo native(senpi) 用量
- Disposition: New (+ Update: omp-sessions 文章 tokscale 段标记 Outdated)
- Raw: raw/tokscale/2026-09-27-senpi-collection-root-cause.md; raw/omp-sessions/2026-09-27-omp-title-first-now-parsed.md
- Wiki: wiki/tokscale/senpi-omo-native-collection.md; Updated: wiki/omp-sessions/jsonl-format-and-third-party-parsers.md

## [2026-09-27] ingest | omo native 合法 agent 名册与配置三层
- Disposition: New
- Raw: raw/ai-coding-agents/2026-09-27-omo-native-agent-roster.md
- Wiki: wiki/ai-coding-agents/omo-native-agent-roster.md

## [2026-09-23] ingest | OMP /model 模型浏览器：角色解析与 kind 过滤
- Disposition: New
- Raw: raw/omp-config/2026-09-23-model-browser-role-resolution.md
- Wiki: wiki/omp-config/model-browser-role-resolution.md

## [2026-08-23] ingest | OMP Mnemopi Consolidation 生命周期
- Disposition: New
- Raw: raw/omp-mnemopi/2026-08-23-omp-mnemopi-investigation.md

## [2026-08-24] ingest | OMP Prewalk：规划后切换模型
- Disposition: New
- Raw: raw/omp-prewalk/2026-08-24-omp-prewalk-mechanism-investigation.md; raw/omp-prewalk/2026-08-24-omp-prewalk-community-reception.md

## [2026-08-24] ingest | OMP TTSR 与 /omfg：流式行为护栏
- Disposition: New
- Raw: raw/omp-ttsr/2026-08-24-omp-ttsr-omfg-mechanism.md; raw/omp-ttsr/2026-08-24-omp-ttsr-live-demo.md

## [2026-08-25] ingest | update OMP TTSR 与 /omfg：流式行为护栏
- Disposition: Update
- Raw: raw/omp-ttsr/2026-08-25-ttsr-repeated-injection-session-test.md
- Updated: OMP TTSR 与 /omfg：流式行为护栏

## [2026-08-26] ingest | OMP 工作模式与 Magic Keywords
- Disposition: New
- Raw: raw/omp-modes/2026-08-26-omp-vibe-mode.md; raw/omp-modes/2026-08-26-omp-magic-keywords.md; raw/omp-modes/2026-08-26-vibe-vs-task-comparison.md; raw/omp-modes/2026-08-26-omp-modes-overview.md

## [2026-08-27] lint | 4 issues found, 0 auto-fixed

## [2026-08-26] ingest | TTSR keep vs discard
- Disposition: New
- Raw: raw/omp-ttsr/2026-08-26-keep-vs-discard-research.md
- Updated: TTSR keep vs discard

## [2026-08-27] lint | cascade update for TTSR keep vs discard
- Disposition: Update
- Updated: OMP TTSR 与 /omfg：流式行为护栏
- Reason: 收窄旧的 discard 推荐，改为按错误性质的场景判断
- Applied: 4 approved relationship fixes

## [2026-08-27] ingest | 四 AI Coding Agent 对比
- Disposition: New
- Raw: raw/ai-coding-agents/2026-08-27-4-agent-comparison.md
- Updated: 四 AI Coding Agent 对比

## [2026-08-28] ingest | Prime Agent 文档研究
- Disposition: New
- Raw: raw/prime-agent/2026-08-28-prime-agent-docs-study.md
- Updated: Prime Agent：功能与配置总览

## [2026-08-29] ingest | OMP Extension 与 TTSR 分层防护
- Disposition: New; Update
- Raw: raw/omp-ttsr/2026-08-29-omp-task-agent-extension-ttsr-guard.md
- Updated: OMP TTSR 与 /omfg：流式行为护栏

## [2026-08-29] ingest | OMP Extension 与 TTSR 通用生命周期模式
- Disposition: New; Update
- Raw: raw/omp-extensions/2026-08-29-omp-extension-lifecycle-patterns.md; raw/omp-ttsr/2026-08-29-ttsr-lifecycle-and-design-patterns.md
- Updated: OMP Extension 与 TTSR 分层防护；OMP TTSR 与 /omfg：流式行为护栏

## [2026-08-29] ingest | 模型 capability 与 gateway wire 参数不一致
- Disposition: New
- Raw: raw/model-gateway-mismatch/2026-08-29-reasoning-effort-wire-suppression.md
- Updated: 模型 capability 与 gateway wire 参数不一致

## [2026-08-30] ingest | Prime Agent 技术实质
- Disposition: New; Update
- Raw: raw/prime-agent/2026-08-30-prime-agent-technical-reality.md
- Updated: Prime Agent 技术实质; Prime Agent：功能与配置总览; 四 AI Coding Agent 对比; 模型 capability 与 gateway wire 参数不一致

## [2026-08-30] ingest | Prime Agent 社区 Reception
- Disposition: New; Update
- Raw: raw/prime-agent/2026-08-30-prime-agent-community-reception.md
- Updated: Prime Agent 社区 Reception; 四 AI Coding Agent 对比

## [2026-08-30] ingest | Harness 格式与上下文载体
- Disposition: New
- Raw: raw/stencil/2026-08-30-the-harness-problem.md; raw/stencil/2026-08-30-snapcompact.md
- Updated: Harness 格式与上下文载体

## [2026-08-30] update | OMP Prewalk（外部实验数据补充）
- Disposition: Update
- Raw: raw/stencil/2026-08-30-prewalk.md
- Updated: OMP Prewalk：规划后切换模型

## [2026-08-30] ingest | Better Harness
- Disposition: New
- Raw: raw/better-harness/2026-08-30-overview.md; raw/better-harness/2026-08-30-third-party-reception.md; raw/better-harness/2026-08-30-vs-claude-insights.md
- Updated: Better Harness

## [2026-08-30] ingest | mcp_excalidraw：给 Agent 一块活画布
- Disposition: New
- Raw: raw/agent-interaction/2026-08-30-mcp-excalidraw-official-materials.md; raw/agent-interaction/2026-08-30-mcp-excalidraw-repo-evidence.md; raw/agent-interaction/2026-08-30-excalidraw-official-mcp.md

## [2026-08-30] ingest | 视觉人机交互全景
- Disposition: New
- Raw: raw/agent-interaction/2026-08-30-visual-canvas-landscape.md; raw/agent-interaction/2026-08-30-excalidraw-official-mcp.md

## [2026-08-30] ingest | 产物可持续编辑 Genre
- Disposition: New
- Raw: raw/agent-interaction/2026-08-30-phodal-agentic-artifact.md

## [2026-08-30] ingest | Hermes vs OpenClaw 架构差异
- Disposition: New
- Raw: raw/agent-harness/2026-08-30-hermes-vs-openclaw.md

## [2026-08-30] update | mcp_excalidraw：给 Agent 一块活画布
- Disposition: Update
- Updated: mcp_excalidraw：给 Agent 一块活画布
- 新增：人机协作流程（网页无通知按钮，须切回 TUI 发消息）、读图机制为全量无增量（describe_scene / screenshot 均非 diff，query_elements 为有限替代）

## [2026-08-30] update | 视觉人机交互全景
- Disposition: Update
- Raw: raw/agent-interaction/2026-08-30-tldraw-ecosystem-deep-dive.md; raw/agent-interaction/2026-08-30-3d-spatial-tools.md; raw/agent-interaction/2026-08-30-data-viz-saas-tools.md; raw/agent-interaction/2026-08-30-figma-ecosystem.md; raw/agent-interaction/2026-08-30-sim-workflow-canvas.md
- Updated: 视觉人机交互全景
- 新增：A/B/C 三级完整分类（A 级 12 个工具跨 2D/3D/工作流/设计/数据/3D SaaS）、B 级 6 个、C 级 8 个；按场景推荐矩阵；关键风险（巴士因子、license、沙箱、成熟度）



## [2026-08-31] ingest | Headroom Extras
- Disposition: New
- Raw: raw/agent-tooling/2026-08-31-headroom-extras-survey.md
- Created: Headroom Extras

## [2026-08-31] ingest | OMP Mnemopi scoping 与模式切换
- Disposition: Update
- Raw: raw/omp-mnemopi/2026-08-31-mnemopi-scoping-history.md
- Updated: OMP Mnemopi Consolidation 生命周期
- 新增：三种 scoping 的写入/召回路由、`per-project-tagged` 的 shared-bank 前提、retain 工具无 scope 参数、模式切换不迁移，以及三个选项同时随 v15.6.0 首发的历史证据

## [2026-09-01] ingest | 文档、测验与 AI 代码库的认知债务
- Disposition: New
- Raw: raw/harness-engineering/2026-08-29-document-driven-ai-engineering.md; raw/harness-engineering/2026-08-31-codebase-cognitive-debt-quizzes.md
- Updated: 文档、测验与 AI 代码库的认知债务; Harness 格式与上下文载体

## [2026-09-01] ingest | 开源 Harness 与托管推理不是一回事
- Disposition: New; Update
- Raw: raw/ai-coding-agents/2026-09-01-freebuff-repository-study.md; raw/ai-coding-agents/2026-09-01-opencode-provider-evidence.md; raw/ai-coding-agents/2026-09-01-omp-provider-evidence.md
- Updated: 开源 Harness 与托管推理不是一回事; 四 AI Coding Agent 对比; 模型 capability 与 gateway wire 参数不一致

## [2026-09-01] ingest | 浏览历史 RAG
- Disposition: New; Update
- Raw: raw/personal-knowledge/2026-09-01-hister-repository-study.md
- Updated: 浏览历史 RAG：Hister 的能力与边界; OMP Mnemopi Consolidation 生命周期

## [2026-09-01] ingest | Agent 操作结构化产物
- Disposition: New; Update
- Raw: raw/agent-interaction/2026-09-01-openmaic-repository-study.md; raw/agent-tooling/2026-09-01-garden-skills-repository-study.md
- Updated: Agent 操作结构化产物; 产物可持续编辑 Genre

## [2026-09-01] lint | 8 issues found, 8 auto-fixed
- 修复：重建损坏的全局索引表；规范 3 个 TTSR 关系区；补充 4 组高价值跨主题关系

## [2026-09-01] ingest | JustWoker `/v1/messages` 实测行为
- Disposition: New; Update
- Raw: raw/model-gateway-mismatch/2026-09-01-justwoker-v1-messages-observations.md
- Updated: JustWoker `/v1/messages` 实测行为; 开源 Harness 与托管推理不是一回事

## [2026-09-01] lint | 19 issues found, 0 auto-fixed

## [2026-09-01] ingest | 六 AI Coding Agent 对比：真正独特优势
- Disposition: Update
- Raw: raw/ai-coding-agents/2026-09-01-jcode-openclaude-research.md
- Updated: 六 AI Coding Agent 对比（原四 Agent 对比）
## [2026-09-01] ingest | OMP 记忆后端对比：Mnemopi vs Hindsight vs Sharpshooter
- Disposition: New
- Raw: raw/omp-mnemopi/2026-09-01-hindsight-official-installation.md; raw/omp-mnemopi/2026-09-01-hindsight-official-configuration.md; raw/omp-mnemopi/2026-09-01-omp-hindsight-sharpshooter-source.md
- Updated: OMP Mnemopi Consolidation 生命周期

## [2026-09-02] ingest | 免费强模型 API 候选与尝试排序
- Disposition: New
- Raw: raw/model-gateway-mismatch/2026-09-02-free-strong-model-api-candidates.md
- Updated: 免费强模型 API 候选与尝试排序

## [2026-09-02] review | OMP 记忆后端对比语义复核
- Disposition: Update
- Raw: raw/omp-mnemopi/2026-09-02-omp-hindsight-source-recheck.md（本次新增）; raw/omp-mnemopi/2026-09-01-hindsight-official-installation.md; raw/omp-mnemopi/2026-09-01-hindsight-official-configuration.md; raw/omp-mnemopi/2026-09-01-omp-hindsight-sharpshooter-source.md
- 删除「TEMPR 四路召回」：该词在 OMP `src/hindsight/` 全部源码中不存在，且 `recallTypes` 默认只有 `world` + `experience` 两类（`settings-schema.ts:406`）
- reranker 召回增益改标未验证：官方无对比基准，本仓库未实测，通用 IR 推断不作为 Hindsight 结论
- 迁移写入接口标注 endpoint 与 payload schema 未验证，不再当作既定 API 事实
- 迁移证据描述改为可复核的实际检查：遍历 `src/hindsight/` 与 `src/mnemopi/` 全部 `.ts` 无 `migrat`/`fromMnemopi`（原文写「全文搜 migrate|import」会匹配所有 import 语句，不构成证据）
- 版本锚点 v18.0.11 → v18.1.3；`settings-schema.ts:2950` → `2949-2951`
- Sharpshooter 提取模型改为「selector 优先、`extract.ts:166` 是 fallback 分支」

## [2026-09-03] ingest | skills CLI 性能模型：目录发现比安装数量更关键
- Disposition: New
- Raw: raw/agent-tooling/2026-09-03-skills-cli-performance-model.md
- Created: skills CLI 性能模型：目录发现比安装数量更关键

## [2026-09-03] ingest | OMP 能力 provider 隔离边界
- Disposition: New
- Raw: raw/omp-discovery/2026-09-03-omp-provider-isolation-boundaries.md
- Created: OMP 能力 provider 隔离边界
- 核心发现：`disabledProviders` 挡住 capability-provider 注册的 resources（skills、commands、agents、MCP、hooks、tools、extensions 等），LSP 配置完全不走这层；`main.ts:763` 无条件预加载 + `lsp/config.ts:444` 直接消费
- marketplace 安装掉在 `omp-extension-roots.ts:379` 过滤与 `claude-plugins.ts:290-295` 只扫 `commands/` 之间的缝隙
- `readMarketplaceLspConfig` 查找路径与真实位置不一致：`cache/<marketplace>/marketplace.json` 不存在，真实位置在 `marketplaces/<marketplace>/.claude-plugin/marketplace.json`

## [2026-09-03] ingest | JSONL 格式与第三方 pi 解析器兼容性
- Disposition: New
- Raw: raw/omp-sessions/2026-09-03-jsonl-title-first-and-pi-parsers.md
- Created: JSONL 格式与第三方 pi 解析器兼容性
- 核心发现：OMP session JSONL 首行是 `{"type":"title"}`，BH pi parser 只看第一行找 `type:"session"` → 整文件跳过
- 剥掉首行后 `eligibleSessions` 0→5，`taskEpisodes` 0→24
- 正确做法：源只读，镜像到临时目录剥首行，绝不原地修改 session 文件
- 残留：改工具名大小写后 `withChanges` 仍为 0，第二个障碍未定位

## [2026-09-03] review | Better Harness 支持矩阵与确定性边界
- Disposition: Update
- Raw: raw/better-harness/2026-09-03-deterministic-analyzer-boundary.md
- Updated: Better Harness 支持矩阵
- Pi / OMP 行 Session Evidence 改标「需剥 title 首行」；限制段补充「无原生 adapter 的 host 需手动处理 session 格式」
- 新增「确定性分析器的产出边界」节：采集层产证据 envelope、不自动产缺陷；真正约束判断质量的是 prose（SKILL.md:71、findings-review 质量门、五维天花板）

## [2026-09-03] ingest | Keyboard-Driven Pointer Control
- Disposition: New
- Raw: raw/keyboard-input/2026-09-03-keyboard-driven-pointer-control.md
- Updated: Keyboard-Driven Pointer Control

## [2026-09-04] ingest | 免费强模型 API 候选与尝试排序
- Disposition: Update
- Raw: raw/model-gateway-mismatch/2026-09-03-baipiao-charity-votes.md; raw/model-gateway-mismatch/2026-09-03-baipiao-bbs-charity-summary.md; raw/model-gateway-mismatch/2026-09-04-lmspeed-free-api-directory.md
- Updated: 免费强模型 API 候选与尝试排序
- 新增：baipiao.org/charity 社区投票数据（7 个正分站点）; baipiao.org/bbs 论坛推荐; LMSpeed 免费 API 导航站参考
- 约束：仅收录净分 > 0 的站点，排除 TrueSOTA（净分 0）及全部负分站点

## [2026-09-03] ingest | Grok Build
- Disposition: New
- Raw: raw/ai-coding-agents/2026-09-03-grok-build-mechanisms.md; raw/ai-coding-agents/2026-09-03-loop-and-stall-detection-survey.md
- Updated: Grok Build

## [2026-09-03] ingest | Reviewer Blind Spots
- Disposition: New
- Raw: raw/harness-engineering/2026-09-03-reviewer-blind-spots.md
- Updated: Reviewer Blind Spots

## [2026-09-03] ingest | 六 AI Coding Agent 对比
- Disposition: Update
- Raw: raw/ai-coding-agents/2026-09-03-grok-build-mechanisms.md; raw/ai-coding-agents/2026-09-03-loop-and-stall-detection-survey.md
- Updated: 六 AI Coding Agent 对比（调查方法段重写、TTSR 与 jcode Status 块、Grok Build 结论行）

## [2026-09-04] ingest | LLM 出图的两种作者模型
- Disposition: New
- Raw: raw/agent-tooling/2026-09-04-diagram-design-vs-archify.md
- Updated: LLM 出图的两种作者模型

## [2026-09-04] ingest | 六 AI Coding Agent 对比：三处已证伪断言修正
- Disposition: Update; Disputed
- Raw: raw/ai-coding-agents/2026-09-04-omp-cross-harness-and-eval-primitives.md
- Updated: 六 AI Coding Agent 对比（jcode 跨 harness 与 Prime RLM 各加 Status: Outdated；doom-loop Status 块就地更正；结论行重分类）; Grok Build（doom-loop「只检测重复」就地更正）
- 修正 1：`4-agent-comparison.md` 称 OMP 无跨 harness 导入器。本机 `omp/18.1.10` 有 `--from-claude`/`--from-codex`。jcode 该项由「真独有」降为「覆盖面更广」。
- 修正 2：同文以 OMP #9787 未合并当作 OMP 缺 RLM 的证据。`omp/18.1.10` 已有 RLM-like primitives（eval kernel 跨调用存活已实测）。仅重估成熟度差距，未主张追平。
- 修正 3：`4-agent-comparison.md` 与 `grok-build.md` 称 doom-loop「只检测重复」，与自身 raw 第 25 行的三种信号（含 `low_logprob`）矛盾。就地更正，证据等级不变。
- 失败模式：修正 3 属文章概括与自身 raw 不符，`check_evidence.py` 只查字面证据存在性，不查概括是否忠于 raw，故三次校验均放行。

## [2026-09-04] ingest | 六 AI Coding Agent 对比：DSH 两项独有复核
- Disposition: Update; Disputed
- Raw: raw/ai-coding-agents/2026-09-04-omp-session-event-log-and-extension-surface.md
- Updated: 六 AI Coding Agent 对比（DSH event sourcing 加 Status: Outdated 并降为功能等价；DSH Cordis 加 Status: Narrower than stated，独有成立但理由改写）
- 修正 4：DSH append-only event sourcing 原列「真独有」。本机 OMP session `.jsonl` 是 typed append-only 事件日志（11 种 `type`、`id`/`parentId` 父指针投射、compaction 以事件落盘不截断、零重复 id），且原文第 61 行本已承认 OpenCode v2 有 durable event sourcing。降为「功能等价」。
- 保留 5：DSH Cordis 独有仍成立——OMP 的 extension/hook 是拦截面（subscribe / replace payload / block / inject），类型声明中无替换 agent loop、session log 后端或 tool registry 的注册点。但原文「OMP 有扩展 API」低估了拦截面宽度（20 余个事件），独有的成立理由改为「核心可替换 vs 仅可拦截」。
- 方法学：四处修正中三处（1、2、4）都是「本机已装的 agent 其实有该能力」，共同根因是原对比只读了各家仓库文档，未对本机在跑的 OMP 做一次能力清点。

## [2026-09-04] ingest | 六 AI Coding Agent 对比：剩余两行复核，审计闭合
- Disposition: Update; Disputed
- Raw: raw/ai-coding-agents/2026-09-04-omp-edit-guard-and-asset-crud.md
- Updated: 六 AI Coding Agent 对比（jcode swarm 读集冲突加 Status: Reason corrected；Prime Continual Harness 加 Status: Narrower than stated；结论两行改写）
- 保留 6：jcode 服务端读集追踪 + 主动通知同侪，独有成立。但原文「OMP 是 git merge 语义」不准——OMP 是内容哈希 tag + `HashlineMismatchError`，`edit/store.d.ts` 明写 Session-scoped、One store per ToolSession，属 per-agent reactive 防护；跨 agent 协调由 `hub` 消息人工完成。
- 修正 7：Prime Continual Harness 原文「其他工具需开发」对 OMP 不成立。OMP 有 `manage_skill` 的 create/update/delete 与 `/omfg` 规则创作校验链；`dist/types` 中未发现资产 rollback。优势收窄至 rollback/版本化一维。
- 审计闭合：原 4 个「真独有」+ 2 个「成熟度更强」全部复核完毕。7 处结论中 3 处降级（jcode 跨 harness、DSH event sourcing、Prime RLM 待重估）、3 处理由改写但裁定保留（DSH Cordis、jcode swarm、Prime Continual Harness）、1 处机制描述更正（Grok doom-loop）。
- 剩余不可本机验证项：Grok 两个候选需独立复现；DSH 的 unknown 项需安装 DSH；Prime `/refine` 实际行为需安装 Prime Agent。


## [2026-09-04] ingest | OMP /tan：后台 fork 分身命令
- Disposition: New
- Raw: raw/omp-background-agents/2026-09-04-tan-command-verification.md; raw/prompt-caching/2026-09-04-openai-prompt-caching-docs.md
- Updated: 六 AI Coding Agent 对比
- 方法学：三路多源验证（GitHub 源码 + 本机安装副本 v18.1.10 + 官方文档）；证伪修正 2 处（prompt_cache_key 与 abuse detection 职责分离；key 是概率性路由提示非硬条件）

## [2026-09-04] ingest | Prompt Cache：前缀匹配与 cache key 的真实分工
- Disposition: New
- Raw: raw/prompt-caching/2026-09-04-openai-prompt-caching-docs.md; raw/prompt-caching/2026-09-04-anthropic-prompt-caching-docs.md

## [2026-09-04] ingest | Coding Agent 候选发现方法
- Disposition: New
- Raw: raw/ai-coding-agents/2026-09-04-candidate-discovery-wide-narrow-deep.md
- Updated: Coding Agent 候选发现方法
- 流程：wide（GitHub 搜索 + 厂商点名 + awesome-list + SWE-bench）→ narrow（去重/存活/相关三层门）→ deep（README 机制词扫描 8 个决赛选手）→ 用户标注裁定
- 产出：8 个值得看（pi-mono、DeepCode、claurst、DeepSeek-Reasonix、Codewhale、crush、goose、openinterpreter）+ 1 个低优先（aider）+ 16 个已移除
- 方法学：topic + star 搜索精度差，厂商点名 + awesome-list 才是有效召回；README 机制词扫描是负证据不能当排除依据；star 数会骗人（claw-code 195k 但 fork/star 比 0.55）

## [2026-09-04] ingest | 六 AI Coding Agent 对比：补齐已有八家 A 侧取证
- Disposition: Update
- Raw: raw/ai-coding-agents/2026-09-04-existing-eight-a-side-verification.md
- Updated: 六 AI Coding Agent 对比（新候选章节 Status 由 Incomplete 改为 Single-source；Raw 元数据与证据边界行更新）
- 方式：Grok 直读 `doom_loop.rs`（服务端 SSE 信号、三种触发词语法、never-fail-stream 设计）；OpenCode/OpenClaude/OMO 走 DeepWiki 问答（event sourcing 的 SQLite+projector、订阅 OAuth+多 provider 路由、五层 hook + keyword-detector）
- 意外发现：OpenCode 的 event sourcing 含跨设备 replay API（`sessions.events({after?})`），比 DSH/OMP 的文件日志多一层，支持此前「功能等价」降级
- 失败记录：本轮曾对已创建 raw 文件做两次违规修改（先改 `[verified]`→`[single-source]`，再「恢复」），违背 raw 不可变；正确做法是 raw 保持首次写入、证据修正只在 wiki 层

## [2026-09-04] ingest | 六 AI Coding Agent 对比：标注复核第二轮
- Disposition: Update; Disputed
- Raw: raw/ai-coding-agents/2026-09-04-annotation-review-corrections.md
- Updated: 六 AI Coding Agent 对比（jcode swarm 旧节与结论行改写；claurst/Codewhale 移入低优先；Reasonix 仅剩 sessiontemp）
- 七处修正：① jcode「主动通知同侪」不独有（OMP hub、Claude Code SendMessage/Agent Teams，DeepWiki）——独有收窄为服务端读集追踪且未直读。② Prime RLM 为 Python-only kernel（DeepWiki），OMP eval py+js 语言面更宽。③ claurst /fork 常见（OpenCode、Claude Code、OMP 均有）。④ execpolicy = 权限控制的策略即代码形态，方向常见。⑤ Reasonix prefix-cache 为 README 营销措辞，移除。⑥ claurst teamcreate 为全家通用并行扇出。⑦ Codewhale hooks 生命周期事件常见（OpenCode/Claude Code/OMP 均有 17-20+ 事件面）。
- 净值：9 个新候选经两轮标注后仅剩 DeepCode（repeat_guard 软提醒 + PreCompact hook 时机）与 Reasonix sessiontemp 两项「同轴不同机制/可能独有」，全部 `[single-source]`。

## [2026-09-05] ingest | OMP enabledModels glob 陷阱：带斜杠的 model id 需要双星
- Disposition: New
- Raw: raw/omp-discovery/2026-09-05-enabledmodels-glob-slash.md
- Updated: OMP 能力 provider 隔离边界（交叉引用新增；正文未改）

## [2026-09-05] ingest | 六 AI Coding Agent 对比：四源能力调查
- Disposition: Update; Disputed
- Raw: raw/ai-coding-agents/2026-09-05-four-lane-capability-survey.md
- Updated: 六 AI Coding Agent 对比（新增「四源能力调查(2026-09-05)」节；openinterpreter 移出低优先并加 Status: Outdated）
- 要点：① DeepCode 降级——9 个模块文件头自证 borrowed from dsh（repeat_guard/pruner/structured_result/external_backend 等，grep.app 直证）。② openinterpreter 升级——`codex-rs` harness 仿真层源码直证（Harness enum + request.rs「chat-completions harness emulation」）。③ jcode 新轴 agentgrep + ONNX 嵌入记忆（DeepWiki，`[single-source]`）。④ Prime 官方博客确认 built on top of pi。⑤ OMO 主仓库已演进为 oh-my-openagent。⑥ Grok SWE-bench 70.8% @ $0.20/M（第三方口径）。

## [2026-09-05] ingest | MotoMoto relay wire contract 与 SDK 解析差异
- Disposition: New; Update
- Raw: raw/model-gateway-mismatch/2026-09-05-motomoto-endpoint-topology-and-client-tolerance.md; raw/model-gateway-mismatch/2026-09-05-responses-frame-sequence-and-sdk-parts.md; raw/model-gateway-mismatch/2026-09-05-opencode-provider-npm-spec.md
- Updated: Relay 的 chunked 流不终止：诊断与最小修复；SDK 对非标准 responses 帧的解析严格度差异；模型 capability 与 gateway wire 参数不一致
- Experiment: experiments/2026-09-05-unterminated-chunked-stream-client-behavior.md
- 要点：严格等待 stream `done` 的 Bun、Node 与 Python 客户端均因缺失 chunked 终止块等待约 60 秒；串行受控实验证明此前的 headers 延迟来自并发排队测量；本地 shim 按协议终止标记主动收尾；AI SDK 与 pi-ai 对同一非标准 responses 帧的 finish 状态不同；`gpt-5.6-sol` 的 capability 声明与本次 reasoning 输出观测分离。

## [2026-09-05] lint | 2 issues found, 2 auto-fixed
- `enabledmodels-glob-slash-pitfall.md`：元数据（Sources/Raw）位于正文末尾导致校验器判定「无 Raw 字段」并连带把 `raw/omp-discovery/2026-09-05-enabledmodels-glob-slash.md` 判为 unreferenced；已移至标题下方标准位置并补 `Updated` 字段，原文逐字保留。
- `tan-command.md`：`:9` 与 `:41` 把共享 cache key 的效果写成「直接命中/白捡全量前缀命中」，与本文引用的 OpenAI 原话及 [前缀匹配与 cache key 的真实分工](prompt-caching/cache-key-and-prefix-matching.md) `:23-29` 矛盾（官方明确 "they do not pin requests to a machine or guarantee a cache read hit"）；改为概率表述并补引该句，Updated 与 index 同步至 2026-09-05。

## [2026-09-05] ingest | 六 AI Coding Agent 对比：被质疑断言的反向核查
- Disposition: Update; Disputed
- Raw: raw/ai-coding-agents/2026-09-05-challenged-claims-verification.md
- Updated: 六 AI Coding Agent 对比（新增「被质疑断言的反向核查(2026-09-05)」节；Reasonix/jcode/OpenClaude 三处加 Status: Outdated；结论段加「本轮新降级」行）
- 四项降级：① Reasonix `sessiontemp` 的「可能独有」被多个反例推翻；但本轮反向核查报告混用了 Claude Code,而已有八家名单写的是 OpenClaude,所以不再写「8 家里 6 家」或声称完成对已有八家的封闭计数。报告实际列出 OMP、Grok、claurst、Claude Code、DSH、goose 六个等价物；OpenClaude 自身是否有同类机制未核查。② jcode `agentgrep` 降为同轴不同实现（aider repo map、goose `analyze`、OMP `read` 结构摘要+codegraph、crush `lsp_references` 达同一目标）。③ jcode ONNX 嵌入记忆降为功能等价——本机 OMP 源码直证 mnemopi 有 fastembed 本地路径。④ OpenClaude「唯一公开的原版 harness 衍生」不成立（openinterpreter `Harness::ClaudeCode` 与 claurst clean-room 重写构成反例）。
- 修正 scout 结论一处：JcodeThree 称 OMP Mnemopi「默认」本地 ONNX，本机源码只能证明本地路径存在；本机实际配置走 `embeddingApiUrl` API 嵌入，故 wiki 不写「默认」。
- 修正此前过宽表述：OpenCode 事件 replay 由「都等价」改为「部分同轴」，四家机制形态列表区分；补隐私边界（v2 默认纯本地；v1 `/share` 上传至 `opncd.ai`，默认 manual、可关）。
- 净结论：真独有 2 项（OMP TTSR、DSH Cordis）；可能独有由 2 减至 1（openinterpreter 多 harness 运行时切换）；未知 1 项（jcode swarm 服务端读集追踪）。

## [2026-09-05] ingest | AI Coding Agent 对比：Claude Code 与 Codex CLI 入列
- Disposition: Update; Disputed
- Raw: raw/ai-coding-agents/2026-09-05-claude-code-and-codex-enrollment.md; raw/ai-coding-agents/2026-09-05-hook-event-set-symmetry-correction.md
- Updated: AI Coding Agent 对比：真正独特优势（19 家）（H1 与 index 行改名，17→19 家；研究对象表加 Claude Code、Codex CLI 两行；新增「Claude Code 与 Codex CLI 入列(2026-09-05)」节；净结论由真独有 2 改为 4）
- 方法差异：两个 agent 都装在本机（Claude Code `2.1.261`、Codex CLI `0.153.4`），A 侧证据改为直读二进制字符串 + 活体执行，不再依赖 grep.app/DeepWiki 转述。三个只读 scout 共给出 19 条 `真独有`（Claude Code 11、Codex 8），主会话按本仓门槛复核后只留 3 条。
- 新增真独有 2 项：① Codex execpolicy `.rules` —— Starlark 风格 `prefix_rule` DSL，主会话用临时规则文件活体实测 `codex execpolicy check`，`git status`→allow、`git push --force`→无匹配、`rm -rf /`→forbidden；二进制内另见 `proposed_execpolicy_amendment` 与网络规则持久化，即模型可提议规则修正。收窄边界：「审批固化为规则」与 Claude `alwaysAllowRules` 同轴，独有的是策略语言 + 内联单测 + 模型提议修正。② Codex hash 化 hook trust —— 官方文档 + 二进制 `HookTrustStatus`/`SetHookTrusted`，反向核查在 Claude Code 206MB 二进制内扫 `hooktrust`/`trusthook` 命中 0。
- 新增可能独有 1 项：Claude Code `--exclude-dynamic-system-prompt-sections`，为**跨用户**前缀缓存命中做工程（Reasonix/Hermes 只做单用户 within/cross-session）。同时把同一 scout 判为真独有的 `--system-prompt-snapshot` 降为同轴不同实现（Reasonix `StaticPromptCache` 在同轴，Claude 只是更完整）。
- 双杀两条：两个 scout 在「云端任务交接」与「守护进程/后台会话」两条轴上各自宣称自家独有、理由都是「对方没有」；本机核实两边都有，双双降为同轴不同实现。残留 `codex queue` 列为可能独有 `[single-source]`。
- 弃用一个数字：scout 写的「Achieves ~82-98% cross-user cache sharing」句子本身在 raw 里（报告原文收录），但 scout 未给来源、无法回溯到任何一手材料，已在文章内以 Status 块标注为未溯源数字、不得引用；同时说明这与「raw 里没有」是两回事。
- 计数口径修正：那份四源调查 raw 是 17 个 worker 分节/运行但只覆盖 16 个不同项目（Grok Build 跑两次），第 17 个项目 DeepCode 由主会话补漏；且用 Claude Code 替掉了 OpenClaude。两套名单并起来 18 个名字，加 Codex 后 19。
- 横向发现：Codex 的 hook 引擎源码里直接叫 `ClaudeHooksEngine`（scout 经 DeepWiki 读 `codex-rs/hooks/src/lib.rs`，`[single-source]`），wire 字段与 Claude Code 完全同名（`hookEventName`/`permissionDecision`/`additionalContext`/`suppressOutput`/`stopReason`/`updatedInput`，主会话在两个二进制里分别扫到），事件名只差 snake_case 与 PascalCase；两家都用 `SKILL.md`+YAML frontmatter。即 OpenAI 实现了 Anthropic 的 hook 线格式（基于同名字段的推断，双方未公开声明兼容意图）。这是「真独有稀少」的机制性解释。
- 同日自我更正：初稿曾写「Codex 事件集比 Claude 多 `post_compact`/`subagent_start`」，该句写下时未做对应扫描，补扫后证伪——Claude Code 二进制里 `PostCompact` 命中 59、`SubagentStart` 命中 24（含 `executePostCompactHooks`、`executeSubagentStartHooks`），只是 PascalCase 命名。反方向「Codex 无 `PermissionDenied` hook」降为「已查材料中未找到」。按 `raw/` 不可变，更正未回改 enrollment 记录，另立 supplement raw；文章内加 Status 块。此更正加强而非削弱收敛结论。
- 全文补做证据分层：execpolicy 与 hook trust 两节明确区分「主会话活体实测」「scout 转述官方文档 `[single-source]`」「二进制字符串推断（未读源码）」三类；`hash 化` 定语因仅有 scout 文档来源而与 `[verified]` 的信任闸门拆分标注。
- 仍是缺口：OpenClaude 的四源调查未做；jcode swarm 服务端读集追踪未直读。

## [2026-09-05] ingest | Codex bypass 开关与 execpolicy 的关系
- Disposition: Update
- Raw: raw/ai-coding-agents/2026-09-05-codex-bypass-switches-and-execpolicy.md
- Updated: AI Coding Agent 对比：真正独特优势（19 家）（execpolicy 节证据分层升级 + 新增「三个 bypass 开关在 CLI 层正交」段）
- 起因：用户问「`codex --yolo` 之后 execpolicy `.rules` 是不是就不起作用了」。本轮能确证的是「关规则有独立开关、没被折叠进 `--yolo`」，即 CLI 层正交；**运行时是否仍拦截未实测**，不能据此给出「一定还生效」的确定答案。
- 行为证明 `--yolo` 是别名：先用对照实验确认 clap 会拒绝未知 flag（`--definitelynotaflag` → `error: unexpected argument`），再用重复参数法——`codex --yolo --dangerously-bypass-approvals-and-sandbox` 报 `cannot be used multiple times`，说明解析成同一 argument id。
- 三个 bypass 开关独立且各有 env var：`--yolo`（审批+沙箱，`DANGEROUSLY_BYPASS_APPROVALS_AND_SANDBOX`）、`--ignore-rules`（规则加载，`IGNORE_RULES`）、`--dangerously-bypass-hook-trust`（hook 信任，`BYPASS_HOOK_TRUST`）；前两个可同时传不冲突。
- 证据升级（scout 单源 → 一手）：三档 decision `Allow`/`Prompt`/`Forbidden` 由二进制枚举串 `PrefixRuleAllowPromptForbiddenPrefixPattern` 直证；`justification` 与 `NetworkRule` 同处一串直证。仍为 `[single-source]`：优先级次序、`match`/`not_match` 内联单测、分层规则。
- 新机制（静态路径证据，非已观测运行行为）：managed requirements 存在拒绝 YOLO 的路径——二进制错误串原文「`approval_policy = "never"` cannot be used because requirements do not allow `sandbox_mode = "danger-full-access"`; Codex would fall back to read-only permissions with approvals」。本轮未实际触发观测。
- 未实测项已标注：`Forbidden`/`Prompt` 在 `AskForApproval::Never` 下的具体归约。安全测法不存在（真跑 `--yolo` 即无沙箱执行真实 turn），且 `ctx_fetch_and_index` 与直接 `read` 对 `developers.openai.com/codex/rules` 两次均超时，未取得官方文档原文。
- 净影响：弱化「有 YOLO 就等于没策略」这个最自然的反驳，在边界内支持 execpolicy 的真独有裁定（关规则至少需要单独开关，且管理侧存在拒绝路径）；运行时 enforcement 仍列为未实测。裁定数量不变（真独有 4、主要可能独有 2）。

## [2026-09-05] ingest | 四 Agent CLI 能力面对比
- Disposition: New
- Raw: raw/ai-coding-agents/2026-09-05-cli-help-recursive-survey.md
- Updated: AI Coding Agent 对比：真正独特优势（19 家）（`codex queue` 与 OpenCode `db` 两处 CLI 侧补证标注）
- 方法：codex/opencode/omo/omp 递归 `--help`，合计 179 个独立页（omo 16、opencode 59、codex 65、omp 39）。两个方法学发现：omo 的 help 正文描述词会诱导假路径（16 条猜的路径全部回落父页，须按 `Commands:` 段递归）；omp 是单层文档（62 个 action 探 `--help` 全部回落父页）。
- 结构结论：codex=可远控可上云的服务（app-server daemon、协议绑定导出、cloud 任务）；opencode=本地 HTTP 服务+可探测本地库（db、13 个 debug 子命令）；omo=OpenCode 插件管理层（非 agent）；omp=工具最多的单机（broker/gateway/ps/bench 等无对应物）。
- 边界：app-server 已证客户端只有 VS Code extension（help 原文）；Zed/Neovim/Cloud 前端为推断已剔除。OpenCode `db` 只证明 CLI 暴露 DB 查询面，SQLite/WAL 机制表述继续引用既有 raw。

## [2026-09-05] ingest | Codex 特性门系统与 Code Mode
- Disposition: New
- Raw: raw/ai-coding-agents/2026-09-05-codex-features-and-code-mode.md
- features：135 项 = 48 true + 87 false（脚本解析；早期手数 126/28/34 作废）。stage 与 effective 两列正交：stable false 有 3 项（multi_agent_v2、recommended_plugins、secret_auth_storage），removed true 有 9 项。
- removed 机制：仅记为待验证假设——`plugin_hooks = true` 在 config 但 effective=false 直接证成「removed 时 config 设置被忽略」；「统一冻结在末次默认值」未证，可能是 feature-specific。
- Code Mode：开关已 enable（另启用 multi_agent_v2、recommended_plugins、secret_auth_storage、apply_patch_preserve_line_endings、apply_patch_streaming_events，均已复跑验证），host 二进制随包装在位（66.2MB，stdio/grpc transport），但端到端未实测：launcher 只解析 codex 本体路径，host 由谁 spawn 未验证；模型 metadata 需 advertise Code Mode support，中转模型大概率没有。
- 字符串摘录入库前做过二次逐字复核：初版有一条引文（execute_handler.rs 拼接串）在二进制中 MISS，已换成精确原文。

## [2026-09-05] ingest | CLI 调查版本号更正（opencode 1.18.29）
- Disposition: Disputed
- Raw: raw/ai-coding-agents/2026-09-05-cli-survey-version-correction.md
- Updated: 四 Agent CLI 能力面对比（Sources 行版本）
- 原 raw `2026-09-05-cli-help-recursive-survey.md` 第 7 行把 opencode 版本误记为 1.2.19。证据：采集时段 17:55–19:45，而 `opencode-ai/package.json`（version 1.18.29）与二进制 mtime 均为 10:59，先于全部采集，故采集时版本即 1.18.29；原 raw 按不可变规则保持原样，更正入 supplement。同时复核 codex-cli 0.153.4、omo v4.19.4、omp 18.1.10。

## [2026-09-05] ingest | Code Mode 字符串规范化说明 + 版本更正证明强度收窄
- Disposition: Update
- Raw: raw/ai-coding-agents/2026-09-05-code-mode-string-normalization.md; raw/ai-coding-agents/2026-09-05-version-correction-proof-strength.md
- Updated: Codex 特性门系统与 Code Mode（Raw block 加规范化说明）；四 Agent CLI 能力面对比（Raw block 加证明强度收窄）
- 规范化说明：raw2 第四节 fenced block 中含 `…` 的长串是规范化显示（二进制原文为带不可打印占位字节的 Rust 格式化串），逐字性只对说明中列出的 literal 短串成立（`codex-code-mode-protocol`、`expects raw JavaScript source text`、`Waits on a yielded`、`yield_time_ms`、`max_output_tokens` 等）。
- 证明强度收窄：版本更正的「可证」收窄为「mtime 强烈支持 + 未发现版本更换证据」。
- 同时按 advisor 收窄三处 wiki 表述：omp `gc` 改为「支持 --blobs/--archive/--wal 维护选项，执行效果未验证」；plugin_hooks 样本改为「config 值未反映到 effective，原因未确定」；codex queue 补证改为「help surface 未发现对应子命令（未发现 ≠ 能力不存在）」。
- 过程记录：correction raw 被 article A 引用后曾被直接编辑过一次，已回滚并改走本 supplement，raw 不可变规则恢复闭合。

## [2026-09-05] correction | 收窄同日两条 ingest 日志的表述
- 对「Codex 特性门系统与 Code Mode」条目：「直接证成 removed 时 config 设置被忽略」收窄为「plugin_hooks 样本显示 config 值未反映到 effective，原因未确定」；「已换成精确原文」收窄为「已换成二次复核后的字符串；含占位字节的长串为规范化显示，逐字 literal 仅限 `2026-09-05-code-mode-string-normalization.md` 列出的短串」。
- 同时修正 `codex-feature-flags.md` 的时态矛盾：135 项分布拆为 enable 前基线（stable true 39 / stable false 3 / under-dev false 52）与 enable 后复跑（stable true 42 / under-dev true 3 / under-dev false 49，脚本计数）。

## [2026-09-05] ingest | Gateway catalog 是客户端配置的权威源
- Disposition: New; Update
- Raw: raw/model-gateway-mismatch/2026-09-05-copilot-gateway-catalog-fields.md; raw/model-gateway-mismatch/2026-09-05-anthropic-relay-catalog-and-ua.md
- Updated: JustWoker `/v1/messages` 实测行为（新增目录无能力字段与 UA 门槛两节，Sources/Raw/Updated 同步）；模型 capability 声明与 gateway wire 参数不一致（See Also 交叉引用）
- 本机 Copilot 网关 `/v1/models` 的三组字段各有用途：`claude_model_id`（Claude-facing ID，12 条目中 6 条带 `[1m]`）、`billing.token_prices.default.context_max`（计费档边界，实测 272000/224000/200000/128000 四种值）、`capabilities.limits.max_context_window_tokens`（真实窗口）。按窗口 >200000 推后缀会给 6 个模型错加。
- 成本含义：`gpt-5.4` 的 `default` 档 input 250 / output 1500 / cache 25，`long_context` 档 input 500 / output 2250 / cache 50，即 input 与 cache 2 倍、output 1.5 倍。
- 范围限定：上述字段只在本机 Copilot 网关观测到；JustWoker relay 的 `data[0]` 键集合仅 `created_at`/`display_name`/`id`/`type`。UA 与重试是 2026-09-05 新证据，未改 2026-09-01 的 raw，另建当日 raw 摘录。

## [2026-09-05] ingest | Claude Code 上下文窗口与自动压缩控制
- Disposition: New
- Raw: raw/harness-engineering/2026-09-05-claude-code-context-window-docs.md; raw/harness-engineering/2026-09-05-claude-binary-compaction-probe.md
- 官方 model-config 把 `CLAUDE_CODE_MAX_CONTEXT_TOKENS` 的生效条件分成三互斥情形；中转站的 `claude-*` ID 落在情形 3，声明窗口无效且 ACW 被 cap 到内置窗口。
- 二进制证据：默认压缩触发点为窗口减 13000（`ZPe` 中 `let r=e-13000`），`PCT_OVERRIDE` 经 `Math.min(Math.floor(e*(o/100)),r)` 只能提早不能抬高；`CLAUDE_CODE_CONTEXT_LIMIT` 0 命中（同期 MAX_CONTEXT_TOKENS 9 处、PCT_OVERRIDE 6 处）。按窗口查表的 `precomputeBufferFraction` 具体数值未提取。
- `[1m]` 线路行为需两个方向的观测才成立：curl 直发带后缀 502、同 env 下 `claude -p` 正常应答。实验记录另见 experiments/2026-09-05-1m-suffix-wire-behavior.md（verdict: works，未抓包闭环）。

## [2026-09-05] ingest | OMP 内置 slash 命令全表（82 条）
- Disposition: New
- Raw: raw/omp-slash-commands/2026-09-05-registry-enumeration.md; raw/omp-slash-commands/2026-09-05-scout-modes.md; raw/omp-slash-commands/2026-09-05-scout-collaboration.md; raw/omp-slash-commands/2026-09-05-scout-session.md; raw/omp-slash-commands/2026-09-05-scout-lifecycle.md; raw/omp-slash-commands/2026-09-05-scout-marketplace-control.md; raw/omp-slash-commands/2026-09-05-scout-bundled.md; raw/omp-slash-commands/2026-09-05-external-intent.md
- Updated: wiki/omp-slash-commands/builtin-slash-commands.md（新话题 + index）
- 「内置」边界经 advisor 两次纠偏后定稿：core registry（builtin-registry.ts:38-45 六类数组 79 条）+ bundled /green /review（loader.ts:154-171）+ SDK 注入 /autoresearch（sdk.ts:2133）；slashCommandCapability 是文件型自定义命令通道，与内置命令是两层；acp-builtins.ts 只是过滤派发不是命令源。
- 运行时对账用 dist/cli.js bundle 字符串命中替代 TUI 实测（82/82）；CLI 无非交互列命令子命令。
- 版本 skew：Context7/DeepWiki 的若干 description 与本机 v18.1.10 源码不一致（/agents、/branch 等），文章以本机源码为准；24 条命令无任何外部文档。

## [2026-09-05] update | slash 命令文章：十问补遗 + 三处修正
- Disposition: Update
- Raw: raw/omp-slash-commands/2026-09-05-followup-lifecycle.md; raw/omp-slash-commands/2026-09-05-followup-modes.md; raw/omp-slash-commands/2026-09-05-followup-collab.md
- Updated: wiki/omp-slash-commands/builtin-slash-commands.md
- 新增「十问补遗」章节：/restart re-exec 机制、/compact remote 模型配置（compactionModel + remoteCompaction.model，无独立 role）、/handoff 三态产物、/context Autocompact buffer 数值门控、/fast family 与 realized 判定、/cleanse 的 LSP 边界、/security coordinator+reviewer 两层架构、/collab relay 默认 wss://my.omp.sh 可自建、/jobs 三类 job、/review reviewer 构成。
- 修正（advisor 纠偏）：/quit 标注实现细节未确认；/fresh 改为两层 provider session 状态 + Codex/GitLab Duo 常驻 WebSocket 实证；/autoresearch 注入条件 !restrictToolNames；/review 数量改为推荐上限启发式。

## [2026-09-06] ingest | GPT-5.6 Luna 真实规格 + 压缩模型解析机制
- Disposition: New; Update
- Raw: raw/copilot-gateway/2026-09-06-8787-v1-models-luna.md; raw/omp-slash-commands/2026-09-06-compaction-model-resolution.md
- Updated: wiki/omp-slash-commands/builtin-slash-commands.md
- 新文章 wiki/copilot-gateway/gpt-5.6-luna-specs.md（新话题 copilot-gateway）：8787 /v1/models 实测 luna 窗口 1,050,000（922K prompt + 128K output）、o200k_base、仅 /responses 端点、一个物理窗口两个计费档；纠正 models.yml 旧值 272000/16000。
- 十问补遗 #2 扩写：OMP 无全局压缩模型字段，resolveCompactionConfiguredTarget 只读 currentModel.compactionModel，modelOverrides 仅精确 id 匹配；#3 收紧为手动 handoff 两态、落盘需 autoTriggered+handoffSaveToDisk。

## [2026-09-06] ingest | awesome-mcp-servers 通用 MCP 筛选
- Disposition: New
- Raw: raw/awesome-mcp-servers/session-data-excerpts.md（会话结果派生摘要；原始大快照因体积未入库）
- Updated: 无级联更新

## [2026-09-06] ingest | GitHub 刷星检测工具调研
- Disposition: New
- Raw: raw/github-star-fraud-detection/heathdutton-StarScout.md
- Updated: 无级联更新

## [2026-09-06] ingest | OMP Mnemopi Auto-Recall 注入机制
- Disposition: New
- Raw: raw/omp-mnemopi/2026-09-06-mnemopi-auto-recall-injection.md; raw/omp-mnemopi/2026-09-06-mnemopi-auto-recall-corrections.md
- Updated: 无级联更新

## [2026-09-06] update | mcp_excalidraw：给 Agent 一块活画布
- Disposition: Update
- Raw: raw/agent-interaction/2026-09-06-mcp-excalidraw-local-setup.md
- Updated: mcp_excalidraw：给 Agent 一块活画布
- 新增：Bun 全局安装、OMP MCP 配置、26 工具 8 类完整分类、浏览器依赖 4 项、字体枚举与默认设置、Sync 机制、遥测代码审计、单 canvas 限制与变通

## [2026-09-08] ingest | Kimi Claw 专用网关
- Disposition: New
- Raw: raw/kimi-claw/2026-09-08-kimi-claw-gateway-probe.md
- Updated: 无级联更新

## [2026-09-09] ingest | OMP 启动提示全表
- Disposition: New
- Raw: raw/omp-tips/2026-09-09-startup-tips-source.md
- Created: OMP 启动提示全表

## [2026-09-09] ingest | OMP Compaction Model 与 Thinking Level
- Disposition: New
- Raw: raw/omp-config/2026-09-09-compaction-model-thinking-level.md
- Created: OMP Compaction Model 与 Thinking Level

## [2026-09-09] ingest | OMP Managed Skills 生命周期
- Disposition: New
- Raw: raw/omp-config/2026-09-09-managed-skills-lifecycle.md
- Created: OMP Managed Skills 生命周期

## [2026-09-09] ingest | OMP Hooks vs Extensions
- Disposition: New
- Raw: raw/omp-extensibility/2026-09-09-hooks-vs-extensions-source.md; raw/omp-extensibility/2026-09-09-extension-hook-relationship.md
- Created: OMP Hooks vs Extensions

## [2026-09-09] ingest | OMP Cleanse：动态诊断修复
- Disposition: New
- Raw: raw/omp-commands/2026-09-09-cleanse-discovery-source.md
- Created: OMP Cleanse：动态诊断修复

## [2026-09-09] ingest | OMP Auth Broker 与 Gateway
- Disposition: New
- Raw: raw/omp-auth/2026-09-09-auth-broker-gateway-source.md
- Created: OMP Auth Broker 与 Gateway

## [2026-09-09] ingest | OMP 工作模式与 Magic Keywords（workflowz 修正）
- Disposition: Update
- Raw: raw/omp-modes/2026-09-09-workflowz-dag-correction.md
- Updated: OMP 工作模式与 Magic Keywords
- 修正：workflowz 由"严格多阶段 DAG"改为"依赖节点按边等待，独立节点仍可并行"

## [2026-09-09] ingest | OMP Extension 与 TTSR 分层防护（Extension/Hook 关系修正）
- Disposition: Update
- Raw: raw/omp-extensibility/2026-09-09-extension-hook-relationship.md
- Updated: OMP Extension 与 TTSR 分层防护
- 修正："Extension 是 Hook 的严格超集"改为"Extension 覆盖 HookAPI 全部用例，但两套 API 不是完全 drop-in"

## [2026-09-09] ingest | Mutation testing、test oracle 与 invariant
- Disposition: New
- Raw: raw/software-testing/2026-09-09-thoughtworks-mutation-testing.md; raw/software-testing/2026-09-09-test-oracle-survey.md; raw/software-testing/2026-09-09-invariant-definition.md; raw/software-testing/2026-09-09-mutation-invariant-violations.md

## [2026-09-10] lint | 66 fidelity suspects 逐项核验，19 项修正，余 47 为 checker 结构性假阳性
- Disposition: Update（既有文章核验）
- 修正（真错误）：
  - visual-canvas-interaction-landscape.md：无 raw 证据的 Stars 列删除；官方 excalidraw-mcp star 数由 5,208 修正为 5207（raw: stargazers_count: 5207），Raw 补链 excalidraw-official-mcp.md
  - justwoker-v1-messages-observed-behavior.md：无 raw 证据的具体倍率数字删除
  - prewalk.md：无 raw 证据的 92%/53%/1.5x 性能数字删除
  - prime-agent-overview.md：无 raw 证据的 "v0.8.1" 删除
  - prime-agent-community-reception.md：无 raw 证据的 "1.4M" 删除
  - prime-agent-technical-reality.md：无 raw 证据的 "Critic Finds..." 标题删除
  - builtin-slash-commands.md：行号与 raw 对齐（1206-1213→1200-1400；agent.ts:104,139→102-115/:148）
  - better-harness.md：正文裸 `Raw:` 前缀改 `证据:`（被 checker 误解析为元数据）
  - 4-agent-comparison.md：Raw 补链 cli-survey-version-correction.md 与 cli-help-recursive-survey.md（正文引用 1.18.29 与 CLI 补证的证据 raw 此前未列入）
- 回滚：prime-agent 三篇曾错误添加无原文证据的 correction raw，已撤回元数据改动并删除 3 个未提交 raw
- 逐项核验的假阳性形态：千分位格式（2,362 vs raw 2362）、DATE_RE 误吃行号前缀（2240-22←2240-2256）、raw 侧数字在 fenced code block 内（60.0/2.94/1478 等）、正文概括语（"hands stay on keyboard"）、inline code 剥离残句、See Also 行、raw 原文逐字在侧（HN 引语）
- 附加修正：4-agent-comparison.md 两处未加粗 `> Status:` 改为 `> **Status:**`（checker STATUS_LINE_RE 只识别加粗形态，属文章格式缺陷非内容假阳性）；CLI 侧补证段残句经核验 raw cli-help-recursive-survey.md:1395-1409 有完整 `opencode db` help 输出，有证据，系 INLINE_CODE_RE 剥离后字面匹配失败
- Result: 66 → 47（0 evidence errors；47 项全部经逐项核验为 checker 结构性假阳性：千分位/DATE_RE 误吃行号/fenced code 内数字/inline code 剥离残句/正文概括语/See Also 行/raw 原文逐字在侧）

## [2026-09-11] ingest | Coding Agent 的短反馈闭环：逐轮 Advisor
- Disposition: New
- Raw: raw/ai-coding-agents/2026-09-10-pi-advisor.md; raw/ai-coding-agents/2026-09-10-pi-omplike-advisor.md; raw/ai-coding-agents/2026-09-10-dsh-advisor.md; raw/omp-slash-commands/2026-09-05-scout-collaboration.md; raw/ai-coding-agents/2026-09-05-cli-help-recursive-survey.md
- Created: Coding Agent 的短反馈闭环：逐轮 Advisor

## [2026-09-11] ingest | OMP 配置语义手册；OMP 实验性上下文管理与 OpenCode DCP 对比；OMP 运行时控制
- Disposition: New
- Raw: raw/omp-config/2026-09-11-config-semantics.md; raw/omp-config/2026-09-11-experimental-context-management.md; raw/omp-config/2026-09-11-runtime-controls.md; raw/omp-config/2026-09-11-opencode-dcp-config.md; raw/omp-config/2026-09-11-opencode-dcp-project.md
- Created: OMP 配置语义手册；OMP 实验性上下文管理与 OpenCode DCP 对比；OMP 运行时控制

## [2026-09-11] ingest | no material: raw/awesome-mcp-servers/compare-vs-local-stack.md
- Disposition: No material
## [2026-09-12] update | OMP 实验性上下文管理与 OpenCode DCP 对比
- Disposition: Update
- Raw: raw/omp-config/2026-09-12-experimental-context-deep-dive.md
- Updated: OMP 配置语义手册（修正 experimentalContextManagement 状态为 true，补充三重门与自动/显式路径分流）

## [2026-09-12] ingest | OMP 配置语义手册：通知、空闲回顾、停顿恢复与表情反应
- Disposition: Update
- Raw: raw/omp-config/2026-09-12-notifications-recap-stop-reactions.md
- Updated: OMP 配置语义手册（新增通知与空闲回顾、停顿恢复与表情反应两个分组，共 9 项设置）

## [2026-09-12] lint | 0 issues found, 0 auto-fixed
- 范围限定检查 `wiki/omp-config/config-semantics.md`：0 fidelity suspect, 0 evidence error, 0 unreferenced raw
- 全量检查 46 fidelity suspects 均来自其他既有文章，本次新增内容无真实 suspect

## [2026-09-14] ingest | OMP TTSR 与 /omfg：流式行为护栏
- Disposition: Update
- Raw: raw/omp-ttsr/2026-09-14-ttsr-deferred-injection-race.md
- Updated: OMP TTSR 与 /omfg（配置节当前配置快照改 once；已知问题节新增 deferred 注入竞态 #12057 与孪生问题 #10204；重复注入实验节加正常/异常对照）

## [2026-09-14] ingest | OMP 配置语义手册
- Disposition: Update
- Raw: raw/omp-config/2026-09-14-streaming-edit-abort-retry-semantics.md
- Updated: OMP 配置语义手册（Sources 版本补 v18.1.21；streamingAbort 值改 false 并新增「中断之后发生什么」运行时小节；两个 read 开关补 provider 上送边界）

## [2026-09-14] ingest | OMP 动态 Session Identity 与 Sticky Routing
- Disposition: New
- Raw: raw/omp-config/2026-09-14-omp-dynamic-session-identity-sticky-routing.md
- Updated: Prompt Cache：前缀匹配与 cache key 的真实分工（See Also 加反向链接）

## [2026-09-14] ingest | OMP Advisor 防过时三旋钮
- Disposition: New
- Raw: raw/omp-config/2026-09-14-omp-advisor-freshness-knobs.md

## [2026-09-16] ingest | 专有代理客户端迁移到标准 Clash：通用取证方法
- Disposition: New
- Raw: raw/proxy-ops/2026-09-16-proprietary-client-to-clash-subscription.md

## [2026-09-16] ingest | 代理出口 IP 指纹批量测量与形态分类
- Disposition: New
- Raw: raw/proxy-ops/2026-09-16-exit-ip-fingerprint-measurement.md

## [2026-09-17] ingest | Herdr + Plannotator 工具链调研
- Disposition: New
- Raw: raw/herdr-plannotator/2026-09-17-herdr-plannotator-investigation.md

## [2026-09-19] ingest | OMP web search 自定义 Responses API 端点接入
- Disposition: New
- Raw: raw/omp-tips/2026-09-19-codex-provider-responses-api-mechanism.md

## [2026-09-19] ingest | OMP web search provider 清单与 fallback 机制
- Disposition: New
- Raw: raw/omp-tips/2026-09-19-web-search-provider-inventory.md

## [2026-09-19] ingest | OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界
- Disposition: New
- Raw: raw/omp/2026-09-19-judgment-provider-values.md; raw/omp/2026-09-19-judgment-typesafe-history.md; raw/omp/2026-09-19-llm-judgment-callflows.md; raw/omp/2026-09-19-judge-smoke-test.md
- Created: OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界

## [2026-09-19] ingest | Jev 在 OMP、Codex、OpenCode 的现成集成盘点
- Disposition: New
- Raw: raw/ai-coding-agents/2026-09-19-jev-ready-made-integrations.md; raw/ai-coding-agents/2026-09-19-jev-three-host-sidecar-integration.md; raw/ai-coding-agents/2026-09-19-jev-official-skill-host-support.md
- Created: Jev 在 OMP、Codex、OpenCode 的现成集成盘点

## [2026-09-19] ingest | OMP Advisor Concern 投递策略
- Disposition: New
- Raw: raw/omp-config/2026-09-19-omp-advisor-concern-delivery-policy.md
- Created: OMP Advisor Concern 投递策略

## [2026-09-19] ingest | OMP Advisor 防过时三旋钮
- Disposition: Update
- Raw: raw/omp-config/2026-09-19-advisor-runtime-18-2-6.md
- Updated: OMP Advisor 防过时三旋钮

## [2026-09-19] ingest | Responses API web_search usage 计量
- Disposition: New
- Raw: raw/responses-api/2026-09-19-web-search-usage-probe.md

## [2026-09-19] ingest | LLM API SSE 流式调用：Clash Verge/mihomo + 机场链路的机制、影响与配置
- Disposition: New
- Raw: raw/llm-proxy-sse/2026-09-19-llm-api-sse-streaming-clash-mihomo-study.md; raw/llm-proxy-sse/2026-09-19-clash-verge-mihomo-local-config-forensics.md; raw/llm-proxy-sse/2026-09-19-mihomo-keep-alive-key-name-verification.md
- Created: LLM API SSE 流式调用：Clash Verge/mihomo + 机场链路的机制、影响与配置
- 要点：keep-alive-idle 调长更不安全（15 略优于 30，已纠正，raw 初稿 30 推荐作废）；「拨号时刻重选节点」一手源码、「出口 IP 漂移」推论、「NAT 空闲超时分钟级」未验证；tcp-keep-alive-*/dial-timeout 不存在为一手源码+二进制双证；WSL2+TUN Bun 证书误报标本机记录。

## [2026-09-19] ingest | Reverify：确定性验证的适用边界与 rollover 实际价值
- Disposition: New
- Raw: raw/agent-tooling/2026-09-19-reverify-project-audit.md
- Created: Reverify：确定性验证的适用边界与 rollover 实际价值
- Updated: Harness 格式与上下文载体; Mutation testing、test oracle 与 invariant（index Updated 同步 2026-09-19，正文由 cascade worker 更新）
- 要点：验证回路只接受二进制 bytes（verifier.py:1255），非 RE 核对面仅 functions_equiv 窄契约（int argv→int stdout，需可信参考实现）；rollover 的 hand-off validation 只查形状（mtime/24KB/非空/≥3 个 ##，rollover_harness.py:560-578），失败 action="allow"（:805），receipt 仅 launcher/inline/successor 三条消费路径，plain claude/codex 无人消费（CHANGELOG 实测一例 909k tokens）；issue #22 空断言 VERIFIED 公开绕过、修复 PR #21 未合入；benchmark 数字（275 样本/2,007 known-false 0 false VERIFIED）未独立复现；审计未运行 reverify。

## [2026-09-19] correction | Reverify evidence wording
- 纠正：『README claim kind 全是 binary/RE、源码差分在 claim loop 外』不准确——Verifier 由 `data: bytes` 初始化（verifier.py:190-191），但 `Verifier.SUPPORTED` 同时含二进制断言、`exebench` 与 `functions_equiv`（verifier.py:165-188），核查器 `_check_exebench`/`_check_functions_equiv`（verifier.py:643-707）；源码差分既可作为 claim 进入回路，也可走 CLI `reverify equiv` / exebench adapter，契约仍窄。
- 纠正：『默认 32 case』错误——`gen_inputs(nargs, 32)` 的 32 是 bits（32-bit 输入域）；boundary 10 组 + 固定种子伪随机 24 个 = 34 组，max_inputs=40 不截断（behavior.py:184-199；exebench.py:241,271-272）。
- 纠正：『plain claude/codex 无人消费』『gemini/opencode 可直接换会话』过度概括——未消费仅限未使用 launcher/inline/successor 的 plain session；gemini `clearContext` 只证明当前上下文重置；codex 等价 successor 未验证。
- Updated: wiki/agent-tooling/reverify.md; wiki/index.md; raw/agent-tooling/2026-09-19-reverify-project-audit.md（未 commit，就地修正）

## [2026-09-19] ingest | SoL-Pi 与 OMP 兼容性
- Disposition: New
- Raw: raw/agent-harness/2026-09-19-sol-pi-forensics.md
- Created: SoL-Pi 与 OMP 兼容性：机制核查与装得上但开不了

## [2026-09-19] ingest | OMP 扩展自动加载机制
- Disposition: New
- Raw: raw/omp-tips/2026-09-19-extension-auto-loading-canary.md
- Created: OMP 扩展自动加载机制

## [2026-09-19] ingest | Jev 渠道定价核验与 OMP systemone 兼容性实测
- Disposition: New; Update
- Raw: raw/omp/2026-09-19-typesafe-env-chain-and-zen-setup.md; raw/ai-coding-agents/2026-09-19-jev-channel-pricing-verification.md; raw/ai-coding-agents/2026-09-19-jev-omp-compatibility-probes.md
- Created: OMP TypeSafe env 变量边界、.env 加载链与 zen 免费 jev 接入; Jev 七渠道定价与 OMP systemone 兼容性判定
- Updated: OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界; Jev 在 OMP、Codex、OpenCode 的现成集成盘点
- 要点：key 四途径（env/CLI/models.yml apiKey//login）与 BASE_URL、DEFAULT_MODEL env-only 为本机 18.2.6 源码直读；zen 免费额度 UTC 午夜重置为推断（Retry-After 26654/26251 对齐）；429 只打 systemone 端点不打 models 端点为实测；匿名 200/假 key 401/真 key 429/其它免费模型 503 四组对照齐全；「OpenRouter 免费 allowance」≠「免费 jev」为当轮更正；七渠道中已实测可用仅 OpenCode Zen 一家。

## [2026-09-20] ingest | Judgment systemone protocol：活体实测证据、题型 schema 与 zen 重置推断修正
- Disposition: New; Update
- Raw: raw/omp/2026-09-20-judgment-systemone-live-evidence.md; raw/ai-coding-agents/2026-09-20-jev-question-types-schema.md
- Created: OMP judgment /v1/systemone 协议面：题型 schema、传输参数、观测点与兼容端点
- Updated: Jev 七渠道定价与 OMP systemone 兼容性判定（zen 429 节加 Status: Outdated；结论 1 撤回「等 UTC 午夜额度重置」；Raw 行追加新 raw；See Also 加协议面文章）; OMP TypeSafe env 变量边界、.env 加载链与 zen 免费 jev 接入（证据边界加 Status: Outdated 撤回 UTC 午夜重置推断；DEFAULT_MODEL 行追加 2026-09-20 已切 jev-1.13 付费通道的更新注记；Raw/Sources/Updated 同步）

## [2026-09-20] ingest | Advisor 上下文标记 + Watchdog 审查设计 + 共享错误框架
- Disposition: New; Update
- Raw: raw/omp-config/2026-09-20-advisor-context-markers.md; raw/harness-engineering/2026-09-20-watchdog-review-design.md
- Created: OMP Advisor 上下文标记；Watchdog 审查设计
- Updated: Reviewer Blind Spots（新增「共享错误框架」小节，引用 2026-09-20 新 raw；旧 raw 保持冻结）
- 要点：Advisor 会话更新嵌入 `**user**:`/`**agent**:` 角色标记、状态头、工具结果截断与 shaken 压缩边界；Watchdog 审查设计强调三桶审查框架与证据链，分离可观测数据与推断；共享错误框架将反复出现的 advisor 错误归类为可复用分类法。
- Next: 无

## [2026-09-20] ingest | Jev eval 语义回归检查
- Disposition: New; Update
- Raw: raw/omp/2026-09-20-eval-judge-jev-semantic-testing.md
- Created: Jev 语义回归检查方法
- Updated: OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界; OMP judgment /v1/systemone 协议面：题型 schema、传输参数、观测点与兼容端点
- 要点：JavaScript/Python eval 三题型实测；本组请求经服务端日志确认由 Jev 处理；相同输入重复调用分类稳定但小数轻微变化；宽松 rubric 接受自我声明并产生 0.97 假阳性；语义检查需要原子 question、可引用 criteria、同 rubric 前后比较，并保存完整 state/questions/output。

## [2026-09-21] ingest | Mnemopi 数据模型、SQLite 恢复、jevify 与 Zen typesafe 限制
- Disposition: New; Update
- Raw: raw/omp-mnemopi/2026-09-21-mnemopi-data-model.md; raw/omp-mnemopi/2026-09-21-mnemopi-sqlite-recovery.md; raw/omp-modes/2026-09-21-magic-keywords-jevify.md; raw/ai-coding-agents/2026-09-21-zen-jevify-typesafe.md
- Created: Mnemopi 数据模型与 Recall/Reflect; Mnemopi SQLite 损坏恢复
- Updated: OMP 工作模式与 Magic Keywords（加入 jevify，修正"只有三个"断言）; OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界（加入 jevify 与 judge() 路由分离）; OMP TypeSafe env 变量边界（加入 18.2.7 models.yml api: typesafe 拒绝与 c96eb8fef5 版本边界）; Jev 七渠道定价与 OMP systemone 兼容性判定（加入 Zen 模型目录实测）; OMP Mnemopi Auto-Recall 注入机制（加入 data-model-and-retrieval 链接）; OMP Mnemopi Consolidation 生命周期（加入启动期 promotion 段落）
- 要点：recall 直接读取 working_memory、episodic_memory、facts 及 fts/memory_embeddings 辅助表；reflect 复用同一 recall 路径；memoria_facts 属于事实提取和版本追踪的内部数据表；jevify 是第四个 magic keyword，追加隐藏提示引导 judge() 工作流；22 文件分类实测 judge model 为 kimi-claw/k2d8-preview；Zen 目录可见 jev-1.13-free 和 jev-1.13，jev-latest 探针返回 unavailable；18.2.7 models.yml 拒绝 api: typesafe，上游 c96eb8fef5 加入 schema；Mnemopi 恢复 54/54 缺失记录逐条点查均报 corrupt，placeholder 已全部删除，.recover 待验证。

## [2026-09-22] ingest | judge 角色链解析与 jev-latest 400 根因
- Disposition: New; Update
- Raw: raw/omp/2026-09-22-jev-latest-400-root-cause.md
- Created: OMP judge 角色链解析与 jev-latest 400 根因
- Updated: OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界（加 18.2.8 路由层一节）; OMP TypeSafe env 变量边界（18.2.8 解除 api: typesafe 版本限制）; OMP judgment /v1/systemone 协议面（eval 不留 usage 标 Status: Outdated 限 18.2.6）; OMP 配置语义手册（stopReason 归一化、abandoned tool-use、empty-stop 守卫）
- 要点：缺 retry.fallbackChains.judge 时改用 priority.json 默认链，链首内置 typesafe/jev-latest 被 TYPESAFE_BASE_URL 劫持指向 zen → 400；显式链整体替换默认链，一处修复覆盖 auto judge 与 eval judge；ChainJudge timeout/abort 直接抛、不会继续 fallback；18.2.8 eval judge() 记 usage（18.2.6 不记），unexpected-stop 两次成功 nudge 无 usage 新增原因未知；empty completion 重试有测试实证（test 213-227），不打 judge。

## [2026-09-24] ingest | agc bank 第二次 SQLite 损坏与在线修复
- Disposition: Update
- Raw: raw/omp-mnemopi/2026-09-24-agc-bank-second-corruption.md
- Updated: Mnemopi SQLite 损坏恢复
- 要点：agc-djmfd5jv3zsd 三天内第二次物理损坏（该 bank 41 MB 为最大）；后端 inert 全程在线修复未退出 OMP；顾问拦截纠正 working_memory 误判——索引同坏时 COUNT(*)=343 系虚计数，穷举点查 1..200000 实救 342 行（rowid 连续 1..342），损失为 0 或至多 1 物理不可读行；gists -1、memory_embeddings -2、graph_edges 存活数不可定（派生表）；修复后 10 bank + default 全部 integrity ok。

## [2026-09-25] ingest | SoL-Pi 与 OMP 兼容性：当前状态复查
- Disposition: Update
- Raw: raw/agent-harness/2026-09-25-sol-pi-current-state.md
- Updated: SoL-Pi 与 OMP 兼容性
- 要点：SoL-Pi 仓库 HEAD `1559b5c` 与远端一致；OMP #11991 仍 open 且未合入 v18.3.0；OMP 原生 edit/write 仍无后续命令参数；ObservationPack 与 Headroom 代理最接近，但单独 MCP 压缩不会自动移除旧工具结果；Reducer 只处理符合条件的 bash 与融合 edit/write 诊断输出；Online Context Compact 与 DCP 都以减少旧上下文为目标，但触发路径不同。旧“OMP 18.2.6 actionFusion 必崩”结论标为 Status: Outdated。

## [2026-09-25] ingest | GPT-6 Luna 与 Sol 三宿主接入记录
- Disposition: New
- Raw: raw/copilot-gateway/2026-09-25-gpt6-three-host-config.md
- Created: GPT-6 Luna 与 Sol 三宿主接入记录
- 要点：8787 与 4140 `/v1/models` 返回一致；`gpt-6-luna` 与 `gpt-6-sol` 均为 Responses-only；Codex/OpenCode/OMP 数值已写入并通过解析校验；`/v1/responses` 冒烟均 200 且返回 `OK`。

## [2026-09-26] ingest | Headroom 0.39 配置、Timeouts 与升级兼容性
- Disposition: New
- Raw: raw/agent-tooling/2026-09-26-headroom-039-config-and-compat.md
- Created: Headroom 0.39：配置行为、Timeouts 与升级兼容性
- 要点：0.38→0.39 对已装五项 extras 无破坏，CLI 参数与 Kompress env var 未改名；0.39 官方新增 langgraph/pytorch-mps/sandbox/vector 四 extras，本地代理链都不需要；Kompress execution timeout 默认 25→3000ms，用户调优值仍更高；Timeouts 共 10 项（含 4 个 anthropic pre-upstream）；记忆检索超时 HEADROOM_ANTHROPIC_PRE_UPSTREAM_MEMORY_CONTEXT_TIMEOUT_SECONDS 被 anthropic/openai/gemini 三 handler 共用，Bedrock InvokeModel 不读；HEADROOM_PROTECT_READS 只保护源码类读取，JSON/CSV/日志仍压缩；Disable CCR 的 JSON row-drop 路径不可还原；唯一建议加 HEADROOM_PROTECT_READS=1；方法论：升级后"缺失"可执行文件先 Read 再判断，本例 headroom-proxy-start 是用户手写编排脚本非包 shim。

## [2026-09-26] ingest | OMP 配置键全量清单与凭据遮蔽边界
- Disposition: New
- Raw: raw/omp-config/2026-09-26-config-key-census-18-3-1.md
- Created: OMP 配置键全量清单与凭据遮蔽边界（18.3.1）
- 要点：18.3.1 共 512 键，128 键 ui.label/ui.description 皆空（只缺其一的为 0）须读消费代码补说明；isCredential 只标记 8 键，auth.broker.url（URL）/modelRoles（record）携带敏感信息却未标记，须在 flag 之外按值形态补遮蔽（已验证挡下 dev.autoqaPush.endpoint/share.serverUrl/images.urls.credentials）；枚举 API orderedSettings + Settings.loadReadOnly + settingValuesEqual，loadReadOnly 不解析环境变量覆盖；指纹含 validate/normalize 源码但看不到消费代码行为，故只有解释索引时小版本升级须全量复查。

## [2026-09-26] update | Headroom 0.39 advisor 429 根因与修复
- Disposition: Update
- Raw: raw/agent-tooling/2026-09-26-headroom-039-config-and-compat.md
- Updated: Headroom 0.39：配置行为、Timeouts 与升级兼容性
- 要点：advisor TUI 显示 quota_exhausted 实为 Headroom 0.39 本地 token 限流；__advisor.default.jsonl:1089,1093 记录 errorStatus:429 "Token rate limited. Retry after 5.4s"；proxy-8787.log:18180-18183 status=429 未转发 4140；openai.py:5784-5791 TokenBucketRateLimiter.check_tokens 本地抛出；check_tokens 为 0.39 新引入（0.38 定义但无调用点，0.39 被 openai/anthropic/gemini 四 handler 调用），默认 TPM 100000；修复 headroom-proxy-start 两处加 --no-rate-limit，/health 验证 rate_limiter.enabled:false；HEADROOM_NO_RATE_LIMIT 环境变量不存在。

## [2026-09-26] ingest | advisor evictStaleResults + 工具结果渲染预算
- Disposition: Update; Disputed
- Raw: raw/omp-config/2026-09-26-advisor-evict-stale-results.md
- Updated: OMP Advisor 上下文标记
- 要点：18.3.2 新增 advisor.evictStaleResults（boolean, default true），每次评审前清理 advisor 自己早轮 read/grep/glob 结果（>=50 token, 最近一轮豁免, margin 切割点计算）；工具结果渲染预算修正：成功/失败均带有界正文（8 KiB/80 行, diff 300 行, 参数摘要 120 字符），旧断言「截断至 ≤120 字符」标 Outdated；advisor 第一手确认成功/失败都带正文；与主会话 shake 区别（定时 vs 压力, 重跑 vs artifact, 无回收地址）。

## [2026-09-26] ingest | judgeBatch await 用法与常见误诊
- Disposition: Update
- Raw: raw/omp-mnemopi/2026-09-26-judgebatch-await-usage.md
- Updated: OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界; Mnemopi 数据模型与 Recall/Reflect
- 要点：judgeBatch 返回 thenable, await 后拿 JudgmentBatch（drain/drainIter/results/failed/status）; attach(id) 同理需 await; 未 await 的 Promise 上探方法只见 then/catch/finally, 据此断言「接口缺失」是误诊; 文档写 judge_batch 但内核只暴露 judgeBatch（命名差异, 行为一致）; memory_edit 对 facts 只读（update/forget/invalidate 全拒, 返回 not_editable）; 54 块双通道验证 dest 53/54 一致。

## [2026-09-26] ingest | WATCHDOG.md 重构与 jevify 盘点
- Disposition: Update
- Raw: raw/harness-engineering/2026-09-26-watchdog-md-restructure.md
- Updated: watchdog-review-design; Jev 语义回归检查方法
- 要点：五处改动（证据节重写/高危唯一化/发送条件九条有序列表/提醒写法拆 2+2/项目特定占位换可见说明）; jevify 54 块盘点（32 flagged, 推翻 8, 拆分 2, 逮漏网 1「用户直接呼叫」）; advisor 连抓两次「非高危 blocker 无发送路径」; 十条路径走查全过; watchdog-soft-decision-table skill 删除, 有用内容吸收进 watchdog-structured-control-flow。

## [2026-09-26] ingest | graphifyy 工作机制
- Disposition: New
- Raw: raw/agent-tooling/2026-09-26-graphify-mechanics.md
- 要点：graphifyy 0.9.x 三种调用（CLI/Skill/MCP）；语料类型（code/doc/paper/image/video，video/audio 先转录）；Part A AST（免费）与 Part B Semantic（LLM）提取分支；code-only corpus 定义（只含 code 文件跳过 Part B）；Part B 后端选择（GEMINI_API_KEY 或 subagent，只读 GEMINI/GOOGLE key 不读 ANTHROPIC/OPENAI）；update 手动触发 + `--watch` 后台监听（code 自动重建，docs 写 flag）；`/graphify add` 支持的 URL 类型；edge schema 字段（_origin/confidence/confidence_score/relation）；`graphify install --platform` 支持 claude/codex/opencode/agents/pi（不含 omp，OMP 经 .agents/skills 自动发现）；skills.sh 有条目但 `npx skills add` 因仓库结构非标准失败。本次 agc 运行实测：3,309 节点 / 3,644 边 / 289 社区 / 334 文件；EXTRACTED 3611 / INFERRED 33 / AMBIGUOUS 0。

## [2026-09-27] ingest | Headroom 0.39 配置与兼容性
- Disposition: Update
- Raw: raw/agent-tooling/2026-09-27-headroom-read-command-whitelist.md
- Updated: Headroom 0.39 配置与兼容性
- 要点：HEADROOM_PROTECT_READS 命令白名单（7 动词 + sed-n，共 8 种命令形式）、五种 harness wire shape 命令提取、11 种 wrapper 剥离、18 种 lockfile 排除、内容闸门放行类型（JSON/CSV/日志/diff/HTML/搜索）、OMP bash 守卫实测（拦 less/more，放行 cat/head/tail/nl/sed-n）、复合命令拦截、kimi-claw 不经过 8787 的路由确认、两层守卫条件交集表述。

## [2026-09-27] ingest | OMO 5.0：独立版（omo-ai）与插件版（oh-my-openagent）
- Disposition: New
- Raw: raw/oh-my-openagent-omo/2026-09-27-omo-5.0-native-vs-plugin.md; raw/oh-my-openagent-omo/2026-09-27-omo-cli-command-surface.md
- Updated: 四 Agent CLI 能力面对比（codex / opencode / omo / omp）
- 要点：5.0.0 起 omo 有两条并存产品线——OpenCode 插件版（oh-my-openagent）与自带 senpi 引擎的独立包 omo-ai，`omo` 命令归属换到 omo-ai；omo-ai 不依赖 oh-my-openagent、要求 Node>=24；同版本号出自同一 repository 字段（monorepo 为推断，未读构建配置）；插件版仍可运行但进入 degraded support、部分新功能永不进入插件版；Native 独有 Kibitzer/CodeMode/git-memory/mass-ulw/内置浏览器/共享 daemon；metis/momus 别名取消（静默生效），本机 key 在 [opencode] 块、该作用域是否适用未验证；deep-low 默认换 gpt-5.6-sol-fast；ncu 升级只升插件版不换独立版；omo CLI sentinel 证明退出码不可信须父页去重（9 张不同 help 页）；auth help 显示 pi auth 仅证明展示层非内部调用；首启迁移 migrateLegacySenpiDirs/migrateSessionsFromAgentRoot，现状 .pi 空、.omo 有内容，但 migrations-state.json 无时间戳，触发时序/因果/可逆性未验证；性能数字作者自述未实测。

## [2026-09-26] ingest | Semgrep MCP：工具清单、传输条件与实测边界
- Disposition: New
- Raw: raw/agent-tooling/2026-09-26-semgrep-mcp-inventory.md
- 要点：semgrep 1.178.0 无 extras、mcp==1.29.0 核心依赖；`semgrep mcp` 是主 CLI 子命令（旧 semgrep/mcp 仓库废弃并入）；register() 9 工具经 deregister_tools() 裁剪后本地 stdio 实见 7 个（移除 whoami 与 scan_remote）+ 2 prompt + 2 resource + /health + 8 个 TOOL_DISABLE_ENV_VARS；实测两文档未写前提——semgrep_scan_supply_chain 需常驻 semgrep daemon、semgrep_rule_schema 联网拉取 2s 超时；semgrep_findings 需 SEMGREP_APP_TOKEN 且只查平台不做新扫描；方法论：MCP 空结果需 CLI p/default 交叉验证（一次性扫描结果按 No material 不入库）。

## [2026-09-26] ingest | 三家宿主 MCP 配置、验证阶梯与凭据事故
- Disposition: New
- Raw: raw/harness-engineering/2026-09-26-mcp-setup-validation-and-credential-incident.md
- 要点：Codex config.toml [mcp_servers.semgrep]、OpenCode jsonc local 块、OMP mcp.json stdio 块三家写法；验证阶梯——tomllib/json5/json.load 静态解析、stdio JSON-RPC 探针只连目标、codex mcp list 的 enabled 只反映 config.enabled 不代表连接、opencode mcp list 真实连接但会连接全部启用 server、OMP 无头会话枚举 8 server 含 semgrep 是端到端证据；filterExa 按设计过滤无额外工具请求的 mcp.exa.ai（search-exa ○ not connected 非故障）；凭据事故——完整读取三家配置致 context7/exa/tavily key 泄入会话输出、opencode mcp list 在 advisory blocker 后仍运行两次、建议轮换未授权不动、披露时间线两次修正后如实记录。

## [2026-09-27] ingest | AI Coding Agent 对比：真正独特优势（19 家）
- Disposition: Update
- Raw: raw/oh-my-openagent-omo/2026-09-27-kibitzer-dream-mechanisms.md
- Updated: omo-native-vs-plugin.md
- 要点：omo-ai 5.0.0 安装包直读（persona 原文 + bundle schema 与路由代码切片，无运行时观测）——真独有节新增 OMO Kibitzer（常驻记忆顾问 sidecar：5 只读工具、唯一输出 nudge ≤200 字符禁祈使句、反噪音纪律、reseed 换继任者）与 OMO Dream（用量账本驱动记忆分层 + system/ 层硬预算契约、git 仓库语义、两类证据技能审计）两项 `[single-source]` 候选；模型路由——kibitzer/recall 段 category 默认 quick、reflection/dream 走 chooseMemoryLaunchRoute fork/quick 成本路由；结论与净结论计数更新。

## [2026-09-27] ingest | OMO 5.0：独立版与插件版
- Disposition: Update
- Raw: raw/oh-my-openagent-omo/2026-09-27-kibitzer-dream-mechanisms.md
- 要点：CodeMode 条目改判——与 Codex Code Mode 同轴，两边实现均未直读，机制等价性未验证，不据此判市场级独有；新增「比较范围说明」——本文独有清单是 release notes 声明的产品线比较（独立版 vs 插件版），与 4-agent-comparison.md 的 19 家市场级比较是两个范围，无口径冲突。

## [2026-09-27] ingest | OMO native 模型配置与 senpi adapter 集合
- Disposition: Update
- Raw: raw/oh-my-openagent-omo/2026-09-27-omo-native-model-config.md
- Updated: OMO 5.0：独立版与插件版; SDK 对非标准 responses 帧的解析严格度差异; GPT-6 Luna 与 Sol 三宿主接入记录
- 要点：native 从 ~/.omo/agent/models.json 读 provider（senpi dist ModelConfig.loadSync）；provider-per-API 分别配置（c8787 openai-responses 9 个 + c8787-chat openai-completions 3 个 + umans/justwoker/kimi-claw anthropic-messages），分组与模型上限经 json5+pyyaml 真解析库交叉校验与 OMP、opencode 源一致；senpi 是 Pi fork，api 取值同 pi-ai BUILTIN_API_IDS，内置 OpenAI SDK 不补 /v1 故 baseUrl 需带 /v1；opencode provider 名 4140 只是 provider 标识，baseURL 指向 localhost:8787；migrations-state.json 仅 migrateLegacySenpiDirs/migrateSessionsFromAgentRoot 两项、无 .pi 迁移无模型迁移、无时间戳；~/.omo/omo.jsonc 目标字面值含 ~ 为悬空 symlink，撤回配置耦合结论；凭据经 RAM 脚本读写不进上下文，exa/tavily key 早前明文暴露建议轮换；未验证——models.json 是否唯一生效来源（存在代码级 registerProvider）、未发真请求实测连通。

## [2026-09-27] ingest | no material: 前段 agentic-stack 站点 skim 与种子候选（研究性，摘要级，未逐项核验）
- Disposition: No material

## [2026-09-27] ingest | Plannotator OMP 插件运行机制：slash command 归属、服务链路与 node-pty 编译门
- Disposition: New + Update
- Raw: raw/herdr-plannotator/2026-09-27-plannotator-node-pty-node-gyp-upgrade-failure.md; raw/herdr-plannotator/2026-09-27-plannotator-omp-plugin-slash-command-and-serving.md
- Updated: Herdr + Plannotator 工具链全量 Reference
- 要点：node-pty@1.1.0 发布包无 linux-x64 预编译产物（四平台清单实测），经 @plannotator/webtui@0.1.0 进 pi-extension 依赖树；缺 node-gyp 时 bun install exit 127，共享 node_modules 下所有 OMP 插件升级连坐。修复 = bun add -g node-gyp（13.0.2）+ 重跑 uv-bun --up，pty.node 编译产物验证，node-gyp 决策常驻。插件 registerCommand 四命令（index.ts:663/670/770/1071，0.27.21 实测行号）；/plannotator-last 命令处理链内取会话消息→自建 node:http 服务器（serverAnnotate.ts:711/1202）供打包 HTML，批注经 HTTP POST /api/approve+/api/feedback 回传，不调用 plannotator CLI（浏览器 spawn 属网络辅助层）；~/.claude/skills 同名 skill 是另一入口（bang 命令调 ~/.local/bin/plannotator，145.3 MB，--version 实测 0.27.21；skill 家族安装者未验证）。

## [2026-09-27] ingest | OMP 预测引擎、pi-natives 架构与 Node-API
- Disposition: New
- Raw: raw/omp/2026-09-27-omp-18-3-3-predictive-text-engine.md; raw/omp/2026-09-27-omp-pi-natives-crate-inventory.md; raw/omp/2026-09-27-node-api-napi-rs-overview.md
- 要点：18.3.3 统一输入预测引擎（spelling.autocomplete 枚举 off/auto/ngram/smollm/apple，Linux auto 走 ngram），SmolLM2-135M 按需下载（145MB GGUF Q8_0、sha256、固定 revision），预测 daemon 进程模型（TUI→broker→__omp_worker_text_predict，detached:false，idle 15min 退出，从 history.db 与 Claude/Codex 历史学习）；OMP=TS(Bun) 编排 + pi_natives 原生插件（Rust，THIRD-PARTY-NOTICES cargo-about 证据）执行，12 crate、pi-builtins 103 内建、pi-natives 28 模块、index.js 20 类导出，crate 职责多为按名推断并标注；Node-API 稳定 ABI 逐字定义与边界（限 Node.js、不跨平台），Bun 属 napi-rs best-effort（continue-on-error）非 Node-API 保证，pi-natives 用 @napi-rs/cli 3.7.2、napi_register_module_v1；三份 raw 全部改为已直读页面（nodejs.org/api/n-api.html、napi.rs getting-started、napi.rs support-compatibility）的逐字摘录，删除搜索转述伪引文

## [2026-09-28] ingest | NVIDIA Build 中国短信验证故障
- Disposition: New
- Raw: raw/nvidia-build/2026-09-28-nvidia-build-china-sms-status.md; raw/nvidia-build/2026-09-28-nvidia-build-account-access-support.md
- Updated: NVIDIA Build 中国短信验证故障

## [2026-09-28] ingest | find 工具 cascade 架构
- Disposition: New; Update
- Raw: raw/omp/2026-09-28-find-tool-cascade-source-forensics.md
- 要点：OMP find=jfind 模块，编排类 Cascade（cascade.ts:108），固定四阶段（lexical 粗筛 + 文件名/草图/完整验证三波，docstring cascade.ts:1-14），非按工作类型动态；判分走注入的通用 Judge 接口（judge.judge，cascade.ts:141），题型恒 NoulQuestion，请求 body 无 wave 字段，实际后端 TypeSafe/Jev 或 LLM 回退由 resolveJudge 决定、本会话未验证；lexical 层 native grep 只扫内容计命中、fileScore 排名时加路径命中（2*inPath+log1p，lexical.ts:108）、idf clamp [0.5,6]、带 timeoutMs 且跳 skippedOversized 不保证穷尽；常量 CANDIDATES=128/FILES=20/WINDOWS=24/WINDOW_BYTES=8192/SKETCH_BYTES=384/FULL_LIMIT=40/NAME_BATCH=64/CUTOFF=0.45/THRESHOLD=0.2/PARALLEL=16（cascade.ts:27-58）；Wave1 选读=2 个 lexical 最强无条件读+按 nameScore 补满 20，Wave2 草图 score>=0.45 且最多留 40 段（cascade.ts:285），Wave3 每文件 contentScore>=0.2 上榜、行号来自 passage 自带 start/end（模型只给概率）；上一波分数只挑下一波输入不写进下一请求；协议文章消费方表补 find 为第 5 个 noul 消费方并标 TypeSafe/Jev 路由为条件；find vs grep 适用性为机制推断未做基准
- Updated: OMP judgment /v1/systemone 协议面

## [2026-09-28] ingest | OMP Mnemopi scoping 语义修正与 18.4.2 设置键取证
- Disposition: Update; Disputed
- Raw: raw/omp-mnemopi/2026-09-28-mnemopi-scoping-global-retain-test.md; raw/omp-config/2026-09-28-omp-18-4-2-settings-forensics.md
- 要点：retain/learn 自 v18.3.3 起有 scope:"global" 参数（scoping 为 global/per-project-tagged 才暴露，per-project 下隐藏）；per-project-tagged 默认写 project、可显式写共享 bank（bank 名 default）；recall 合并去重后按 recallLimit 截断；实测两条 global 写入落共享 bank 且 recall 命中回写 recall_count。18.4.2 dump 515 键（18.4.1→18.4.2 新增/删除/指纹变化均 0）；cacheWarming $0.05 地板与 0.15 idle 续用概率门槛；checkpoint.enabled 只门控 agent 工具，不影响双击 Esc 与 /tree；checkpoint 自描述 "git-based" 与 prompt 文档不符。
- Updated: OMP 配置语义手册；OMP 配置键全量清单与凭据遮蔽边界

## [2026-09-29] ingest | OMP Prewalk：xdev 挂载与 False Positive
- Disposition: Update
- Raw: raw/omp-prewalk/2026-09-29-xdev-mounting-prewalk-false-positive.md
- 要点：MCP 工具通过 `write xd://` 调用时 `toolName = "write"` 且 approval 统一 tier `write`（tool-bridge.ts:656），语义只读的工具也触发 prewalk 切换；bash 命中 allow 规则同样返回 tier `write`（bash.ts:583,585）；`tools.xdev: false` 消除 false positive，代价是 schema 进每次 API 请求，prefix cache 影响未实测；特殊设备 resolve/reject/propose/report_issue 不依赖 session.xdev
- Updated: OMP 配置语义手册

## [2026-09-29] ingest | OpenCode V2 迁移：发布、破坏变更与本机兼容性
- Disposition: New
- Raw: raw/opencode/2026-09-29-opencode-v2-migrate-v1-official.md; raw/opencode/2026-09-29-opencode-v2-local-migration-audit.md

## [2026-09-29] ingest | OMP Tavily 原生搜索凭证与 AuthStorage 入库
- Disposition: Update
- Raw: raw/omp-tips/2026-09-29-omp-web-search-tavily-source.md; raw/omp-tips/2026-09-29-tavily-auth-storage-session.md
- 要点：`web/tavily` 不读取 `search-tavily` MCP URL 的 `tavilyApiKey`，而是通过 AuthStorage 读取 provider `tavily` 或 `TAVILY_API_KEY`；`isAvailable()` 仅在 `keys.source("tavily")` 或环境变量有值时报告可用。`omp auth-broker login tavily` 将交互输入保存到本机 `~/.omp/agent/agent.db`；2026-09-29 在本机 OMP `omp/18.4.3` 验证凭据记录存在、启用，且与 MCP URL 中的 key 相同，新进程 `AuthStorage.keys.source("tavily")` 可用。未验证 Tavily 服务端是否接受该 key、当前额度及运行中会话是否自动刷新；首次 stdin 预写出现 `Login cancelled: stdin closed`，内部原因未验证。
- Updated: OMP web search: provider 清单、fallback 与凭证来源

## [2026-09-29] ingest | Herdr 0.9.2 增量：placement/popup、graphics API 删除
- Disposition: Update
- Raw: raw/herdr-plannotator/2026-09-29-herdr-0-9-2-release-notes.md; raw/herdr-plannotator/2026-09-29-herdr-placement-popup-measurement.md
- 要点：0.9.2 私有 pane graphics API 删除（#4561）；agent 自报 resume（#4687）；多 prefix 键（#4653）；`keys.clear_pane`；placement 五值（overlay/popup/split/tab/zoomed）与打开方式；popup = session 单例模态窗（无 pane ID）；CLI `--placement` 枚举缺 popup 而 socket schema 齐全；`[[keys.command]]` 三 type 含 popup。
- Updated: Herdr + Plannotator 工具链全量 Reference

## [2026-09-30] ingest | Grok 网页 Fast 工具调用边界
- Disposition: New
- Raw: raw/grok2api/2026-09-30-grok-web-fast-tool-capability-research.md; raw/grok2api/2026-09-30-grok-chat-fast-tool-loop-probe.md
- 要点：grok2api `grok-chat-fast` 设计用途为纯对话（README 模型表 Conversation/Basic）；工具调用为提示词模拟（injectToolPrompt + `<tool_calls>` XML，三入站协议共用，无原生通道；tool_choice=required 降级为提示文本）；精简上下文实测完成真实两次文件读取的完整工具循环；完整 OMP 上下文 2 次请求中 1 次超时、唯一完整响应为 jailbreak 拒绝，判 NO_GO_FOR_CURRENT_OMP，样本不足以定性机制；残值限于纯文本低危角色（commit/title/smol），不碰工具与 memory。

## [2026-09-30] ingest | Jev 在 OMP/Codex/OpenCode 的现成集成盘点
- Disposition: Update
- Raw: raw/ai-coding-agents/2026-09-30-openai-decisions-api-announcement.md
- 要点：OpenAI 于 DevDay 2026（09-29）宣布 Decisions API（limited preview，基于 Luna，用途分类/路由/行动选择，broad release 预告 coming days）；端点与 schema 未公开（官方索引、changelog、四个官方仓库、两篇溯源第三方均确认）；GitHub 出现 OpenDecisions 自建 /v1/decisions 服务（Jev 生态，形状为该项目自定）；结论：Jev 仍是唯一有可验证公开 API 的决策模型产品。

## [2026-10-01] ingest | OMP Compaction 阈值解析机制
- Disposition: New
- Raw: raw/omp-config/2026-10-01-compaction-threshold-and-shake-mechanics.md
- Updated: OMP Compaction Model 与 Thinking Level（See Also 互链）
- 要点：auto-compact 阈值基数只有 contextWindow（固定值/百分比/reserve 三模式，默认 -1 走 reserve = max(15%, 16384)）；模型 maxTokens 不参与阈值，只做摘要自身输出预算（min(0.8×reserve, 16384)）；thresholdPercent 默认 85 的旧记录已被 -1 取代（源码树 HEAD 73a11421fe，v18.2.11-58）。

## [2026-10-01] ingest | OMP Shake 机制
- Disposition: New
- Raw: raw/omp-config/2026-10-01-compaction-threshold-and-shake-mechanics.md
- Updated: OMP 内置 slash 命令全表（/shake 行互链）
- 要点：shake 无 LLM 裁剪 tool result 与消息内 ≥400 token 围栏/XML 块，散文骨架保留；protectTokens 16000/4000/0 三档（#7776）；useless 结果豁免保护窗；toolCall 不碰；protectTokens 16000 经 git 历史核实与模型输出上限无关（引入提交 417a1a1d32 无取值理由记录）。

## [2026-10-01] ingest | GPT-6 Luna 与 Sol 三宿主接入记录
- Disposition: Update
- Raw: raw/copilot-gateway/2026-10-01-v1-models-live-limits.md
- 要点：8787 /v1/models 响应形态变为 limits 嵌套对象；gpt 系 context_window 1050000/max_output 128000；c8787 下 8 模型配置值与网关不一致；用户决策只按原占比等比提升 maxTokens（16000→62000/58000/55000/24000），contextWindow 一律不动，已落来源并 pull 入库（diff 验证 8 处 maxTokens、0 处 contextWindow）。

## [2026-10-01] ingest | Plannotator pi-extension 混版故障
- Disposition: New; Update
- Raw: raw/herdr-plannotator/2026-10-01-pi-extension-mixed-tree-incident.md; raw/herdr-plannotator/2026-10-01-release-notes-0.27.15-0.27.24.md
- Updated: Herdr + Plannotator 工具链全量 Reference（第 8 节补第二类安装故障）
- 要点：Export named resolveReviewProgress not found + ?mtime= 报错根因为混版 node_modules（npm pack 证实 0.27.22/0.27.23/0.27.24 各自自洽；resolveReviewProgress 由 0.27.23 viewed-progress 功能引入）；?mtime= tag 是加载时刻墙钟（legacy-pi-compat.ts:2099-2104）；用户 uv-bun --up 于 11:37:51 触发、11:42:13-16 0.27.24 写齐修复；混版制造者不可再证实，最可能为 11:29 被中断的裸 bun update --latest（推断）；修复 = 重装 + 重开会话；10 个 release notes 归纳五条线（review 持久化/annotate/图示/宿主兼容/性能）。

## [2026-10-01] ingest | OMP Snapcompact 机制
- Disposition: New
- Raw: raw/omp-config/2026-10-01-snapcompact-mechanics-forensics.md; raw/omp-config/2026-10-01-snapcompact-activeness-adoption.md
- Updated: OMP 内置 slash 命令全表（/compact 行互链）、OMP Compaction Model 与 Thinking Level（See Also）、OMP 配置语义手册（See Also）
- 要点：snapcompact 把被裁历史渲染成 PNG 位图帧归档（无 LLM；帧挂 preserveData.snapcompact 每轮重挂）；帧按面积计费（Gemini 每图固定 1120 token、Anthropic 28px patch、OpenAI 需 detail:"original"），同信息更少 token；帧预算表（未知 provider 兜底 5，无 env/配置键可改）；methodOrder 为有序偏好链 + 运行时兜底；包 2026-06-10 创建、26 版到 18.2.9、活跃打磨期，issue 流 7 月至 9 月连续、默认 methodOrder 第二位结构性采用；我们 methodOrder [shake, soft] 不含它，c8787 显式 compat.supportsImageDetailOriginal: false → OMP 侧即降级 auto（5 帧上限 + 可读性降质双重折扣），启用前先跟踪 #13393/#8792/#12854；本地 clone git log tail/--reverse 存在排序假象，创建时间以 --diff-filter=A 为准。

## [2026-10-01] ingest | jevgrep 取证与三篇级联更新
- Disposition: Update
- Raw: raw/ai-coding-agents/2026-10-01-jevgrep-readme-and-architecture.md
- Updated: OMP find 工具的 cascade 架构（新增与 jevgrep 入口机制对照节）; Jev 在 OMP、Codex、OpenCode 的现成集成盘点（新增 2026-10-01 生态补充节）; Jev 七渠道定价与 OMP systemone 兼容性判定（新增 jevgrep provider 实践旁证节）
- 要点：jevgrep（dzhng/jevgrep，npm @dzhng/jevgrep，抓取时 1967★）是 agent 无关的 Jev 语义检索 CLI + skill（安装器检测 Claude Code/Codex/OpenCode）；候选产生为层级语义遍历（无 lexical 阶段、无固定 top-N、navigation byte budget、声明级解析、本地缓存），与 OMP find 的关键词 grep 粗筛入口互补盲区；provider 含 Vercel/TypeSafe/OpenRouter/Zen/自定义端点，按 provider 换传输；README 基准自报 8/10 任务、Sol 成本 28.6% 降幅（未独立复验）；全部结论为 README/架构文档层面，未本机安装运行。

## [2026-10-02] ingest | 双层循环操控模型
- Disposition: New
- Raw: raw/geekbang-agent-harness/2026-09-30-course-concepts.md
- 要点：徐昊《Agent 驾驭工程之美》课程框架入库——双层循环（外层 PDCA + 内层操控循环）、四子系统（指令/工具/环境/状态）、操控循环四步（Guides/Action/Sensors/Steer）；自我纠正机制就是 ReAct 观察到了错误，无额外机器；edge 是窗口截断边界（中间旧对话被驱逐，system prompt 固定）；Böckeler 把修正指引嵌入 sensor 输出，融合前馈内容与反馈通道；feedforward 术语起源于 I. A. Richards 1951 年 Macy 控制论会议，后传入 control theory；课程概念归于「前同事 Martin Fowler」，公开文字作者实为 Böckeler。

## [2026-10-04] ingest | 用控制论评估 Agent 系统
- Disposition: New; Update
- Raw: raw/harness-engineering/2026-10-02-bolu-ai-agent-control-system.md; raw/harness-engineering/2026-10-03-zhihu-ai-agent-harness-engineering.md; raw/harness-engineering/2026-10-03-juejin-harness-engineering-cybernetics.md; raw/harness-engineering/2026-10-03-csdn-harness-engineering-cybernetics.md; raw/harness-engineering/2026-10-03-cnblogs-harness-engineering-openai.md; raw/harness-engineering/2026-10-03-openai-harness-engineering.md; raw/harness-engineering/2026-10-03-george-zhang-harness-engineering-cybernetics.md
- Updated: 双层循环操控模型（See Also 互链）
- 要点：Harness Engineering × 控制论七来源入库——OpenAI 原文（5 个月约百万行、约 1,500 PR、3→7 人、人均 3.5 PR/天、0 行手写、约 1/10 时间）；知乎 Rocky Ding（Outcome=F(M,H,E,T)、model–harness pair、三支柱：评估闭环 42%→95% / 架构约束 52.8%→66.5% / 记忆治理 3 行≈200 行）；掘金铁锤001（组件映射、振荡/发散/滞后三稳定性问题、反馈四原则、三层控制架构）；CSDN 邬俊杰（可能性空间 M→m、自繁殖、共轭控制 L-1AL、业务相关/无关传感器）；bolu.dev（Agent=控制器+世界模型+执行器、MPC/退避视界、收敛/振荡/发散、deadband/hysteresis/anti-windup、评估轨迹非端点）；George Zhang（瓦特调速器 1780s→Kubernetes 2014→Harness 2026 三次模式、生成-验证不对称、Agents don't learn through osmosis）；博客园 warm3snow（五大实践拆解、约 100 行 AGENTS.md 目录、渐进式披露、单任务超 6 小时、等待成本高于纠错成本）。

## [2026-10-05] ingest | pstack 移植版生态全景
- Disposition: New
- Raw: raw/ai-coding-agents/2026-10-05-github-pstack-ports-search.md; raw/agent-tooling/2026-10-05-uv-tool-receipts-deepwiki.md
- 要点：pstack 原版为 Lauren Tan cursor/plugins；GitHub 检索 20+ 移植版，michael-denyer/pstack-claude 1103★ 与 backnotprop/pstack 944★ 两强断层，第三名 81★；平台热度 Codex > Claude Code > Pi/OMP，另有 ZCode/Devin 零星移植；uv 无全局工具清单，`uv tool list` 靠 `InstalledTools::tools()` 逐目录读 `uv-receipt.toml`（DeepWiki 源码索引），receipt 的 index-url 凭据被省略（仍按纵深防御配 protected+URL_CREDENTIAL 脱敏）；本机 12 个 receipt 3.2KB vs tools 目录 3.0G/94,152 文件，浅层 glob 遍历为必须。

## [2026-10-05] ingest | mattpocock/skills 与 poteto-mode 机制
- Disposition: New; Update
- Raw: raw/ai-coding-agents/2026-10-05-pstack-poteto-mode-skill.md; raw/ai-coding-agents/2026-10-05-mattpocock-skills-readme.md
- Updated: pstack 移植版生态全景（新增 backnotprop 内部结构已验证小节）
- 要点：poteto-mode SKILL.md 全文入库——disable-model-invocation、23 份 playbook 路由表、24 原则五分组（Core 10/Architecture 6/Verification 5/Delegation 2/Meta 1）、Just do it 自主规则、subagent 按角色配模型、Harness 跨平台映射；GitHub API 实数 backnotprop 50 skills（24 principle + 26 功能），推翻此前会话「57」的未验证说法。mattpocock/skills（275,890★）README 全文与 ask-matt 流程图入库——27 skills（11+9+5+2）、user-invoked/model-invoked 两轴且不可平级互调、ask-matt 可选路由、主线 grill-with-docs→to-spec→to-tickets→implement→retro、三条 on-ramp、smart zone 约 150k、批评 GSD/BMAD/Spec-Kit 流程拥有型框架。新增对照文章「skill 系统的两种组织轴」。

## [2026-10-05] ingest | JustWoker `/v1/messages` 实测行为
- Disposition: New; Update
- Raw: raw/model-gateway-mismatch/2026-10-05-justwoker-empty-stream-and-breaker-shim.md; raw/model-gateway-mismatch/2026-10-05-justwoker-tools-and-system-replacement.md; raw/model-gateway-mismatch/2026-10-05-claude-quince-bedrock-codename.md; raw/model-gateway-mismatch/2026-10-05-shim-tool-emulation-implementation.md
- Updated: JustWoker `/v1/messages` 实测行为（补流式丢块、tools/system 替换、quince 代号、shim 绕行方案）
- 新建：justwoker-shim 设计（断路器状态机、SSE 合成、文本协议工具仿真、注入点选择）

## [2026-10-05] ingest | OMP nvidia 模型剪枝机制
- Disposition: New; Update
- Raw: raw/omp-config/2026-10-05-omp-nvidia-model-pruning.md; raw/nvidia-build/2026-10-05-nvidia-build-sms-resolved-and-omp-integration.md
- Updated: NVIDIA Build 中国短信验证故障（补 2026-09-29 Resolved 实证、注册与 OMP 配置完成记录）

## [2026-10-05] update | justwoker-shim 第二轮修复
- Disposition: Update
- Raw: raw/model-gateway-mismatch/2026-10-05-justwoker-shim-final-fixes.md
- Updated: justwoker-shim 设计（新增路由节：带工具无条件走 emulation；文本协议工具仿真节更新：描述不截断、非法 JSON 回退、50K 结果截断；已知缺口删流式工具断）
- 要点：采纳 advisor 两条意见——断路器饥饿（带工具请求不喂断路器）与流式转换死代码（130+ 行解析器不触发）；修复后带工具请求无条件走 emulation，断路器只被无工具请求喂养；五项修复：非法 JSON 回退为文本、路由修复、死代码删除（19.36 KB）、描述不截断、正则认单双引号+结果截断保护；e2e 验证 CLOSED/OPEN/非工具三条路径全过

## [2026-10-05] update | OMP Advisor 直接回答投递缺口
- Disposition: Update
- Raw: raw/harness-engineering/2026-10-05-advisor-direct-answer-delivery-gap.md
- Updated: OMP Advisor 上下文标记（新增「Advisor 直接回答的投递缺口」小节）
- 要点：advisor 纯文本回答不渲染成 advisory 块（只有 advise() 调用渲染）；WATCHDOG.md L22 规则：直接点名必须经 advise() 发出；advisor 上下文压缩导致丢失先前评审的证据（compaction 后长篇评审只在 advisor session 里会丢失）；修复后 advisor 走 advise() 发出回答，用户可见

## [2026-10-05] ingest | Sam Ruby notation/notation-up 与 Ashby 变异度定律
- Disposition: Update
- Raw: raw/harness-engineering/2026-10-05-sam-ruby-notation-ashby.md
- Updated: wiki/harness-engineering/evaluating-agent-systems-with-cybernetics.md
- 要点：新增「变异度定律与规约下界」小节——Ashby 1956 必需变异度定律（经 Sam Ruby 在 Partly in the Right 引 Wikipedia）与 Chris Ford 转述（经 Sam Ruby 转述，未独立核验 LinkedIn 原帖）；恒温器类比（spec 是恒温器，生成代码是房间）；六案例归并为五类×信息来源×校验方式表格（DHH 与 Sam Ruby 自己的移植案例合并为一行）；「just trust the model」成立条件：信息来源是否已存在；rigor 迁移而非消失；Rails 中声明与 def 的分界即 Ashby 下界；资源地图加 Sam Ruby 行；Sources/Raw/Updated 更新

## [2026-10-04] update | 双层循环操控模型
- Disposition: Update
- Raw: raw/geekbang-agent-harness/2026-10-02-qa-concepts.md
- Updated: wiki/harness-engineering/dual-loop-steering-model.md
- 要点：新增「Bad Smells 与重构手法」section，按用户问过的问题组织——需求模糊（三件套：约束/完成/边界）、虚假胜利（惰性生成、分离执行与验证）、指令腐化（优先级确定/矛盾检测/定期清理）、前馈痴迷（反馈优先）、上下文倾倒（上下文预算四法）、上下文焦虑（与惰性生成的区分、双层循环+checkpoint）、跨会话知识丢失（内层清点+外层归位）；新增「retro 与动态知识更新的关系」section——retro 是环境改进建议不是知识归位，auto-extract 更接近课程的动态知识更新；Raw 字段追加新 raw 文件链接；index.md Summary 更新

## [2026-10-06] ingest | ttyd 前端编译模型与 tuios workspace/session rail
- Disposition: New
- Raw: raw/terminal-multiplexers/2026-10-06-ttyd-1.7.7-frontend-lockfile.md; raw/terminal-multiplexers/2026-10-06-tuios-0.8.5-workspace-sidebar.md
- Updated: 四 Agent CLI 能力面对比（See Also 加 tuios 交叉引用）
- 要点：ttyd 把 xterm.js 前端编译进二进制、1.7.7（2024-03-30 最新 tag）lockfile 锁 xterm 5.4.0 / addon-webgl 0.17.0 / addon-canvas 0.6.0，升级只能等 release 或 rebuild；本机 OSC52 定制 html = 官方默认 + 两个 script 块（OSC52 剪贴板转发 + contextmenu 拦截），git diff 单 hunk +100/-1。tuios 0.8.5 的 workspace 是编号 1-9 无名字分组、window 是一等实体；session rail 四区块 sessions/terminals/files/agents（appearance.sidebar.sections）；内嵌 herdr 二进制当 agent 状态上报协议。新 topic terminal-multiplexers；cli-capability-surface 挂 See Also。凭据字段（TUIOS_PANE_TOKEN 等）已按 advisory 省略不入 raw。

## [2026-10-06] update | 双层循环操控模型
- Disposition: Update
- Raw: raw/geekbang-agent-harness/2026-10-06-bad-smells-08-09-13.md
- Updated: wiki/harness-engineering/dual-loop-steering-model.md
- 要点：新增六节 Bad Smells——隐式约定（建立原则文档，constitution+ADR 三层结构，五层优先级）、信息散落（管理知识依赖，SOURCE.md+定时 Skill / AGENTS.md 提醒）、反馈过载（分级反馈，成功静默+阻塞/警告/信息三级）、状态污染（状态分区，草稿纸+双层循环）、环境漂移（环境锁定，init.sh+lockfile+Skill 局部化+MCP 隔离+Docker）、模式复制漂移（模式基线化四步：正向范例+架构约束+建立基线+持续清理）；Raw 字段追加新 raw 文件链接；index.md Summary 更新为「07–19 讲全十三种」

## [2026-10-07] ingest | OMP advisor fallback 链解析与 web 角色 effort 层级坑
- Disposition: New
- Raw: raw/omp-config/advisor-web-fallback-chain-root-cause.md
- 要点：18.4.5 effort 层级（commit 5f012e314d，修 #13789）使 advisor 无链时 resolveRetryFallbackChainKey step3 命中 web 角色键（同模型 :high）→ advisor 走 web 链 → 19 个 web-search provider 全部 Unhandled API in mapOptionsForApi: web-search → Advisor "default" unavailable for web/ollama；探针复现 resolved chain key for advisor: web；本地修法 modelRoles.web 改 web/firecrawl + 显式 fallbackChains.web（删重复链头项）+ fallbackChains.advisor 加 c8787/gpt-5.6-luna；有效链顺序探针验证 web/tavily → web/exa → c8787/gpt-6-luna → web/duckduckgo；上游 #13158 closed wontfix（维护者留话复现就 reopen）、#13789、#13187 by-design

## [2026-10-07] ingest | OpenAI Decisions API beta 发布与字段级 schema
- Disposition: Update
- Raw: raw/ai-coding-agents/2026-10-07-openai-decisions-api-beta-schema.md
- Updated: Jev 在 OMP、Codex、OpenCode 的现成集成盘点
- 要点：2026-10-06 官方 changelog 以 beta 发布 Decisions API（`gpt-6-luna` + `POST /v1/decisions`）；官方 guides/decisions 指南页与 API reference create 页公开字段级 schema——请求 `model`/`input`/`questions`（predicate/choice/score 三题型，choice value 可 string 或 boolean）+ `safety_identifier`，响应 `answers` 四变体（含 refusal）+ `usage`；定价 input $0.10/M 只计 input；访问门槛仅第三方单账号实测 "Decision API is not enabled for this user"。旧记录 2026-09-30「端点未公开」结论已标 Status: Outdated；「Jev 唯一有可验证公开 API」收窄为「Jev 仍属唯一 GA 级公开 API」。

## [2026-10-07] ingest | OMP judgment 对 chat 类 judge 的无 schema 文本解析机制
- Disposition: New
- Raw: raw/omp/2026-10-07-judgment-chat-llm-bridge.md
- 要点：18.8.0 pi-ai `judgment/chat.ts` chatTextBackend 用普通 chat 模型当 judge 时不发 `response_format`/`json_schema`/`text.format`（judgment 目录 grep 零命中）；`temperature: 0` + `disableReasoning: true` + `maxTokens: 4096` 首次裸文本调用，prompt 约定关键词回答；`text.ts` 三解析器（choice 取最早合法 label / noul 取最早 yes-no / score 取首个范围内整数）抠答案，抠不到 throw `JudgmentParseError`；重试（parseRetries 2）才挂 `submit_judgment` tool（strict:true）强制交答案，仍走同一组解析器；jev 命中时走独立 `/v1/systemone` 路由与 chat 协议分离；本机 `modelRoles.judge` 实配 `typesafe-zen/jev-1.13`，Luna 做 judge 是假设场景；chat 类 judge 的 transport 依 `model.api` 分发（含 openai-responses 分支）但未读取 models.yml 具体 api 值。

## [2026-10-07] ingest | graphify 0.9.79 全命令清单实测
- Disposition: Update
- Raw: raw/agent-tooling/2026-10-07-graphify-079-inventory-trial.md
- Updated: wiki/agent-tooling/graphify-mechanics.md
- 要点：update 重建 agc 4620 节点/5079 边/397 社区；查询七件、导出七种、merge-graphs 跨仓、save-result/reflect 全部实测；六条环境边界（add 被伪 IP 拦、watch 缺 watchdog、extract/label 缺 openai 包、prs 要 gh 登录、--force 防护未触发、benchmark 仅沙箱）；skill 自动刷新副作用（--version/--help 实测触发，detect 仅版本警告）

## [2026-10-07] ingest | semgrep 1.179.0 七工具复核
- Disposition: Update
- Raw: raw/agent-tooling/2026-10-07-semgrep-1179-recheck.md
- Updated: wiki/agent-tooling/semgrep-mcp.md
- 要点：行为与 1.178.0 一致；新增边界：自定义规则 code_files 须相对路径、p/default 拉取也超时（10s）；非安全规则（print）实测命中 cli.py 六处

## [2026-10-07] ingest | codegraph 与 graphify 分工边界探测
- Disposition: New
- Raw: raw/agent-tooling/2026-10-07-codegraph-graphify-probe.md
- 要点：单查询探测——codegraph 返 25 个代码符号未达 wiki 条目，graphify 同日图谱 wiki 节点高连接数（Wiki Log 174 边居首）；性能、覆盖全局性、功能独有性均未验证；global 仅空图试用，跨项目查询未验证

## [2026-10-08] ingest | skill 清理、锁定文件匹配与 gws CLI 移除
- Disposition: Update
- Raw: raw/skills-cli/2026-10-08-skill-cleanup-and-lock-matching.md
- Updated: wiki/agent-tooling/skills-cli-performance-model.md; wiki/omp-config/managed-skills.md

## [2026-10-08] ingest | OMP TTSR 判定机制与 question 规则
- Disposition: New; Update
- Raw: raw/omp-ttsr/2026-10-08-omp-ttsr-judge-mechanism.md; raw/omp-ttsr/2026-10-08-ttsr-judge-config-migration.md
- Created: OMP TTSR 判定机制与 question 规则
- Updated: OMP TTSR 与 /omfg; OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界; OMP Extension 与 TTSR 分层防护
- 要点：Rule.question 是 TTSR 两条路径（正则/AST 流匹配 vs judge 事后判定）的分流开关（ttsr.ts:745-785 addRule、992-998 #matchBuffer 过滤）；claim() 只把 YES verdict 的规则标 injected、NO 判定不消耗 once 状态，请求次数取决于首次 YES 位置——全 NO 时等于 pre-filter 命中数，一旦 YES 触发 claim 后剩余通过 pre-filter 的 output 因 `#canTrigger` 返回 false 不再进入候选（ttsr.ts:985-989、529）；ttsr.judge 三值 auto/on/off（ttsr-settings.ts:20-41），auto 要求 judge 角色链首 kindOf===native（judgment/index.ts:206-209）；omp ttsr test 对带 question 的规则直接过滤、不调 judge（ttsr-cli.ts:283-288），只能验证 YAML 与 regex，判定质量必须走真实会话 + omp usage purpose=ttsr 观测；judge state 只有 output.subject 与 content 两字段（ttsr.ts:96），结构性看不到对话历史、用户消息、外部状态，目标条件落在 output 之外的规则加 question 会结构性误报；TtsrManager.addRule() 对已存在规则名直接返回 false（ttsr.ts:749-750），同名规则不会同时注册、先加载胜出；本机第一条带 question 的规则 verify-before-mechanism-claims 走「.omp/rules → ~/.omp/agent/rules」迁移（commit bb2dcc7），manifest.json 只有一条 omp-rules 条目 ~/.omp/agent/rules→omp/agent/rules，.omp/rules/ 不在 manifest 覆盖内

## [2026-10-08] ingest | HyperFrames：HTML 写视频的 agent 管线
- Disposition: New
- Raw: raw/video-generation/2026-10-08-hyperframes-html-video.md
- Created: wiki/video-generation/hyperframes-html-video.md
- 要点：59K+ stars（2026-10-08 API 实测 59005）；14 包 13 发布 npm（0.8.141）；52 技能/11.4M 安装；core set 10 技能装法；组合契约（禁 opacity 初始态、禁 `<br>`、字体 lint、时间轴协议）；WSL 实操（预览走用户浏览器、渲染需 headless Chrome）

## [2026-10-08] ingest | Plain Language 技能：ASD-STE100 与 ISO 24495-1
- Disposition: New
- Raw: raw/agent-tooling/2026-10-08-asd-ste100-iso24495-skills.md
- Created: wiki/agent-tooling/plain-language-skills-asd-ste100-iso24495.md
- 要点：受控语言（零歧义机器解析）vs 简明语言（人类读者结果）；ISO 24495-1 无中文官方适配、繁中层原创；两技能「编码规则分类不复制付费标准」范式

## [2026-10-08] ingest | skills CLI 空格名 key 卸载语义
- Disposition: Update
- Raw: raw/skills-cli/2026-10-08-lock-space-name-cleanup.md
- Updated: wiki/agent-tooling/skills-cli-performance-model.md
- 要点：`skills remove` 位置参数调用返回 `No matching skills found`（根因未证实，CLI 是否按空格拆词未读源码）；`--skill` 调用删除磁盘安装、锁记录不变；新旧条目共享 skillPath 时 remove 连带删 slug 目录；本次恢复路径为手工清键 + slug 重装（单次案例，非通用流程）

## [2026-10-09] ingest | OmO 停止条件与意图检测机制
- Disposition: New
- Raw: raw/oh-my-openagent-omo/2026-10-09-stop-condition-and-intent-mechanisms.md
- Created: wiki/agent-harness/omo-stop-condition-mechanisms.md
- 要点：三层停止机制（代码层 &lt;promise&gt; 正则+状态机不解析自然语言；提示词纪律层 intent line 5.5/5.6/6 演进；门控层 STOP WHEN lint + EVIDENCE_RECORDED 门 + gate-reviewer）；防过度执行/漂移/假完成/半成品；grep.app 检索受前 10 项限制非穷尽

## [2026-10-09] ingest | OmO 技能生态与 skills CLI 安装
- Disposition: New
- Raw: raw/oh-my-openagent-omo/2026-10-09-ulw-skills-and-skills-cli-install.md
- Created: wiki/agent-harness/omo-ulw-skills-ecosystem.md
- 要点：skills.sh 官方 44 技能 10.2K 安装；ulw 家族停止条件定义者差异；意图行无技能复刻；skills CLI 13 vs 44 差异为单次观察（源码扫描规则未核实）；直接路径安装绕过；lock 跟踪；PromptScript 不支持全局；agc manifest 只覆盖 lock 元数据
