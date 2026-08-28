---
source-url: https://github.com/PrimeIntellect-ai/prime-agent/tree/main/packages/coding-agent/docs
collected: 2026-08-28
published: 2026-08-28
---

# Prime Agent 文档研究原始记录

## 研究范围

34 个官方文档文件，全部覆盖：
- 核心：index.md, quickstart.md, usage.md, settings.md, architecture.md
- 模型：models.md, providers.md, custom-provider.md
- 扩展：skills.md, extensions.md, mcp-integrations.md
- 界面：keybindings.md, themes.md, prompt-templates.md
- 会话：sessions.md, compaction.md, session-format.md
- 运行：long-running-agents.md, rlm.md, rlm-runtime.md
- 接口：sdk.md, acp.md, rpc.md, json.md, tui.md
- 平台：windows.md, termux.md, tmux.md, terminal-setup.md, shell-aliases.md
- 开发：development.md, daemon.md, agent-connection.md
- 包管理：packages.md

## 核心发现

### 架构特点

1. **持久 Python Kernel**：模型在持久 IPython 环境中运行，变量、函数跨对话保留
2. **RLM（Recursive Language Model）**：`rlm()` 启动子 agent，有独立 context 和 kernel
3. **Daemon 架构**：TUI 可随时 detach，worker 继续持有 session 和状态
4. **统一入口**：用户 prompt、heartbeat、schedule、goal、autonomous 都走同一队列

### 配置面

**settings.json**（45 个字段）：
- 模型：defaultProvider, defaultModel, defaultThinkingLevel, thinkingBudgets
- 上下文：compaction.*, branchSummary.*, idleEvictionMinutes
- 消息：steeringMode, followUpMode, transport
- UI：theme, quietStartup, collapseChangelog, treeFilterMode, editorPaddingX, autocompleteMaxVisible, showHardwareCursor
- 图片：terminal.showImages, images.autoResize, images.blockImages
- 重试：retry.*
- 资源：packages, extensions, skills, prompts, themes, enableSkillCommands, enableBuiltinSkills
- 系统：shellPath, shellCommandPrefix, npmCommand, sessionDir, enabledModels

**CLI**（42 个 option + 19 个 subcommand）：
- 模式：-p, --mode json/rpc
- 模型：--provider, --model, --api-key, --thinking, --models
- 会话：-c, -r, --fork, --session-dir, --no-session
- 工具：--tools, --no-builtin-tools, --no-tools
- 资源：-e, --skill, --prompt-template, --theme, --no-context-files
- 自主：--autonomous, --autonomous-gate, --autonomous-max-*
- 目标：--goal, --goal-token-budget

**models.json**：
- Provider：baseUrl, api, apiKey, headers, authHeader, models, modelOverrides, compat
- Model：id, name, api, reasoning, thinkingLevelMap, input, contextWindow, maxTokens, cost
- API 类型：openai-completions, openai-responses, anthropic-messages, google-generative-ai

### 独特机制

**RLM**：
- `rlm(prompt, name, model, thinking)` 启动子 agent
- 子 agent 有独立 session 和 kernel
- 支持递归（默认最大深度 2）
- 结果通过 `agent_message` 或文件回传

**Continual Harness**：
- `/refine` 从自身 trajectory 提炼改进
- prompt notes、memories、skills、subagent specs 可持久化
- 支持 rollback

**Skills**：
- Markdown 或 Python-backed（SKILL.md + pyproject.toml + src/<name>/__init__.py）
- 发现：~/.prime/agent/skills/, ~/.agents/skills/, .prime/agent/skills/, .agents/skills/
- Python-backed skill 在 kernel setup 时 editable install

**Extensions**：
- TypeScript，由 jiti 直接加载
- 事件：session lifecycle、agent lifecycle、tool execution、message flow、provider request/response
- API：pi.registerTool, pi.registerProvider, pi.sendMessage, pi.setModel 等

**MCP**：
- Generic server：mcpServers in settings.json
- HTTP：url, headers, bearerTokenEnvVar, oauth
- stdio：command, args, cwd, env（只接受 env var 引用）
- 使用：await mcp.list_tools("server"), await mcp.call_tool("server", "tool", args)

### 平台支持

- Windows：shellPath 指定 bash
- Termux：pkg install nodejs termux-api git ripgrep
- tmux：extended-keys on, extended-keys-format csi-u
- Ghostty/WezTerm/VS Code/Windows Terminal：键位映射
- Shell aliases：shellCommandPrefix 启用 alias expansion

### 长运行能力

- Daemon lifecycle：prime-agent list/attach/agents/rename/stop/status/doctor/shutdown
- Messaging：agent_message.send，delivery modes（auto/steer/follow_up）
- Scheduling：/heartbeat, rlm_heartbeat, prime-agent schedule
- Goals：/goal, token budget, completion tracking
- Autonomous mode：/autonomous on/off，quality gates，limits

## 关键 URL

- 官方仓库：https://github.com/PrimeIntellect-ai/prime-agent
- 文档目录：https://github.com/PrimeIntellect-ai/prime-agent/tree/main/packages/coding-agent/docs
- 安装脚本：https://app.primeintellect.ai/prime-agent/install.sh

## 验证边界

- 所有信息来自官方文档一手直读
- 未运行所有功能实测
- 部分配置（如 RLM 深度限制）文档未明确说明配置入口
