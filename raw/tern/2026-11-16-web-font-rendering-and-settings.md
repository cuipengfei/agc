# Tern 网页端中文渲染路径与终端字体设置

> Source: 本机 Tern 0.9.21 与 0.9.23 官方 WASM（`~/.local/share/tern-web-0.9.21-original/pkg/original.wasm`、`~/.local/share/tern-web-0.9.23-original/pkg/original.wasm`）、`~/.local/share/tern-web-0.9.23-original/pkg/client.js`、`~/.local/share/tern-web-0.9.23-original/initial.bin`、`~/.local/share/tern-native-0.9.26/tern`、`fonts.py` 与 `analyze` 输出、Windows Chrome（`Chrome/157.0.0.0`）经 Playwright 的实测截图与 console 日志、`127.0.0.1:8378/fonts` 接口实测响应
> Collected: 2026-11-16
> Published: Unknown

## 内嵌字体与 CJK 覆盖

`fonts.py` 对 0.9.23 的 `initial.bin` 统计出 8 个内嵌字体，CJK 计数全为 0：

| 字体 | length | 字符映射数 | CJK |
|---|---:|---:|---:|
| Symbols Nerd Font | 2538772 | 10624 | 0 |
| Geist | 169055 | 728 | 0 |
| Ioskeley Mono Term | 1501964 | 7564 | 0 |
| Ioskeley Mono Term Medium | 1499864 | 7564 | 0 |
| Excalifont | 61730 | 212 | 0 |
| Inter Variable | 187474 | 1543 | 0 |
| DejaVu Sans | 191450 | 1579 | 0 |
| Latin Modern Math | 733736 | 2045 | 0 |

`中`、`文`、`你`、`好`、`日`、`本`、`語` 样本在全部字体中均无映射。

## 字体族回退列表不是版本差异

0.9.21 与 0.9.23 的 `original.wasm` 都含同一段字体族列表，位于 `text_layout`／`text_shape` 附近，前面紧邻 `cannot read installed font`：

```
Microsoft YaHei, Microsoft YaHei UI, DengXian, SimSun,
Noto Sans CJK SC, Noto Sans SC, Source Han Sans SC, Source Han Sans CN,
WenQuanYi Micro Hei, WenQuanYi Zen Hei, Droid Sans Fallback,
AR PL UMing CN, PingFang SC, Hiragino Sans GB
```

偏移量：`Microsoft YaHei` 在 0.9.21 为 51362068、在 0.9.23 为 51291983；`cannot read installed font` 分别为 51361992 与 51291907。同一区域另有两个字符串 `cannot parse installed font`（0.9.23 @ 51292935）与 `font database loaded`。

两版 WASM 的 `stencil_text` 出现 8 次、`fontdb` 2 次、`text_layout` 2 次、`text_shape` 1 次、`--tv-font` 280 次、`font_family` 30 次，计数完全一致。两版 changelog 里关于字体回退的条目都位于 `## 0.2.3` 段：`Added color emoji, COLR and OpenType SVG glyph rendering and system font fallback on Linux`。

因此不能从这段列表推出「0.9.23 新增了宿主字体回退」。

## 浏览器内的实际运行状态

Windows Chrome（User-Agent `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/157.0.0.0`）打开 `127.0.0.1:8378` 后，console 记录：

- `INFO stencil_text::backend::portable::system: font database loaded count=0 elapsed=0ns`
- `INFO stencil_gfx: gpu adapter adapter= backend="WebGPU" ... max_texture_dimension_2d=16384 timestamp_query=true`
- `INFO stencil_tern::daemon::websocket: websocket daemon connected`
- `INFO stencil_window::window: rendering gpu= (WebGPU)`
- `INFO stencil_platform::web::shared: window created width=1399.2000732421875 height=1182.4000244140625 scale=1.25`

页面侧事实：

