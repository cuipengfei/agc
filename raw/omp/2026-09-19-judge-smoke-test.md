# OMP eval cell judge() smoke 实测记录

> Source: 本会话实测（OMP eval cell 内调用 judge(state, questions) helper）
> Collected: 2026-09-19
> Published: Unknown

- 日期：2026-09-19。本会话在 OMP eval cell 中对 judge(state, questions) helper（18.2.4 随 judgment 模块引入，见同 topic 其他 raw）做 smoke 实测。
- 实测结论（本会话确认的 smoke 事实）：
  - helper 可用：cell 代码中 judge(state, questions) 可被调用。
  - choice / bool / score 三类 question 均可返回结构化结果。
  - 返回 handle 的 status / done / wait 字段可用。
  - output() 不支持。
  - backend / model / usage 通过 helper 未暴露，本轮未核验。
- 来源边界：以上均为本会话实测观察；本 raw 不断言 judgmentProvider 具体取值（auto/typesafe/llm）下的后端行为，该边界见 raw/omp/2026-09-19-judgment-provider-values.md 与 raw/omp/2026-09-19-llm-judgment-callflows.md。
