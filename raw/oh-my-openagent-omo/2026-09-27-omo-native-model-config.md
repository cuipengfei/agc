# OMO native 模型配置结构与 senpi adapter 集合

> Source: 本机实测（omo-ai 5.0.0 / engine senpi 2026.9.26），2026-09-27
> Collected: 2026-09-27
> Published: 2026-09-27

本机一手直读与真解析库（json5、pyyaml，经 uv 临时环境）交叉校验记录。凭据全程走 RAM 脚本读写，不进上下文；本文件只记 provider 名、model id、api 值、baseUrl host，不含任何 apiKey 或带 key 的 url。

## native 模型配置文件位置

- OMO native（omo-ai）读取 `~/.omo/agent/models.json`。
- senpi dist 内 `ModelConfig.loadSync(modelsJsonPath)` / `getProvider` 从该文件读 provider。
- 该文件是否为 native 唯一生效来源未定：dist 内另有代码级 `registerProvider`（extension/native provider 注册），本会话未追完加载链。

## provider-per-API 结构（按 API 协议分别配置 provider）

opencode 与 OMP 都把同一个 localhost:8787 网关按 API 协议分别配置为多个 provider：

- opencode：`4140`（npm `@ai-sdk/openai`，走 Responses）+ `4140-chat`（npm `@ai-sdk/openai-compatible`，走 chat completions）。
- OMP：`c8787`（api `openai-responses`）+ `c8787-chat`（api `openai-completions`）+ `openai-codex`（api `openai-codex-responses`，仅挂 gpt-5.6-luna）。

## 本会话写入 native models.json 后的 5 provider

| provider | api | baseUrl | models |
|---|---|---|---|
| c8787 | openai-responses | http://localhost:8787/v1 | gpt-5.4, gpt-5.5, gpt-5.3-codex, gpt-5.4-mini, gpt-5.6-sol, gpt-5.6-terra, gpt-5.6-luna, gpt-6-luna, gpt-6-sol |
| c8787-chat | openai-completions | http://localhost:8787/v1 | gemini-3.7-flash, gemini-3.8-flash, kimi-k2.7-code |
| umans | anthropic-messages | https://api.code.umans.ai | umans-kimi-k2.7, umans-glm-5.2, umans-coder, umans-glm-5.2-nvfp4, umans-flash, umans-qwen3.6-35b-a3b |
| justwoker | anthropic-messages | https://api.justwoker.icu | claude-opus-4-8 |
| kimi-claw | anthropic-messages | https://agent-gw.kimi.com/coding | k3-agent, k2d8-preview |

交叉校验：c8787（9 个 responses）/ c8787-chat（3 个 completions）的 model id 分组与 OMP 完全一致；12 个模型的 contextWindow/maxTokens 与 opencode 源逐条一致。

## 8787 与 4140 是同一后端

opencode 里名为 `4140` 的 provider，其 `baseURL` 指向 `http://localhost:8787/v1`。`4140` 只是 provider 标识，baseURL 指向 localhost:8787。两者打到同一个本地网关；区别在 API 路径与协议。

## senpi 支持的 api 取值（native 吃这套）

- senpi dist 有独立 adapter chunk：`openai-responses-*.js`、`openai-codex-responses-*.js`、`azure-openai-responses-*.js`、`mistral-conversations-*.js`；`openai-completions` 走内置 OpenAI 客户端。
- `docs/models.md` 明列 `openai-completions`、`openai-responses`、`anthropic-messages` 为合法 api，示例 baseUrl 用 `.../v1`。
- 这套 api 值与 pi-ai 的 `BUILTIN_API_IDS` 一致（senpi 是 Pi 的 fork）。

## baseUrl 必须带 /v1

senpi 内置 OpenAI SDK 用 `this.baseURL = options.baseURL` 再追加 `/chat/completions`、`/responses`，不自动补 `/v1`。所以 openai-responses / openai-completions 的 baseUrl 必须自带 `/v1`（`http://localhost:8787/v1`），实际打 `/v1/responses` 与 `/v1/chat/completions`。anthropic-messages 的 justwoker/kimi-claw baseUrl 去掉尾部 `/v1`，与 OMP 一致。

## migrations-state.json 只搬目录与 session

`~/.omo/agent/migrations-state.json`：
```
{"schemaVersion": 1, "completed": ["migrateLegacySenpiDirs", "migrateSessionsFromAgentRoot"]}
```
只完成两项：收编旧 senpi 目录、把 sessions 从 agent 根搬走。无任何 `.pi`→`.omo` 迁移条目，也无模型定义迁移。该文件无时间戳，迁移执行时点与因果不可证。

## ~/.omo/omo.jsonc 是悬空 symlink

`~/.omo/omo.jsonc` 的目标字面值含字面 `~`（`~/.config/opencode/.omo/omo.jsonc`）。文件系统不展开 `~`，按相对目录解析成不存在的路径，故为悬空链接，不能作为「OMO 配置耦合 OpenCode」的证据。真实 opencode 配置独立存在于 `/home/cpf/.config/opencode/opencode.jsonc`。

## 未验证

- native 是否实际吃 openai-responses/completions 打到 :8787：源码支持，未发真请求实测（用户明确不做冒烟）。
- models.json 是否为 native 唯一生效来源：存在代码级 registerProvider，加载链未追完。
