# Selkies 2.2.1 前端与 Pixelflux 2.2.3 后端指针尺寸链路调查摘录

> Source: 本机 wsl-webtop 会话调查（被动 viewer WebSocket 采样 + 已安装 bundle 方法抽取重放 + 上游固定 commit 源码摘录 + bd 事项记录）；上游源码 https://github.com/selkies-project/selkies/blob/d6b9351421bd503ffa89bdee78e2bce758b1ffe5/ 与 https://github.com/selkies-project/pixelflux/blob/5c78910e524539a2b801433303ee61dd04f42a51/
> Collected: 2026-11-08
> Published: Unknown

本文是原始材料摘录。来源分四类逐块标注：bd 记录（本机 bug 事项）、被动采样（本机 live 数据）、代码摘录（上游源码与本机已安装包，逐条给出原始行号或 URL）、用户验收（会话内陈述）。中文行文按用户规则；identifier 与代码一律保持英文原名。

## 事项与结论总状态（bd 记录）

issue `wsl-webtop-yx9`「修复 i3 浏览器指针缩放闪烁」：P1 BUG，创建并开始于 2026-11-08，现已 CLOSED。CLOSE REASON 原文：

> 用户确认红色横幅和指针闪烁均已消失，移动不再缩小或拉伸。指针诊断未修改业务代码，根因未确认。保留当前服务，不继续浏览器诊断或应用猜测补丁。

NOTES 原文：

> 原生120秒viewer被动采样1条48x48/hot6,2，没有用户运动确认。已装前端实际方法重放确认旧decode覆盖新decode以及hide后显示恢复的条件性缺陷，尚未确定本次有效canvas模式。用户允许只读当前Chrome诊断但现有Chrome未启用debug接口。需要当前页面Console只读模式/密度记录；不修改猜测修复、不重启浏览器、不截图/键鼠/视觉验收。报告 ~/.local/state/wsl-webtop/verify/cursor-investigation.json。

保存的调查证据文件全文（`~/.local/state/wsl-webtop/verify/cursor-investigation.json`）：

```json
{
  "status": "user_confirmed_resolved",
  "issue": "wsl-webtop-yx9",
  "goal": "修复 localhost8080 鼠标移动时的指针尺寸闪烁",
  "actual_service": {"main_pid":3437236,"sway_pid":3437320,"selkies_pid":3437254,"sway_scale":2,"sway_mode":[2744,1724],"sway_logical_size":[1372,862]},
  "passive_capture": {"duration_seconds":120,"events":1,"width":48,"height":48,"hotspot":[6,2],"handle":1779104401,"base64_sha256_prefix":"b4f9b4f5b370c66b","user_motion_confirmed":false},
  "installed_frontend_replay": [
    {"scenario":"old decode completes after current decode","expected_width":48,"actual_width":24,"css_width":"12px","latest_data":"B"},
    {"scenario":"hide arrives before pending decode completes","expected_display":"none","actual_display":"block"}
  ],
  "cause_of_reported_symptom": "unconfirmed",
  "confirmed_code_conditions": ["async canvas cursor decoding permits stale completion to overwrite newest cursor or hide","native default theme selects 24px, nested Sway surface can supply 48px at scale2"],
  "browser_diagnostics_permission": "用户允许只读当前Chrome指针样式、显示密度、解码状态，禁止截图点击键盘和视觉验收",
  "browser_prerequisite": "当前WindowsChrome156.0.8078.80未开启调试接口。尚未取得故障页面有效renderer和geometry。",
  "changes": [],
  "agent_cursor_fix_applied": false
}
```

## 本机被动采样（live 数据，viewer 角色 WebSocket 只读）

服务进程（2026-11-08 会话实测）：Main PID `3437236`，Sway PID `3437320`，Selkies PID `3437254`；单服务端口 8080（i3 变体运行中，与 KDE 变体互斥切换，bd `wsl-webtop-us2` 为「单端口 KDE 与 Webtop i3 Sway 互斥切换」feature）。

