# TTSR 规则可靠性、误报与 429 重试边界

> Source: M0n7y5/slop-stop、joshuaswarren/remnic、themuuln/omp-config 公开规则源码；RFC Editor RFC 6585 §4
> Collected: 2026-11-22
> Published: Unknown

## slop-stop：回复与测试

`no-prose-slop.md`（https://github.com/M0n7y5/slop-stop/blob/main/rules/no-prose-slop.md）观察英文回复中的客套、铺垫、道歉，以及 `should work now`、`seems to pass`、`I'm confident` 等成功措辞。命中后中断，要求执行验证并引用输出，或明确说明尚未验证。

它检查的是文字形式。触发成功措辞不代表工具记录已被核对，编造一段测试输出也不会被这个正则识别。

`no-slop-tests.md`（https://github.com/M0n7y5/slop-stop/blob/main/rules/no-slop-tests.md）观察测试文件的 edit/write，针对：

- 永远为真的断言；
- 空测试正文；
- 用同一待测函数同时生成实际值与预期值；
- 固定休眠后继续。

正文要求测试能指出它能发现哪类生产错误。固定休眠在时间行为本身是测试对象时允许使用，需要解释原因。同一函数使用不同输入可能是在验证合法性质，不能把所有相关写法都判为错误。

## remnic：为什么放弃若干检测

原文：https://github.com/joshuaswarren/remnic/blob/main/.omp/rules/README.md

作者称规则来自其仓库四周的自动代码审查记录（2026-06-20 至 2026-07-18，3,100+ findings）。这些是作者对自己项目的统计。

作者要求新条件先在已有代码上运行；匹配合法写法时缩小范围或改成提醒。以下基线均出自该 README：

| 候选 | 放弃广泛检测的原因 |
| --- | --- |
| `String(err)` / `err.message` | 462 处标准错误归一化写法；是否泄露取决于输出到哪里 |
| `coerce*(...) ?? <default>` | 配置回退大量使用；风险取决于默认值与非法输入处理 |
| npm 脚本内联 `VAR=value cmd` | 20 个已有开发/测试脚本有意采用 |
| `../packages/<pkg>/src/` imports | 约 360 处用于测试、脚本和兼容入口 |
| 任意数组类型谓词 | 10 处、7 文件中的正常元素形状检查；作者只保留更窄的 `is readonly []` |
| `.some(...)` 检查内部空值 | 一处业务语义需要空值返回 false；作者只观察 `.every(...)` |
| 未防 NaN 的 `Date.parse(...)` 比较 | 匹配 30+ 文件中的合法已知日期比较 |
| 单参数 `assert.throws` / `assert.rejects` | 18+ 测试文件中“任意拒绝”正是测试意图 |
| `: readonly T[] = Object.freeze([...])` | 13 个正常冻结数据数组；是否破坏类型需要结合 `as const` 与派生联合类型 |

作者认为 namespace/ACL、flush 生命周期、目录触碰顺序等主要问题依赖业务状态，应走场景矩阵，不适合用局部文本签名替代。

## themuuln：验证与 provider 错误

`check-health.mdc`（https://github.com/themuuln/omp-config/blob/main/agent/rules/check-health.mdc）建议：修改后先做成本最低且相关的验证；配置文件检查能否加载，LSP 仅在已有服务运行时使用，TypeScript 修改优先单文件或受影响模块检查。只报告实际执行的检查与结果。

它把全量检查留给提交门禁的前提是仓库已经配置相应门禁。多模块改动时，单文件验证未必足够。这条规则检查模型输出中的英文编辑与验证措辞，`interruptMode: never`，不会在每次编辑后自动执行测试。

`provider-quota-handling.mdc`（https://github.com/themuuln/omp-config/blob/main/agent/rules/provider-quota-handling.mdc）要求遇到额度、授权或付款问题时停止重复请求，原样报告服务与错误，检查一次配置，配置或套餐发生变化后再试。

作者自报：在最近 113 条任务结果记录里，有 4 次 provider 403 region-opt-in 和 2 次 monthly-usage-limit，均在停止前重试过。

该规则把 `429` 一律列为不可重试，这与 RFC 6585 的通用含义不同。

RFC 6585 §4（https://www.rfc-editor.org/rfc/rfc6585.html#section-4）：

> The 429 status code indicates that the user has sent too many requests in a given amount of time ("rate limiting").

> The response representations SHOULD include details explaining the condition, and MAY include a Retry-After header indicating how long to wait before making a new request.

因此，明确的月额度耗尽与短期请求频率限制要分开处理；短期 429 应结合响应正文和 `Retry-After` 决定后续动作。上述 provider 规则本身只监视模型输出中的关键词，没有读取响应并自动管理重试。