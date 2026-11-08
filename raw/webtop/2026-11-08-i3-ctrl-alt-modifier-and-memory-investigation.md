# i3 Ctrl Alt modifier 修改与 Selkies 内存归因调查摘录

> Source: 本机 wsl-webtop 会话调查（bd 事项 wsl-webtop-8tw 记录全文 + config/i3 生成配置修改 + 只读 /proc 内存映射 + 官方 Selkies 2.2.1 / Pixelflux 2.2.3 源码摘录）；https://github.com/selkies-project/selkies/blob/d6b9351421bd503ffa89bdee78e2bce758b1ffe5/ 与 https://github.com/selkies-project/pixelflux/blob/2.2.3/
> Collected: 2026-11-08
> Published: Unknown

本文是原始材料摘录。来源逐块标注：bd 记录（本机事项）、配置实况（持久文件与 capture 收据）、只读进程内存（`/proc`）、源码摘录（上游精确版本）、会话验证（测试/doctor/HTTP 结果）。identifier 与代码一律保持英文原名。

## 事项与总状态（bd 记录）

issue `wsl-webtop-8tw`「窗口模式 Ctrl Alt 快捷键与 Selkies 内存调查」：P1 task，创建并开始于 2026-11-08，现已 CLOSED。CLOSE REASON 原文：

> CtrlAlt键盘和Alt鼠标已应用，headless validate exit0，native reload/get_config确认，同PID，capture baseline同步，13 tests OK，doctorok drift[]，HTTP200。内存只读归因RSS1.204GiB：49 wlroots SHM映射其中33大池约590MiB，Anon602MiB；2至3分钟RSS仅+4KiB，疑似buffer留存/高水位，具体释放点未知，不判必需正常，不做内存修改。未GUI/重启/commit/push。

NOTES 原文：

> 键盘Control+Mod1，鼠标Mod1 normal已编辑持久文件；独立headless Sway validate exit0，当前IPC reload success。capture-config 20261108T100156-2cb8f075aceb更新模板与managed。13 desktop tests OK；doctor statusok/blockers[]/drift[]，Main/Sway/Selkies3437236/3437320/3437254不变。README及来源/plan/parity/maintenance同步。内存调查进行中，不GUI/重启/commit/push。

## i3 变体的 modifier 修改

### 配置前后（持久文件 `config/i3/sway/config`）

修改前（引用 2026-11-08 本会话前状态，文字以现有 raw `2026-11-08-i3-banner-fix-and-acceptance.md` 为准）：

```text
# Logo key. Use Mod1 for Alt.
set $mod Mod4
```

修改后（当前持久文件，行号以现有为准）：

```text
# Keyboard shortcuts for browser window mode.
set $mod Control+Mod1
```

修改后的鼠标拖动行（当前持久文件）：

```text
    # Drag floating windows by holding Alt and the left mouse button.
    # Resize them with Alt and the right mouse button.
    # Despite the name, also works for non-floating windows.
    # Change normal to inverse to use left mouse button for resizing and right
    # mouse button for dragging.
    floating_modifier Mod1 normal
```

### 同步文档与源声明

README.md 新增段（当前持久文件）：

> 在 Windows 浏览器打开 `http://localhost:8080`，无需登录。确认当前选择的桌面外观、默认壁纸、菜单、状态栏、应用窗口、键鼠、剪贴板、音频和显示调整。i3 的键盘前缀为左 Ctrl+左 Alt，`Ctrl+Alt+Enter` 打开 `st`，`Ctrl+Alt+D` 打开 `wmenu-run` 应用菜单；其他 `$mod` 快捷键使用同一前缀。Alt+鼠标左键拖动窗口，Alt+鼠标右键调整尺寸。点击远程画面后使用这些组合，浏览器保持窗口模式；宿主保留组合仍由 Windows 处理。KDE 的中文拼音组合输入另按 [桌面来源对照](docs/desktop-parity.md) 检查。停止使用后执行 `wsl-webtop stop`。

docs/desktop-parity.md 更新要点（当前持久文件）：

