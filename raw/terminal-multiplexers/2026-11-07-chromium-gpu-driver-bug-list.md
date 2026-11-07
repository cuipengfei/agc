# Chromium GPU Driver Bug List（固定版本 fb096c0）摘录

- Source: https://chromium.googlesource.com/chromium/src/+/fb096c0011f9d50f0a264a9376420cdea9c421e3/gpu/config/gpu_driver_bug_list.json
- Collected: 2026-11-07
- Published: Unknown（该文件随 Chromium 持续更新；下面所有摘录固定在 fb096c0 这一提交版本）

## 摘录方式

`curl -fsSL` 下载该提交的 `gpu/config/gpu_driver_bug_list.json` 到 `/tmp/gdb.json`，用 Python 脚本抽取 `features` 含 `exit_on_context_lost` 或 `unpack_overlapping_rows_separately_unpack_buffer` 的全部条目，逐字保留 JSON 字段。以下为与 Windows/NVIDIA 相关的两条，及 Windows 台账里的完整命中集合。

### entry id 17（对应 chrome://gpu 的「exit_on_context_lost: Some drivers are unable to reset the D3D device in the GPU process sandbox」依据）


```json
{
 "id": 17,
 "description": "Some drivers are unable to reset the D3D device in the GPU process sandbox",
 "os": {
  "type": "win"
 },
 "features": [
  "exit_on_context_lost"
 ]
}
```

要点：条件仅 `os.type == win`，不限 GPU 厂商，无 `driver_version` 区间字段。

### entry id 165（对应 chrome://gpu 的「unpack_overlapping_rows_separately_unpack_buffer: Unpacking overlapping rows from unpack buffers is unstable on NVIDIA GL driver」依据）

```json
{
 "id": 165,
 "cr_bugs": [
  596774
 ],
 "description": "Unpacking overlapping rows from unpack buffers is unstable on NVIDIA GL driver",
 "gl_vendor": "NVIDIA.*",
 "features": [
  "unpack_overlapping_rows_separately_unpack_buffer"
 ]
}
```

要点：条件仅 `gl_vendor` 匹配 NVIDIA，无 `driver_version` 区间字段。cr_bugs 596774。

## 本机（Windows 11 + RTX 3050 Laptop GPU，Chrome 156）chrome://gpu 关键事实行（2026-11-07 用户实测抄录）

- GPU0: NVIDIA GeForce RTX 3050 Laptop GPU，驱动 32.0.15.8088（对应 NVIDIA 580.88）
- Canvas: Hardware accelerated
- WebGL: Hardware accelerated
- Rasterization / Compositing: Hardware accelerated
- Driver Bug Workarounds 区块中存在与上面 entry id 17 / id 165 对应的两行及描述文本；该 workaround 名单与上游台账交叉对应。
- Skia 渲染后端：Graphite，走 Dawn/D3D11（canvas 图形路径）

## 上游关联 issue 的可核对事实

- xterm.js issue #4480「Render glitches (blacked out content)」正文开头（原文直抄）：

  > I'm working on a TUI framework for Python, which does tend to push the terminal more than a typical app.
  >
  > On certain apps, after a few seconds of updates the terminal starts glitching heavily. The more animation, the quicker this seems to happen.

- xterm.js issue #5986 「WebGL glyph atlas corruption on Linux/Wayland when generating mipmaps」正文（原文直抄，含版本事实）：

  > Browser and browser version: Chromium 148.0.7778.96 (Arch Linux) for the Hermes downstream observation; Electron/Chromium in Orca for the separate downstream observation
  >
  > OS version: Linux + Wayland. Observed downstream on Arch Linux rolling / kernel 7.0.10 and separately on Ubuntu 26.04 with Intel Arc graphics
  >
  > xterm.js version: downstream packages using `@xterm/addon-webgl@0.19.0` and `@xterm/addon-webgl@0.20.0-beta.215`; current `master` still has the same `gl.generateMipmap(gl.TEXTURE_2D)` call in `addons/addon-webgl/src/GlyphRenderer.ts`

- xterm.js issue #4279 「rendering issues (unusable) on chrome 108 on pixel 7 pro」正文开头（原文直抄）：

  > I have tried this w/ webssh, w/ ttyd, and w/ tty-share (all apps using xtermjs) as well as NgTerminal (our own attempt to use). It works reliably on other devices, but something about the screen resolution/os/browser makes it unusable. It initially comes up ok, and you can touch a few keys and its fine. Then all of a sudden the screen goes black with 1 or 2 characters showing, and input/output are somewhat shown (e.g. type ${foo} and you will see $${{   }}), but nothing is usable.

issue URL：
- https://github.com/xtermjs/xterm.js/issues/4480
- https://github.com/xtermjs/xterm.js/issues/4279
- https://github.com/xtermjs/xterm.js/issues/5986 (2026 年报告，Wayland + mipmap 生成路径，自认定与 4480 区分开)
