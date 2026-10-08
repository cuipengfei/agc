# OmO 技能生态与 skills CLI 安装：停止条件的技能化形态

> Sources: skills.sh 页面直读（2026-10-09）；oh-my-openagent dev 分支 SKILL.md 直读；本机 skills CLI 安装观察
> Raw: [ulw-skills-and-skills-cli-install](../../raw/oh-my-openagent-omo/2026-10-09-ulw-skills-and-skills-cli-install.md); [stop-condition-and-intent-mechanisms](../../raw/oh-my-openagent-omo/2026-10-09-stop-condition-and-intent-mechanisms.md)
> Updated: 2026-10-09

OmO 把"停止条件"机制技能化了：作为目标定义的一个必填字段内嵌在 ulw 家族技能里对外发布，而"意图检测"声明句仍只存在于规则层。本文章记录技能清单、ulw 家族差异，以及 skills CLI 安装中的一个真实边界。

## skills.sh 官方发布

`code-yeongyu/oh-my-openagent` 在 skills.sh 发布 44 个技能、合计 10.2K 安装量。按用途分组：

| 组 | 技能 |
|---|---|
| 目标/工作流 | ulw-loop、ulw-plan、ulw-execute、ulw-research、ultrawork、mass-ulw、hyperplan、pi-goal、start-work、dag-library、coding-agent-sessions |
| 工程与代码质量 | programming、frontend、frontend-ui-ux、refactor、debugging、remove-deadcode、remove-ai-slops、tech-debt-audit、ast-grep、lsp-setup、git-master、data-scientist、init-deep |
| 验证与 QA | visual-qa、review-work、opencode-qa、codex-qa、senpi-qa |
| GitHub 协作 | github-triage、github-issue-triage、github-pr-triage、work-with-pr、get-unpublished-changes、pre-publish-review、publish |
| 浏览器与网络 | agent-browser、dev-browser、ultimate-browsing、browser |
| 安全 | security-research |
| 彩蛋 | omomomo |
| 引导与帮助 | onboarding、give-me-tips |

共 44 个唯一技能（11+13+5+7+4+1+1+2）。

## ulw 家族四技能：停止条件的定义者不同

| 技能 | 停止机制 | 谁定义 |
|---|---|---|
| ulw-loop | 目标级："when the goal's WHEN-TO-STOP line holds with evidence in hand" | 目标定义 |
| ultrawork | 目标级："I'll stop right away when <可观察的结束状态>"，WHEN TO STOP 是目标创建强制字段 | 目标定义 |
| mass-ulw | 节点级五字段协议（TASK/DELIVERABLE/SCOPE/VERIFY/STOP WHEN）+ run 级"标准通过才结束" | 节点定义 |
| ulw-execute | 继承不自创（"Under ulw-loop or ulw-execute, that contract owns the goal..."） | 被执行的计划 |

意图行（`I detect [intent type] - [reason]` / `I read this as [intent] - [plan]`）没有任何技能复刻，44 个技能逐页核对 + 生态检索未发现独立 skill。第三方近似物：verify-and-stop（87K 安装，验证完成即停，最接近）、lean-build、unlazy（验收门）、judge-when-to-ask（stop-and-ask）、agent-stop-conditions（名字直接但 6 安装、来源小众）。

## skills CLI 安装边界：一次真实的 13 vs 44 差异

首次 `npx skills add ... --skill ultrawork` 失败：CLI 只发现 13 个技能（codex-qa、hyperplan、publish、github-triage 等根级技能），ultrawork 不在其中，exit 1。而 skills.sh 网站能索引全部 44 个。

差异机制未核实（未读 skills CLI 源码扫描规则）；本次观察是单次行为，不能推广为稳定结论。**绕过方法已实测可用**：用仓库内直接路径安装——

```bash
npx skills add https://github.com/code-yeongyu/oh-my-openagent/tree/dev/packages/omo-senpi/skills/ultrawork -g -y
```

装到 `~/.agents/skills/ultrawork`（canonical），symlink 到 Claude Code；lock 文件 `~/.agents/.skill-lock.json` 记录 source/ref/skillPath/skillFolderHash，后续 update/remove 可跟踪。PromptScript agent 不支持全局安装（agent 类型限制）。skills.sh 安全评估给 Gen Trust Hub High Risk / Snyk Low Risk，未验证指向。

## agc 仓库同步边界

agc 仓库 manifest 覆盖 lock 元数据文件（`~/.agents/.skill-lock.json` → `agents/skill-lock.json`），不覆盖技能本体文件（技能可从 source 重拉）。

## See Also

- [OmO 停止条件与意图检测机制](omo-stop-condition-mechanisms.md) — 停止机制的三层实现
- [Matt Pocock 技能体系](../ai-coding-agents/mattpocock-skills-system.md) — 另一套可安装技能的组织方式
- [技能体系组织轴](../ai-coding-agents/skill-system-organization-axes.md) — 技能组织的一般视角
