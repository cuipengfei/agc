# Prime Agent 社区 Reception 与第三方评价

> Source: Capital and Compute; Can Bölük X/Twitter; Composio benchmark; Rohit Raj; Hacker News
> Collected: 2026-08-30
> Published: Unknown

## 独立技术博客

### Capital and Compute

- 95.5% ARC-AGI-3 是 vendor self-reported
- ARC 当时公开验证的最高分数是 Claude Opus 5 的 30.2%（同一 public set）
- Schema harness 三周前已报 98.98%
- 结论：Prime Agent 是"严肃工程 + 弱 headline"

## 竞品创始人评价

### Can Bölük（OMP 创始人，@_can1357）

X/Twitter thread（https://www.unrollnow.com/status/2085502793679294947）：

> "well this was a waste of tokens"
>
> "I gave it a py kernel just like they did (which we had for about 6mo now btw) bascially ends up spamming eval as you can imagine"

利益冲突：直接竞品 OMP 的创始人。

## AI 顾问评价

### Rohit Raj

- "Self-improving" 是 2026 最过度宣称的短语
- 但 context-as-variable 是架构级回答
- 长期自主运行值得试，生产环境别碰

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

## 社区声音（HN）

褒贬不一：
- embedding-shape："代码膨胀，10K 行文件"
- oofbey："Neat, but not revolutionary"
- riddlemethat："基础模型已跟上，不再需要 harness"
- sexyketchup777："模型越强，harness 越没用"

## 投资者

Andrej Karpathy 和 Clem Delangue（Hugging Face）是 Prime Intellect 的投资者，但未找到对 Prime Agent 产品的直接技术评价。
