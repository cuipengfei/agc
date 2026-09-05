# OMP 内置 Lifecycle Slash 命令

> 来源：builtin-lifecycle.ts（BUILTIN_LIFECYCLE_SLASH_COMMANDS 数组，25 条顶层命令）
> 约束：只读调查，机制断言附行号；不确定标「未确认」。

---

## /ssh（无别名）

- **描述**: Manage SSH hosts (add, list, remove)
- **子命令**:
  - add <name> --host <host> [--user <user>] [--port <port>] [--key <keyPath>] [--scope project|user] — 添加 SSH host 到项目级或用户级配置，helpers/ssh.ts:101-128
  - list — 列出所有已配置的 SSH host（项目级优先，去重），helpers/ssh.ts:79-99
  - remove <name> [--scope project|user] — 移除指定 host，helpers/ssh.ts:131-145
  - help — 显示帮助文本，helpers/ssh.ts:147-154
- **机制**: ACP 模式走 handleSshAcp 按子命令分发到增删查；TUI 模式把整条命令文本交给 runtime.ctx.handleSSHCommand 由交互层处理。配置分 project（.omp/ssh_config）和 user（~/.omp/agent/ssh_config）两级作用域，builtin-lifecycle.ts:130-147
- **场景**: 需要让 OMP 的 shell/remote 工具通过预配置别名连接远程主机时。
- **收益**: 避免在每条命令里重复写 IP、用户名、密钥路径。
- **证据**: 源码实证（helpers/ssh.ts + builtin-lifecycle.ts:130）

---

## /new（无别名）

- **描述**: Start a new session
- **子命令**: 无
- **机制**: TUI 专属（无 handle，只有 handleTui）。清空编辑器文本并调用 handleClearCommand，即新建一条会话分支/清空当前对话上下文，保留进程与会话文件。builtin-lifecycle.ts:148-153
- **场景**: 想在同一工作目录开启一轮全新对话，但不想丢失历史会话记录。
- **收益**: 上下文清零，session 文件仍保留，之后可用 /resume 切回。
- **证据**: 源码实证（builtin-lifecycle.ts:148）；无 ACP 等价路径（未确认 ACP 侧是否有同名命令走别的路由）。

---

## /fresh（无别名）

- **描述**: Reset provider stream state without changing the local transcript
- **子命令**: 无
- **机制**: 关闭当前 provider SSE/HTTP 流并重新初始化，本地 transcript 不变。ACP 模式下若正在 streaming 则拒绝；TUI 下由 handleFreshCommand 处理。builtin-lifecycle.ts:154-168
- **场景**: 模型流中断、token cache 异常、或需要重置 provider 会话但不想丢掉当前对话历史。
- **收益**: 刷新 provider 侧状态，通常可解决模型不再响应或 cache miss 问题。
- **证据**: 源码实证（builtin-lifecycle.ts:154-168）

---

## /clear（无别名）

- **描述**: Clear the conversation context in place, keeping the session
- **子命令**: 无
- **机制**: TUI 专属（无 handle）。清空编辑器并调用 handleResetContextCommand，在原地重置对话上下文（类似 /new 但保留同一会话标识）。builtin-lifecycle.ts:169-177
- **场景**: 当前会话上下文太混乱，想从零开始但保留同一个可恢复会话。
- **收益**: 上下文归零，session 标识不变，无需重新加载工作目录配置。
- **证据**: 源码实证（builtin-lifecycle.ts:169）

---

## /drop（无别名）

- **描述**: Delete the current session and start a new one
- **子命令**: 无
- **机制**: TUI 专属。调用 handleDropCommand 丢弃当前会话文件并新建会话，比重启更彻底。builtin-lifecycle.ts:178-183
- **场景**: 当前会话已损坏、历史过于冗长且无保留价值，或想彻底清空调试状态。
- **收益**: 完全删除当前会话历史，释放磁盘与上下文空间。
- **证据**: 源码实证（builtin-lifecycle.ts:178）

---

## /compact（无别名）

