# tui.motion 与 display.shimmer：working 文案的动画设置

> Source: 本机 OMP 18.20.3 源码直读（`pi-coding-agent/src/modes/settings.ts`、`pi-tui/src/theme/shimmer.ts`、`pi-tui/src/components/loader.ts`、`pi-coding-agent/src/modes/interactive-mode.ts`）+ 设置注册表与用户级 `config.yml`
> Collected: 2026-11-16
> Published: Unknown

## 设置项

| 键 | 类型 | 允许值 | 默认值 | 本机值 |
|---|---|---|---|---|
| `tui.motion` | enum | `full` / `reduced` / `none` | `full` | `full`（显式） |
| `display.shimmer` | enum | `classic` / `kitt` / `disabled` | `classic` | `kitt`（显式） |
| `tui.titleSpinner` | enum | `braille` / `pulse` / `dots` / `line` | `braille` | `braille`（显式） |
| `tui.spinnerInterval` | number | 毫秒；`0` 为静止 | 未设置时跟随 Motion | 未设置 |

`display.shimmer` 的第三个值拼写是 `kitt`（Knight Rider K.I.T.T.），不是 `kitty`；写成 `kitty` 不属于允许值。

## 预设覆盖规则

`cfgMotionResolved` 把三处设置合成一组生效值：

- `spinnerInterval`：用户显式设置的值优先，否则取 Motion 预设（`reduced` 为 `250` ms）。
- `shimmer`：Motion 预设允许特效时取用户设置，`reduced` 与 `none` 一律强制为 `disabled`。
- `effects`：装饰性闪烁与淡入淡出总开关。

因此把 `display.shimmer` 设成 `kitt` 后，再把 `tui.motion` 改回 `reduced` 或 `none`，实际动画仍是关闭的。

## 作用范围

shimmer 只包裹 working/loading 文案：`Loader` 的 message 颜色函数与 working row 的 label 节点。旋转图标、tool 标题、assistant 回复正文都不经过这条路径。设置描述也写明「streaming text is unaffected」。

## 两种形态

`shimmerSegments` 按固定速度推进相位：`SHIMMER_SPEED_CELLS_PER_S = 30`，位置由 `Date.now() / 1000 * 30` 得出。固定速度让每帧位移与文本长度无关，注释要求它不超过 loader 的 `RENDER_INTERVAL_MS = 1000/30`。

- classic：单峰余弦带单向右移。`CLASSIC_PADDING = 10`、`CLASSIC_BAND_HALF_WIDTH = 6`，位置按 `travel % (total + 10 * 2)` 循环，光带边缘之外强度为 `0`。
- kitt：单个亮点左右往返并带尾迹。`KITT_HEAD_HALF = 0.6`、`KITT_TRAIL_LEN = 7`；往返范围为 `total - 1`，周期是 `2 * range`；只点亮头部**后方**的字符（向右时在左侧，向左时在右侧），尾迹按二次衰减 `f * f`。

档位阈值：`TIER_HIGH = 0.65`、`TIER_MID = 0.22`。强度达到 `0.65` 用 high 档，`0.22` 以上用 mid 档，其余用 low 档。

## 颜色分层

默认调色板 `DEFAULT_SHIMMER_PALETTE`：`low: "dim"`、`mid: "muted"`、`high: "accent"`、`bold: true`。启用会话强调色时改用 `NATIVE_ACCENT_SHIMMER`：`low: "dim"`、`mid: "accent"`、`high: "accent"`、`bold: true`，hue 来自 session accent。kitt 形态本身不带红色；观感颜色来自主题与强调色。

## 生效链

1. `effect(cfgMotionResolved, ...)` 在设置变化时调用 `setSpinnerInterval`、`setShimmerMode`、`setMotionEffects`。
2. `modes/interactive-mode.ts` 用 `shimmerEnabled()` 决定 message 颜色函数是否标记 `animated`；关闭时 loader 退回只有 spinner 的重绘节奏（约 12.5fps），避免反复重绘一行静止文字。
3. `Loader` 的缓存键包含消息、trailer 与 `shimmerEnabled()`；`#describeWorking` 的键还包含 label、起始时间、变体、倒计时、中断键与调色板 mid 值。
4. 支持 TSP/native 渲染的终端由终端自身按时钟推进 `shimmer` 节点；非 native 终端由 OMP 每帧重绘 ANSI（30fps）。

## 本机环境

- `TERM_PROGRAM=herdr`、`TERM=xterm-256color`、`COLORTERM=truecolor`。
- 配置值经 `omp config get` 与 `Settings.loadReadOnly` 双重确认：`tui.motion` 为 `full`、`display.shimmer` 为 `kitt`。

## 证据边界

- 取值、预设覆盖与形态常量来自上述源码与注册表。
- 实际观感（光带速度、亮度、尾迹长度在你终端上的表现）没有做目视验证；本次只确认配置值与生效链。
- 设置界面里的 Motion 描述为「Spinners at 250 ms, no shimmer, no blink/fade」对应 `reduced`；`none` 为静态 spinner 与标题。
