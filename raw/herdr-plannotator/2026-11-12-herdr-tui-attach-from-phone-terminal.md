# 本机 Herdr TUI 默认会话与指定会话的接入命令

> Source: 用户在当前会话提供的本机 `herdr --help` 输出
> Collected: 2026-11-12
> Published: Unknown

以下保留与接入会话有关的原文。用户执行的命令为 `herdr --help`；本次整理没有再次运行该命令，也没有从输出确认具体版本号。

这份输出采集于 2026-11-12。

```text
fuckherdr — terminal workspace manager for AI coding agents

Usage: herdr [options]
       herdr --session <name> [options]
       herdr --machine <label-or-id> <command>
       herdr --remote <ssh-target> [--session <name>]
       herdr session attach <name>
```

```text
Common commands:
  herdr                            Launch or attach to the persistent session
  herdr session <subcommand>       Manage named persistent sessions
```

```text
Options:
  --session <name>    Use or create a named persistent session
  --remote <target>   Attach through SSH to a remote Herdr server
```

上述帮助输出没有列出 `herdr attach` 子命令；`herdr session attach <name>` 是指定会话的命令。
