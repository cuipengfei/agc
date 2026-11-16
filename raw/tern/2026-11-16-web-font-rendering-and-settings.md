# Tern 网页端中文渲染路径与终端字体设置

> Source: 本机 Tern 0.9.21 与 0.9.23 官方 WASM（`~/.local/share/tern-web-0.9.21-original/pkg/original.wasm`、`~/.local/share/tern-web-0.9.23-original/pkg/original.wasm`）、`~/.local/share/tern-web-0.9.23-original/initial.bin`、`fonts.py` 与 `analyze` 输出、Windows Chrome（`Chrome/157.0.0.0`）经 Playwright 的实测截图与 console 日志、`~/.local/share/tern-web-0.9.23/` 服务页面响应
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

## canvas 字形回退实测

在 Windows Chrome 的画布上用同一句中文做对照：

| 场景 | 深色像素数（区域 60×50） |
|---|---:|
| `48px "Ioskeley Mono Term"` + `中` | 510 |
| 同字体 + `a` | 270 |
| 同字体 + `□` | 186 |
| `48px monospace` + `中` | 262 |
| 同字体 + `a` | 131 |

内嵌字体没有 `中` 的字形时，画布仍绘出笔画，轮廓与 `□` 不同，说明由系统字体补绘。Windows 侧存在 `/mnt/c/Windows/Fonts/msyh.ttc`、`simhei.ttf`、`simsun.ttc`、`Deng.ttf`、`Dengb.ttf`；用户字体目录 `C:\Users\<USER>\AppData\Local\Microsoft\Windows\Fonts\` 里已有多份 `MapleMono-NF-CN-*.ttf`。

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

上述对照在新建的隔离浏览器 profile 里完成，隔离 profile 的 `localStorage` 只有 `tern-web-token`，没有 `settings.json`，因此「无 `font_family`」一行代表默认状态。

用户自有 Chrome profile 的情况不同：事故前的 `settings.json` 已含 `font_family`、`font_family_bold`、`font_family_italic`、`font_family_bold_italic` 四项，值均为 `Maple Mono NF CN`（见 `019306.ldb` 的 778 字节记录）。用户在该 profile 里看到中文时，字体栈首位已是 Maple，不能把那次显示归因为默认雅黑回退，也不能据此证明字体装配不必要。系统侧另有事实：`C:\Users\<USER>\AppData\Local\Microsoft\Windows\Fonts\` 已有多份 `MapleMono-NF-CN-*.ttf`。

## 无效路径

| 尝试 | 结果 |
|---|---|
| 改 `--tv-font`／`--mono` CSS 变量 | `getComputedStyle(root)` 显示值已变，canvas 像素不变 |
| 加 `:root { --tv-font: ... !important; }` 样式表 | 同上，canvas 内容不变 |
| 写 `localStorage['tern-settings']` | 不是 web 端键，无效果 |
| 以 `getComputedStyle(canvas).fontFamily` 判定 | 只反映 canvas 元素自身 CSS，与 WASM 绘制的字无关 |

## 边界

- `font database loaded count=0` 说明浏览器沙箱里 WASM 的 fontdb 为空，读不到系统字体文件；中文由 Chrome 内核在绘制缺字形字符时补绘。
- 本记录只覆盖 web 端 canvas 文本，不涉及原生端 fontconfig 行为。
- Chrome 的字体回退顺序由 `font_family` 与内核默认栈共同决定，本记录未穷举所有平台。
