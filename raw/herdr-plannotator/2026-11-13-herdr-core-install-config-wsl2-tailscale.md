# herdr-core 安装脚本、配置定义与 WSL2/Tailscale 部署实测

> Source: herdrdev/herdr-core README 与 releases.herdr.dev 安装脚本；本机实测命令输出；Ubuntu 26.04 WSL2 环境
> Collected: 2026-11-13
> Published: Unknown

以下摘录均来自本次会话已读取的原文与本机实测输出，采集于 2026-11-13。

## 安装脚本原文（releases.herdr.dev/core/install.sh）

> Installs herdr-core (hc), or updates it:
>
>   curl -fsSL https://releases.herdr.dev/core/install.sh | sh
>
> Into ~/.local/bin/herdr-core, with `hc` beside it only if no `hc` exists
> (some window managers ship one). An hc that is already there is swapped
> the planned way (hc update --from): running terminals keep running. One
> from a package manager is left to it. HC_VERSION=0.2.0 picks a version;
> HERDR_RELEASES_URL points elsewhere (tests).

脚本关键行为原文：下载 manifest（`latest.json` 或指定版本 manifest），target 由 `$os-$arch` 组成（os 为 linux/macos，arch 为 x86_64/aarch64），共四个条目：`linux-x86_64`、`linux-aarch64`、`macos-x86_64`、`macos-aarch64`，SHA256 校验失败则拒绝：

> [ "$(sha256 "$tmp/hc.tar.gz")" = "$want" ] || fail "the download is damaged (checksum mismatch); try again"

非 macOS 平台或全新安装的替换路径：

> cp "$core" "$bin/herdr-core.new"
> chmod 755 "$bin/herdr-core.new"
> mv -f "$bin/herdr-core.new" "$bin/herdr-core"

`hc` 链接的创建条件原文：

> if ! command -v hc >/dev/null 2>&1 && [ ! -e "$bin/hc" ]; then
>   ln -s herdr-core "$bin/hc"
> fi

PATH 提示原文：

> case ":$PATH:" in
>   *":$bin:"*) ;;
>   *) say "Add $bin to your PATH to use hc." ;;
> esac

## README Install 段原文

> ## Install
>
> Linux and macOS:
>
> ```sh
> curl -fsSL https://releases.herdr.dev/core/install.sh | sh
> ```
>
> Windows (PowerShell):
>
> ```powershell
> powershell -c "irm https://releases.herdr.dev/core/install.ps1 | iex"
> ```
>
> Builds are available for Linux and macOS on x86_64 and aarch64, and Windows on x86_64.
> Linux builds are static. On Windows, templates and quoted shell commands need `sh` on PATH, such as Git for Windows provides.
>
> Run `hc update` to update. Running terminals keep running.

配置文件位置与默认 shell 原文（README Default shell 段）：

> Override it in `~/.config/herdr-core/config.toml` (Windows:
> `%APPDATA%\herdr-core\config.toml`, or `$XDG_CONFIG_HOME/herdr-core/config.toml`
> when set):
>
> ```toml
> shell = ["nu"]
> ```
>
> The list is an executable followed by separate arguments, without extra path
> quoting. It must contain a nonempty executable. Changes apply to the next new
> shell or `keep` recovery, including recovery after a restart; no restart is
> needed. Running terminals, explicit programs, and quoted command lines keep
> their behavior. A bad setting reports a config error; a shell that cannot start
> reports `spawn_failed`. Recovery stays pending and retries, with errors in
> `core.log` (config) or `holder.log` (spawn); it never silently falls back to another shell.

## config.rs 字段定义原文（crates/herdr-core/src/config.rs）

> //! `~/.config/herdr-core/config.toml`. A missing file means defaults.

