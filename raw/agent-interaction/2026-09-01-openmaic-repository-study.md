# OpenMAIC 仓库证据

> Source: https://github.com/THU-MAIC/OpenMAIC
> Collected: 2026-09-01
> Published: Unknown

> Commit: `f6cf8fd4b74ac83ea969e88b6dc2c974931b4d65`

## Confirmed

- README 记录 OpenMAIC v1.0.0 于 2026-08-27 发布，加入 Agent Workbench、durable sessions、skills、session materials、provider-neutral capabilities 与可插拔 persistence。
- `lib/server/agent-runtime/runner.ts` 的 `runSession` 组装课程、材料、媒体、Skill 和用户交互工具。
- `lib/chat/agent-loop.ts` 与 `lib/chat/pi/director-loop.ts` 分别承载标准聊天循环和 Pi Director 编排。
- Agent 通过 typed tools 修改版本化课程 DSL，再由 `@openmaic/renderer` 渲染。
- `RuntimeStore` 保存学习者会话中的运行时状态；课程文档与运行时投影被明确区分。
- 仓库包含课程规划、幻灯片、Quiz、PBL、研究、事实核查、风格复制等 20 个以上内置 Skill。
- `lib/persistence/server-auth.ts` 明确警告不能使用 `NEXT_PUBLIC_PERSISTENCE_TOKEN` 充当秘密；开发 token 不提供真正的用户隔离。
- 仓库实现 SSRF guard，但开放本地网络或新增绕过共享 fetch helper 的路由仍会扩大风险。

## Inference

该仓库最值得复用的不是“多个教师角色”，而是 `Agent → typed tools → versioned DSL → renderer` 的结构化产物链。
