# 真实 Opus 5 Signature 样本

## 来源

本会话实验记录，2026-10-05

## 样本特征

- 长度：274 bytes
- 第一个字节：0x08（field=1, wireType=0）
- 包含嵌套的 field 1/2/6 结构

## 解析结果

OMP `servedModelFromAnthropicSignature` 函数解析结果：

```
claude-opus-5
```

## 验证结论

- 真实 Anthropic signature 可被 OMP 正确解析
- field #6 包含模型 ID
- 第一个字节 0x08 是标准 Anthropic protobuf 布局的标志

## 证据边界

- 只验证了一个真实 Opus 5 signature 样本
- 未验证其他 Anthropic 模型的 signature 结构
