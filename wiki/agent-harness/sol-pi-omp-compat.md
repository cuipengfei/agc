# SoL-Pi 与 OMP 兼容性：机制核查与装得上但开不了

> Sources: GitHub NVlabs/SoL-Pi；arXiv:2609.20519；官方博客；npm registry；oh-my-pi 仓库源码直读
> Raw: [sol-pi-forensics](../../raw/agent-harness/2026-09-19-sol-pi-forensics.md)
> Updated: 2026-09-19

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

## OMP 兼容矩阵（2026-09-19，上游 HEAD commit 71c5eec）

| 特性 | 状态 | 依据 |
|------|------|------|
| 安装 | 装得上 | issue #11796 已关闭；PR #11800 已合并随 18.2.1 发布，legacy shim 补导出 findCutPoint 与 sessionEntryToContextMessages |
| Action Fusion | 开启必崩 | PR #11991（open）：legacy shim 把 arktype schema 原样传给扩展，合并出的 schema 只剩 then_run，模型看不到 path/content，融合调用必崩；PR 作者实测 then_run 端到端成功（`[then_run:succeeded]`） |
| Online Context Compact | 结构性失效（推断） | OMP 缺 agent_settled 事件（全仓 0 命中，pi 侧约 10 处）；#11991 实测仅覆盖 actionFusion |
| 原生支持 | 今日开 RFC | issue #12530（2026-09-19 创建，0 评论）《Native SoL-Pi-inspired action fusion》，请求 OMP 原生给 edit/write 加 then_run |

当前 OMP 18.2.6 结论：SoL-Pi 装得上，但开启 actionFusion 必崩（等 #11991）；其它特性默认可用（sol-pi.json 默认全关）。

## 与本地三层优化工具的关系

本地已有三层上下文优化，SoL-Pi 与它们互补不重叠：

- RTK：shell hook 层，过滤压缩单条命令输出，tee 全文落盘 ~/.local/share/rtk/tee/
- context-mode：MCP 层，工具输出进 FTS5 索引按需取回
- Headroom：proxy 传输层压缩 wire payload（本机 v0.37.0，--mode cache --code-aware）

前三者只缩小流量不改行为序列；**Action Fusion 改 agent 循环本身**（省一次完整模型往返），是唯一真缺口。

## 结论

不装 Pi 的前提下，SoL-Pi 四机制里 ObservationPack / Evidence-Preserving Reducer / Online Context Compact 均能被 RTK / context-mode / Headroom 三层部分或全部替代；Action Fusion 是唯一无法替代的能力，等 OMP #11991 合并或 RFC #12530 落地后才有可用路径。

## See Also

- [Responses API web_search 服务端执行与 usage 计量](../responses-api/web-search-usage-forensics.md) — 另一组服务端黑盒取证
- [Hermes vs OpenClaw：同模型表现差异的架构原因](hermes-vs-openclaw-architecture.md) — harness 架构差异如何影响行为
