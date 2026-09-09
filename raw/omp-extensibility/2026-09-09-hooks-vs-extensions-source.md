# OMP Hooks vs Extensions 源码取证

> Source: can1357/oh-my-pi upstream
> Collected: 2026-09-09

## 关键文件

### docs/extensions.md

`docs/extensions.md:29-36` — Extension 能力：
- event handlers (`pi.on(...)`)
- LLM-callable tools (`pi.registerTool(...)`)
- slash commands (`pi.registerCommand(...)`)
- keyboard shortcuts and flags
- custom message rendering
- session/message injection APIs (`sendMessage`, `sendUserMessage`, `appendEntry`)

`docs/extensions.md:740-748` — Extension 是 unified system。

### docs/hooks.md

`docs/hooks.md:43-51` — HookAPI 能力：
- `pi.on(...)`
- `pi.sendMessage(...)`
- `pi.appendEntry(...)`
- `pi.registerCommand(...)`
- `pi.registerMessageRenderer(...)`
- `pi.exec(...)`

`docs/hooks.md:1-15` — `--hook` 是 `--extension` 的 CLI 别名，Hook 由 extension runner 加载。

### extensions/types.ts

`packages/coding-agent/src/extensibility/extensions/types.ts:1402-1405`：
- `registerMessageRenderer`
- `registerAssistantThinkingRenderer`

## 结论

- Extension 覆盖 HookAPI 的全部用例
- Extension 额外有 `registerTool` / `registerProvider` / 更宽的 runtime context
- Hook 是 legacy event API，由同一个 extension runner 承载
- 新开发用 ExtensionAPI
