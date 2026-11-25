# Karpathy LLM Wiki 生态排名与选型

> Sources: GitHub 搜索 API（2026-11-25）；各仓库 README / package.json（读取范围见 raw）
> Raw: [2026-11-26-ecosystem-github-snapshot](../../raw/llm-wiki/2026-11-26-ecosystem-github-snapshot.md)
> Updated: 2026-11-26

## Overview

沿 Karpathy LLM Wiki 模式长出的 skills、工具、应用与平台共 60 余项（star 为 2026-11-25 的 GitHub 搜索 API 原值）。按重量分五档：L0 文档/清单/语料、L1 skill 包、L2 插件或技能集、L3 CLI/MCP/编译器、L4 桌面或 web 应用、L5 平台。star 第一的不是最贴近想法的：真正从 gist 长出来的最大单体是 nashsu 桌面应用（21,887）与 AgriciDaniel 插件（16,756）；最高的两个腾讯项目（38,209 与 31,175）是平台里的同名能力，规模来自原有产品线，没有发现衍生证据。

## 衍生排名要点（全表见 raw 快照）

**L0**：awesome-llm-wiki 清单 297 是这一档的枢纽；中文指南 helloianneo 326；单文件模板最低到 0 star。
**L1**：Astro-Han 2,804 与 sdyckjq 2,607 是两支代表，前者把证据可追溯做成机械校验脚本，后者中文多平台带图谱可视化；TrueHOOHA 22 声明 `wiki/` 树遵循 OKF v0.1；autodidact 13 把"给题目自动搜网编译 wiki"做成闭环。
**L2**：claude-obsidian 16,756 是最大插件形态，inbox 收源、SHA-256 指纹单事务、journal 回滚、只读 agent 设计；Ar9av 3,816 是 39 个 skill + pip CLI + web viewer + MCP 的技能集。
**L3**：最拥挤的一档，SamurAIGPT 3,730、atomicstrata 2,277、synthadoc 2,002、nvk 1,570 等十几个；分歧在检索方式，有的坚持 index.md 导航不要 embedding，有的加向量或图谱检索。
**L4**：nashsu 21,887（Tauri/Rust、LanceDB 可选向量、内置 HTTP API + MCP + Chrome 扩展）、inkeep/open-knowledge 4,906（公司产品）、lucasastorian 1,794（Next.js + VaultFS 双后端 + 托管版）。
**L5**：AutoSci 1,742（科研平台）、jonex 1,750（解析引擎）有模式层面的署名证据。

## 同名能力，未见源流证据

Tencent/WeKnora 38,209、TencentCloud/TencentDB-Agent-Memory 31,175、agents-flex 1,059 三行提供的是平台里的同名 wiki 能力：WeKnora 的 README 全文检索 `Karpathy|LLM-Wiki|llm-wiki` 零命中，没有 raw/wiki 分层、schema、`index.md`/`log.md` 约定，但有真实的 wiki 子系统（页面修订、wiki 图、4 万文档摄取）；TencentDB 的主体是分层记忆（L0 对话到 L3 人格），"LLM-Wiki"只出现在仓库描述的四类资产分类里，README 全文无 wiki 字样。它们留在视野里是因为代表"同一形态在平台中出现"，不构成对该 gist 的衍生证据。

## 选型与本仓位置

轻端已收敛到 `SKILL.md` + `references/` 的 Agent Skills 形态；重端分桌面应用与大厂平台两条路。本仓 `~/.agents/skills/karpathy-llm-wiki` 用的是 Astro-Han 分支（README 徽章与 LICENSE 的 Yuhan Lei 署名可核），仓库侧另有 raw 更正规则与 `tools/wiki-check/check_evidence.py`，在 L1 档里属于功能较重的一支。

## 方法论教训

GitHub 描述字段未署名不能推成 README 未署名：Ar9av 与 lucasastorian 两个反例都是描述未署名、正文署名，读完全文才确认。star 必须带抓取日期。向量检索的直接证据只有 nashsu（LanceDB 可选）；atomicstrata 依赖无专用向量库；lucasastorian 是 SQLite 全文加引用图。

## See Also

- [Karpathy LLM Wiki 模式](karpathy-llm-wiki-pattern.md)
