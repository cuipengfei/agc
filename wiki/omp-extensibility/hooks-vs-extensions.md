# OMP Hooks vs Extensions

> Sources: OMP upstream source code
> Raw: [OMP Hooks vs Extensions 源码取证](../../raw/omp-extensibility/2026-09-09-hooks-vs-extensions-source.md); [OMP Extension 与 Hook 关系修正](../../raw/omp-extensibility/2026-09-09-extension-hook-relationship.md)
> Updated: 2026-09-09

## 结论

Extension 覆盖 HookAPI 的全部用例，并增加 `registerTool` / `registerProvider` / 更宽的 runtime context。Hook 是 legacy 兼容层，由同一个 extension runner 承载。新开发用 ExtensionAPI。

## 能力对比

| 能力 | Extension | Hook |
|---|---|---|
| `pi.on(...)` 事件 handler | ✅ | ✅ |
| `pi.sendMessage(...)` / `pi.appendEntry(...)` | ✅ | ✅ |
| `pi.registerCommand(...)` | ✅ | ✅ |
| `pi.registerMessageRenderer(...)` | ✅ | ✅ |
| `pi.exec(...)` | ✅ | ✅ |
| `pi.registerTool(...)` | ✅ | ❌ |
| `pi.registerProvider(...)` | ✅ | ❌ |
| 完整生命周期管理 | ✅ | ❌ |

## 运行时

- `--hook` 是 `--extension` 的 CLI 别名
- Hook 模块由 extension runner 加载
- 两套 factory/API 不是完全 drop-in（Extension 用 `ExtensionAPI`，Hook 用 `HookAPI`）

## 选型

- **新开发 → ExtensionAPI**
- **旧模块维护 → HookAPI 继续用**
- 不要声称 Extension 是 Hook 的"严格超集"——能力覆盖成立，但 API 不 drop-in

## See Also

- [OMP Extension 与 TTSR：执行护栏的分层方法](../omp-ttsr/extension-and-ttsr-layering.md) — Extension 的具体职责与生命周期
