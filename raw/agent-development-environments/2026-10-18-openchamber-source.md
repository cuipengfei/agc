# OpenChamber — OpenCode 架构依赖源码摘录

> Source: https://github.com/openchamber/openchamber/tree/4c72c0fa26ca660ab9d41350885444ee2130d471 (official source/docs)
> Collected: 2026-10-18
> Published: 2026-10-18 (source commit date not separately verified)

## .agents/skills/opencode-v2/SKILL.md

OpenChamber moved from the OpenCode 1.x API to 2.x in one cutover (PR #3837, 2026-09). Everything OpenCode-facing speaks 2.x: routes under `/api/*`, one global `/api/event` stream of `session.*` events, sessions as cursor-paged lists, messages with their parts inline, plugins hot-reloaded from watched config, `@opencode/client` + `@opencode/schema` as the only SDK. A bug report that mentions 1.x behaviour (`/session` without `/api`, `message.updated` events, `auth.json`, `@opencode-ai/sdk`) describes the old world; answer from the 2.x code, not from memory of 1.x.

### Where the boundary lives

- `packages/ui/src/lib/opencode/client.ts` — every official OpenCode call the shared UI makes; `projection.ts` turns wire shapes into the OpenChamber domain model in `model.ts`; `events.ts` translates wire events; `plugins.ts` translates the experimental plugin routes; `session-stats.ts` translates the experimental `session.stats` usage route; `websearch.ts` translates web search (providers, the `websearch` config choice, keys, the tool's text result and its first-use consent form). These files are the only place that knows 2.x wire shapes. Rendering and stores read the domain model; fix a missing field there, never with a shim.
- `packages/web/server/lib/opencode/proxy.js` forwards `/api/*` as-is (2.x serves under `/api` itself) and folds OpenChamber-owned session state into the records it serves. `env-runtime.js` launches `opencode serve`.
- Plugins OpenChamber generates for OpenCode: `plugin-spec.js` and `agent-tool/runtime.js`, declared through the watched `<dataDir>/opencode.managed.json` (`OPENCODE_CONFIG`), so a settings change applies without a restart. Only the binary, port and external toggle restart.

## .agents/skills/ui-api-decoupling/SKILL.md

- Official OpenCode API calls use `@opencode/client` (OpenCode 2.x, `/api/*` routes) through `opencodeClient`; only `packages/ui/src/lib/opencode/` may see wire types, everything else uses the domain model in `lib/opencode/model.ts`.

## 检索边界

在本地完整浅克隆中对 `oh.my.pi`、`oh-my-pi`、OMP、Pi、ACP 与 custom agent 相关模式检索，未定位到 OMP/Pi/ACP 后端注册或启动路径。此句记录检索边界，不证明不存在其他适配方式。
