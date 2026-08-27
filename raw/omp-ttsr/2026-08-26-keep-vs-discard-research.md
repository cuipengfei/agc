---
source-url: https://github.com/can1357/oh-my-pi/issues/7182
collected: 2026-08-26
published: 2026-08-26
---

# TTSR keep vs discard 多源研究

## 官方文档

**来源**: `docs/ttsr-injection-lifecycle.md` (can1357/oh-my-pi)

```
contextMode: "discard"  # 默认
```

**机制**:
- `discard` 删除被中断的 assistant 消息（包括命中前正文）
- `keep` 保留被中断的 assistant 消息在上下文中

**设计意图**: 官方未明确解释为什么选择 discard 作为默认值。

## GitHub Issue #7182: per-rule contextMode 请求

**来源**: https://github.com/can1357/oh-my-pi/issues/7182

**关键案例**:
> 模型尝试运行 `find / -path '*/artifact*'`，被 TTSR 中断。discard 删除了这个违规命令。模型不知道是什么触发了规则，于是**虚构了一个错误的解释**——它说中断来自 "a simple `wc -l` piped from `readlink`"（实际从未运行过这个命令），然后得出了错误的教训："avoid that pattern going forward"（避免一个无关的安全命令）。

**核心问题**: discard 导致模型**confabulation**（虚构原因），因为它看不到具体哪里错了。

**提议**: 允许 per-rule contextMode，而不是全局一刀切。

**状态**: Open issue，未实现。

## arXiv 论文: Contextual Drag

**来源**: https://arxiv.org/abs/2602.04288

**标题**: Contextual Drag: The Hidden Cost of AI Mistakes in Agentic Coding

**关键发现**:
- 保留错误上下文在上下文中会**系统性偏置**后续生成
- 导致 10-20% 性能下降
- 即使明确标记错误，模型仍会重复结构相似的错误
- 这种现象称为 "contextual drag" 或 "self-deterioration"

**对 keep 的影响**: 保留违规输出（keep）可能导致 contextual drag。

## 社区讨论搜索

**Reddit**: 无相关讨论
**Hacker News**: 无相关讨论
**Twitter/X**: 无相关讨论

**结论**: 没有公开的社区对比讨论。

## 证据总结

| 来源 | 支持 | 标记 |
|---|---|---|
| 官方默认 discard | discard | [verified] |
| Contextual Drag 论文 | discard（防止污染） | [verified] |
| Issue #7182 confabulation 案例 | keep（看到具体错误） | [single-source] |
| 社区对比讨论 | 无 | [unknown] |

## 核心矛盾

- **discard**: 上下文干净，防止污染；但模型可能虚构原因
- **keep**: 模型看到具体哪里错了；但错误内容可能偏置后续生成

两者都是真实问题，取决于规则类型和使用场景。