- **描述**: Manually compact the session context
- **子命令**:
  - soft [focus] — 仅用本地模型做对话摘要，跳过远程 compaction，session/compact-modes.ts:16-20
  - remote [focus] — 先走 OpenAI-compatible 远程 compaction，失败再回退本地 soft，session/compact-modes.ts:21-25
  - snapcompact — 将历史归档为高密度位图图像供 vision 模型读取，无 LLM 调用，不接受 focus 参数，session/compact-modes.ts:26-30
- **机制**: 解析可选 mode + focus 指令后调用 session.compact()。RPC host 会在后台队列中运行以释放命令通道；ACP/TUI 则内联等待。完成后输出 token 节省量。builtin-lifecycle.ts:184-232
- **场景**: 上下文窗口逼近上限、需要人工触发历史压缩以腾出 token。
- **收益**: 显著降低上下文 token 占用，保留关键语义摘要；可自选压缩策略（本地/远程/图像归档）。
- **证据**: 源码实证（builtin-lifecycle.ts:184-232 + compact-modes.ts）

---

## /shake（无别名）

- **描述**: Drop heavy content from context (tool results, large blocks)
- **子命令**:
  - elide（默认）— 丢弃工具调用结果和大段代码块，builtin-lifecycle.ts:234
  - images — 丢弃所有图像块，builtin-lifecycle.ts:235
  - thinking — 丢弃所有 thinking 块，builtin-lifecycle.ts:236
- **机制**: 调用 session.shake(mode) 按模式精确删除消息中的重内容：elide 会剥离 tool results 和大 fence/XML block；images 只删 image 类型消息；thinking 只删 thinking/redactedThinking。返回统计并重建聊天视图。builtin-lifecycle.ts:233-256；TUI 侧 command-controller.ts:1493-1516 同样调用 session.shake(mode) 后重建 UI。
- **场景**: 上下文被大量工具输出、截图或 thinking 块撑满，但不想做 LLM 压缩时。
- **收益**: 瞬间释放 token（无 LLM 调用），保留对话骨架；三种模式可按需精确清理。
- **证据**: 源码实证（builtin-lifecycle.ts:233-256 + shake-types.ts + command-controller.ts:1493）

---

## /handoff（无别名）

- **描述**: Hand off session context to a new session
- **子命令**: 无（接受可选 [focus instructions] 参数）
- **机制**: 非 TUI 走 session.handoff()，由 SessionMaintenance.handoff（session-maintenance.ts:1213-1244）生成一份 handoff 文档（一次性的 LLM 调用，利用 prompt cache），然后将该文档作为 compaction summary 提交到当前会话，实现原地交接。TUI 下 handleHandoffCommand（command-controller.ts:1592-1643）先检查 streaming 状态，再调用同一 session.handoff()，成功后重建聊天视图并显示交接分割线。与 /compact 不同，handoff 不中止当前 agent，而是通过侧请求管道读取快照。builtin-lifecycle.ts:286-328
- **场景**: 对话已经很长，想生成一份结构化交接文档作为后续压缩基准，或准备让另一个会话/分支从此摘要继续。
- **收益**: 获得一份机器可读的人工可审 summary，后续自动/手动 compaction 都以此为锚点；上下文被压缩但关键决策保留。
- **证据**: 源码实证（builtin-lifecycle.ts:286-328 + session-maintenance.ts:1213 + session-handoff.ts:92）

---

## /resume（无别名）

- **描述**: Resume a different session
- **子命令**: 无（参数为 [session id|@claude|@codex]）
- **机制**: TUI 专属。无参数时弹出会话选择器；@claude/@codex 弹出对应外部源选择器；有具体 id 时通过 resolveResumableSession 解析路径并调用 handleResumeSession。builtin-lifecycle.ts:329-352
- **场景**: 需要切回历史会话、或导入 Claude/Codex 的外部会话。
- **收益**: 无缝恢复历史上下文，支持跨工具会话迁移。
- **证据**: 源码实证（builtin-lifecycle.ts:329）

---

## /pin（无别名）

