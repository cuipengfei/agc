# Better Harness vs Claude Code Insights

> Source: https://code.claude.com/docs/en/costs.md; https://github.com/QoderAI/better-harness/blob/main/README.md
> Collected: 2026-08-30
> Published: Unknown

## Claude Code /insights

- 分析最近会话（至多 200 个未分析 session，跳过极短会话）
- 输出：HTML 报告（使用习惯、friction points、CLAUDE.md 建议）
- 修复：建议复制到 CLAUDE.md
- 只支持 Claude Code

## Better Harness

- 分析项目配置 + session 日志（跨 agent）
- 输出：HTML 报告（五维评分、findings、repair plan）
- 修复：scoped repair action，人工执行
- 支持 12 个 agent

## 对比

| | Claude Code `/insights` | Better Harness |
|---|---|---|
| 输入 | 过去 30 天本地会话日志 | 项目配置 + session 日志 |
| 输出 | 使用习惯、friction points | 五维评分、findings、repair plan |
| 修复 | 建议复制到 CLAUDE.md | scoped repair action |
| 多 agent | 只支持 Claude Code | 支持 12 个 |
| 本质 | 使用分析工具 | 工作流审计工具 |

## 结论

都是"分析历史、给建议、不改变运行时"。

`/insights` 分析"你怎么用 Claude"，Better Harness 审计"agent 工作流是否健康"。
