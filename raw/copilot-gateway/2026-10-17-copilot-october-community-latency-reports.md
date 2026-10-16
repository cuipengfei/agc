# 2026 年 10 月 Copilot 用户延迟报告摘录

> Source: https://github.com/microsoft/vscode/issues/341543 ; https://github.com/github/copilot-cli/issues/5143 ; https://github.com/github/copilot-cli/issues/5054 ; https://www.reddit.com/r/GithubCopilot/comments/1x6i9r8/ ; https://www.reddit.com/r/GithubCopilot/comments/1x7f8pf/
> Collected: 2026-10-17
> Published: 2026-10-05 至 2026-10-16

以下只摘录与等待有关的公开用户叙述；不收录作者名称、设备资料、会话标识或截图。Reddit 正文取自本次会话读取的公开存档。各条分别描述不同客户端或工作流程。

## VS Code Copilot harness（2026-10-14）

来源：https://github.com/microsoft/vscode/issues/341543

- 发帖人：“After updating VSCode, 1.141.1, Copilot takes several minutes evaluating very simple messages, like "Nice, thanks"”。
- 一位回复者：“VS Code 1.140.0 + Copilot harness → normal/fast”; “VS Code 1.141.2 + Copilot harness → very slow”; “VS Code 1.141.2 + Local harness → normal/fast again”。该回复认为可能与 Copilot harness 路径有关，未声称已测得模型服务端延迟。
- 发帖人报告禁用 GitKraken MCP server 并卸载 GitLens 后恢复；另有回复表示禁用 GitLens 或所有 MCP 后仍感觉慢。不同用户的原因不可合并。

## Reddit 用户报告（公开存档正文）

- 2026-10-15，https://www.reddit.com/r/GithubCopilot/comments/1x6i9r8/ ：标题 “Super slow reasoning from latest update?”；正文：“My copilot chat is stuck for minutes and minutes, especially repeated 'This is taking a little longer than usual'.” 报告与 VS Code 中的 chat 使用有关，没有给出逐请求的 token 计数与时间。
- 2026-10-16，https://www.reddit.com/r/GithubCopilot/comments/1x7f8pf/ ：标题 “Copilot is slow and doing a terrible job today”；正文：“Usually the prompts I give it take 10-15 mins at most. Today it took over an hour.” 作者怀疑 Auto 路由改变，但未提供可核验的路由记录。

## CLI 工作流程报告

- 2026-10-14，https://github.com/github/copilot-cli/issues/5143 ：发帖人称发送给空闲后台 agent 的追问需等待 6.5、9.2 分钟，长会话里约 8.5 小时；正文明确说后台 agent 跟进派发延迟，使用的是 Claude Opus 5.5。关于事件流造成延迟的说法为发帖人的推测。
- 2026-10-05，https://github.com/github/copilot-cli/issues/5054 ：发帖人报告大上下文及 xhigh 设置下自动压缩反复在 300 秒后超时；131 次压缩尝试中 110 次失败，涉及 gpt-6-astra。该记录测量的是压缩工作流程，无法推导 gpt-6.1-sol 的响应速度。
