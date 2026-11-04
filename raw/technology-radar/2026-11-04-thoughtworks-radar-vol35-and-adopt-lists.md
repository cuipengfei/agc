# Thoughtworks Technology Radar Vol 35 与 Vol 33–35 Adopt 清单

> Source: https://www.thoughtworks.com/radar ；https://www.thoughtworks.com/radar/archive ；https://www.thoughtworks.com/radar/faq ；Vol 33/34 PDF 见文内链接
> Collected: 2026-11-04
> Published: Unknown（Vol 35 页面标注 Volume 35 | November 2026；Vol 34 标注 Volume 34 | April 2026；Vol 33 标注 Nov. 2025）

## 1. 页面口径

- 首页标题为 `Technology Radar Vol 35`，正文写 `Volume 35 | November 2026`。
- 四个象限：techniques、platforms、tools、languages-and-frameworks。
- 四个环：Adopt、Trial、Assess、Caution。Adopt 的定义是「blips that we think you should seriously consider using」；Trial 是「ready for use, but not as completely proven」；Assess 是「look at closely, but not necessarily trial yet」；Caution 是「consider alternative options or even proactively avoid」。
- FAQ 补充：Adopt 环的门槛是「we only include items when we think it would be a poor and potentially irresponsible choice not to use them given the appropriate project context」。

Vol 33 的第四环叫 `Hold`，不是 Caution；Vol 34 与 Vol 35 恢复为 `Caution`。

## 2. Vol 35 的条数与分布

页面条目清单共 117 条（对 117 个不同的 `/radar/<quadrant>/summary/<slug>` 链接去重后计数）。

| 象限 | Adopt | Trial | Assess | Caution | 合计 |
|---|---:|---:|---:|---:|---:|
| techniques | 6 | 17 | 12 | 10 | 45 |
| platforms | 1 | 10 | 11 | 0 | 22 |
| tools | 3 | 16 | 17 | 0 | 36 |
| languages-and-frameworks | 1 | 6 | 7 | 0 | 14 |

合计：技巧 45、平台 22、工具 36、语言与框架 14，总计 117。

Vol 35 的四个主题（页面原文标题）：

1. Harness engineering at scale
2. Beyond frontier models
3. Putting more agents to work
4. Constructing the AI factory

## 3. 三版 Adopt 清单

### Vol 35（November 2026）

- Techniques（6）：Agent sandboxing；Mutation testing；Path-to-production mapping；Post-quantum cryptography；Progressive context disclosure；Threat modeling。
- Platforms（1）：VictoriaMetrics。
- Tools（3）：mise；OpenAI Codex；OpenCode。
- Languages and Frameworks（1）：Open Data Contract Standard (ODCS)。

合计 11 条。

### Vol 34（April 2026）

PDF：https://www.thoughtworks.com/content/dam/thoughtworks/documents/radar/2026/04/tr_technology_radar_vol_34_en_1.pdf

- Techniques（6）：Context engineering；Curated shared instructions for software teams；DORA metrics；Passkeys；Structured output from LLMs；Zero trust architecture。
- Platforms（0）：Adopt 环为空，Caution 环也为空。
- Tools（5）：Axe-core；Claude Code；Cursor；Kafbat UI；mise。
- Languages and Frameworks（6）：Apache Iceberg；Declarative Automation Bundles；React JS；React Native；Svelte；Typer。

合计 17 条。

Vol 34 正文里的升环描述：

- Claude Code：「We're moving Claude Code to Adopt because teams inside and outside Thoughtworks now use it day-to-day in production software delivery」。
- Cursor：「has matured into a comprehensive agentic environment with features such as plan mode, hooks and subagents」。
- mise：「We're moving it to Adopt because it consolidates three fragmented concerns — tool and language versioning, environment variable management and task execution」。
- React Native：「has moved to Adopt as our default choice for cross-platform mobile development. While previously in Trial…」。
- Passkeys：「have matured into Adopt」。

### Vol 33（Nov. 2025）

PDF：https://www.thoughtworks.com/content/dam/thoughtworks/documents/radar/2025/11/tr_technology_radar_vol_33_en.pdf

