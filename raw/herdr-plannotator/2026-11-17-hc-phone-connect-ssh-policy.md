# herdr-core 手机接入排障：hc 运行形态与 Tailscale SSH policy

> Source: 本机会话命令输出, 2026-11-17; tailscale/tailscale 与 herdrdev/herdr-core 源码摘录, 2026-11-17
> Collected: 2026-11-17
> Published: Unknown

## 背景

用户询问 `hc` 是否在运行、是否配置了开机自启，随后报告手机 Herdr App 无法连接 WSL 内的 herdr-core。

环境：Ubuntu 26.04.1 LTS，WSL2，hc 0.1.21，tailscaled 1.104.7，systemd user manager，`Linger=yes`。

## 进程与启动形态

`pgrep -a herdr-core`：

```
369472 /home/<USER>/.local/bin/herdr-core serve
369478 /home/<USER>/.local/bin/herdr-core hold --socket /run/user/1000/herdr-core/default.holder.60102e78.sock
```

`hc server status`：

```json
{"core":{"id":"55463edd4ecf5674319a7791cdae4b9e","name":"<HOSTNAME>"},"finished":0,"holder":{"current":true,"instance":"12e683ca07b9b3265d1f03067ae45590","pid":369478,"terminals":1},"holders":[{"current":true,"instance":"12e683ca07b9b3265d1f03067ae45590","pid":369478,"terminals":1}],"installed_by":null,"keeps_running_after_logout":true,"live":1,"logout_linger_user":"<USER>","pid":369472,"uptime_ms":120054367,"version":"0.1.21"}
```

`systemctl --user status hc-serve-c6826a1b.service`：

```
● hc-serve-c6826a1b.service - [systemd-run] /home/<USER>/.local/bin/herdr-core serve
     Loaded: loaded (/run/user/1000/systemd/transient/hc-serve-c6826a1b.service; transient)
  Transient: yes
     Active: active (running) since Fri 2026-11-13 22:03:44 CST; 3 days ago
   Main PID: 369472 (herdr-core)
      Tasks: 4 (limit: 19178)
     Memory: 1.6M (peak: 7.7M, swap: 492K, swap peak: 636K)
        CPU: 1min 17.645s
```

transient unit 文件头：

```
# This is a transient unit file, created programmatically via the systemd API. Do not edit.
[Unit]
Description=[systemd-run] /home/<USER>/.local/bin/herdr-core serve
```

`hc-hold-78e2a145.service` 运行 `/home/<USER>/.local/bin/herdr-core hold --socket /run/user/1000/herdr-core/default.holder.60102e78.sock`；`hc-shutdown-8a7d5a97664ec1b7.service` 状态为 exited。

## installed_by 语义（herdr-core 源码）

`crates/herdr-core/src/client.rs` 的 `installed_by` 注释：

```rust
/// The package manager this hc came from, or "system package manager" as a
/// compatibility marker when its folder isn't writable. None for a replaceable install.
pub fn installed_by() -> Option<&'static str> {
```

识别逻辑按二进制路径匹配三个包管理器前缀：

```rust
fn manager_of(path: &str) -> Option<&'static str> {
    [("/Cellar/", "homebrew"), ("/nix/store/", "nix"), ("/mise/installs/", "mise")]
        .into_iter()
        .find(|(mark, _)| path.contains(mark))
        .map(|(_, manager)| manager)
}
```

同文件的测试 `the_package_manager_is_read_from_the_path`：

```rust
assert_eq!(manager_of("/opt/homebrew/Cellar/herdr-core/0.2.0/bin/herdr-core"), Some("homebrew"));
assert_eq!(manager_of("/nix/store/abc-herdr-core/bin/herdr-core"), Some("nix"));
assert_eq!(manager_of("/home/me/.local/share/mise/installs/herdr-core/0.2.0/herdr-core"), Some("mise"));
assert_eq!(manager_of("/home/me/.local/bin/herdr-core"), None);
```

本机二进制位于 `/home/<USER>/.local/bin/herdr-core`，对应最后一条断言，`installed_by` 为 `null` 表示普通可替换安装，与是否作为持久服务运行无关。源码按 GitHub `herdrdev/herdr-core` master 读取，2026-11-17。

## 自启检查

`~/.config/systemd/user/` 内容：`default.target.wants/`、`timers.target.wants/`、`code-serve-web.service`、`mem-ledger-watcher.service`、`opentoken.service`、`opentoken.timer`、`sip.service`、`tern-daemon.service`、`tern-web.service`、`wsl-webtop.service`。

`default.target.wants/` 只有 code-serve-web、mem-ledger-watcher、sip、tern-daemon、tern-web 五个链接。

`grep -rlE 'herdr-core' ~/.config/systemd/user/` 无输出；`~/.zshrc`、`~/.bashrc`、`~/.profile`、`~/.zprofile` 中 `herdr-core|\bhc (serve|server)` 无命中。

`hc server --help` 子命令只有 start、stop、status、restart、help，没有安装自启的入口。

`loginctl show-user <USER> -p Linger` 输出 `Linger=yes`。

## procs 观察误差

`procs hc|cat` 只列出 procs 自己的命令行：

```
2505683 <USER> │ pts/35 0.0 0.0 00:00:00 │ /usr/bin/zsh -l -i -c procs hc|cat;procs hc|cat
```

`procs tail|cat` 同时列出 tailscaled 与 procs 自身，说明按命令行子串匹配。

## 手机连接日志

`tailscale status` 中在线节点（2026-11-17 00:44 前后）：

