# omo-ai v5 Kibitzer/Dream 机制与模型路由直读证据

> Source: 本机 omo-ai 5.0.0 安装包直读（`plugin/extensions/kibitzer-persona.md`、`dream-persona.md`、`reflection-persona.md`、`memory-run-supervisor.mjs` 开头、1.2MB 主 bundle `plugin/extensions/omo.js` 的 zod schema 默认值与路由代码切片）; 用户 `~/.omo/omo.jsonc`
> Collected: 2026-09-27
> Published: 2026-09-27

## Kibitzer persona 关键原文

- 5 个只读工具（A5/Grep/A6/Thinking/MemorySearch），唯一输出通道是 Nudge。
- Nudge 格式硬约束：≤200 字符；只陈述「这条笔记记录了什么」的事实；不允许指示 agent 该做什么；不允许决策评论；祈使句会被拒；日期用绝对日期，不写「昨天/上次」。
- 注入主 agent 的块措辞明写「仅供参考，你当前的任务不变」。
- 反噪音纪律：沉默是默认正确答案；每条路径只判一次；已送达的永不重发；被拒绝的不再重复判。
- 上下文预算耗尽时按 reseed 协议换继任者，继任者继承 rejected/delivered 清单与任务摘要，不从头再来。
- sidecar 上下文上限 48000 token。

## Dream persona 关键原文

- 行为六步：调查 → 整合 → 预算硬契约 → 技能审计 → 人物知识 → 审查与提交。
- 记忆是 git 仓库：改动必须 commit 之后才生效；写锁；symlink 逃逸防护；`$OMO_MEMORY_PUSH_SYNC` 推送同步。
- system/ 层 token 预算硬契约：达到 `compile_warn_tokens` 后本次运行必须削到 0.8 目标以下，优先修剪 self-aware.md（上限 12 条）。
- 升降层由实测读取账本（memory-usage.json、ledger.json）决定：高频读取提升进 system/，无人用降级去 reference/ 留 [[path]] 交叉引用，降级可逆不删内容。
- 技能审计两类证据：被 transcript 证明是错的技能就地修（update 优先于 extend 优先于 create）；只是很久没人用的技能只进报告候选清单，绝不删。
- 人物知识两模式：deduction 必须引用观察行；induction 只写观察账本带置信度，直觉不写成卡片；冲突标 status: open 留给主 agent。
- 提交前审查清单；commit 信息带类型和结构化 trailer；commit 失败只重试一次。

## 模型路由（bundle schema 与代码切片）

- memory 配置 schema 各组件默认值：
  - reflection：`{enabled: true, steps_between: 25, timeout_minutes: 15, max_chars: 150000, auto_select_max: 5, category: "quick"}`（timeout 为 launch 超时非运行上限）
  - nudge：`{every_user_turns: 10, enabled: true, max_concurrent_wakes: 2}`
  - facts：`{enabled: true, min_hours_between: 24, timeout_minutes: 45}`
  - dream：`{enabled: true, idle_minutes: 30, min_hours_between: 24, shutdown_launch: "after", auto_select_max: 5, auto_select_max_chars: 150000}`（dream 段无 category 默认）
  - people：`{mode: "deduction", card_max_entries: 25, card_max_chars: 2000}`
  - sync：`{commit: true, interval_minutes: 0, push: false, auto_commit_message: "omo: memory sync"}`
  - search：`{max_results: 8, max_chars_per_file: 4000, max_chars_total: 12000, dedupe_similarity_threshold: 0.94}`
  - recall：`{enabled: true, max_items: 2, category: "quick", sidecar_max_tokens: 48000, max_concurrent_wakes: 2, tool_budget: 8}`
  - recall.event_caps 默认值与 kibitzer persona 事件正文上限逐字一致：tool_args 400 / result_head 600 / assistant 1500 / prompt 4000。
- 路由选择函数 `chooseMemoryLaunchRoute` 原文切片：
  - `let i = "dream" === e.request.trigger ? "dream" : "reflection"` —— dream 与 reflection 各自独立 surface 进同一条路由。
  - facts 类运行恒走 quick；会话模型无定价数据走 quick；主会话上下文 + 载荷 + 每轮估算超过会话模型窗口 80% 走 quick。
  - 路由头注释原文：`chooseMemoryLaunchModel requires separate tokenData for fork (session model, cacheRead) and quick (cheap prompt-only model)。`
  - 工作量画像 AK["reflection"] 与 AK["dream"] 同值：估算 input 44500 / cacheRead 643000 / output 7000 / turns 21。
- category 字面量枚举：`opencode-deep-research / vision / quick / high / opencode-reasoning / deep-low`（共 6 个）。kibitzer 的 recall 段 category 默认是 "quick"，配置键名是 `recall`——CHANGELOG「runs beside your main session on the cheap quick category」说默认值、「the Kibitzer recall category」说组件键名，两者不冲突。
- quick 类模型比较器：有定价的按输入价从低到高，同价选上下文窗口大者；都无定价时优先匹配特定命名模式，再按注册序。

## 本机配置实证

- `~/.omo/omo.jsonc`：`[opencode].models."4140/gpt-5.6-luna"` 块带 `categories: ["quick"]`——本机 quick 类解析为 `4140/gpt-5.6-luna`。
- omo.jsonc 全文无 memory/kibitzer/dream/reflection 覆盖段——四个组件全用 bundle 默认值。

## 11 命名 agent 存续（bundle 字符串 + changelog + 本机配置）

- 插件版 `dist/agents/` 有 `createAtlasAgent`/`createHephaestusAgent` 工厂与硬编码角色提示词；独立版 bundle 里 prometheus/hephaestus/atlas 角色描述文本零命中；sisyphus 只出现在配置键集合 `["disabled_providers","model_fallback","models","sisyphus_agent"]`。
- 主 agent 配置键 `omo_agent` → `sisyphus_agent`（bundle 有迁移逻辑，omo_agent 仍有 8 处命中）。
- 团队信箱资格表（bundle 逐个点名）：sisyphus/atlas/sisyphus-junior 可进团队；hephaestus 缺 teammate 权限时改用 `subagent_type: "sisyphus"`；prometheus hard-reject（plan-mode-only，`prometheusMdOnly` hook 强制只写 `.omo/*.md`，计划评审走 `delegate-task subagent_type:"plan"`）；oracle/librarian/explore/metis/momus 只读型不许写信箱。
- `~/.omo/omo.jsonc` `[opencode]` scope 下 agents 定义齐全：sisyphus（主控，模型 4140/gpt-5.6-terra）、sisyphus-junior（terra+medium）、hephaestus（luna）、atlas（luna）、prometheus（terra），各带 description/model/variant/fallback_models/prompt_append。
- 独立版 schema 声明 `[opencode]/[native]/[senpi]/[codex]` 四个 scope；agent 定义实际从哪个 scope 读未验证。

## 证据边界

- 全部来自安装包制品静态直读（persona 文档、SKILL.md 片段、library.js、bundle 字符串与代码切片）与 `~/.omo/omo.jsonc`，无运行时观测。
- 主 bundle 是压缩混淆（`// omo:` 标记 + 单行压缩体），非加密——字符串常数可提取，函数与变量名为压缩后短名。
