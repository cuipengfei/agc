# ai-memory：跨 agent 的长期记忆服务

> Sources: akitaonrails/ai-memory GitHub, 2026-10-27
> Raw: [ai-memory README 摘录](../../raw/ai-memory/2026-10-27-ai-memory-readme.md); [ai-memory OMP 接入与 MCP 工具](../../raw/ai-memory/2026-10-27-ai-memory-omp-integration-and-mcp-tools.md); [本机 Mnemopi 库统计](../../raw/omp-mnemopi/2026-10-27-local-mnemopi-bank-stats.md); [Mnemopi 捕获与 LLM 边界](../../raw/omp-mnemopi/2026-10-27-mnemopi-capture-and-llm-boundaries.md)
> Updated: 2026-10-27

## Overview

ai-memory（akitaonrails/ai-memory，MIT）是面向编码 agent 的长期记忆服务：在 Claude Code 里中断的任务，换到同目录的 OpenAI Codex 能接着做，不用重讲架构、失败路线和未决问题。它以单个自包含二进制交付，权威源是一份 git 托管的普通 markdown wiki，SQLite 只做派生索引；二十多个 harness（Claude Code、Codex、Cursor、Gemini CLI、OpenCode、Grok、Devin、Kimi、Kiro 等）写入同一份记忆，同一台机器、同一局域网的另一台机器、乃至整个团队都指向同一个服务端。仓库自述规模：13.9k stars（精确 13,962）、994 forks、4,811 commits，支持矩阵中 Oh My Pi / OMP 为 Supported。

## 运行形态

一个 Rust 二进制同时跑 MCP/HTTP 服务并独占一个数据目录。Docker 快速启动示例绑定 `127.0.0.1:49374`，注释明确为 loopback-only；该 compose 路径不跑 `init`，因此没有 token，本机进程和浏览器页面仍可访问。原生安装脚本 `install.sh` 校验 SHA-256 后链接 `~/.local/bin/ai-memory`，`ai-memory setup` 建数据目录、生成本用户专属文件里的 bearer token、起 systemd `--user` 或 launchd LaunchAgent 服务，并接线 MCP、hooks 与 Agent Skills；`--plan` 只打印计划，`--web` 把计划显示在浏览器页面里，勾选后应用，`--yes` 跳过询问。

数据目录布局固定为 `wiki/`（markdown 权威源，git 版本化）、`raw/`（不可变的已脱敏 managed-workstream 转录段）、`db/`（SQLite 索引，含 FTS5、实体与嵌入）、`models/`（预留给本地嵌入模型）、`logs/`（滚动 tracing 输出）。对外接口两条：agent 的 lifecycle hooks 向服务 POST 观察记录，MCP 客户端走 HTTP 取记忆与执行工具；安装器的 `--web` 页面只用于展示和勾选接入计划。

## 捕获与整合

lifecycle hooks 静默记录 prompt、tool call、会话边界，先在带类型的隐私边界上做脱敏，再进入存储。正文上限与服务端 10 MiB HTTP 请求上限相互独立：用户 prompt 与压缩后摘要按 UTF-8 安全截到 16 KiB，通知与工具摘录截到 2 KB；原生 `ai-memory hook` 命令在本地 spool 和传输之前就按事件类型截断，服务端解析每个请求时重复一次，直连客户端和旧客户端绕不过去；脱敏之后的持久化观察正文再受 16 KiB 兜底。

会话结束时，观察记录被编译成项目 wiki 里的 markdown 页面（可选由 LLM 撰写，不用 LLM 也有用）。服务把所有写入串行化到单一 SQLite writer，检索侧用 FTS5、实体匹配与图邻居 RRF，叠加可选向量 RRF、观察证据流（默认开启）、有界来源权威度调整，以及非全局检索时的有界原始观察回退。wiki 目录本身就是 git 仓库，页面变更进入提交历史。

## 零 LLM 默认与可选项

默认零 LLM：不配任何 key，FTS5 检索照常工作。记忆按可调的分层计划衰减，被用过的记忆衰减更慢——打开页面、搜索命中、沿链接到达都算使用。配置了 LLM 之后，可选的后台 "dream" 在空闲时把整簇冷笔记重写成单页连贯内容，用户回到工作就取消；这类改写走 supersede-not-delete 加 `restore-page`，既有的 opt-in 特性默认关闭且从不删除源。纯 markdown 意味着可以直接 `grep`、在 Obsidian 里打开、手工编辑或 `rsync`。

