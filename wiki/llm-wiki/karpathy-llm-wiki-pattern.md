# Karpathy LLM Wiki 模式

> Sources: Karpathy（gist，Published Unknown，2026-04 月初）；HN（2026-04-04）；Google Cloud（2026-06-13）
> Raw: [2026-11-26-karpathy-llm-wiki-gist](../../raw/llm-wiki/2026-11-26-karpathy-llm-wiki-gist.md); [2026-11-26-google-okf-announcement](../../raw/llm-wiki/2026-11-26-google-okf-announcement.md); [2026-11-26-ecosystem-github-snapshot](../../raw/llm-wiki/2026-11-26-ecosystem-github-snapshot.md)
> Updated: 2026-11-26

## Overview

Karpathy 在 2026 年 3 月底发推提出、4 月初写成 gist 的一种个人知识库模式：让 LLM 增量维护一个持久的 markdown wiki，夹在用户与原始资料之间，替代每次提问都重新检索拼答案的 RAG 用法。 gist 页面显示 5,000+ stars；HN 帖（item 47640875，2026-04-04）296 分、95 评论。发布日期的 4 月 3 日说法只有二手来源，一手时间未获取。

## 三层结构与三个操作

三层：**raw sources**（不可变，LLM 只读）、**the wiki**（LLM 全权创建和更新）、**schema**（`CLAUDE.md` / `AGENTS.md` 一类文件，规定结构、约定与工作流）。三个操作：**Ingest** 读进新材料并联动更新十来个页面；**Query** 检索已有页面综合回答，答案可以回填成新页面；**Lint** 体检矛盾、过时结论、孤立页面、缺失交叉引用。

## 两个特殊文件与配套工具

`index.md` 是内容目录，原文判断百来个源、几百页规模靠它就够，不需要 embedding 基础设施。`log.md` 是追加式时间线，条目前缀形如 `## [2026-04-02] ingest | Article Title`，前缀统一后能用 `grep "^## \[" log.md` 直接解析。gist 提到可选工具 qmd（本地 markdown 搜索引擎，BM25/向量混合 + MCP）。

## 核心论证与历史定位

论证围绕维护成本展开：知识库让人放弃的环节是记账——更新交叉引用、标记新旧矛盾、维持几十个页面一致；原文说 "LLMs don't get bored, don't forget to update a cross-reference, and can touch 15 files in one pass"。历史上接到 Vannevar Bush 1945 年的 Memex：个人策划、文档间有联想路径，区别在于谁来维护。分发方式上这是一份 "idea file"：不给代码，交给对方的 agent 读，让 agent 在本地造一版。

## 标准化：Google OKF

Google Cloud 于 2026-06-13 发布 [OKF v0.1](../../raw/llm-wiki/2026-11-26-google-okf-announcement.md)，博客原文称它把 LLM-wiki 模式形式化为可移植格式。规则极简：一个概念一个 markdown 文件、路径即身份；YAML frontmatter 只强制 `type` 一个字段，另有 title、description、resource、tags、timestamp 可选；`index.md`、`log.md` 为可选保留文件名；概念间用普通 markdown 链接连成图。随规范发了两个参考实现：遍历 BigQuery 数据集生成概念文档的增强 agent，和把任意 bundle 转成单文件交互图的静态可视化器。Google Cloud Knowledge Catalog 已能摄入 OKF。OKF 制定方在文中直接引用 Karpathy gist，是首个大厂级别的正式背书。

## See Also

- [Karpathy LLM Wiki 生态排名与选型](ecosystem-ranking.md)
- [Browser History RAG](../personal-knowledge/browser-history-rag.md)
