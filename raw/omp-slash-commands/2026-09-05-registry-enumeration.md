# OMP 内置 slash 命令：注册表定位与全量枚举（取证记录）

> 日期：2026-09-05
> 版本锚点：本机全局安装 `@oh-my-pi/pi-coding-agent` **v18.1.10**（package.json `"version": "18.1.10"`）
> 源码根：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/`（包随附完整 TS 源码）

## 1. 两层架构（容易混淆，必须先分清）

- **`slashCommandCapability`（capability/slash-command.ts）是「文件型自定义命令」通道**：描述原文 "File-based slash commands defined as markdown files"（capability/slash-command.ts:2-4, 48-51），由各 discovery provider 从 `commands/` 目录加载 `.md`（如 `agents.ts:267-273` 从 `.agent/commands`、`.agents/commands` 项目级+用户级加载）。**这不是内置命令。**
- **内置命令的最终注册表是 `BUILTIN_SLASH_COMMAND_REGISTRY`**（slash-commands/builtin-registry.ts:38-45），由六个类别数组合并而成：

```ts
const BUILTIN_SLASH_COMMAND_REGISTRY: ReadonlyArray<SlashCommandSpec> = [
	...BUILTIN_MODE_SLASH_COMMANDS,
	...BUILTIN_COLLABORATION_SLASH_COMMANDS,
	...BUILTIN_SESSION_SLASH_COMMANDS,
	...BUILTIN_LIFECYCLE_SLASH_COMMANDS,
	...BUILTIN_MARKETPLACE_SLASH_COMMANDS,
	...BUILTIN_CONTROL_SLASH_COMMANDS,
];
```

- TUI 与 ACP 双通道：每个 spec 至少带 `handle` / `handleTui` 之一；「TUI dispatcher prefers `handleTui`; the ACP dispatcher requires `handle` and skips TUI-only entries」（builtin-registry.ts:109-114 注释）。
- `acp-builtins.ts` 只是对同一 registry 的过滤/派发（`ACP_BUILTIN_SLASH_COMMANDS = BUILTIN_SLASH_COMMANDS_INTERNAL.filter(c => c.handle !== undefined)`，acp-builtins.ts:37-38），**不是额外命令源**。

## 2. registry 之外的内置扩展命令（否则枚举不全）

- **bundled `/green`、`/review`**：`extensibility/custom-commands/loader.ts:154-171` `loadBundledCommands` 实例化 `GreenCommand`、`ReviewCommand`，source 标 `"bundled"`，最低优先级压入、可被用户/项目命令覆盖（loader.ts:198-202）。
- **SDK 注入 `/autoresearch`**：`sdk.ts:2133` `inlineExtensions.push(createAutoresearchExtension)`（在 `!restrictToolNames` 分支内，sdk.ts:2088），由 `autoresearch/index.ts:126` `api.registerCommand("autoresearch", …)` 注册。

## 3. 静态枚举方法与结果

方法：按 `\n\t{\n` 切分六个 `builtin-*.ts` 数组，取缩进两层的 `name:` 字段为顶层命令（子命令在更深缩进，不计入顶层数）。结果：

| 文件 | 顶层命令数 |
|---|---|
| builtin-modes.ts | 17 |
| builtin-collaboration.ts | 11 |
| builtin-session.ts | 19 |
| builtin-lifecycle.ts | 25 |
| builtin-marketplace.ts | 3 |
| builtin-control.ts | 4 |
| **core registry 合计** | **79** |
| bundled（green, review） | 2 |
| SDK 注入（autoresearch） | 1 |
| **总计** | **82** |

## 4. 运行时对账（非 TUI 途径）

- CLI 无列出 slash 命令的非交互子命令：`grep -l 'slash' src/commands/*.ts` 仅命中 `share.ts`（内容无关）。
- 采用 **dist bundle 字符串对账**：82 个名字在分发产物 `dist/cli.js` 中逐一验证——79 条 core 以 `name:"<cmd>"` 模式全部命中；green/review/autoresearch 以 `bundled:green` / `bundled:review` / `registerCommand("autoresearch"` 模式命中。**82/82 全部存在于运行时 bundle。**
- 边界：extension/hook 的 `registerCommand`（extensibility/extensions/loader.ts:197、hooks/loader.ts:117）是运行时动态通道，注册的命令随用户安装而变，不计入「内置」。

## 5. 已修正的枚举错误

- 初版扁平正则把 `/advisor` 的子命令误列了 `export`；Collab scout 核验 `acpInputHint` 与 `subcommands` 数组后确认**无 `export` 子命令**（见 2026-09-05-scout-collaboration.md /advisor 节）。
