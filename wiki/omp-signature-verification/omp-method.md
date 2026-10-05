# OMP Signature 验证方法

## 核心方法

OMP 使用 `servedModelFromAnthropicSignature` 函数解析 Anthropic signature 来判断模型真伪。

## 验证原理

函数读取 signature protobuf 头的 field #6 来提取模型 ID。

标准 Anthropic signature 结构：

- 第一个字节：0x08（field=1, wireType=0）
- 包含嵌套的 field 1/2/6 结构
- field #6 包含模型 ID

## 验证步骤

1. 获取 API 返回的 signature
2. 用 `servedModelFromAnthropicSignature` 函数解析
3. 如果返回模型 ID（如 `claude-opus-5`），则是真 Anthropic 模型
4. 如果返回 `undefined`，则 signature 非标准，无法确认模型真伪

## 验证案例

### 真实 Opus 5

- signature 第一个字节：0x08
- 解析结果：`claude-opus-5`
- 结论：真 Anthropic 模型

## 方法局限

- 只对标准 protobuf 布局有效
- 非标准 signature 结构（如第一个字节不是 0x08）无法解析
- 无法验证 signature 是否密码学有效

## 来源

- Raw: `raw/omp-signature-verification/omp-parser-analysis.md`
- Raw: `raw/omp-signature-verification/real-opus5-signature.md`
- Updated: 2026-10-05