> 项目键盘前缀为 Ctrl+Alt，鼠标拖动前缀为 Alt；`Ctrl+Alt+Enter` 的原有绑定直接启动 `/usr/bin/st`，每个快捷键只定义一次，沿用 Webtop i3 的 terminal 包选择；`Ctrl+Alt+D` 打开 `wmenu-run` 应用菜单。

docs/plan.md 更新要点（当前持久文件）：

> 保留默认快捷键动作、`wmenu-run` 菜单、resize mode、顶部 swaybar、日期状态与包壁纸。键盘前缀为 `Control+Mod1`，供浏览器窗口模式使用；`floating_modifier Mod1 normal` 单独使用 Alt。

docs/maintenance.md 更新要点（当前持久文件）：

> 键盘 `$mod` 为 `Control+Mod1`，鼠标 `floating_modifier` 为单独的 `Mod1 normal`；Ctrl+Alt+Enter 打开终端，Ctrl+Alt+D 打开应用菜单，Alt+鼠标用于拖动和调整尺寸。

### 验证与收据

- 独立 headless 校验：`env WLR_BACKENDS=headless WLR_RENDERER=pixman sway --unsupported-gpu --validate --config /home/cpf/.config/wsl-webtop/i3/sway/config` exit 0。
- 当前会话 reload：`swaymsg -s /run/user/1000/wsl-webtop/session-zlolvx8y/sway-ipc.sock reload` 成功。
- capture 收据：`/home/cpf/.local/state/wsl-webtop/config-receipts/20261108T100156-2cb8f075aceb.json`（`status: "complete"`、`schema_version: 2`、`receipt_id: "20261108T100156-2cb8f075aceb"`、`created_at: "2026-11-08T10:01:56.401230+00:00"`、`captured_files: ["config/i3/sway/config"]`、`changed_files: []`、`managed_keys: {}`）。
- 当前会话 HTTP 验证：`curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:8080/` 返回 `HTTP 200`。


- 另注：`/home/cpf/.local/state/wsl-webtop/verify/i3-config-fixed.json` 是横幅修复时段（2026-11-08 03:20）的验证工件，其 `capture_receipt_id` 为 `20261108T032036-fe44effc6f14`，`configuration_sha256` 为 `e8783202…`（横幅修复后、modifier 改动前的配置）；`tests.session: 29`、`native_running.checks: 11`、`security.checks: 7` 等条目属于横幅修复时段的检查，不归入本次 modifier 改动。
## Selkies 内存归因（只读 /proc + 精确版本源码）

### 实测总账（`/proc/3437254/smaps` 分组）

初次明细：RSS 1,262,140 KiB = 1.204 GiB；PSS 1,230,344 KiB。PSS 组成：Anon 616,600 KiB、SHM 593,640 KiB、File 20,104 KiB。初次 Shared_Dirty 仅 36,768 KiB。

### wlroots 组映射（共 49 个映射、49 个 FD）

| 单池 Size KiB | 数量 | 合计 RSS KiB |
| ---: | ---: | ---: |
| 18,504 | 14 | 259,040 |
| 18,480 | 11 | 203,280 |
| 18,372 | 2 | 36,744 |
| 17,456 | 4 | 69,824 |
| 17,476 | 2 | 34,952 |
| 8,100 | 5 | 8,100 |
| 3,072 | 2 | 0 |
| 12 | 6 | 72 |
| 4 | 3 | 8 |

33 个大池合计 RSS 603,840 KiB；全 wlroots RSS 612,020 KiB、PSS 593,636 KiB；PulseAudio 映射再贡献 4 KiB，合计精确解释 Pss_Shmem 593,640 KiB。FD 关联（例）：FD99→ino2050→`wlroots-GjOOcB`（18,480 KiB）、FD97→ino2047→`wlroots-DPpfAm`（18,504 KiB）、FD105→ino2067→`wlroots-cAPeBF`（17,456 KiB）、FD103→ino2070→`wlroots-pglALl`（18,372 KiB）、FD58→ino2069→`wlroots-hbcdPk`（18,372 KiB）、FD55→ino2001→`wlroots-MKCbKh`（8,100 KiB）。两个 `/memfd:pulseaudio (deleted)` 各 Size 65,536 KiB，但 RSS 分别仅 4/0 KiB（FD95/ino5326、FD66/ino14435），**不是大内存来源**。

