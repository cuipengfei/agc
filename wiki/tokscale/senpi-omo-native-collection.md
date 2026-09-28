# tokscale 采集 omo native(senpi) 用量

> Sources: 本会话实证调查（tokscale 4.17.0，2026-09-27）
> Raw: [2026-09-27-senpi-collection-root-cause](../../raw/tokscale/2026-09-27-senpi-collection-root-cause.md); [2026-09-27-omp-title-first-now-parsed](../../raw/omp-sessions/2026-09-27-omp-title-first-now-parsed.md)
> Updated: 2026-09-27

## 一句话

tokscale 的 Senpi client 默认扫 `~/.senpi/agent/sessions/`，而 omo native 的数据在 `~/.omo/agent/sessions/`；两者之间的桥只有 `SENPI_CODING_AGENT_DIR` 环境变量，它仅由 omo/senpi 会话进程注入——**任何不带这个变量的上下文跑 `tokscale submit`，omo native 用量被静默丢弃，无警告**。

## 根因链

1. tokscale（4.17.0，2026-09-15 安装）的 Senpi (OmO Native) client 是上游一等支持，手册默认数据位置 `~/.senpi/agent/sessions/`，可用 `SENPI_CODING_AGENT_DIR` 覆盖。
2. omo native 是 senpi 引擎的品牌再发行，数据实际在 `~/.omo/agent/sessions/`（本机 `~/.senpi` 从未存在）。
3. 对照实验（同一二进制，仅控制该变量）：无变量时 `submit --today --dry-run` 的 Clients 只有 omp, opencode（186,392,617 tokens / $48.01）；带变量时多出 senpi（205,431,806 / $59.46）。
4. 变量来源：无 shell rc、/etc、OMP 包设置它；唯一来源是 omo/senpi 会话进程给子进程注入（senpi dist 的 host-lifecycle.js / session-worker.js）。所以会话内跑 tokscale 正常，普通终端静默丢失。

## 修复与防双计

- 已实施：`mkdir -p ~/.senpi && ln -s ~/.omo/agent ~/.senpi/agent`——手册默认路径直接解析，与环境变量彻底无关。
- 去重实证：软链路径与变量路径两条根同时可见（等同上游未来新增 omo 默认目录的场景），两次 dry-run 逐 token 相等（219,253,609 / $63.69，差值 0）——tokscale 对跨根目录相同会话去重，不会双计。
- senpi jsonl 的 token 数据在嵌套字段 `message.usage.totalTokens`（顶层 `usage` 恒为 null），tokscale 解析正确（1.5K messages）。

## 目录沿革（为什么默认是 ~/.senpi）

- senpi 引擎自己的路径解析链：`SENPI_CODING_AGENT_DIR ?? CODING_AGENT_DIR ?? ~/.senpi/agent`（dist/config.js）——独立 senpi 的家就是 `~/.senpi/agent`，tokscale 镜像了上游默认。
- `CONFIG_DIR_NAME = BRAND?.configDir || pkg.piConfig?.configDir || ".pi"`：omo 品牌拿 `.omo`，兜底 `.pi` 暴露 pi-mono 血统（Pi/Gajae/Kimchi/senpi 共用 `X_CODING_AGENT_DIR` 约定）。
- `brand-dir-migration.js` 带 `.migrated-from-senpi` 标记：品牌版首跑时把 `~/.senpi/agent` 复制进品牌目录——`~/.senpi/agent` 是引擎版故居。本机 `~/.omo` 无该标记，从未装过独立 senpi。
- 插件时代（omo 寄生 OpenCode）的用量归 tokscale 的 OpenCode client；配置残留 `~/.omo/omo.jsonc -> ~/.config/opencode/.omo/omo.jsonc` 软链。

## OMP 侧现状（关联）

- 原生 Oh My Pi client 已能解析 title-first jsonl（90.4K messages）；历史 mirror workaround（`tokscale_omp_to_pi_mirror.js` → Pi 格式）已退役：目标目录 0 个 jsonl、无 crontab、无配置引用。
- 仍在生效：`~/.config/tokscale/custom-pricing.json`（kimi 定制定价）；死件 `~/.omp/scripts/` 下三个 tokscale 脚本可清理。
- 定价缓存 `~/.cache/tokscale/pricing-litellm.json` 停在 2026-04-30，仅影响单价准确性。

## 两个易复发陷阱

- **静默丢弃**：tokscale 对扫描不到的数据源完全静默；submit 对未定价消息也只做排除警告。判断"有没有数据"要跑 `tokscale clients` 看各 client 的 ✓/✗ 与 messages 计数。
- **污染检测**：在 agent 会话内跑 `zsh -ic 'echo $VAR'` 会因继承打印出值，不能证明 rc 有设置；干净检测用 `zsh -ixc true` xtrace 或 `env -u VAR` 对照实验。

## 未验证

去重机制内部实现；Senpi client 上游引入版本；定价缓存刷新触发条件。

See Also: [OMP jsonl 首行 title 与第三方解析器](jsonl-format-and-third-party-parsers.md)（其中 tokscale 历史结论已被本文取代）
