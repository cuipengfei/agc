# Technology Radar 的结构、留存规则与 Vol 33–35 Adopt 清单

> Sources: Thoughtworks Technology Radar Vol 35（November 2026）；Vol 34（April 2026）；Vol 33（Nov. 2025）；Thoughtworks Radar FAQ，2026-11-04 取
> Raw: [Radar Vol 35 与三版 Adopt 清单](../../raw/technology-radar/2026-11-04-thoughtworks-radar-vol35-and-adopt-lists.md)
> Updated: 2026-11-04

## Overview

Thoughtworks Technology Radar 半年发布一次，用四个象限与四个环组织条目，条目称为 blip。它是一份观点性清单，依据是 Thoughtworks 全球项目经验，不是基准测试。本页记录三件事：Vol 35 的规模与主题、Vol 33 到 Vol 35 的 Adopt 清单变化、以及条目的留存规则与取数方式。

## 环与象限

| 环 | 含义 |
|---|---|
| Adopt | 应当认真考虑采用；在合适项目背景下，不用它是不智甚至不负责任的选择 |
| Trial | 可以使用，但成熟度低于 Adopt |
| Assess | 值得关注与研究，未必现在试用 |
| Caution | 建议考虑替代方案，甚至主动回避 |

象限为 techniques、platforms、tools、languages-and-frameworks。Vol 33 的第四环名为 `Hold`；Vol 34 与 Vol 35 使用 Caution。

## Vol 35 的规模

页面条目清单共 117 条。

| 象限 | Adopt | Trial | Assess | Caution | 合计 |
|---|---:|---:|---:|---:|---:|
| techniques | 6 | 17 | 12 | 10 | 45 |
| platforms | 1 | 10 | 11 | 0 | 22 |
| tools | 3 | 16 | 17 | 0 | 36 |
| languages-and-frameworks | 1 | 6 | 7 | 0 | 14 |

四个主题是 Harness engineering at scale、Beyond frontier models、Putting more agents to work、Constructing the AI factory。主题与象限是两个维度：同一条 blip 可以同时印证两个主题。

## 三版 Adopt 清单

| 象限 | Vol 33 | Vol 34 | Vol 35 |
|---|---:|---:|---:|
| techniques | 4 | 6 | 6 |
| platforms | 1 | 0 | 1 |
| tools | 4 | 5 | 3 |
| languages-and-frameworks | 3 | 6 | 1 |
| 合计 | 12 | 17 | 11 |

**Vol 33（Nov. 2025）**：Continuous compliance；Curated shared instructions for software teams；Pre-commit hooks；Using GenAI to understand legacy codebases；Arm in the cloud；ClickHouse；NeMo Guardrails；pnpm；Pydantic；Fastify；LangGraph；vLLM。

**Vol 34（April 2026）**：Context engineering；Curated shared instructions for software teams；DORA metrics；Passkeys；Structured output from LLMs；Zero trust architecture；Axe-core；Claude Code；Cursor；Kafbat UI；mise；Apache Iceberg；Declarative Automation Bundles；React JS；React Native；Svelte；Typer。平台象限的 Adopt 与 Caution 都是空的。

**Vol 35（November 2026）**：Agent sandboxing；Mutation testing；Path-to-production mapping；Post-quantum cryptography；Progressive context disclosure；Threat modeling；VictoriaMetrics；mise；OpenAI Codex；OpenCode；Open Data Contract Standard (ODCS)。

相邻两版之间 Adopt 环的延续很少：Vol 33 的 12 条里只有 Curated shared instructions for software teams 在 Vol 34 仍是 Adopt；Vol 34 的 17 条里只有 mise 出现在 Vol 35 的条目清单中。

## 条目留存规则

FAQ 的默认规则：

> the default rule is that blips only appear on the Radar for one edition unless they move rings.

保留例外与归档的性质：

> We think it’s important to keep older blips in the archive for completeness and visibility, but please be aware that we’re not updating them. In some cases, Thoughtworks teams may continue to work with and recommend these technologies; in others, the advice could be outdated.

因此「某条目从当期清单里消失」通常只说明它没有移动环位，不说明评级下降。归档保留旧条目供查阅，但内容不再更新。

mise 是这条规则的实例：它连续出现在 Vol 34 与 Vol 35 的 Adopt 环，没有换环，而 Vol 35 的正文重写过（`We're keeping it in Adopt because…`）。按 FAQ，这属于「TAB 成员提出理由保留」的例外。此处为推断：页面没有标注保留原因。

## 取数方法

- 首页用 content negotiation 请求 markdown，一次拿到全部条目链接、环定义与主题说明。
- 每个象限的 summary 页正文包含该象限全部环的条目，不限于请求的那一条；四个页面即可取到整版正文。这是取全量 Trial 与 Assess 条目最快的方式。
- PDF 用 `pdftotext -layout` 转换后，每个象限开头有一段环位目录块（环名加编号条目名），可直接读出各环清单。
- 归档页只提供 PDF 链接，没有网页形式的旧版清单，因此旧版环位只能从 PDF 取。

对首页的抓取存在版本差异：内置 `read` 与 `curl` 得到 Vol 35（November 2026）全量条目；Tavily 的 `extract` 得到 Vol 34（April 2026）正文，且条目区为空。原因未查证，只知道两者返回了不同版本。

## See Also

- [Mutation testing：oracle、invariant 与变异分类](../software-testing/mutation-testing-oracles-and-invariants.md) — 该文的 Raw 也引用 Thoughtworks 的 mutation testing 材料
- [harness 接入工具的三条通道](../agent-tooling/harness-integration-paths.md) — 本期 Trial 与 Adopt 里的 ast-grep、APM、Beads 的接入形态
