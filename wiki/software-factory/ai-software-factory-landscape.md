# AI Software Factory 概念与真工厂短名单

> Sources: Emmanuel Goossaert, codecapsule.com, 2026-10-04; varun1505/awesome-software-factories README, 2026-10-29; GitHub API, 2026-10-29; 各项目官方 README, 2026-10-29
> Raw: [what-i-learned-building-an-ai-software-factory](../../raw/software-factory/2026-10-29-what-i-learned-building-an-ai-software-factory.md); [awesome-software-factories-local-options](../../raw/software-factory/2026-10-29-awesome-software-factories-local-options.md)
> Updated: 2026-10-29

## Overview

「AI software factory」是借自制造业的类别名，没有统一定义。本文记录调研得到的判据、四类部署形态与星数筛选后的真工厂短名单（2026-10-29 快照）。工作台视角的并发 agent 环境清单另见 [ADE 候选清单](../agent-development-environments/ade-candidate-inventory.md)。

## 判据（真工厂 vs 高自治 agent 用法）

五个要素：输入标准化（工单/规格，不靠临时对话启动）、工序固定且每段有产出、每段边界由模型之外的程序或人判定放行、判定失败知道退回哪段且重试有上限、过程可度量（耗时、重试数、逃过检查的缺陷数）。自治程度（人审 vs 一路到合并）与系统集成（Jira/CI/部署）都是可调参数，不构成判据；判定者可以换（程序判定 / 人工判定 / 混合），属于实现选择。机械验证层的参照标准见 [factory-gate-reference](factory-gate-reference.md)。

## 四类部署形态

| 形态 | 代表 | 编排与执行位置 |
|---|---|---|
| 厂商托管产品 | Devin、Factory Droid、Augment Cosmos、Cursor background agents、Copilot coding agent | 厂商云端沙箱 |
| 自托管平台 | OpenHands、Multica、Superplane、Mission Control、Coder | 自己的机器或云 |
| 开源编排层 + 自带 harness | Backlog Loop、stratonext/software-factory、OpenFactory、Anneal | 本机 |
| 执行隔离层 | E2B、microsandbox、Katakate、BoxLite | 与任一编排组合 |

「自托管」覆盖编排与执行环境：OpenHands 自述可跑在本机、Docker、VM 或任何 agent server 后端上，Multica 用 Docker Compose 或 Helm 部署整套服务，Superplane 用 Docker Compose 跑在一台 Linux VM 上。

## 真工厂短名单（GitHub API 2026-10-29 快照）

判定口径：**自带可重复的端到端交付工序**。星数筛选线三千，用于排除小项目；被筛掉的实现里有关卡文档最完整的 Backlog Loop（见 [gate 参照](factory-gate-reference.md)）。筛选线是调研期的选择，不是外部规范。

| 项目 | Stars | 判定 | 能跑的 agent | 软件形态与界面 |
|---|---:|---|---|---|
| [OpenHands](https://github.com/OpenHands/OpenHands) | 92184 | 可配置成工厂流程（automations 自行编排，产品不规定工序） | 自带开源 agent（默认）+ Claude Code、Codex、Gemini CLI、Pi、OpenCode、任何 ACP 兼容 agent | 本地服务 + 浏览器 Web；automations 配置支持 scheduling、webhooks、run history 与 dispatching |
| [Multica](https://github.com/multica-ai/multica) | 54233 | 部分（指派→执行→review gate→人工发布固定回路，无验证工序） | 驱动本机已安装并登录的 26 个 CLI（Claude Code、Codex、Cursor、Copilot、OpenCode、OpenClaw、Hermes、Pi、Antigravity、Grok、Kimi、Kiro、Qwen 等） | 云 web + 桌面端 + 自托管；inbox 收通知 |
| [Superplane](https://github.com/superplanehq/superplane) | 8379 | 是（backlog → refine plan → implement → verify → PR，失败带上下文退回，可插人工批准） | 源码含 `pkg/components/runner/claude` 与 `runner/codex` 目录；README 未给完整后端清单，目录存在不代表支持范围仅这两种 | Web 应用；云端或 Docker Compose 自托管 |
| [Mission Control](https://github.com/builderz-labs/mission-control) | 6410 | 部分（工序在运行时之上编排；Aegis 质量门要求审批记录） | 适配器：OpenClaw、Claude Code、Codex、CrewAI、LangGraph、AutoGen、Claude SDK，适配深度因 runtime 而异 | 自托管 Web 面板 + CLI + MCP + REST/WS/SSE |

关卡事实边界：三家写出的关卡性质不同。Superplane 对每次运行套同一组 workflow-level guardrail，由系统检查结果并把失败连同上下文送回 agent，人工批准是流程中可选的一步；Mission Control 的 Aegis 质量门要求先有审批记录才能把任务标为完成；Multica 的 review gate 让结果落进 review 而不直接进 main，由人决定是否发布。这三家是否含红绿前置、变异下限、测试目录不可写，README 未展开，未核实。整套机械关卡的明确文档目前只在小星数项目（Backlog Loop）。

## 与既有认识的关系

- OpenHands Agent Canvas 与 Mission Control 两行已在 ADE 候选清单中，那里的 Stars 取自更早的快照，与本文 2026-10-29 数值不同；以各自快照日期的值为准，本文不回改对方表格。
- Multica 的 Runtimes 表：26 个 CLI 是驱动本机已装者，与 OpenHands 的自带 agent + 外接混合模式分开。

## 证据边界

- 「真工厂」判定含主观成分：Superplane 与 OpenHands 的边界取决于是否把「可配置」计入；两处判定分别按 README 原文自述（"Open source factory for one-shot engineering"）与 automations 机制写成，可复查。
- 星数为动态数据，仅代表 2026-10-29 查询值；仓库改名/迁移（如 OpenFactory 分裂为两条 0.7 镜像 + 新线）会使星数横向比较失效。
- agent 支持范围多来自 README 声明；实际适配深度未逐项验证。

## See Also

- [factory-gate-reference](factory-gate-reference.md) — 机械关卡参照标准（Goossaert 的七阶段 + gate 清单）
- [ADE 候选清单](../agent-development-environments/ade-candidate-inventory.md) — 并发 agent 工作台视角的同类候选
