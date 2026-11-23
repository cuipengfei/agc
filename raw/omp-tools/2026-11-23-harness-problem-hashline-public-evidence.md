# Can Bölük The Harness Problem 与 Hashline 公开证据

> Source: https://stencil.so/blog/the-harness-problem （原 blog.can.ac/2026/02/12/the-harness-problem/ 的 alternate markdown）；https://github.com/can1357/oh-my-pi#11--hashline-edit-by-content-hash
> Collected: 2026-11-23
> Published: 2026-02-12

## 文章标题与核心问题

标题：`We improved 15 LLMs at coding in one afternoon. Only the harness changed.`

副标题：`In fact only the edit tool changed. That's it.`

文章主张：模型不是唯一变量，harness 决定输入 token、工具接口以及模型输出如何变成工作区修改。

## 作者对既有编辑格式的评价

- `apply_patch`：给其他未针对该结构优化的模型时，patch failure 很高。文章给出的例子是 Grok 4 的 50.7%、GLM-4.7 的 46.2%。
- `str_replace`：要求精确复现旧文本、空白与缩进；多处匹配会拒绝。作者引用 Claude Code 的 `"String to replace not found in file"` 问题。
- Cursor：训练单独的 70B apply model 合并修改；作者同时引用其博客中对 400 行以下文件 full rewrite 的比较。
- Aider 与 JetBrains 的基准显示编辑格式本身会改变模型表现，没有单一格式统治所有模型与场景。

## Hashline 方案

作者给每行附加 2–3 字符内容 hash。模型编辑时引用 tag，例如：

> replace line `2:f1`, replace range `1:a3` through `3:0e`, insert after `3:0e`.

文件变化后 hash 不匹配，修改可在破坏文件前被拒绝。其目标是提供稳定、可验证的行标识，减少复现旧内容和空白的需求。

## 基准设置

文章原文：

> Take a random file from the React codebase.
> Introduce mutations, framed as bugs, via an edit whose inverse we can expect (e.g. operator swaps, boolean flips, off-by-one errors, optional chains removed, identifiers renamed).
> Generate a description of the issue in plain English.

每个任务使用 fresh agent session、四个工具（read、edit、write），3 runs per task、180 tasks per run、16 models、3 edit tools。

结果原文：

> patch is the worst format for nearly every model, hashline matches or beats replace for most, and the weakest models gain the most.

> Grok Code Fast 1 went from 6.7% to 68.3%, a tenfold improvement.

> Grok 4 Fast's output tokens dropped 61% because it stopped burning tokens on retry loops.

文章页首还写：`hashline beats patch in 14/16 models; the v2 revision improves further in 12/16 — largest gain GPT-5.1 Codex Mini, 60.0% → 77.5%`。

## 与 Magic Edit 的证据边界

这篇文章比较的是单模型直接调用编辑工具的格式，不是 Magic Edit 中主模型描述、辅助模型多轮修改的 apply loop。

文章与 Magic Edit 的三个 commit 都没有直接声明「为什么 Magic 内部不用 hashline」。把 hashline 在单发编辑中的基准结果直接套到 Magic apply model，会混淆两种任务结构。

仓库已有 `raw/stencil/2026-08-30-the-harness-problem.md` 保存早期摘要；本文件新增当前公开原文的具体基准条件、数据与适用范围，用于支撑 Magic Edit 演进讨论。