| 项 | 值 |
|---|---|
| `document.querySelectorAll('canvas').length` | 1 |
| canvas id | `tern` |
| `document.fonts.size` | 0 |
| `[...document.fonts]` | 空数组 |
| `getComputedStyle(canvas).fontFamily` | `"Noto Sans SC"` |
| `getComputedStyle(document.body).fontFamily` | `"Noto Sans SC"` |
| Shadow DOM 宿主数量 | 0 |
| 运行时 `--mono`／`--sans`／`--tv-font` | 空字符串 |
| 页面 HTML 与 `pkg/stencil_tern_web.js` 中的 `font-family` | 0 处 |
| `pkg/stencil_tern_web.js` 中的 `queryLocalFonts`／`FontData` | 0 处 |

WASM 的 CSS 里另有静态定义：`--mono: 'Ioskeley Mono Term', ui-monospace, 'SF Mono', SFMono-Regular, Menlo, monospace;`、`:root { --tv-font: var(--mono); }`。

## WASM 光栅化与服务端 `/fonts` 动态投递通道

`pkg/client.js` 中 `CanvasRenderingContext2D` 的 `fillText` 与 `measureText` 出现次数均为 0；页面 `<canvas id="tern">` 获取的是 WebGPU 上下文，WASM 内嵌 `harfrust-0.12.0`、`skrifa-0.44.0` 与 `crates/gfx/src/atlas.rs`，由 WASM 在内存里完成文本排版与字形光栅化，再经 `__wbg_writeTexture_30e592e8c061c3d9`（`queue.writeTexture`）上传到 WebGPU 纹理图集渲染。

WASM 模块 `crates/tern/src/web/fonts.rs`（`stencil_tern::web::fonts`、`web_font_land`）通过 HTTP 向 `tern web serve` 按需请求服务端宿主机的字体文件，请求路径与日志字面量包含 `./fonts?chars=`、`&families=`、`./fonts/`、`the server named no fonts`、`a font of the host did not load`、`a font of the host from the cache`、`the cache did not keep a font` 与缓存名 `tern-fonts`；`pkg/client.js` 对应绑定了 `Window.caches`（`__wbg_caches_0681678104a6b0bf`）及 `CacheStorage.open`（`__wbg_open_c35e93b027257492`）、`Cache.match`（`__wbg_match_c9682c7274131c0d`）、`Cache.put`（`__wbg_put_bbca42771defa466`），WASM 拿到字体字节后调用 `crates/text/src/fonts.rs` 的 `font_register` 注册进内存字体库。该套字符串在 0.9.18、0.9.21 与 0.9.23 的 `original.wasm` 中均已存在。

对本机运行中的 `127.0.0.1:8378`（WSL `tern web serve`）实测：

| 请求路径 | 响应状态与类型 | 返回内容与对应 WSL 本机字体文件 |
|---|---|---|
| `GET /fonts?chars=4e2d&token=<REDACTED>` | 200，`application/json` | `{"fonts":[{"id":"b76b0433203017ca80401b2ee0dd6935","index":2}]}` |
| `GET /fonts/b76b0433203017ca80401b2ee0dd6935?token=<REDACTED>` | 200，`font/sfnt`，`19484784` 字节 | OpenType font collection（`NotoSansCJKjp-Regular`），对应 WSL `/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc`（`19484784` 字节） |
| `GET /fonts?chars=4e2d&families=Maple%20Mono%20NF%20CN&token=<REDACTED>` | 200，`application/json` | `{"fonts":[{"id":"b3f8f26efab7c88f4f72cff0fe02a3c8","index":0}]}` |
| `GET /fonts/b3f8f26efab7c88f4f72cff0fe02a3c8?token=<REDACTED>` | 200，`font/sfnt`，`20561696` 字节 | TrueType Font data，对应 WSL `/home/cpf/.local/share/fonts/maple-win/.../MapleMono-NF-CN-Regular.ttf`（`20561696` 字节） |

