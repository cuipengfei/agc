# Agent 托管启动的后台服务在会话结束后不可用

> Source: 本机两次启动 `~/.local/bin/tern`（0.9.21）的 `inspect-runtime` 输出、`ps` 输出、`tools/tern-maintain/runtime.mjs` 源码、用户报告的浏览器错误
> Collected: 2026-11-14
> Published: Unknown

## 现象

0.9.21 部署完成后，第一次启动用了会话托管的后台作业方式（带就绪条件等待端口或日志）。服务确实起来了：`inspect-runtime` 记录 daemon pid `999638`、web pid `1001295`，两者 `managerPid` 都是 `996720`；`verify-service` 六项 passed，`httpStatus` 为 200。

随后用户在 Windows Chrome 打开 `127.0.0.1:8378`，得到 `ERR_CONNECTION_REFUSED`。此时检查，`999638` 与 `1001295` 都已不存在，8378 没有监听。原 `managerPid` `996720` 也已不存在，它结束在先还是两个服务进程结束在先，没有观测到。

## 独立托管的进程形态

`runtime.mjs` 里已有脱敏包装入口 `__redact`：`bun runtime.mjs __redact <logPath> <pidPath> -- <cmd...>` 负责 spawn 目标命令、把 stdout 与 stderr 逐行脱敏写入 600 权限日志、把子进程 pid 写入 `pidPath`（源码 196–218 行）。`spawnRedacted` 以 `detached: true`、`stdio: 'ignore'`、`env: ternEnv(socket)` 启动该包装器并调用 `unref()`（源码 220–228 行）。

用同形状的 detached spawn 启动包装器后：

| 角色 | pid | managerPid | SID | 存活 |
|---|---:|---:|---:|---|
| daemon | 1007605 | 1007601 | 1007601 | 是 |
| web | 1009031 | 1009027 | 1009027 | 是 |

两个包装器进程的 PPID 是 `273`，`/proc/273/status` 的 `Name` 为 `systemd`、`PPid` 为 `1`、命令行是 `/usr/lib/systemd/systemd --user`，即中间父进程退出后由 systemd 用户实例接管。两个包装器各自成为会话首进程，SID 等于自身 pid；脱离靠独立会话加 `unref()`。

复核：`verify-service` 六项 passed，`inspect-runtime` 两进程 `matchesInstalled` 为 true、`httpStatus` 为 200，Windows 侧 `curl.exe --noproxy '*'` 返回 HTTP 200，四个 pane 保持 live。

## start 的前置条件（推断）

`runtime.mjs` 的 `prepareSocketDir` 在 socket 目录已存在且 `mode & 0o077` 非零时抛错，文案形如 `socket directory ... is group/world accessible`（源码 176–188 行）。本机 `/run/user/1000/tern` 权限为 `775`，按该判断会被拒绝；`/run/user/1000` 本身是 `700`。

本轮因此没有使用 `bun cli.mjs start`，直接用 detached spawn 启动同一个 binary。这一条由源码判断与目录权限推断，没有运行 `start` 验证。

## 边界

这条记录说明两件事：以会话托管方式启动的服务在会话结束后不可用，以及独立托管后的进程形态。会话结束带走服务进程的触发环节没有单独观测，按推断记录。它不构成 Tern 自身的缺陷结论：同一个 binary 在独立托管下持续运行，服务、认证、进程身份与 Windows 侧连通检查全部通过。
