# Selkies 指针尺寸链路与浏览器时序（HiDPI 嵌套会话）

> Sources: 本机 wsl-webtop 指针调查记录, 2026-11-08; Selkies 2.2.1 前端源码与官方发布, 2026-11-04; Pixelflux/Wlroots/Smithay 上游源码摘录, 2026-11-08
> Raw: [Selkies 2.2.1 前端与 Pixelflux 2.2.3 后端指针尺寸链路调查摘录](../../raw/webtop/2026-11-08-selkies-cursor-scaling-chain-investigation.md); [i3 Ctrl Alt modifier 修改与 Selkies 内存归因问答摘录](../../raw/webtop/2026-11-08-selkies-modifier-and-memory-questions.md)
> Updated: 2026-11-08

## Overview

本机 i3 Sway 桌面变体在浏览器里报告「鼠标移动时指针反复缩小拉伸闪烁」后做的指针链路调查。本文按指针消息的线格式、前端渲染的两个分支、服务端两条指针来源、已证实的时序缺陷与本机实测的边界组织，适用于 Selkies 2.2.1（提交 `d6b9351421bd503ffa89bdee78e2bce758b1ffe5`）+ Pixelflux 2.2.3 的嵌套 Wayland 形态。调查结束时用户确认症状消失，根因保持未确认；本文的事件取材只到这一边界。

## 指针消息如何到达浏览器

线格式两条：WebSocket 侧是小写 `cursor,<JSON>`（服务端去掉前缀后交给 `updateServerCursor`，无 await 串行）；WebRTC 侧是 `{type:'cursor',data:<相同字段>}`。字段语义：`curdata` 是 base64 PNG；`hotx`/`hoty` 是热点；`handle` 为 0 表示隐藏；`width`/`height` 只是服务端描述值，前端不读取。收到新 PNG 时旧 bitmap 先置 null，再异步 `createImageBitmap` 解码。

前端有两个渲染分支：

- **canvas 分支**：canvas buffer 尺寸取解码后 ImageBitmap 的实际像素；CSS 尺寸 = 像素 ÷ density；热点同样 ÷ density；位置用 `translate(clientX-hotspotX, clientY-hotspotY)`。宽高共用一个 density，因此算法本身保持长宽比，不会把正方形单独拉成非正方形。
- **CSS 分支**（`use_browser_cursors=true` 时）：直接设置 `element.style.cursor`；density≠1 时用 `image-set(... densityx) round(hotx/density) round(hoty/density), default` 归一化；fallback 分支不归一化，HiDPI 下指针可能整体偏大。

density 优先取「视频流像素 ÷ 页面 CSS 尺寸」的最大值，读不到几何时退 `_streamDensity`，再退 `useCssScaling?1:devicePixelRatio`。DPI 是远端桌面主题设置，不作为 CURSOR 载荷字段直接参与渲染；自动模式按 `devicePixelRatio×96` 向 25% DPI 档位取最近值。普通鼠标移动只更新 canvas 的 translate 与显示状态，只有新 PNG 或 density 变化才重算尺寸。

## 服务端两条指针来源

| 来源 | 尺寸行为 | 依据 |
|---|---|---|
| Named/default 主题指针 | 从 24px 主题取图，不乘输出 scale | `pixelflux/src/wayland/cursor.rs`：`Cursor::load` 默认 24，`get_sprite` 只按 self.size 选图 |
| Surface（client 提交的指针图） | 保留嵌套 Sway 提交的真实 buffer 像素，只按 cap 缩小 | `pixelflux/src/wayland/frontend.rs` `send_cursor_image` 的 Named/Hidden/Surface 分支 |

嵌套链路：嵌套 Sway 经 wlroots wayland 后端把真实 cursor buffer attach/commit 后发送 `wl_pointer.set_cursor`（wlroots `backend/wayland/output.c`）；Pixelflux 的 `ScreenCapture::set_cursor_callback` 是 process-wide 最新活跃注册，单一广播通道。Smithay 的 seat 语义决定切换时机：同一 pointer focus 内移动只有 motion；指针进出 client surface（focus 替换或离开）时发 default Named。因此本机 scale 2 的 Sway 里，surface 指针可提交 48x48 图，default 指针是 24px——指针进出窗口时理论上存在 24px/48px 两种尺寸来源交替的代码级条件。

## 已证实的时序缺陷（浏览器端）

对已安装 bundle 抽取真实方法、在确定时序下重放（stub 只控制解码完成顺序与 density=2）得到两个代码级事实：

- **旧解码迟到会覆盖新指针**。先发指针 A 再发指针 B，B 的 bitmap（48 宽）先渲染，随后 A 迟到的解码完成后，`_cursorImageBitmap.width` 变回 24，CSS `width` 变 "12px"。指针整体闪回旧图，配 density 2 表现为尺寸回跳。
- **hide 指令会被 pending 解码覆盖**。发出指针 C（未解码）后发出隐藏（空 curdata / handle 0），C 的解码完成后 `cursorDiv.style.display` 变回 "block"，指针复活。

两项均为代码剖析级结论；故障当时浏览器处于哪个分支未确认。

## 本机实测与结论边界

本机运行单元：Main PID `3437236`、Sway PID `3437320`、Selkies PID `3437254`；Sway scale 2、current_mode 2744x1724、逻辑 rect 1372x862；应用 socket `wayland-2`。被动 viewer WebSocket 取证（不注入输入、不启动视频）两轮（20 秒与 120 秒）共收到 1 条指针消息：48x48、热点 6/2、handle 1779104401、像素 SHA-256 前缀 b4f9b4f5b370c66b，样本稳定、没有捕获图片切换，也没有用户运动确认。

结论边界：两个时序缺陷与「24/48 来源交替」都是已证实的机制性条件，但故障触发路径、当时前端分支与用户症状的对应均未确认。Windows 侧 Chrome 156.0.8078.80 未启用调试接口，浏览器侧 ground truth 未取得。issue 以用户确认恢复关闭，本事项未修改任何业务代码或配置。

## 若复发：取证与二分顺序

1. 复用被动 viewer probe（`ws://localhost:8080/api/websockets?role=viewer`），在故障窗口内移动鼠标，捕获完整 `cursor,<JSON>` 序列，看 48x48 与 24px 是否交替出现、间隔多少。
2. 若交替出现，交替源二分：先临时显式设置 cursor theme size（`set_cursor_size` 会重建主题），或把 `capture_cursor`/`set_native_cursor_rendering` 状态做成单变量切换，逐项隔离 Named 与 Surface 路径。
3. 若没有交替，检查前端分支：需要浏览器侧只读诊断（canvas 分支/`use_browser_cursors`/density 实值），Windows Chrome 需以独立 user-data-dir 加远程调试口启动后才能读取。
4. 若确认前端解码时序缺陷成立，对 `updateServerCursor` 的处理顺序做单点修复（以「最新数据胜出」为判据），先写失败重放再改。

处理期间沿用本事项的原约束：不视觉验收、不截图、不注入键鼠、未经授权不重启服务。

## See Also

- [i3 Sway 变体的配置错误横幅：重复键位与修复](i3-sway-config-error-banner.md)
- [Webtop 移植到 WSL：组件、偏离与原因](webtop-on-wsl-architecture.md)
