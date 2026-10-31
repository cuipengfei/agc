# ttyd Tokyo Night Storm 完整配色链接

> Source: 当前会话用户提供的 URL 与实际使用反馈；TUIOS v0.12.1 internal/theme/tints_gen.go；https://github.com/tsl0922/ttyd/wiki/Client-Options
> Collected: 2026-11-01
> Published: Unknown

## 用户输入（原文）

```text
http://localhost:7681/?fontSize=14
```

> this is what i have now, give me full url, so that ttyd will look like the tokyo night theme of tuios, we are using tokyo night for tuios, right?

## 已提供并获认可的完整 URL

```text
http://localhost:7681/?fontSize=14&theme=%7B%22background%22%3A%22%2324283b%22%2C%22foreground%22%3A%22%23c0caf5%22%2C%22cursor%22%3A%22%23c0caf5%22%2C%22cursorAccent%22%3A%22%2324283b%22%2C%22selectionBackground%22%3A%22%23364982%22%2C%22black%22%3A%22%231d202f%22%2C%22red%22%3A%22%23f7768e%22%2C%22green%22%3A%22%239ece69%22%2C%22yellow%22%3A%22%23e0af68%22%2C%22blue%22%3A%22%2379a2f7%22%2C%22magenta%22%3A%22%23bb9af7%22%2C%22cyan%22%3A%22%237dcfff%22%2C%22white%22%3A%22%23a9b1d6%22%2C%22brightBlack%22%3A%22%23414868%22%2C%22brightRed%22%3A%22%23f7768e%22%2C%22brightGreen%22%3A%22%239ece69%22%2C%22brightYellow%22%3A%22%23e0af68%22%2C%22brightBlue%22%3A%22%2379a2f7%22%2C%22brightMagenta%22%3A%22%23bb9af7%22%2C%22brightCyan%22%3A%22%237dcfff%22%2C%22brightWhite%22%3A%22%23c0caf5%22%7D
```

## URL 参数解码结果

fontSize=14。theme JSON 原始键值如下：

```json
{
  "background": "#24283b",
  "foreground": "#c0caf5",
  "cursor": "#c0caf5",
  "cursorAccent": "#24283b",
  "selectionBackground": "#364982",
  "black": "#1d202f",
  "red": "#f7768e",
  "green": "#9ece69",
  "yellow": "#e0af68",
  "blue": "#79a2f7",
  "magenta": "#bb9af7",
  "cyan": "#7dcfff",
  "white": "#a9b1d6",
  "brightBlack": "#414868",
  "brightRed": "#f7768e",
  "brightGreen": "#9ece69",
  "brightYellow": "#e0af68",
  "brightBlue": "#79a2f7",
  "brightMagenta": "#bb9af7",
  "brightCyan": "#7dcfff",
  "brightWhite": "#c0caf5"
}
```

## 用户打开后的反馈（原文）

> nice, this looks much better

## 主题数据读取与编码检查（动作归纳）

读取来源配置，theme 为 tokyonight_storm。读取 TUIOS v0.12.1 internal/theme/tints_gen.go 的对应主题，用 Go parser 与 strconv 解码其 20 个色槽；背景 #24283b、前景 #c0caf5、选区 #364982。URL 同时包含完整 ANSI 调色板。用 URL 解码和 JSON 解析检查得到相同键值。cursorAccent 取背景色。

## ttyd 主题使用规则（官方 Client Options 的归纳）

theme 为 xterm 主题 JSON。URL 参数优先于服务端客户端选项。ttyd 控制默认前景、背景及 ANSI 调色板；应用直接发送的 24-bit RGB 色由应用指定。此 URL 未覆盖 fontFamily，沿用服务端 Maple Mono NF CN。
