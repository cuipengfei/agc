# Prime Agent 社区 Reception

> Sources: Capital and Compute; Can Bölük; Composio; Rohit Raj; Hacker News
> Raw: [Prime Agent 社区评价原始记录](../../raw/prime-agent/2026-08-30-prime-agent-community-reception.md)
> Updated: 2026-08-30

## 独立分析

### Capital and Compute（独立技术博客）

- Prime 95.5% ARC-AGI-3 是 vendor self-reported
- ARC 当时公开验证的最高分数是 Claude Opus 5 的 30.2%（同一 public set）
- Schema harness 三周前已报 98.98%
- 结论：Prime Agent 是"严肃工程 + 弱 headline"

### Rohit Raj（AI 顾问）

- "Self-improving" 是 2026 最过度宣称的短语
- 但 context-as-variable 是对 context bloat 的架构级回答
- 长期自主运行值得试，生产环境别碰

## 竞品创始人评价

### Can Bölük（OMP 创始人，@_can1357）

X/Twitter thread（https://www.unrollnow.com/status/2085502793679294947）：

> "well this was a waste of tokens"
>
> "I gave it a py kernel just like they did (which we had for about 6mo now btw) bascially ends up spamming eval as you can imagine"

直接竞品 OMP 的创始人。评价范围：Python kernel 非独创、实际运行 spam eval、token 浪费。

## Benchmark（Composio）

来源：https://composio.dev/content/best-agent-harness-deepseek-v4-flash（Sunil Kumar Dash，2026-08-11）

8 个 harness × DeepSeek V4 Flash × 30 个任务：

| Harness | Pass Rate | Median Time | Tokens/任务 | Cost/成功 |
|---|---|---|---|---|
| Pi Agent | 66.7% | 132.2s | ~559K | $0.028 |
| Prime Agent | 62.5%* | 242.1s | ~1,400K | $0.131 |
| OMP | 56.7% | 272.4s | ~742K | $0.103 |
| Claude Code | 53.3% | 122.7s | ~742K | $0.195 |
| Codex | 53.3% | 245.0s | ~692K | $0.081 |
| DeepAgents | 53.3% | 187.1s | ~665K | $0.045 |
| Hermes | 50.0% | 175.5s | ~192K | $0.056+ |
| OpenCode | 46.7% | 129.7s | ~665K | $0.073 |

*Prime Agent：24 个有效运行中 15 个通过。6 个被排除：2 个 verifier 超时（session 高达 3.5M tokens、33 次 tool call），4 个未记录。

**关键观察**：Prime token 消耗最高（1.4M/任务，几乎 2x），没有 harness 在所有指标上占优。

## 社区声音（HN）

- embedding-shape："代码膨胀，10K 行文件"
- oofbey："Neat, but not revolutionary"
- riddlemethat："基础模型已跟上，不再需要 harness"
- sexyketchup777："模型越强，harness 越没用"

均为匿名用户，低可信度。

## 投资者

Andrej Karpathy 和 Clem Delangue（Hugging Face）是 Prime Intellect 投资者。无直接技术评价记录。

## 结论

知名来源中仅 Can Bölük（OMP 创始人）有直接技术评价，负面。独立博客质疑 headline，AI 顾问认可方向但质疑宣传，benchmark 显示高 pass rate 但 token 消耗也高。

## See Also

- [Prime Agent 技术实质](prime-agent-technical-reality.md) — 源码验证的实现细节
- [Prime Agent：功能与配置总览](prime-agent-overview.md) — 官方文档视角
- [四 AI Coding Agent 对比](../ai-coding-agents/4-agent-comparison.md) — 与 OMP、OpenCode+OMO、DSH 的横向对比
