---
Source: ~/code-inside/agc 提交 bb2dcc7；manifest.json；git status 三次输出；pull.sh 输出
Collected: 2026-10-08
Published: N/A
Topic: omp-ttsr
---

## Overview

把 TTSR 规则 `verify-before-mechanism-claims` 加上 `question` 字段的完整迁移过程，含一次路径误判事件。核心是分清 `.omp/rules/`（项目级 TTSR 发现路径，不在 manifest 同步范围）与 `~/.omp/agent/rules/` → `omp/agent/rules/`（manifest `omp-rules` 条目，唯一同步方向）。

## 1. 规则归属现状

- 项目级 `.omp/rules/verify-before-mechanism-claims.md`：由 agc 提交 `b023340` 引入，是当时唯一存在的副本
- 用户级 `~/.omp/agent/rules/verify-before-mechanism-claims.md`：**此前不存在**

OMP 发现规则的路径来自 `packages/coding-agent/src/discovery/builtin.ts:58-74` `getConfigDirs`：同时读 project（`ctx.cwd/.omp`）和 user（`ctx.agentDir ?? getAgentDir()`）两个目录的 `<dir>/rules/*.md|*.mdc`（`:393-395`）。但 `TtsrManager.addRule()` 对已存在的规则名直接返回 false（`ttsr.ts:749-750`），同名规则**不会同时注册**——先加载到的那份胜出，遍历顺序未查证。

## 2. 同步边界（manifest）

`agc/manifest.json` 里的 `omp-rules` 条目：

```
name: omp-rules
source: ~/.omp/agent/rules
repo:   omp/agent/rules
```

单向同步。`.omp/rules/` 不在任何 manifest 条目的 `source` 或 `repo` 里。

推论：
- 加规则到 `.omp/rules/` 只在单一仓库生效，不同步到 `~/.omp/agent/rules/`，用户级 TTSR 感知不到
- 加规则到 `~/.omp/agent/rules/` 后 `./pull.sh` 会把它同步到 `omp/agent/rules/`，纳入版本化
- 把 `.omp/rules/` 下的规则删掉、再放到 `~/.omp/agent/rules/`，pull 会自动走 rename 路径（`git status` 显示 `renamed:`）

## 3. 误判事件

初始动作是修改 `.omp/rules/verify-before-mechanism-claims.md`，加 `question` 字段。用户纠正为"change original not repo one"，指原始存在于用户级。我理解为"用户级那份"，实际：

- 用户级此前**没有**该规则，"原始"指的是 `.omp/rules/` 那份
- 但用户最终意图是：这条规则应该放在用户级（`~/.omp/agent/rules/`），并且要通过 manifest 同步进 `omp/agent/rules/`

最终动作：
1. `git rm .omp/rules/verify-before-mechanism-claims.md`（撤掉项目级副本）
2. `write ~/.omp/agent/rules/verify-before-mechanism-claims.md`（新建用户级，含 `question`）
3. `./pull.sh`（同步到 `omp/agent/rules/`）
4. `git commit` + `git push`（提交 `bb2dcc7`）

## 4. pull 输出

```
pull: updated: omp-config: /home/cpf/code-inside/agc/omp/agent/config.yml
pull: updated: omp-rules: /home/cpf/code-inside/agc/omp/agent/rules/verify-before-mechanism-claims.md
pull: updated: bun-global-packages: /home/cpf/code-inside/agc/bun/global-package.json
pull: updated=3 would_update=0 unchanged=61 missing=0 protected_slots=50
```

## 5. commit `bb2dcc7` 三处 diff

`bun/global-package.json`（7 处版本升级）：

```
- "@anthropic-ai/claude-code": "2.1.292"   → "2.1.293"
- "@earendil-works/pi-coding-agent": "1.0.4" → "1.1.0"
- "@oh-my-pi/pi-coding-agent": "18.8.0"    → "18.8.4"
- "@openai/codex": "0.160.1"               → "0.161.0"
- "@opencode/cli": "2.0.24"                → "2.0.25"
- "oh-my-openagent": "5.1.22"              → "5.1.24"
- "omo-ai": "5.1.22"                       → "5.1.24"
```

`omp/agent/config.yml`（1 处）：

```
modelRoles.advisor: c8787/gpt-6-luna:xhigh  →  c8787/gpt-6-luna:low
```

来源：`~/.omp/agent/config.yml` 的当前值就是 `low`，pull 把该值同步到 repo。改动时间与操作者未查证。

`.omp/rules/verify-before-mechanism-claims.md` → `omp/agent/rules/verify-before-mechanism-claims.md`（rename + 内容变化）：

```yaml
+question: "这个回复是否断言了关于源码、配置、工具行为、默认值或加载路径的事实，且回复内部没有附上可核对的来源？可核对的来源指：带行号的文件路径、URL、命令输出引用、或明确指向具体测量结果。若回复只是普通建议、偏好、提问，或已附上可核对的证据，回答否。"
```

`git status` 在 add 之后显示为 `renamed: .omp/rules/... -> omp/agent/rules/...`，`git diff --cached` 只显示 `+question` 一行（git 识别为同内容 rename，只有 question 一处实际内容差异）。

## 6. 5 条用户规则的加 question 评估

（源：本地 `~/.omp/agent/rules/*.md` 5 条 + `.omp/rules/verify-before-mechanism-claims.md` 1 条）

| 规则 | 位置 | 建议 | 理由 |
|---|---|---|---|
| `verify-before-mechanism-claims` | `.omp/rules/`（后来迁到用户级） | **加** | 目标条件——"回复断言机制事实但未附可核对来源"——output 自身可判（证据的字面形式可见） |
| `managed-skill-merge-first` | `~/.omp/agent/rules/` | 不加 | 目标条件需要 skill 库状态，不在 judge 的 state 里 |
| `no-git-commit-without-explicit-request` | `~/.omp/agent/rules/` | 不加 | 目标条件需要用户消息，不在 state 里 |
| `task-item-agent-presence` | `~/.omp/agent/rules/` | 不加 | regex 已精确断言目标条件，judge 无增量 |
| `verify-external-contract-before-local-change` | `~/.omp/agent/rules/` | 不加 | 目标条件需要 output 之外的上下文，judge 只能看当前 tool arguments |

## 7. 编码任务教训

- 修改前用 `git log -- <path>` 查提交历史、用 `ls ~/.omp/...` 查源侧存在性，再决定改哪个
- 用户级规则改动后应主动 `./pull.sh`，让同步流程接管
- 误判事件的根因：没有先验证"原始"这个词的实际指向，直接按直觉理解
