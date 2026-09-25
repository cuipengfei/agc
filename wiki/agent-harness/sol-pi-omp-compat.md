# SoL-Pi 与 OMP 兼容性：机制核查与装得上但开不了

> Sources: GitHub NVlabs/SoL-Pi；arXiv:2609.20519；官方博客；npm registry；oh-my-pi 仓库源码直读；本机 SoL-Pi 仓库与 OMP release/PR 复查
> Raw: [sol-pi-forensics](../../raw/agent-harness/2026-09-19-sol-pi-forensics.md); [sol-pi-current-state](../../raw/agent-harness/2026-09-25-sol-pi-current-state.md)
> Updated: 2026-09-25

SoL-Pi 是 NVIDIA Efficient AI 团队（负责人韩松，MIT 副教授、NVIDIA 研究总监）2026-09-02 开源的 agent harness 优化层（github.com/NVlabs/SoL-Pi，MIT 协议），论文 arXiv:2609.20519。本文核查其推广文章的事实准确性，并给出当前 OMP 上的真实兼容性结论。

## 四机制

SoL-Pi 的四机制，来自 535 个可执行环境（495 个真实 GitHub Issue/PR + 40 个合成）上的 152 个提案中仅存的 4 个存活者：

1. **Action Fusion**：编辑+验证合并为一次工具调用
2. **ObservationPack**：大输出句柄化
3. **Evidence-Preserving Reducer**：便宜模型读日志+逐条引述验证
4. **Online Context Compact**：子任务节点主动压缩

## 推广文章核查结论

推广文章存在三处错漏（与官方/源码对照）：

- ObservationPack 单条上限文章称 1 MiB，源码实测为 **10 KiB** 打包阈值、16 KiB/400 行分页取回。
- 文章 pin 安装 @earendil-works/pi-coding-agent@0.84.2，npm 当前已是 0.85.1（2026-09-05），0.84.2 是 2026-08-14 旧版。
- 文章称 skills.sh 可下载 SoL-Pi，skills.sh 上无 SoL-Pi 本体。

效果数字**全部厂商自报、无第三方复现**：对比原生 Pi token 降 45%~49%、成本降约 1/3、任务得分保留约 94%；对比 Codex harness token 降 35%~64%、API 成本降 50%~54%；每小时省 $8.75~13.50。且 Terminal-Bench 上 SoL-Pi 仅 15/63，低于 Codex/Pi 的 18/63。

「Harness Scaling Law」的说法同样需打折：官方原文只是 "We expect to see"，是假说非定律。

## 身份链：SoL-Pi 基于哪个 Pi

- badlogic/pi-mono（Mario Zechner）2026-04-08 被 Earendil 收购，2026-05-07 迁址改名为 earendil-works/pi（现上游，约 107k star）。
- can1357/oh-my-pi 是 pi-mono 在 2026-03-22（commit b21b42d）之后的下游 fork：Bun 运行时 + 约 8 万行 Rust 核心，已深度分叉（官方文档 docs/porting-from-pi-mono.md）。
- SoL-Pi 的「Pi」= earendil-works/pi，官方全文未提及 oh-my-pi。因此 SoL-Pi 的插件不能直接假定兼容 OMP。

## Action Fusion 请求级机制（源码直读，commit bd005888）

Action Fusion 是四机制中唯一改变 agent 行为序列的一个，实现极简：给内置 edit/write 工具 schema 加可选参数 `then_run?: { command: string; timeout?: number }`（write 参数键集合 `["path","content","then_run"]`，edit 为 `["path","edits","then_run"]`，均不在 required）。全部教学仅通过 schema description 完成，无 system prompt 注入（目录内 grep 无 setSystemPrompt）。

失败语义三分支：

- 编辑失败 → `[then_run:skipped]`，不跑命令
- 命令失败 → 编辑保留在盘 + tool_result isError:true + `[then_run:failed]`
- 编辑后文件被外部改动 → 哈希守卫跳过

同文件多融合操作走 per-file 队列串行。成功时合并 tool_result 标记 `[then_run:succeeded]`，TUI 显示 `⚡ SoL-Pi · Action Fusion — 1 model round-trip avoided`。源码规模 then-run.ts 127 行、index.ts 169 行。

动机数据（厂商自报）：「编辑后跟命令」占跨轮转换 12.3%，其中 Bash 占 85.1%。

## OMP 兼容矩阵（2026-09-25 复查）

| 特性 | 状态 | 依据 |
|------|------|------|
| 安装 | 装得上 | 本机仓库与官方文档仍一致：SoL-Pi 依赖 Pi 0.85.1；此前 #11800 已修复 legacy shim 导出缺失 |
| Action Fusion | 修复在 open PR，未发布 | OMP #11991 仍为 open、`merged_at: null`；OMP 最新 release v18.3.0（2026-09-24）未显示合入。PR 分支实测 write/edit + `then_run` 成功，但当前 OMP 18.3.0 原生 edit/write 参数仍无后续命令字段 |
| ObservationPack / Reducer / Compact | 默认可用但需显式开启 | `sol-pi.json` 中四个功能默认全关；Reducer 只处理符合条件的 bash 与融合 edit/write 诊断输出；Online Context Compact 依赖 Pi 的计划事件与原生压缩路径 |
| 原生支持 | RFC 未落地 | #12530 仍请求 OMP 原生 Action Fusion；未在当前 release 中见到对应能力 |

> **Status: Outdated** (2026-09-25)
> “当前 OMP 18.2.6 结论：SoL-Pi 装得上，但开启 actionFusion 必崩（等 #11991）”已被 2026-09-25 复查部分取代：OMP 已发布到 18.3.0，但 #11991 仍 open，Action Fusion 兼容修复仍未进入 release。核心判断仍是等 #11991 合并或 #12530 落地。

## 与本地上下文工具的关系

本地已有上下文与传输优化，SoL-Pi 与它们互补但不完全重叠：

- RTK：shell hook 层，过滤压缩单条命令输出，tee 全文写入本地归档目录。
- context-mode：MCP 层，工具输出进入可搜索索引，按需取回。
- Headroom：本机 v0.37.0 代理在工具结果进入模型前处理新输出，并保留 CCR 取回标记；单独调用 MCP 压缩工具只生成可检索副本，不会自动移除已经进入会话的旧工具结果。
- OpenCode DCP：出站请求前裁剪或压缩旧工具输出，并支持选择消息范围压缩；SoL-Pi Online Context Compact 则把计划步骤完成作为候选时机，检查成本与窗口压力后调用 Pi 原生压缩。

这些本地层主要减少重复流量或旧输出；**Action Fusion 改 agent 循环本身**（省一次完整模型往返），仍是最难替代的能力。

## 结论

SoL-Pi 在 Pi 0.85.1 上是经 NVIDIA 测试的独立扩展，但在 OMP 上仍要区分两件事：OMP 18.3.0 已经发布，Action Fusion 兼容修复 #11991 仍 open 且未合入 release。观察大输出、让便宜模型读诊断日志、按完成边界触发压缩，这三类能力在本机 Headroom / context-mode / DCP / RTK 中已有相近路径；Action Fusion 仍缺 OMP 原生等价能力。要解锁它，路径仍是等 #11991 合并，或等 #12530 的原生支持落地。

## See Also

- [Responses API web_search 服务端执行与 usage 计量](../responses-api/web-search-usage-forensics.md) — 另一组服务端黑盒取证
- [Hermes vs OpenClaw：同模型表现差异的架构原因](hermes-vs-openclaw-architecture.md) — harness 架构差异如何影响行为
