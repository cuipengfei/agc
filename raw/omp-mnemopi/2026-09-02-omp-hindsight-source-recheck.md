# OMP Hindsight/Sharpshooter 源码复核（v18.1.3）

> Source: 本机 `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent`，直接读取
> Collected: 2026-09-02
> 用途：对 `wiki/omp-mnemopi/memory-backends-comparison.md` 做语义复核，核对 2026-09-01 写入的行号与数值在当前版本下是否仍成立

## 版本

`package.json` 的 `version` 字段：

```
18.1.3
```

2026-09-01 首次编译该文时本地为 v18.0.11，此后已升级。原文的行号锚点需按 v18.1.3 重新核对。

## `memory.backend` 枚举

`src/config/settings-schema.ts:2946-2952`：

```
2946: 	// Mnemopi local SQLite, Hindsight remote memory, Sharpshooter project
2947: 	// decisions, or off. The legacy
2948: 	// `memories.enabled` flag is migration input only; see config/settings.ts.
2949: 	"memory.backend": {
2950: 		type: "enum",
2951: 		values: ["off", "local", "hindsight", "mnemopi", "sharpshooter"] as const,
2952: 		default: "off",
```

枚举值列在 `:2951`，`:2950` 是 `type` 行。

## `recallTypes` 默认值

`src/config/settings-schema.ts:406`：

```
406: const HINDSIGHT_RECALL_TYPES_DEFAULT: string[] = ["world", "experience"];
```

`src/config/settings-schema.ts:3386-3389`：

```
3386: 	"hindsight.recallMaxTokens": { type: "number", default: 1024 },
3387: 	"hindsight.recallContextTurns": { type: "number", default: 1 },
3388: 	"hindsight.recallMaxQueryChars": { type: "number", default: 800 },
3389: 	"hindsight.recallTypes": { type: "array", default: HINDSIGHT_RECALL_TYPES_DEFAULT },
```

默认召回类型是 **两类**：`world`、`experience`。

## `TEMPR` 检索：源码中不存在

对 `src/hindsight/` 全目录做大小写不敏感匹配 `tempr|temporal.*procedural|four.*retriev`，命中的全部是 mental-model 相关行（`backend.ts:257-263`、`state.ts:477-540` 的 `refreshMentalModelsSnippet` / `#refreshBaseSystemPromptAfter`），**无任何 TEMPR 或四路召回的实现或注释**。

## `retainOverlapTurns` 的生效分支

`src/hindsight/state.ts:342-356`：

```
342: 			const newMessages = messages.slice(this.#lastRetainedMessageIndex);
343: 			const { transcript: newPart } = prepareRetentionTranscript(newMessages, true, { includeTimestamps: true });
344: 			if (!newPart) return;
345: 			nextCachedTranscript = this.#cachedTranscript ? `${this.#cachedTranscript}\n\n${newPart}` : newPart;
346: 			transcript = nextCachedTranscript;
347: 		} else {
348: 			const windowTurns = this.config.retainEveryNTurns + this.config.retainOverlapTurns;
349: 			const target = sliceLastTurnsByUserBoundary(messages, windowTurns);
```

`retainOverlapTurns` 只出现在 `:347` 的 `else` 分支内，即 `last-turn` 路径；`full-session` 路径（`:342-346`）不读该值。原文结论成立。

## Sharpshooter 提取模型解析

`src/sharpshooter/extract.ts:163-168`：

```
163: 		logger.debug("Sharpshooter extraction model selector did not resolve", { selector });
164: 	}
165:
166: 	const fallback = resolveRoleSelection(["smol"], settings, modelRegistry.getAvailable())?.model;
167: 	if (!fallback) logger.debug("Sharpshooter extraction skipped: no model available");
168: 	return fallback;
```

`:166` 的 `smol` 解析处于 selector 解析失败之后，是 **fallback 分支**，不是唯一路径。

## Sharpshooter 检索能力

`src/sharpshooter/backend.ts:153-158`：

```
153: 			backend: "sharpshooter",
154: 			active: true,
155: 			writable: false,
156: 			searchable: true,
157: 			scope: sharpshooterBankId(cwd),
```

`src/sharpshooter/backend.ts:223`：

```
223: 	async search({ agentDir, cwd }, query, options) {
```

## Sharpshooter 引入日期（gh api）

`gh api repos/can1357/oh-my-pi/commits/ffee26b87d07142c023e02112622477ebf28d366`：

```
2026-08-28T16:53:07Z  feat(coding-agent): added Sharpshooter project decision memory backend
```

`wiki` 文章里的 `2026-08-28` 引入日期此前只有 commit SHA 支撑、没有日期原文，本次补齐。

## 无 Mnemopi → Hindsight 迁移代码

遍历 `src/hindsight/` 与 `src/mnemopi/` 下全部 `.ts` 文件，按 `migrat|importFromMnemopi|fromMnemopi` 大小写不敏感匹配文件内容：

```
hindsight/mnemopi 目录中含 migrat/fromMnemopi 的文件: 无
```

原文「全文搜 `migrate|import`」的表述不构成证据——`import` 会匹配所有 TypeScript import 语句。本次改用上述可复核的检查方式。

## 未验证项

- Hindsight 服务端写入接口（endpoint 路径与 payload schema）：本次未查官方 API 文档，未发请求
- reranker 有无对召回质量的影响：官方无对比基准，本机未实测
- Hindsight 服务端检索管线内部结构：不可从 OMP 客户端源码观测
