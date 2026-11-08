# Webtop 移植到 WSL：组件、偏离与原因

> Sources: 本机 wsl-webtop 实施记录与验收报告, 2026-11-07; linuxserver/docker-webtop f33b8d0, 2026-11-07; selkies-layers f573a4c, 2026-11-07; KDE kwin 与 plasma-workspace v6.6.6 源码, 2026-11-07
> Raw: [WSL 原生 KDE Webtop：组件、构建参数与运行证据摘录](../../raw/webtop/2026-11-07-wsl-webtop-architecture-and-evidence.md)
> Updated: 2026-11-07

## Overview

这套部署把 KDE Plasma 桌面装进 WSL 发行版本机运行，再由浏览器通过本机地址访问。它借用了 Webtop 镜像的应用清单、KDE 默认模板与 KWin 补丁来源，运行形态则改为本机原生安装加静态 systemd 用户服务。本文说明画面与输入如何流动、哪些部分与 Webtop 一致、哪些部分为本机环境改写、为什么这样改写，以及验收读数覆盖到哪里。

## 画面与输入怎样流动

1. Selkies 内建 headless Wayland 作为 host，提供嵌套会话所需的显示 socket。
2. 启动器在私有 D-Bus 激活环境中设置本桌面的 `WAYLAND_DISPLAY=wayland-kde` 与私有 `DISPLAY`，随后启动 nested KWin；KWin 保留 Selkies host 环境，用显式 `--wayland-display` 连接 host socket。
3. KWin 负责合成，`plasmashell`、`kded6`、`xembedsniproxy`、`fcitx5`、`wireplumber`、`pipewire` 在同一会话中运行；音频由 Pcmflux 处理，画面编码与传输由 Selkies 与 Pixelflux 承担。
4. 浏览器经 WebSocket 接收画面并回送键盘、鼠标、剪贴板与文件操作；初始尺寸由 KWin 的 `--width`/`--height` 指定。项目未限制浏览器后续调整尺寸，本会话不调用原生 `selkies resize`（该 CLI 走 RandR/X11）；实际输出几何仍待浏览器验收。

这条链路与 Webtop 的显示路线一致，差异集中在会话的启动与隔离方式。

## 与 Webtop 一致的部分

| 项目 | 固定值 |
|---|---|
| 桌面组件与配置基准 | `linuxserver/docker-webtop` 提交 `f33b8d00507028b6a53058c012d39776d9236ac9` 的 KDE 应用、主题与三份 KDE 默认模板 |
| 会话服务 | Selkies `2.2.1`，源码提交 `d6b9351421bd503ffa89bdee78e2bce758b1ffe5`，deb 版本 `2.2.1-1~ubuntu26.04` |
| 画面与音频组件 | Selkies 发布包附带的 Pixelflux `2.2.3` 与 Pcmflux `2.2.1` |
| 补丁来源 | `selkies-layers` 提交 `f573a4c9266dfc8592adec2160e144174ae9907b` 的 `kwin-nested-virtual-output.patch` |
| 中文输入 | Fcitx5，拼音与 `Ctrl+Space` 切换；`profile` 与 `config` 为专用文件 |

补丁只编译 `kwin` 与 `screencast` 两个目标，产物安装到 `/opt/wsl-webtop/kwin/<build_id>/`，供本机复用构建使用。

## 为 WSL 改写的地方

