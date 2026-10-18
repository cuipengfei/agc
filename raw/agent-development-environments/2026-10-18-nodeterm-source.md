# Nodeterm — 内置 agents 与自定义能力边界源码摘录

> Source: https://github.com/eneskirca/nodeterm/tree/762a636e090a02dd184b77cc437d6d9096d19b43 (official source)
> Collected: 2026-10-18
> Published: 2026-10-18 (source commit date not separately verified)

## src/shared/agents/config.ts

```ts
export type BuiltinAgentId =
  | 'claude'
  | 'codex'
  | 'gemini'
  | 'opencode'
  | 'grok'
  | 'copilot'
  | 'antigravity'
  | 'cursor'

// Open type — custom agents are any string ('custom:<uuid>'). Never restrict the set.
export type AgentId = BuiltinAgentId | (string & {})

export const BUILTIN_AGENT_IDS: readonly BuiltinAgentId[] = [
  'claude',
  'codex',
  'antigravity',
  'gemini',
  'opencode',
  'grok',
  'copilot',
  'cursor'
]
```

Capabilities = const builtin membership lists. A custom agent resolves through its declared base harness (capabilityAgentId); one with no base automatically gets only spawn + terminal-title + process status.

A custom agent (`CustomAgent`, id `'custom:<uuid>'`) may declare a `baseAgent` — one of the builtins — to inherit that harness's CAPABILITIES (hooks, resume, permission modes, canvas control, session-id minting) and prompt convention. The use case is a harness-compatible CLI (e.g. a claude wrapper pointed at your own inference proxy) where you want to KEEP nodeterm's integrations.

## src/shared/agents/custom-agent.ts

```ts
const base = customAgent?.baseAgent ? AGENT_CONFIG[customAgent.baseAgent] : undefined
const launchCmd = customAgent?.launchCmd?.trim() || base?.launchCmd || id
```