两项 `/fonts/<id>` 响应头均带 `Cache-Control: private, max-age=31536000, immutable`。因此不传 `--assets` 时，默认状态的中文来自 WSL 服务端的 `/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc`，配置 `font_family` 后的 `Maple Mono NF CN` 来自 WSL 服务端的 `~/.local/share/fonts/`。

## 终端字体设置

`settings.json` 是 web 端的实际设置键，字段 `font_family` 的注释为 grid 的字体族，空值使用内置字体：

```
/// The grid's font family; empty: the monospace face.
font_family: String::new(),
```

WASM 端 `Settings::load` 通过 `local_storage().and_then(|storage| storage.get_item(FILE)...)` 读取，`const FILE: &str = "settings.json";`。

实测对照（同一页面、同一入口、同一机器）：

| 设置 | 截图像素 | 截图 SHA-256 |
|---|---:|---|
| 无 `font_family` | 25179 字节 | `1e56e1702edec4848e3b6f87f87757cb326840a52fdbab224f225b36d8aa6a3f` |
| `{"font_family":"Maple Mono NF CN"}` | 27617 字节 | `c56bd2c6ba2c953d4a8cde0a01dc5c357477bf1095ef72717a4873f158df4619` |

固定文本 `echo 你好世界` 的截图在 600×300 区域内像素差异 7045/180000，占 3.91%，字形确实变化。

上述对照在新建的隔离浏览器 profile 里完成，隔离 profile 的 `localStorage` 只有 `tern-web-token`，没有 `settings.json`，因此「无 `font_family`」一行代表默认状态（服务端投递 `NotoSansCJK-Regular.ttc`），设入 `Maple Mono NF CN` 后服务端投递 `MapleMono-NF-CN-Regular.ttf`。

用户自有 Chrome profile 的情况：事故前的 `settings.json` 已含 `font_family`、`font_family_bold`、`font_family_italic`、`font_family_bold_italic` 四项，值均为 `Maple Mono NF CN`（见 `019306.ldb` 的 778 字节记录），因此该 profile 会直接向服务端请求 `&families=Maple%20Mono%20NF%20CN` 并加载 WSL 本机的 Maple 字体。

## 无效路径

| 尝试 | 结果 |
|---|---|
| 改 `--tv-font`／`--mono` CSS 变量 | `getComputedStyle(root)` 显示值已变，canvas 像素不变 |
| 加 `:root { --tv-font: ... !important; }` 样式表 | 同上，canvas 内容不变 |
| 写 `localStorage['tern-settings']` | 不是 web 端键，无效果 |
| 以 `getComputedStyle(canvas).fontFamily` 判定 | 只反映 canvas 元素自身 CSS，与 WASM 绘制的字无关 |

## 边界
- `font database loaded count=0` 说明浏览器沙箱里 WASM 启动时无法直接枚举本地磁盘字体；后续遇到缺字或配置的 `font_family` 时，由 `stencil_tern::web::fonts` 向 `tern web serve` 的 `/fonts` 接口按需拉取服务端宿主机的字体文件，注册进 WASM 内存后通过 WebGPU 渲染到 canvas。
- 网页端能否使用 `Maple Mono NF CN` 取决于运行 `tern web serve` 的服务端宿主机（本机为 WSL）是否安装了该字体，以及浏览器 `localStorage['settings.json']` 是否配置了 `font_family`。
- 0.9.26 原版已按同一无补丁方式部署运行：安装包 SHA-256 `5fc0e7e8345faf806d2263fa4013ad70e03467f5ee25fd26da3c2c08cdb29dad`，`tern/tern` 为 `207215912` 字节、版本串 `tern 0.9.26 (6a1aeb9)`、SHA-256 `1691d23905417bc338e04a6db199210bbc9e5651c792a6d1a27ee67b78e79218`，页面 preload 指向 `https://build.stencil.so/web/tern/0.9.26/stencil_tern_web_bg.wasm`。