- **描述**: Pin or unpin a session at the top of the resume list
- **子命令**: 无（参数为 [session id]，省略则对当前会话操作）
- **机制**: 解析目标 session id 后调用 toggleSessionPin 切换钉选状态；输出 pin/unpin 结果。ACP 可用。builtin-lifecycle.ts:353-374
- **场景**: 常用会话希望固定在恢复列表顶部，避免被新会话挤到后面。
- **收益**: 快速定位高频会话。
- **证据**: 源码实证（builtin-lifecycle.ts:353）

---

## /btw（无别名）

- **描述**: Ask an ephemeral side question using the current session context
- **子命令**: 无（参数为 <question>）
- **机制**: TUI 专属。由 BtwController 处理：创建一条 ephemeral（一次性）侧请求，复用当前 session 的模型与 prompt cache，在独立面板中运行一个非工具调用的简短问答回合。完成后可 b 分支将回答合并回主会话，或 y 复制到剪贴板。不影响主 agent loop。builtin-lifecycle.ts:441-458；btw-controller.ts:37-175
- **场景**: 主任务进行中，突然想查一个旁路问题（如这个函数名什么意思），但不想打断当前 agent 流。
- **收益**: 旁路问答不污染主上下文；答案可一键合并或复制。
- **证据**: 源码实证（builtin-lifecycle.ts:441 + btw-controller.ts）

---

## /tan（无别名）

- **描述**: Run a full background agent on tangential work
- **子命令**: 无（参数为 <work>）
- **机制**: TUI 专属。由 TanCommandController 从当前会话 fork 一个独立的 AgentSession（共享 transcript 作上下文、但重置成本计数、清空 todo），注册为后台 async job。子 agent 注入 tanContextSwitchPrompt 提醒自己是旁路任务，每次 compaction 后自动重新注入以防漂移。完成后结果以自定义消息类型写回父会话，并 parked 到 Agent Hub 供后续查看。builtin-lifecycle.ts:459-470；tan-command-controller.ts:40-186
- **场景**: 需要并行处理一项不阻塞主线的长任务（如把这份代码整理成 wiki）。
- **收益**: 真正的后台子 agent，与主会话并行；结果自动回流；可事后从 Agent Hub 查看。
- **证据**: 源码实证（builtin-lifecycle.ts:459 + tan-command-controller.ts）

---

## /omfg（无别名）

- **描述**: Forge a TTSR rule from a complaint to stop a recurring behavior
- **子命令**: 无（参数为 <complaint>）
- **机制**: TUI 专属。由 OmfgController 接收用户抱怨（如别再给我加没请求的测试），通过最多 3 次 LLM 尝试生成一条 TTSR（tool-time safety rule）候选规则；每次生成后都会用当前会话消息验证规则条件是否匹配历史 assistant 输出。验证通过后弹出保存位置选择器：项目级（.omp/rules）、全局（~/.omp/agent/rules）或要求修改。保存后规则立即注册到当前会话的 ttsrManager。builtin-lifecycle.ts:471-482；omfg-controller.ts:39-231
- **场景**: 发现 agent 反复犯同一类错误，想自动拦截并纠正。
- **收益**: 零配置编程生成自定义安全规则，命中后可在工具执行前中断并重试。
- **证据**: 源码实证（builtin-lifecycle.ts:471 + omfg-controller.ts）

---

## /cleanse（无别名）

- **描述**: Detect and fix project diagnostics with weighted parallel subagents
- **子命令**: 无（参数为 [request] [--all] [--tests] [-n <agents>] [-m <model>]）
- **机制**: TUI 专属。由 CleanseCommandController 挂载覆盖面板，调用共享的 runCleanse 核心：先由 discovery agent 识别项目适用的 checker 命令（lint、typecheck、test 等），再按文件/诊断分组 dispatch 加权并行子 agent 去修复。面板实时显示 spinner、checker 行和修复进度；Esc 取消。builtin-lifecycle.ts:483-494；cleanse-command-controller.ts:30-142
- **场景**: 代码堆积了大量 lint/type/test 错误，想批量自动诊断并修复。
- **收益**: 多 checker 自动发现 + 并行子 agent 修复，结果在 TUI 面板可视化；支持 --all 全量或自由描述需求。
- **证据**: 源码实证（builtin-lifecycle.ts:483 + cleanse-command-controller.ts）

---

