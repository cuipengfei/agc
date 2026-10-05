# OMP Signature 解析函数分析

## 来源

本会话实验记录，2026-10-05

## 核心函数

OMP 使用 `servedModelFromAnthropicSignature` 函数解析 Anthropic signature 来判断模型真伪。

## 验证过程

用真实 Opus 5 signature 测试该函数：

- 输入：真实 Opus 5 signature（第一个字节 0x08）
- 输出：`claude-opus-5`

结论：函数本身正确，能识别真实 Anthropic signature。

## 解析原理

函数读取 signature protobuf 头的 field #6 来提取模型 ID。

标准 Anthropic signature 结构：

- 第一个字节：0x08（field=1, wireType=0）
- 包含嵌套的 field 1/2/6 结构
- field #6 包含模型 ID

## 证据边界

- 只验证了真实 Opus 5 signature 的解析
- 未验证其他 Anthropic 模型（如 Sonnet、Haiku）的 signature
- 未验证非标准 signature 结构的行为
