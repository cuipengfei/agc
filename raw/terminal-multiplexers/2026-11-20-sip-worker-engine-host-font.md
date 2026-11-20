# sip v0.10.0 Worker engine：字体加载路径与宿主字体切换

> Source: Gaurav-Gosain/sip v0.10.0 Go 模块源码（`static/engine/client.js`、`static/engine/engine-webterm.js`、`static/engine/worker.js`、`static/terminal.js`、`server.go`、`docs/extending.md`）；本机 `~/.config/systemd/user/sip.service`；本机隔离 Chromium 实验；sip 服务 journal 中的浏览器 UA
> Collected: 2026-11-20
> Published: Unknown

## 环境

- sip v0.10.0，Worker engine 渲染器，浏览器 Chrome（sip journal 记录 UA 为 `Chrome/157.0.0.0`）。
- 浏览器运行在 Windows 宿主，WSL 内运行 sip 服务；宿主已安装字体 `Maple Mono NF CN`。
- 阅读所用源码位于 Go 模块缓存 `github.com/!gaurav-!gosain/sip@v0.10.0`。
- 隔离实验用本机 `/usr/bin/chromium`，加载 sip 的实际静态资源与页面，不操作既有标签页。

## Worker engine 的字体路径（源码）

主线程把字体族与字体文件清单交给 Worker（`static/engine/client.js`，`init` 消息，56–60 行）：

```js
this.worker.postMessage({
  type: 'init', canvas: off, cols: this.cols, rows: this.rows, dpr: this.dpr,
  scrollback: opts.scrollback ?? 10000, fontFamily: opts.fontFamily, fontSize: opts.fontSize ?? 14,
  fonts: opts.fonts, theme: opts.theme, renderer: opts.renderer, debugNoWebGL2: !!opts.debugNoWebGL2, warmFonts: !!opts.warmFonts, wasmUrl: String(opts.wasmUrl ?? new URL('../dist/engine.wasm', import.meta.url)),
}, [off]);
```

`static/engine/engine-webterm.js`（46–60 行）把 `fonts` 转成 `{ url, weight, style }`，不携带 `family`：

```js
const fonts = (o.fonts || []).map((f) => ({ url: cssUrl(f.source), weight: f.weight, style: f.style })).filter((f) => f.url);
...
this.term = await WorkerTerm.mount(host, {
  cols: 80,
  rows: 24,
  fontFamily: o.fontFamily,
  fontSize: o.fontSize ?? 14,
  fonts,
```

Worker 侧（`static/engine/worker.js`）：

```js
// 160-165 行
// fontFamily may be one name or a CSS family list ("'A', 'B', monospace").
const familyList = () => (/[,'"]/.test(fontFamily) ? fontFamily : `"${fontFamily}"`) + (/monospace\s*$/.test(fontFamily) ? '' : ', monospace');
const firstFamily = () => fontFamily.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
function fontString(style) {
  return `${style & 2 ? 'italic ' : ''}${style & 1 ? 'bold ' : ''}${fontPx}px ${familyList()}`;
}
```

```js
// 985-992 行
async function loadFonts(fonts) {
  if (!fonts?.length || !self.FontFace) return;
  await Promise.all(fonts.map(async (f) => {
    const face = new FontFace(f.family || firstFamily(), `url(${f.url})`, { weight: f.weight ?? '400', style: f.style ?? 'normal' });
    await face.load();
    self.fonts.add(face);
  }));
}
```

要点：

- `fonts` 条目没有 `family` 时，用 `firstFamily()` 作为注册名，即 `fontFamily` 的第一个名称。
- `loadFonts` 只执行 `self.fonts.add(face)`，没有任何移除分支。
- 字体集合属于 Worker 的 `self.fonts`，与页面主线程的 `document.fonts` 互相独立。

字形测量与重绘（`worker.js` 167–186、1194–1212 行）：

