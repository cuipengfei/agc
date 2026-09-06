# repo-trust 摘录（Dmitrze/repo-trust）

> Source: https://github.com/Dmitrze/repo-trust/blob/v0.1.0/docs/methodology.md
> Collected: 2026-09-06
> Published: Unknown
> Type: excerpt（按 wiki 文章引用范围摘录）

## 五模块结构与权重

Star Authenticity 0.20 | Activity Health 0.25 | Maintainer Health 0.20 | Adoption 0.20 | Security 0.15——star 真实性只是五模块之一，权重 0.20。

## Star Authenticity 模块（H1+H2）

- H1 低活跃账号占比：分析对象为打星账号中「0 repo/0 follower 或建号 30 天内」的占比；样本量联动置信度——n<100 → Medium，n<30 → Low 且输出 caveat（数字为该工具 v0.1.0 的参数选择）
- H2 滞后滑动 z 分数：28 天滚动均值 ±7 天滞后，逐日 z 分数取 max。阈值 ≥5 表示显著突发
- 降级到 Concerning 需 H1 与 H2 **同时命中**（合取）——单信号不降级，理由：真病毒事件（HN 首页）可产生 z 8-15 区间的极端值
- 大 z 配小 fork 增长 → 怀疑；大 z 配同量 fork 增长 → 有机迹象

## 维护者健康（H3 部分）

fork/star 比按生态调（TS 库 fork 天然少于 Python 框架）；稳定工具库（如 UUID 库）release≥3 且版本一致 → 下调「不活跃」权重（生态成熟度豁免）

## 置信度聚合

权重 >10% 的模块里，最低置信度拉低整体——不平均。置信度与分数分开输出。

## 设计纪律（ADR）

- 0004 无 ML、0005 联邦（能复用 OpenSSF Scorecard/deps.dev/OSV 就不重算）、0007 确定性优先、0008 置信度分离
- module_score = 0.55×低活跃 + 0.30×lockstep + 0.15×比率（Star Authenticity 模块内公式）
- v0.1.0，早期；以上均为 methodology.md 文档声明