```
<TAILSCALE_IP>   <HOSTNAME>-1    <USER>@  linux    -
<PHONE_IP>       <PHONE>-1       <USER>@  android  idle, tx 57496 rx 50032
```

tailscaled 日志从 2026-11-17 00:46:03 到 00:57:49 反复出现同类记录：

```
Nov 17 00:46:03 <HOSTNAME> tailscaled[379093]: ssh-conn-20261116T164602-bf00569d42: handling conn: <PHONE_IP>:40350-><USER>@<TAILSCALE_IP>:22
Nov 17 00:46:49 <HOSTNAME> tailscaled[379093]: ssh-conn-20261116T164648-d324f2445a: handling conn: <PHONE_IP>:35526-><USER>@<TAILSCALE_IP>:22
Nov 17 00:48:22 <HOSTNAME> tailscaled[379093]: ssh-conn-20261116T164821-0abd499017: handling conn: <PHONE_IP>:39438-><USER>@<TAILSCALE_IP>:22
Nov 17 00:48:31 <HOSTNAME> tailscaled[379093]: ssh-conn-20261116T164829-3716184c0c: handling conn: <PHONE_IP>:35658-><USER>@<TAILSCALE_IP>:22
Nov 17 00:49:08 <HOSTNAME> tailscaled[379093]: ssh-conn-20261116T164907-a4640e5123: handling conn: <PHONE_IP>:47052-><USER>@<TAILSCALE_IP>:22
Nov 17 00:50:18 <HOSTNAME> tailscaled[379093]: ssh-conn-20261116T165018-9f9b2e2ae5: handling conn: <PHONE_IP>:45226-><USER>@<TAILSCALE_IP>:22
Nov 17 00:51:03 <HOSTNAME> tailscaled[379093]: ssh-conn-20261116T165103-e095c5755a: handling conn: <PHONE_IP>:50764-><USER>@<TAILSCALE_IP>:22
Nov 17 00:51:35 <HOSTNAME> tailscaled[379093]: ssh-conn-20261116T165135-b3acfb9db8: handling conn: <PHONE_IP>:48054-><USER>@<TAILSCALE_IP>:22
Nov 17 00:53:24 <HOSTNAME> tailscaled[379093]: ssh-conn-20261116T165324-86297926f5: handling conn: <PHONE_IP>:46864-><USER>@<TAILSCALE_IP>:22
Nov 17 00:55:11 <HOSTNAME> tailscaled[379093]: ssh-conn-20261116T165511-24580b49a0: handling conn: <PHONE_IP>:54896-><USER>@<TAILSCALE_IP>:22
Nov 17 00:57:49 <HOSTNAME> tailscaled[379093]: ssh-conn-20261116T165749-f0a6833296: handling conn: <PHONE_IP>:51220-><USER>@<TAILSCALE_IP>:22
```

每条 `handling conn` 之后没有认证成功或拒绝记录，随后出现新的连接。

## 修改前的 SSH 策略

`sudo tailscale debug netmap | jq '.SSHPolicy'`：

```json
{
  "rules": [
    {
      "action": {
        "holdAndDelegate": "https://unused/machine/ssh/action/$SRC_NODE_ID/to/$DST_NODE_ID?local_user=$LOCAL_USER"
      },
      "principals": [
        {"nodeIP": "<TAILSCALE_IP>"},
        {"nodeIP": "<PHONE_IP>"}
      ],
      "sshUsers": {
        "*": "=",
        "0": "",
        "root": "root"
      }
    }
  ]
}
```

principals 实际包含 8 个 nodeIP，覆盖 IPv4 与 IPv6。

## Tailscale 源码语义

`tailcfg/tailcfg.go` 对 `SSHAction.HoldAndDelegate` 的注释：

> HoldAndDelegate, if non-empty, is a URL that serves an outcome verdict. The connection will be accepted and will block until the provided long-polling URL serves a new SSHAction JSON value.

`ssh/tailssh/tailssh.go` 第 392 行附近：

```go
case action.HoldAndDelegate != "":
    if action.Message != "" {
        if err := c.spac.SendAuthBanner(action.Message); err != nil {
            return nil, c.errUnexpected(fmt.Errorf("error sending hold and delegate message: %w", err))
        }
    }
    url := action.HoldAndDelegate
```

`tailcfg/tailcfg.go` 对 `Accept` 的注释：

> Accept, if true, accepts the connection immediately without further prompts.

headscale 测试 `hscontrol/policy/v2/filter_test.go` 对 check 规则的断言：

```go
assert.False(t, rule.Action.Accept)
assert.False(t, rule.Action.Reject)
assert.NotEmpty(t, rule.Action.HoldAndDelegate)
```

## 系统 sshd 状态

`dpkg -l | grep openssh-server` 无输出；`systemctl is-active ssh sshd` 均为 inactive；`ss -ltn | grep ':22 '` 无输出。

本机自测 `ssh <USER>@<TAILSCALE_IP>` 返回 `Connection refused`，对应 tailscale/tailscale#11097 的本机回环限制。

## 修改后的策略验证

用户在管理台给 policy 增加 `ssh` 段后，本机验证：

```bash
sudo tailscale debug netmap | jq '.SSHPolicy.rules[].action'
```

输出：

```json
{
  "accept": true,
  "allowAgentForwarding": true,
  "allowLocalPortForwarding": true,
  "allowRemotePortForwarding": true
}
```

## 未核实

- Herdr App 的内部重试周期与是否在界面展示授权 URL。
- policy 放行后手机端到端连接结果。
