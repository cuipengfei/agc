# 免登录本机桌面入口：去掉认证与 TLS 之后剩下什么边界

> Sources: 本机 wsl-webtop 实施记录、验收报告与拒绝试验, 2026-11-07; selkies-project/selkies 2.2.1 源码 d6b9351, 2026-11-07
> Raw: [Webtop 免登录 HTTP 改造：动作顺序、实际返回与拒绝边界](../../raw/webtop/2026-11-07-webtop-passwordless-http-cutover.md)
> Updated: 2026-11-07

## Overview

把浏览器访问的 Linux 桌面改成免登录，靠三件事同时成立：桌面服务只监听回环地址、服务端关闭认证与传输加密、运行配置不再携带任何凭据字段。三项都到位后，剩下的唯一访问控制是地址本身。本文说明每项的实际做法、仍然有效的防护、已经失去的防护，以及维护与验收时需要遵守的约束。

## 入口成立的三个条件

| 条件 | 实际做法 |
|---|---|
| 只监听回环 | profile 的 `bind=127.0.0.1`、`port=8080`；`status` 报告只显示一个 IPv4 回环 listener，地址十六进制 `0100007F` |
| 服务端关闭认证与加密 | Selkies 启动参数显式 `--enable-https=false`、`--enable-basic-auth=false`；不传证书参数，不设 Basic Auth 环境变量 |
| 配置不再携带凭据字段 | 运行 profile 精确七个字段：`schema_version`、`port`、`bind`、`desktop`、`transport`、`use_cpu`、`resolution`，`schema_version=1`；用户名与认证开关字段删除 |

三项之外的配套动作：旧项目生成的 `auth.json`、`server.key`、`server.crt` 与空 `private/` 目录删除，只读文件类型与所有者元数据，未读取内容；配置模式删去 `private` 路径成员，入口无需拼接凭据路径。

## 仍然有效的防护

- **操作系统账户与文件权限。** 桌面以普通用户 `cpf` 运行，不以 root 运行。浏览器能看到的文件范围取决于该账户的权限，跨账户与系统路径仍受内核检查。
- **回环监听。** 服务不绑定 `0.0.0.0`，其他机器不能直接连到 8080；从 Windows 侧访问依赖 WSL 的本地转发，本次未测量其他机器的可达性。
- **维护时的目标校验。** `restore` 在任何停止、写入或软件包准备之前验证目标记录中的 profile 必须精确符合当前七字段形态。含认证字段的旧记录被拒绝，服务状态、文件快照、`managed.json`、记录目录修改时间与 2166 包均未变化。
- **软件来源校验不变。** 远端 GitHub 与 APT 发布、源码下载继续使用 HTTPS，校验 SHA-256、公钥指纹与 provenance；入口免登录不影响来源校验路径。

## 已经失去的防护

- **网络层认证。** 没有用户名、密码或令牌，任何能连上该地址的客户端都被视作同一身份。
- **传输加密。** 握手不进行 TLS；实测对该端口发起 TLS 会被 OpenSSL 以 `RECORD_LAYER_FAILURE` 拒绝。同一台机器上的抓包与内存读取都能看到明文流量。
- **可区分的远程主体。** 服务端无法区分是本机用户、本机其他用户的进程还是本地转发进来的外部客户端；日志里没有可用于追责的身份字段。

## 维护与验收约束

- **拒绝先行。** 恢复与升级先校验目标 profile，再决定是否停止服务。校验失败时不得留下半停状态，也不得为了兼容旧记录添加转换层。
- **缺失读数保留为空。** 停止后 systemd 不再提供 `MemoryCurrent` 与 `CPUUsageNSec`，报告中两项为 `null`，`unit_resources` 记为 `not_run`，整体状态记为 `blocked`。把缺失读数写成 0 或宣布整体通过都不成立；必要清理的 9 项单独记为 `passed`。
- **验收要求真实成功。** 根页面 `200`、文件 JSON 与索引、上传字节数、下载完整字节与 SHA-256、WebSocket handshake 与 `MODE` 各自取正面证据；`401`、错路由 `404` 与仅端口连通都不算通过，也不再把缺失认证的负面请求列为要求。
- **只有本机进程可获得桌面。** 这是该选择的核心代价：能连 `127.0.0.1:8080` 的本机进程既可驱动桌面，也可读写该用户可见的文件。

## 实测证据

- 访问检查 7 项 `passed`：`desktop_http`、`download_http`、`files_index_http`、`listing_http`、`loopback_endpoint`、`upload_http`、`websocket_http`。
- Windows PowerShell 匿名请求：`200`，HTML 与 script 为真，`WWW-Authenticate` 缺席；TLS 尝试被 `RECORD_LAYER_FAILURE` 拒绝。
- 生命周期：停止耗时 0.298 秒，`residual_pids=[]`、`listeners=[]`；重启后 MainPID 变化、地址不变；从 Windows 让服务由 `inactive` 启动为 `ready`，未重启 WSL。
- 记录：apply 完整配置记录 `20261107T145751-b85ca9ba6fdb`（`changed_files=[]`）、当前配置恢复记录 `20261107T150052-33ec99b2fdbc`、被拒绝的旧记录 `20261107T140937-ff2e1c9b272a`。

## See Also

- [Webtop 移植到 WSL：组件、偏离与原因](webtop-on-wsl-architecture.md)
- [WSL2 内存与 swap 配置](../wsl-windows/wsl2-memory-and-swap-config.md)
