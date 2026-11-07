# ttyd xterm.js 渲染色块与渲染器选择

> Sources: tsl0922/ttyd 1.7.7 源码与手册, 2026-11-07; xterm.js GitHub issues, 2026-11-07; Chromium gpu_driver_bug_list.json (fb096c0), 2026-11-07; 本机 chrome://gpu 与实测记录, 2026-11-07
> Raw: [Chromium GPU driver bug list 摘录](../../raw/terminal-multiplexers/2026-11-07-chromium-gpu-driver-bug-list.md); [ttyd 渲染器与色块证据摘录](../../raw/terminal-multiplexers/2026-11-07-ttyd-xterm-renderer-corruption.md)
> Updated: 2026-11-07

## Overview

ttyd 网页里 TUI 输出偶发显示为彩色像素块、非正常文字，把浏览器窗口调整一下尺寸即自行恢复。这类症状与 xterm.js WebGL 渲染器的字形纹理缓存（texture atlas）损坏一致，上游 issue 与 ttyd 侧渲染器机制都能对应。本文沉淀：症状与恢复原理、三种渲染器的选择与 GPU/CPU 差异、本机（Windows + RTX 3050 Laptop）与该症状相关的驱动与 Chromium 台账事实、验证路径与待验证分支。

## 症状与恢复原理

色块现象的核心机制是字形纹理缓存损坏：

