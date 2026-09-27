---
source-url: 本机实测（omo-ai@5.0.0，omo 5.0.0 engine senpi 2026.9.26）
collected: 2026-09-27
published: 2026-09-27
---

# omo（omo-ai 5.0.0）命令面与首启迁移观察

`bun add -g omo-ai@5.0.0` 后本机实测。安装报「installed omo-ai@5.0.0 with binaries: omo」「Blocked 1 postinstall」，bun 直接替换了旧软链。`omo --version` = `omo 5.0.0 (engine: senpi 2026.9.26)`。

## sentinel（枚举有效性检查）

`omo --definitelynotaflag --help` 返回根帮助页且退出码 0。结论：该 CLI 吞未知参数、回退父页，退出码不可信。命令树枚举不能靠退出码或「有输出即存在」判定，只能靠「叶子页 vs 父页逐字对比，相同即假路径丢弃」。

## 命令树（递归，父页去重后，共 9 张不同 help 页）

默认形态是交互式编码助手：`omo [消息...]` 直接进 agent，大量 flag 挂在这一层（选模型、会话、开关工具/技能/扩展、思考等级）。子命令只管扩展安装、认证、守护进程。

扩展/包管理：
- `omo install <source> [-l]`：装扩展包（npm/git/https/ssh/本地路径），-l 项目级
- `omo remove <source> [-l]`：卸载；`omo uninstall` 是别名（别名 --help 掉回根页）
- `omo list`：列已装包
- `omo config [-l]`：TUI 开关各包资源，Tab 切全局/项目级
- `omo update [source|self|omo]`：更新；实测无参 --help 被当默认动作执行，跑了 `bun add -g omo-ai`

认证（help 文案层显示 `pi auth`；仅证明展示层用此名，不证明内部调用）：
- `omo auth print-api-key`
- `omo auth print-bearer-token`（可设最小有效期）
- `omo auth check`（默认自动刷新过期 OAuth，--no-refresh 禁用）
- 三者都要求至少 --provider 或 --model；其 --help 掉回 auth 页，不单独出页

守护进程/服务（不吃 --help，给了报错，只认位置参数）：
- `omo app-server [--listen ...]`：Codex app-server 协议对外提供会话
- `omo app-server daemon <start|stop|status|restart>`
- `omo host <ensure|status|stop|handoff>`：管子会话共享的 RPC 守护进程，每次回一行 JSON

覆盖边界：app-server/host/auth 的子命令名从父页正文读出，非各叶子 --help 独立验证（它们回退父页或报错）。

## help 文案层揭示的组件（仅展示层证据）

- 交互层 flag：`--pi-rules-*`、`--ttsr-*`、`--omo-senpi-*`。
- 一排 `--omo-senpi-*-disabled` 覆盖组件：memory、ultrawork、lsp、ast-grep、comment-checker、task、thread、telemetry、kibitzer 相关 init-deep-advisor 等，每个可单独关。
- `omo host` 命令的存在，与 release notes「子会话共享 daemon」一致。

## 首启迁移（只读现状 + 推断）

`~/.omo/agent/migrations-state.json` 记录两项完成：`migrateLegacySenpiDirs`、`migrateSessionsFromAgentRoot`。

只读现状：
- 全局：`~/.pi/agent` 现为空（0 项），`~/.omo/agent` 有约 10020 项（auth.json、models.json、settings.json、sessions、skills、extensions、cache，及 `.adopted-from-omo-flat` 标记）。
- 项目：`/home/cpf/code-inside/agc/.pi` 现为空，`.omo` 有 149 项（better-harness、goal、run-continuation、thread-tools、ulw-loop）。

未验证，非事实：`migrations-state.json` 无时间戳。无法确认这两项迁移是否由本会话首次运行 omo 触发、`.pi` 目录是本次被清空还是本就近空、迁移是否可逆。现象是两个 .pi 现空、两个 .omo 有内容；因果与时序无硬证据。

## 证据边界

- 一手直读：version 输出、sentinel 行为、去重后命令树、迁移状态文件内容、目录条目数。
- 展示层证据（非内部实现）：`pi auth`、`--pi-rules-*`、`--omo-senpi-*` 等 flag 名。
- 推断/未验证：迁移触发时机、因果、可逆性；各组件的实际内部行为。