> #[derive(Deserialize, Default)]
> pub struct Config {
>     /// Executable and arguments for new shells (default: this machine's shell).
>     pub shell: Option<Vec<String>>,
>     /// The chord that detaches `hc attach`: `ctrl+<key>`, default `ctrl+\`.
>     pub detach_key: Option<String>,
>     /// Seconds a `wait` runs before it checks in (default 180).
>     pub wait_timeout: Option<f64>,
>     /// Notes to parent agents and `<hc>` tags on messages between agents, on
>     /// or off (default on). Off: hc types nothing on its own.
>     pub notes: Option<bool>,
>     /// Seconds of quiet before a note (default 3); after Enter or a clear it goes in at once.
>     #[serde(default, deserialize_with = "seconds")]
>     pub notes_quiet: Option<Duration>,
>     /// Seconds an unfinished draft holds sends and notes after the last key (default 60); 0 disables it.
>     #[serde(default, deserialize_with = "seconds")]
>     pub draft_wait: Option<Duration>,
>     /// Size of a terminal nobody is typing in, `COLSxROWS` (default 200x120).
>     pub headless: Option<String>,
>     /// Scrollback kept per live terminal, in MB (default 5).
>     pub history_mb: Option<f64>,
>     /// After a kept program is lost, show its last saved screen above the new shell (default off).
>     pub restore_screen: Option<bool>,
>     /// Where the core listens (default under $XDG_RUNTIME_DIR). `HC_SOCKET` wins.
>     pub socket: Option<String>,
>     /// Seconds another machine gets to answer a call (a wait gets its own
>     /// timeout on top), and to send anything at all before its line is
>     /// given up and dialed again (default 30).
>     pub machine_timeout: Option<f64>,
> }

headless 校验与 detach_key 校验原文：

> spec.split_once('x')
>     .and_then(|(c, r)| Some((c.trim().parse().ok()?, r.trim().parse().ok()?)))
>     .filter(|(c, r): &(u16, u16)| *c > 0 && *r > 0)
>     .ok_or_else(|| invalid(format!("headless {spec:?}: use COLSxROWS, like \"200x120\"")))

> let spec = self.detach_key.as_deref().unwrap_or("ctrl+\\");
> let key = spec.strip_prefix("ctrl+").and_then(|k| {
>     let mut chars = k.chars();
>     let c = chars.next()?.to_ascii_lowercase();
>     (chars.next().is_none() && (c.is_ascii_lowercase() || "@[\\]^_".contains(c))).then_some(c)
> });

投递设置容错原文（delivery 函数）：

> pub fn delivery(path: &Path) -> Config {
>     load(path).unwrap_or_else(|error| {
>         static WARNED: std::sync::Once = std::sync::Once::new();
>         WARNED.call_once(|| eprintln!("core: {}; using delivery defaults", error.message));
>         Config::default()
>     })
> }

## 本机实测输出（Ubuntu 26.04.1 LTS，WSL2，用户 cpf）

安装：

> hc 0.1.21 installed into /home/cpf/.local/bin/herdr-core.
> Agents: hc --skill. People: hc --help.

core 运行验证（在 /home/cpf/code-inside/agc 执行 `hc run --bg --name work` 后）：

> {"address":"t1","agent":"zsh","cwd":"/home/cpf/code-inside/agc","name":"work","state":"live","turn":0}

`/usr/local/bin/hc` 链接与最小 PATH 验证（`sudo ln -sf /home/cpf/.local/bin/herdr-core /usr/local/bin/hc` 后，`env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=$HOME hc --version`）：

> hc 0.1.21

升级实测（用户执行）：

> hc 0.1.21 is up to date (latest release: 0.1.21)

## Tailscale 部署实测输出

安装方式：`curl -fsSL https://tailscale.com/install.sh | sudo sh`，apt 仓库 `https://pkgs.tailscale.com/stable/ubuntu resolute main`，包版本 1.104.7（Ubuntu 26.04 resolute）。

`sudo systemctl enable --now tailscaled` 后 `tailscale status`：

> Logged out.

`sudo tailscale up --ssh --timeout=10m` 打印一次性登录 URL（认证 token 此处省略），用户在浏览器完成认证后命令结束，最后输出：

> Success.

登录后 `tailscale status`：

> <TAILSCALE_IP>   <HOSTNAME>  <USER>@  linux    -
> <TAILSCALE_IP>   <HOSTNAME>  <USER>@  android  offline, last seen 263d ago
> <TAILSCALE_IP>   <HOSTNAME>  <USER>@  windows  offline, last seen 183d ago

