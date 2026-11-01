# OMP Grep 防护扩展：执行前阻断 Mnemopi 数据范围

> Source: 本会话问题与实现记录（2026-11-01 14:45 起）；OMP SDK 18.15.0 的扩展类型声明（`src/extensibility/shared-events.ts`、`src/extensibility/extensions/types.ts`）；扩展文件与回归文件；提交 `71d2304`
> Collected: 2026-11-02
> Published: 2026-11-02

## 用户的问法

- 2026-11-01 14:45：`what would be a good way in omp, to ban grep on the mnemopi dir? so that even when llm in omp do tool call to that dir, it will just be blocked ?`
- 15:21：`instead of extension, which feels heavy, what about ttsr rule?`
- 15:31：追问历史损坏里实际肇事的是哪类工具调用
- 15:43：用户给出核对结论：肇事的是内置 grep，搜索范围包含 `~/.omp` 或 `~/.omp/agent`，且全部显式设置 `gitignore: false`

## 拦截点（SDK 18.15.0）

`src/extensibility/shared-events.ts`：

```ts
/**
 * Return type for `tool_call` handlers.
 * Allows handlers to block tool execution or revise the input the tool runs with.
 */
export interface ToolCallEventResult {
	/** If true, block the tool from executing */
	block?: boolean;
	/** Reason for blocking (returned to LLM as error) */
	reason?: string;
```

`src/extensibility/extensions/types.ts`：

```ts
/** Fired before a tool executes. Can block. */
export type ToolCallEvent =
	| BashToolCallEvent
	| ReadToolCallEvent
	| EditToolCallEvent
	| WriteToolCallEvent
	| GrepToolCallEvent
	| GlobToolCallEvent
	| CustomToolCallEvent;
```

`ToolCallEventResult.input` 的注释说明：模型发起的工具调用在 agent loop 的参数准备阶段触发该事件，早于并发调度、`tool_execution_start` 与审批门。

拦截需要工具入参，判定放在 `tool_call` 阶段；扩展文件作为唯一入口，注册一个 `grep` 处理器。

## 受保护集合

```ts
pi.on("tool_call", createGrepGuard([
    { path: path.join(getMemoriesDir(), "mnemopi"), kind: "directory" },
    { path: getHistoryDbPath(), kind: "sqlite-family" },
]));
```

`sqlite-family` 覆盖主文件、`-wal`、`-shm`、`-journal` 后缀与 `.corrupt-*` 前缀文件。

## 判定流程

1. `expandDelimitedPathEntries(input.path ? [input.path] : [], ctx.cwd, { exclusionParts: true })` 拆分多个搜索根与 `!` 排除项。排除项只有在 `resolveToCwd` 后的路径不存在时才按排除处理；存在的路径按普通搜索根处理。
2. 每个搜索根依次经过 `normalizePathLikeInput`；`http(s)://` 直接跳过；`file://` 转本地路径；`InternalUrlRouter.instance().normalize(entry)`。
3. `router.target(entry, { cwd, localProtocolOptions, sessionFile, sessionId })`：
   - 返回目标且 `router.canHandle(entry)` 为假 → 抛出「URI 协议未注册，无法确认本地目标」。
   - `kind === "resource"` 且 `backing === "file"` → 抛出「文件协议无法定位本地目标」；其他资源 URI（如 `mcp://`）跳过检查。
   - `kind === "file"` → 用 `target.path` 继续。
   - 仍带 `scheme://` 形态 → 抛出无法定位。
4. `splitPathAndSelPreferringLiteral` → `parseSearchPathPreferringLiteral` → `resolveReadPath` 得到搜索根；`canonical()` 对最长存在前缀做 `realpath`，拼回不存在部分。
5. 直接命中：`protectedFile(realRoot, roots)` 为真即拒绝。
6. 交集判断：`overlaps(realRoot, roots)` 为假时跳过（根与受保护集合不相交）。
7. 候选枚举：`stat(root)` 必须是目录；`glob({ path: root, pattern: parsed.glob ?? "**/*", recursive: false, hidden: true, gitignore: input.gitignore ?? true, followLinks: false })`。`limitReached` 视为失败。
8. 候选命中受保护文件，且未被排除项覆盖时拒绝。排除项经 `exclusionsForRoot` 转成根相对模式后，由 `excludedPaths` 用同一原生 glob 展开为文件集合与目录列表。
9. 任何异常进入 `catch`，返回「无法安全确认本次 grep 的搜索范围，已拒绝执行」。

