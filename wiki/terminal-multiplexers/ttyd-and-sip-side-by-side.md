# ttyd 与 sip 并存部署

> Sources: 本机 systemd 配置与实测，2026-11-15；sip v0.10.0 官方源码与隔离浏览器实测，2026-11-15；本机 systemd cgroup 与重启实测，2026-11-20
> Raw: [sip WSL systemd 自启与 uv-bun 集成](../../raw/terminal-multiplexers/2026-11-15-sip-wsl-systemd-autostart-and-uv-bun-update.md); [sip 字体匹配与 Console 验证](../../raw/terminal-multiplexers/2026-11-15-sip-maple-font-resolution-and-console.md); [sip 服务重启的 cgroup 波及范围](../../raw/terminal-multiplexers/2026-11-20-sip-service-cgroup-restart-blast-radius.md); [sip 的 KillMode=process 与 ttyd 对齐](../../raw/terminal-multiplexers/2026-11-20-sip-killmode-process-and-ttyd-parity.md)
> Updated: 2026-11-20

## Overview

本机同时运行两个浏览器终端服务：ttyd 在 `localhost:7681`（root 级系统服务），sip 在 `localhost:7682`（用户级 systemd 服务）。两者互不冲突，可在浏览器两个标签页间随时切换。

## 并存事实

| 服务 | 端口 | 进程树 | 运行用户 | 状态 |
|---|---|---|---|---|
| `ttyd.service` | `7681` | PID 1（系统 systemd） | root | active |
| `sip.service` | `7682` | 用户 systemd | cpf | active |

两个服务均已设置 `Restart=always`（崩溃后 2 秒自动拉起）。用户 `Linger=yes` 已开启，WSL 启动后两个服务都会自动运行。

## sip.service 关键配置

```ini
ExecStart=/home/cpf/go/bin/sip -H localhost -p 7682 -- /usr/bin/zsh -l
KillMode=process
Restart=always
RestartSec=2
WantedBy=default.target
```

未传 `--renderer` 参数，渲染器默认值由浏览器右上角设置面板或 URL 参数控制。

启动后验证：`systemctl --user is-enabled sip.service` 返回 `enabled`；`curl http://localhost:7682/health` 返回 `OK`；启动命令不带 `--font-family` 时首页不注入 `fontFamily`，`curl -s http://localhost:7682/ | grep __sipConfig` 无匹配。

启动命令不覆盖字体名，Worker engine 下由页面选择宿主字体；步骤与判据见 [sip Worker engine 下使用宿主字体](sip-worker-engine-host-font.md)。

## 重启边界：两份服务的 KillMode

两份服务现均为 `KillMode=process`：`/usr/lib/systemd/system/ttyd.service:11` 明写，`/home/cpf/.config/systemd/user/sip.service:8` 于 2026-11-20 新增。语义来自 systemd.kill(5)：`control-group` 停止时向单元 cgroup 内全部进程发信号，`process` 只向主进程发信号。

sip 修改前使用默认 `control-group`，重启时连同 herdr server、pane 进程与发起重启的 shell 一起结束，命令返回码 143。修改后 `systemd-analyze --user verify` 通过、`daemon-reload` 后生效值为 `process`，sip MainPID 未变。

按该语义，重启 sip 只结束 sip 主进程，Herdr server 与 pane 程序留在原 cgroup，浏览器重连后 attach 回到原会话；此条为推断，修改后尚未实测。

`process` 不改变进程归属：采集时三个 herdr server 仍在 `sip.service` cgroup。本机 session 名称临场决定，采用全局设置对所有 session 一致生效。

核对生效值：

```bash
systemctl --user show sip -p KillMode
systemctl show ttyd -p KillMode
```

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
- [sip Worker engine 下使用宿主字体](sip-worker-engine-host-font.md)
- [ttyd xterm.js 渲染色块与渲染器选择](ttyd-xterm-renderer-corruption.md)