- Techniques（4）：Continuous compliance；Curated shared instructions for software teams；Pre-commit hooks；Using GenAI to understand legacy codebases。
- Platforms（1）：Arm in the cloud。
- Tools（4）：ClickHouse；NeMo Guardrails；pnpm；Pydantic。
- Languages and Frameworks（3）：Fastify；LangGraph；vLLM。

合计 12 条。

Vol 33 → Vol 34 → Vol 35 的 Adopt 合计：12、17、11。Vol 33 的 12 条里只有 `Curated shared instructions for software teams` 在 Vol 34 仍是 Adopt；Vol 34 的 17 条里只有 `mise` 出现在 Vol 35 的条目清单中。

## 4. 条目留存规则（FAQ 原文）

问题「Why do blips disappear between Radars?」的全文：

> The Radar represents technologies that are currently on our mind. Given how fast technology is advancing, the default rule is that blips only appear on the Radar for one edition unless they move rings. However, members of the Thoughtworks Technology Advisory Board (TAB) can always make an argument to keep a blip, for example when something noteworthy has happened warranting a refresh of the writeup.

> We think it’s important to keep older blips in the archive for completeness and visibility, but please be aware that we’re not updating them. In some cases, Thoughtworks teams may continue to work with and recommend these technologies; in others, the advice could be outdated. If you’re looking at a blip from our archive, do keep this in mind.

问题「Why is <some-cool-technology> not on the Radar?」中的相关一句：

> We've talked about it in a past Radar, and don't have anything new to say about it now. If a blip doesn't move, it fades from the Radar.

## 5. 取数方法

- 首页用 HTTP content negotiation 请求 markdown，一次返回全部 117 条链接、环定义、四个主题与归档链接。
- 每个象限的 summary 页（例如 `/radar/techniques/summary/agent-sandboxing`）正文包含该象限**全部环**的条目，不只是被请求的那一条；因此四个页面即可取到整版正文。
- PDF 用 `pdftotext -layout` 转文本后，每个象限开头有一段环位目录块（`Adopt` / `Trial` / `Assess` / `Caution`（Vol 33 为 `Hold`）加编号条目名），可直接读出各环清单；条目标题后紧跟环名，正文段落在其后。
- archive 页只提供 PDF 链接，没有网页形式的旧版条目清单。

## 6. 同一 URL 的两种抓取结果

对 `https://www.thoughtworks.com/radar`：

- 内置 `read`（content negotiation）返回 Vol 35（November 2026）全量条目。
- `curl -H 'Accept: text/markdown'` 返回同一份 Vol 35 内容，页面抬头为 `Volume 35 | November 2026`。
- Tavily `extract`（advanced depth）返回 `Technology Radar Vol 34` / `Volume 34 | April 2026`，正文里条目区为 `No blips`，并带 Vol 34 的四个主题（"The challenge of evaluating technology in an agentic world"、"Retaining principles, relinquishing patterns"、"Securing permission-hungry agents"、"Putting coding agents on a leash"）。

Tavily 为什么返回 Vol 34、为什么没有条目列表，本次未验证：没有查到抓取时间、缓存头或渲染模式。可确认的只有两个实现返回了不同版本，且 Tavily 的返回不含条目清单。

## 7. 与本地工具链相关的条目（Vol 35）

- Adopt：OpenCode、OpenAI Codex、mise。
- Trial：Pi、ast-grep、OpenWiki、OpenSpec、mattpocock/skills。
- Assess：GLM、Herdr、Hindsight、DeepSeek Harness (DSH)、Vale、zizmor。

## 8. 原文摘录（Vol 35 与本次相关的片段）

- Open-weight models 主题段：「Twelve months ago, the gap with proprietary frontier models was stark, but today it's much smaller for many tasks.」
- mise（Vol 35）：「Since our last assessment, mise has evolved from a high-performance alternative to asdf into a default frontend for the development environment. We're keeping it in Adopt because it consolidates three fragmented concerns…」
- OpenCode（Vol 35）：「On the downside, its session-sharing and collaboration capabilities still lag behind competing harnesses.」

## 边界

- 未逐条核对 Vol 35 的 Trial 与 Assess 正文，只取了标题与各象限第一条正文用于区分对象。
- Vol 33 的四个主题未提取。
