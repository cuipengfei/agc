# sip + Herdr：焦点刷新期间的鼠标松开丢失

> Source: herdrdev/herdr v0.9.5 源码（tag `v0.9.5` 解析到 commit `2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01`）；Gaurav-Gosain/sip v0.10.0 Go 模块源码；xterm.js 6.1.0-beta.216 源码缓存；本机隔离 Chromium 实验；GitHub issue herdrdev/herdr#6114
> Collected: 2026-11-20
> Published: Unknown

## 环境与症状

本机 WSL2 x86_64，Herdr 0.9.5（stable 通道），sip v0.10.0 浏览器终端，shell 为 zsh。Herdr 客户端身份由 `herdr status client` 给出：`version: 0.9.5`、`channel: stable`、`protocol: 22`、`binary: /home/cpf/.local/bin/herdr`。

用户报告的触发步骤：

1. Herdr 运行在 sip 浏览器终端中，pane 内只跑一个 shell。
2. 用鼠标单击把焦点切回该终端。
3. 松开后滚动滚轮，文字被选中、出现高亮。
4. 双击终端后再滚动，恢复正常。

用户补充：与 OMP 无关，空 pane 同样出现。此前 Herdr 承载在 ttyd 中时没有遇到该现象。

配置层面：`~/.config/herdr/config.toml` 中 `[ui] copy_on_select = true`；`ui.mouse_capture` 未显式设置（默认 `true`）。

## Herdr v0.9.5 的相关代码

焦点进入以 `\x1b[I` 上报，解析为 `OuterFocusGained`（`src/raw_input.rs`）：

```rust
            "\x1b[I" => return Some((RawInputEvent::OuterFocusGained, seq_len)),
```

判定是否需要刷新宿主模式（`src/raw_input.rs`）：

```rust
pub(crate) fn events_require_host_mode_refresh(events: &[RawInputEvent]) -> bool {
    events
        .iter()
        .any(|event| matches!(event, RawInputEvent::OuterFocusGained))
}
```

Unix 客户端收到输入后先刷新宿主模式，再交给 shell 处理（`src/client/mod.rs`）：

```rust
                    let events = crate::raw_input::parse_framed_input(&data);
                    if crate::raw_input::events_require_host_mode_refresh(&events) {
                        refresh_host_mouse_capture(
                            state.mouse_capture_active,
                            host_sgr_pixels_active.load(Ordering::Acquire),
                        );
                        refresh_host_keyboard_protocol(
                            _terminal_guard,
                            state.keyboard_report_all_active,
                            false,
                        );
                    }
```

刷新函数只是调用 `set_mouse_capture`（`src/client/mod.rs`）：

```rust
fn refresh_host_mouse_capture(enabled: bool, sgr_pixels: bool) {
    if let Err(err) = set_mouse_capture(enabled, sgr_pixels) {
        warn!(err = %err, "failed to re-assert host mouse capture");
    }
}
```

Linux 分支先清除全部已知鼠标模式，再打开 `EnableMouseCapture`（`src/client/terminal_setup.rs`）：

```rust
    #[cfg(not(windows))]
    crate::terminal_modes::clear_host_mouse_reporting(&mut io::stdout())?;
    #[cfg(not(windows))]
    if enabled {
        execute!(io::stdout(), EnableMouseCapture)?;
        if sgr_pixels {
            io::stdout().write_all(b"\x1b[?1016h")?;
            io::stdout().flush()?;
        }
        Ok(())
```

清除序列（`src/terminal_modes.rs`）：

```rust
const DISABLE_HOST_MOUSE_REPORTING_SEQUENCE: &[u8] =
    b"\x1b[?1006l\x1b[?1016l\x1b[?1015l\x1b[?1005l\x1b[?1003l\x1b[?1002l\x1b[?1000l\x1b[?9l";
```

选择生命周期的设计意图（`src/selection.rs` 头注释）：

```rust
//! Selection lifecycle:
//!
//!   MouseDown in pane → Anchor recorded (no visual yet)
//!   MouseDrag         → Selection becomes active, cells highlighted
//!   MouseUp           → Selection finalized; optionally copied by the caller
//!   Next click / key  → A retained selection is cleared
```

松开左键时才结束选择（`src/client/shell/mouse.rs`）：

```rust
        if mouse.kind == MouseEventKind::Up(MouseButton::Left) && self.selection.is_some() {
            self.stop_selection_autoscroll();
            let copied = self
                .selection
                .as_mut()
                .is_some_and(crate::selection::Selection::finish);
```

滚轮在存在进行中的选择时走“滚动并扩展选区”分支（`src/client/shell/mouse.rs`）：

```rust
    fn scroll_in_progress_selection(
        &mut self,
        mouse: MouseEvent,
        outcome: &mut ClientShellInput,
    ) -> bool {
        if !matches!(
            mouse.kind,
            MouseEventKind::ScrollUp | MouseEventKind::ScrollDown
        ) {
            return false;
        }
        let Some(hit) = self.active_selection_pane() else {
            return false;
        };
```

调用点在 Left Up 处理之后、普通鼠标分发之前：

```rust
        if self.scroll_in_progress_selection(mouse, outcome) {
            return;
        }
```

