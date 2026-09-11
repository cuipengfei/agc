# Pi Advisor：逐轮第二模型顾问

> Source: https://github.com/hazrid93/pi-advisor
> Collected: 2026-09-10
> Published: Unknown

`pi-advisor` 在主 agent 的每一轮结束后运行第二模型，用于发现具体错误、遗漏的约束、脆弱设计和可能浪费的工作。

Advisor 可以看到最近的用户提示、assistant 消息、工具调用和工具结果；可以用隔离的只读工具检查项目；主 agent 正常时保持静默；需要提示时发送一条 `nit`、`concern` 或 `blocker` 建议。它不能编辑文件、执行命令或修改 session 状态。

Advisor 使用 Pi 现有的模型注册表和 provider 认证，不管理独立 API key。