- **原生安装替代镜像安装。** 桌面软件通过 APT 装入 Ubuntu `26.04`，运行用户为 `cpf`，不以 root 运行。镜像里的 `s6` 服务树与 Xvfb 路线没有沿用。
- **私有会话环境。** 项目使用专用 XDG 配置、数据与运行目录，独立 D-Bus 与独立音频会话；原 11 个用户服务与五份原 HOME 配置保持原状。
- **手动初始化替代会话阶段通知。** 手动会话执行普通 `/usr/bin/kcminit` 完成全部模块，不依赖 `plasma-session` 的阶段一通知；上游 `startkde/kcminit/main.cpp` 的普通分支执行 `runModules(-1)` 后结束。
- **项目库选择。** 启动器用 `/lib64/ld-linux-x86-64.so.2 --library-path BUILD /usr/bin/kwin_wayland` 选择项目库，系统 `/usr` 文件保留；`QT_PLUGIN_PATH`、`LD_LIBRARY_PATH` 与官方 `KWIN_FORCE_OWN_QPA=1` 只设在 nested KWin 的环境里。该 flag 是必需的：KWin v6.6.6 的 QPA 工厂在 `applicationFilePath()` 不以 `kwin_wayland` 结尾且未设该变量时返回 `nullptr`。
- **X11 socket 挂载。** 原生 WSL 的 `/tmp/.X11-unix` 可以是只读 tmpfs。启动器先读取完整挂载列表，再为本次会话添加可写 bind mount，从 `X100` 至 `X999` 选 socket；停止时在 inode 仍匹配时删除自己的 socket，顶层仍属于该会话才卸载，并再次核对恢复后的挂载列表。

## 与镜像部署分开的选择及理由

- **补丁按宿主版本构建。** 本机 KWin 为 `4:6.6.6-0ubuntu0.1`、Qt 为 `6.10.2+dfsg-7`，与镜像内固定版本不一定相同。补丁按当前运行版本与 Qt ABI 构建，`build_id=cc7e51eec7324ea4220e`，项目 `libkwin.so.6` 的 SHA-256 为 `d9a4a76e7852416dd0f7a42d0659f60d633e0766f727bf66b1df31ce7ca5ea64`。理由是保留用户已经升级的系统组件，代价是系统更新后需要重新核对 ABI 并重建。
- **安装只装变化项。** 只安装新增、升级或显式同版重装的包，允许的包集合必须完整可满足；拒绝降级、删除、全局 upgrade、autoremove 与 purge，并保留 auto/held 标记。本次 HTTP 维护后 2166 包的完整版本与标记精确不变。
- **生命周期交给 systemd 用户服务。** 使用静态单元按 cgroup 管理整组进程，手动启动、停止与重启，不注册自动启动。这样停止时能核对外部 socket、端口、临时目录与代际进程是否清理完毕。
- **配置按允许键管理。** 配置记录与 `managed.json` 使用 `schema_version=2`，桌面漂移按 `managed_sha256` 判定，全文件 SHA-256 只作元数据；KWin 自动写入的 `[Desktops] Id_1`、`Number`、`Rows` 与 `[Xwayland] Scale` 等未知键保留。

## 验收读数与边界

- 运行身份：`status.status=active`、`phase=ready`、`UnitFileState=static`、`drift=[]`、`doctor.status=ok`、`blockers=[]`；MainPID `3202128`、KWin `3202223`、Plasma `3202345`。
- 运行检查 11 项通过，包含 `/proc/maps` 中的项目库与 `screencast.so`、运行身份、会话 socket、原服务与原配置。访问检查 7 项通过。
- 开发检查：Python 167 项、Bun 24 项，`py_compile`、两份 JavaScript 的 Node 语法检查与已渲染 systemd unit 校验均通过。
- 环境保持：原 11 个服务的身份、五份原配置的 SHA-256/UID/mode、独立终端的代际信息均精确不变。
- 未覆盖：CPU 编码的选择依据没有记录；帧率、延迟与硬件编码对比未测量；浏览器调整尺寸后的实际输出几何未验证；21 项浏览器视觉与交互检查仍待用户执行，实际外观一致性没有结论。

## See Also

- [免登录本机桌面入口的剩余边界](passwordless-loopback-desktop-access.md)
- [Docker Desktop 退出与 WSL2 发行版存活](../wsl-windows/docker-desktop-quit-and-wsl2-lifecycle.md)
