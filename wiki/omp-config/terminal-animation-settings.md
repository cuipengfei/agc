# OMP 终端动画设置：motion 与 shimmer 形态

> Sources: 本机 OMP 18.20.3 源码直读（modes/settings.ts、theme/shimmer.ts、components/loader.ts）, 2026-11-16
> Raw: [tui.motion 与 display.shimmer：working 文案的动画设置](../../raw/omp-config/2026-11-16-tui-motion-and-shimmer-scanner.md)
> Updated: 2026-11-16

## Overview

`tui.motion` 是动画总开关，`display.shimmer` 选择 working 文案的扫光形态。Motion 为 `reduced` 或 `none` 时，shimmer 被强制成 `disabled`；用户显式设置的 spinner 间隔优先于 Motion 预设。shimmer 只作用于 working/loading 文案，旋转图标与回复正文不受影响。

## 设置项

| 键 | 允许值 | 默认值 | 说明 |
|---|---|---|---|
| `tui.motion` | `full` / `reduced` / `none` | `full` | 统一控制 spinner、shimmer、装饰性闪烁与淡入淡出 |
| `display.shimmer` | `classic` / `kitt` / `disabled` | `classic` | working/loading 文案的扫光形态 |
| `tui.titleSpinner` | `braille` / `pulse` / `dots` / `line` | `braille` | 终端标题栏的 spinner 字形 |
| `tui.spinnerInterval` | 毫秒；`0` 为静止 | 未设置时跟随 Motion | 所有 spinner 的帧间隔 |

第三个值的拼写是 `kitt`，不是 `kitty`。

## 预设覆盖

`cfgMotionResolved` 把三处设置合成为生效值：

- spinner 间隔：用户显式值优先，否则取预设；`reduced` 预设为 `250` ms。
- shimmer：预设允许特效时取用户设置，`reduced` 与 `none` 一律为 `disabled`。
- 特效：装饰性闪烁与淡入淡出的总开关。

结果是：把 `display.shimmer` 设成 `kitt` 后再把 Motion 调回 `reduced`，实际动画仍然关闭；要让形态生效，Motion 必须是 `full`。

## 两种形态

位置由固定速度推进：`30` cells/s，即 `Date.now() / 1000 * 30`。固定速度让每帧位移与文本长度无关；源码注释要求它不超过 loader 的重绘间隔 `1000/30`。

- classic：单峰余弦亮带单向右移。左右各留 `10` 格边距，半宽 `6` 格，位置按文本长度加两侧边距循环。
- kitt：单个亮点左右往返，尾迹二次衰减。头部半宽 `0.6` 格，尾迹长 `7` 格；往复范围是文本长度减一，周期为它的两倍。只有头部后方点亮，前方不预告。

两档亮度阈值：`0.65` 以上为 high，`0.22` 以上为 mid，其余为 low。

## 颜色来源

默认调色板为 `dim` / `muted` / `accent`，high 档加粗。启用 session accent 时改用 `dim` / `accent` / `accent`，色相来自会话强调色。kitt 形态本身不带红色，观感颜色由主题与强调色决定。

## 生效链

1. 设置变化触发 `setSpinnerInterval`、`setShimmerMode`、`setMotionEffects`。
2. 交互层用 `shimmerEnabled()` 决定 working 文案是否标记为动画；关闭时退回只有 spinner 的重绘节奏（约 12.5fps）。
3. loader 缓存键包含消息、trailer 与 `shimmerEnabled()`；working row 的缓存键还包含 label、起始时间、变体、倒计时、中断键与调色板 mid 值。
4. 支持 native/TSP 渲染的终端由终端时钟推进 `shimmer` 节点；其他终端由 OMP 每帧重绘 ANSI。

## 本机值

`tui.motion` 为 `full`、`display.shimmer` 为 `kitt`，经 `omp config get` 与 `Settings.loadReadOnly` 双重确认。`tui.titleSpinner` 为 `braille`，`tui.spinnerInterval` 未设置。终端身份为 `TERM_PROGRAM=herdr`、`TERM=xterm-256color`、`COLORTERM=truecolor`。

实际观感（速度、亮度、尾迹在具体终端里的表现）未做目视验证；已确认的是配置值与生效链。

## See Also

- [OMP 配置语义手册](config-semantics.md)
- [OMP 近期十个 release 的配置项增量](release-config-changes-18-12-1-to-18-10-1.md)