`tailscale ip -4`：

> <TAILSCALE_IP>

`sudo tailscale debug prefs` 中：

> "RunSSH": true,

`systemctl cat tailscaled` 关键行：

> EnvironmentFile=/etc/default/tailscaled
> ExecStart=/usr/sbin/tailscaled --state=/var/lib/tailscale/tailscaled.state --socket=/run/tailscale/tailscaled.sock --port=${PORT} $FLAGS

`/etc/default/tailscaled` 全文：

> # Set the port to listen on for incoming VPN packets.
> # Remote nodes will automatically be informed about the new port number,
> # but you might want to configure this in order to set external firewall
> # settings.
> PORT="41641"
>
> # Extra flags you might want to pass to tailscaled.
> FLAGS=""

tailscaled 自启与运行状态：

> systemctl is-enabled tailscaled → enabled
> systemctl is-active tailscaled → active

本机自测 Tailscale SSH（`timeout 25 tailscale ssh <USER>@<TAILSCALE_IP> 'hc --version && hc ls'`）：

> Dial("<TAILSCALE_IP>", 22): dial tcp <TAILSCALE_IP>:22: connect: connection refused
> Connection closed by UNKNOWN port 65535

Tailscale 自身仓库的对应 issue（tailscale/tailscale#11097，标题 "FR: Accept SSH connections from localhost"，状态 OPEN）记录了同样现象：同机 `ssh 100.1.2.3` 得到 `Connection refused`，报告者期望 Tailscale SSH 接受来自本机的连接。来源：https://github.com/tailscale/tailscale/issues/11097

## Tailscale SSH 接管机制（HN 作者说明原文，bradfitz 2022-06-22）

> when enabled on a machine (tailscale up --ssh), the userspace tailscaled process takes over all TCP port 22 packets after the WireGuard decryption and doesn't even feed them into the kernel over TUN. We use gVisor's netstack to handle the TCP connections in-process.

来源：https://news.ycombinator.com/item?id=31838488

## uv-bun 加入 hc update（本机 ~/.local/bin/uv-bun，2026-11-13 修改）

改动四处原文（修改后）：

>   header(3, "self-update (herdr, hc, umans, rtk, plannotator, witr)");

>     ["herdr"], ["hc"], ["umans"], ["rtk", "rtk-ai/rtk"], ["plannotator", "backnotprop/plannotator"],

>   console.log("  upgrade: herdr update && hc update && umans upgrade");

>   if (!available("hc")) console.log("  hc not found, skip");
>   else {
>     console.log("  upgrading hc...");
>     const result = run("hc", ["update"]);
>     lines(result.output);
>     status(result, "hc update");
>   }

`uv-bun --check` 第 3 段实测输出：

> == [3/9] self-update (herdr, hc, umans, rtk, plannotator, witr) ==
> checking self-update tools...
>   herdr:  herdr 0.9.5
>   hc:  hc 0.1.21
>   umans:  umans CLI v0.1.47
>   rtk:  rtk 1.2.0
>   rtk: already latest (1.2.0), skip
>   plannotator:  plannotator 0.28.63
>   plannotator: already latest (0.28.63), skip
>   witr:  witr v0.3.4 (commit 7e46fa68151fd7c59fb7a0cf4247a9a0ac0fbb6e, built 2026-10-04T17:31:44Z)
>   witr: already latest (0.3.4), skip
>   upgrade: herdr update && hc update && umans upgrade

## 本会话查询范围与未确认项

- 未进行手机端连接实测；手机 Herdr App 与 Tailscale 的 Android 侧行为未验证。
- 华为/GMS 兼容性未确认（本 tailnet 的 android 节点离线 263 天，名称已脱敏）。
- `headless` 与 `restore_screen`、`socket`、`machine_timeout` 的运行效果未在本机逐一实测，含义取自源码注释。
- Tailscale SSH 的跨设备验证需另一台在线 tailnet 设备；本会话只有本机在线。
