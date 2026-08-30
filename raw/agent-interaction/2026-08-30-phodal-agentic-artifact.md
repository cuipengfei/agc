# Phodal 产物可持续演化 + qoder-lottie 实测验证摘录

> Source: https://www.phodal.com/blog/agentic-programming-artifact/ ; npm registry API; GitHub API（QoderAI org 遍历）
> Collected: 2026-08-30
> Published: Unknown（Phodal 文章，2026 年）

## Phodal 文章核心（Qoder Lottie 插件 0.1.0）

"生成"不重要，"可持续编辑"才是核心——让 Lottie 成为 Agentic Loop 中的工作对象。

架构三支柱：
1. **Agentic DSL（MotionProgram）**：JS API 表达完整创作程序，而非零散工具调用
2. **CLI over MCP（MotionRuntime）**：稳定语义、CLI 稳定入口，MCP 后加协议
3. **Canvas**：人的视觉选择 → 语义地址 → agent 修改 → 重新预览的循环

语义地址格式：`(source.key, node.key)` → track → phase + expectedRevision + stateDigest。

Canvas 双向交互（人点击 → agent）是下一阶段，文章发布时未实现。

## Genre 判定五条标准（本研究提炼）

1. 产物有稳定身份；2. 可版本化（expectedRevision + stateDigest）；3. 可重入；4. 可验证；5. 人机共享同一工程状态。

严格属于该 genre 的另外两项：Zerolang（Vercel Labs，graph-native 代码语言，agent 操作语义图节点/graph hash，实验性 pre-1.0，无现成 agent 集成）；arXiv 2605.12087 "Intermediate Artifacts as First-Class Citizens"（学术框架，无实现）。

## qoder-lottie CLI 可用性验证（API 级实测，2026-08-30）

- npm registry 直接 GET qoder-lottie → 404
- npm @qoder-ai scope → 只有 @qoder-ai/qodercli（v1.1.37）+ ripgrep 二进制
- GitHub QoderAI org 34 个仓库遍历 → 无 lottie 仓库；qoder-plugins-official 是空仓库
- GitHub 全局仓库搜索 qoder-lottie → 零结果
- Qoder Marketplace 插件页 → 200 存在（SPA 页面）

结论：qoder-lottie CLI 只存在于 Phodal 文章架构图中，随 Qoder Marketplace 插件分发，无独立 npm/GitHub 发布。使用路径：npm i -g @qoder-ai/qodercli 或 Qoder IDE → 装 Lottie 插件。

注：QoderAI 是阿里巴巴旗下平台（Qwen3-Coder 模型）。