Sway 输出实况（swaymsg get_outputs）：scale `2`，current_mode `2744x1724`，rect `1372x862`。seat 设备（get_seats）：仅 nested Wayland pointer 与 keyboard。应用 socket 为 `wayland-2`，`SWAYSOCK` 指向私有 `sway-ipc.sock`（`sway-environment.json`）。

被动采样完整样本行（第一轮 20 秒）：

```text
{"handle": 1779104401, "height": 48, "hotx": 6, "hoty": 2, "pixels": "b4f9b4f5b370c66b", "time": 214711.952, "width": 48}
```

第二轮 120 秒样本行：

```text
{"handle": 1779104401, "height": 48, "hotx": 6, "hoty": 2, "pixels": "b4f9b4f5b370c66b", "time": 215293.377, "width": 48}
```

两轮合计仅收到 1 条不同的指针消息；没有用户运动确认（采样期间未捕获指针图片切换；样本稳定 48x48，热点 6/2，handle 1779104401，像素 SHA-256 前缀 b4f9b4f5b370c66b）。采样协议：`ws://localhost:8080/api/websockets?role=viewer`，只解析 cursor JSON 几何、handle 与 pixels 哈希；不注入输入、不启动视频。

## 已安装前端（Selkies 2.2.1）实现摘录

版本：tag 2.2.1，源码提交 `d6b9351421bd503ffa89bdee78e2bce758b1ffe5`，release 日期 2026-11-04，release 声明附带 Pixelflux 2.2.3 与 Pcmflux 2.2.1。本机安装位置 `/opt/selkies/lib/python3.14/site-packages/selkies/`，运行 Python 为 `/opt/selkies/bin/python3`。

前端文件证据点（直读核实）：

- `/opt/selkies/lib/python3.14/site-packages/selkies/selkies_web/selkies-core.js` 第 13 行（minified 单行卷内）含 `_drawAndScaleCursor`、`_cursorDensity`、`_updateBrowserCursor`、`updateServerCursor` 实现；第 1274 行有 `applyEffectiveCursorSetting`；第 2482 行有 `cursor,` 消息解析后调用 `updateServerCursor`。
- `assets/index-BD8uW1M7.js` 第 26 行：`use_browser_cursors` 控制项发送 `{type:'setUseBrowserCursors',value:e}`，属于另一个独立 renderer 开关项，不属于 cursor 绘制算法本体。
- canvas 使用解码后 PNG 的实际尺寸除以显示流密度；CSS cursor 使用 image-set 声明相同密度；`width`/`height` 字段在 `updateServerCursor` 中不参与尺寸计算；handle 只用于判定 0 隐藏；前端不把 server width/height 再乘一次 DPI。
- 普通鼠标移动只改 cursor canvas 的 translate 与显示状态，不改宽高；只有新 cursor PNG 或显示流密度变化才重算尺寸。

线格式与字段语义（上游 `addons/selkies-web-core/selkies-ws-core.js#L8936-L8946` 与 `addons/selkies-web-core/lib/input.js#L1892-L1943`）：

- WebSocket 线格式是小写 `cursor,<JSON>`；解析为 `JSON.parse(event.data.substring(7))` 后直接调用 `window.webrtcInput.updateServerCursor(cursorData)`，没有 await。原生日志里的 CURSOR 名称不代表浏览器收到另一种 uppercase 协议。
- WebRTC 格式是 `{type:'cursor',data:<相同字段>}`。
- 字段：`curdata` 为 base64 PNG（不带 data:image/png;base64 前缀）；`width`/`height` 是服务端描述的 PNG 宽高，前端 updateServerCursor 不读取；`hotx`/`hoty` 是 PNG 坐标系内热点，parseInt 后使用；`handle` 为 string 或 number，`parseInt(handle,10)===0` 表示隐藏；前端不用非零 handle 做缓存命中或跳过重绘。
- 更新路径：`curdata` 为空或 handle=0 时清空 bitmap/base64 并隐藏 canvas；新 PNG 到达时保存热点与 base64，并且把旧 bitmap 置 null；canvas 模式异步 `createImageBitmap` 后再绘图；trackpad 模式另走 canvas 与 pointer echo。

