# i3 Sway 变体的配置错误横幅：重复键位与修复

> Sources: bd 事项 wsl-webtop-xp2 记录, 2026-11-08; bd 事项 wsl-webtop-8tw 记录, 2026-11-08; wsl-webtop 生成配置与 upstream.json 现状核对, 2026-11-08; 会话用户验收, 2026-11-08
> Raw: [i3 Sway 会话红色配置错误横幅修复：证据摘录](../../raw/webtop/2026-11-08-i3-banner-fix-and-acceptance.md); [i3 Ctrl Alt modifier 修改与 Selkies 内存归因调查摘录](../../raw/webtop/2026-11-08-i3-ctrl-alt-modifier-and-memory-investigation.md)
> Updated: 2026-11-08

## Overview

wsl-webtop 的 i3 Sway 桌面变体在浏览器页面顶部出现红色「error in config file」横幅的定位与修复记录，以及后续窗口模式 modifier 从 Mod4 改为 Control+Mod1 的调整。横幅由 Sway 的 swaynag 呈现，本次触发点是 `Mod4+Return` 快捷键重复定义；修复把快捷键收敛为唯一定义并通过 native IPC 对同一进程 reload 应用。modifier 调整保持同样的 native IPC 方式，不重启服务。

## 症状与触发

用户在 localhost8080 页面顶部看到红色横幅（error in config file）。核对的结论是 `Mod4+Return` 重复定义触发 swaynag：同一快捷键在生成配置里出现了第二定义，Sway 把 binding overwrite 当配置错误报在横幅上。同类正常功能未受牵连：同文件的退出确认绑定（`bindsym $mod+Shift+e` 调 swaynag）保持原样。

## 修复形态

- 唯一定义：`bindsym $mod+Return exec /usr/bin/st`。`/usr/bin/st` 被要求就绪后方可作为默认终端快捷键生效，因为它是 X11 终端；`$term` 变量与系统终端备选保持原状。
- 生成语义的硬约束来自 generator 验收来源 `config/i3/upstream.json`：「`Set the existing bindsym $mod+Return command to exec /usr/bin/st. Keep one definition of this shortcut`」，同段还要求保留完整默认键位、`Mod4` 修饰键、`wmenu-run` 启动器、resize mode、顶栏、状态栏日期、配色与壁纸，不加 rofi/polybar/feh、个人主题或自启动应用。
- 验证方式：独立临时 headless `sway --validate --debug` 校验结果没有 ERROR/Overwriting。
- 应用方式：经 native IPC 对同一 PID reload 成功，原横幅 swaynag 进程退出；Main PID 3437236 与 Sway PID 3437320 保持不变；未重启桌面服务。

## 窗口模式 modifier 调整（2026-11-08 追加）

用户报告：Alt 键替代 Win 键直接换按没有生效、Win+D 触发 Windows 显示桌面、Win+Enter 没有反应。判断为 Windows 宿主与浏览器间对远程快捷键的截取问题。用户授权把窗口模式下的键盘前缀改为 Ctrl+Alt，鼠标拖动单独保留 Alt。

配置变更：

- `set $mod Control+Mod1`（config 第 9-10 行）。原注释「`# Logo key. Use Mod1 for Alt.`」替换为「`# Keyboard shortcuts for browser window mode.`」。
- `floating_modifier Mod1 normal`（config 第 86 行，从原 `$mod normal` 显式拆出，因 `$mod` 变为复合组合后不再适合单独作为鼠标修饰键）。

同步文档：README.md 新增段落说明当前快捷键；docs/desktop-parity.md、docs/plan.md、docs/maintenance.md 同步窗口模式前缀为 Ctrl+Alt、鼠标为 Alt 的表述。

| 操作 | 当前建议按键 |
|---|---|
| 打开终端 `st` | Ctrl+Alt+Enter |
| 打开应用启动器 | Ctrl+Alt+D |
| 移动窗口焦点 | Ctrl+Alt+H/J/K/L |
| 关闭当前窗口 | Ctrl+Alt+Shift+Q |
| 拖动窗口 | Alt+鼠标左键 |
| 调整窗口尺寸 | Alt+鼠标右键 |

推荐 Ctrl+Alt 的依据 [INFERENCE] 是它与当前默认键位组合的已知 Chrome 冲突较少：单独使用 Alt 会遇到 Alt+D 地址栏、Alt+F 菜单、Alt+左右方向键历史导航等重合；按左 Ctrl+左 Alt 可减少右 Alt 被键盘布局解释成 AltGr 的混淆；Ctrl+Alt+Del 等 Windows 系统组合仍由宿主处理。

验证与收据：

- 独立 headless `env WLR_BACKENDS=headless WLR_RENDERER=pixman sway --unsupported-gpu --validate --config /home/cpf/.config/wsl-webtop/i3/sway/config` exit 0。
- `swaymsg -s /run/user/1000/wsl-webtop/session-zlolvx8y/sway-ipc.sock reload` 成功；同 PID 不变。
- capture 收据 `/home/cpf/.local/state/wsl-webtop/config-receipts/20261108T100156-2cb8f075aceb.json`（`status: "complete"`、`schema_version: 2`、`receipt_id: "20261108T100156-2cb8f075aceb"`、`created_at: "2026-11-08T10:01:56.401230+00:00"`）。
- 本会话 HTTP 验证 `curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:8080/` 返回 `HTTP 200`。


- 另注：`/home/cpf/.local/state/wsl-webtop/verify/i3-config-fixed.json` 是横幅修复时段（2026-11-08 03:20）的验证工件，`tests.session: 29`、`native_running.checks: 11`、`security.checks: 7` 等条目属于横幅修复时段的检查，不归入本次 modifier 改动。本次 modifier 改动的实际验证为：独立 headless validate exit 0、native IPC reload 成功、同 PID 保持不变、`doctor ok`、13 desktop tests、HTTP 200。
未授权与未执行：未操作浏览器实测 Ctrl+Alt 在 Chrome 中的转发效果；未重启桌面服务；未 commit/push。

## 验收与证据边界

机械检查三组：42 相关测试、native 侧 11 项与 HTTP 7 项全部通过；源码、runtime 与 managed 记录三方一致；原包集合、baseline 与用户环境保持不变（不降级、不删除、无全局 upgrade）。运维收据为 capture 记录 `20261108T032036-fe44effc6f14`（`status: "complete"`、`schema_version: 2`、`created_at: "2026-11-08T03:20:36.432537+00:00"`，收据内 `before`/`after` 两段锚定 `i3/sway/config` 等条目）。

用户随后在本会话中确认红色横幅消失。本事项未涉及 commit/push 与 agc 仓库修改。i3 Sway 变体与 KDE 变体在同一 8080 端口互斥切换（bd `wsl-webtop-us2`「单端口 KDE 与 Webtop i3 Sway 互斥切换」）；KDE 变体架构见 webtop-on-wsl-architecture 文章，两变体的生成配置在 `config/i3` 与 KDE 目录分别为独立来源。

## See Also

- [Selkies 指针尺寸链路与浏览器时序（HiDPI 嵌套会话）](selkies-cursor-scaling-chain.md)
- [Webtop 移植到 WSL：组件、偏离与原因](webtop-on-wsl-architecture.md)