```js
function measure() {
  const c = new OffscreenCanvas(64, 64).getContext('2d');
  c.font = fontString(0);
  const m = c.measureText('M');
  ...
}
```

```js
async function applyFont(m) {
  if (m.fontFamily) fontFamily = m.fontFamily;
  if (m.fontSize) fontPx = Math.round(m.fontSize * dpr);
  if (m.fonts) await loadFonts(m.fonts);
  measure();
  x.eng_set_cell(e, cw, ch, ATLAS_W, ATLAS_H);
  ...
  self.postMessage({ type: 'metrics', cw, ch });
}
```

`setOptions` 分支在 `fontSize`、`fontFamily` 或 `fonts` 任一存在时调用 `applyFont`（`worker.js` 1459–1466 行）。Worker 会重新测量 `cw`/`ch` 并重建字形图集；测量结果可能与更新前相同。

sip 页面侧传入的字体清单（`static/terminal.js` 1622–1640 行）只有四个内嵌 JetBrains 文件，没有 `family` 字段：

```js
const font = (face) =>
    `url(static/fonts/JetBrainsMonoNerdFontMono-${face}.woff2) format('woff2')`;
return {
    fontFamily: this.fontFamily,
    fontSize: this.settings.fontSize,
    fonts: [
        { source: font('Regular'), weight: '400', style: 'normal' },
        { source: font('Bold'), weight: '700', style: 'normal' },
        { source: font('Italic'), weight: '400', style: 'italic' },
        { source: font('BoldItalic'), weight: '700', style: 'italic' },
    ],
```

页面默认字体名（`static/terminal.js` 66 行）：

```js
const FONT_FAMILY = "'JetBrainsMono Nerd Font Mono', 'JetBrains Mono', 'Fira Code', Menlo, Monaco, monospace";
```

服务端注入规则（`server.go` 517–532 行）：

