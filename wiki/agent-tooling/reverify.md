# Reverify：确定性验证的适用边界与 rollover 实际价值

> Sources: Reverify 项目审计（本机 /tmp/reverify-src 快照 f32ea84，源码阅读），2026-09-19; Reverify 项目文档与 benchmark 自述（未独立复现），2026-09-19; GitHub 2akouwu/reverify issue #22/#14 与 PR #19/#21 状态（在线读取），2026-09-19; 本机 handoff skill 规约，2026-09-19
> Raw: [Reverify 项目审计底稿](../../raw/agent-tooling/2026-09-19-reverify-project-audit.md)
> Updated: 2026-09-19

## 核心判断

Reverify 的 Verifier 由 `data: bytes` 初始化（verifier.py:190-191），其判官输入是二进制字节流；`verify_claims` 的 claim API 同样以 bytes 为输入（verifier.py:1255）。README 所列 claim kind（README.md:118-130：bytes_at、pattern_present、instructions、emulate_result、import_present、function_at、calls 等）覆盖二进制/逆向断言，而 `Verifier.SUPPORTED` 同时包含 `exebench` 与 `functions_equiv`（verifier.py:165-188，核查器 `_check_exebench`/`_check_functions_equiv`，verifier.py:643-707）——源码差分既可作为 claim 进入该回路，也可走 CLI `reverify equiv` / exebench adapter，契约仍窄（见下）。**普通 coding-agent 场景（源码工作、已有自己的 handoff 约定）通常不值得安装**：可机械核对的源码差分面就是这一个窄契约，且项目当前存在一个已公开的 false-accept 绕过（issue #22，修复 PR #21 未合入）。claim 清单不能概括整个产品——README 清单未列 functions_equiv/exebench（文档滞后），还有 audit-boundary 等非 claim-loop 的通用命令，只是它们不构成对模型断言的验证回路。值得装的例外：常做反编译/二进制分析；愿把关键纯函数归约成 int→int 契约跑等价验证；或想当 rollover 长会话机制的早期用户并接受其宿主限制。

本次审计未运行 reverify（未 pip install、未跑任何 benchmark），行为结论全部来自本地快照 `f32ea84`（包版本 0.11.0，_version.py:4；README 状态节仍写 v0.9.0，README.md:388，文档滞后）。

## 无预制答案 ≠ 无 oracle

本节标题即分界：「无预制答案」指模型事先不知道答案；「oracle」指可机械核对的 ground truth——二进制字节、可信参考实现、录制的 I/O。"没有任何 oracle"的判断类工作（设计取舍、需求合理性）连机械核对对象都不存在，Verifier 的 claim 都无从断言——此时剩下的只有 rollover/ledger 上下文管理，而 ledger 按 binary 的 sha256 键（ledger.py:284），纯源码任务没有二进制、ledger 基本空转。

边界划分：

| 场景 | reverify 价值 | 依据 |
|---|---|---|
| 有二进制/字节级 ground truth（RE、反编译、CTF） | 核心价值区间 | Verifier（data: bytes 初始化）的二进制/逆向 claim 清单 |
| 有可信参考实现或录制 I/O（函数级重写等价） | 窄价值 | functions_equiv / exebench |
| 只有测试/编译器等通用 oracle | 通常无明显增量 | 编译器、pytest、diff 已覆盖 |
| 无任何机械核对对象 | 零价值 | 验证回路不启动 |

## functions_equiv 的窄契约

这是"verified coding"路线图上已勾选的一步（ROADMAP.md:60-67 自述 "First step of the verified-coding domain"；更多语言、函数级契约、spec-by-examples 均未勾）；`functions_equiv`/`exebench` 已作为 claim kind 纳入 `Verifier.SUPPORTED`（verifier.py:165-188），源码差分既可走 CLI `reverify equiv`，也可作为 claim 进入验证回路：

- **I/O 契约**：程序从 argv 读整数参数、向 stdout 打印一个整数（exebench.py:182-185）。非整数 I/O、浮点、随机性、外部依赖、多返回值全在契约外。
- **oracle 前提**：必须有可信参考实现；录制 I/O（record）只支持 C（exebench.py:260-263）。
- **执行前提**：需显式 opt-in 原生执行（`REVERIFY_ALLOW_NATIVE_EXEC=1`，exebench.py:266-267），C 还需本机编译器（exebench.py:268-269）。
- **输入生成**：boundary 列表 10 组 + 固定种子（0x5EED）伪随机 24 个，共 34 组；`gen_inputs(nargs, 32)` 的 32 是 bits（32-bit 输入域），max_inputs 默认 40、不截断（exebench.py:271，behavior.py:184-187）。
- **强度诚实**：pass 是 "tested, not proven"（exebench.py:300-303）。

## rollover 的实际价值与硬边界

