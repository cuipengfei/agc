# sip Worker engine 下使用宿主字体

> Sources: Gaurav-Gosain/sip v0.10.0 源码与隔离 Chromium 实验，2026-11-20；本机 sip systemd 单元与实测，2026-11-20
> Raw: [sip v0.10.0 Worker engine：字体加载路径与宿主字体切换](../../raw/terminal-multiplexers/2026-11-20-sip-worker-engine-host-font.md); [sip 服务重启的 cgroup 波及范围](../../raw/terminal-multiplexers/2026-11-20-sip-service-cgroup-restart-blast-radius.md)
> Updated: 2026-11-20

## Overview

sip v0.10.0 的 Worker engine 把终端解析与绘制放在浏览器 Worker 里，字体也在 Worker 内加载。sip 内嵌的 JetBrains 字体按配置中的第一个字体名登记进 Worker 的字体集合，页面主线程的 `document.fonts` 里没有同名字体。页面内只操作 `document.fonts` 再调用 `setOptions` 的做法，不改变 Worker 实际使用的字形。

要使用宿主已安装的字体，做法分两层：启动命令不再覆盖字体名，让内嵌字体回到自己的默认名称；每个页面再用 `setOptions` 把字体族指向宿主字体。

## 适用条件

- sip v0.10.0，渲染器为 Worker engine。
- 浏览器所在的机器已安装目标字体；本机场景是浏览器在 Windows 宿主、sip 服务在 WSL。
- 不需要卸载或修改 sip 二进制。

## 改法

### 1. 启动命令不覆盖字体名

在目标机器的 `~/.config/systemd/user/sip.service` 中保留原有可执行文件路径、监听地址、端口、shell 与其他参数，只移除 `--font-family` 及其值。以下 `ExecStart` 是本机示例：

```ini
ExecStart=/home/cpf/go/bin/sip -H localhost -p 7682 -- /usr/bin/zsh -l
```

启动命令中不出现 `--font-family`。此时页面取默认字体族 `'JetBrainsMono Nerd Font Mono', …`，与 sip 内嵌字体的登记名一致；目标字体名不再被内嵌文件占用。

### 2. 重载并重启

重启前用 `systemd-cgls --user-unit sip` 检查单元内进程。当中有需要保留的 Herdr server、pane 或其他进程时，先确保这些进程独立运行或保存工作。`KillMode=control-group` 会在重启时结束该 cgroup 内的全部进程；参见 [ttyd 与 sip 并存部署](ttyd-and-sip-side-by-side.md) 的“重启波及范围”。

```bash
systemd-analyze --user verify "$HOME/.config/systemd/user/sip.service"
systemctl --user daemon-reload
systemctl --user restart sip
```

### 3. 核对运行参数

```bash
ps -p "$(systemctl --user show sip --property=MainPID --value)" -o args=
curl -s http://127.0.0.1:7682/ | grep __sipConfig
```

第一条用于确认实际运行参数中没有 `--font-family`。第二条用于查看首页的 `__sipConfig`；如果有其他配置项，确认其中没有 `fontFamily` 即可。地址与端口按目标机器的服务配置填写。

### 4. 页面内指定宿主字体

刷新页面，确认渲染器为 Worker engine，在浏览器 Console 执行：

```js
window.sipTerm.webterm.setOptions({
  fontFamily: "'Maple Mono NF CN', monospace"
});
```

字体会在 Worker 内重新测量、重建字形图集并重绘。本机用户确认该步骤生效。

### 5. 验证

```js
console.table({
  width: window.sipTerm.webterm.term.cw,
  height: window.sipTerm.webterm.term.ch,
});
```

`cw` 是单元格宽度，`ch` 是行高。对比切换前后的数值可观察尺寸变化；不同字体也可能具有相同尺寸，实际字形需要结合目视或字体来源检查。

## 两个字体集合的分工

| 字体集合 | 承载内容 | 页面脚本能否操作 |
|---|---|---|
| 页面主线程 `document.fonts` | 页面自己的 `@font-face`，Worker engine 下只有 `JetBrainsMono Nerd Font Mono` 四个条目 | 是 |
| Worker 的 `self.fonts` | Worker 加载的字体；sip 内嵌字体按配置的第一个名称登记 | 通过 `setOptions` 间接 |

sip v0.10.0 的 `loadFonts` 只向 `self.fonts` 追加 Face，没有移除分支。已登记的同名字体继续生效，新增其他名称不会替换它。要更换 Worker 使用的字体，改变 `fontFamily` 指向的名称。

## 原理：Worker 内的字体注册与字形图集

主线程通过 `init` 消息把 `fontFamily` 与 `fonts` 交给 Worker；`fonts` 条目只有 `url`、`weight`、`style`，没有 `family`。Worker 的 `loadFonts` 在缺少 `family` 时使用 `firstFamily()`，即 `fontFamily` 的第一个名称，把它登记为 `FontFace` 并加入 `self.fonts`。

`sip` 页面传给 Worker 的四个字体文件全部是内嵌 JetBrains，因此配置里写什么名称，内嵌字形就登记在什么名称下。去掉 `--font-family` 后，登记名回到 `JetBrainsMono Nerd Font Mono`，`Maple Mono NF CN` 这个名字留给系统字体。

切换字体时，Worker 重新用 `OffscreenCanvas` 测量字符宽度与行高，重测 `cw`/`ch`，重建字形图集并下发 `metrics` 消息。终端据此重新计算列数与行数。

## 浏览器从哪里取字体

`setOptions` 只传字体名称，不传字体文件。浏览器在 Windows 宿主运行时，由宿主的字体系统解析该名称。WSL 内的 `fc-match 'Maple Mono NF CN'` 指向 `/home/cpf/.local/share/fonts/maple-win/MapleMono-NF-CN-Regular.ttf`，这个文件不参与 Windows 浏览器取字体。

需要让浏览器使用服务器上的字体文件时，用 `--font` 提供文件并配合 `--font-family`；此时 sip 注入 `@font-face`，Worker 仍按第一个名称登记。

## 作用域与副作用

- `--font-family` 只影响页面默认字体名，不改变字号、配色与渲染器。
- 页面刷新或 `Apply & Reconnect` 后，Console 设置失效，需要重新执行；重连会结束 sip 的当前 shell。
- `window.sipTerm` 是 sip 的内部接口，升级后可能变化。

## 可选持久化路径

以 Go 库方式启动 sip 时，页面脚本可通过 `sip.appearance.set()` 设置 `fontFamily`，需要 `CapAppearance` 能力（默认关闭）。页面补丁会写入 Worker 与 xterm 客户端共用的字体选项入口。本机未采用该路径，未实测。

## 回退

在 `ExecStart` 中恢复 `--font-family "Maple Mono NF CN, monospace"` 并重载重启，即回到启动命令指定字体名的状态；此时内嵌字体重新占用该名称。

## 证据边界

- 本机用户确认字体切换生效；Worker 内实际命中字形的字体来源尚未测量。
- 未验证其他 sip 版本、其他渲染器组合与其他字体名称。
- 画布截图不作为字体判据：`setOptions` 触发 `fit()` 与整帧重绘，同一段代码多次运行结果可以不同。

## See Also

- [sip v0.10.0 使用参考](sip-v0.10.0-usage-reference.md)
- [ttyd 与 sip 并存部署](ttyd-and-sip-side-by-side.md)
- [焦点刷新期间的鼠标松开丢失](focus-refresh-mouse-release-loss.md)
