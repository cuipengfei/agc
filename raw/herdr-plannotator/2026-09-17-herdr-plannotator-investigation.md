# Herdr + Plannotator 调研 Raw

> Sources: herdr 0.9.1 binary + docs, plannotator 0.27.15 binary + source, GitHub search
> Updated: 2026-09-17
> Raw: 2026-09-17-herdr-plannotator-investigation.md

## 调研范围

1. herdr CLI 全部子命令/flags/配置项
2. plannotator CLI 全部子命令/flags/配置项
3. herdr 插件生态（机制 + 清单）
4. `plannotator/herdr-annotate` 仓库
5. `plannotator/herdr-plannotator` 仓库

## 方法

- 本机 binary `--help` 收割（herdr 0.9.1, plannotator 0.27.15）
- 官方文档（herdr.dev, raw.githubusercontent.com/herdrdev/herdr/v0.9.1/...）
- 源码阅读（github.com/backnotprop/plannotator, github.com/plannotator/herdr-annotate, github.com/plannotator/herdr-plannotator）
- GitHub 搜索 `gh search repos "herdr-plugin"`（2026-09-17）

## 关键发现

### 1. `workspace close --group` 冲突 [冲突]

| 来源              | 声明                                               | 实测结果                                        |
| ----------------- | -------------------------------------------------- | ----------------------------------------------- |
| 官方文档 v0.9.1   | `herdr workspace close <workspace_id> [--group]`   | `herdr workspace close --help` 不显示 `--group` |
| Socket API schema | `WorkspaceCloseParams` 包含 `close_group: boolean` | `herdr api schema --json` 确认存在              |

**实测结果**（三种调用位置）：

| 调用方式                           | 结果                                                        | 含义                                              |
| ---------------------------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| `herdr workspace close --group`    | `workspace_not_found: workspace --group not found` (EXIT=1) | `--group` 被当作 workspace_id（positional）       |
| `herdr workspace close --group w1` | usage 错误 (EXIT=2)                                         | `--group` 在 ID 前不被接受为 flag                 |
| `herdr workspace close w1 --group` | `workspace_not_found: workspace w1 not found` (EXIT=1)      | `--group` 在 ID 后被接受，请求已发出（w1 不存在） |

**结论**：

- help 输出未展示 `--group` flag
- `ID --group` 位置可被 CLI 解析并发出请求，但尚未在真实 linked-worktree group 上验证语义
- `--group ID` 或 `--group` 单独使用不被接受
- Socket API schema 确认 `close_group: boolean` 参数存在

### 2. plannotator help/source 差异 [源码]

`apps/hook/server/index.ts` 注释列出额外模式，但不在 `plannotator --help` 中：

| 模式                     | 说明                        | 调用方          |
| ------------------------ | --------------------------- | --------------- |
| `copilot-plan`           | Copilot CLI preToolUse hook | Copilot CLI     |
| `opencode-plan`          | OpenCode CLI fallback       | OpenCode plugin |
| `opencode-review`        | OpenCode review bridge      | OpenCode plugin |
| `opencode-annotate-last` | OpenCode annotation bridge  | OpenCode plugin |

这些是内部 hook entrypoints，非用户公开命令。

### 3. 插件生态边界 [边界声明]

`gh search repos "herdr-plugin"` 结果：

- 未验证 GitHub topic
- 未验证每仓库有可解析 `herdr-plugin.toml`
- 包含非插件仓库（dotfiles、客户端等）
- 仅前 100 条，非穷尽

**权威纳入标准**（Marketplace）：GitHub topic `herdr-plugin` + 默认分支有可解析 `herdr-plugin.toml`。

### 4. 配置项证据边界 [边界声明]

`herdr --default-config` 输出的是注释模板（所有值被注释），非实际默认值。官方 `config-reference.json` 声明默认值，但未逐项运行验证。本机 `~/.config/herdr/config.toml` 是用户实际配置，非默认值。

**证据分层**：

- `[文档默认]` = 官方 config-reference.json 声明
- `[本机配置实测]` = `cat ~/.config/herdr/config.toml` 结果
- `[未验证]` = 未运行验证的声明值

## 数据位置

完整 925 行 reference 已持久化到 `wiki/herdr-plannotator/toolchain-reference.md`。本 raw 文件仅包含关键摘录和结论。
