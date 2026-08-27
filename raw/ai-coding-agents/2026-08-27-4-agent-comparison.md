---
source-url: https://github.com/anomalyco/opencode, https://github.com/can1357/oh-my-pi, https://github.com/PrimeIntellect-ai/prime-agent, https://github.com/deepseek-ai/deepseek-harness
collected: 2026-08-27
published: 2026-08-27
---

# 四 AI Coding Agent 对比研究原始记录

## 研究对象

1. **OpenCode + OMO** — https://github.com/anomalyco/opencode + https://omo.dev
2. **OMP** — https://github.com/can1357/oh-my-pi
3. **Prime Agent** — https://github.com/PrimeIntellect-ai/prime-agent
4. **DSH** — https://github.com/deepseek-ai/deepseek-harness

## 研究方法

- 会话中可见 3 次 `task` 批量调度：wide → narrow → deep
- 每批次派发 4 个子任务，共 12 个子任务
- 子任务角色/完整参数未验证（调度摘要未显示 agent 类型解析结果）
- 官方文档、GitHub PR/issue、源码验证

## 关键发现

### 真独有（别人没有或无法简单配置获得）

| 工具 | 优势 | 证据 |
|------|------|------|
| OMP | TTSR 完整闭环（流中匹配→abort→注入→retry→持久化） | OpenCode PR #14741 closed 未合并；DSH 第三方 dsh-stream-rules 非官方 |
| DSH | Cordis everything-is-plugin（session log、agent loop、tool registry 均可配置替换） | OMP/OpenCode/Prime 只有部分等价 |
| DSH | Append-only event sourcing | OpenCode v2 接近但架构目标不同 |

### 同类但实现/成熟度更强

| 工具 | 优势 | 证据 |
|------|------|------|
| OMP | Magic Keywords（ultrathink/orchestrate/workflowz） | OMO 有 keyword-detector hook，词表不同但功能等价 |
| OMP | Prewalk | 已有第三方复刻（pi-prewalk、codex-prewalk） |
| OMP | Vibe 打包模式 | OpenCode+OMO 可配置等价 |
| OpenCode+OMO | OMO 关键词触发（ultrawork/ulw/hyperplan） | 与 OMP 功能等价 |
| OpenCode+OMO | OMO 多 agent 编排（sisyphus/prometheus/atlas） | OMP Vibe 功能类似 |
| Prime Agent | RLM 完整产品形态 | OMP #9787 open 未合并；OpenCode #8555/#13499 closed 未合并 |
| Prime Agent | Continual Harness | 其他工具需开发 |

### 无独特优势

- OpenCode（单独）：所有能力均可在其他工具找到等价或近似

## 关键验证点

### OMO Magic Keywords

- **发现**：OMO 有 `keyword-detector` hook，支持 `ultrawork`/`ulw`/`hyperplan`
- **机制**：regex/IntentGate 识别关键词，注入 mode prompt
- **与 OMP 区别**：词表不同，OMP 是 turn-scoped notice，OMO 是模式/钩子/流程编排
- **来源**：https://github.com/code-yeongyu/oh-my-openagent/blob/9edaa6e9/src/hooks/keyword-detector/constants.ts

### OMP RLM PR #9787

- **状态**：open，review:p2
- **Review 来源**：Codex AI 审查 + roboomp（无 maintainer 确认）
- **作者回应**：17 轮积极修复
- **合并可能性**：likely，但非确定
- **合并后功能**：`/rlm` 命令、Python/JS eval helpers、外置 oversized input、子 LLM/递归 agent

## 原始来源

- OpenCode: https://github.com/anomalyco/opencode
- OMO: https://omo.dev, https://github.com/code-yeongyu/oh-my-openagent
- OMP: https://github.com/can1357/oh-my-pi, https://omp.sh
- Prime Agent: https://github.com/PrimeIntellect-ai/prime-agent, https://www.primeintellect.ai/blog/prime-agent
- DSH: https://github.com/deepseek-ai/deepseek-harness
