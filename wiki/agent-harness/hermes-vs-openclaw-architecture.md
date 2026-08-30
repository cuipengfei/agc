# Hermes vs OpenClaw：同模型表现差异的架构原因

> Sources: fp8.co; Turing Post; flowtivity.ai; Medium; rasskazov.io，2026-08-30
> Raw: [多源研究摘录](../../raw/agent-harness/2026-08-30-hermes-vs-openclaw.md)
> Updated: 2026-08-30

## 结论

相同模型、相同 provider 下 OpenClaw 比 Hermes "粗心"，是已验证的普遍现象。原因不在模型，在 prompt 工程与上下文架构。

## 5 个架构差异

1. **System prompt 结构**：OpenClaw 约 25 个平铺 section；Hermes 9 层递进组装
2. **技能加载**：Hermes 渐进式 3 层披露（50K → 300 tokens）；OpenClaw 接近全量
3. **上下文压缩**：Hermes 5 阶段流水线且先剪枝工具输出噪音；OpenClaw chunk-split-summarize-merge
4. **记忆冻结**：Hermes session 开始冻结 memory snapshot，prompt cache 稳定，输入成本降约 75%；OpenClaw 每轮重建
5. **用户建模**：Hermes 有 Honcho dialectic user modelling；OpenClaw 无自动建模

## 定位

OpenClaw 是 gateway-first（40+ 消息平台、5 万+ 技能市场）；Hermes 是 agent-first（一切为思考质量优化）。选哪个取决于你要连接广度还是单任务质量。

## See Also

- [Harness 格式与上下文载体](../harness-engineering/harness-formats-and-context-carriers.md) — harness 上下文设计模式
- [四 AI Coding Agent 对比](../ai-coding-agents/4-agent-comparison.md) — 本机四套 agent 的对比
