# orbit-check 摘录（anwen-labs/orbit-check）

> Source: https://github.com/anwen-labs/orbit-check README
> Collected: 2026-09-06
> Published: Unknown
> Type: excerpt（按 wiki 文章引用范围摘录）

- 自我定位（README 原文）：What this is not: a fraud detector——永不输出真假判决
- 输出四级信号 tier：baseline / moderate / elevated / insufficient-data
- 两条信号：时序突刺（burst ratio、top-day share、3σ 尖峰日）+ 打星账号质量（n=150 均匀采样）；跨平台采用度对照只做人工、只报比率
- 工程：纯 Python 标准库零依赖；结果文件随报告 commit 保证可复现；维护者申诉通道（合法事件核实后并列发布解释）
- README 提及 GitHub 2026-06 起限制匿名访问 stargazer 数据，需认证 GraphQL
