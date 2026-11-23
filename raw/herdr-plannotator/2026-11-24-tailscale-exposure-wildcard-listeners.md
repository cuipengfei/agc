# 本机 tailnet 暴露面核对（2026-11-24 快照）

> Source: 本机实测命令输出（命令与输出见下）
> Collected: 2026-11-24
> Published: Unknown

背景：回答「当前 Tailscale 设置向手机 Herdr App 暴露了什么」时，先依据 `tailscale serve status`（No serve config）断言「只暴露 SSH 22」。该推断被指出遗漏：Serve 配置只覆盖 Serve 发布的端口，不反映进程直接绑 0.0.0.0 / * 的监听。以下为补测证据。

## ss -tlnp（监听表，按绑定地址分组）

通配绑定（监听视角；能否被 tailnet 对端命中取决于 tailnet policy 与本机防火墙，本次未验证）：

- `0.0.0.0:6688` — pid 656：`/home/<USER>/.local/bin/node /home/<USER>/.local/bin/code-serve-web-locale-proxy.js`
- `*:4139`、`*:4140` — pid 13006：`bun run router/sticky-router.ts`（父进程 zsh）

tailscaled 自身（tailscale0 接口）：

- `<TAILSCALE_IP>:52096`（tailscale0）
- `[<TAILSCALE_IPV6>]:60969`（tailscale0）

仅回环（只绑 127.0.0.1，没有直接监听 Tailscale 地址）：127.0.0.1:7682（sip）、7681（ttyd）、8378（tern）、8787/8788（headroom）、6689（code-tunnel-ins）、30933、43595、4142-4146（bun）、127.0.0.53/54 与 10.255.255.254 的 53（systemd-resolved）。

22 端口不在 ss 输出中：Tailscale SSH 由 tailscaled 在 WireGuard 解密后的入站流量内接管，属设计行为（机制说明与 tailscale 仓库 issue #11097 见 2026-11-13 raw 与对应 wiki 文章）。

## 其他实测

- `hc ls` → `{"hidden_finished":1,"terminals":[]}`（core 当前 0 个活跃终端）
- `herdr session list` → default、mai 为 stopped；main、mon、sec 为 running（socket 在 `~/.config/herdr/sessions/<name>/herdr.sock`，属 Herdr TUI 会话，与 herdr-core 终端无关）
- `tailscale serve status` → `No serve config`
- `tailscale status` → 本机 <HOSTNAME>（linux）在线；手机 <PHONE>（android）offline, last seen 6d ago

## 结论

「serve 无配置」只说明没有 Serve 发布的端口，不等于暴露面只有 SSH 22：ss 显示 6688（code-serve-web-locale-proxy.js）与 4139/4140（sticky-router）绑通配地址，具备被 tailnet 对端访问的绑定条件。实际可达性需从在线 tailnet 设备实测——2026-11-24 采集时手机 <PHONE> 离线 6 天，未验证；tailnet policy 与本机防火墙也未逐项核对。这两个应用层端口是否需要鉴权同样未核实。本节为单时点监听快照，不是可达性证明。
