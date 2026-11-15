# ttyd 与 sip 并存部署

> Sources: 本机 systemd 配置与实测，2026-11-15；sip v0.10.0 官方源码与隔离浏览器实测，2026-11-15
> Raw: [sip WSL systemd 自启与 uv-bun 集成](../../raw/terminal-multiplexers/2026-11-15-sip-wsl-systemd-autostart-and-uv-bun-update.md); [sip 字体匹配与 Console 验证](../../raw/terminal-multiplexers/2026-11-15-sip-maple-font-resolution-and-console.md)
> Updated: 2026-11-15

## Overview

本机同时运行两个浏览器终端服务：ttyd 在 `localhost:7681`（root 级系统服务），sip 在 `localhost:7682`（用户级 systemd 服务）。两者互不冲突，可在浏览器两个标签页间随时切换。

## 并存事实

| 服务 | 端口 | 进程树 | 运行用户 | 状态 |
|---|---|---|---|---|
| `ttyd.service` | `7681` | PID 1（系统 systemd） | root | active |
| `sip.service` | `7682` | PID 273（用户 systemd） | cpf | active |

两个服务均已设置 `Restart=always`（崩溃后 2 秒自动拉起）。用户 `Linger=yes` 已开启，WSL 启动后两个服务都会自动运行。

## sip.service 关键配置

```ini
ExecStart=/home/cpf/go/bin/sip -H localhost -p 7682 \
  --font-family "Maple Mono NF CN, monospace" \
  -- /usr/bin/zsh -l
Restart=always
RestartSec=2
WantedBy=default.target
```

未传 `--renderer` 参数，渲染器默认值由浏览器右上角设置面板或 URL 参数控制。

启动后验证：`systemctl --user is-enabled sip.service` 返回 `enabled`；`curl http://localhost:7682/health` 返回 `OK`；首页注入 `window.__sipConfig={"fontFamily":"Maple Mono NF CN, monospace"};`（不含 `renderer` 字段）。

字体名称已传给页面；Windows Chrome 隔离测试中的英文和数字实际使用内置 JetBrains。原因和当前页面临时设置步骤见 [sip v0.10.0 使用参考](sip-v0.10.0-usage-reference.md#字体与渲染)。

## 进程树与 herdr 嵌套问题

从 Herdr pane 里直接启动 sip 会导致子进程继承 `HERDR_SESSION`、`HERDR_PANE_ID` 等环境变量，在里面运行 `herdr --session main` 会报「nested herdr is disabled」错误。

改用 `systemctl --user start sip.service` 后，sip 进程（MainPID `1820561`，父进程 `273`）环境变量清单中不含任何 `HERDR_*` 或 `OMPCODE`/`PI_*` 变量，可正常运行 herdr。

## 切换入口

| 场景 | 地址 |
|---|---|
| ttyd（SIXEL、已定制 OSC52 页面） | `http://localhost:7681` |
| sip（Kitty graphics、设置面板持久化） | `http://localhost:7682` |

在 sip 终端里挂回 herdr 会话：

```bash
herdr --session main
```

## 何时用哪个

| 需求 | 选 |
|---|---|
| 看 Kitty graphics 图片（`kitten icat`） | sip |
| 看 SIXEL 图片 | ttyd（`-t enableSixel=true`） |
| 需要持久保存渲染器/字号等浏览器设置 | sip（右上角齿轮写入 localStorage） |
| 需要已经调好的 Tokyo Night Storm 配色 URL | ttyd（见 ttyd-tokyo-night-storm-theme） |
| 需要 herdr 嵌套会话支持 | 两者都支持（但 sip 需用 systemd 方式启动避免环境变量泄漏） |

## See Also

- [sip v0.10.0 使用参考](sip-v0.10.0-usage-reference.md)
- [Go 与 sip 安装升级](go-and-sip-install-upgrade.md)
- [ttyd 前端编译模型与 xterm 版本锁定](ttyd-frontend-compilation.md)
- [ttyd xterm.js 渲染色块与渲染器选择](ttyd-xterm-renderer-corruption.md)
