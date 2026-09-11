# DSH Advisor：DeepSeek Harness 顾问

> Source: https://github.com/omdsh-dev/dsh-advisor
> Collected: 2026-09-10
> Published: Unknown

`dsh-advisor` 是一个独立的 DeepSeek Harness plugin，用于移植 OMP Advisor 子系统。它为每个 session 使用独立的 reviewer model，观察主 transcript，用显式配置的 provider 和 model 审查每个 stepped turn，并将按严重度分级的建议（`nit`、`concern` 或 `blocker`）注入原 session。

Advisor 只提供建议。它不批准或拒绝主 agent 的动作，也不会冒充主 agent 发出命令。它包含 emission guard、`immuneTurns` 冷却和 failure policy；Advisor 消息会从后续 delta 中排除，因此不会递归审查自己的建议。

Advisor 默认关闭。启用后必须配置 provider 和 model；任一缺失都会触发硬门槛，阻止模型调用。
