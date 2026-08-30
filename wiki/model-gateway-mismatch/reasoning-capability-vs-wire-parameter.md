# 模型 capability 声明与 gateway wire 参数不一致

> Sources: OMP `openai-shared.ts`, `openai-reasoning-fallback.ts`; 本地 gateway 目录与 copilot-api 日志
> Raw: [reasoning_effort wire suppression 案例](../../raw/model-gateway-mismatch/2026-08-29-reasoning-effort-wire-suppression.md)
> Updated: 2026-08-29

## 核心判断

agent host 声明模型支持 reasoning，不等于 gateway 上游接受 `reasoning_effort` 这个 wire 参数。这是两个独立维度：

| 维度 | 控制什么 | 配置位置 |
|---|---|---|
| 输出侧 capability | host 是否解析/展示 thinking 块 | `reasoning: true/false` |
| 输入侧 wire 参数 | 是否把 `reasoning_effort` 写进请求体 | `compat.omitReasoningEffort` / `compat.supportsReasoningEffort` |

混淆二者会导致：模型明明能思考，但每次请求都 400；或者模型确实思考，host 却不解析 thinking 块。

## 诊断流程

1. **查 gateway 目录**：请求 `/v1/models`，看 `supported_endpoints` 和 reasoning 相关元数据。确认模型走什么 API 形态。
2. **看 400 错误消息**：上游如果明确说 "does not support reasoning effort"，是 wire 参数问题，不是认证/签名问题。
3. **查 host 源码**：找到写 `reasoning_effort` 的分支，看它被哪个 compat 开关控制。
4. **抓请求体**：如果可能，用 verbose/debug payload 模式抓第一次 400 和后续 200 的请求体对比。抓不到时只能按源码路径推断。
5. **区分学习行为**：有些 host 第一次 400 后会自动 fallback 并记住，后续请求就"突然好了"；这不是上游心情变了，是本地状态变了。

## 修复矩阵

| Host | capability 声明 | wire 参数抑制 | 备注 |
|---|---|---|---|
| OMP | `reasoning: true` | `compat.omitReasoningEffort: true` | 同时保留 thinking 解析 |
| Prime | `reasoning: true` | `compat.supportsReasoningEffort: false` | 该 host schema 不认 `omitReasoningEffort` |
| OpenCode/ai-sdk | 按 SDK 配置 | 默认不写 `reasoningEffort` | 除非显式配置 |

## 常见错误

- 把 `reasoning: false` 当成唯一解决方案：这会关闭 host 的 thinking 解析，可能让模型白思考了而你看不到。
- 把一次 400 后自动正常当成"不稳定"：先确认是不是 host 的 fallback 学习机制。
- 不看 gateway 目录，凭记忆或命名猜模型支持的 API 形态。
- 同源模型（如 Kimi K2.7 Code）在不同 gateway 可能有不同 wire 限制，不能以平台 A 的行为推平台 B。

## 验证方法

- 解析性：YAML/JSON 配置语法有效。
- 枚举性：`model list` 等只读命令仍识别该模型。
- 行为性：开 verbose 后对比 400 与 200 的请求体；未开 verbose 时只能从日志模式+源码推断。

## See Also

- [Prime Agent 技术实质](../prime-agent/prime-agent-technical-reality.md) — Prime Agent 的 harness 层设计与实现细节
- [OMP Extension 与 TTSR 分层防护](../omp-ttsr/extension-and-ttsr-layering.md) — 同一仓库的 host-level 护栏方法论