canvas 尺寸/位置算法（上游 `addons/selkies-web-core/lib/input.js#L1543-L1554`、`#L1809-L1889`、`#L3483-L3534` 经直读）：

- cursorDiv 实为 appended-to-body 的 fixed canvas，`pointer-events:none`，`z-index:999999`。
- buffer width/height = ImageBitmap.width/height；CSS width/height = bitmap 尺寸 ÷ density；热点 = raw hotspot ÷ density。
- 鼠标位置使用 client CSS 坐标，`transform = translate(clientX-hotspotX, clientY-hotspotY)`。
- 宽高共用同一个 density；这段算法本身保持 PNG 长宽比，不会把正方形单独拉成非正方形。

CSS 分支（`use_browser_cursors=true` 时隐藏 canvas，直接设置 element.style.cursor!important）：

- density≠1 且 CSS.supports 接受 image-set 或 -webkit-image-set 时：`image-set(url("data:image/png;base64,...") densityx) round(hotx/density) round(hoty/density), default`。
- fallback 为普通 `url(... rawHotx rawHoty), default`，不做 HiDPI 尺寸归一化，可能持续偏大；本机是否反复进入 fallback 未确定。

density 计算上游 `input.js`：优先测已显示视频内容区域，取 `max(streamPixelWidth/contentCssWidth, streamPixelHeight/contentCssHeight)`；canonical canvas 隐藏时读 videoStream/videoWorkerCanvas 可见 box；`object-fit:contain` 先扣除 letterbox；读不到几何退 `_streamDensity`，再退 `useCssScaling?1:devicePixelRatio`。名为 dpr 的局部变量实际可能是显示流密度，不一定等于浏览器 DPR。

DPI 语义：DPI 是远端桌面 UI/theme 的设置，不直接作为 CURSOR payload 字段参与渲染。自动默认从 devicePixelRatio×96 向 25% DPI 档位取最近值；普通自动分辨率的 HiDPI 模式跟随 DPR；`useCssScaling=true` 且非 manual 时桌面请求 DPI=96；manual 分辨率保留固定 framebuffer，DPI 仍作用于桌面。

服务端设置相关（已装包直读行号）：

- `/opt/selkies/lib/python3.14/site-packages/selkies/input_handler.py`：第 6826-6921 行 app socket 发现与 ABI 设置；第 7558-7631 行 nested DPI 接收与 fallback；第 8775-8812 行 `WaylandInput.get_current_cursor_data` 直接返回 None。
- `/opt/selkies/lib/python3.14/site-packages/selkies/display_utils.py`：第 2647-2733 行 CaptureSettings 的 cursor-size/cap/scale 透传；第 2816-2859 行 `format_pixelflux_cursor` 只读真实 PNG dimensions、编码并计算 handle；做 hiding（hidden=0）、unknown skip、不 resize；size 只作为 decode 失败 fallback。
- `/opt/selkies/lib/python3.14/site-packages/selkies/websockets_mode.py`：第 1851-1881 行 `send_ws_cursor_data` 缓存 last cursor 并 broadcast clients；第 4598-4650 行显式 cursor theme size 更新（`_apply_wayland_cursor_size`→native `set_cursor_size` 重建主题）与 `_update_cursor_cap` 仅 resize cap；settings 相关：`cursor_size` 默认 -1、`use_css_scaling` 默认 false、客户端 DPI 默认 96（范围 96-288，operator override 会被锁定）。
- 默认 `capture_cursor=False`（第 2062 行附近）；`set_native_cursor_rendering`（第 2287 行附近）是 burned-in cursor 的唯一切换入口；前端 `SET_NATIVE_CURSOR_RENDERING` 不是本机当前状态证据，仅为可切换项。

## Native 后端（Pixelflux 2.2.3 与依赖）摘录

