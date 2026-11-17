# Tern 网页终端渲染链路：WASM 光栅化与服务端 `/fonts` 投递

> Source: `~/.local/share/tern-web-0.9.23-original/pkg/client.js`、`~/.local/share/tern-web-0.9.23-original/pkg/original.wasm`、`~/.local/share/tern-native-0.9.26/tern`、`127.0.0.1:8378` 的 HTTP 实测响应、Windows Chrome 经 Playwright 的实测截图与 console 日志
> Collected: 2026-11-18
> Published: Unknown

## 浏览器 2D Canvas 不参与文字绘制

`pkg/client.js`（0.9.23 官方 glue，`84621` 字节）中 `CanvasRenderingContext2D.fillText` 与 `measureText` 出现次数均为 0。页面 `<canvas id="tern">` 获取的是 WebGPU 上下文，浏览器自身的文字渲染器与 Windows 本机字体未参与终端文字绘制。

## WASM 光栅化与 WebGPU 上屏

WASM 内嵌：

- `harfrust-0.12.0`（文本排版 shaping）
- `skrifa-0.44.0`（字形轮廓提取与光栅化）
- `crates/gfx/src/atlas.rs`（WebGPU 字形纹理图集）

WASM 把文字变成像素位图后，通过 `__wbg_writeTexture_30e592e8c061c3d9`（`queue.writeTexture`）上传到 WebGPU 纹理图集，再把整屏终端画到 `<canvas id="tern">` 上。

## 服务端 `/fonts` 动态投递通道

WASM 模块 `crates/tern/src/web/fonts.rs`（日志名 `stencil_tern::web::fonts`、函数 `web_font_land`）通过 HTTP 向 `tern web serve` 按需请求服务端宿主机的字体文件。请求路径与日志字面量包含：

- `./fonts?chars=`（按字符查询）
- `&families=`（按字体族过滤）
- `./fonts/`（按 ID 下载）
- `the server named no fonts`
- `a font of the host did not load`
- `a font of the host from the cache`
- `the cache did not keep a font`
- 缓存名 `tern-fonts`

`pkg/client.js` 对应绑定了：

- `Window.caches`（`__wbg_caches_0681678104a6b0bf`）
- `CacheStorage.open`（`__wbg_open_c35e93b027257492`）
- `Cache.match`（`__wbg_match_c9682c7274131c0d`）
- `Cache.put`（`__wbg_put_bbca42771defa466`）

WASM 拿到字体字节后调用 `crates/text/src/fonts.rs` 的 `font_register` 注册进内存字体库。该组字面量在 0.9.18、0.9.21 与 0.9.23 的 `original.wasm` 中均已存在。

## `/fonts` 接口实测

对运行中的 `127.0.0.1:8378`（0.9.26 binary）实测：

| 请求 | 响应头 | 响应体 |
|---|---|---|
| `GET /fonts?chars=4e2d` | `200`，`Content-Type: application/json`，`Content-Length: 63`，`Cache-Control: no-store` | `{"fonts":[{"id":"b76b0433203017ca80401b2ee0dd6935","index":2}]}` |
| `GET /fonts?chars=4e2d&families=Maple%20Mono%20NF%20CN` | 同上 | `{"fonts":[{"id":"b3f8f26efab7c88f4f72cff0fe02a3c8","index":0}]}` |
| `GET /fonts/b76b0433203017ca80401b2ee0dd6935` | `200`，`Content-Type: font/sfnt`，`Cache-Control: private, max-age=31536000, immutable`，`X-Content-Type-Options: nosniff` | `19484784` 字节，对应 WSL `/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc` |
| `GET /fonts/b3f8f26efab7c88f4f72cff0fe02a3c8` | 同上 | `20561696` 字节，对应 WSL `~/.local/share/fonts/maple-win/.../MapleMono-NF-CN-Regular.ttf` |

用 0.9.23 binary 在 `127.0.0.1:18788` 起临时服务发送同样请求，返回完全相同的字体 ID、字节数与响应头。

## 浏览器侧请求未观测到

在新建隔离 profile 中打开页面、输入中文，Playwright `page.on('request')` 未捕获任何 `/fonts` 请求，`caches.keys()` 未列出 `tern-fonts`。canvas 正常显示中文，但具体渲染路径（内嵌字体、缓存字体或系统字体）未经浏览器侧请求记录确认。

因此「浏览器向服务端请求 `/fonts` 并缓存字体」是服务端接口行为与 WASM 字符串字面量支持的推断，不是浏览器侧直接观测到的事实。

## 配置 `font_family` 的生效方式

`settings.json` 的 `font_family` 是终端 grid 的字体族，注释为「empty: the monospace face」。写入 `{"font_family":"Maple Mono NF CN"}` 并重载后，同一区域截图从 25179 字节变为 27617 字节，600×300 区域像素差异 7045/180000（3.91%），canvas 字形确实改变。

改 `--tv-font`／`--mono` CSS 变量、加 `!important`、写 `tern-settings` 都不改变 canvas 内容；`getComputedStyle(canvas).fontFamily` 只反映 canvas 元素自身 CSS，不能用来判断 WASM 绘制结果。

## 对补丁流程的影响

内嵌字体装配（`prepare` → `font_manifest.py` → `assets --official`）在服务端宿主机已安装目标字体且浏览器配置了 `font_family` 的前提下不再必要。此前提交 `5de48ac` 中「Chrome 内核在 canvas 上补绘中文」的解释有误，本轮以 `/fonts` 服务端实测与浏览器未捕获请求的双重证据更正：服务端接口行为已验证，浏览器侧请求路径未确认。
