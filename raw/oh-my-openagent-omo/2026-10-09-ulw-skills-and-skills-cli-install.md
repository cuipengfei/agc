---
source-url: https://www.skills.sh/code-yeongyu/oh-my-openagent, https://github.com/code-yeongyu/oh-my-openagent/blob/dev/packages/omo-senpi/skills/mass-ulw/SKILL.md, https://github.com/code-yeongyu/oh-my-openagent/blob/dev/packages/omo-senpi/skills/mass-ulw/references/planning.md, https://github.com/code-yeongyu/oh-my-openagent/blob/dev/packages/omo-senpi/skills/ulw-loop/SKILL.md, https://github.com/code-yeongyu/oh-my-openagent/blob/dev/packages/omo-senpi/skills/ultrawork/SKILL.md
collected: 2026-10-09
published: Unknown
---

# OmO 技能生态（skills.sh 发布）与 skills CLI 安装观察

2026-10-09 在线调查 + 本机安装 ultrawork 技能的过程记录。

## skills.sh 官方发布（页面直读）

`code-yeongyu/oh-my-openagent` 在 skills.sh 上发布 **44 个技能、合计 10.2K 安装量**。清单（名称/安装量/一句话）：

| 技能 | 安装量 | 说明 |
|---|---|---|
| github-triage | 2.7K | 只读分流 issues/PRs |
| github-issue-triage | 1.3K | 同上，issues |
| work-with-pr | 719 | 完整 PR 生命周期 |
| pre-publish-review | 710 | 发布前 12-agent 门禁 |
| hyperplan | 526 | 对抗式多 agent 规划 |
| remove-deadcode | 473 | 删除无用代码 |
| get-unpublished-changes | 438 | 对比未发布变更 |
| omomomo | 438 | 彩蛋 |
| security-research | 435 | 团队模式漏洞审计 |
| publish | 433 | 发布管理 |
| opencode-qa | 396 | 测 opencode 自身 |
| tech-debt-audit | 358 | 技术债审计 |
| codex-qa | 343 | 测 Codex Light |
| frontend-ui-ux | 260 | 设计师转开发角色 |
| git-master | 122 | Git 操作问答 |
| frontend | 103 | 前端路由 |
| github-pr-triage | 96 | 同上，PRs |
| senpi-qa | 59 | 测 Senpi 适配器 |
| agent-browser | 55 | agent-browser CLI |
| dev-browser | 45 | 保持页面状态 |
| refactor | 18 | 重构向导 |
| remove-ai-slops | 17 | 去 AI 味道 |
| debugging | 17 | 假设驱动调试 |
| visual-qa | 16 | 视觉验收 |
| init-deep | 16 | 初始化分层 AGENTS.md 知识库 |
| ultimate-browsing | 13 | 抓取兜底 |
| programming | 13 | 严格语言实践索引 |
| review-work | 12 | 实现后门禁评审 |
| ulw-research | 11 | 调研阶段 |
| data-scientist | 10 | 常驻内核分析 |
| ast-grep | 10 | AST 形状搜索改写 |
| ultrawork | 8 | 自主执行指令 |
| coding-agent-sessions | 8 | 跨 agent 日志查找重建会话 |
| ulw-plan | 8 | 计划阶段 |
| lsp-setup | 7 | 语言服务器配置 |
| onboarding | 7 | omo 首次对话引导 |
| dag-library | 6 | DAG 定义存资产重跑 |
| give-me-tips | 6 | 深度解释 senpi TUI tips |
| ulw-loop | 6 | 目标循环，SKILL.md 第 5 条："Stop when the goal's WHEN-TO-STOP line holds with evidence in hand" |
| mass-ulw | 6 | 多节点编排 |
| ulw-execute | 5 | 执行 |
| pi-goal | 5 | pi 环境长目标跟踪 |
| start-work | 2 | Prometheus 计划执行 |
| browser | 1 | omowright 驱动 |

共 44 个唯一技能，与 skills.sh 页面 "44 skills" 一致。


官方页面安装命令：`npx skills add https://github.com/code-yeongyu/oh-my-openagent --skill ulw-loop` 或 `npx skills add code-yeongyu/oh-my-openagent`。

## ulw 家族四技能的停止条件差异（页面+SKILL.md 直读）