```go
if s.config.FontPath != "" {
    family := s.config.FontFamily
    ...
    extra.WriteString(`<style>@font-face { font-family: '`)
    ...
    cfg["fontFamily"] = "'" + family + "', 'JetBrainsMono Nerd Font Mono', monospace"
} else if s.config.FontFamily != "" {
    cfg["fontFamily"] = s.config.FontFamily
}
```

三种部署组合的结果：

| 部署参数 | 页面 `fontFamily` | Worker 内嵌字体注册名 |
|---|---|---|
| 同时给 `--font` 与 `--font-family` | `'<family>', 'JetBrainsMono Nerd Font Mono', monospace` | 第一个名称 `<family>` |
| 只给 `--font-family` | 原样使用该名称 | 第一个名称即该名称 |
| 两者都不给 | 不注入 `fontFamily`，页面取 `FONT_FAMILY` | `JetBrainsMono Nerd Font Mono` |

## 页面字体集合与 Worker 字体集合的分工

两个字体集合各自独立，操作对象必须对应：

- 页面主线程的 `document.fonts` 只承载页面自己的 `@font-face`。Worker engine 下实测其中只有 `JetBrainsMono Nerd Font Mono` 四个条目。
- Worker 的 `self.fonts` 承载 Worker 加载的字体；`loadFonts` 只执行 `self.fonts.add(face)`，同名 Face 已登记时继续生效。
- 因此新增其他名称不会替换已登记的同名字体；要改变 Worker 使用的字体，通过 `setOptions` 修改 `fontFamily` 指向的名称。

## 字体切换的判据

- Worker 的 `term.cw` 与 `term.ch` 分别记录单元格宽度和行高。数值差异反映单元格尺寸变化；不同字体可能使用相同尺寸，实际字形需要结合目视或字体来源检查。
- 画布截图比对受 `setOptions` 触发的 `fit()` 与整帧重绘影响，同一段代码多次运行结果可以不同，不作为判据。


## 已验证的部署改法

1. 修改 `~/.config/systemd/user/sip.service` 的 `ExecStart`，启动命令中不出现 `--font-family`：

```ini
ExecStart=/home/cpf/go/bin/sip -H localhost -p 7682 -- /usr/bin/zsh -l
```

2. 直接编辑单元文件后重载并重启：

重启前用 `systemd-cgls --user-unit sip` 检查单元内进程；当中有需要保留的 Herdr server、pane 或其他进程时，先确保这些进程独立运行或保存工作。默认 `KillMode=control-group` 会在重启时结束该 cgroup 内的全部进程。

```bash
systemd-analyze --user verify /home/cpf/.config/systemd/user/sip.service
systemctl --user daemon-reload
systemctl --user restart sip
```

3. 核实服务确实以新参数运行，并确认页面不再注入字体名：

```bash
ps -p "$(systemctl --user show sip --property=MainPID --value)" -o args=
curl -s http://127.0.0.1:7682/ | grep __sipConfig
```

实测：`ps` 输出为 `sip -H localhost -p 7682 -- /usr/bin/zsh -l`；`curl` 不再匹配到 `__sipConfig`。

4. 刷新 sip 页面，确认渲染器为 Worker engine；在浏览器 Console 执行：

```js
window.sipTerm.webterm.setOptions({
  fontFamily: "'Maple Mono NF CN', monospace"
});
```

5. 验证：

```js
console.table({ width: window.sipTerm.webterm.term.cw, height: window.sipTerm.webterm.term.ch });
```

值与切换前不同，表示相应的单元格宽度或行高已变化；再目视确认字形。本机用户确认字体切换生效。

### 作用域与副作用

- `--font-family` 只影响页面默认字体名，不影响字号、配色与渲染器。
- 去掉后，页面初始字体为内嵌 JetBrains；是否使用宿主字体取决于页面脚本或每页执行一次 Console 设置。
- Console 设置随页面刷新失效，需要重新执行。执行 `Apply & Reconnect` 或刷新会结束 sip 的当前 shell。

### 浏览器取字体的位置

浏览器（Chrome）运行在 Windows 宿主，`setOptions` 指定的字体名由宿主的字体系统解析；WSL 内 `fc-match 'Maple Mono NF CN'` 指向 `/home/cpf/.local/share/fonts/maple-win/MapleMono-NF-CN-Regular.ttf`，该文件不参与 Windows 浏览器取字体。此结论来自部署拓扑（浏览器在宿主、sip 在 WSL）与 `setOptions` 只传字体名的源码路径。

## 可选持久化路径（未实测）

`docs/extending.md` 288–291 行说明以 Go 库方式启动 sip 时，页面脚本可通过 `sip.appearance.set()` 传 `fontFamily`，需要 `CapAppearance` 能力（默认关闭）。`static/terminal.js` 786–787 行显示页面补丁会写入 `opts.fontFamily`，Worker engine 与 xterm 客户端共用该选项入口。本机未采用该路径，也未验证。

## 证据边界

- 本机用户确认字体切换生效；未在 Worker 内做字形级字体来源测量。
- 未验证其他 sip 版本、其他渲染器组合或其他字体名称。
- `window.sipTerm` 是 sip 的内部接口，升级可能变化。

## 跨机器复现清单

```text
1. 宿主安装目标字体。
2. sip 启动命令不要带 --font-family（带 --font 时同理）。
3. systemd-analyze --user verify，然后 daemon-reload、restart。
4. ps 核对运行参数；curl 首页确认无 __sipConfig 字体名。
5. 页面选择 Worker engine，刷新。
6. Console 执行 setOptions({ fontFamily: "'<字体名>', monospace" })。
7. 对比 term.cw / term.ch，再目视字形。
8. 刷新后重做第 6 步，或改用 extrajs/sip.appearance.set 的持久化路径。
```

`sip.service` 的重启会终止其 cgroup 内的全部进程，包括在该 shell 里启动的 Herdr；操作前先转移 Herdr，见 [sip 服务重启的 cgroup 波及范围](2026-11-20-sip-service-cgroup-restart-blast-radius.md)。
