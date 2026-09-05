# 四项被质疑断言的反向核查（2026-09-05）

- Source: 本 repo 研究会话，4 个并行 scout 子代理（SessionTemp / JcodeThree / OpenCodeSync / HarnessMimicry）
- Collected: 2026-09-05
- Published: Unknown
- 采集方式：用户对既有对比表的 16 条标注质疑其中 5 项机制断言。派 4 个只读 scout 做反向核查——不是证明 A 有某功能，而是逐个点名别家有没有。工具限 DeepWiki `ask_question`、context7、grep.app、web 搜索；禁止 clone、禁止安装。
- 下列四段为 scout 报告原文收录，未经改写。报告中标注的来源标签（`[deepwiki]`/`[context7]`/`[grep.app]`/`[web:域名]`/`[single-source]`）为子代理自述，主会话未逐条复核每个链接。
- 注意：OpenCodeSync 与 JcodeThree 的报告 `files` 字段列出了若干 wiki/raw 路径，但当时 `git status --porcelain` 为空、这些文件并不存在——scout 是只读的，那些路径是模型填充的字段噪音，不代表已入库证据。


## scout 报告原文：SessionTemp

## Completed (1)

### SessionTemp [task] — completed
Label: SessionTemp
Delivery: not auto-delivered; recovered by this snapshot.
```
<task-result id="SessionTemp" agent="scout" status="completed" duration="5m49s">
<meta lines="19" size="4.6KB" />
<output>
{
  "architecture": "Reasonix `sessiontemp` is a Go package (`internal/sessiontemp/manager.go`) that manages per-logical-session private temporary directories. It uses reference counting (Controller owners + per-process leases), lazy directory creation under `os.TempDir()` with prefix `reasonix-session-tmp-`, and binds the directory into sandboxed commands via TMPDIR/TMP/TEMP env overrides (Linux bwrap maps it to `/tmp`). Generations rotate on `/new`, `/clear`, resume, or branch switch; retired generations delete when lease count reaches zero. Stale cleanup (>24h) uses filelock-based ownership markers. The manager fails closed (`ErrUnavailable`) rather than falling back to host public temp. It is invisible to users—no settings, tool parameters, or prompt surface.",
  "files": [
    {
      "description": "Wiki article containing the disputed Reasonix sessiontemp claim (line 167: 'sessiontemp 可能独有')",
      "path": "wiki/ai-coding-agents/4-agent-comparison.md"
    },
    {
      "description": "Raw evidence file with the original `[verified]` sessiontemp annotation",
      "path": "raw/ai-coding-agents/2026-09-04-nine-candidates-b-to-a.md"
    },
    {
      "description": "Raw evidence file with prefix-cache removal and sessiontemp retention note",
      "path": "raw/ai-coding-agents/2026-09-04-annotation-review-corrections.md"
    }
  ],
  "report": "## 1. 这个机制到底做什么\n\n### 用户可见行为\n无。`sessiontemp` 被设计为**对模型和用户完全不可见**——没有设置项、没有工具参数、没有提示词表面。用户不会直接看到目录创建或清理。\n\n### 代码实现\n- **位置**：`internal/sessiontemp/manager.go`（存在，但早前 raw 证据中的 `internal/sessiontemp/manager.go` 路径虽然概念正确，却是在 DeepWiki 无索引、grep.app 才命中；该文件真实存在且可被直读）\n- **行为**：为每个逻辑会话创建一个私有临时目录（`reasonix-session-tmp-*`），同一会话内的所有 Bash/沙箱调用共享该目录（通过 `TMPDIR/TMP/TEMP` 注入；Linux bubblewrap 绑定到 `/tmp`）\n- **生命周期**：\n  - `Retain/Release`：Controller 级引用计数，热重载共享同一 Manager\n  - `Acquire/Release`：进程级 lease，命令结束后释放\n  - `Rotate`：`/new`、`/clear`、恢复其他会话、分支切换时轮换到新世代\n  - 退役世代在 lease 归零时删除；24h 以上 stale 目录通过 `.owner.lock` 文件锁安全清理\n- **安全模型**：fail closed——无法创建时返回 `ErrUnavailable`，绝不回退到主机公共临时目录\n\n## 2. 面向谁\n\n- **终端用户**：不可见，无感知\n- **项目开发者**：为沙箱执行层提供「会话内临时文件共享、会话间隔离」的基础设施\n- **集成方**：无直接接口，Controller 内部自动管理\n\n## 3. 别家有没有（逐个点名）\n\n| 项目 | 有无等价机制 | 来源与细节 |\n|---|---|---|\n| **OMP** | **有** | `leaseArtifacts` 为无持久会话文件的 subagent 在 `os.tmpdir()` 下分配临时目录，执行后清理 [deepwiki]。更关键的是 `pi-iso` 提供的多后端隔离（CoW/Union fs/Git worktree），sandbox 创建在 `~/.omp/wt/` 下并带 `.omp-isolation-owner.json` 所有权标记，支持 `omp worktree clear` 区分存活与崩溃残留 [deepwiki]。 |\n| **Grok Build** | **有** | `IsolationMode` 枚举定义 `None`/`Worktree`/`Sandbox` 三级隔离；`EffectiveRuntimeConfig` 持有解析后的 `SubagentIsolationMode` [deepwiki]。`xai-grok-sandbox` 管理 `/tmp`、`/var/tmp` 等临时目录写权限，并尊重 `TMPDIR` [deepwiki]。`xai-file-utils` 中有 `cleanup_orphans_recurses_into_scratch_subdirs` 测试，表明存在按年龄清理的 `scratch/` 子目录 [deepwiki]。 |\n| **claurst** | **有** | `AgentTool` 支持 `isolation: \"worktree\"`，在临时目录创建 `claude-agent-{agent_id}` 的 detached git worktree，执行后移除 [deepwiki]。`ManagedAgentConfig` 的 `executor_isolation` 可全局默认开启。 |\n| **crush** | **无（显式）** | 仅有 workspace 级 `DataDirectory` + `crush.lock` 文件锁；工具如 `agenticFetchTool` 在 data dir 内用 `os.MkdirTemp` 创建临时目录并 `defer RemoveAll`，属于 ad-hoc 用法，非会话级隔离基础设施 [deepwiki]。 |\n| **Claude Code** | **有** | 沙箱化 Bash 命令使用独立的 `$TMPDIR`；CHANGELOG 记载曾修复「`$TMPDIR` 被覆盖给所有命令而非仅沙箱命令」的回归（v2.1.163），证明存在会话/沙箱级临时目录隔离 [deepwiki]。支持 `CLAUDE_CODE_TMPDIR` 覆盖。 |\n| **DSH** | **有** | Windows `AclSandbox` 为每个 live session 生成 distinct SID 的私有临时目录（`tempWriteSid(path)`），会话结束后撤销 ACE 并删除目录 [deepwiki]。`dsh-spill-local` 将超大工具输出保存到按会话分组的私有文件 [deepwiki]。 |\n| **OpenCode** | **无** | 明确声明**不**对 agent 做沙箱隔离，权限系统仅为 UX 提示而非安全边界，Bash 工具以宿主用户权限运行 [deepwiki]。 |\n| **goose** | **有** | 自动注入 `AGENT_SESSION_ID` 环境变量，扩展和 shell 命令可用其创建会话专属临时目录/交接路径 [deepwiki]。\"Container Use\" MCP 扩展提供容器+Git branch 隔离 [deepwiki]。macOS Desktop 可选 `GOOSE_SANDBOX`（`sandbox-exec`）限制文件与网络访问 [deepwiki]。 |\n\n## 4. 裁定建议\n\n**常见能力**（同轴不同实现）。\n\n8 家被核查项目中，**6 家**（OMP、Grok Build、claurst、Claude Code、DSH、goose）拥有会话级或子 agent 级临时目录/沙箱/隔离机制，其中 OMP 的 `leaseArtifacts`+多后端隔离、DSH 的 Windows SID 隔离、Grok 的三级 `IsolationMode` 与 Reasonix 的 fail-closed lease 管理属于同轴竞争实现。仅 crush（ad-hoc）、OpenCode（无沙箱）两家未提供。\n\nReasonix 的实现特点在于：\n- **细粒度**：同一会话内多命令共享、会话轮换时世代切换\n- **安全**：fail-closed + 文件锁保护\n- **隐形**：无用户可见表面\n\n但这些是**工程成熟度差异**，不是「有无」的独有性差异。wiki 中 \"sessiontemp 可能独有\" 的断言应降级为 **\"同轴不同实现 / 常见能力\"**。",
  "summary": "Reasonix `sessiontemp` 为会话级私有临时目录管理（`reasonix-session-tmp-*`，lease 引用计数，24h stale 清理，fail-closed）。反向核查 8 家：OMP（leaseArtifacts+pi-iso 隔离）、Grok Build（IsolationMode+scratch 清理）、claurst（worktree 隔离）、Claude Code（沙箱 TMPDIR）、DSH（Windows SID 隔离）、goose（AGENT_SESSION_ID+容器）6 家均有等价或同轴机制；crush（仅 ad-hoc）、OpenCode（无沙箱）2 家无。裁定：常见能力，非独有。wiki \"可能独有\" 断言应更正。"
}
</output>
</task-result>

