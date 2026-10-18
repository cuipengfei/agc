# Ekko Studio — Coding runtime 定义摘录

> Source: https://github.com/EKKOLearnAI/ekko-studio/tree/dfca4ba7f9cd9c5ad66187eb326301043e097898 (official source/docs)
> Collected: 2026-10-18
> Published: 2026-10-18 (source commit date not separately verified)

## docs/harness/server-module-boundaries.md

| Concept | Allowed values | Meaning |
| --- | --- | --- |
| `AgentFamily` | `hermes`, `ekko`, `coding` | Product/domain owner of an agent implementation. |
| `AgentRuntime` | `hermes`, `ekko`, `claude-code`, `codex`, `pi`, `grok`, `opencode`, `dsh`, `cursor`, `antigravity`, `qwen`, `kimi`, `codebuddy`, `qoder`, `copilot`, `zcode` | Concrete runtime selected for a run. |
| `RunSurface` | `chat`, `workflow`, `group-chat`, `global-agent`, `api` | Studio surface that initiated a run. |
| `RunMode` | `scoped`, `global` | Whether the run is workspace/profile scoped or global. |

Hermes and Ekko are both a family and a runtime. Claude Code, Codex, Pi, Grok, OpenCode, DSH, Cursor, Antigravity, Qwen Code, Kimi Code, CodeBuddy, Qoder, GitHub Copilot, and ZCode are fourteen runtimes in the Coding family. Persist and transport these concepts separately whenever a schema is introduced or revised.

## packages/client/src/api/coding-agents.ts

```ts
export type CodingAgentId = 'claude-code' | 'codex' | 'pi' | 'grok' | 'opencode' | 'dsh' | 'cursor' | 'antigravity' | 'qwen' | 'kimi' | 'codebuddy' | 'qoder' | 'copilot' | 'zcode'
```
