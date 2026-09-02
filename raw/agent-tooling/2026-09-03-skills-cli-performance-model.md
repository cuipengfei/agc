# skills CLI 性能模型调查

> Source: 本机 `skills` CLI 源码检查与命令实测；前一轮本机清理记录
> Collected: 2026-09-03
> Published: Unknown

## 源码证据

当前可执行文件解析为 `/home/cpf/.bun/install/global/node_modules/skills/bin/cli.mjs`，实际 CLI 代码位于同一包的 `dist/cli.mjs`。

项目 skill 扫描目录由 `AGENT_PROJECT_SKILL_DIRS` 静态列出，包含 `.agents/skills`、`.claude/skills`、`.codex/skills`、`.opencode/skills`、`.pi/skills` 等多个 agent 目录。每个候选 skill 目录通过 `hasSkillMd()` 对 `SKILL.md` 做文件状态检查。

`dist/cli.mjs` 的命令分派将 `check`、`update` 和 `upgrade` 都路由到 `runUpdate(restArgs)`。`runUpdate()` 随后调用 global/project skill 更新流程；因此 `check` 与另外两个命令共享同一更新路径，并不是独立的纯 dry-run 实现。

## 本机实测

- `skills --help` 返回退出码 0，并显示 `list`/`ls`、`update`，以及 `upgrade` 作为别名。
- 本轮执行 `skills ls -g` 返回退出码 0，用时约 19 秒，标准输出 470 行。
- 前一轮清理记录：global skill 列表操作曾超过 120 秒；清理 phantom agent 目录和无用软链后，记录值降至约 17.7 秒。该历史数字本轮未完整重放。
- 前一轮记录的数量变化为 77 个 agent 目录降至 8 个；该数量是当时调查记录，不代表 CLI 源码中静态列出的项目 skill 目录数量。
- 前一轮软链测量记录为单条约 80–100 ms；CPU 采样中 futex 等待约占 84%，因此瓶颈不应简单归因于磁盘吞吐。

## search-routing 配置实测

- `/home/cpf/.codex/config.toml` 能被 Python `tomllib` 解析，并包含 `mcp_servers.grep-app-github` 与 `tools.searchGitHub`。
- `/home/cpf/.omp/agent/mcp.json` 能被 Python `json` 解析，并包含 `grep-app-github` server。
- 当前共享 skill 文件位于 `/home/cpf/.agents/skills/search-routing/SKILL.md`；Claude、Codex、OpenCode 的对应路径均解析到该文件。OMP 当前没有单独的 skill 目录。
- `grep_app_searchGitHub` 烟测使用 `useState(` 搜索 TSX，成功返回公开 GitHub 仓库及源码片段。

## 结论边界

本调查说明的是本机 `skills` CLI 的扫描和更新路径，不是所有 agent runtime 的通用性能基准。历史清理前后的数值保留为本机记录；若需要发布新的精确基准，应重新执行同一命令并保存完整计时环境。
