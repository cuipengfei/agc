# 窄核验：typesafe-ai/skills 官方 agent skill 的安装命令、host 声明与发现可确认性

> Source: 本会话只读直读（typesafe-ai/skills 仓库 README/SKILL.md/.claude-plugin 元数据、docs.typesafe.ai/agent-skill.md、antfu/skills-cli）
> Collected: 2026-09-19
> Published: Unknown

- 日期：2026-09-19
- 范围：只读。直读 typesafe-ai/skills 仓库 README/SKILL.md/.claude-plugin 元数据、官方 agent-skill 文档页、antfu/skills-cli 仓库；未运行任何安装命令、未改动任何宿主配置。
- 证据分级：**[已验证]** = 一手直读；**[未公开]** = 无证据；**[推断]** = 基于已验证事实的推理。

---

## 1. 结论速览

| 问题 | 结论 |
|---|---|
| 准确安装命令 | 两条主路径 + 手动路径，见 §2 [已验证] |
| 官方声称支持的 host | 点名 **Claude Code** 与 **Codex**，外加 "other agent environments"（未逐一点名）[已验证] |
| Codex 能否被当前证据确认发现该 skill | **可确认**（skills-cli 目标表 + openai/codex 仓库自带 `.codex/skills/` 两条独立证据）[已验证] |
| OpenCode 能否被当前证据确认发现该 skill | **可确认**（skills-cli 目标表 `opencode` + anomalyco/opencode 仓库自带 `.opencode/skills/` 两条独立证据）[已验证] |
| OMP 能否被当前证据确认发现该 skill | **未知，不可确认**——skills-cli 列的是 "Pi"（`.pi/skills/`、`~/.pi/agent/skills/`），未列 oh-my-pi/omp；OMP 仓库仅有仓库内开发用 `.omp/skills/`，无用户级发现路径证据 [未公开] |
| skill 的性质 | **教 agent 写 TypeSafe API 集成代码/使用 SDK 的纯指令型 SKILL.md**；不是渲染器、不是代码生成器、更不涉及把 Jev 注册为主模型 provider [已验证] |

---

## 2. 准确安装命令 [已验证]

来源：仓库 README（https://github.com/typesafe-ai/skills ）与官方文档页（https://docs.typesafe.ai/agent-skill.md ），两处文本一致。

**路径 A — Claude Code 插件**（官方首选，带 `.claude-plugin/marketplace.json`，marketplace 名 `typesafe-ai`、插件名 `typesafe`，均已直读原始 JSON [已验证] https://raw.githubusercontent.com/typesafe-ai/skills/main/.claude-plugin/marketplace.json ）：

```bash
claude plugin marketplace add typesafe-ai/skills
claude plugin install typesafe@typesafe-ai
```

装完后在 Claude Code 内用 `/typesafe:typesafe-ai` 显式调用 [已验证]。

**路径 B — 其他 agent（经 skills.sh CLI）**：

```bash
npx skills add typesafe-ai/skills --skill typesafe-ai
```

交互式选择目标 agent；默认项目级安装，`-g` 全局 [已验证]。

**路径 C — 手动**：把整个 `skills/typesafe-ai` 目录（含 reference 文件）拷入目标 agent 的 skills 目录；官方提示三选一避免重复副本 [已验证]。

**更新**：Claude Code 侧 `claude plugin marketplace update typesafe-ai` + `claude plugin update typesafe@typesafe-ai`（重启或 `/reload-plugins`）；skills.sh 侧 `npx skills update` [已验证]。

注意：`npx skills` 解析到 npm 包 `skills`（即 antfu/skills-cli，https://github.com/antfu/skills-cli ）[已验证]。

## 3. 官方声称的 host 支持范围 [已验证]

- 官方文档页原话："Drop-in skill for **Claude Code, Codex**, and other agent environments."——点名 Claude Code 与 Codex，OpenCode/OMP **未被点名** [已验证] https://docs.typesafe.ai/agent-skill.md
- 路径 B 的实际覆盖面由 skills-cli 的 agent 表决定（见 §4）[已验证]。

## 4. 逐宿主：当前证据能否确认"能发现该 skill"

判定基准：发现 = 宿主（或其官方生态）存在文档化/可直读的 skill 发现路径，使 `typesafe-ai` SKILL.md 能进入 agent 上下文。

### 4.1 Codex —— 可确认 [已验证]

1. skills-cli 的 agent 表列出 `codex`：项目路径 `.codex/skills/`、全局路径 `~/.codex/skills/` [已验证] https://github.com/antfu/skills-cli （README "Supported Agents" 表）。
2. openai/codex 仓库自身包含 `.codex/skills/` 目录且其中有多个真实 SKILL.md（babysit-pr、code-review、remote-tests 等）[已验证] https://github.com/openai/codex （仓库文件树）。
两条独立证据互证：Codex 侧既有 skills-cli 安装目标，也有厂商自己使用该路径。故 `npx skills add typesafe-ai/skills --skill typesafe-ai -a codex` 与手动拷贝均有据可依（本报告不执行）。

