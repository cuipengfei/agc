# OMP Extension 与 Hook 关系修正

> Source: can1357/oh-my-pi upstream
> Collected: 2026-09-09

## 关键文件

### docs/extensions.md

`docs/extensions.md:29-36` — Extension 能力包含 event handlers、tools、commands、renderers、injection APIs。

`docs/extensions.md:740-748` — Extension 是 unified system；Hooks 是 separate legacy event API。

### docs/hooks.md

`docs/hooks.md:43-51` — HookAPI 能力：
- `pi.on(...)`
- `pi.sendMessage(...)`
- `pi.appendEntry(...)`
- `pi.registerCommand(...)`
- `pi.registerMessageRenderer(...)`
- `pi.exec(...)`

`docs/hooks.md:1-15` — `--hook` 是 `--extension` 的 CLI 别名，Hook 由 extension runner 加载。

## 修正点

原表述 "Extension 是 Hook 的严格超集" 过于简化。实际关系：

- Extension 覆盖 documented HookAPI 的全部用例
- Extension 额外有 `registerTool` / `registerProvider` / 更宽的 runtime context
- 两套 factory/API 不是完全 drop-in（Extension 用 `ExtensionAPI`，Hook 用 `HookAPI`）
- Hook 是 legacy 兼容层，由同一个 extension runner 承载
