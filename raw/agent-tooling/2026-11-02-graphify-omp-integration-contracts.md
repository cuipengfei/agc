# graphify 0.9.100 与 OMP 集成方式（源码核对与实测）

> Source: 本机 graphify 0.9.100 安装包源码核对（`graphify/pi/index.ts`、`graphify/cli.py`、`graphify/serve.py`、`graphify/watch.py`、`graphify/hooks.py`、`graphify/__main__.py`）；上游仓库 README；agc 仓库 `./pull.sh` 实测
> Collected: 2026-11-02
> Published: Unknown

## OMP 集成面的三处官方证据

- CLI help 的 `pi guard path` 一行说明写着 “print the guard package path (e.g. for `omp plugin install`)”。
- README 安装平台节（`README.md:256`）末尾写明：同一个 guard 包也能在 Oh My Pi 加载，命令为 `omp plugin install "$(graphify pi guard path)"`；并提醒注册路径里含 Python 版本与 venv，两者之一变化后要重跑 `pi guard install`，旧条目用 `pi remove <old path>` 清理。
- `graphify/pi/index.ts` 开头注释声明这是 Pi 与 OMP 双宿主扩展，两个宿主提供不同 npm 包（`@earendil-works/pi-coding-agent` 与 `@oh-my-pi/pi-coding-agent`），因此只用 Node 内置模块。

`install --platform` 的平台目标共 23 个（`claude|codex|opencode|kilo|aider|copilot|claw|droid|trae|trae-cn|hermes|kiro|pi|codebuddy|antigravity|antigravity-windows|windows|kimi|amp|agents|devin|gemini|cursor`），其中 21 个来自 `_PLATFORM_CONFIG`，另加 `gemini` 与 `cursor`；名单中没有 `omp`。

## OMP 三层安装路径

| 层 | 命令 | 安装位置 |
|---|---|---|
| skill | `graphify install --platform agents` | `~/.agents/skills/graphify/`（SKILL.md、references/、`.graphify_version`） |
| MCP | 在 `~/.omp/agent/mcp.json` 的 `mcpServers` 下加 `{"type":"stdio","command":"/home/cpf/.local/bin/graphify-mcp"}` | OMP MCP 注册表 |
| guard | `omp plugin install "$(graphify pi guard path)"` | `~/.omp/plugins/node_modules/graphify-pi` 符号链接，指向 `~/.local/share/uv/tools/graphifyy/lib/python3.12/site-packages/graphify/pi` |

`omp plugin --help` 确认 `install` 接受 path 目标，默认 user scope。`~/.omp/plugins/omp-plugins.lock.json` 新增条目只有 `enabled` 标记，不记录路径；`installed_plugins.json` 与 `package.json` 均无变化，说明本地链接包不写入 dependencies。

## guard 扩展的运行时行为

`pi/index.ts` 与 `cli.py::_run_hook_guard`：

- 拦截工具：`bash`、`grep`、`read`、`glob`（OMP 的 `glob` 其 `path` 即 pattern）；Pi 侧另有 `find`。OMP 自己的 `find`（无语义参数的语义搜索）不被拦截。项目未被信任时直接放行。
- 本地目标解析成绝对路径后，把 `{session_id, cwd, tool_name, tool_input}` 从 stdin 喂给项目外 PATH 上的 `graphify hook-guard search|read`，预算两秒、入 256 KiB、出 64 KiB，全程 fail-open。
- OMP 把 tool_call 的 `additionalContext` 以单独的 passive developer 消息投递，Pi 没有这条通道、只能发 steering 消息；`session_switch` 与 `session_branch` 事件只有 OMP 有。
- OMP 的 read 选择器语法（`:50`、`:50-80`、`:5-16,960-973`、`:raw`、`:-60`）在扩展里有专门正则处理。

## 新鲜度判定按工具类型分两种

- 搜索路径（`cli.py:1198-1200`）：只查 `graphify-out/graph.json` 存在，无新鲜度检查；图谱过期照样发搜索提醒。
- 读取路径（`cli.py:1290-1312`）：先 stat 图谱存在；目标文件 mtime 晚于图谱 mtime、或 `graphify-out/needs_update` 旗标存在时，判定为对目标过期，降级为软提醒（`_READ_NUDGE_STALE`），仍发提醒、不拦截。读取 `graphify-out/` 自身与项目外文件直接跳过。

## strict 模式

- `_hook_strict_enabled`（`cli.py:946-953`）读 `GRAPHIFY_HOOK_STRICT`：`1/true/yes/on` 强制开启，`0/false/no/off` 强制关闭，未设置才回退到安装时参数。
- 扩展用 `{...process.env}` 启动子进程，环境变量原样传入，OMP 侧无需重装即可开启。
- 即便开启，拦截条件仍齐全才生效：Read 工具、每会话首次、`GRAPHIFY_HOOK_STRICT_TTL`（默认 1800 秒）内没有跑过 query/explain/path、目标文件确实在图里。
- 配套变量：`GRAPHIFY_HOOK_STRICT_TTL`（默认 1800 秒）、`GRAPHIFY_HOOK_NUDGE_CAP`（提醒上限默认 5）。

## MCP 服务器

`serve.py`：