### 4.2 OpenCode —— 可确认 [已验证]

1. skills-cli 的 agent 表列出 `opencode`：项目路径 `.opencode/skills/`、全局路径 `~/.config/opencode/skills/` [已验证] 同上。
2. anomalyco/opencode 仓库自身包含 `.opencode/skills/` 目录且其中有真实 SKILL.md（effect、rtl-aware-development）[已验证] https://github.com/anomalyco/opencode （仓库文件树）。
两条独立证据互证，结论同 4.1。注意 OpenCode 的 npm 包是 `opencode-ai`，与旧 opencode-ai/opencode 无关（沿用前次核验）。

### 4.3 OMP（can1357/oh-my-pi）—— 未知，当前证据不可确认 [未公开]

1. skills-cli 的 agent 表**没有** oh-my-pi/omp；最接近的条目是 "**Pi**"（`.pi/skills/`、`~/.pi/agent/skills/`）——按命名与路径推断指 pi-mono 本家而非其 fork OMP，但表内无说明文字，**无法据此确认 OMP 与 `pi` 条目等价** [未公开]。
2. can1357/oh-my-pi 仓库文件树中仅见仓库自用开发目录 `.omp/skills/`（semantic-compression、system-prompts、tool-prompt-optimization）[已验证] https://github.com/can1357/oh-my-pi 。这只能证明 OMP 生态存在 skills 概念与 `.omp/skills/` 路径形态，**不能证明**已安装的 OMP 会从某个用户级目录自动发现外部拷入的 SKILL.md；本任务也未在 OMP 官方文档中检到对应该路径的发现说明 [未公开]。
3. 因此：`npx skills ... -a pi` 是否会落到 OMP 实际扫描的目录、OMP 是否有其他 managed-skills 发现通道，均**无当前证据可确认**，按任务要求记为未知。要确认需直读 OMP 源码的 skills 发现逻辑或其官方文档（本次未做，超出窄核验范围）。

## 5. skill 性质判定：教写集成代码，还是注册主模型 provider？—— 前者 [已验证]

直读 SKILL.md（https://raw.githubusercontent.com/typesafe-ai/skills/main/skills/typesafe-ai/SKILL.md ，本任务前次已全文直读）：

- **内容**：指导 agent 实时读 TypeSafe 官方文档（llms.txt、.md 直链）、按 use-case 选择 primitive（Choice/Score/Noul）、设计原子 question、用概率/confidence 定阈值、把组合逻辑与阈值留在代码里；frontmatter 只有 `name/license/description`，无工具定义、无渲染 schema、无 provider 字段。
- **README 自述用途**："Design TypeSafe workflows, find current docs and cookbooks, and compose typed judgments in code" [已验证]。
- **无任何主模型注册语义**：全篇没有修改宿主模型/provider 配置的指令；用例是"让 agent 在应用代码里写出调 `api.typesafe.ai/v1/systemone` 的集成"，主 coding model 不受影响。结合前次报告结论：即便 agent 按此 skill 写出集成，Jev 也只是应用/编排代码旁路的分类器，与宿主 provider 体系无关 [推断，基于已验证接口事实]。
- **形态归类**：纯指令型规约（SKILL.md 约定 + 实时文档检索），不是"schema→渲染器"型代码生成器。

## 6. 证据 URL 清单

**已验证**
- https://github.com/typesafe-ai/skills —— 安装命令、手动路径、用途自述、Claude Code 调用名
- https://raw.githubusercontent.com/typesafe-ai/skills/main/.claude-plugin/marketplace.json —— marketplace/plugin 名
- https://docs.typesafe.ai/agent-skill.md —— 安装/更新/排障、"Claude Code, Codex, and other agent environments"
- https://raw.githubusercontent.com/typesafe-ai/skills/main/skills/typesafe-ai/SKILL.md —— skill 性质（教写集成的指令文档）
- https://github.com/antfu/skills-cli —— `codex`/`opencode`/`pi` 的 skills 安装路径表
- https://github.com/openai/codex —— 仓库自带 `.codex/skills/`
- https://github.com/anomalyco/opencode —— 仓库自带 `.opencode/skills/`
- https://github.com/can1357/oh-my-pi —— 仓库仅有自用 `.omp/skills/`

**未公开**
- skills-cli 的 `pi` 条目是否覆盖 can1357/oh-my-pi（OMP）
- 已安装 OMP 的用户级 skill 发现目录与自动发现逻辑

---

## 7. Karpathy 证据小结

- **Think Before Coding**：对"声称支持哪些 host"与"能否确认发现"做了区分——官方点名 ≠ 生态可证；OMP 一项无证据即如实标未知而非推断为支持。
- **Simplicity First**：只直读回答问题所需的 6 个一手来源，未扩展到安装实测；无任何代码产出。
- **Goal-Driven Execution**：验收线——安装命令原文、host 声明原文、三宿主各自判定、skill 性质判定、证据 URL 分级——逐条落实。
