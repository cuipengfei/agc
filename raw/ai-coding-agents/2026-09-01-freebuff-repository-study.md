# Freebuff 仓库证据

> Source: https://github.com/CodebuffAI/freebuff
> Collected: 2026-09-01
> Published: Unknown

> Commit: `4906b935553856625af6170d1a2fa9712c991a66`

## Confirmed

- `freebuff/SPEC.md` 定义 `FREEBUFF_MODE=true` 构建标志和 `IS_FREEBUFF` 常量；Freebuff 是同一代码库的免费产品构建。
- `sdk/src/impl/model-provider.ts:147` 用 `getWebsiteUrl()` 构造 `/api/v1` 请求地址。当前实现没有把任意 OpenAI-compatible base URL 暴露为用户配置。
- Agent runtime、文件工具和终端工具在本地运行；LLM 请求通过 Codebuff/Freebuff 服务地址。
- `agents/base2/base2.ts` 定义主编排 Agent 及 `spawn_agents`；专业 Agent 包括文件探索、Shell、编辑、审查、研究和上下文裁剪。
- `agents/context-pruner.ts` 通过专门 Agent 压缩消息历史；这是有损总结，不是无损持久记忆。
- `common/src/constants/freebuff-data-use.ts:21` 定义公开提示 `May use data for AI training`，并维护 Freebuff 数据使用说明。
- SDK 文件过滤会屏蔽常见 `.env` 文件，但 Shell 命令不受该文件读取过滤器约束。

## Inference

- 开源客户端和 runtime 不等于端到端可自托管：若 Codebuff 服务不可用，当前源码配置不能像 OpenCode 或 OMP 那样直接切换到任意本地 endpoint。
- terminal broker 解决进程和 TUI 协调，不等于 OS 或容器级沙箱。

## Unknown

- 托管后端内部的完整路由、留存和广告实现不在该公开仓库内，不能仅凭客户端源码完全审计。
