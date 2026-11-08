# WSL 原生 KDE Webtop：组件、构建参数与运行证据摘录

- Source: /home/cpf/code-inside/wsl-webtop/manifest.json ; /home/cpf/code-inside/wsl-webtop/README.md ; /home/cpf/code-inside/wsl-webtop/docs/plan.md ; /home/cpf/code-inside/wsl-webtop/docs/desktop-parity.md ; /home/cpf/code-inside/wsl-webtop/docs/maintenance.md ; /home/cpf/code-inside/wsl-webtop/scripts/desktop-session.py ; /home/cpf/.local/state/wsl-webtop/verify/http-cutover-summary.json
- Collected: 2026-11-07
- Published: Unknown（本机实施记录）

## 目标环境与固定上游（manifest.json 摘录）

```json
"selkies": {"version": "2.2.1", "repo": "selkies-project/selkies", "source_commit": "d6b9351421bd503ffa89bdee78e2bce758b1ffe5"},
"pixelflux": {"version": "2.2.3", "repo": "selkies-project/pixelflux", "source_commit": "5c78910e524539a2b801433303ee61dd04f42a51"},
"pcmflux": {"version": "2.2.1", "repo": "selkies-project/pcmflux", "source_commit": "d7917e9bb1689e2d7ad2f745a112b48e1b9d833f"}
```

- Selkies deb：`selkies-2.2.1-ubuntu26.04-amd64.deb`，Debian 版本 `2.2.1-1~ubuntu26.04`，SHA-256 `69e0f7412c6b8eb34d1b1df916a3f870219595ad47600343077d44d6e0430490`，要求 GitHub provenance。
- Webtop 配置基准：`linuxserver/docker-webtop` 提交 `f33b8d00507028b6a53058c012d39776d9236ac9`。
- KWin 补丁参考：`linuxserver/selkies-layers` 提交 `f573a4c9266dfc8592adec2160e144174ae9907b`，补丁 `kwin-nested-virtual-output.patch`，SHA-256 `50a1a48eb2963a1beb3c6baf679ab502043ad1e11c3d2866a4f0026a1c832f9e`；`targets` 为 `["kwin", "screencast"]`，`prefix` 为 `/opt/wsl-webtop`。
- 目标平台（docs/plan.md）：Ubuntu `26.04`、`amd64`；图形运行用户 `cpf`，不以 root 运行。

## 本机 KWin 与 Qt 版本（构建记录）

- KWin 运行版本 `4:6.6.6-0ubuntu0.1`；Qt 运行版本 `6.10.2+dfsg-7`（`qt_base_version`）。
- `~/.local/state/wsl-webtop/kwin-build.json` 的 `build_id=cc7e51eec7324ea4220e`，关联 `receipts/20261107T125058-90fa88ebbeec.json` 为 `operation=build_kwin`、`status=complete`。
- 项目 `libkwin.so.6` 路径 `/opt/wsl-webtop/kwin/cc7e51eec7324ea4220e/usr/lib/x86_64-linux-gnu/libkwin.so.6`，SHA-256 `d9a4a76e7852416dd0f7a42d0659f60d633e0766f727bf66b1df31ce7ca5ea64`。
- 早期安装记录 `receipts/20261107T122739-a9aed8f9f495.json`：`operation=install`、`status=complete`，245 项实际包变更。

## 会话组成与启动顺序（README 与 desktop-session.py）

- 私有 D-Bus 的激活环境在 nested KWin 启动前更新一次，提供 `WAYLAND_DISPLAY=wayland-kde` 与私有 `DISPLAY=:<private>`；更新只针对私有总线，不使用 `--systemd`，不向原用户 systemd 管理器导入桌面环境。
- KWin 保留 Selkies host 环境，以显式 `--wayland-display=<Selkies host socket>` 连接 host socket。
- 启动方式：`/lib64/ld-linux-x86-64.so.2 --library-path BUILD /usr/bin/kwin_wayland`，`BUILD` 取构建记录的 `libdir`；系统 `/usr` 文件保留。
- `kwin_env` 只对 nested KWin 设置 `QT_PLUGIN_PATH`、`LD_LIBRARY_PATH` 与官方 `KWIN_FORCE_OWN_QPA=1`，其他桌面应用接收原会话环境。
- 依据（KDE/kwin v6.6.6 `src/plugins/qpa/main.cpp` 第 25–27 行）：`QCoreApplication::applicationFilePath()` 不以 `kwin_wayland` 结尾且未设置 `KWIN_FORCE_OWN_QPA` 时，工厂返回 `nullptr`。
- 实际加载证明来自 `/proc/<kwin_pid>/maps`：最终 KWin PID `3202223` 已确认加载项目目录下的 `libkwin.so.6` 与 `screencast.so`。
- 手动会话在项目私有环境执行 `/usr/bin/kcminit` 完成全部模块初始化，不依赖 `plasma-session` 的阶段一通知。依据（plasma-workspace v6.6.6 `startkde/kcminit/main.cpp`）：普通 `kcminit` 分支执行 `runModules(-1)` 后结束；`kcminit_startup` 分支执行 `runModules(0)`、`sendReady` 并等待 `runPhase1`，最多 300 秒。
- 会话进程集合包含 `kwin_wayland`、`plasmashell`、`fcitx5`、`wireplumber`、`pipewire`、`pipewire-pulse`，不启动 `startplasma-wayland`。

