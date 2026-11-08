# Webtop 免登录 HTTP 改造：动作顺序、实际返回与拒绝边界

- Source: 本机会话操作记录 2026-11-07 ; /home/cpf/.local/state/wsl-webtop/verify/http-cutover-summary.json ; /home/cpf/.local/state/wsl-webtop/verify/http-cutover-final-access/report.json ; /home/cpf/.local/state/wsl-webtop/verify/http-cutover-final-running/report.json ; /home/cpf/.local/state/wsl-webtop/verify/http-cutover-stopped/report.json ; /home/cpf/code-inside/wsl-webtop/decisions.tsv ; /home/cpf/code-inside/wsl-webtop/README.md
- Collected: 2026-11-07
- Published: Unknown（本机实施记录）

## 用户要求（会话原文）

> do, no pwd, no basic auth needed, no https, do it

## 动作顺序与每步实际结果

| 顺序 | 动作 | 实际结果 |
|---|---|---|
| 1 | 停止旧 HTTPS 运行，取得停止前证据 | 停止前报告 `verify/http-cutover-running/report.json`；该报告作为 later stop 的不可变 before 保留，不覆盖 |
| 2 | 将运行 profile 迁到七字段并更新 `managed.json` 的 profile 内容与 SHA-256 | profile 字段为 `schema_version`、`port`、`bind`、`desktop`、`transport`、`use_cpu`、`resolution`；`schema_version=1`；`bind=127.0.0.1`；两个文件权限 `0600`；原 `managed.json` 基线未改变 |
| 3 | 删除旧项目生成的 `auth.json`、`server.key`、`server.crt` 与空 `private/` 目录 | 只读文件类型与所有者元数据；删除后三个文件与目录均不存在；内容未读取 |
| 4 | `apply` 与 `start` | apply 完整配置记录 `20261107T145751-b85ca9ba6fdb`，`changed_files=[]`；2166 包完整版本与 auto/held 标记精确不变；start 返回 ready |
| 5 | 真实匿名 HTTP 访问与运行检查 | 访问报告 7 项 `passed`；运行报告 11 项 `passed` |
| 6 | 旧含认证字段配置记录的恢复尝试 | 在任何 stop、写入或软件包准备前被拒绝（`unsupported profile fields or schema`）；服务状态、文件快照、`managed.json`、记录目录 mtime、2166 包均未变化；目标记录 `20261107T140937-ff2e1c9b272a` 保持原样 |
| 7 | 当前七字段配置记录的恢复 | 完整记录 `20261107T150052-33ec99b2fdbc`，状态 `complete`；自身文件快照、原基线与软件包不变 |
| 8 | HTTP `stop` 与停止后检查 | 停止耗时 0.298 秒，`cleanup_verified=true`，`residual_pids=[]`、`listeners=[]`；停止报告整体 `blocked` |
| 9 | 从 Windows 启动手动入口 | `wsl.exe` 只查运行中发行版，`Ubuntu` 已在运行；仓库 device/inode 两侧一致；服务从 `inactive` 起动为 `ready`、`UnitFileState=static`；未执行 WSL 重启，未启动其他发行版，未运行 Chrome |
| 10 | `restart` | 返回 `ready`，新 MainPID 与上一次不同，地址仍为 `http://localhost:8080` |
| 11 | Windows 侧匿名 HTTP 与 TLS 探测 | PowerShell `Invoke-WebRequest` 返回 `200`，HTML 与 script 均为真，`WWW-Authenticate` 缺席；TLS 握手被 OpenSSL 以 `RECORD_LAYER_FAILURE` 拒绝 |
| 12 | 最终运行与访问报告 | `verify/http-cutover-final-running/report.json` 与 `verify/http-cutover-final-access/report.json` 均 `passed`；`drift=[]`、`doctor.status=ok`、`blockers=[]`；MainPID `3202128`、KWin `3202223`、Plasma `3202345` |
| 13 | 文档更新与最终联合门禁 | README、`docs/` 与 `decisions.tsv` 更新；联合门禁 Python 167 项（75.209 秒，wall 75.73 秒）、Bun 24 项、`py_compile`、两份 JavaScript `node --check`、已渲染 systemd unit 校验均通过 |

## 访问检查的 7 个名称（final-access report）

`desktop_http`、`download_http`、`files_index_http`、`listing_http`、`loopback_endpoint`、`upload_http`、`websocket_http`，整体 `passed`。

维护记录对这些入口的要求：根页面 `200`、正确文件 JSON 与索引、上传成功与准确 bytes、下载完整字节及 SHA-256、完整 WS handshake 与 MODE；`401`、错路由 `404` 或仅端口连通不能算覆盖成功，也不再把缺失认证的负面请求作为要求。工具上传随机名公开验证文本，不删除用户文件；公开 fixture 留在 file manager 中。

## 停止检查的实际结果（stopped report）

```json
{"cgroup_empty":"passed","endpoint_closed":"passed","external_display_sockets_removed":"passed","independent_parent":"passed","original_configuration":"passed","original_units":"passed","project_generations_exited":"passed","temporary_runtime_removed":"passed","unit_resources":"not_run","unit_stopped":"passed"}
```

- 整体 `status` 为 `blocked`；9 项必要清理 `passed`，`unit_resources` 为 `not_run`。
- `memory_bytes_after` 与 `cpu_nanoseconds_after` 均为 `null`：停服务后 systemd 不再提供这两个读数。

## 保留的安全与维护行为

- 远端 GitHub 与 APT 发布、源码下载继续使用清单声明的 HTTPS 来源，校验 SHA-256、公钥指纹与 provenance；本机入口免登录不改变软件来源校验。
- 版本只允许新增、升级或显式同版重装；拒绝降级、删除、全局 upgrade、autoremove 与 purge。
- 配置记录与 `managed.json` 使用 `schema_version=2`，与运行 profile 的 `schema_version=1` 区分；回到旧认证字段形态的记录不提供转换或兼容层。
- manual-only：静态用户服务不注册自动启动；停止、重启与恢复均由显式命令触发。

## 边界

- 唯一残留的访问控制是回环监听：能连 `127.0.0.1:8080` 的本机进程可驱动桌面并访问文件。
- 浏览器端的 21 项视觉与交互检查仍待用户执行，本轮没有运行浏览器自动化或图形验收。