rollover（0.11.0 引入）把长会话上下文管理做成状态机：关内置 compaction，阈值（默认 200_000 token，步进 100_000，可用 `REVERIFY_ROLLOVER_TOKENS`/`REVERIFY_ROLLOVER_STEP` 覆盖，rollover_harness.py:52-64）触发时拦一次 stop，要求模型把 hand-off 写进固定 7 节模板（模板页脚自我声明 "This file is the model's own notes = UNVERIFIED"，rollover_harness.py:678-687），验收通过才发 receipt。

**三条硬边界**：

1. **hand-off validation 只查形状，失败放行**。validate_handoff 只查：文件被重写过（mtime）、≤24KB、非空、≥3 个 `## ` 标题（rollover_harness.py:560-578）。不查内容真伪。被拒后 run_guard 返回 `{"action": "allow", "why": problem}`（rollover_harness.py:805），会话继续运行、guard 上移 re-arm——"fail closed"指的是不发 receipt，不是阻断会话。hook 整体 fail open（异常即放行，rollover_harness.py:2223-2225）。
2. **receipt 未必被消费，但"未消费"有明确限定**。消费只有三条路径：launcher 换进程、hook inline 重置、successor。只有未使用这三条路径的 plain session（CHANGELOG 列明：desktop app、`claude --bg`、Remote Control server mode、plain `claude`，CHANGELOG.md:13-17）才会 receipt 发了没人接；doctor 靠用户主动跑才发现，自报实测一例会话因此涨到 909k tokens（unconsumed_receipts 定义 rollover_harness.py:1978-1982）。
3. **宿主差异（严格版）**：gemini 的 AfterAgent `clearContext: True`（rollover_harness.py:1246-1248）只证明当前上下文被重置，是否等同"新会话"未验证；opencode 插件经 SDK 开新 session（:1510）；claude 的 `format_receipt` 返回 None（:872-873），需 launcher 或 opt-in `REVERIFY_ROLLOVER_SUCCESSOR=bg`（:1004）；codex 需 launcher，未验证有等价 successor。README 自承对 plain `claude`/`codex` "keeps the context lean rather than pretending to clear it"（README.md:249-255）。

**相对本机已有 handoff 约定的增量**（本机 handoff skill：模型写摘要、存系统临时目录、无校验无回执）：增量 = hand-off 形状校验 + receipt + 会话替换状态机 + 换会话时引用用户原话而非转述。代价 = 关内置 compaction、hook 接入、按宿主不同的能力残缺。hand-off 内容本身仍出自模型、仍 UNVERIFIED——两个约定在这一点上无差别。

## 成熟度与已知缺陷

- **issue #22（open，已公开 false-accept）**：空字符串 string_present、全通配 `??` pattern、零长度 bytes_at、空 mnemonics 全部判 VERIFIED 且带正权重（如空 bytes_at 的 0.3），可刷 grounded_score。修复 PR #21 截至 2026-09-19 仍 open，本地快照亦不含——"never accepts a wrong claim" 的主张在此修复合入前存在公开绕过。
- **issue #14（open）**：开放式目标下 orchestrate 退化为 bytes_at 盲猜、不收敛；具体措辞则 14 条 import_present 全 VERIFIED。对应修复 PR #19 仍 open。这正是"无预制答案"任务形态的行为退化实测。
- **静默错误史**：32 位 x86 参数传递曾静默 arg=0，行为等价假通过（CHANGELOG.md:87-91，PR #12 已修）——此类 bug 是该工具类别的最怕项。
- **语义层仅 DERIVED 强度**：angr CFGFast 启发式，结论记 DERIVED 层、低于 VERIFIED（README.md:341-347）。
- **自承认 gap**：macOS arm64 universal 二进制 lief slice 选择未生效（BENCHMARK.md:66-70）。
- **benchmark 数字未独立复现**：275 样本 / 2,007 known-false claims 0 false VERIFIED（BENCHMARK.md:64-70, 134-135）为项目自述，本审计未运行复现。

## 证据边界

- 行为断言均带 `文件:行号`，逐字摘录见 raw 底稿；快照 commit `f32ea84`（/tmp 易失，raw 已自带引文）。
- issue/PR 状态为 2026-09-19 在线读取快照。
- "通常不值得装"是 fit 判断，不是机制断言；三例外见核心判断。

## See Also

- [Coding Agent 的短反馈闭环：逐轮 Advisor](../ai-coding-agents/short-feedback-loop-advisors.md) — 第二模型审查 vs 确定性工具裁定的同轴差异
- [Harness 格式与上下文载体](../harness-engineering/harness-formats-and-context-carriers.md) — Hashline/Snapcompact/RLM/rollover 各 handoff 与压缩载体对比
- [Claude Code 上下文窗口与自动压缩控制](../harness-engineering/claude-code-context-and-compaction.md) — 被 rollover 关掉的内置 compaction 的客户端语义
- [Mutation testing、test oracle 与 invariant](../software-testing/mutation-testing-oracles-and-invariants.md) — oracle 概念谱系：等价核对的机械 oracle 从何而来