## WSL 原生 X11 socket 挂载（desktop-parity.md 第 139–149 行）

- 原生 WSL 的 `/tmp/.X11-unix` 可以是只读 tmpfs。启动器用 `findmnt --json -T /tmp/.X11-unix` 读取完整挂载列表，保存每层 `target/source/fstype/options`；target 必须精确匹配，各层必须是 tmpfs。
- 会话在独立 runtime 下创建权限 `0700` 的唯一 `session-…/X11` 目录，通过 `sudo -n /usr/bin/mount --bind PRIVATE /tmp/.X11-unix` 添加自己的顶层；随后确认新顶层可写、source 匹配且其余挂载列表与原始快照一致，再从 `X100` 至 `X999` 选择 socket。
- SIGTERM、启动失败与桌面子进程退出进入同一 `finally`：先停项目子进程，再关闭 listener，仅在 inode 仍匹配时删除自己的 socket；顶层仍属于该会话才执行 `sudo -n /usr/bin/umount /tmp/.X11-unix`；恢复后再次核对完整原始列表。
- 无法确认恢复时保留私有源目录并记录 `runtime_preserved_for_mount_recovery`，不把请求 stop 当成成功。

## 最终运行身份与环境保持（http-cutover-summary.json）

```json
"status": {"address": "http://localhost:8080", "config": {"bind": "127.0.0.1", "desktop": "wayland", "port": 8080, "resolution": "1920x1080", "schema_version": 1, "transport": "websocket", "use_cpu": true}, "desktop_health": {"kwin_pid": 3202223, "main_pid": 3202128, "phase": "ready", "plasma_pid": 3202345}, "drift": []}
"original_environment": {"configuration_files": 5, "identities_exact": true, "independent_terminal_same_generation": true, "units": 11}
"packages": {"count": 2166, "downgraded": [], "removed": [], "versions_auto_held_exact": true}
```

- 运行目录 `/run/user/1000/wsl-webtop/session-_3jdpjnr`；配置 `/home/cpf/.config/wsl-webtop`；仓库 `/home/cpf/code-inside/wsl-webtop`。
- 原 11 个用户服务的 InvocationID/MainPID/ActiveState、五份原 HOME 配置的 SHA-256/UID/mode、独立终端的 PID/start_ticks/uid/boot_id/tty 均精确不变；原 `managed.json` 基线未改变。

## 开发检查读数（summary.development）

```json
{"browser_tests": 24, "deployed_systemd_unit": "passed", "final_gate_wall_seconds": 75.73, "final_union_gate": "passed", "node_syntax": "passed", "observed_pre_documentation_python_seconds": 54.162, "python_compile": "passed", "python_seconds": 75.209, "python_tests": 167}
```

- systemd 校验对象 `/home/cpf/.config/systemd/user/wsl-webtop.service`，命令 `systemd-analyze --user verify`。
- 运行检查 11 项：`independent_parent`、`loaded_kwin`、`loopback_endpoint`、`manual_unit`、`original_configuration`、`original_units`、`project_processes`、`runtime_marker`、`session_sockets`、`stable_project_generations`、`unit_resources`，报告 `verify/http-cutover-final-running/report.json` 状态 `passed`。

## 未记录与未测量

- CPU 编码（`use_cpu: true`）的选择依据未在会话与文档中记录。
- 帧率、端到端延迟、硬件编码对比未测量。
- 21 项用户目视检查（`visual.user_checks = 21`、`visual.status = "awaiting_user"`、`visual.agent_gui = "not_run"`）未执行，视觉效果与交互一致性没有实测结论。

## 尺寸与 resize 的决策记录（decisions.tsv 第 11–12 行）

```text
2026-11-07	嵌套 KWin 初始尺寸通过 --width/--height 设置，--wayland-display 指向 Selkies host socket；不限制浏览器后续 resize	KWin v6.6.6 src/main_wayland.cpp 初始化 nested 输出宽高；运行几何需浏览器验收
2026-11-07	本 Wayland 会话不调用原生 selkies resize CLI	Selkies 2.2.1 commands.py 将 resize 交给 display_utils.py；其 CLI 描述为 X display，实现使用 RandR/X11
```