## /retry（无别名）

- **描述**: Retry the last failed agent turn
- **子命令**: 无
- **机制**: 检查当前是否 streaming，然后调用 session.retry() 重新调度上一失败回合。ACP 模式下因为 retry() 只把 continuation 加入 post-prompt task，所以必须调用 keepTurnOpenUntilIdle 保持订阅，否则 retried turn 会被静默吞掉。TUI 侧直接调用 session.retry() 并清空编辑器。builtin-lifecycle.ts:495-523
- **场景**: 上一回合因网络/模型错误失败，想原地重试。
- **收益**: 无需重新输入 prompt，自动复现上一次请求。
- **证据**: 源码实证（builtin-lifecycle.ts:495-523）

---

## /debug（无别名）

- **描述**: Open debug tools selector
- **子命令**: 无
- **机制**: TUI 专属。调用 showDebugSelector() 打开调试工具选择器（如查看内部状态、消息原始 payload 等）。builtin-lifecycle.ts:524-529
- **场景**: 排查 OMP 内部行为、查看消息结构或工具调用细节。
- **收益**: 快速进入调试菜单，无需记住隐藏快捷键。
- **证据**: 源码实证（builtin-lifecycle.ts:524）

---

## /memory（无别名）

- **描述**: Inspect and operate memory maintenance
- **子命令**（ACP 可用；mm 子系列仅 TUI）:
  - view — 显示当前注入到 system prompt 的 memory payload，builtin-lifecycle.ts:549-552
  - stats — 显示 memory backend 统计（后端实现决定内容），builtin-lifecycle.ts:568-572
  - diagnose — 运行 memory backend 诊断，builtin-lifecycle.ts:568-572
  - queue — 显示待合并的 memory delta 队列（仅部分 backend 支持），builtin-lifecycle.ts:560-565
  - sync — 立即执行一次 memory consolidation（与 enqueue 实现相同），builtin-lifecycle.ts:566-568
  - clear / reset — 清除持久化 memory 数据并刷新 system prompt，builtin-lifecycle.ts:553-558
  - enqueue / rebuild — 将 consolidation 加入队列（后端异步执行），builtin-lifecycle.ts:559-560
  - mm list — 列出当前 bank 中的 mental models（TUI only）
  - mm show — 显示单个 mental model（TUI only）
  - mm refresh — 刷新 auto-refresh models（TUI only）
  - mm history — 查看 mental model 变更历史（TUI only）
  - mm seed — 创建缺失的内置 mental models（TUI only）
  - mm delete — 删除 mental model（TUI only）
  - mm reload — 重新拉取缓存的 <mental_models> 块（TUI only）
- **机制**: ACP 模式下按首词分发到 MemoryBackend 接口的对应方法（buildDeveloperInstructions/clear/enqueue/stats/diagnose/queuePreview）。backend 由 resolveMemoryBackend 根据 memory.backend 配置动态选择（local / mnemopi / hindsight / sharpshooter / off）。TUI 下整条命令交给 handleMemoryCommand 处理，mm 系列子命令在 ACP 返回报错提示用 hindsight HTTP API。builtin-lifecycle.ts:530-596
- **场景**: 需要查看记忆注入内容、手动触发合并、清空记忆、或管理 mental models。
- **收益**: 可控的长期记忆生命周期管理；不同 backend（SQLite/远程/本地摘要）统一接口。
- **证据**: 源码实证（builtin-lifecycle.ts:530-596 + memory-backend/resolve.ts + memory-backend/types.ts）

---

## /rename（无别名）

- **描述**: Rename the current session
- **子命令**: 无（参数为 <title>）
- **机制**: ACP/TUI 均可用。调用 sessionManager.setSessionName(args, user) 设置用户级名称；若已有用户设置名称则拒绝覆盖。builtin-lifecycle.ts:597-620
- **场景**: 给会话起一个有意义的名字，方便日后 /resume 识别。
- **收益**: 恢复列表显示自定义标题，提升多会话管理效率。
- **证据**: 源码实证（builtin-lifecycle.ts:597）

---

## /move（无别名）

