# OMP Shake 机制：外科式上下文裁剪

> Sources: OMP upstream source code（本地树 HEAD 73a11421fe，v18.2.11-58）
> Raw: [Compaction 阈值与 Shake 机制源码取证](../../raw/omp-config/2026-10-01-compaction-threshold-and-shake-mechanics.md)
> Updated: 2026-10-01

## 结论

shake 不调用 LLM，按区域把重内容替换成占位符（`[shaken ~N tokens — recover: artifact://…]`，原文写入 artifact 可回收）。对话散文骨架完整保留；被裁的是 tool result 正文和消息文本里的大块代码/XML。

## 裁剪对象（collectShakeRegions）

1. **Tool result 正文**：整体替换为占位符。跳过：受保护工具（skill、skill read、artifact recovery 读取）、已 prune 的、`isError` 的。
2. **消息文本中的大块**：user / developer / assistant / custom 消息的 text 里，≥400 token（`fenceMinTokens`）的 fenced code block 与顶层 XML 段。块外文字原样不动。

边界：

- 最近 `protectTokens` 的上下文整体保护（自动档 16000、手动 `/shake` 档 4000、rescue 档 0）。
- `useless === true` 且非错误的 tool result 即使在保护窗内也照裁。
- `toolCall` 块永远不碰，call/result 配对保持完整；区域不跨消息边界。
- 最近一次 compaction boundary 之前的 entry 跳过（那些内容已被摘要取代）。
- XML 检测保守：只认小写标签名的顶层段，大写/混写忽略。
- 总节省估计低于 `minSavings`（自动档 4000）时整体 no-op。

## 三档预设

| 预设 | 用途 | protectTokens | minSavings | 保护工具 |
|---|---|---|---|---|
| DEFAULT | 自动 shake | 16000 | 4000 | skill、skill read、artifact recovery |
| AGGRESSIVE | 手动 `/shake` | 4000 | 0 | skill、skill read |
| RESCUE | 压缩死路自救 | 0 | 0 | 同 AGGRESSIVE + artifact recovery |

手动档保留 4000 尾部是为不撕掉 agent 正在用的 tool result（issue #7776）。

## 变体与对比

`/shake` 三种模式：elide（默认）/ images / thinking，均无 LLM 调用。

与 compact 对比：shake 按区域撕重内容、骨架（全部对话文字）留着；compact 把旧消息整体替换成 LLM 摘要，只留摘要加最近 `keepRecentTokens`（默认 20000）的原文。

`protectTokens: 16000` 与模型输出上限无关：该常量在 shake 引入提交（417a1a1d32，2026-05-31）中即为字面量，全仓库无从 `model.maxTokens` 派生的路径，提交记录未留取值理由。

## See Also

- [OMP 内置 slash 命令全量枚举](builtin-slash-commands.md) — /shake 行与十问补遗
- [OMP Compaction 阈值解析机制](../omp-config/compaction-threshold.md) — 何时触发自动压缩
- [OMP Advisor 上下文标记](../omp-config/advisor-context-markers.md) — advisor 侧 shaken 占位符与 evictStaleResults 的区别
