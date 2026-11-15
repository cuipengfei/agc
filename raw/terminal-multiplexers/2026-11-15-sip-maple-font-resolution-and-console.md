# sip v0.10.0 字体匹配与 Chrome Console 验证

> Source: [sip v0.10.0 字体选项与客户端](https://github.com/Gaurav-Gosain/sip/blob/v0.10.0/static/terminal.js)；[webterm 字体加载源码](https://github.com/Gaurav-Gosain/webterm/blob/45eb443009edc506e8be8308fa9007740f4bb451/src/fonts.ts)；[sip 页面扩展文档](https://github.com/Gaurav-Gosain/sip/blob/v0.10.0/docs/extending.md)；2026-11-15 本会话隔离浏览器测试工具输出
> Collected: 2026-11-15
> Published: Unknown

## 官方源码摘录

sip v0.10.0 的 `webtermOptions()` 同时传入 `this.fontFamily` 和四个内置 JetBrains 字体；各条 `fonts` 只指定 `source`、`weight`、`style`，没有指定 `family`：

```js
fonts: [
    { source: font('Regular'), weight: '400', style: 'normal' },
    { source: font('Bold'), weight: '700', style: 'normal' },
    { source: font('Italic'), weight: '400', style: 'italic' },
    { source: font('BoldItalic'), weight: '700', style: 'italic' },
],
```

webterm 的 `loadFonts` 使用配置字体列表中的第一个名称作为缺省值：

```js
const family = firstFamily(fontFamily);
new FontFace(spec.family ?? family, spec.source, {
  weight: spec.weight ?? '400',
  style: spec.style ?? 'normal',
}).load()
```

sip 官方扩展文档将 `window.sipTerm` 列为供一次性检查和浏览器测试使用的内部接口，接口可能随版本变化。

## Windows Chrome 隔离测试

测试使用 sip v0.10.0、Windows Chrome `157.0.8103.39`、Windows 已安装的 `Maple Mono NF CN`。访问独立浏览器页面时拦截终端连接，没有连接或修改用户现有标签页。使用 Chrome DevTools Protocol 的 `CSS.getPlatformFontsForNode` 测量测试文字 `ABC abc 0123`。

- 现有服务配置 `--font-family "Maple Mono NF CN, monospace"`：DOM 终端文字命中 `JetBrainsMonoNFM-Regular`，`isCustomFont: true`。
- 移除四个以 `Maple Mono NF CN` 注册的网页字体并调用 `setOptions` 后：DOM 终端文字命中 `MapleMono-NF-CN-Regular`，`isCustomFont: false`；测试报告 `removed: 4`、`sameTerminal: true`。
- 相同操作在 Canvas 和 WebGL 的隔离页面中均报告 `removed: 4`、`sameTerminal: true`，文字图层或画布像素发生变化。这两项记录像素变化，未直接测量画布里每个字形的实际字体。
- 另起隔离 sip 服务，指定 `--font /home/cpf/.local/share/fonts/maple-win/MapleMono-NF-CN-Regular.ttf --font-family 'Maple Mono NF CN'`：测试文字仍命中 `JetBrainsMonoNFM-Regular`。移除程序注册的字体后，测试文字命中 `MapleMono-NF-CN-Regular`，`isCustomFont: true`。

## 临时 Console 操作

在现有 `--font-family "Maple Mono NF CN, monospace"` 配置下，操作当前页的字体集合并重新应用字体选项：

```js
[...document.fonts]
  .filter(face => face.family.replace(/^['"]|['"]$/g, '') === 'Maple Mono NF CN')
  .forEach(face => document.fonts.delete(face));

window.sipTerm.webterm.setOptions({
  fontFamily: "'Maple Mono NF CN', monospace"
});
```

隔离测试使用同样的字体筛选、`document.fonts.delete` 与 `setOptions`；用户现有连接未操作。移除的是当前页面登记的网页字体，Windows 安装的字体文件不受影响。当前页刷新后需要重新执行；刷新会断开原连接，sip 直接启动的 shell 会结束，Herdr 的后台会话可重新连接。字体更新调用可能使终端重新计算尺寸。

## 未验证

未在用户的现有标签页执行上述 Console 操作；未验证其他 sip 版本、`vtgl`、Worker engine 或其他字体名称。TUIOS Web 的网页字体实际匹配未在本轮测量。