- **描述**: Move the current session to a different directory
- **子命令**: 无（参数为 [<path>]）
- **机制**: ACP/TUI 均可用。先 flush settings，再移动 session 文件到目标目录，成功后调用 rescopeHeadlessToCwd 重新加载该目录的 settings、provider globals、capabilities、skills、slash commands。若任一步失败则执行 rollback 并尝试重新对齐工作区。streaming 期间禁止执行。builtin-lifecycle.ts:621-654
- **场景**: 需要把当前会话迁移到另一个项目目录继续工作。
- **收益**: 会话上下文随工作目录一起迁移，无需重新配置模型或技能。
- **证据**: 源码实证（builtin-lifecycle.ts:621-654 + relocateHeadlessSession/rescopeHeadlessToCwd）

---

## /wt（别名: worktree）

- **描述**: Move this session into a new worktree, changes included
- **子命令**: 无（参数为 [<branch>]，默认分支名由 defaultSessionWorktreeBranch() 决定）
- **机制**: ACP/TUI 均可用。对当前 Git 仓库创建新 worktree（保留未提交更改），然后调用与 /move 相同的 relocateHeadlessSession 将会话迁过去；可选清理原 checkout。streaming 期间禁止执行。builtin-lifecycle.ts:655-686
- **场景**: 需要在同一仓库的另一个分支上并行工作，且想把当前会话完整带过去。
- **收益**: 自动 worktree 创建 + 会话迁移，避免手动切换分支导致上下文丢失。
- **证据**: 源码实证（builtin-lifecycle.ts:655-686）

---

## /add-dir（无别名）

- **描述**: Add a workspace directory to this session (multi-root)
- **子命令**: 无（参数为 <path>）
- **机制**: ACP 可用。解析路径并验证为目录后，调用 sessionManager.addWorkspaceDirectory 加入额外工作区；成功后刷新 base system prompt 使新目录的技能/上下文生效。streaming 期间禁止。builtin-lifecycle.ts:687-715
- **场景**: 当前项目由多个相关仓库组成，需要多根目录支持。
- **收益**: 单一会话内跨多个目录操作，system prompt 自动包含所有工作区上下文。
- **证据**: 源码实证（builtin-lifecycle.ts:687）

---

## /remove-dir（无别名）

- **描述**: Remove a workspace directory from this session
- **子命令**: 无（参数为 <path>）
- **机制**: ACP 可用。从会话的额外工作区列表中移除指定目录；禁止移除当前主 cwd。成功后刷新 base system prompt。streaming 期间禁止。builtin-lifecycle.ts:716-744
- **场景**: 之前添加的辅助目录不再需要，想缩小上下文范围。
- **收益**: 减少无关文件进入上下文，降低 token 消耗与噪音。
- **证据**: 源码实证（builtin-lifecycle.ts:716）

---

## /dirs（无别名）

- **描述**: List this session's workspace directories
- **子命令**: 无
- **机制**: ACP 可用。直接输出当前 cwd + 所有额外工作区目录列表。builtin-lifecycle.ts:745-751
- **场景**: 想确认当前会话绑定了哪些目录。
- **收益**: 一目了然的多根工作区视图。
- **证据**: 源码实证（builtin-lifecycle.ts:745）

---

## /exit（无别名）

- **描述**: Exit the application
- **子命令**: 无
- **机制**: TUI 专属。清空编辑器并调用 runtime.ctx.shutdown() 退出进程。builtin-lifecycle.ts:752-756
- **场景**: 结束当前 OMP 交互会话。
- **收益**: 正常关闭，保存未落盘状态。
- **证据**: 源码实证（builtin-lifecycle.ts:752）

---

## /restart（无别名）

- **描述**: Restart omp with the same launch flags, resuming this session
- **子命令**: 无
- **机制**: TUI 专属。清空编辑器并调用 runtime.ctx.restart()，用相同启动参数重启 OMP 进程，同时恢复当前会话。builtin-lifecycle.ts:757-762
- **场景**: OMP 行为异常、配置热加载未生效、或想刷新整个进程状态。
- **收益**: 进程级重启但会话不丢失，相当于软重启。
- **证据**: 源码实证（builtin-lifecycle.ts:757）