SessionTemp is now idle — message it via `hub` to follow up; transcript at history://SessionTemp
```
Structured output: schema valid; full payload at agent://SessionTemp, fields via agent://SessionTemp?q=.<field>

## Still Running (1)

- `JcodeThree` [task] — JcodeThree

## scout 报告原文：JcodeThree

## Completed (1)

### JcodeThree [task] — completed
Label: JcodeThree
Delivery: not auto-delivered; recovered by this snapshot.
```
<task-result id="JcodeThree" agent="scout" status="completed" duration="7m41s">
<meta lines="19" size="5.8KB" />
<preview full-output="agent://JcodeThree">
{
  "architecture": "三题各自独立，按「机制做什么→面向谁→别家有没有→裁定建议」四段格式。证据来自 DeepWiki 问答、Context7 文档、grep.app 源码搜索与本机 wiki 既有记录。",
  "files": [
    {
      "description": "jcode agentgrep 机制与实现细节",
      "path": "wiki/ai-coding-agents/4-agent-comparison.md"
    },
    {
      "description": "jcode ONNX 记忆与 consolidation 实现",
      "path": "wiki/ai-coding-agents/4-agent-comparison.md"
    },
    {
      "description": "jcode 自举开发循环受众与用途",
      "path": "wiki/ai-coding-agents/4-agent-comparison.md"
    }
  ],
  "report": "## (a) agentgrep —— 把文件结构/符号上下文注入搜索结果\n\n### 这个机制到底做什么\n**用户可见行为**：jcode 的 `agentgrep` 是一个内置搜索工具，除普通 `grep`/`find` 外，还提供 `outline` 与 `trace` 两种模式。`outline` 对单文件输出层级结构（函数名、类名、代码块起止行号、符号列表）；`trace` 用关系 DSL 查找跨文件的符号关联。搜索结果会附带这些结构上下文，使 agent 在不读取整文件的情况下推断文件内容。\n\n**代码实现**：核心在 `crates/jcode-app-core/src/tool/agentgrep.rs`，调用底层 `::agentgrep` crate 的 `run_outline` / `run_smart`。`AgentGrepHarnessContext` 结构体收集 `known_regions`、`known_files`、`known_symbols`，并可序列化为 JSON 上下文文件影响后续搜索。[deepwiki:1jehuang/jcode]\n\n### 面向谁\n终端用户（使用 jcode 的开发者）。agentgrep 是 jcode 内置工具之一，agent 在普通工作流中即可调用。\n\n### 别家有没有（逐家反向核查）\n| Agent | 等价行为 | 来源 |\n|---|---|---|\n| **OMP** | `read` 对可解析代码无 selector 时返回「结构摘要：声明保留、函数体省略」；另有不属于 `read` 的 codegraph MCP 返回调用链+blast radius。两者是独立工具，**并非把结构上下文注入搜索结果**。 | 本机 wiki 既有记录 |\n| **Claude Code** | `Grep` 工具纯文本匹配，无结构注入。CHANGELOG 多次修复 grep 分页/计数/路径问题，从未提及函数名/类名/层级上下文。 | [deepwiki:anthropics/claude-code] |\n| **OpenCode** | `grep` 基于 ripgrep，纯正则文本搜索，无 AST/结构注入。`lsp` 工具提供 `goToDefinition`/`findReferences`/`documentSymbol`，但属于独立代码智能工具，不是搜索结果的上下文增强。 | [deepwiki:anomalyco/opencode] |\n| **OMO** | 作为社区插件提供 AST-Grep 结构化搜索（覆盖 25 种语言），但这是插件层能力，非 OpenCode 核心原生搜索工具。 | [context7:code-yeongyu/oh-my-openagent] |\n| **aider** | **tree-sitter repo map**：PageRank 排序的标签图，覆盖 20+ 语言，向 LLM 发送「类/方法/函数签名」作为结构化上下文，使 LLM 无需读取整文件即可了解仓库结构。但 repo map 是**全局 prompt 注入**，不是「搜索结果注入」。 | [context7:aider-ai/aider] |\n| **Goose** | **`analyze` 平台扩展**：使用 tree-sitter，提供目录概览（函数/类计数）、单文件详情（函数签名、类、导入、调用次数）、跨文件 call graph。但 `analyze` 是**独立分析工具**，不是搜索结果的上下文增强。 | [deepwiki:aaif-goose/goose] |\n| **crush** | **`lsp_references`** 利用 LSP 返回符号引用（函数名、类名）的精确文件位置，属于结构感知搜索。但它是**独立 LSP 工具**，不是把 AST 节点注入 `grep` 结果。 | [deepwiki:charmbracelet/crush] |\n| **DSH / Prime / Grok / openinterpreter** | 文档/源码中未发现同类「搜索结果注入结构上下文」的机制。 | — |\n\n### 裁定建议\n**同轴不同实现**。jcode 的「把结构上下文注入搜索结果」这一具体交互模式（搜索即得结构摘要）确实较少见，但**用户可见目标**——让 agent 在不读整文件的情况下获得代码结构信息——已被 aider repo map、Goose analyze、OMP codegraph 等以不同方式实现。若 wiki 坚持保留此项，应把描述从「真独有」改为「内置搜索结果结构增强」，并注明 aider/Goose/OMP 通过独立工具达到同效。\n\n---\n\n## (b) ONNX 本地嵌入记忆 + 自动 consolidation\n\n### 这个机制到底做什么\n**用户可见行为**：jcode 将会话内容持久化为向量记忆，按余弦相似度召回，并自动做记忆整合（去重、矛盾检测、关系发现、剪枝）。默认无需联网即可运行。\n\n**代码实现**：\n- **嵌入**：默认使用本地 ONNX Runtime（`tract-onnx` crate），加载捆绑的 `all-MiniLM-L6-v2` 模型；用户可改配 `memory_embedding_backend = \"openai\"` 调用远程 API，缺失配置时静默回退本地 ONNX。[deepwiki:1jehuang/jcode]\n- **consolidation**：双层机制——① `memory sidecar`：每轮对话后零延迟轻量整合（仅操作已召回的记忆，做去重/矛盾检测/强化）；② `ambient mode`（Gardening）：后台图级整合（全图去重、矛盾消解、事实核验、关系发现、embedding 回填、聚类优化）。[deepwiki:1jehuang/jcode]\n\n### 面向谁\n终端用户。记忆系统在普通会话中自动运行，用户只需配置开关。\n\n### 别家有没有（逐家反向核查）\n| Agent | 记忆与嵌入机制 | 来源 |\n|---|---|---|\n| **OMP** | **Mnemopi**：默认本地 ONNX 嵌入（`fastembed` 库，`BAAI/bge-small-en-v1.5`），也可切 API；有 per-turn auto-retain（`mnemopi.autoRetain`）+ 背景 sleep cycle consolidation（working→episodic memory，含事实提取、摘要、图填充、embedding 调度）。 | [deepwiki:can1357/oh-my-pi] |\n| **Claude Code** | 有持久记忆（`auto-memory`、`/memory`、user/project/local 作用域），但 **未使用向量嵌入**（文档中无 embedding 提及，检索靠关键词/标签）。 | [deepwiki:anthropics/claude-code] |\n| **OpenCode** | **无原生持久记忆/嵌入**。社区插件 `opencode-supermemory` 提供跨会话记忆，但非内置。 | [deepwiki:anomalyco/opencode] |\n| **crush** | SQLite 存会话历史，**无向量嵌入**。 | [deepwiki:charmbracelet/crush] |\n| **Goose** | `Memory Extension` 文件式记忆，按 tag/keyword 检索，**未提及向量嵌入**。 | [deepwiki:aaif-goose/goose] |\n| **OpenInterpreter** | 文件式记忆（`~/.openinterpreter/memories`），`recall_archive` 用 BM25 文本检索，**无向量嵌入**。 | [deepwiki:openinterpreter/openinterpreter] |\n| **DSH** | **无内置记忆/嵌入**，通过 MCP 外挂第三方记忆服务器（Memorix/MCP Reference Memory/Engram），嵌入与否取决于外挂。 | [deepwiki:deepseek-ai/deepseek-harness] |\n\n### 裁定建议\n**同轴不同实现（本地 ONNX 嵌入+自动 consolidation 均非独有）**。\n- **本地零 API 嵌入**：OMP Mnemopi 同样默认本地 ONNX（`BAAI/bge-small-en-v1.5` via fastembed），jcode 并非独家。\n- **持久记忆**：Claude Code、Goose、OpenInterpreter 都有，只是后三者不用向量嵌入。\n- **自动 consolidation**：OMP 的 per-turn auto-retain + background sleep cycle（working→episodic，含事实提取、图填充、embedding 调度）与 jcode 的 sidecar + ambient gardening 同轴。\n\n若 wiki 保留此项，应降级为「功能等价」或「本地 ONNX 嵌入的默认策略差异」，并注明 OMP 已具备同等能力。唯一可能的差异点是 jcode 用 Rust `tract-onnx` 而 OMP 用 Node.js `fastembed` 子进程——这是实现细节，不构成 harness 层面的独有优势。\n\n---\n\n## (c) 自举开发循环（重建/测试/热载自己的二进制）\n\n### 这个机制到底做什么\n**用户可见行为**：`jcode self-dev` 进入自举模式后，jcode 能编辑、构建、测试自己的源码，然后用 `execvp` 热载替换当前运行的二进制，并保留会话状态、终端模式与主题，继续工作。\n\n**代码实现**：`SelfDevTool` 提供 `build`、`build-reload`、`test` 动作；`hot_reload` 函数（`src/cli/hot_exec.rs`）选最新有效二进制并替换当前进程；`scripts/refactor_shadow.sh` 用隔离的 `JCODE_HOME`/
</preview>
</task-result>

JcodeThree is now idle — message it via `hub` to follow up; transcript at history://JcodeThree
```
Structured output: schema valid; full payload at agent://JcodeThree, fields via agent://JcodeThree?q=.<field>

## scout 报告原文：OpenCodeSync

## Completed (1)

### OpenCodeSync [task] — completed
Label: OpenCodeSync
Delivery: not auto-delivered; recovered by this snapshot.
```
<task-result id="OpenCodeSync" agent="scout" status="completed" duration="4m36s">
<meta lines="15" size="6.0KB" />
<preview full-output="agent://OpenCodeSync">
{
  "architecture": "OpenCode 采用 client/server 架构，会话持久化层为本地 SQLite（Drizzle ORM），事件溯源模型（EventTable + EventSequenceTable），server 端提供 HTTP API 供客户端 replay。跨设备同步依赖用户自建 server（`opencode serve`）+ 网络 attach，非官方云上传。V1 有 share 功能（上传 opncd.ai），V2 官方文档声明已移除。OMP 为 typed JSONL 文件，DSH 为 append-only event sourcing with in-memory projections，crush 为 per-workspace SQLite + detached server + multi-client attach。",
  "files": [
    {
      "description": "OpenCode 原始证据：V1 share 功能存在、V2 官方文档声明未实现、事件溯源架构、跨设备 replay 机制",
      "path": "raw/ai-coding-agents/2026-09-05-opencode-session-replay-privacy-audit.md"
    },
    {
      "description": "OpenCode 与竞品 session/event 机制对比裁定更新",
      "path": "wiki/ai-coding-agents/4-agent-comparison.md"
    }
  ],
  "report": "## 1. 这个机制到底做什么\n\n### 用户可见行为\nOpenCode 将会话历史存储在本地 SQLite 数据库中。用户可以：\n- 在同一项目内恢复过往会话\n- 通过 `/share` 命令（V1）生成公开链接分享会话\n- 在 V2 中，通过 `opencode serve` 启动本地 server，其他设备/客户端通过网络 attach 并 replay 事件日志\n\n### 代码实现\n- **存储**：本地 SQLite（`~/.local/share/opencode/opencode.db`，WAL 模式），Drizzle ORM 管理。关键表：`SessionTable`、`SessionInputTable`、`EventTable`、`EventSequenceTable`。[deepwiki]\n- **事件溯源**：`SyncEvent` 抽象，每条事件带单调递增 `seq` ID，server 端全序保证。投影层从事件日志 idempotent upsert message/part 行。[grep.app:agenta-ai/agenta]\n- **Replay API**：`GET /api/experimental/session/:id/snapshot?recent=N` 和 `session.log?after=seq&follow=true&ephemeral=true`。[grep.app:anomalyco/opencode#43302]\n- **Sync Fencing**：mutation 发生时 server 发送 sync fence header（含 seq），防止客户端读到过期数据。[deepwiki]\n\n## 2. 面向谁\n- **终端用户**：关心会话能否跨设备恢复、隐私是否泄漏\n- **集成方/开发者**：使用 SDK (`@opencode-ai/sdk/v2`) 或 HTTP API 消费会话事件的第三方工具\n- **企业部署**：需要配置 `share: disabled` 或自托管以满足合规\n\n## 3. 别家有没有（逐个点名）\n\n### OMP (`can1357/oh-my-pi`)\n- **存储**：typed JSONL 文件（`~/.omp/agent/sessions/<encoded-cwd>/<timestamp>_<sessionId>.jsonl`），每行带 `type`/`id`/`parentId`/`timestamp`，append-only。[deepwiki]\n- **Replay/Resume**：`SessionManager#setSessionFile` 加载、迁移、解析 blob 引用、索引条目；`ACPAgent#replaySessionHistory` 发送会话更新通知。[deepwiki]\n- **跨设备/多客户端**：`collab` 功能支持通过链接分享实时会话，队友可从另一终端或浏览器加入（读写配对或只读）。`ingestReplicatedEntry` 供访客镜像 host 会话；`snapshotForReplication` 提供实时 header + entries 深拷贝。[deepwiki]\n- **结论**：OMP 已实现等价能力（typed append-only 日志 + replay + 多客户端 collab），且 collab 支持跨网络（通过链接）。\n\n### DSH (`deepseek-ai/deepseek-harness`)\n- **存储**：append-only `SessionEvent` log，每条带 `seq` + Unix epoch `time`，log 数组在 `Session` 类内部维护。[deepwiki]\n- **投影**：`deriveMessages()` 从事件日志增量缓存投影为 `Message[]`（\"Surface\"）。`SessionProjectionRegistry` 支持插件定义派生状态。[deepwiki]\n- **持久化**：`dsh-session-persistence-jsonl` 后端将 session headers + 连续事件存入不可变 generation 文件，原子更新 + 崩溃恢复。[deepwiki]\n- **跨设备/客户端**：`ctx.agents.resume()` 打开写句柄、读取存储日志、发布准备好的会话；`ctx.sessions.fork()` 继承父会话事件前缀。[deepwiki]\n- **结论**：DSH 的事件溯源 + 投影 + 跨设备恢复与 OpenCode 等价，且 DSH 的 append-only 保证更严格（immutable generation files）。\n\n### crush (`charmbracelet/crush`)\n- **存储**：per-workspace SQLite 数据库，WAL 模式。[deepwiki]\n- **Detached Server**：`crush server` 启动独立后台进程，`startDetachedServer` 用 `exec.CommandContext(context.Background(), ...)` 确保生命周期不与父进程绑定。[deepwiki]\n- **多客户端 attach**：`AttachClient` / `DetachClient`；同一目录的多客户端加入同一 `Workspace`，共享会话列表、消息历史、权限队列、LSP、MCP 状态。`AttachedClients` 计数非零表示会话在其他客户端进行中。[deepwiki]\n- **结论**：crush 的 per-workspace SQLite + detached server + multi-client attach 与 OpenCode 的架构几乎同构。\n\n### Claude Code\n- 有 `SendMessage`（跨机器会话互发）+ Agent Teams（research preview）。[deepwiki]\n- 但无明确的事件日志 replay 机制，session 存储为本地 JSONL。\n- **结论**：部分等价（跨设备通信），无完整事件溯源 replay。\n\n### Grok Build / Prime Agent / jcode / OpenClaude\n- 未在调查中确认具备等价的事件日志 + 投影 + replay + 多客户端 attach 完整栈。\n\n## 4. 裁定建议\n\n### 存储拓扑\n- **SQLite 位置**：本地 `~/.local/share/opencode/opencode.db`（macOS/Linux）或 `%USERPROFILE%\\.local\\share\\opencode`（Windows）。[deepwiki]\n- **`sessions.events({after?})` 性质**：本地 server 提供的 HTTP API（`session.log?after=seq`），非远端云 API。[grep.app:anomalyco/opencode#43302]\n- **「跳设备」实现方式**：**自建 server + 网络 attach**。用户在一台设备运行 `opencode serve`，另一台设备通过 SDK/CLI attach 到该 server，replay 事件日志。不是上传到官方云，也不是仅限同一台机器的多 client。[grep.app:agenta-ai/agenta, deepwiki]\n\n### 隐私优先宣传与矛盾\n- OpenCode 官方宣称 \"privacy-first: no code/context data stored\"。[deepwiki]\n- **V1**：`share` 功能明确是例外——执行 `/share` 后会话历史（完整对话、消息、元数据）上传到 `opncd.ai` 服务器，通过 Cloudflare CDN 提供。[deepwiki, tavily]\n- **V2**：官方文档 `https://opencode.ai/v2/docs/sharing` 明确声明 **\"Session sharing is not yet available in OpenCode V2\"**，当前无 functional share/unshare endpoint。[tavily]\n- **默认开关**：V1 默认 `\"manual\"`（opt-in），可设 `\"auto\"` 或 `\"disabled\"`。[deepwiki, tavily]\n- **矛盾评估**：V1 不矛盾（opt-in 例外），但 share 功能是官方隐私承诺的明确边界例外。V2 因尚未实现 share，当前无此矛盾。`OPENCODE_DISABLE_SHARE` 环境变量可禁用分享后端。[deepwiki]\n\n### share 功能（V1）\n- **上传内容**：完整会话历史、所有消息和响应、会话元数据。[deepwiki]\n- **上传目的地**：`opncd.ai` 服务器（Cloudflare R2 + Durable Objects），公开链接 `opncd.ai/s/<share-id>`。[tavily]\n- **默认状态**：V1 默认 `\"manual\"`（opt-in）；V2 未实现。[deepwiki, tavily]\n- **能否关闭**：可以，设置 `\"share\": \"disabled\"` 或环境变量 `OPENCODE_DISABLE_SHARE`。[deepwiki]\n- **已知问题**：GitHub issue #17188
</preview>
</task-result>

OpenCodeSync is now idle — message it via `hub` to follow up; transcript at history://OpenCodeSync
```
Structured output: schema valid; full payload at agent://OpenCodeSync, fields via agent://OpenCodeSync?q=.<field>

## Still Running (2)

- `SessionTemp` [task] — SessionTemp
- `JcodeThree` [task] — JcodeThree

## scout 报告原文：HarnessMimicry

## Completed (1)

### HarnessMimicry [task] — completed
Label: HarnessMimicry
Delivery: not auto-delivered; recovered by this snapshot.
```
<task-result id="HarnessMimicry" agent="scout" status="completed" duration="3m58s">
<meta lines="27" size="6.9KB" />
<preview full-output="agent://HarnessMimicry">
{
  "architecture": "openinterpreter: Rust-native multi-harness emulation layer (codex-rs) that constructs per-harness system prompts, tool schemas, and wire-format payloads at runtime; retains its own agent loop. OpenClaude: Fork of the leaked Claude Code TS codebase (~512K lines, 2026-03-31 npm source-map leak) with an OpenAI-compatible provider-shim (openaiShim.ts) translating Anthropic SDK calls to /chat/completions.",
  "files": [
    {
      "description": "jcode and OpenClaude raw research notes (2026-09-01)",
      "path": "raw/ai-coding-agents/2026-09-01-jcode-openclaude-research.md"
    },
    {
      "description": "Nine-candidate B→A comparison with openinterpreter harness findings (2026-09-04)",
      "path": "raw/ai-coding-agents/2026-09-04-nine-candidates-b-to-a.md"
    },
    {
      "description": "Four-lane capability survey with openinterpreter DeepWiki/grep.app evidence (2026-09-05)",
      "path": "raw/ai-coding-agents/2026-09-05-four-lane-capability-survey.md"
    },
    {
      "description": "A-side verification of existing eight agents (2026-09-04)",
      "path": "raw/ai-coding-agents/2026-09-04-existing-eight-a-side-verification.md"
    },
    {
      "description": "Wiki comparison article with openinterpreter upgrade and OpenClaude assessment",
      "path": "wiki/ai-coding-agents/4-agent-comparison.md"
    }
  ],
  "report": "## 1. openinterpreter 的 harness 仿真到底做什么\n\n### 用户可见行为\nOpen Interpreter 允许用户在会话中执行 `/harness claude-code`（或 `claude-code-bare`、`kimi-code`、`deepseek-tui`、`zcode`、`opencode`、`pi` 等 13+ 种模式），切换后同一个底层 runtime 会以目标 harness 的「口吻」与模型对话。模型无需知道自己在被仿真；对 Claude 模型走 `claude-code` 模式时，它会收到与原生 Claude Code 几乎一致的工具集和系统指令。\n\n### 代码实现\n根据 DeepWiki 对 `openinterpreter/openinterpreter` 的源码级回答 `[deepwiki]` 与官方 harness 文档 `[web:openinterpreter.com]`，仿真层不是简单的请求格式转换，而是三段式深度构造：\n\n- **System Prompt**：`claude_code_system_and_tools` 函数按 `ClaudeCodeProfile::Full` 或 `Bare` 构建系统提示。Full 版包含工具使用指南、CWD、git status、平台信息、shell、OS 版本、模型信息、上下文管理指令；Bare 版精简为 CWD + 日期。\n- **Tool Definitions**：将 Open Interpreter 内部工具映射到 Anthropic 工具定义。Bare 仅暴露 Bash/Edit/Read，Full 额外包含 Grep 等。工具最终渲染为扁平 Responses-style function tools，以兼容不同 wire protocol。\n- **Wire Format 请求构建**：\n  - Messages API → `build_request_for_profile` 构造 `AnthropicMessageRequest`\n  - Responses API → `build_claude_code_responses_shaped_request` 叠加 Claude Code shaping\n  - Chat Completions API → 同一 responses-shaped request 经 chat-wire-compat 转换后输出 `/chat/completions` body\n\n`codex-rs/core/src/harness/request.rs` 模块注释自述为 **\"chat-completions harness emulation\"** `[single-source: wiki raw]`；`codex-rs/tools/src/harness.rs` 定义 `pub enum Harness { Native, ClaudeCode, ClaudeCodeBare, DeepSeekTui, KimiCode, KimiCli, OpenCode, Pi, QwenCode, SweAgent, Terminus2, Minimal, ZCode, Other(String) }` `[single-source: wiki raw]`。\n\n**关键区分**：openinterpreter 保留自己的 Rust-native agent loop 和 tool runtime，不 shell out 到外部 Claude Code CLI。它是「把自己伪装成多家 harness」，而非「调用外部 harness」。\n\n---\n\n## 2. OpenClaude 的实现路径\n\n### 用户可见行为\n`npm install -g @gitlawb/openclaude` 后运行 `openclaude`，用户得到一套与 Claude Code 几乎一致的 TUI、工具集、hooks、session 管理，但可以在 `/provider` 里切换成 OpenAI、DeepSeek、Gemini、Ollama 等任意 OpenAI-compatible 后端。\n\n### 代码实现\nOpenClaude 是 **2026-03-31 Anthropic npm 发布失误泄漏的 Claude Code 完整 TS 源码（~512K 行）的 fork** `[web:Business Insider/IPKat/theneurondaily]`。核心修改集中在 `src/services/api/openaiShim.ts`：\n\n- 拦截原本发往 Anthropic SDK (`anthropic.beta.messages.create`) 的调用\n- 翻译成 OpenAI Chat Completions 请求体\n- 清理 `anthropic-*` header，防止泄漏到第三方 provider `[grep.app: gitlawb/openclaude#499]`\n\nDeepWiki 明确结论 `[deepwiki]`：**OpenClaude does not reverse-engineer Claude Code's system prompt and tool schema. Instead, it explicitly modifies the system prompts to reflect \"OpenClaude\" instead of \"Claude Code\"**。它直接继承泄漏代码中的 harness 逻辑、工具定义、session 管理、hooks、VS Code 扩展等，做的不是「仿真」而是「品牌替换 + provider 嫁接」。\n\n---\n\n## 3. 差异结论：本质不同，但「唯一公开实现」声称不成立\n\n### 3.1 架构差异（真不同）\n\n| 维度 | openinterpreter | OpenClaude |\n|------|----------------|------------|\n| 代码来源 | OpenAI Codex 的 Rust 重写分支 | Claude Code 泄漏源码的直接 fork |\n| harness 获取方式 | 从零构造 prompt + tool schema + wire format | 直接使用泄漏代码中的原版 harness |\n| runtime | 自有 Rust-native agent loop | 继承的 Claude Code TS runtime |\n| 多 harness 支持 | 13+ 种（ClaudeCode、KimiCode、DeepSeekTui、OpenCode、Pi…） | 仅 Claude Code 一种（加 provider 切换） |\n| 法律属性 | 无已知法律风险 | DMCA 灰色（泄漏事件衍生；Anthropic 已下架 8.1K fork 网络） |\n\n### 3.2 功能重叠（用户视角等价）\n从终端用户视角，两者都实现了「让非 Claude 模型体验 Claude Code 风格的 harness」。openinterpreter 的 `Harness::ClaudeCode` 确实在做与 OpenClaude 同方向的事：让 GPT-4o / DeepSeek / Kimi 等模型在 Claude Code 形状的 prompt 和工具集下运行。\n\n### 3.3 对「唯一公开实现」的裁定\n**OpenClaude 的「唯一公开的『原版 Claude Code harness + 任意模型』衍生实现」描述不成立。**\n\n- **反例 1：openinterpreter**。它公开提供了原生的 `claude-code` harness 仿真，包含 system prompt、tool schema、wire format 的完整克隆，且是 MIT 许可的独立代码，无法律灰色 `[deepwiki]` `[web:openinterpreter.com]`。\n- **反例 2：claurst**。`Kuberwastaken/claurst` 是 clean-room Rust reimplementation of Claude Code，明确声明不使用泄漏源码 `[dee
</preview>
</task-result>

HarnessMimicry is now idle — message it via `hub` to follow up; transcript at history://HarnessMimicry
```
Structured output: schema valid; full payload at agent://HarnessMimicry, fields via agent://HarnessMimicry?q=.<field>

## Still Running (3)

- `SessionTemp` [task] — SessionTemp
- `JcodeThree` [task] — JcodeThree
- `OpenCodeSync` [task] — OpenCodeSync


## 主会话补充核验：OMP Mnemopi 的本地 ONNX 嵌入路径（本机源码直读）

JcodeThree scout 称「OMP Mnemopi 默认本地 ONNX 嵌入」。主会话用本机安装的 OMP 类型声明核验，确认**本地路径存在**，但「是否为默认」未定论。

来源：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/types/mnemopi/`

`embed-client.d.ts:3-10` 原文：

> /**
>  * Parent-side handle for the mnemopi embeddings subprocess. The runtime
>  * implementation is a Bun child process so `onnxruntime-node`'s NAPI
>  * constructor + finalizer never run inside the main agent address space —
>  * those destructors segfault Bun on Windows when mnemopi's local embedding
>  * provider loads fastembed in the main process (issue #3031; the mnemopi
>  * sibling of the tiny-model fix from #1606 / #1607).
>  */

`embed-client.d.ts:20-22` 原文：

> * The child inherits the parent env — fastembed honours `HF_HUB_*`,
> * `HTTPS_PROXY`, etc., and our `loadFastembed()` reads the same `OMP_*`
> * runtime-install knobs the parent uses.

`embed-client.d.ts:39` 原文：

> * Load the named fastembed model inside the subprocess.

`embed-protocol.d.ts:11` 原文：

> /** Identifier of the fastembed model the worker should load (e.g. `fast-bge-base-en-v1.5`). */

`embed-protocol.d.ts:1-9` 原文：

> /**
>  * Wire types between the parent (`MnemopiEmbedClient`) and the local
>  * embeddings subprocess. The parent owns the subprocess lifecycle (graceful
>  * work, hard `SIGKILL` on shutdown); the protocol carries no explicit close
>  * handshake — once the parent decides to terminate, it signals the OS to reap
>  * the child so `onnxruntime-node`'s NAPI finalizer never runs in the main
>  * agent address space (it crashes Bun on Windows shutdown — issue #3031, the
>  * mnemopi sibling of the tiny-model fix from #1606/#1607).

反向张力：既有 wiki 文章 `wiki/omp-mnemopi/consolidation-lifecycle.md:59-60,86` 记录本机 Mnemopi 实际配置为 `embeddingApiUrl: http://localhost:4140/v1` + `embeddingModel: text-embedding-3-small`，即走 API 嵌入而非本地模型。两者不矛盾（本地路径存在、本机选择覆盖为 API），但 scout 的「默认」措辞本轮无法证实，故 wiki 只写「本地路径存在」。