嵌入默认也在本进程内完成：`embedding_provider` 未设置时选本地 all-MiniLM-L6-v2（384 维），无 API key、无云调用；首次启动若模型文件不在，服务在后台从 `huggingface.co` 下载三个文件（合计 ~87 MB，源码内 sha256 固定），混合检索在下次重启后启用。传输方向只是下载，已存内容不外发；请求地址与时间对 Hugging Face 及其 CDN 可见，请求本身不携带正文。要完全避开这次下载，可设 `embedding_provider = "none"`，或按 `docs/airgapped-install.md` 与 `docs/local-embeddings.md` 离线预置模型文件。

## 检索、brief 与 handoff

`memory_query` 是主检索入口，串联 FTS5、实体匹配、图 RRF、可选向量 RRF 与默认开启的观察证据流，再做按 kind/tier/pinned/tag 的有界权威度调整和原始回退。`memory_briefing` 返回结构化的计数、活动、规则、slot 与最近快照；`memory_status` 报计数、路径、版本和实际应答的 `scope`（`workspace`、`project`、`resolved_by` 取值含 `explicit`、`session`、`shared_slot`、`startup_seed`、`default`、`default_after_mismatch`）。

交接协议由四个工具组成，都是一次性认领语义：`memory_handoff_begin` 为下一个 agent 打开 owner 作用域的 handoff，`shared=true` 才主动发布到项目；`memory_handoff_list` 列出自己或共享的未决 handoff 并展示正文与身份字段，这一步行不认领也不过期；`memory_handoff_accept` 取回并 ack；`memory_handoff_cancel` 把误建的、恰好可见的未决 id 标记为过期。root-only 的 `any_owner=true` 用于跨操作者恢复。

页面级工具：`memory_write_page` 在用户明确要求记住时写持久 wiki 知识；`memory_read_page` 按 `path` 或某个 `query` 的首个 FTS5 命中取全文；`memory_restore_page` 仅管理员可用，不带 `rev` 时列出改动过该 path 的 git checkpoint，带 `rev` 时把该版本正文与 frontmatter 走 `memory_write_page` 同一条路径写回（含已删页面，仅项目页）；`memory_delete_page` 按精确 `path` 删除，`expected_page_id` 不匹配时不动并返回 `reason: "precondition_failed"`；`memory_forget_sweep` 执行保留策略清理，`dry_run=true` 预览；`memory_lint` 把规则与 LLM 的矛盾发现写入 `wiki/_lint/`；`memory_consolidate` 做 LLM 驱动的页面重写。

## 接入 OMP 的具体产物

MCP 侧：`install-mcp --client omp`（别名 `--client oh-my-pi`）向 OMP 原生 `.omp` 集成面写 `mcp.json`，示例 server URL 为 `http://homelab:49374/mcp` 并附 `--auth-token`。Hook 侧：`install-hooks --agent omp --apply` 生成 `~/.omp/agent/extensions/ai-memory-omp.ts`；OMP 启动时直接发现 agent dir 下 `extensions/` 里的 `*.ts` / `*.js`，无需合并设置文件。OMP 的 CLI 参数必须显式点明 OMP，`--client omp` 管 MCP、`--agent omp` 管 hooks；两者都接受 `oh-my-pi` 别名。装完必须重启 OMP，扩展只在启动时加载。

生成的扩展用 OMP lifecycle API 做捕获，用 `before_agent_start` 做 handoff 注入：该钩子里先 `startSession`，再 POST `user-prompt`（带 prompt 与图片数），随后按 session id 去重一次查询 handoff，命中就返回一条消息，`customType` 为 `"ai-memory-handoff"`、`content` 为 handoff 正文、`display: false`、`attribution: "agent"`。`session_start` 负责起会话，`tool_call` 继续喂观察。Pi 与 OMP 的扩展文件名刻意不同（`ai-memory-pi.ts` / `ai-memory-omp.ts`），互不覆盖，且只有 Pi 版把 ai-memory 的 HTTP MCP 工具桥进宿主；OMP 版靠 `mcp.json` 拿工具。profile 场景下 `install-hooks --agent omp --profile work --apply` 与 `OMP_PROFILE=work` 两种写法都要指向同一 profile 目录，`uninstall --profile <name>` 清理该 profile 的集成文件。

## 与 mnemopi 的分工

