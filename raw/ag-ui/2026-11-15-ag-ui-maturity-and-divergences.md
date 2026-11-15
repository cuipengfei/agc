# AG-UI 1.0 机器定义与已知分歧摘录

> Source: https://raw.githubusercontent.com/ag-ui-protocol/ag-ui/main/spec/README.md, https://raw.githubusercontent.com/ag-ui-protocol/ag-ui/main/spec/RECONCILIATION.md
> Collected: 2026-11-15
> Published: Unknown（仓库持续更新）

## spec/README.md：布局与检验范围

- 布局：`draft/schema.json`（契约本体）、`draft/fixtures/`（必须被接受与必须被拒绝的文档）、`draft/proto-freeze.txt`（二进制线的数字账本，append-only、generator 维护）、`harness/`（检验套件）、`generator/`（schema 进、生成源码出、确定性）、`tools/reconcile.ts`、`RECONCILIATION.md`。「Nothing here is published to a package registry. The artifact is draft/schema.json, served on the web.」

## 设计立场：Exact objects, forgiving receivers

- 「The schema is a definition, not a gate」：每个对象以 `unevaluatedProperties: false` 闭合；schema 未声明的属性校验失败。跨版本兼容是接收方的行为规则，以行为规范书写，validator 无法表达 strip-and-warn。
- 两个后果：用现成 validator 校验线上流量是同版本一致性检查，新生产方的流会因携带未知字段被拒——「validate with a schema version at least as new as the producer's」；属性表是承重结构——SDK 从它生成，兼容边界据它剥离，「once the SDKs are generated from it, they are what the compatibility boundary strips against, so a field missing here is a field that gets quietly removed from the wire」。
- 例外（各有理由、被套件钉住）：mixins（`BaseEvent`、`Attributable`、`BaseMessage`，组合进闭合定义）、RFC 6902 操作（RFC 要求忽略未定义成员）、开放键对象（`Metadata`、activity `content`、`Interrupt.responseSchema`）。
- 每个被拒文档需要 `.expect.json` 指名拒绝规则与位置（`keyword`、`instanceLocation`、`keywordLocation`）：「That requirement is the difference between a real test and a false green」。
- 套件检查清单（要点）：文件过 2020-12 meta-schema；每个定义编译（strict 模式未知关键字编译期报错）；每个 anchor 可解析；引用全部文件内解析；事件 union、事件定义与 `EventType` 枚举完全一致；每个事件定义接受自己的文档、拒绝其他事件的；每个字段名 camelCase 且带描述；每个有形状的定义闭合（除文档化的开放名单）；无侧门闭合；keyword 词汇表钉住。
- 「The schema itself is the single source of truth for the protocol's shape: there is no second hand-maintained copy」。
- 序列之外皆不检查：「A validator sees one document at a time, so event ordering, the run lifecycle, what a consumer does with something it does not recognise, cross-event consistency … and whether a patch applies to the state it targets are all out of reach.」

## 已知分歧（spec/README.md「Known divergences」全文要点）

每条都注明「each is a decision that could reasonably have gone the other way」：

1. `Interrupt.responseSchema` is an object.——TypeScript 与 Python 声明为对象；.NET 持任意 JSON；schema 跟随两个约束者，代价是拒绝 JSON Schema 允许的布尔 schema（`true` 表示任何答案可接受）。
2. Media-part `metadata` is unconstrained（image/audio/video/document parts）。协议其余处 `metadata` 均为对象，媒体部件上 SDK 声明 `unknown`，数字在此可过校验、在消息上则不可。schema 跟随 SDK。
3. `Tool.parameters` accepts values that are not JSON Schemas.——TypeScript 声明 `z.any()`，字符串或数字可过校验，而把它编译为 schema 的消费者会抛异常。「Constraining it to an object or a boolean would be a protocol change, not a description of one.」
4. `Interrupt.expiresAt` is an unconstrained string.——「The ticket settled this, because producers already disagree about the representation and tightening it would reject streams that work today.」文档化约定 ISO 8601；后果不对称：「the TypeScript client reads an unparseable value as never expiring, while a Python integration raises from `datetime.fromisoformat`. So a producer sending something else validates here and breaks somewhere else.」
5. `Interrupt.toolCallId` is optional whatever the `reason`.——文档说工具审批中断带它、无它消费者无法关联审批，「but `reason` is deliberately an open string, so there is no closed set of reasons to condition on」，行为规则归散文规范。
6. The `timestamp` unit is not stated.——「Every SDK that sets it uses milliseconds since the Unix epoch, but nothing says so normatively, so a producer using seconds validates and is misread.」

## RECONCILIATION.md（必需性对账）

- 「0 fields where TypeScript and Python disagree with the schema about required-ness.」——TypeScript 与 Python 两个 SDK 与 schema 在 required-ness 上零分歧。
- 只比较 required-ness：nullability 记录但不参与比较，.NET 列仅供参考。TypeScript 列从 zod validator 读出，schema 给默认值的字段在此读作 optional（`RunAgentInput` 的 `tools` 与 `context` 两处）。
- .NET 特殊性：普通属性不表达 requiredness（除非 C# `required` 修饰符，这些类型未用）；固定判别字段（`public override string Type => …`）是计算的 getter、总是序列化，读作 optional 等于谎报。
- `—` 表示该工具未发现该 SDK 对此字段的声明，不等于该 SDK 没有：例 `.NET` 的 `AGUIUserMessage.content` 是 `[JsonIgnore]` 由 converter 持有 wire 形状，「so it shows as `—` while being very much present」。

## 生成与再生成命令

- `pnpm --filter @ag-ui/spec test`（套件）、`pnpm --filter @ag-ui/spec generate`（从 schema 再生成 TypeScript 输出）、`pnpm --filter @ag-ui/spec reconcile`（再生成 RECONCILIATION.md）。