| 技能 | 停止机制 | 定义者 |
|---|---|---|
| ulw-loop | 目标级："when the goal's WHEN-TO-STOP line holds with evidence in hand" | 目标定义 |
| ultrawork | 目标级："I'll stop right away when <可观察的结束状态>"，WHEN TO STOP 是目标创建环节强制字段 | 目标定义 |
| mass-ulw | 节点级 + run 级：节点协议五字段 TASK/DELIVERABLE/SCOPE/VERIFY/STOP WHEN（planning.md 原文 "the single observable condition that ends the node's run"）；run 层面"标准通过才结束，绝不因最后一个节点报告完成就结束"；start 审计缺 TASK:/STOP WHEN 标记出警告 | 节点定义 |
| ulw-execute | 继承不自创：mass-ulw 文档原话 "Under ulw-loop or ulw-execute, that contract owns the goal, criteria, evidence, and checkpoints" | 被执行的计划 |

## 意图行无技能形态（检索结论）

"I detect [intent] - [reason] / I read this as ..." 只住在 Hephaestus 规则文件和 agent 提示词里。44 个技能逐页核对 + grep.app 检索，未发现独立 skill 复刻此句式；"intent detection"命中的是意图路由类技能，"hephaestus"被粒子物理工具链占用。第三方近似物：verify-and-stop（juliusbrussee/caveman，87K 安装，验证完成即停）、lean-build（86K）、agent-stop-conditions（frankxai/skills，6 安装，名字直接但小众）、judge-when-to-ask（ilang-ai/autocode，3 安装，stop-and-ask 模式）、unlazy（leonxlnx/unlazy，8.3K，执行前写验收门）。

## skills CLI 安装观察（本机单次，非普遍结论）

首次尝试 `npx skills add https://github.com/code-yeongyu/oh-my-openagent --skill ultrawork -g -y`：
- CLI 输出 "Found 13 skills"，列出的 13 个为 codex-qa、get-unpublished-changes、github-triage、hyperplan、omomomo、opencode-qa、pre-publish-review、publish、remove-deadcode、security-research、senpi-qa、tech-debt-audit、work-with-pr
- "No matching skills found for: ultrawork"，exit code 1
- 对照：skills.sh 网站能索引到 44 个

观察到的差异：CLI 发现的技能位置与网站索引范围不一致（本会话未核实 skills CLI 源码的扫描规则，该差异机制未确认）。

正式安装（成功）：`npx skills add https://github.com/code-yeongyu/oh-my-openagent/tree/dev/packages/omo-senpi/skills/ultrawork -g -y`：
- "Found 1 skill" → ultrawork
- 安装到 `~/.agents/skills/ultrawork`（canonical 副本），symlink → Claude Code 的 `~/.claude/skills/ultrawork`
- lock 文件 `~/.agents/.skill-lock.json` 新增条目：

```json
"ultrawork": {
  "source": "code-yeongyu/oh-my-openagent",
  "sourceType": "github",
  "sourceUrl": "https://github.com/code-yeongyu/oh-my-openagent.git",
  "ref": "dev",
  "skillPath": "packages/omo-senpi/skills/ultrawork/SKILL.md",
  "skillFolderHash": "95d3359e0c80fa5f582c04a2105ea538d2698b1e",
  "installedAt": "2026-10-08T16:13:21.148Z",
  "updatedAt": "2026-10-08T16:15:44.298Z"
}
```

- PromptScript agent 安装失败："PromptScript does not support global skill installation"（agent 类型限制，与技能内容无关）
- skills.sh 安全评估：Gen Trust Hub High Risk、Snyk Low Risk（Socket 0 alerts）；未验证该结论指向的具体内容

lock 文件同步进 agc 仓库：`agents/skill-lock.json:1490-1499`。agc manifest 覆盖 lock 元数据文件，不覆盖技能本体文件。

## 证据边界

- 页面直读：skills.sh 44 技能清单与安装量、官方安装命令、各技能页描述。
- SKILL.md 直读：ulw-loop、ultrawork、mass-ulw 及其 planning.md（WHEN-TO-STOP / STOP WHEN 原文）。
- 本机观察（单次）：skills CLI 两次运行的输出、lock 条目、PromptScript 失败、symlink 状态。
- 未验证：skills CLI 源码扫描规则（13 vs 44 差异的机制）；safety 评估结论指向。