本机 wheel：`/opt/selkies/lib/python3.14/site-packages/pixelflux.cpython-314-x86_64-linux-gnu.so` + `pixelflux-2.2.3.dist-info`（direct_url.json 有来源与 SHA256）。2.2.3 wheel 内没有 Rust 源码/stub；源码调查采用项目固定 commit `5c78910e524539a2b801433303ee61dd04f42a51`。

- `pixelflux/src/wayland/frontend.rs#L1943-L2122`：`AppState::send_cursor_image` 的 Named/Hidden/Surface 三分支、buffer_scale hotspot 处理、SHM/dmabuf extraction 与 pending flush。
- `pixelflux/src/wayland/frontend.rs#L3086-L3103`：`SeatHandler::cursor_image` 保存当前状态；Surface 等 commit 后由 dispatch flush 发出，Named/Hidden 立即发送。
- `pixelflux/src/wayland/cursor.rs#L23-L231`：CursorJob 数据形状、`spawn_cursor_worker`、`cap_and_encode`、`scaled_hotspot` 与 PNG callback。
- `pixelflux/src/wayland/cursor.rs#L326-L414`：`Cursor::load` 默认 24，`get_sprite` 只按 self.size 选图（auto 模式下 Named/default 从 24px 主题取图、不读取输出 scale）；composited `get_image`/`get_image_by_name` 则另乘输出 scale。
- `pixelflux/src/lib.rs#L10349-L10383`：`ScreenCapture::set_cursor_callback` 是 process-wide 的最新活跃注册，不会为每个 capture 分别广播。
- Smithay `src/input/pointer/mod.rs#L792-L825`（commit 928d4a9b222b2adcd739a2c60caf3e8f304a45a5）：同一 pointer focus 内移动只有 motion；focus 替换走 replace（默认实现见同文件 130-143 行）并在离开 focus 时发 default Named。由此，native 后端在指针进出 client surface 时会出现 24px default cursor。
- Smithay `src/wayland/seat/pointer.rs#L406-L469`：`wl_pointer.set_cursor` 校验、cursor_image role、logical hotspot、Surface/Hidden 回调；同文件 554-588 行校验 serial 与 focused client。
- wlroots 0.19.2 `backend/wayland/output.c#L906-938`：嵌套 wayland 后端 output_set_cursor 将真实 cursor buffer attach/commit 后调用 update_wl_output_cursor；同文件 1002-1013 行发送 `wl_pointer.set_cursor`（嵌套 Sway 向 Pixelflux host 提交 48x48 buffer 时按 scaled hotspot 发送）。

## 非视觉重放（已装 selkies-core.js 的真实方法在 vm 中执行）

方法抽取脚本（`/tmp/wsl-webtop-cursor-analysis.mjs`，用后已删）用 acorn 解析已安装 minified 文件，提取 MethodDefinition 真实方法体放进 `vm.runInNewContext`；stub 只替代图像源与密度（`_cursorDensity()=2`，`createImageBitmap` 由测试控制解码完成顺序）。两个场景的结果：

- 场景 1「old decode completes after current decode」：先 `updateServerCursor(A)`、后 `updateServerCursor(B)`；B 的 bitmap（48 宽）先完成渲染，随后 A 的 bitmap（24 宽）迟到的解码完成。期望宽 48；实际 `_cursorImageBitmap.width` 变为 24，CSS `width` 变 "12px"（density 取 2 时的 CSS 长度）。结论：迟到的解码可以把指针换回旧图。
- 场景 2「hide arrives before pending decode completes」：发出 `updateServerCursor(C)`（未解码），随后发出空 curdata 与 handle=0（要求隐藏），再让 C 的解码完成。期望显示状态 "none"；实际 `cursorDiv.style.display` 变回 "block"。结论：隐藏指令会被尚未完成的解码覆盖。

## 结论边界

