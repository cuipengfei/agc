# Herdr 0.9.5：标签栏位置与滚轮步长

> Source: herdrdev/herdr v0.9.5 官方 `config-reference.json`；本机 `herdr --default-config` 输出；`src/config/model.rs` 源码；本机 `herdr config check` 输出
> Collected: 2026-11-20
> Published: Unknown

## `ui.tab_bar_position`

官方配置参考条目（`config-reference.json`，0.9.5）：

```json
        {
          "key": "ui.tab_bar_position",
          "type": "enum",
          "default": "\"top\"",
          "description": "Place the desktop tab row above or below the terminal panes.",
          "values": [
            "top",
            "bottom"
          ]
        }
```

`herdr --default-config` 模板同一键：

```toml
# Desktop tab row placement: "top" or "bottom".
# tab_bar_position = "top"
```

右侧状态条目单独配置，随标签栏整体移动：

```toml
# Ordered status entries at the right edge of the desktop tab bar.
# Supported types are zoom, hostname, datetime, text, and command.
# Hostname, datetime, and command entries resolve on the Herdr server.
# tab_bar_right = []
```

本机原有配置把 `zoom` 与 `datetime %H:%M` 放在 `tab_bar_right`，分隔符 ` · `。

## `ui.mouse_scroll_lines`

官方配置参考条目（0.9.5）：

```json
        {
          "key": "ui.mouse_scroll_lines",
          "type": "integer",
          "default": "3",
          "description": "Lines to scroll per mouse wheel notch."
        }
```

源码类型与取值约束（`src/config/model.rs`）：

```rust
    /// Lines to scroll per mouse wheel notch. Default: 3.
    pub mouse_scroll_lines: Option<NonZeroUsize>,
```

```rust
impl UiConfig {
    pub fn mouse_scroll_lines(&self) -> usize {
        self.mouse_scroll_lines
            .map(NonZeroUsize::get)
            .unwrap_or(DEFAULT_MOUSE_SCROLL_LINES)
    }
```

两个相关测试名：

```rust
    fn mouse_scroll_lines_defaults_to_three_and_parses() {
```

```rust
    fn mouse_scroll_lines_rejects_zero() {
```

即允许的最小值为 1，0 被拒绝；未设置时取 `DEFAULT_MOUSE_SCROLL_LINES`（3）。

## 本机写入与校验

`~/.config/herdr/config.toml` 的 `[ui]` 段加入：

```toml
tab_bar_position = "bottom"
mouse_scroll_lines = 1
```

`herdr config check` 输出：

```text
config: ok
```

## 生效边界

`ui.*` 属于客户端侧设置。运行中的客户端需要界面 `menu → reload config` 才会读到新值；`herdr server reload-config` 只覆盖 server 侧键（`terminal.*`、`worktrees.*`、`update.*`、`[[keys.command]]`）。本机 `herdr config` 子命令只有 `check` 与 `reset-keys`，没有客户端重载入口。

## 与滚轮体感的关系

滚轮步长控制 Herdr 每个滚轮刻度的历史滚动行数。浏览器终端把像素滚动折算成行数，可能一次送出多个滚轮事件；两者相乘决定体感幅度。本机切换 sip 渲染器为 Worker engine 后，用户报告滚动变快，遂把该值从默认 3 改为 1。

该换算描述依据 sip `static/engine/input.js` 的像素累计逻辑与 `static/engine/worker.js` 的 wheel 分支；未做逐档量化测量。