## 拒绝反馈

返回给 LLM 的文本由拒绝原因与固定替代操作清单组成，清单原文：

```
安全替代操作：
1. 只列目录或文件名：使用 read 的目录模式、glob，或 bash 中的 ls/stat；不要用 read/find 扫描数据库内容。
2. 搜索配置、日志或源码：明确指定 extensions、rules、logs 或源码目录；也可以限定安全文本 glob，或明确排除受保护目录及 history.db 系列文件。
3. 查询记忆：使用 recall 等记忆工具。检查 SQLite：由普通 shell 的独立进程使用 SQLite backup API 制作副本，再查询副本；源库已损坏时保留原始 main/WAL/SHM 做副本恢复。
不要用 read 读取原始数据库、WAL、SHM，也不要删除这些文件。
```

## 验证记录

- 边界回归文件 `omp/agent/extension-tests/deny-mnemopi-grep.test.ts` 共 23 个 `test(`；`bun test` 结果 23 pass。覆盖：直接目录、相对路径、父目录根、`gitignore` 开与关、多根、文本 glob、glob 命中受保护文件、明确文本文件、`extensions`/`rules`/`logs`、部分排除与完整排除、排除项不允许直接搜索受保护文件、外部仓库、symlink 根、嵌套 symlink 行为、相似名字目录、拒绝原因内容、其他工具调用不受影响、独立进程按自己的 HOME 解析、未注册 URI 别名、`mcp://`、`file://`。
- 集成验收：`loadExtensions` + `ExtensionRunner` + `ExtensionToolWrapper` + 真实 `GrepTool`，6 项检查通过。允许的日志、文本 glob、有效排除返回匹配内容；危险父目录被拒绝；仅元数据访问被拒绝；默认工厂加载 1 个 `tool_call` 处理器。验收在隔离的 `HOME`、`PI_CODING_AGENT_DIR`、`XDG` 下运行，不调用模型，不读取真实数据库。
- strace：所有场景没有对 db/WAL/SHM 的内容型打开。检查函数认定 `open` 系统调用且不带 `O_PATH` 才是内容读取；Bun `realpath` 产生的 `O_PATH` 描述符单独识别。
- 先失败后修复：未注册的 `db-alias://` 最初被放行（失败用例），加入 `router.canHandle` 检查后拒绝。
- 测试通过已安装 SDK 的 `loadLegacyPiModule` 加载扩展，不依赖 `node_modules` 软链。测试期间出现的 `~/.omp/agent/node_modules` 链接已移除，移除后全部验收重新通过。

## 同步与提交

- 单文件同步：对 manifest 的 `omp-extensions` 条目设置 `included=('deny-mnemopi-grep.ts',)`，本次 `updated=1`、`missing=0`。
- `cmp` 确认来源与仓库副本在扩展文件、回归文件两组上都逐字节一致。
- 提交 `71d2304`，推送 `c211dec..71d2304 master -> master`。
- 提交文件：`omp/agent/extensions/deny-mnemopi-grep.ts`、`omp/agent/extension-tests/deny-mnemopi-grep.test.ts`。

## 边界

- 只拦截 `grep`。直接 `Read` 原始 db/WAL/SHM 不在覆盖范围内，仍可能触发丢锁机制。
- 新启动的 OMP 自动加载扩展；已运行会话需要重启才加载。
- 未调用真实模型；现有客户端是否已加载该扩展未检查。
- 验收脚本在验证完成后删除，运行输出记录在本文件与提交历史中。
