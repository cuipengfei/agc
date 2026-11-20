# OMP hook-status footer：主题着色、变化提示与开销实测

> Source: 本机会话源码阅读（OMP 19.0.1 的 `@oh-my-pi/pi-tui` 与 `@oh-my-pi/pi-coding-agent`）与隔离实测，2026-11-20
> Collected: 2026-11-20
> Published: 2026-11-20

## setStatus 的渲染位置

`pi-tui/src/status-line/component.ts` 的主状态栏是 editor top border 的 segment bar（`getTopBorder`），`ctx.ui.setStatus()` 写入的是 hook-status 行（`render` 读取 `#hookStatuses`）。`statusLine.showHookStatus` 控制这一行是否渲染，本机 `~/.omp/agent/config.yml` 为 `true`。

`pi-tui/src/chrome/shared.ts` 的 `sanitizeHookStatusText` 在写入前清洗文本；本次实测它保留 SGR 参数：

- `\x1b[5m`（闪烁开）与 `\x1b[25m`（闪烁关）原样通过；
- `\x1b[48;2;42;47;65m`（背景色）原样通过。

## 主题着色接口

`pi-tui/src/theme/theme-class.ts` 的实例方法：

```typescript
theme.fg(token, text)      // 前景色，token 为主题颜色名
theme.bg(token, text)      // 背景色
theme.bold(text)
```

`~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/extensibility/extensions/types.ts` 的 `ExtensionUIContext` 暴露 `theme` 字段，扩展在事件回调的 `ctx.ui.theme` 取得同一主题单例。

实测：同一进程内 `setTheme("dark-tokyo-night")` 与 `setTheme("light-tokyo-night")` 后分别取样，`theme.fg("success", "X")` 输出：

```text
dark  "\u001b[38;2;158;206;106mX\u001b[39m"
light "\u001b[38;2;88;117;57mX\u001b[39m"
```

`theme.fg("muted", "X")`：

```text
dark  "\u001b[38;2;81;89;125mX\u001b[39m"
light "\u001b[38;2;97;114;176mX\u001b[39m"
```

`theme.bg("selectedBg", "X")` 在 dark-tokyo-night 下前缀为 `\u001b[48;2;42;47;65m`。

## 终端不渲染 SGR 闪烁的实测

用户在普通 shell 面板（不经 OMP 绘制层）运行：

```bash
printf '\033[5mBLINK\033[25m static \033[38;2;74;222;128mGREEN\033[0m\n'
```

观察结果：`GREEN` 显示为绿色，`BLINK` 不闪。该链路为 herdr 面板内的 pts/18。

早先一次错误的验证方法：直接向 `/dev/pts/18` 写入测试行。写入成功，但 OMP 全屏应用持续整屏重绘，该行在下一帧被覆盖，无法用于判断终端能力。

## 定时器接口

`types.ts:906-914` 提供：

- `ctx.setInterval(handler, ms)`
- `ctx.setTimeout(handler, ms)`
- `ctx.clearTimer(handle)`

定时器在 `session_shutdown` 自动清理。手动提前结束需要调用 `clearTimer` 并把保存的句柄置空，否则再次启动的守卫会失效。

`setInterval` 的回调可以是 async 函数，返回的 Promise 不被内部等待；需要串行化时自行跟踪。

## 变化提示的设计与相位

扩展每 5000ms 轮询一次数据。某个数值与上一次采样不同时，为该数值启动一次闪烁：`selectedBg` 背景亮 250ms、灭 250ms，共 8 个相位（4 次亮、4 次灭），合计 2 秒，之后恢复阈值配色。闪烁期间由独立的 250ms 定时器用缓存数值重绘，不重新请求数据源。

首次渲染只建立基准，不闪烁；接口失败时回退为 `Left -- · Used --`，CPU/RAM 仍显示。

## 实测开销

测量对象是真实扩展源码，配合本机 4139 状态接口与 `/proc` 数据；状态栏接收端是隔离的测试对象，因此不含真实 TUI 绘制成本。5 轮，每轮覆盖 3 次轮询。

| 测量项 | 中位数 | 范围 | 样本数 |
|---|---:|---:|---:|
| 一次完整刷新（含请求，不含等待间隔） | 1.443 ms | 1.251–2.003 ms | 15 |
| 其中 HTTP 请求到响应头 | 0.916 ms | 0.740–1.198 ms | 15 |
| 一次刷新期间的 CPU 时间 | 0.935 ms | 0.776–1.373 ms | 9 |
| 一次闪烁回调的 CPU 时间 | 0.068 ms | 0.038–0.431 ms | 72 |

按每次刷新计算，HTTP 请求占完整刷新时间的中位数为 62%。全部轮询请求成功，闪烁相位与高亮次数与预期一致。

## 测量方法边界

`bun --cpu-prof --cpu-prof-interval=100` 生成的 profile 中，`timeDeltas` 含长空闲间隔（存在大于 100ms 的间隔），函数耗时汇总不可用；本次改用 `process.cpuUsage()` 在回调窗口内直接取 CPU 时间。

`process.cpuUsage()` 的最小分辨率受调度影响，单次闪烁回调的绝对值接近该分辨率，因此只适合判断量级，不适合比较毫秒以下的差异。

未测量项：真实 OMP TUI 的重绘成本、扩展独占内存、长会话下的累积影响。
