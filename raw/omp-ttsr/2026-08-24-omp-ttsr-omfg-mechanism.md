# OMP TTSR 与 /omfg 机制调研

> Source: oh-my-pi 源码 checkout /home/cpf/code-inside/oh-my-pi @ 9892714499 (v18.0.4+11) 及 docs/ttsr-injection-lifecycle.md、docs/rulebook-matching-pipeline.md；GitHub issues/PRs
> Collected: 2026-08-24
> Published: 2026-08-24

调研方式：3 个 lo scout 限时并行（源码/上游/社区反响），主 agent 综合，多轮 advisor 与用户 annotation 校正（采纳：快照范围收窄、contextMode 语义、repeatGap 单位与类型、interruptMode 条件性、传输层"流不出去"修正）。

## 定义

TTSR（Time-Traveling Stream Rules）：规则平时休眠不进上下文；模型流式输出中途命中规则的 regex（condition）或 ast-grep（astCondition）条件时，harness 调用 agent.abort() 中止流，把规则作为 system reminder 注入，从同一点重试。注入跨 compaction 存活。名称意象：把还在生成的消息"倒回"命中前，对后续上下文而言那次出轨等于没发生（discard 模式下）。

/omfg：用户对 agent 反复出现的行为不满 → `/omfg <complaint>` → OMP 用当前会话上下文生成 TTSR 规则候选 → 用 assistant 历史校验条件能命中 → 面板确认保存（项目级 .omp/rules/<name>.md 或全局 ~/.omp/agent/rules/）→ 写入即 live 注册。Esc 全程可取消。入口 slash-commands/builtin-lifecycle.ts:379-387；控制器 modes/controllers/omfg-controller.ts:58-247。

## /omfg 用模与上下文范围（修正后口径）

- 用模：调用那一刻会话的当前生效模型（effective current model），无独立 /omfg role。证据：omfg-controller.ts:65 `const model = this.ctx.session.model`；agent-session.ts:7856 runEphemeralTurn 跑在会话当前模型上。
- 上下文：当前可用的会话上下文（[...this.messages]，compaction/reset 之后的历史不在其中，不保证覆盖持久化 transcript 每一条）+ 系统提示 + 主 agent 工具目录。进行中 assistant 消息只补 thinking 块与 text 块；进行中的 tool-call blocks 不保留（agent-session.ts:7950-7990）。side-channel 请求不改写会话历史。
- 校验端 validateParsedRuleAgainstAssistantHistory 为纯本地 regex 匹配，不调模型。

## TTSR 运行时（docs/ttsr-injection-lifecycle.md 锚定）

- 注册：session 创建时 bucketRules 分桶；有 condition/astCondition 的规则进 TTSR 桶，优先于 always-apply 和 rulebook。
- 监控：每个 message_update 看 text_delta/thinking_delta/toolcall_delta；AST 只对 edit/write 快照匹配。默认 scope 不含 thinking（docs/ttsr-injection-lifecycle.md:54,258：无显式 scope 时监控 assistant text + 所有 tool arguments，不含 thinking）。
- 命中后按 interruptMode：可中断 → abort + 注入 + continue；不可中断 → toolResult 前置 <system-reminder> 或回合后 followUp。
- 无效 regex/不可达 scope → warning 后忽略，不阻塞启动。规则名重复 first-wins。
- 规则来源与优先级（rulebook-matching-pipeline.md §4）：native .omp(100) > omp-plugins(90) > .agent/.agents(70) > .cursor(50) > windsurf(50) > .clinerules(40) > .github/instructions(30) > builtin-defaults(1)。可读 Cursor/Windsurf/Cline/Copilot 规则格式。
- CLI：omp ttsr（list）/ omp ttsr test / omp ttsr scan（commands/ttsr.ts、cli/ttsr-cli.ts）。

## 配置 7 键（settings-schema.ts:3393-3479；修正后口径）

- ttsr.enabled：boolean（true/false），默认 true。false = 不注册不匹配。
- ttsr.contextMode：enum，仅 discard/keep，默认 discard。discard = 整条丢弃被中断的 assistant 消息（含命中前已生成正文），实现 ttsr-coordinator.ts:431-433 replaceMessages(slice(0, targetAssistantIndex))，注入后重试；keep = 保留已生成部分续写。
- ttsr.interruptMode：enum，仅 always/prose-only/tool-only/never，默认 always。never = 不中断，事后注入提醒。
- ttsr.repeatMode：enum，仅 once/after-gap，默认 once。once = 每会话一次；注入记录持久化 ttsr_injection，resume/compaction 后恢复抑制（sdk.ts:1610-1612；session-context.ts:276-287）。
- ttsr.repeatGap：普通 number，非 enum；schema 定义处未声明范围/整数约束（是否接受任意 number 未核验）；UI 快捷档位 5/10/15/20/30；默认 10。计数单位是已完成 turn（messageCount 在 turn_end 才加一，docs §5）。只在 after-gap 下有意义。恢复会话规则年龄从 0 起算（ttsr.ts:548-551 lastInjectedAt: 0）。
- ttsr.builtinRules：boolean，默认 true；false = 整套内置规则不加载（如 ts-no-local-is-record）。
- ttsr.disabledRules：字符串数组，默认 []；按名完全忽略，内置与自定义均生效。

## 强制力的精确边界（两轮修正合并）

TTSR 硬阻断成立条件：规则启用且未禁用 + 输出命中（scope/globs 匹配）+ interruptMode 允许该类流中断 + 未被重复抑制。即使全部满足："阻断"= 中止继续生成 +（discard 下）整条消息从后续上下文移除；命中前的 token 已从 provider 流到 OMP、已消耗算力、可能已在 TUI 短暂显示、计费取决于 provider（未核验）。never 模式/禁用/抑制/未命中时退化为事后提醒或不在场。

## Issue 现状（截至 2026-08-24）

已修复：#1767（enabled=false 不生效，PR #1988）、#2783（命中波及兄弟 tool call，PR #4542）、#3646（hashline edit path-scoped 不触发，PR #3648）、#5489（PCRE (?i)/坏 scope 静默不注册）、17.2.4 rewind 后 tool-card 双渲染、17.1.7 新增内置 ts-no-local-is-record。
开放：#7960（macOS/iTerm2 /omfg 编辑误触 EOF 退出）、#8192（提议 tiny model 语义分类器补 regex 盲区）、#8583（手动编辑 /omfg 草稿）、#7158/#7182（per-rule repeatMode/contextMode）。#872 closed-not-planned（恢复 promise 挂起，低置信度报告）。

## 成本模型（修正后口径）

abort 时已流出的输出 token 已由 provider 生成（算力已消耗；计费取决于 provider，未核验）；重试部分再次生成。TTSR 省的是"之后每一轮的输入 context 税"（对比 always-apply 常驻系统提示）。成立前提：出轨偶发；频繁触发的规则总成本可能反超 always-apply。

## 社区反响

官方主推卖点（README.md:155-161 有 poster + 演示视频；omp.sh 首页介绍 /omfg 流程）。未发现 HN/Reddit/X/博客中可核验的独立用户实测评价（Reddit 正文抓取受限；Medium 评测未提 TTSR/omfg）。结论：口碑证据空白，非负面。
