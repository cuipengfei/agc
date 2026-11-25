# Open Knowledge Format（OKF）v0.1 发布（Google Cloud 博客摘录）

> Source: https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing
> Collected: 2026-11-26
> Published: 2026-06-13（Sam McVeety、Amir Hormati）

## 定义与定位（原文）

- "we're introducing the Open Knowledge Format (OKF), an open specification that formalizes the LLM-wiki pattern into a portable, interoperable format."
- "As published, OKF v0.1 represents knowledge as a directory of markdown files with YAML frontmatter, with a small set of agreed-upon conventions."
- "OKF is that format" —— 需要 format 而非 service：anyone can produce without an SDK、anyone can consume without an integration、survives moving between systems、lives in version control。
- 文中点名引用 Karpathy gist："Andrej Karpathy... articulates this idea most crisply in his LLM Wiki gist. 'LLMs don't get bored, don't forget to update a cross-reference, and can touch 15 files in one pass.'"

## 结构规则（原文）

- 一个 bundle = 概念目录；文件路径即概念身份。
- frontmatter 查询字段："type, title, description, resource, tags, and timestamp"。
- "OKF requires exactly one thing of every concept: a type field." 其余交给生产者。
- "Bundles can optionally include index.md files (for progressive disclosure as agents navigate the hierarchy) and log.md files (for chronological history of changes)."
- 概念间用普通 markdown 链接连成图。
- 三个原则：minimally opinionated、producer/consumer independence、format not platform（"It will never require a proprietary account or SDK"）。

## 随规范发布的参考实现

- enrichment agent：遍历 BigQuery 数据集，为每张表和视图起草概念文档，第二轮再爬权威文档加引用、schema、join 路径。
- 静态 HTML 可视化器：把任意 OKF bundle 转成单文件交互图，无后端。
- 三个可直接浏览的样例 bundle：GA4 e-commerce、Stack Overflow、Bitcoin 公共数据集。

## 与 Google 产品的连接（原文）

- "We have also updated Google Cloud's Knowledge Catalog to be able to ingest Open Knowledge Format and serve it to our agents."
- 规范仓库：github.com/GoogleCloudPlatform/knowledge-catalog（okf 子目录）。