池映射不等单张图像。按 32bit packed 像素面积折算，大池约 4.47-4.74 百万像素；8,100 KiB 与 1920×1080×4 字节相等。33 是**大映射/池数**，不是已证实的 33 张编码参考帧。

### Anon（私有匿名 resident 602.15 MiB）

最大部分：

- 四块匿名 VMA 起始 `7ba1b0c00000 / 7ba1c4c00000 / 7ba1d4c00000 / 7ba1dcc00000`，各 RSS 49,152 KiB = 48 MiB，共 192 MiB。
- `[heap]` 十段合计 131,328 KiB，最大 `3102c000-35a00000` 为 75,600 KiB。
- `7ba238000000-7ba23b718000`：RSS 56,408 KiB。
- `7ba1f8200000-7ba1fbe00000`：Size 61,440 KiB、RSS 40,960 KiB。

AnonHugePages 409,600 KiB（400 MiB）说明大量匿名页按透明大页驻留；/proc 不能识别各 heap allocation 的调用栈归属，不能把 602 MiB 全部硬归给 x264 或 Python。

### 自然采样趋势（`/proc/3437254/smaps_rollup` 后续 2-3 分钟）

| 样本 | RSS KiB | Anon PSS KiB | SHM PSS KiB |
|---|---:|---:|---:|
| 1 | 1,262,140 | 616,600 | 593,640 |
| 2 | 1,262,144 | 616,600 | 612,026 |
| 3 及末次 | 1,262,144 | 616,600 | 612,026 |

RSS 仅 +4 KiB、Anon 完全不变。SHM PSS 涨约 18 MiB 时 Shared_Dirty 从 36,768 KiB 降到 4 KiB、RSS 仅 +4 KiB：主要是共享分摊变化，**不是新增 18 MiB 驻留分配**。期间另出现两个 8,100 KiB RSS0 映射及一个 4 KiB 小映射；本批采样是自然观察，不冒充严格受控 idle 实验。

### 源码能解释什么、不能解释什么

- Pixelflux 2.2.3 双帧池 `2×width×height×4`（`pixelflux/src/lib.rs` L1377-L1382 与 L2594-L2597）：1080p 仅 15.82 MiB，按大池相当面积也仅约 34-36 MiB，**不能解释 590 MiB 客户端 SHM**。
- Selkies 2.2.1 复用 ScreenCapture 对象，但 stop 会调用原生 `stop_capture`（`websockets_mode.py` L6879-6914、L7664-7677），不会永久持有编码缓冲。
- Smithay/Pixman 直接引用 SHM、texture 持有 WlBuffer（Smithay 指定修订 `928d4a9b222b2adcd739a2c60caf3e8f304a45a5` 的 `src/backend/renderer/pixman/mod.rs` L1143-L1185）；客户端 buffer 确实可计入 Selkies。

**仍未知**：49 个旧 SHM 池分别由哪个当前/已销毁 surface 或 texture 持有；Anon 有多少是活编码对象、allocator 留存或历史高水位。泄漏结论仅限样本：未观察到持续增长；不能宣称无泄漏，也不能排除 resize/断连触发或此前已积累后稳定的泄漏。

## 未授权与未执行事项

- 未操作浏览器（无 CDP/截图/键鼠注入/视觉验收）。
- 未重启桌面服务或 Selkies 进程。
- 未提交 Git、未推送；agc 工作树保持本会话早批入库后的状态（未提交文件仍在）。
- 未修改内存行为或应用猜测性内存修复。

## 当前配置摘要

| 配置项 | 当前值 |
|---|---|
| 键盘前缀 `$mod` | `Control+Mod1` |
| 鼠标拖动 `floating_modifier` | `Mod1 normal` |
| 终端快捷键 | `Ctrl+Alt+Enter` → `/usr/bin/st` |
| 应用菜单 | `Ctrl+Alt+D` → `wmenu-run` |
| 鼠标拖动 | Alt+左键拖动、Alt+右键调整尺寸 |
| capture 收据 | `20261108T100156-2cb8f075aceb` |
| 运行验证 | doctor ok、same PID、13 desktop tests、HTTP 200 |
