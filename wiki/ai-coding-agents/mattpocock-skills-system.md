# mattpocock/skills：两轴分类的工程 skill 集

> Sources: mattpocock/skills README 与 repo_view, 2026-10-05; ask-matt SKILL.md（本地安装副本）, 2026-10-05
> Raw: [mattpocock-skills-readme](../../raw/ai-coding-agents/2026-10-05-mattpocock-skills-readme.md)
> Updated: 2026-10-05

## Overview

mattpocock/skills（275,890 stars，2026-10-05）是 Matt Pocock 自用的 27 个 agent skill。它的组织轴是「谁能调用」：user-invoked skill 只能用户显式触发、负责编排；model-invoked skill 可由 agent 按任务自动取用、承载可复用纪律。明文规则：user-invoked 可以调用 model-invoked，绝不能调用另一个 user-invoked。路由器 `ask-matt` 回答「该用哪个 skill 或 flow」，是可选导航，平时直接调用具体 skill。

## 规模与分布

27 个 skill 分两组四类：Engineering user-invoked 11 个、Engineering model-invoked 9 个、Productivity user-invoked 5 个、Productivity model-invoked 2 个。安装有两条互斥路径：Claude Code 官方 marketplace 插件（只读、自动更新），或 `npx skills@latest add` 复制可编辑文件；README 警告两种都装会让每个 skill 出现两份。装完每仓库跑一次 `/setup-matt-pocock-skills` 配置 issue tracker、triage 标签与文档目录。

## 主线流程（idea → ship）

ask-matt 的流程图把多数工作归到一条主线：

1. `/grill-with-docs` 访谈打磨想法，产物留在 `GLOSSARY.md` 与 ADR；需要可运行答案的设计分叉经 `/handoff` 往返 `/prototype` 支线。
2. 多会话构建走 `/to-spec` → `/to-tickets`（每张票声明 blocking edges），再二选一：`/implement` 逐票实现（票间 `/clear`），或 `/implement-spec` 把票当任务图、沿 ready frontier 并行派 implementer subagent。实现由 `/tdd` 红绿循环驱动、`/code-review` 双轴（Standards + Spec）评审收尾。
3. PR 由 model-invoked 的 `/pr` 塑形。
4. `/retro` 闭环，把回顾结论变成 agent 环境的改进（导航、自动检查、coding standards），原则是机械错误变成确定性检查。

三条 on-ramp 汇入主线：`/triage`（只处理外来 issue）、`/diagnosing-bugs`（先要一条能变红的反馈环再谈修复）、`/wayfinder`（单次会话装不下的大工程，产出 decision tickets，清空后并入 `/to-spec`）。另有一层 vocabulary 在两个 skill 之下运行：`/domain-modeling`（领域语言）与 `/codebase-design`（深模块词汇）。

## 设计哲学

README 点名批评 GSD、BMAD、Spec-Kit 这类「拥有整个流程」的框架夺走用户控制、让流程中的 bug 难以解决；对应的立场是 skill 要小、可组合、与模型无关。上下文管理有显式规则：grilling 到 to-tickets 保持一个不断裂的上下文窗口，超过 smart zone（约 150k tokens）就在阶段边界 `/compact`；phase boundary 五选项按序为 Continue、`/clear`、`/handoff`、Subagent、`/compact`（默认）。

## See Also

- [pstack 移植版生态全景](pstack-ports-landscape.md)
- [skill 系统的两种组织轴](skill-system-organization-axes.md)
