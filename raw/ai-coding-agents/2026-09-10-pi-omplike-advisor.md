# Pi OMP-like Advisor：OMP 顾问移植版

> Source: https://github.com/pasky/pi-omplike-advisor
> Collected: 2026-09-10
> Published: Unknown

`pi-omplike-advisor` 是 Pi 的持久化 advisor extension，也是将 oh-my-pi Advisor 移植到 Pi 公共 extension 接口上的实现。它使用第二模型逐轮审查主 agent 的工作，并将简短建议内联注入会话。

Advisor 是一个长期运行的只读 agent，拥有自己的模型和只读工具。主 agent 的 transcript 按每轮 delta 逐批送入，它可以把简短建议注入会话。它不是 executor，不能编辑文件、运行命令或修改 session 状态。

Advice 进入 pending queue，在 turn 边界或 Advisor review 完成时 flush。`concern` 和 `blocker` 建议会先暂存，并由下一次 review 重新确认，避免异步产生的过时建议立即送达。
