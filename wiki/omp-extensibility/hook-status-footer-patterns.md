# OMP hook-status footer：主题着色与变化提示

> Sources: 本机会话源码阅读与隔离实测（OMP 19.0.1）, 2026-11-20
> Raw: [OMP hook-status footer：主题着色、变化提示与开销实测](../../raw/omp-extensibility/2026-11-20-hook-status-footer-theme-and-flash.md)
> Updated: 2026-11-20

## Overview

扩展用 `ctx.ui.setStatus()` 写的不是编辑器上边框的 segment bar，而是 segment bar 下方专供 hook 状态的那一行。这一行可以用主题颜色名着色、可以用背景色标记变化，但可加的内容只有文本。终端是否渲染 SGR 闪烁不可假设；需要"变化时闪一下"时，用定时器切换背景相位更可靠。

## 渲染位置与清洗

`ctx.ui.setStatus()` 写入 hook-status 行，是否显示由 `statusLine.showHookStatus` 决定。写入前经过 `sanitizeHookStatusText`，实测它保留闪烁码与背景色码，因此扩展可以安全地输出 SGR 样式。

这与 segment bar 的边界要分开看：`setStatus` 不新增 segment，`preset: custom` 只重排内置 segment。

## 用主题色而非固定 RGB

`ctx.ui.theme` 是主题单例，扩展在事件回调中取用即可。着色用颜色名：

```typescript
const theme = ctx.ui.theme;
theme.fg("muted", "CPU") + " " + theme.bold(theme.fg("success", "26%"));
```

同进程内切换 `dark-tokyo-night` 与 `light-tokyo-night` 后取样，`success` 分别为 `\u001b[38;2;158;206;106m` 与 `\u001b[38;2;88;117;57m`，`muted` 分别为 `\u001b[38;2;81;89;125m` 与 `\u001b[38;2;97;114;176m`。因为取的是单例上的当前值，切换主题后下一次刷新即生效，不需要重启会话。

阈值配色用颜色名表达：数值正常用 `success`，接近上限用 `warning`，越界用 `error`；背景高亮用 `selectedBg`。

## 变化提示：不要依赖 SGR 闪烁

`\x1b[5m` 是否能看见取决于终端。本机 herdr 面板链路实测：颜色正常显示，`BLINK` 不闪。在这种链路上，闪烁码等于无效代码。

可用的替代是相位切换：数值变化时启动一个 250ms 定时器，亮 250ms、灭 250ms，共 8 个相位（合计 2 秒），然后恢复阈值配色。数据轮询保持 5000ms 不变，闪烁期间只重绘缓存内容，不重新请求数据源。

两条实现要点：

- 首次渲染只建立基准，不闪烁；
- 每个指标独立判断，未变化的指标不进入相位表。

## 定时器生命周期

`ctx.setInterval`、`ctx.setTimeout`、`ctx.clearTimer` 由扩展上下文提供，`session_shutdown` 时自动清理。手动提前结束要自己 `clearTimer` 并置空句柄——只清定时器不清句柄，会让"已有定时器"的守卫一直为真，相位结束后再也启动不起来。

## 实测开销

真实扩展源码加本机接口，5 轮、每轮 3 次轮询，样本如下：

| 测量项 | 中位数 | 范围 | 样本数 |
|---|---:|---:|---:|
| 一次完整刷新 | 1.443 ms | 1.251–2.003 ms | 15 |
| 其中 HTTP 请求到响应头 | 0.916 ms | 0.740–1.198 ms | 15 |
| 一次刷新的 CPU 时间 | 0.935 ms | 0.776–1.373 ms | 9 |
| 一次闪烁回调的 CPU 时间 | 0.068 ms | 0.038–0.431 ms | 72 |

HTTP 请求占完整刷新时间的中位数为 62%。成本主要落在等待本地服务响应，扩展自身的解析与格式化占比很小。

## 测量方法边界

Bun 的 CPU profile 采样间隔混入长空闲间隔，直接汇总函数耗时会把空闲算进热点；本次改用回调内的 `process.cpuUsage()` 差值。

单次闪烁回调的 CPU 时间处于该 API 的分辨率附近，只用于判断量级。状态栏接收端是测试对象，真实 TUI 重绘成本、扩展独占内存与长会话累积影响未测量。

## See Also

- [OMP Hooks vs Extensions](hooks-vs-extensions.md)
- [OMP 状态栏 cost 段的三段金额组成](../omp/status-line-cost-segments.md)
- [OMP 环境变量参考](../omp/env-variables-reference.md)
