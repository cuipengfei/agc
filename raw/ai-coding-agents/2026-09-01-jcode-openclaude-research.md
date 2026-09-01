# jcode 与 OpenClaude 调研原始记录（2026-09-01）

- Source URL: https://github.com/1jehuang/jcode ; https://github.com/Gitlawb/openclaude ; 及各证据页（随条目列出）
- Collected: 2026-09-01
- Published: Various（随条目列出）
- 方法：multi-source inquiry，两个并行 librarian 子任务核验 + GitHub API + grep.app 源码检索 + Tavily/DDGS 社区搜索 + 反方查询

## jcode（1jehuang/jcode）

### 基本面（GitHub API，2026-09-01 实测）

- 描述 "The most RAM efficient harness"；语言 Rust；License MIT
- stars 18,942；forks 2,167；open issues 396
- created 2026-01-05；default branch master；最新 release v0.81.4，published 2026-08-30
- 顶层目录含 ios/、sdk/、telemetry-worker/、crates/、docs/、OAUTH.md

### YC 身份

- YC 官方目录列为 "Jcode: The harness company"，Active，Summer 2026 批次，AI/Developer Tools，San Francisco。https://www.ycombinator.com/companies/jcode
- Launch YC 页面标题 "Jcode: High-performance coding agents"。https://www.ycombinator.com/launches/SUx-jcode-high-performance-coding-agents
- YC 页面创始人写 Jeremy Huang（Founder/CEO，21 岁）；GitHub 用户名为 1jehuang。"Jehu Huang" 无法由一手资料确认（[conflicting]，姓名不一致）。

### README 自测性能宣称（官方自测，无第三方复测）

- RAM（1 active session, PSS）：jcode (local embedding off) 27.8 MB baseline；jcode 167.1 MB
- 启动时间对比：Codex CLI 905.8 ms（18.6× slower）；OpenCode 1047.9 ms（21.5× slower）；GitHub Copilot CLI 1583.4 ms（32.5× slower）；Cursor Agent 1978.7 ms（40.6× slower）；Claude Code 3512.8 ms（72.2× slower）
- 方法与结果页：https://jcode.sh/bench（其页面自己讨论私有 benchmark 难审计、公共 benchmark 可能被训练污染）

### 功能（README/OAUTH.md 声明 + 源码核验）

- 跨 harness 会话恢复："Resume sessions from different harnesses… supported for codex, claude code, opencode, and pi"。源码：crates/jcode-tui/src/tui/app/onboarding_flow.rs
- 跨 harness 凭据导入：检测并经用户同意后读取 Claude Code（~/.claude/.credentials.json、macOS Keychain "Claude Code-credentials"、CLAUDE_CODE_OAUTH_TOKEN）、Codex CLI（~/.codex/auth.json）、Gemini CLI、Copilot CLI、OpenCode（~/.local/share/opencode/auth.json）、pi（~/.pi/agent/auth.json）；symlink 外部凭据文件被拒绝。OAUTH.md；crates/jcode-base/src/auth/claude.rs；crates/jcode-app-core/src/external_auth.rs
- Swarm 冲突感知："When agent A edits a file that agent B has read (code shifting under its feet), the server notifies agent B"；agent 可通过 swarm tool 自主 spawn 子 agent。crates/jcode-harness-api-server
- 记忆图：每轮 embedding + cosine 检索注入；memory sideagent 验证相关性；ambient mode 定期 consolidate（重组/查陈旧/查冲突）。crates/jcode-base/src/embedding.rs、crates/jcode-base/src/memory.rs、docs/MEMORY_ARCHITECTURE.md
- 内建 OAuth 登录流 10 个：Claude、OpenAI/ChatGPT/Codex、Gemini、GitHub Copilot、Azure OpenAI、Alibaba Cloud Coding Plan、Fireworks、MiniMax、Meta Muse、LM Studio；另有 openrouter/deepseek/kimi 等 OpenAI-compatible profile
- 其他：agent grep（带文件结构信息 + 按已读内容自适应截断）；Anthropic cache 5 分钟冷却警告；输入默认与 agent 交错发送且不打断 KV cache；skill 语义向量自动注入
- 计划中（未交付）：iOS 原生 App（经 Tailscale 连本机）；"OpenClaw like features" 捆绑进 iOS App；新的 git 替代原语设想
- 文档含 docs/SPONSORED_DISCOVERY_SPONSOR_ONBOARDING.md（harness 内建赞助发现/变现）

### 与 OpenCode/OMP/Prime/DSH 的唯一性核验（librarian，2026-09-01）

