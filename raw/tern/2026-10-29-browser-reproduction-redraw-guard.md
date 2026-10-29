# Tern 网页中文复现工具的判定误报与重绘证据修正

> Source: 本机 2026-10-29 实测。工具源码位于 `/home/cpf/code-inside/agc/tools/tern-maintain/`；报告产物位于 `/tmp/tern-0.9.7-check-nCMXWP/`；原始命令为 `bun cli.mjs markdown-windows --binary ~/.local/share/tern-native-0.9.7/tern --assets <站点> --out <报告>`。
> Collected: 2026-10-29

## 误判实例

`original-markdown-v4.json` 的结论字段与实际观测不一致：

```json
{"conclusion":"reproduced","reason":"CJK page stopped responding, its post-open frame stalled, or visible interaction was ignored","mounted":{"ascii":true,"cjk":true},"frames":{"ascii":true,"cjk":true},"cjkProgress":{"delayedFrame":true,"visibleInteraction":false,"selectionChanged":false,"frameChanged":null,"interactionError":"driver command timed out: visible-interaction"},"daemon":{"status":"ok","panes":2}}
```

同一报告的顺序记录：

```text
{"name":"cjk_progress","status":"failed","details":"delayedFrame=true, visibleInteraction=false; driver command timed out: visible-interaction"}
```

页面已挂载、中文首帧已经出现、延迟画面已经变化、daemon 正常，唯一失败项是工具自身的命令超时。该报告把工具超时写成了应用冻结。

超时的直接原因在调用处：`driver.rpc(command, timeoutMs)` 需要两个参数，调用只传了消息对象，外层定时器收到 `undefined` 后立即触发。修正方式为同时传入外层期限：

```js
const interactionMs = budget('cjk_interaction', 15000);
await driver.rpc({ cmd: 'visible-interaction', timeoutMs: interactionMs - 1000 }, interactionMs);
```

## 三类不可靠证据

| 证据 | 为何不足以判定冻结 |
|---|---|
| 间隔数秒的两张截图相同 | 健康的静态 Markdown 页不会自行改变画面；光标闪烁也可能让相同内容的两张截图不同 |
| `document.getSelection()` 前后相同 | 输入目标是 WebGPU `canvas#tern`，DOM 选区不表示画布内的文本光标位置 |
| 驱动命令超时或截图失败 | 失败发生在观测通道；应用状态未取得 |

## 修正后的观测

在隔离浏览器页面安装渲染探针，只修改本次运行的浏览器，不触碰服务资源或 WASM：

```js
await page.addInitScript(() => {
  if (typeof GPUQueue === 'undefined') return;
  const probe = window.__ternRenderProbe = { submissions: 0 };
  const submit = GPUQueue.prototype.submit;
  GPUQueue.prototype.submit = function (...args) {
    const result = Reflect.apply(submit, this, args);
    probe.submissions++;
    return result;
  };
});
```

页面函数 `READ_INTERACTION` 返回应用状态、`canvas.width`、`canvas.height`、`innerWidth`、`innerHeight`、`devicePixelRatio` 与 `submissions`。输入采用 viewport 调整，宽度与高度分别增加 80 与 40；随后每 100 毫秒读取一次，直到同时满足：

```js
after.canvas.width === Math.round(target.width * after.viewport.scale)
after.canvas.height === Math.round(target.height * after.viewport.scale)
after.submissions > before.submissions
```

真实 Windows Chrome 的实测数值：

```json
{"cjkProgress":{"delayedFrame":true,"visibleInteraction":true,"redraw":{"before":{"canvas":{"width":1280,"height":720},"submissions":328},"after":{"canvas":{"width":1360,"height":760},"submissions":334}},"interactionError":null},"daemon":{"status":"ok","panes":2},"wasmErrors":[],"cleanup":{"ok":true,"errors":[]}}
```

## 结论分类

| 结论 | 条件 | 退出码 |
|---|---|---|
| `reproduced` | 有效 ASCII 基线之后，中文页面状态查询无响应 | 0 |
| `not_reproduced` | 中文页面仍响应、首帧确实出现、viewport 输入后 canvas 尺寸更新且有新的 GPU 提交 | 0 |
| `not_run` | 前置条件不足、驱动超时、未观察到应用重绘、观测通道失败 | 2 |

`not_run` 必须带 `reason`。报告结构由 `check-types.mjs` 校验：`not_run` 以外的结论要求同一 `fixturePath` 与 `ascii_markdown_pane`、`pane_closed`、`cjk_appended`、`cjk_markdown_pane` 四个成功阶段；`not_reproduced` 还要求 `cjkProgress.visibleInteraction` 为 true；`reproduced` 要求 `mounted.ascii` 为 true 且 `mounted.cjk` 为 false。

## 覆盖范围

修正后定向测试运行 `bun test windows-browser.test.mjs check-types.test.mjs`：

```text
 22 pass
  0 fail
Ran 22 tests across 2 files.
```

全套 `bun test`：

```text
 91 pass
  0 fail
Ran 91 tests across 10 files.
```

`bun run check` 输出：

```text
check: 32 modules parsed, 4 deployment records scanned, TypeScript passed
```

回归覆盖健康静态页面、未观察到重绘、驱动输入失败、页面状态查询无响应、`open` 返回 ID 与目标文件不一致、原版资源私有装配六类情形。驱动输入失败与未观察到重绘分别归类为 `not_run` 与 `not_run`；页面状态查询无响应归类为 `reproduced`。

## 证据边界

- 新增判据在 0.9.7 仅字体版的一个 Windows Chrome 会话中取得上表数值；0.9.7 原版尚未用该判据复跑。
- 该检查覆盖响应、画面变化、应用重绘与 GPU 提交；不检查中文内容语义、字体字形或完整 Markdown 渲染结果。
- 页面截图差异保留为附加观测，不作为结论条件。
- cleanup 结果独立记录；报告校验不因 cleanup 失败改变结论。
