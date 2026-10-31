# ttyd Tokyo Night Storm 配色链接

> Sources: ttyd 官方 Client Options；TUIOS v0.12.1 主题数据；用户实际使用反馈
> Raw: [完整 URL、调色板与反馈](../../raw/terminal-multiplexers/2026-11-01-ttyd-tokyo-night-storm-url.md)
> Updated: 2026-11-01

## 直接使用

[点击打开](http://localhost:7681/?fontSize=14&theme=%7B%22background%22%3A%22%2324283b%22%2C%22foreground%22%3A%22%23c0caf5%22%2C%22cursor%22%3A%22%23c0caf5%22%2C%22cursorAccent%22%3A%22%2324283b%22%2C%22selectionBackground%22%3A%22%23364982%22%2C%22black%22%3A%22%231d202f%22%2C%22red%22%3A%22%23f7768e%22%2C%22green%22%3A%22%239ece69%22%2C%22yellow%22%3A%22%23e0af68%22%2C%22blue%22%3A%22%2379a2f7%22%2C%22magenta%22%3A%22%23bb9af7%22%2C%22cyan%22%3A%22%237dcfff%22%2C%22white%22%3A%22%23a9b1d6%22%2C%22brightBlack%22%3A%22%23414868%22%2C%22brightRed%22%3A%22%23f7768e%22%2C%22brightGreen%22%3A%22%239ece69%22%2C%22brightYellow%22%3A%22%23e0af68%22%2C%22brightBlue%22%3A%22%2379a2f7%22%2C%22brightMagenta%22%3A%22%23bb9af7%22%2C%22brightCyan%22%3A%22%237dcfff%22%2C%22brightWhite%22%3A%22%23c0caf5%22%7D)，或复制完整单行 URL：

```text
http://localhost:7681/?fontSize=14&theme=%7B%22background%22%3A%22%2324283b%22%2C%22foreground%22%3A%22%23c0caf5%22%2C%22cursor%22%3A%22%23c0caf5%22%2C%22cursorAccent%22%3A%22%2324283b%22%2C%22selectionBackground%22%3A%22%23364982%22%2C%22black%22%3A%22%231d202f%22%2C%22red%22%3A%22%23f7768e%22%2C%22green%22%3A%22%239ece69%22%2C%22yellow%22%3A%22%23e0af68%22%2C%22blue%22%3A%22%2379a2f7%22%2C%22magenta%22%3A%22%23bb9af7%22%2C%22cyan%22%3A%22%237dcfff%22%2C%22white%22%3A%22%23a9b1d6%22%2C%22brightBlack%22%3A%22%23414868%22%2C%22brightRed%22%3A%22%23f7768e%22%2C%22brightGreen%22%3A%22%239ece69%22%2C%22brightYellow%22%3A%22%23e0af68%22%2C%22brightBlue%22%3A%22%2379a2f7%22%2C%22brightMagenta%22%3A%22%23bb9af7%22%2C%22brightCyan%22%3A%22%237dcfff%22%2C%22brightWhite%22%3A%22%23c0caf5%22%7D
```

字号为 14。背景 #24283b，文字与光标 #c0caf5，选区 #364982，包含完整普通及亮色 ANSI 调色板，与 TUIOS 的 tokyonight_storm 对应。没有覆盖 fontFamily，沿用 ttyd 服务端 Maple Mono NF CN。

## 参数与颜色关系

fontSize 控制字号，theme 是编码后的 JSON 配色。URL 参数优先于服务端客户端选项。ttyd 控制默认色和 ANSI 调色板；应用直接输出的 24-bit RGB 色由应用指定。

可收藏完整 URL。换主机或端口时，只修改地址部分，保留查询参数。

## 用户反馈

> nice, this looks much better

## See Also

- [ttyd 前端编译模型](ttyd-frontend-compilation.md)
- [TUIOS 配置与用户体验](tuios-config-user-experience.md)