| 维度 | ai-memory | mnemopi |
|---|---|---|
| 运行形态 | 独立的 Rust 单二进制服务，hook 与 MCP 双入口，可跑在本机、homelab 或任意可达主机 | OMP 五个后端之一（`off`/`local`/`hindsight`/`mnemopi`/`sharpshooter`），库随 OMP 进程与 agent home 走 |
| 记忆载体 | git 托管的 markdown wiki 为权威源，SQLite（FTS5/实体/嵌入）为派生索引 | 每 bank 一个 `mnemopi.db`，表为 `working_memory`、`episodic_memory`、`facts` |
| 捕获触发 | lifecycle hook 记录 prompt、tool call、会话边界，会话结束编译成页面 | `agent_end` 按 `retainEveryNTurns` 门槛自动 retain，每 4 个用户轮一次；进程退出走 dispose 路径并显式 `extract: false` |
| 模型调用边界 | 默认零 LLM；dream 与 LLM 撰写页面均为 opt-in | 整合（sleep/consolidate）报告 `llm_used: 0`、`method: "aaak"`，用正则抽事实与 KG 三元组；唯一模型调用在事实提取（temperature 0，走 host 注入的 completion），不可用时退回 `heuristicExtractFacts` |
| 首轮注入 | 会话起点注入有界 brief，交接由 handoff 工具显式传递 | `beforeAgentStartPrompt` 用 `hasRecalledForFirstTurn` 做一次性判据，每会话首轮注入一次召回结果 |
| 跨会话交接 | `memory_handoff_begin/list/accept/cancel` 四件套，owner 作用域可发布为 shared | 无 handoff 概念 |
| 多人多机 | 一个服务端多人共用，跨机器同一个项目接着做 | 每项目独立 bank，目录按项目派生，跨机器共享不在设计内 |

本机现状（2026-10-27）：OMP 18.13.1，`memory.backend` 为 `mnemopi`，`scoping: per-project-tagged`，`retainEveryNTurns: 4`，`autoRecall`/`autoRetain` 均开。agc 的 bank `agc-djmfd5jv3zsd` 的 `mnemopi.db` 为 130908160 字节，`-wal` 4190072 字节；行数 working_memory 1038、episodic_memory 171、facts 4085。同机 15 个 bank 合计 working 1479 / episodic 261 / facts 5880。

## 选型条件

选 ai-memory 的情形：要在多个厂商的 harness 之间接力同一件事；记忆需要跨机器、跨人共享，团队指向同一个服务端；要求记忆以可 `grep`、可手改、可 `rsync` 的 markdown 形式存在，并且接受为它单独跑一个常驻服务；需要显式 handoff 把未决问题交给下一个 agent；希望默认零 LLM、只在空档可选 dream。对应的代价是安装与运维一个服务端，且 OMP 集成要显式写 `mcp.json` 与扩展文件。

选 mnemopi 的情形：只用一个 harness（OMP 本身），不在乎跨 agent 或跨机；希望记忆完全留在 agent home 内，随会话自动写入、自动召回，无需另起进程和端口；需要分层打分（向量 0.5 / FTS 0.3 / importance 0.2 的默认权重）与本地嵌入；接受模型调用只发生在事实提取一步、整合纯正则。代价是没有对外的交接协议，也没有团队共享面。

## 并存后果

两端都在启动阶段注入：ai-memory 扩展在 `before_agent_start` 返回 handoff 消息，mnemopi 在 `beforeAgentStartPrompt` 用首轮判据注入召回。两端都监听同一批生命周期事件，prompt、tool call、会话结束会被各写一份；存储也各一份——一边是 wiki 里的 markdown 页加派生 SQLite，一边是 bank 内 `mnemopi.db`。同时开启意味着每轮上下文被两个记忆源挤占，同一件事出现两份可能分歧的版本。

并行运行的前提是把 OMP 的 `memory.backend` 设为 `off`，让 OMP 侧不再触发 mnemopi 的召回与 retain；此时 mnemopi 的 `recall`、retain 及相关工具面一并失效，只留下 ai-memory 的 MCP 工具与 wiki 页面。

## 证据边界

ai-memory 未在本机安装：`command -v ai-memory` 无输出、退出码 1，`/home/cpf/.local/share/ai-memory` 不存在，因此其行为全部来自仓库文档（`docs/install.md`、`docs/ARCHITECTURE.md`、`DATA_HANDLING.md`）与 `install_hooks.rs` 里生成的扩展源码，未经运行验证；`127.0.0.1:49374` 出自 Docker 快速启动示例，未确认原生安装的默认端口。mnemopi 侧结论来自本机 OMP 18.13.1 源码；本机 `sqlite3` CLI 不可用，行数由 bun 脚本以 `readonly: true` 打开各 `mnemopi.db` 执行 `SELECT COUNT(*)` 得到，字节数由 `stat -c %s` 取得。

## See Also

- [OMP 记忆后端对比：Mnemopi vs Hindsight vs Sharpshooter](../omp-mnemopi/memory-backends-comparison.md)
- [OMP Mnemopi Auto-Recall 注入机制](../omp-mnemopi/auto-recall-injection.md)
- [OMP Compaction Methods & History URI Tool Support](../omp-config/compaction-methods-and-history-uri.md) — 此处的 handoff 指上下文压缩方法，与 ai-memory 的跨 agent 交接协议同名不同义
