# OMP Compaction Model 与 Thinking Level 源码取证

> Source: can1357/oh-my-pi upstream
> Collected: 2026-09-09

## 关键文件

### model-controls.ts

`packages/coding-agent/src/session/model-controls.ts:285-291`：

```ts
if (thinkingLevel !== undefined) {
  this.setThinkingLevel(thinkingLevel);
} else {
  this.#reapplyThinkingLevel(targetModel.thinking?.defaultLevel);
}
```

### compaction.ts

`packages/coding-agent/src/compaction/compaction.ts:632-637` — `resolveCompactionEffort` 接收 `thinkingLevel` 和 `compactionModel`，输出经 `clampThinkingLevelForModel` 限制。

### session-maintenance.ts

`packages/coding-agent/src/session/session-maintenance.ts:2706-2710` / `:4067-4071` — compact 选项传入 `this.#host.thinkingLevel()`。

### role-models.ts

`packages/coding-agent/src/session/role-models.ts:34-51` / `:61-64` — `resolveConfiguredModelTarget()` 和 `resolveCompactionConfiguredTarget()` 返回 `Model`，不传播 `thinkingLevel`。

## 结论

- `compactionModel` 只解析模型 ID，不携带 effort
- compact 的 reasoning effort 来自当前 session 的 `thinkingLevel`
- 没有独立的 compactionModel effort 字段
