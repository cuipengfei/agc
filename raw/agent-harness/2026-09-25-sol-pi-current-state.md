# SoL-Pi 当前状态：四机制配置、行为与 OMP 兼容边界

> Source: NVlabs/SoL-Pi GitHub 仓库 README、docs/configuration.md、docs/compatibility.md、src/sol-pi/extensions/ 源码直读；can1357/oh-my-pi #11991；本机已安装 omp 18.3.0；本机 Headroom v0.37.0 安装与运行资料
> Collected: 2026-09-25
> Published: 2026-09-22（仓库 HEAD `1559b5c`，对应 2026-09-22 Windows 路径修复合并）

## 仓库与发布状态

- SoL-Pi 是 NVIDIA 为 Pi 开发的独立扩展，仓库地址 https://github.com/NVlabs/SoL-Pi。
- 本机克隆点 HEAD 为 `1559b5c`；`git ls-remote origin HEAD` 返回同为 `1559b5c`。
- 仓库说明要求 Node.js 22.19 或更新、`npm`、`@earendil-works/pi-coding-agent` 0.85.1。
- 配置搜索顺序：项目内 `.pi/sol-pi.json`，否则 `~/.pi/agent/sol-pi.json`；两者都不存在时用内置默认值，项目配置优先且不与全局配置合并。
- 默认 schema：`version: 1`，`actionFusion`、`observationPack`、`evidencePreservingReducer`、`onlineContextCompact` 默认 `false`，`cacheWriteReadRatio` 默认 `12.5`。
- README 的保守配置只打开 `actionFusion` 与 `observationPack`，官方理由是这两个机制纯本地、不额外发起模型调用、也不中断当前运行。
- 兼容性文档记录：针对 `@earendil-works/pi-coding-agent` 0.85.1 和 0.84.2 测试，19 个测试文件、140 个测试通过。

## Action Fusion

- 功能：一次模型调用中修改文件并运行后续验证命令。
- 行为：编辑失败则不运行命令；命令失败时文件修改保留；若编辑后发现文件内容被外部改变，则跳过后续命令。
- 文档说明每个 Pi 进程只对自己的融合队列负责，不同扩展或直接调用内置工具不会被统一串行化。
- OMP 状态：本机 `omp --version` 为 18.3.0；OMP 原生 `write` 参数只有 `path` 与 `content`，原生 `edit` 模式参数也没有后续命令字段。
- OMP 兼容修复：[#11991](https://github.com/can1357/oh-my-pi/pull/11991) 标题为 `fix(extensibility): legacy shim edit/write speak upstream TypeBox schemas`，GitHub API 返回 `state: open`、`merged_at: null`、`updated_at: 2026-09-14T10:20:08Z`。
- #11991 描述记录：修复前 SoL-Pi 的融合调用因 legacy shim 暴露 arktype schema，而扩展期待 TypeBox `properties`，导致模型看不到 `path`/`content` 并崩溃；修复说明包含 live end-to-end，结果为文件创建成功且 `[then_run:succeeded]`，edit 通过 `edits[] + then_run` 替换内容。
- OMP 最新 release 为 [v18.3.0](https://github.com/can1357/oh-my-pi/releases/tag/v18.3.0)，发布日期 2026-09-24；公开 release body 未显示 #11991 已合入。

## ObservationPack

- 功能：大段工具结果进入本地归档后，上下文里只保留短摘录和取回引用，需要时按页取回原文。
- 行为边界：只改变通过公开上下文投影看到的内容；Pi 保存的会话历史保持完整。
- 原文来源：原始字节和记录保存在会话派生的 SoL-Pi 目录；归档副本不会随 Pi 会话结束自动删除。
- 与 Headroom 边界：本机 Headroom v0.37.0 代理路径在工具结果进入模型前处理新输出，并保留 CCR 取回标记；单独调用 MCP 压缩工具只生成可检索副本，不会自动移除已经进入会话的旧工具结果。

## Evidence-Preserving Reducer

- 功能：长篇诊断日志先交给配置的较便宜模型阅读；主模型收到较短诊断回执。
- 输入范围：源码 `candidate.ts` 只识别 `bash` 结果，以及 `edit`/`write` 融合调用产生的后续命令输出。
- 文档写明的诊断命令集合包括构建、测试、静态检查类命令，如 `lake build`、`lean`、`coq`、`cargo build/test/check`、`zig build`、`pytest`、`ctest`、`cmake --build`、`ninja`、`make`、`npm test`、`pnpm test`、`yarn test`、`go test`、`bazel test`。
- 门槛：小于 4096 字节不处理；默认最大源文本 600000 字符；匹配到疑似密钥模式时不处理。
- 回执条件：每条引用必须能在归档原文中逐字核对；模型调用失败、回执校验失败、或回执不小于原文时保留原始工具结果。
- 安全边界：启用后符合条件的日志可能通过 Pi 管理的认证发送给配置的 reducer 模型；日志必须留在本机时不应启用远程 reduction。

## Online Context Compact

- 功能：计划中已完成的步骤成为原生压缩候选时机；扩展会检查窗口压力与压缩成本，成功后 Pi 继续当前任务。
- 运行时输入：上下文窗口来自 `ExtensionContext.getContextUsage()`；`cacheWriteReadRatio` 在会话内固定，不随模型切换重算。
- 状态：计划、进度摘要、请求数、token 增长估计和压缩债务以版本化自定义条目写入 Pi 会话日志；压缩成功后发送一条隐藏通用消息并触发新一轮，提醒重建计划。
- 取消或退出不会安排自动继续；扩展不单独创建 Online Context Compact 文件。
- 与 DCP 边界：本仓 `wiki/omp-config/experimental-context-vs-dcp.md` 记录 DCP 在出站请求前裁剪或压缩旧工具输出、并支持对消息范围做压缩；SoL-Pi 的在线压缩以计划步骤完成为候选时机并调用 Pi 原生压缩，成功后自动继续。

## 未验证项

- NVIDIA 官方博客给出的 EdgeBench token 降 45–49%、任务得分保留约 94%、Terminal-Bench 4 为 15/63 与 Pi/Codex 的 18/63，均为 NVIDIA 自报；本机未复现基准。
- #11991 的 PR 测试通过记录的是修复分支行为；OMP 18.3.0 未合入该 PR，因此不能写成 OMP 已发布 Action Fusion 兼容。