# sip v0.10.0：传输选择、渲染回退与 Worker 绘制

> Source: Gaurav-Gosain/sip v0.10.0 本机 Go 模块缓存及运行进程的 Go build 信息；sip 提交 `e5f532a6802fe51030b1ca936115cacdb0c191af`；内嵌 webterm 提交 `016f9ef5ab6a03873f7bb25d2d0d6bdb99d61787`；IETF RFC 6455、9000、9001、9114、9221；W3C WebTransport Candidate Recommendation Snapshot
> Collected: 2026-11-21
> Published: Unknown

## 版本与来源

本次会话读取运行中的 sip 进程的 Go build 信息，模块版本为 `v0.10.0`。本机 Go 模块缓存的版本元数据给出以下来源；其中 `Time` 是缓存记录中的提交时间。

```json
{"Version":"v0.10.0","Time":"2026-10-26T11:16:50Z","Origin":{"VCS":"git","URL":"https://github.com/Gaurav-Gosain/sip","Hash":"e5f532a6802fe51030b1ca936115cacdb0c191af","Ref":"refs/tags/v0.10.0"}}
```

[engine-vendor.json](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/engine-vendor.json#L1-L4) 记录 webterm 的 `engine` 来源提交为 `016f9ef5ab6a03873f7bb25d2d0d6bdb99d61787`。

## 设置面板的选项

[index.html](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/index.html#L34-L53)：

```html
<select id="transport-select">
    <option value="auto">Auto (prefer QUIC)</option>
    <option value="webtransport">WebTransport (QUIC)</option>
    <option value="websocket">WebSocket</option>
</select>
```

```html
<select id="renderer-select">
    <option value="auto">Auto (prefer WebGL)</option>
    <option value="webgl">WebGL</option>
    <option value="canvas">Canvas</option>
    <option value="dom">DOM</option>
    <option value="vtgl">vtgl (experimental)</option>
    <option value="engine">Worker engine (experimental)</option>
</select>
```

3 个 Transport 选项与 6 个 Renderer 选项组成 18 种可选组合。

## Transport 的选择和回退

[terminal.js](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/terminal.js#L1244-L1265) 的 xterm.js 路径：

```js
const preference = this.client.settings.transport;
this.wantsWebTransport = preference === 'auto' || preference === 'webtransport';
```

```js
if (this.wantsWebTransport) {
    list.push(W.webTransportTransport(() => this.wtUrl, {
        options: () => this.certOptions(),
    }));
}
list.push(W.webSocketTransport(client.urls.wsUrl));
return W.fallback(...list);
```

同一段源码注释写明：`Fall back even when WebTransport was explicitly chosen.` [Worker 网络线程](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/engine/net-worker.js#L104-L109) 使用相同的候选顺序：

```js
const candidates = () => {
  const list = [];
  if (t.wantsWebTransport) list.push(webTransportTransport(() => wtUrl, { options: () => certOptions() }));
  list.push(webSocketTransport(t.wsUrl));
  return fallback(...list);
};
```

[fallback](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/engine/transports.js#L232-L269) 依次尝试候选连接，取第一个连接成功的候选。由以上两处代码推得：`auto` 与 `webtransport` 都先尝试 WebTransport 再尝试 WebSocket；`websocket` 只加入 WebSocket。

[transports.js](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/engine/transports.js#L96-L103) 注释为 `WebTransport over a single bidirectional stream.`，建立连接后调用 `wt.createBidirectionalStream()`。sip [README](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/README.md#L46-L53) 写明 WebTransport 使用 HTTP/3；[server.go](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/server.go#L179-L193) 的 WebTransport 端口默认由网页服务端口加 1，服务日志把协议标为 `QUIC/UDP`。

[terminal.js 的连接状态](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/terminal.js#L1373-L1383) 使用 `WebTransport (QUIC)`、`WebSocket (WebTransport unavailable)` 或 `WebSocket` 名称表示实际连接。

## Renderer 的选择和回退

[webterm.js](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/webterm.js#L92) 中压缩后的 `install` 方法摘录：

```js
async install(){let t=this.options.prefer;return t==="dom"?this.settle("dom"):t==="vtgl"&&await this.tryVtgl()?this.active:(t==="webgl"||t==="auto"||t==="vtgl")&&await this.tryWebgl()?this.active:(t==="canvas"||t==="auto"||t==="webgl"||t==="vtgl")&&await this.tryCanvas()?this.active:this.settle("dom")}
```

按这段代码，`auto` 与 `webgl` 都依次尝试 WebGL、Canvas、DOM；`canvas` 尝试 Canvas 后使用 DOM；`dom` 直接使用 DOM；`vtgl` 先尝试 vtgl，再依次尝试 WebGL、Canvas、DOM。

[terminal.js](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/terminal.js#L1533-L1543) 把 URL 中的 `renderer` 写入当前标签页的首选项，优先于已保存的面板值。该首选项随后仍经过上面的渲染器选择或 Worker engine 回退过程。

[vtgl 加载逻辑](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/terminal.js#L1787-L1820) 默认指定 `webgl2` 和 `harfbuzz`；加载失败时交给 WebGL、Canvas 或 DOM。[Worker engine 加载逻辑](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/terminal.js#L1701-L1709) 在引擎无法启动时打开 xterm.js 客户端，且 [webtermOptions](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/terminal.js#L1645-L1648) 给该回退路径使用 `auto`。

[状态标签](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/terminal.js#L1514-L1524) 区分 `Worker engine`、`Worker engine (Canvas2D)`、`WebGL`、`Canvas` 和 `DOM`。[Apply & Reconnect](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/terminal.js#L2213-L2245) 在 Renderer 选项变化时刷新页面；其他情况应用选项后调用重连。

## Worker engine 的画布与字形

[engine/NOTICE](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/engine/NOTICE#L31-L34)：`libghostty-vt is linked into engine.wasm`。同文件第 6–7 行提到 `engine/native/engine.c` 中的 PNG 解码钩子。

[client.js](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/engine/client.js#L34-L44)：

```js
this.canvas = document.createElement('canvas');
this.canvas.className = 'wt-canvas';
host.append(this.canvas);
const off = this.canvas.transferControlToOffscreen();
this.worker = new Worker(opts.workerUrl ?? new URL('./worker.js', import.meta.url), { type: 'module' });
```

[worker.js](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/engine/worker.js#L1-L5) 的文件开头说明：Worker 持有 `libghostty-vt` 与 frame builder 的 WASM 模块和 OffscreenCanvas；每帧准备绘制数据，把新字形栅格化到 atlas，并发起绘制。[初始化分支](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/engine/worker.js#L1274-L1292) 先尝试 `worker-webgl2`，否则取得 2D context 并使用 `worker-canvas2d`。

[字形代码](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/engine/worker.js#L445-L475) 使用 OffscreenCanvas 的 `fillText` 生成字形像素，再通过 `gl.texSubImage2D` 更新 WebGL 纹理。Canvas 2D 路径在 [paintRow2d](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/engine/worker.js#L693-L723) 绘制背景与文字。图片的纹理和图层处理见 [imageTexture 与 drawImages](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/engine/worker.js#L360-L416)。

## QUIC、HTTP/3 与 WebTransport 标准摘录

[RFC 9000 §1](https://www.rfc-editor.org/rfc/rfc9000#section-1)：

> QUIC packets are carried in UDP datagrams

[RFC 9000 §2](https://www.rfc-editor.org/rfc/rfc9000#section-2) 将 QUIC 流称为 `a lightweight, ordered byte-stream abstraction`，并区分单向流和双向流。[§2.2](https://www.rfc-editor.org/rfc/rfc9000#section-2.2) 说明端点向应用提供有序字节流、缓存乱序到达的数据，流数据在丢包后可被重传。

[RFC 9001 §4.2](https://www.rfc-editor.org/rfc/rfc9001#section-4.2)：

> This document describes how TLS 1.3 [TLS13] is used with QUIC.

同节允许满足 QUIC 所需特性的更新 TLS 版本，并规定客户端不得提供早于 TLS 1.3 的版本。

[RFC 9114 §1.2](https://www.rfc-editor.org/rfc/rfc9114#section-1.2) 将 HTTP/3 定义为 `a mapping of HTTP semantics over the QUIC transport protocol`，说明 HTTP/3 依赖 QUIC 的可靠、有序的逐流交付；同节写明拥塞控制作用于整个连接。[§2](https://www.rfc-editor.org/rfc/rfc9114#section-2) 说明一条流阻塞或丢包不会阻止其他流取得进展。

[RFC 9221 §3](https://www.rfc-editor.org/rfc/rfc9221#section-3) 规定发送 QUIC DATAGRAM 帧前须收到对端通告的非零 `max_datagram_frame_size`。[§5.2](https://www.rfc-editor.org/rfc/rfc9221#section-5.2) 说明 DATAGRAM 帧在检测到丢失时不重传；[§5.4](https://www.rfc-editor.org/rfc/rfc9221#section-5.4) 说明它仍受 QUIC 连接的拥塞控制。DATAGRAM 帧与承载 QUIC 数据包的 UDP 数据报分属不同层次。

[W3C WebTransport Candidate Recommendation Snapshot，2026-07-30](https://www.w3.org/TR/2026/CR-webtransport-20260730/) 将其定义为一组 ECMAScript API，用于浏览器与服务器通过 WebTransport over HTTP/3 发送和接收数据。sip 的终端数据使用上文所示的一条双向流；协议提供 DATAGRAM 能力与 sip 实际采用何种终端消息路径分开判断。

[RFC 6455 §1.1](https://www.rfc-editor.org/rfc/rfc6455#section-1.1) 将 WebSocket 描述为在 TCP 之上运行的双向通信协议。[sip 的地址生成逻辑](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/static/terminal.js#L1174-L1182) 在 HTTPS 页面选择 `wss:`，在 HTTP 页面选择 `ws:`。

[sip server.go](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/server.go#L228-L239) 的 HTTP/3 服务设置 `EnableDatagrams: true`。[handlers.go](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/handlers.go#L317-L325) 为会话调用一次 `wtSession.AcceptStream(ctx)`，并在[后续代码](https://github.com/Gaurav-Gosain/sip/blob/e5f532a6802fe51030b1ca936115cacdb0c191af/handlers.go#L374-L383)通过 `writeFramed(stream, ...)` 发送终端消息。

## 证据边界

- 18 个组合的含义来自源码中的两个选择路径与面板选项，未逐项切换实测。
- 本次浏览器目标查询超时，未读取用户当前页面的 Transport、Renderer 或硬件 GPU 状态。
- Kitty PNG 解码和绘制有上述源码路径；本次未执行图片显示或键盘协议专项测试。
- 2026-11-20 的鼠标隔离实验和用户观察另见 [焦点刷新期间的鼠标松开丢失](2026-11-20-sip-herdr-focus-refresh-mouseup-loss.md)，不作为本次新增实测。
