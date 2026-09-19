# SoL-Pi 多源核查原始记录 —— 机制、推广文章错漏、身份链、OMP 兼容性

> Source: 多源核查：GitHub NVlabs/SoL-Pi、arXiv、官方博客、npm registry、oh-my-pi 仓库源码直读（2026-09-19）
> Collected: 2026-09-19
> Published: 2026-09-02（SoL-Pi 开源日）

## A. 项目事实

- 仓库：github.com/NVlabs/SoL-Pi，MIT 协议，2026-09-02 开源。
- Star 数：推广文章写稿时约 1.6k star；本次核查（2026-09-19）时 2336 star。
- 团队：NVIDIA Efficient AI，负责人韩松（MIT 副教授、NVIDIA 研究总监）。
- 论文：arXiv:2609.20519。
- 四机制：
  1. Action Fusion（编辑+验证合并为一次工具调用）
  2. ObservationPack（大输出句柄化）
  3. Evidence-Preserving Reducer（便宜模型读日志+逐条引述验证）
  4. Online Context Compact（子任务节点主动压缩）
- 研究流程：535 个可执行环境（495 个真实 GitHub Issue/PR + 40 个合成）中产出 152 个提案，仅 4 个机制存活。
- 跨轮转换统计：「编辑后跟命令」占跨轮转换 12.3%，其中 Bash 占 85.1%。

## B. 推广文章三处错漏（与官方/源码对照）

1. ObservationPack 单条上限：文章称 1 MiB；源码实测为 10 KiB 打包阈值、16 KiB/400 行分页取回。
2. 安装 pin：文章 pin 安装 @earendil-works/pi-coding-agent@0.84.2；npm 当前 0.85.1（2026-09-05 发布），0.84.2 是 2026-08-14 旧版。
3. 分发渠道：文章称 skills.sh 可下载 SoL-Pi；skills.sh 上无 SoL-Pi 本体。

效果数字（全部厂商自报、无第三方复现）：

- 对比原生 Pi：token 降 45%~49%、成本降约 1/3、任务得分保留约 94%。
- 对比 Codex harness：token 降 35%~64%、API 成本降 50%~54%。
- 每小时省 $8.75~13.50。
- Terminal-Bench 上 SoL-Pi 15/63，低于 Codex/Pi 的 18/63。

「Harness Scaling Law」：官方原文只是 "We expect to see"（假说非定律）。

## C. 身份链

- badlogic/pi-mono（Mario Zechner）2026-04-08 被 Earendil 收购；2026-05-07 迁址改名为 earendil-works/pi（现上游，约 107k star）。公告：https://pi.dev/news/2026/5/7/pi-has-a-new-home
- can1357/oh-my-pi 是 pi-mono 在 2026-03-22（commit b21b42d）之后的下游 fork：Bun 运行时 + 约 8 万行 Rust 核心，已深度分叉。官方文档：docs/porting-from-pi-mono.md
- SoL-Pi 的「Pi」= earendil-works/pi；官方全文未提及 oh-my-pi。

## D. Action Fusion 机制（源码直读，commit bd005888）

- 实现：给内置 edit/write 工具 schema 加可选参数 `then_run?: { command: string; timeout?: number }`。
- write 参数键集合 `["path","content","then_run"]`；edit 为 `["path","edits","then_run"]`；then_run 不在 required。
- then_run 描述文案逐字（edit 版）：

```
Command to run next on this file after the edit succeeds — e.g. run, build, start/restart, install, or check it; optional timeout in seconds. Skipped if the edit fails; a non-zero exit is reported but keeps the edit.
```

- 全部教学仅 schema description，无 system prompt 注入（目录内 grep 无 setSystemPrompt）。
- 失败语义：
  - 编辑失败 → 标记 `[then_run:skipped]`，不跑命令。
  - 命令失败 → 编辑保留在盘 + tool_result isError:true + 标记 `[then_run:failed]`。
  - 编辑后文件被外部改动 → 哈希守卫跳过。
  - 同文件多融合操作 → per-file 队列串行。
- 合并 tool_result 标记形如 `[then_run:succeeded]`；TUI 显示 `⚡ SoL-Pi · Action Fusion — 1 model round-trip avoided`。
- 源码规模：then-run.ts 127 行、index.ts 169 行。

## E. OMP 生态状态（2026-09-19，上游 HEAD commit 71c5eec）

- issue #11796：SoL-Pi 装不上 OMP，已关闭。
- PR #11800（已合并，随 18.2.1 发布）：legacy shim 补导出 findCutPoint 与 sessionEntryToContextMessages，修复安装校验失败。
- PR #11991（open）：修 legacy shim 把 arktype schema 原样传给扩展的 bug——合并出的 schema 只剩 then_run，模型看不到 path/content，融合调用必崩；PR 作者实测 then_run 端到端成功（`[then_run:succeeded]`）。
- issue #12530（2026-09-19 创建，0 评论）：RFC《Native SoL-Pi-inspired action fusion》，请求 OMP 原生给 edit/write 加 then_run。
- OMP 缺 agent_settled 事件（全仓 0 命中，pi 侧约 10 处）→ Online Context Compact 在 OMP 结构性失效（此为源码结构推断；#11991 实测仅覆盖 actionFusion）。
- 当前 OMP 18.2.6：SoL-Pi 装得上，但开启 actionFusion 必崩（等 #11991）；其它特性默认可用（sol-pi.json 默认全关）。

## F. 与本地三层优化工具对比

- RTK：shell hook 层，过滤压缩单条命令输出，tee 全文落盘 ~/.local/share/rtk/tee/。
- context-mode：MCP 层，工具输出进 FTS5 索引按需取回。
- Headroom：proxy 传输层压缩 wire payload（本机 v0.37.0，--mode cache --code-aware）。
- SoL-Pi 独有：Action Fusion 改 agent 循环本身（省一次完整模型往返）；其余三者只缩小流量不改行为序列。
