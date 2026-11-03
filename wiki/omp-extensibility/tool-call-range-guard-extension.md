# OMP tool_call 范围防护扩展：执行前阻断危险 Grep

> Sources: 本会话实现与验收记录, 2026-11-02; OMP SDK 18.15.0 扩展类型声明, 2026-11-02
> Raw: [2026-11-02-grep-guard-extension](../../raw/omp-mnemopi/2026-11-02-grep-guard-extension.md); [2026-11-03-history-and-agent-db-index-repair](../../raw/omp/2026-11-03-history-and-agent-db-index-repair.md)
> Updated: 2026-11-03

## Overview

OMP 的 `tool_call` 事件在工具执行前提供拦截点，处理器返回 `{ block: true, reason }` 即可阻止执行，并把原因作为工具错误返回给模型。据此实现的范围防护扩展，在 `grep` 执行前判断搜索根与实际候选是否触及 Mnemopi 数据目录或提示历史 SQLite 文件系列，命中就阻断；普通配置、日志、源码与带有效排除的搜索照常执行。

## 拦截点与适用理由

SDK 18.15.0 的类型声明写明 `ToolCallEventResult` 支持 `block` 与 `reason`，`ToolCallEvent` 联合类型包含 `GrepToolCallEvent`，事件在 agent loop 的参数准备阶段触发，早于并发调度、`tool_execution_start` 与审批门。拦截需要看到工具入参，判定因此落在这一阶段。

TTSR 的适用面是模型输出流与判定问题（分层见 [OMP Extension 与 TTSR 分层防护](../omp-ttsr/extension-and-ttsr-layering.md)），拿不到工具入参；扩展是能看到入参并阻断执行的入口。

代价是扩展只在新会话加载，已经运行的会话不生效。

## 范围判定模型

| 判定层 | 规则 |
|---|---|
| 受保护集合 | `getMemoriesDir()/mnemopi` 整个目录；`getHistoryDbPath()` 的主文件、`-wal`、`-shm`、`-journal` 后缀与 `.corrupt-*` 前缀文件。集合只有这两类，`~/.omp/agent/agent.db` 及其 `-wal`、`-shm` 不在其中（2026-11-02 源码核对） |
| 直接命中 | 搜索根经 `realpath` 归一后落在受保护集合内，阻断 |
| 父目录根 | 根与受保护集合相交时，用与 Grep 相同的路径解析与原生 glob 枚举实际候选，候选含受保护文件且未被排除覆盖就阻断 |
| 排除项 | `!` 开头且磁盘上不存在的路径按排除处理；同时存在的路径按普通搜索根处理 |
| 符号链接 | 根与受保护路径都做最长存在前缀的 `realpath`；候选枚举关闭 `followLinks`，与 Grep 不进入嵌套 symlink 的行为一致 |
| 内部地址 | 经 `InternalUrlRouter.instance()` 归一；未注册协议、无法定位的文件协议一律拒绝，明确的资源 URI（如 `mcp://`）跳过 |
| 解析失败 | 任何异常都返回阻断与替代提示，按失败关闭处理 |

候选枚举使用 `gitignore: true` 或调用方传入值、`hidden: true`、`followLinks: false`、`recursive: false`，`limitReached` 视为失败。`gitignore: false` 不能让受保护候选消失，因为拒绝判定基于候选集合，与忽略规则无关。

## 拒绝反馈

阻断文本 = 原因 + 固定替代清单。清单给出四类可行操作：只列目录或文件名（读目录模式、`glob`、`ls`/`stat`）；明确指定配置、日志、源码目录或安全文本 glob，或显式排除受保护路径；记忆查询走记忆工具；检查 SQLite 时由普通 shell 的独立进程用 backup API 制作副本，再查询副本，源库损坏时保留原始 main/WAL/SHM。末行明确不要读原始数据库、WAL、SHM，也不要删除这些文件。

这套文本让模型在收到拒绝后仍有可执行路径，减少重试同一危险调用的概率。

## 验证方法

只测判定函数不足以证明拦截生效，验收分三层：

1. **边界回归**：以真实模块加载方式加载扩展，逐项覆盖直接目录、相对路径、多根、glob、排除、`gitignore` 开关、symlink、相似名字目录、未注册 URI、`mcp://`、`file://`、独立进程 HOME 解析，共 23 项。
2. **真实执行链**：`loadExtensions` + `ExtensionRunner` + `ExtensionToolWrapper` + 真实 `GrepTool`，确认允许的搜索真的返回匹配内容、危险的搜索真的被拦下，共 6 项检查。
3. **系统调用证据**：strace 观察被拦场景没有对 db/WAL/SHM 的内容型打开。

## 实现坑

- **未注册协议默认放行**：`router.target()` 对未知协议返回空，仅凭返回值会把 `db-alias://...` 当成普通搜索根放过去。先写失败用例观察到放行，再补 `router.canHandle` 检查后拒绝。
- **`O_PATH` 不等于内容读取**：Bun `realpath` 用 `O_PATH` 描述符检查路径元数据，strace 中会出现 db 路径的 `open`。判定必须排除带 `O_PATH` 的调用，否则验收误报。
- **排除项语义**：`!` 条目只有在磁盘上不存在时才按排除处理；把存在的路径写成 `!xxx` 会被当作搜索根，这是与 Grep 解析保持一致的结果。

## 已知边界

防护只覆盖 `grep`。直接 `Read` 原始 db/WAL/SHM 仍在覆盖范围之外，对应风险与缓解背景见 [Mnemopi SQLite 损坏恢复](../omp-mnemopi/sqlite-corruption-recovery.md)。受保护集合只有 Mnemopi 目录与 history.db 系列，`~/.omp/agent/agent.db` 及其 sidecar 不在其中，见 [OMP agent.db 与 history.db](../omp/agent-storage-databases.md)。已运行会话不加载新扩展，需要重启。

## See Also

- [OMP Extension 与 TTSR 分层防护](../omp-ttsr/extension-and-ttsr-layering.md)
- [Mnemopi SQLite 损坏恢复](../omp-mnemopi/sqlite-corruption-recovery.md)
- [OMP agent.db 与 history.db：存储职责、表归属与索引级损坏修复](../omp/agent-storage-databases.md)
- [OMP 内建工具与内部地址空间](../omp-tools/builtin-tools-and-internal-urls.md)
