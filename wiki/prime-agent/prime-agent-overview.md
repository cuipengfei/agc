# Prime Agent：功能与配置总览

> Sources: Prime Agent 官方文档，2026-08-28
> Raw: [Prime Agent 文档研究原始记录](../../raw/prime-agent/2026-08-28-prime-agent-docs-study.md)
> Updated: 2026-08-28

## 核心架构

Prime Agent 是面向 coding、research 与 long-horizon evaluation 的开源 agent harness。核心组合是：

- **RLM（Recursive Language Model）**：持久 IPython kernel，模型用代码管理 context
- **Continual Harness**：prompt/memory/skill/subagent specs 可持久化、可回滚
- **Daemon 架构**：TUI 可随时 detach，worker 继续持有 session 和状态

## 主要功能

### 1. 会话管理

| 命令 | 功能 |
|------|------|
| `/resume` | 恢复之前的对话 |
| `/tree` | 在对话历史中跳转，创建分支 |
| `/fork` | 从某个点分叉出新对话 |
| `/clone` | 复制当前分支到新 session |
| `/compact` | 压缩长对话，保留关键信息 |

### 2. 模型与推理

- `/model`：切换模型
- `/effort`：调整推理深度（off/minimal/low/medium/high/xhigh/max）
- 支持多个 provider（OpenAI、Anthropic、Google 等）

### 3. 长运行 Agent

- 关闭终端窗口，agent 继续运行（daemon-backed resident worker）
- `prime-agent attach <name>` 重新连接
- 支持定时任务、心跳提醒、长期目标

### 4. 自主模式

- `/autonomous on`：agent 自动继续工作
- 质量门禁：`--autonomous-gate "npm test"`
- 限制：token 数、时间、轮数

### 5. 扩展机制

| 机制 | 格式 | 用途 |
|------|------|------|
| Skills | Markdown 或 Python | 按需加载的能力包 |
| Extensions | TypeScript | 拦截/修改任何行为 |
| MCP | JSON 配置 | 连接外部服务 |
| Prompt Templates | Markdown | `/name` 快速展开 |
| Themes | JSON | 自定义终端配色 |
| Keybindings | JSON | 自定义快捷键 |

## 配置概览

### settings.json（45 个字段）

**模型**：
- `defaultProvider` / `defaultModel` / `defaultThinkingLevel`

**上下文**：
- `compaction.enabled/reserveTokens/keepRecentTokens`
- `branchSummary.reserveTokens/skipPrompt`
- `idleEvictionMinutes`

**消息**：
- `steeringMode` / `followUpMode` / `transport`

**UI**：
- `theme` / `quietStartup` / `treeFilterMode`
- `editorPaddingX` / `autocompleteMaxVisible`

**资源**：
- `packages` / `extensions` / `skills` / `prompts` / `themes`

### CLI 参数（42 个 option + 19 个 subcommand）

**模式**：
- `-p` / `--mode json/rpc`

**模型**：
- `--provider` / `--model` / `--thinking`

**会话**：
- `-c` / `-r` / `--fork` / `--no-session`

**自主**：
- `--autonomous` / `--autonomous-gate` / `--autonomous-max-*`

**目标**：
- `--goal` / `--goal-token-budget`

### models.json

```json
{
  "providers": {
    "anthropic": {
      "baseUrl": "...",
      "apiKey": "...",
      "models": [...]
    }
  }
}
```

## RLM：递归语言模型

**核心**：`rlm(prompt, name, model, thinking)` 启动子 agent

**特点**：
- 子 agent 有独立 session 和 kernel
- 支持递归（默认最大深度 2）
- 结果通过 `agent_message` 或文件回传
- 父 agent 的 Python 状态跨对话保留

**适用场景**：
- 处理超长上下文（几百 KB 代码库）
- 程序化切片、搜索、重组 context
- 递归分解复杂任务

## Continual Harness

**机制**：`/refine` 从自身 trajectory 提炼改进

**可持久化**：
- prompt notes
- memories
- reusable skills
- subagent specifications

**支持 rollback**

## 与 OMP 的关键差异

| 功能 | OMP | Prime Agent |
|------|-----|-------------|
| 工作流模式 | Vibe/Plan/Goal/Prewalk/TTSR | 单一模式 + RLM |
| 上下文管理 | 传统 | 持久 Python kernel |
| 子 agent | task 工具 | RLM 递归调用 |
| 自改进 | 无 | Continual Harness |
| 关键词触发 | Magic Keywords | 无 |
| 流式中断 | TTSR | 无 |

## 适用场景

**Prime Agent 适合**：
- 需要处理超长上下文
- 需要 agent 从经验中学习
- 需要程序化控制 context
- 需要长期运行的自动化任务

**OMP 适合**：
- 需要多种工作流模式
- 需要流式行为护栏（TTSR）
- 需要关键词触发的快捷操作
- 需要更丰富的内置工具生态

## See Also

- [四 AI Coding Agent 对比](../ai-coding-agents/4-agent-comparison.md)
- [OMP TTSR 与 /omfg：流式行为护栏](../omp-ttsr/ttsr-and-omfg.md)