- 用户报告的症状：移动鼠标时指针反复缩小拉伸闪烁；红色配置错误横幅另一事项（见 raw/webtop/2026-11-08-i3-banner-fix-and-acceptance.md）。
- 两个时序缺陷是已证实的代码级事实（真实方法在确定时序下执行）；24 与 48 两种尺寸来源的机制差异同样是源码既证（named default 24px；嵌套 Sway surface 在 scale 2 下可提交 48px）。
- 故障触发路径未确认：被动采样没有捕获图片切换；故障当时浏览器处于 canvas 还是 CSS 模式未确认；Chrome 侧 ground truth 未取得（Chrome 156.0.8078.80 未启用调试接口）。因此根因判定保持 unconfirmed，两候选机制不作为用户问题的已归因原因。
- 用户随后确认症状消失（issue 关闭原因为 user confirmed）；本事项未修改任何业务代码或配置（changes: []，agent_cursor_fix_applied=false）。

## 调查权限时间线（会话记录）

1. 初始约束：禁止视觉测试、Chrome 自动化（CDP/截图/键鼠注入）、重启服务、commit/push 与 AGC 修改；只允许原生日志与被动 WebSocket 取证。
2. 后获授权扩项：只读当前 Chrome 页面的指针样式、显示密度、解码状态（仍然禁止截图、点击、键盘输入与视觉验收）。
3. 实施受阻：现有 Windows Chrome 156.0.8078.80 未启用远程调试接口；未启动新浏览器实例；没有取得故障页面 renderer truth。
4. 用户确认症状消失后全部诊断终止；临时探针脚本（`/tmp/wsl-webtop-cursor-probe.py`、`/tmp/wsl-webtop-cursor-analysis.mjs`）已删除；不再复现，也不应用猜测补丁。

## 上游引用 URL 清单

- https://github.com/selkies-project/selkies/blob/d6b9351421bd503ffa89bdee78e2bce758b1ffe5/addons/selkies-web-core/selkies-ws-core.js#L8936-L8946
- https://github.com/selkies-project/selkies/blob/d6b9351421bd503ffa89bdee78e2bce758b1ffe5/addons/selkies-web-core/lib/input.js#L1892-L1943
- https://github.com/selkies-project/selkies/blob/d6b9351421bd503ffa89bdee78e2bce758b1ffe5/addons/selkies-web-core/lib/input.js#L1543-L1554
- https://github.com/selkies-project/selkies/blob/d6b9351421bd503ffa89bdee78e2bce758b1ffe5/addons/selkies-web-core/lib/input.js#L1809-L1889
- https://github.com/selkies-project/selkies/blob/d6b9351421bd503ffa89bdee78e2bce758b1ffe5/addons/selkies-web-core/lib/input.js#L3483-L3534
- https://github.com/selkies-project/pixelflux/blob/5c78910e524539a2b801433303ee61dd04f42a51/pixelflux/src/wayland/frontend.rs#L1943-L2122
- https://github.com/selkies-project/pixelflux/blob/5c78910e524539a2b801433303ee61dd04f42a51/pixelflux/src/wayland/frontend.rs#L3086-L3103
- https://github.com/selkies-project/pixelflux/blob/5c78910e524539a2b801433303ee61dd04f42a51/pixelflux/src/wayland/cursor.rs#L23-L231
- https://github.com/selkies-project/pixelflux/blob/5c78910e524539a2b801433303ee61dd04f42a51/pixelflux/src/wayland/cursor.rs#L326-L414
- https://github.com/selkies-project/pixelflux/blob/5c78910e524539a2b801433303ee61dd04f42a51/pixelflux/src/lib.rs#L10349-L10383
- https://github.com/Smithay/smithay/blob/928d4a9b222b2adcd739a2c60caf3e8f304a45a5/src/input/pointer/mod.rs#L792-L825
- https://github.com/Smithay/smithay/blob/928d4a9b222b2adcd739a2c60caf3e8f304a45a5/src/wayland/seat/pointer.rs#L406-L469
- https://gitlab.freedesktop.org/wlroots/wlroots/-/blob/0.19.2/backend/wayland/output.c#L906-938
