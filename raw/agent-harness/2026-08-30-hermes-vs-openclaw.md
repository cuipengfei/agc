# Hermes Agent vs OpenClaw：同模型表现差异的多源研究摘录

> Source: fp8.co 深度对比; Turing Post; flowtivity.ai; Medium 迁移帖; rasskazov.io 俄语对比（多源独立对比文章/视频）
> Collected: 2026-08-30
> Published: Unknown

## 研究问题

相同模型、相同 provider、相同 URL 下，OpenClaw 感觉粗心、Hermes 更细心更彻底——是否普遍现象，为什么。

## 结论

不是模型问题，是 prompt 工程与上下文架构差异。多个独立对比文章/视频存在，属已验证的普遍现象。

## 5 个关键架构差异

1. **System prompt 结构**：OpenClaw 约 25 个平铺 section + cache boundary；Hermes 9 层递进组装
2. **技能加载**：Hermes 渐进式 3 层披露（50K → 300 tokens，省 99%）；OpenClaw 更接近全量加载
3. **上下文压缩**：OpenClaw chunk-split-summarize-merge；Hermes 5 阶段流水线，Phase 1 先剪枝工具输出噪音
4. **记忆冻结**：Hermes 在 session 开始冻结 memory snapshot（prompt cache 稳定，输入成本降约 75%）；OpenClaw 动态内容每轮重建
5. **用户建模**：Hermes 有 Honcho dialectic user modelling（学习用户偏好）；OpenClaw 文件式记忆无自动建模

## 一句话定位

OpenClaw 是 gateway-first（擅长连接 40+ 消息平台、5 万+ 技能市场）；Hermes 是 agent-first（一切为 agent 思考质量优化）。
