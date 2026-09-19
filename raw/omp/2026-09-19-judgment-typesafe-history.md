# OMP TypeSafe judgment 支持历史窄核验（只读，2026-09-19）

> Source: 本会话取证（GitHub commits/releases/compare API + 本机版本与 dist grep 核验）
> Collected: 2026-09-19
> Published: Unknown

## 结论表

| 项 | 值 | 证据 |
|---|---|---|
| 源码首次 commit | `5c7dc19f82b8385673df257ca33571219960f63d` | GitHub commits API，path=`packages/ai/src/judgment/typesafe.ts`，**唯一** commit |
| commit 时间 | 2026-09-17T07:03:40Z | 同上，`commit.author.date` |
| commit 信息 | `feat: added judgment module with TypeSafeJudge and unified judge API` | 同上首行 |
| commit 链接 | https://github.com/can1357/oh-my-pi/commit/5c7dc19f82b8385673df257ca33571219960f63d | |
| 首次正式 release | **v18.2.4** | releases API，`tag_name=v18.2.4`，`published_at=2026-09-17T09:10:49Z` |
| release 包含该 commit | 是 | compare API `5c7dc19f...v18.2.4` → `status: "ahead"` 且 `merge_base_commit` = 该 commit（即 tag 是其子孙） |
| CHANGELOG 记录 | `packages/coding-agent/CHANGELOG.md` `[18.2.4] - 2026-09-17`："Added TypeSafe provider support through `/login typesafe` or `TYPESAFE_API_KEY`... configure `providers.judgmentProvider` as `auto`, `typesafe`, or `llm`" | raw 文件直读 |
| 当前本机版本 | **@oh-my-pi/pi-coding-agent 18.2.5** | `omp --version` → `omp/18.2.5`；shim `~/.bun/bin/omp` → `~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js`，package.json version=18.2.5 |
| 本机版本是否含该功能 | 含 | 本机 dist 中 grep 到 `TYPESAFE_API_KEY`（`dist/cli.js`、`dist/types/judgment/index.d.ts`）及 `judgmentProvider` |
| 18.2.5 release 时间 | 2026-09-17T23:07:03Z | releases API（同日第二个 release） |

## 源码首次 commit vs 首次 release 区分

- 二者同日（2026-09-17）：commit 07:03Z，v18.2.4 tag 09:10Z——相差约 2 小时，基本同批落地，无"源码先行多日"的 gap。
- typesafe.ts 自首次 commit 起无后续修改（该 path 的 commit 列表只有一条），说明实现自加入后未变。
- 源码侧 Providers/settings 键 `providers.judgmentProvider` 随同一 judgment 模块引入（CHANGELOG 18.2.4 的 Added 条目与 commit message "judgment module with TypeSafeJudge and unified judge API" 对应）。

## 备注

- `~/.bun/install/global/node_modules/` 下的 `oh-my-openagent`（4.19.4）等包与 `omp` 无关；omp 实际由 `@oh-my-pi/pi-coding-agent` 提供，勿按目录名误判版本。
- 本机 18.2.5 > 18.2.4，TypeSafe judgment 支持已在本机可用（需 `TYPESAFE_API_KEY` 或 `/login typesafe`）。

## Karpathy 证据小结

1. **Think Before Coding**：区分了"源码首次 commit"与"首次正式 release"两个口径并分别给出证据；对 `oh-my-openagent` 目录名造成的版本误读（4.19.4 vs 18.2.5）做了核实纠正——以 shim 实际指向的包为准。
2. **Goal-Driven Execution**：每个断言对应一条可复验记录——commits API（path 过滤）、releases API（published_at）、compare API（祖先关系 status/merge_base）、本机 package.json + dist grep。无一条依赖记忆。
3. **Surgical / Simplicity**：只读操作（版本查询、API GET、grep），零写操作；仅新建指定的单个报告文件。