未移动过的按压在松开时按“只是点击”清除：

```rust
            } else if self
                .selection
                .as_ref()
                .is_some_and(crate::selection::Selection::is_just_click)
            {
                self.selection = None;
            }
```

## xterm.js（6.1.0-beta.216 缓存）的监听管理

`src/browser/services/MouseService.ts` 在协议变化时移除 document 级监听，重新开启时只恢复“应请求的事件”，不重新挂监听：

```ts
    if (!(events & CoreMouseEventType.UP)) {
      if (requestedEvents.mouseup) {
        document.removeEventListener('mouseup', requestedEvents.mouseup);
      }
      requestedEvents.mouseup = null;
    } else {
      requestedEvents.mouseup ??= eventListeners.mouseup;
    }
```

document 级监听在按下时才挂上：

```ts
    // Register additional global handlers which should keep reporting outside
    // of the terminal element.
    // Note: Other emulators also do this for 'mousedown' while a button
    // is held, we currently limit 'mousedown' to the terminal only.
    if (ctx.requestedEvents.mouseup) {
      ctx.target.document.addEventListener('mouseup', ctx.requestedEvents.mouseup);
    }
```

因此若在按下与松开之间关掉再打开鼠标模式，松开事件不会再送到程序侧。

本机可读源码为 6.1.0-beta.216，sip v0.10.0 的 `webterm-vendor.json` 标称内嵌 6.1.0-beta.290，版本不同；上述行为在隔离实验中按同一时序复现。

## 隔离实验记录

环境：本机已装 Chromium `156.0.8078.73-1xtradeb1.2604.1`（`dpkg` 记录安装时间 2026-11-07 20:28:18），Playwright 来自既有 Bun 缓存（文件时间 2026-11-16）。实验仅加载 sip v0.10.0 的静态资源，未连接现有会话。

做法：开启 SGR 鼠标报告，按下左键，在按住期间写入 Herdr 的清除与重新开启序列，再松开，最后滚动一格，记录程序侧收到的事件。

结果矩阵：

| 前端与条件 | 收到的事件 | 松开是否送达 |
|---|---|---|
| sip 内嵌 xterm（beta.290），完整清除后重开 | `\x1b[<0;19;3M`、`\x1b[<65;19;3M` | 否 |
| sip 内嵌 xterm，只重申启用序列（不先清除） | `M` 与 `m` 成对 | 是 |
| sip 内嵌 xterm，关闭焦点报告（`\x1b[?1004l`） | `M` 与 `m` 成对 | 是 |
| ttyd 实际部署前端（xterm 5.4.0），完整清除后重开 | `\x1B[<0;20;3M` | 否 |
| sip Worker engine（libghostty-vt wasm，渲染器 `worker-webgl2`） | `\x1b[<0;20;4M` 与 `\x1b[<0;20;4m` | 是 |

事件样本（sip xterm，完整清除）：`["\x1b[<35;19;3M","\x1b[I","\x1b[<0;19;3M","\x1b[<65;19;3M"]`。
事件样本（关闭焦点报告）：`["\x1b[<35;19;3M","\x1b[<0;19;3M","\x1b[<0;19;3m","\x1b[<65;19;3M"]`。
事件样本（Worker engine）：`["\x1b[<35;20;4M","\x1b[I","\x1b[<0;20;4M","\x1b[<0;20;4m","\x1b[<65;20;4M"]`。

同时观察到：单独重申启用序列（`\x1b[?1003h` 或 `\x1b[?1000h\x1b[?1002h\x1b[?1003h\x1b[?1006h`）不会丢失松开；只有包含关闭动作的序列才会。

## 上游既存修复（相邻平台）

PR herdrdev/herdr#4319（`fix(windows): preserve mouse capture during refresh`，已合并）正文对环境与结论的记载：

> Windows recovery emitted a flushed disable-all sequence followed by the enable sequence. During a focus click, Alacritty could observe the button-down while capture was temporarily disabled and the button-up after capture returned, leaving a selection overlay stuck or capture desynchronized. Re-asserting enabled modes is already idempotent; the destructive clear is only required when disabling.

该 PR 只改动 Windows 路径；v0.9.5 的 Linux 分支仍保留先清除再开启。

## 实际处置

- 用户把 sip 设置面板的 Renderer 改为 `Worker engine (experimental)` 并重连，症状消失。
- 随后滚轮体感变快，用户把 `ui.mouse_scroll_lines` 从默认 3 改为 1。
- 已向上游提交 issue herdrdev/herdr#6114，标题 `Linux/WSL2: mouse wheel selects text after click-to-focus in sip; double-click restores scrolling`。

## 结论边界

- 已核实：Herdr v0.9.5 Linux 路径在焦点进入时先清除再开启鼠标捕获；xterm 在该时序下会丢失松开；四组隔离对照结果如上。
- 未核实：用户真实浏览器会话中的焦点与鼠标事件顺序；ttyd 与 sip 在真实使用中表现差异的具体原因（同一人工时序下 ttyd 前端同样丢失松开）。
- 未核实：Worker engine 的长时间稳定性与 Kitty 图形、键盘协议的实跑结果。
