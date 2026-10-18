# Paseo — OMP provider、Web host 列与 self-host 源码摘录

> Source: https://github.com/getpaseo/paseo/tree/fcda2f1cf0a36a2e81583a5616773321918b2de4 (official source)
> Collected: 2026-10-18
> Published: 2026-10-18 (source commit date not separately verified)

## packages/protocol/src/provider-manifest.ts

```ts
{
  id: "omp",
  label: "Oh My Pi",
  description: "Multi-provider coding agent with native approvals, host tools, and subagents",
  enabledByDefault: false,
```

## packages/server/src/server/agent/provider-registry.ts

```ts
import { OmpAgentClient } from "./providers/omp/agent.js";

omp: (logger, runtimeSettings, options) =>
  new OmpAgentClient({
    logger,
    runtimeSettings,
    runtime: options?.ompRuntime,
```

## packages/server/src/server/agent/providers/omp/cli-runtime.ts

```ts
const DEFAULT_OMP_COMMAND: [string, ...string[]] = [process.env.OMP_COMMAND ?? "omp"];

async compact(customInstructions?: string): Promise<void>
async setAutoCompaction(enabled: boolean): Promise<void>
async getState(): Promise<OmpSessionState>
async setFastMode(enabled: boolean): Promise<{ enabled: boolean; active: boolean }>
async getMessages(): Promise<OmpAgentMessage[]>
async getAvailableModels(timeoutMs?: number | null): Promise<OmpModel[]>
async setModel(provider: string, modelId: string): Promise<OmpModel>
async setThinkingLevel(level: OmpThinkingLevel): Promise<void>
async getSessionStats(): Promise<OmpSessionStats>
async setSubagentSubscription(level: OmpSubagentSubscriptionLevel): Promise<void>
async setHostTools(tools: OmpRpcHostToolDefinition[]): Promise<string[]>
async branch(entryId: string): Promise<{ text: string }>
async getBranchMessages(): Promise<Array<{ entryId: string; text: string }>>
async steer(message: string, images?: Array<{ type: "image"; data: string; mimeType: string }>): Promise<void>
async handoff(customInstructions?: string): Promise<void>
```

## packages/app/src/components/agent-list.tsx

```tsx
{showHostColumn && agent.serverLabel ? (
  <>
    <Text style={styles.sessionMetaSeparator}>·</Text>
    <Text style={styles.sessionMetaText} numberOfLines={1}>
      {agent.serverLabel}
    </Text>
  </>
) : null}

{showHostColumn ? (
  <Text style={styles.columnMetaHost} numberOfLines={1}>
    {agent.serverLabel}
  </Text>
) : null}
```

## docs/docker.md

Paseo publishes a container image for running the daemon on a server, VM, NAS, or homelab box. The image also serves the bundled browser web UI, so one container gives you both the daemon API and a self-hosted UI.

The image:

- builds `@getpaseo/server` and `@getpaseo/cli` from source-built workspace tarballs
- runs the daemon as the non-root `paseo` user
- listens on `0.0.0.0:6767` inside the container
- enables the bundled daemon web UI with `PASEO_WEB_UI_ENABLED=true`
- stores daemon state and agent credentials under `/home/paseo`
- leaves agent CLIs out of the base image
