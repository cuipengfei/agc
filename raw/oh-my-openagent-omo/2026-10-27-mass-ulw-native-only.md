# OMO mass ulw 独立版专属证据

> Source: https://github.com/code-yeongyu/oh-my-openagent at `dae751220877887a6475ec9c1a60439b3cab1f6e` (dev); files: `packages/omo-senpi/skills/mass-ulw/SKILL.md`, `packages/omo-opencode/src/hooks/keyword-detector/constants.ts`; GitHub code search for `mass-ulw` and `tool.workflow` in `packages/omo-opencode`
> Collected: 2026-10-27
> Published: Unknown

## mass-ulw skill 的位置与自述

`packages/omo-senpi/skills/mass-ulw/SKILL.md` frontmatter：

```yaml
name: mass-ulw
description: "Drives dependency-ordered child work through the native workflow tool, each phase's stages defined up front in one run, with retry/amend/send recovery. Use when the user asks for mass-ulw, a DAG of tasks, or fan-out work where some tasks must wait on others."
metadata:
  short-description: Dependency-graph orchestration of child agents
```

正文：

> Build and run every dag INSIDE an eval cell.

> JS cells import the SDK from the path the extension publishes:

```js
const sdk = await import(`${env("OMO_DAG_SDK_ROOT")}/sdk.js`)
```

> Python cells cannot import the ESM SDK; call `tool.workflow({...})` directly with the same payload shape the SDK produces.

## 插件版关键词列表

`packages/omo-opencode/src/hooks/keyword-detector/constants.ts`：

```ts
export const KEYWORD_DETECTORS: KeywordDetector[] = [
  { type: "ultrawork", pattern: ULTRAWORK_PATTERN, message: getUltraworkMessage },
  { type: "team", pattern: TEAM_PATTERN, message: TEAM_MESSAGE },
  { type: "hyperplan", pattern: HYPERPLAN_PATTERN, message: HYPERPLAN_MESSAGE },
  { type: "hyperplan-ultrawork", pattern: HYPERPLAN_ULTRAWORK_PATTERN, message: getHyperplanUltraworkMessage },
]
```

列表中没有 `mass-ulw`。

## 代码搜索

- `mass-ulw path:packages/omo-opencode`：0 条结果。
- `tool.workflow path:packages/omo-opencode`：0 条结果。
- `mass-ulw` 的源码命中集中在 `packages/omo-senpi/`、`docs/` 与 `packages/web/`。

## 结论边界

- 以上证明插件版没有内置 `mass ulw` 与 `workflow` 工具。
- 若插件版额外安装了自定义 `workflow` 工具或 MCP，理论上有接入可能；本轮未验证，也不属于内置能力。
- 未实际运行独立版 `mass ulw`，只读源码与文档。
