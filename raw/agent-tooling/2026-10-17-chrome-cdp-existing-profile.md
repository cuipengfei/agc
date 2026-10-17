# Chrome 现有 profile 的 auto-connect 文档摘录

> Source: [Chrome 官方 auto-connect 文档](https://developer.chrome.com/docs/devtools/agents/use-cases/auto-connect)；2026-10-17 当前会话的浏览器授权问答
> Collected: 2026-10-17
> Published: 2026-10-12

## 用户问题

用户询问 CDP 能否复用正常使用的 Chrome profile，减少重复登录。此问题属于授权辅助方式调查，本次没有修改 CDP 配置，也没有验证 WSL 到 Windows 的 auto-connect。

## 官方原文摘录

> Chrome 144+: Auto-connect requires modern debugging protocols found in current versions of Chrome.

> In your running Chrome browser, navigate to `chrome://inspect/#remote-debugging` and enable remote debugging.

> You must update the MCP configuration to include the `--autoConnect` flag.

> When Chrome asks for permission to allow the session, click Allow.

> When auto-connect is active, your agent has access to all data in your browser profile, including open tabs, session storage, local storage, cookies, and other data surfaced through JavaScript APIs.

文档还说明默认发送 usage statistics 与 performance trace URLs；分别可通过 `--no-usage-statistics` 和 `--no-performance-crux` 选择退出。

## 使用范围

官方机制允许经用户批准复用正在运行的 Chrome 状态。它可用于浏览器授权和页面调查；本次 SOFA 原生 MCP 的日常调用与凭据刷新不依赖 CDP。

没有保存浏览器 profile 路径、用户数据、标签页列表、cookies、调试连接标识或任何登录状态。