- 跨 harness 会话恢复：OpenCode 仅自身 resumeSession（packages/core/src/session.ts）；OMP 仅自身 JSONL session loader（packages/coding-agent/src/session/session-loader.ts）；Prime 仅自身 session resume/fork/attach（docs/sessions.md）；DSH unknown。→ 判定 jcode 独有
- 跨 harness 凭据导入：OMP 有自有 credential store/import（packages/ai/src/auth-storage.ts、auth-broker-cli.ts）但非多 harness 专用发现器；Prime 仅自有 auth.json（src/core/auth-storage.ts）；OpenCode 未发现；DSH unknown。→ 判定 jcode 独有
- Swarm 读集冲突通知：OpenCode 有 team 协作 PR #18753 与 session.ts 的 PromptConflictError（输入生命周期冲突，非文件读集）；OMP 有 conflict-detect.ts/worktree.ts（git merge 语义）；Prime 有 daemon 通信（daemon-protocol.ts）无文件级读集追踪；DSH unknown。→ 判定 jcode 独有
- 自动记忆图：OMP mnemopi 已有 embedding/cosine/episodic graph/veracity consolidation（packages/mnemopi/src/core/embeddings.ts、memory.ts、veracity-consolidation.ts）；Prime Continual Harness 有跨 session memory/refinement（prime-agent-runtime/src/rlm/harness.py）。→ 判定非独有，jcode 差异仅在自动注入+sideagent 验证+ambient consolidation 的组合
- 反方查询记录：claude code codex opencode pi session import（0 相关命中）；auth.json/credentials.json/keychain/CLAUDE_CODE_OAUTH_TOKEN 逐仓检索；file read write agent notification / read set modified by another agent / agent A changed file agent B read（均无反例命中）

### 社区接受度（librarian，2026-09-01）

- HN Algolia：「Jcode: RAM efficient coding harness written in Rust」5 points 0 comments（news.ycombinator.com/item?id=48978112）；「Show HN: New Harness in Town」3 points 0 comments（item?id=48745830）。HN 热度低
- Reddit：r/rust 发布帖 "Built a minimalistic coding agent in Rust optimized for …"（reddit.com/r/rust/comments/1tspsly/）
- 未找到 swyx、Simon Willison、levelsio 量级人物的公开评价
- 反方查询：jcode fake benchmark / fake benchmarks / benchmark criticism（0 条直接造假指控）；1jehuang stars fake/bot/astroturfing（无证据）；jcode.sh security vulnerability/CVE（无公开事件）

## OpenClaude（Gitlawb/openclaude）

### 基本面

- npm 包 @gitlawb/openclaude v0.30.0；Node>=22；TS 严格模式 + React/Ink TUI
- GitHub stars 约 30.7K（SkillsLLM 聚合页快照，2026-09-01 前后）
- README disclaimer 自述 "originated from the Claude Code codebase"；derived 代码归 Anthropic，MIT 仅覆盖贡献者修改
- 起源：2026-03-31 Anthropic npm 发布失误泄漏 Claude Code 完整 TS 源码（约 51.2 万行/512K lines；Business Insider、IPKat 报道；github/dmca 仓库 2026-03-31-anthropic.md）。Anthropic DMCA 先打掉约 8.1K 仓库的 fork 网络（误伤官方仓库合法 fork，anthropics/claude-code issue #41713），数小时后收缩到泄漏母仓库 nirholas/claude-code + 96 fork
- Gitlawb 为去中心化 git 托管平台，宣称 "will never be taken down"；CHANGELOG 2026-04-12 "rebrand prompt identity to openclaude"
- 未发现针对 OpenClaude/Gitlawb 的诉讼公开记录；仓库至 2026-09-01 存活

### 架构与功能核验（grep.app + DeepWiki + librarian 源码 permalink）

- 核心修改：src/services/api/openaiShim.ts 把 Anthropic SDK 调用翻译成 OpenAI Chat Completions；provider profile 存 .openclaude-profile.json；配置目录 ~/.openclaude
- 继承自 Claude Code：Bridge/Remote session（scripts/build.ts feature flag 以 "require Anthropic infrastructure" 禁用 BRIDGE_MODE，开源版可用性存疑）、hooks（112 文件）、memdir/CLAUDE.md 兼容层、VS Code 扩展
- OpenClaude 新增：headless gRPC server（src/grpc/server.ts、src/proto/openclaude.proto、docs/grpc-server.md）；background sessions（src/cli/bg.ts，带 PID 安全校验）；Buddy 像素伙伴（src/buddy/observer.ts、CompanionSprite.tsx——纯 UI 装饰，不参与规划/工具/权限决策）；xAI OAuth（src/cli/handlers/xaiAuth.ts）

### 唯一性核验（对 OpenCode/OMP/Prime/DSH）

- 订阅 OAuth 登录：OpenCode 支持 ChatGPT Plus/Pro（issue #31926）与 GitHub Copilot（opencode.ai/docs/providers/）；Prime Agent 支持 ChatGPT/Claude/Copilot /login（docs/providers.md，token 存 ~/.prime/agent/auth.json；xAI OAuth PR #1932 未合并）；OMP、DSH unknown。→ 非独有
- 多 provider：OpenCode 75+ providers → 非独有
- hooks/记忆/VS Code 扩展：各家均有等价 → 非独有
- gRPC headless：OpenCode 有 serve HTTP/SSE，能力等价、协议不同 → 非独有
- 唯一真实差异：唯一公开的「Claude Code 原版 harness + 任意模型」衍生实现（研究标本价值），附带法律灰色风险

### 社区接受度与风险信号

- 无 swyx/Latent Space 等头部声音对 OpenClaude 项目本身的评测或背书；Latent Space AINews 只报道泄漏事件与 fork 潮
- 安全研究员 Chaofan Shou 是泄漏事件的最早发现者（评的是事件，非本项目）
- Zscaler ThreatLabz 发现假冒「Claude Code leak」仓库被用作恶意软件诱饵（zscaler.com/blogs/security-research/anthropic-claude-code-leak）
- r/openclaude 子版出现「每日送 $1000 Claude Code API key」的诈骗特征帖
- 大量讨论将 OpenClaude 与 OpenClaw（另一项目）混淆