- xterm.js WebGL 渲染器把字符的字形位图上传到 GPU 作为纹理缓存，再从缓存拼出画面；缓存坐标失效、上传不稳定、上下文丢失恢复失败时，都表现为字符错位、彩色方块、黑块或纹理涂抹。
- 调整浏览器窗口会触发 terminal 重新计算尺寸并完整重绘；重绘从缓存重建，所以临时恢复正常。
- 上游已有多个症状一致的 issue：`Render glitches (blacked out content)` (#4480)、`WebGL glyph atlas corruption on Linux/Wayland when generating mipmaps` (#5986)、Pixel 7 Pro Chrome 108 上多外壳（ttyd/webssh/tty-share）同错 (#4279)。#5986 在 Wayland + mipmap 生成路径下把 root cause 定在 `gl.generateMipmap(gl.TEXTURE_2D)`，与 #4480 一线相关、自认定为不同触发。
- 手动恢复接口：Console 里 `window.term.clearTextureAtlas()`，官方文档定位为「纹理缓存损坏时清除并重渲染」的恢复手段，并记录 Chromium/NVIDIA 在系统休眠恢复后缓存损坏的场景。

## 三种渲染器的选择

ttyd 靠 `rendererType` 选项切换渲染器（源码 `html/src/components/terminal/xterm/index.ts`）：

| rendererType | addon | 加载日志（Console） | 画面职责 | 布局角色 |
|---|---|---|---|---|
| `webgl`（默认） | `@xterm/addon-webgl` | `[ttyd] webgl renderer loaded` | WebGL2 | GPU 重，字符由 GPU 重复绘制 |
| `canvas` | `@xterm/addon-canvas` | `[ttyd] canvas renderer loaded` | Canvas 2D | CPU 绘制位图，合成交给浏览器 GPU |
| `dom` | 不加载 addon | 无专项行（ttyd 无 dom 专项日志） | DOM/CSS | 排版慢但无纹理缓存，绕开 atlas 类损坏 |

本机切换实测（原 URL 追加 `&rendererType=canvas`）Console 成功打出 `[ttyd] canvas renderer loaded`，且 `theme`、`fontSize`、`fontFamily` 等选项正常沿原参数生效。桌面浏览器对 Canvas 2D 的绘制也可以走 GPU 加速的 Skia/Graphite 路径，所以 canvas 在本机并不放弃 GPU。

## 本机事实链（Windows 11 + RTX 3050 Laptop GPU + Chrome 156）

chrome://gpu 与 nvidia-smi 记录（2026-11-07）：

- GPU0 NVIDIA GeForce RTX 3050 Laptop GPU，驱动 32.0.15.8088（＝ NVIDIA 580.88，安装日期 2025-07-27）。
- `Canvas: Hardware accelerated`、`WebGL: Hardware accelerated`、Rasterization/Compositing 均 Hardware accelerated；Skia 走 Graphite/Dawn/D3D11。
- Driver Bug Workarounds 区块存在两条与 ttyd 相关：
  - `unpack_overlapping_rows_separately_unpack_buffer` — 「Unpacking overlapping rows from unpack buffers is unstable on NVIDIA GL driver」（crbug 596774；台账 entry id 165，条件仅 gl_vendor 匹配 NVIDIA，无 `driver_version` 区间）。
  - `exit_on_context_lost` — 「Some drivers are unable to reset the D3D device in the GPU process sandbox」（台账 entry id 17，条件仅 `os.type == win`，不限厂商）。

本 ttyd 进程命令行含 `-t enableSixel true`；`html/package.json` 依赖 `@xterm/addon-webgl ^0.17.0` + `@xterm/xterm ^5.4.0`（1.7.7）。

## 驱动升级与两条 Chrome workaround 的关系

Chromium 台账（固定版本 fb096c0，Chrome 156 对应）显示两条 workaround 的命中条件都不含 `driver_version` 区间：

| workaround | 台账条件 | 升级驱动后 |
|---|---|---|
| unpack_overlapping_rows… | gl_vendor 匹配 NVIDIA | 依然挂载（对任意 NVIDIA 驱动版本） |
| exit_on_context_lost | os.type == win | 依然挂载（对所有 Windows 场景） |

结论：**升级驱动不改变 chrome://gpu 里这两条 workaround 的挂载**，不要把 chrome://gpu 的 Workarounds 列表变化当验收标准。走不走出色块，取决于驱动本体是否根治以及 ttyd 1.7.7 捆绑的 `@xterm/addon-webgl 0.17.0` / `@xterm/xterm 5.4.0` 字形缓存实现在新驱动下是否仍触发损坏。

NVIDIA 驱动升级路径（本会话已查）：

- 现状 580.88（2025-07-27）；官网 Game Ready 最新 621.14 WHQL，2026-11-04 发布，含 RTX 3050 Laptop 支持。
- 安装：已装的 NVIDIA app → Drivers 页 → 检查更新 → 自定义安装 → 勾选执行清洁安装 → 重启。

## 待验证分支

1. **canvas 模式下色块是否复发**。当前切换成功但观察期短：若持续不复发，说明 WebGL 字形缓存路线已被绕开。
2. **若 canvas 下复发，enableSixel=true 是否参与**。本机 ttyd 启动参数含 `-t enableSixel true`；验证路径：URL 追加 `&enableSixel=false` 并确认 Console 里 `[ttyd] Sixel enabled` 行消失，再观察色块。症状若为「画面某区域出现成片彩色像素且不随文字刷新消失」，sixel 嫌疑升高（残缺 sixel 数据会被 addon-image 直接画成像素块）。
3. **驱动升到 621.14 后回验 WebGL**：URL 追加 `&rendererType=webgl` 或删除该参数走默认；Console 应出现 `[ttyd] webgl renderer loaded`，再观察色块。仍触发则基本可判定病灶核心在 ttyd 1.7.7 捆绑的 `@xterm/addon-webgl 0.17.0` / `@xterm/xterm 5.4.0` 字形缓存实现路径，驱动升级无从根治；继续留在 canvas 为本机最稳绕行。

## See Also

- [ttyd 前端编译模型与 xterm 版本锁定](ttyd-frontend-compilation.md)
- [浏览器终端链路的剪贴板路径](browser-terminal-clipboard-paths.md)
- [终端图像协议支持矩阵](../terminal-graphics/terminal-image-protocol-matrix.md)