- 十个工具（`serve.py:2621-2754`）：`query_graph`、`get_node`、`get_neighbors`、`get_community`、`god_nodes`、`graph_stats`、`shortest_path`、`list_prs`、`get_pr_impact`、`triage_prs`。
- 六个资源（`serve.py:3036-3041`）：`graphify://report`、`graphify://stats`、`graphify://god-nodes`、`graphify://surprises`、`graphify://audit`、`graphify://questions`。
- 全部工具额外接受可选 `project_path`（`serve.py:2761-2775`）；多项目模式按 `<project_path>/graphify-out/graph.json` 解析，使用有界 LRU 缓存（`serve.py:2587-2608`）。
- 图被 `graphify update` 重建后处理器重新加载，不用重启服务器（`serve.py:2554-2555`）。
- 不传参数时默认服务 cwd 下的 `graphify-out/graph.json`（`serve.py:3164-3166`）。
- 缺 `mcp` 包时报错提示 `pip install "graphifyy[mcp]"`。

## skill 自动刷新

`__main__.py:266-336`（对应 #1805）：

- 每个 skill 副本旁边有 `.graphify_version`；CLI 在任何非纯信息命令启动时，把版本低于当前包的用户级 skill 副本重新拷贝。
- 本地改动过的 SKILL.md 保留为 `SKILL.md.bak`。
- 纯信息命令（`-v`、`--version`、`-h`、`--help`）不刷新（#4545）；`install`、`uninstall`、`hook-check`、`hook-guard` 静默跳过。
- `GRAPHIFY_NO_AUTO_REFRESH=1` 关闭该行为。
- 多安装器共用同一目录的副本不碰，避免猜错变体。

## git hooks 的实际副作用

`graphify hook install` 做五件事（`hooks.py`）：

1. post-commit
2. post-checkout
3. post-merge
4. post-rewrite
5. 注册 graph.json 的 merge driver（`hooks.py:1116-1154`，`_register_merge_driver` 在 1149 行），写 `git config merge.graphify.name` 与 `merge.graphify.driver`，并在仓库根的 `.gitattributes` 追加一行（`hooks.py:1003-1048`，尊重 `GRAPHIFY_OUT` 覆盖）。

merge driver 本体是 `graphify merge-driver %O %A %B` 的纯并集合并，已知会复活被删侧的符号（#2418），靠 post-merge 钩子重建缓解。只有 graph.json 被提交进仓库时 driver 才会触发。

`graphify hook uninstall` 五件一起撤：config 键 unset、`.gitattributes` 行删除且保留其他行。

## 图谱保鲜的三条路径

- 代码文件：`graphify update <repo>` 增量重建，内部有 AST 缓存与 manifest 对比（`.graphify_build_state.json` 记录扫描范围、忽略规则、提取器版本），无 LLM。
- 文档、论文、图片：只有 `graphify watch` 写 `graphify-out/needs_update` 旗标（`watch.py` 的 `_notify_only` 与 `_batch_needs_llm_flag`），`graphify check-update` 才有提示。`hooks.py` 中没有 `needs_update` 相关代码，只装 git hooks 时已提交的文档变更不触发任何提示。
- 未提交改动：guard 比较目标文件与 graph.json 的 mtime，文件更新时发软提醒。

`graphify update` 在重建结果节点数明显减少时拒绝覆盖，除非加 `--force`（或 `GRAPHIFY_FORCE=1`）。

## watch 的进程模型

`cli.py:2437-2448` 调 `graphify.watch.watch(watch_path)`：

- 前台阻塞，进入 `while True: time.sleep(0.5)` 循环，Ctrl+C 退出并打印 `Stopped.`。
- 参数只有一个路径，没有 `--daemon`、`--background`、pid 文件或单实例检测。
- 缺 `watchdog` 包时 `ImportError` 退出 1，提示 `pip install watchdog`。
- `debounce` 默认 3.0 秒。
- 一个进程只监视一个目录。

## 全局图

- 文件位于 `~/.graphify/global-graph.json`，另有 `global-manifest.json`。
- `graphify global add <graph.json> --as <tag>`、`global remove`、`global list`、`global path` 管理；`extract --global --as <tag>` 在建图时顺带并入。
- manifest 按内容哈希去重，未变化时跳过（`global_graph.py:91-105`）。

## agc 仓库同步边界（2026-11-02 实测）

`./pull.sh` 输出 `updated=2 would_update=0 unchanged=74 missing=0 protected_slots=45`，仓库变更两项：

- `omp/agent/mcp.json`：新增 graphify stdio 条目，仓库副本中 Exa 与 Tavily 查询参数值均为 `<REDACTED>`。
- `omp/plugins/omp-plugins.lock.json`：新增 `graphify-pi` 条目。

`~/.agents/skills/graphify/` 没有 manifest 条目，skill 不入库；插件本体是符号链接，`node_modules` 在 pull 忽略名单里，不入库。

## 重启后生效实测

新会话中 `mcp__graphify_graph_stats` 返回：Nodes 4620、Edges 5079、Communities 397、EXTRACTED 99%、INFERRED 1%、AMBIGUOUS 0%、Built at commit 8d4b591a28c1ed3dce1d00f240b740c363bdc9cd，并提示 HEAD 与构建 commit 不一致。执行含 `grep graphify` 的 bash 命令后，工具返回中出现 `<system-reminder source="graphify">`，内容为提醒改用 `graphify query` 并列出来自图谱的节点。
