# tokscale 不采集 omo native(senpi) 用量：根因考证与修复

- Source: 本地会话调查（omo native 会话 2026-09-27T07-33-33Z，cwd=/home/cpf/code-inside/agc）
- Collected: 2026-09-27
- Published: 2026-09-27（同日会话实录摘录）

## 环境与版本

- tokscale CLI：`/home/cpf/.bun/bin/tokscale`，包 `@tokscale/cli` **4.17.0**，安装时间 **2026-09-15**（bin 与 package.json mtime 一致）。
- 仓库：github.com/junhoyeo/tokscale（README 自述 "tracking AI coding assistant token usage and costs across multiple platforms"，keywords 含 omp/opencode/claude-code/codex）。

## README 手册关键摘录（Senpi client）

- 支持列表中 Senpi (OmO Native) 链接 `github.com/code-yeongyu/senpi`。
- 数据位置：`~/.senpi/agent/sessions/`（override via `SENPI_CODING_AGENT_DIR`）。
- submit 规则："Unpriced usage is excluded from submission"——每条消息必须解析到覆盖其全部 token 桶的权威价格，否则被跳过并警告。
- `tokscale clients` 输出关键行（本机，当时 shell 带环境变量）：

```
  Senpi (OmO Native)
  sessions: ~/.omo/agent/sessions ✓
  additional: ~/code-inside/agc/.omo/senpi-task/children ✗, ~/.omo/senpi-task/children ✗
  messages: 1.5K

  Oh My Pi
  sessions: ~/.omp/agent/sessions ✓
  messages: 90.4K

  Pi
  sessions: ~/.pi/agent/sessions ✗
  messages: 0
```

## 对照实验（控制变量：仅 SENPI_CODING_AGENT_DIR）

同一二进制 `tokscale submit --today --dry-run`：

| 环境 | Total tokens | Total cost | Clients |
|---|---|---|---|
| `env -u SENPI_CODING_AGENT_DIR` | 186,392,617 | $48.01 | omp, opencode |
| 带 `SENPI_CODING_AGENT_DIR=/home/cpf/.omo/agent` | 205,431,806 | $59.46 | omp, opencode, senpi |

- senpi 在无变量时被**静默跳过，无任何警告**。
- 用户两次成功的真实提交（"Ran `tokscale submit --today`" 输出）均含 senpi，tokens 分别 218,934,656 / $63.55 与 200,788,332 / $57.63；最早一次失败提交只有 `Clients: omp, opencode`（176,979,089 / $44.73）。

## senpi 会话文件格式（tokscale 实际读取的字段）

本会话 jsonl（`/home/cpf/.omo/agent/sessions/--home-cpf-code-inside-agc--/2026-09-27T07-33-33-292Z_*.jsonl`）记录类型分布：

```
{'session': 1, 'model_change': 2, 'thinking_level_change': 1, 'custom': 87,
 'custom_message': 21, 'message': 292, 'session_info': 1, 'compaction': 1}
```

- token 数据在**嵌套**字段 `message.usage.totalTokens`（message 键内）；记录顶层 `usage` 字段存在但恒为 `null`。
- 样本：`type: message, message.usage.totalTokens = 53856`、`54149`。

## 环境变量来源考证

- `zsh -ixc true` 全程 xtrace + grep 全部 zsh 初始化文件、/etc/zsh/、/etc/environment、/etc/profile、/etc/bash.bashrc：**零命中**——没有任何 shell rc 或系统文件设置 `SENPI_CODING_AGENT_DIR`。
- OMP 包（@oh-my-pi、oh-my-openagent、oh-my-opencode）同样不设置（仅 oh-my-openagent 一个 skill 文档提及）。
- 唯一来源：omo/senpi 会话进程给子进程注入。grep 命中文件：`@code-yeongyu/senpi/dist/modes/rpc/host-lifecycle.js`、`dist/bundle/chunks/session-worker.js`、`dist/bundle/chunks/host-lifecycle.js` 等。
- ⚠️ 污染检测教训：在 agent 会话内跑 `zsh -ic 'echo $SENPI_CODING_AGENT_DIR'` 会打印出值，但这是子 shell 从父进程（agent kernel）**继承**所致，不能证明用户 rc 有设置。

## 修复与去重实验

- 软链：`mkdir -p ~/.senpi && ln -s ~/.omo/agent ~/.senpi/agent`（2026-09-27 晚执行）。
- 双路径可见性对照实验（等同"上游未来把 ~/.omo 加为默认扫描目录"的场景）：

| 运行环境 | Total tokens | Total cost |
|---|---|---|
| B：仅软链路径可见（env -u） | 219,253,609 | $63.69 |
| C：软链+变量两条路径同时可见 | 219,253,609 | $63.69 |

差值 0——tokscale 对跨根目录的相同会话去重。

## OMP mirror 退役三证（2026-09-27 晚）

- `~/.local/share/tokscale-omp-pi` 下 **0 个 jsonl**（glob 递归计数）。
- `crontab -l`：`no crontab for cpf`。
- `grep -rn submit-tokscale ~/.omp/agent/`（json/jsonc/yaml/sh）：无引用。
- 反向证据：OMP 最新 session（**2026-09-24**）首行仍是 `{"type":"title","v":1,"title":"","updatedAt":"2026-09-24T15:07:47.068Z",...}`，而 tokscale 原生 Oh My Pi client 数出 90.4K messages——title-first 已被上游处理。
- 仍在生效的配套件：`~/.config/tokscale/custom-pricing.json`（kimi 模型定制定价，供 submit 计价）。
- 死件：`~/.omp/scripts/submit-tokscale-omp.sh`、`tokscale_omp_to_pi_mirror.js`、`test_submit_tokscale_omp.sh`。
- 定价缓存：`~/.cache/tokscale/pricing-litellm.json` mtime **2026-04-30**（五个月未刷新，离线兜底）。

## senpi 目录沿革（引擎源码考证）

- `@code-yeongyu/senpi/dist/config.js` 解析链原文：
  `(env3.SENPI_CODING_AGENT_DIR ?? env3.CODING_AGENT_DIR ?? ${(env3.HOME??".").replace(/\/$/,"")}/.senpi/agent)`
- 品牌常量：`CONFIG_DIR_NAME = BRAND?.configDir || pkg.piConfig?.configDir || ".pi"`；`FLAT_LAYOUT_SENTINEL = "settings.json"`。注释原文："~/.omo for a flat brand or ~/.senpi/agent for the engine layout."
- `dist/brand-dir-migration.js`：`MIGRATION_MARKER = ".migrated-from-senpi"`；`migrateEngineStateForBrand()` 把 `~/.senpi/agent` 复制到品牌目录，提示 "The original directory is untouched; the two installs keep separate state from now on."
- 本机 `~/.omo` **无** `.migrated-from-senpi` 标记、`~/.senpi` 从未存在 → 本机从未装过独立 senpi，omo native 从一开始就在 `~/.omo`。
- 插件时代残留：`~/.omo/omo.jsonc` 是指向 `~/.config/opencode/.omo/omo.jsonc` 的软链（Aug 5 创建）；插件时代用量归 tokscale 的 OpenCode client 统计。

## 未验证事项

- tokscale 跨根目录去重的内部实现（仅行为观测）。
- Senpi client 在上游的引入版本（GitHub 抓取失败）。
- 用户最早一次失败提交的确切执行环境（推断为无变量的普通终端）。
- 定价缓存的刷新触发条件。
