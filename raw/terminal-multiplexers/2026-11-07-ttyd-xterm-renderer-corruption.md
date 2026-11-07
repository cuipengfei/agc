# ttyd 与 xterm.js 渲染器选择、色块现象证据摘录

- Source: https://github.com/tsl0922/ttyd/blob/1.7.7/man/ttyd.1 ; https://github.com/tsl0922/ttyd/blob/1.7.7/html/src/components/terminal/xterm/index.ts ; https://github.com/tsl0922/ttyd/blob/1.7.7/html/package.json
- Collected: 2026-11-07
- Published: Unknown（ttyd 1.7.7 分支文件）

## ttyd 1.7.7 html/package.json 的 xterm 依赖行（原文直抄，`grep -n 'xterm' html/package.json`）

```text
55:    "@xterm/addon-canvas": "^0.6.0",
56:    "@xterm/addon-fit": "^0.9.0",
57:    "@xterm/addon-image": "^0.7.0",
58:    "@xterm/addon-unicode11": "^0.7.0",
59:    "@xterm/addon-web-links": "^0.10.0",
60:    "@xterm/addon-webgl": "^0.17.0",
61:    "@xterm/xterm": "^5.4.0",
```

## ttyd 1.7.7 渲染器选择源码事实（html/src/components/terminal/xterm/index.ts 摘读）

- 终端初始化读取 `rendererType` 选项；值为 `webgl` 时加载 `@xterm/addon-webgl`（import 动态分支），`canvas` 时加载 `@xterm/addon-canvas`，默认/显式 `dom` 时都不加载任何渲染 addon（xterm 内置 DOM 渲染）。
- 各分支加载完成后分别 `console.log('[ttyd] webgl renderer loaded')` / `'[ttyd] canvas renderer loaded'`。
- URL 查询参数在 `index.ts` 侧逐项覆盖对应选项，故页面地址可附加 `rendererType=canvas` 或 `rendererType=webgl` 切换。
- ttyd 手册（man/ttyd.1）`rendererType` 行原文要点：默认 `webgl`；可选值 `dom` / `canvas` / `webgl`。

## xterm.js 官方 `clearTextureAtlas()` 文档要点（https://xtermjs.org/docs/api/terminal/classes/terminal/#cletexturedatlas 2026-11-07 读取）

- 接口效果：清除所有字形纹理缓存并触发重渲染，官方明确说明用于「字符渲染出问题时」的恢复（"Clears all textured atlas data"，适用场景包括纹理受损）。
- 文档附带一个已知场景记录：Chromium/NVIDIA 组合在系统休眠恢复后可能出现纹理缓存损坏。恢复途径包括调用该接口或销毁重建终端。

## 本机复审记录（2026-11-07，WSL Ubuntu + Windows 11 Host Chrome 156）

### 用户报告的现象（会话原文）

> ttyd 网页里 OMP 等的 TUI 输出偶发显示为彩色像素块而非正常文字；把浏览器窗口调整一下尺寸即可自行恢复正常。发生频率低。

### ttyd 进程命令行（`procs ttyd` 输出，2026-11-07）

```text
/usr/bin/ttyd -W -p 7681 -T xterm-256color -t enableSixel true -t fontSize 14 -t fontFamily \"Maple Mono NF CN, monospace\" -I /home/cpf/.local/share/ttyd/index-osc52.html login -f cpf
```

`/usr/bin/ttyd` 与 `/home/cpf/.local/bin/ttyd` 版本号相同。

### 用户提供的浏览器 Console 日志（canvas 切换成功实测，2026-11-07）

```text
[ttyd] websocket connection opened
[ttyd] canvas renderer loaded
[ttyd] Sixel enabled
[ttyd] setting Unicode version: 11
[ttyd] option: fontSize=14
[ttyd] option: fontFamily=\"Maple Mono NF CN, monospace\"
[ttyd] option: theme={...}(主题色 JSON 略)
```

该页 URL 为原 URL 末尾追加 `&rendererType=canvas`。另有 ttyd 自带的 `<meta name="apple-mobile-web-app-capable" content=\"yes\">` 弃用警告（无害）。

### 待验证交叉假设

- 用户 ttyd 启动参数含 `-t enableSixel true`；若 canvas 模式下色块仍复发，下一优先验证为追加 `&enableSixel=false` 并观察 Console 是否出现 `[ttyd] Sixel enabled`（出现即说明 sixel 路径仍开启）。布局倾向：色块若复发时伴随图片位置异常，sixel 路径嫌疑升高。
- 若 canvas 下长期不复发，说明 WebGL 字形缓存路线被成功绕开；可回验 WebGL renderer + 升级后的 NVIDIA 驱动 (621.14) 是否根治。

### 本机 ttyd 版本与驱动档案（与 raw/2026-11-07-chromium-gpu-driver-bug-list.md 互补）

- nvidia-smi 驱动号码：580.88（Windows 驱动版本 32.0.15.8088，安装日期 2025-07-27，`Win32_VideoController`）。
- NVIDIA app 已安装于 `/mnt/c/Program Files/NVIDIA Corporation/`。
- 官网 Game Ready 最新版本 621.14 WHQL，发布 2026-11-04，含 GeForce RTX 3050 Laptop 支持；升级路径：NVIDIA app Drivers 页检查更新 → 自定义安装 → 勾选执行清洁安装 → 重启。
- 驱动升级不改变 Chromium 台账两条 workaround 的挂载（两条均无 `driver_version` 区间）；是否根治色块只能实测。
