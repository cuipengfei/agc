# pi-provider-kiro 0.12.1 与 OMP 的兼容断层

> Source: 本会话实测 OMP 18.12.5 + pi-provider-kiro 源码直读 + PR #170
> Collected: 2026-10-22
> Published: 2026-10-22

## 发布版里的 OMP 专项代码（已随 0.12.1 上线）

`src/models.ts`（npm 0.12.1，gitHead `0899ed9c`）包含：
- `OMP_THINKING_EFFORTS` 与 `KiroThinkingConfig{mode:'effort',efforts}`
- 注释 `omp >=13.9.3 reads this; pi reads thinkingLevelMap. Emit both.`
- `claude-*` 模型 `recoverTextToolCalls:false`

## 与 OMP 仍不匹配的部分

| 差异点 | pi-provider-kiro 写法 | OMP 18.12.5 行为 | 结论 |
|---|---|---|---|
| 模型目录刷新 | pi 钩子 `refreshModels` | OMP 用 `fetchDynamicModels`（本机验证后者存在） | 钩子不会触发 |
| API Key 引用 | `apiKey: "$KIRO_API_KEY"` | `resolveConfigValue` 对 `$KIRO_API_KEY` 返回 false（本机实测），对 `KIRO_API_KEY` 返回 true | 传到流式时大概率拿不到值 |
| 流式凭据读取 | 0.12.1 只读 `options?.apiKey`，不读 env | OMP 未注入该值 | 需要宿主把 oauth 存储回传 |
| main 分支新修复 | `credentialAccessor?.get?.()`（PR #168）+ 文本 tool-call 恢复（#163/#175） | 未发布到 npm | main ≠ 0.12.1 |

## 修复去向

pi-provider-kiro **PR #170** 针对以上差异做 OMP 专项修正，作者报告 OMP 18.4.4 真实请求打通，但 **PR 仍然 open、未合并**。

OMP 对 pi-provider-kiro 的历史支持请求：#4676（closed，不计划内置 Kiro）、#1215（旧版 0.6.1 加载问题）。

## 一句话

pi-provider-kiro **有 OMP 意向、没有 OMP 完整适配**；OMP 用户应走 `ns-omp-provider-kiro`（第三方包解决钩子差异）或本地网关（Anthropic/OpenAI 兼容面）。
