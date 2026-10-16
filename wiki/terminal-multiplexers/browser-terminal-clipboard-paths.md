# 浏览器终端链路的剪贴板路径

> Sources: 本机实证, 2026-10-16
> Raw: [浏览器终端链路剪贴板排障](../../raw/terminal-multiplexers/browser-terminal-clipboard-paste-paths.md)
> Updated: 2026-10-16

## Overview

在「浏览器 xterm.js → ttyd → herdr → omp」这条链里，复制和粘贴走两条不对称的路：复制由前端（浏览器）完成，无需 Linux 侧任何配置；粘贴若表现为按键字节（Win+V 注入的 Ctrl+V、应用收到的 `^V`），则必须由链条末端的应用自己读取系统剪贴板。omp 的读取按环境变量在三条路线中选择；本机 WSL 会话不带 WSL 变量、也没设 `WAYLAND_DISPLAY`/`DISPLAY`，三条路线全断，于是 Win+V 报 "Clipboard is empty" 而 Ctrl+Shift+V 正常。修复是给 `~/.zshenv` 加一行 `export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"`，让 omp 走本就位但未指路的 wl-paste → WSLg 路线。

## 谁碰剪贴板

| 组件 | 角色 | 碰剪贴板吗 |
|---|---|---|
| 浏览器 xterm.js | 真正的终端模拟器：渲染画面、捕获键盘 | 只碰浏览器那份（即 Windows 剪贴板） |
| ttyd | WebSocket↔伪终端搬运工，一个浏览器连接开一个登录会话 | 不碰 |
| 登录 zsh | 跑 `herdr --session` 客户端的 shell | 不碰 |
| herdr 客户端/服务端 | 按键转发与画面回传，持有 pane 伪终端 | 本次文本粘贴按键为字节转发；另有图片粘贴桥接等剪贴板机制（见其工具链参考） |
| omp | 唯一给 `^V` 赋予「粘贴」语义的应用 | 要碰：自己选路线读 |

就本次观察到的文本粘贴路径而言，前四层只做字节搬运，只有末端的 omp 会解释按键含义；herdr 另有按键拦截与剪贴板桥接，不在本次文本路径范围内——这也是修 omp 读取环境就够用的原因。

## 两条粘贴路径

- **终端层粘贴**（Ctrl+Shift+V）：浏览器原生 paste 事件把剪贴板文本交给 xterm.js，逐字节下发，omp 收到一段普通字符，全程不读剪贴板。
- **应用层粘贴**（Win+V）：Windows 把选中条目写回剪贴板，并向焦点窗口注入一次 Ctrl+V；该按键被当作 `^V` 控制字节经 ttyd、herdr 送达 omp；omp 的 ctrl+v 绑定要求 omp 自己去读剪贴板。

## 复制方向为何零配置可用

要复制的内容本就在终端字节流里：应用主动复制走 OSC52 序列（omp 的 copy 即先发射 OSC52），鼠标选区则由 xterm.js 自己掌握文本；前端只需把内容写进浏览器剪贴板，而浏览器允许网页写（Clipboard API 不可用时还有 `execCommand('copy')` 降级）。ttyd 定制前端的 OSC52 块正服务这个方向。**粘贴方向不经过该块**：浏览器只允许网页在真实 paste 事件里读剪贴板，OSC52 回查未实现。块的实现细节见 [ttyd 前端编译模型与 xterm 版本锁定](ttyd-frontend-compilation.md)。

## omp 的读取路由与环境门控

omp 读文本/图片剪贴板按序选路线，每条都被环境变量门控：

| 条件 | 路线 |
|---|---|
| env 含 `WSL_DISTRO_NAME` 或 `WSL_INTEROP` | `powershell.exe`（文本 `Get-Clipboard -Raw` / 图片 GetImage 转 base64 PNG） |
| `WAYLAND_DISPLAY` 存在 | `wl-paste` |
| `DISPLAY` 存在 | `xclip` / `xsel` |
| 都不满足 | 返回空 → 并发读完后弹 "Clipboard is empty" |

WSL 判定是纯环境变量检查：`return e==="linux"&&Boolean(t.WSL_DISTRO_NAME||t.WSL_INTEROP)`——不查内核版本，所以在不带这些变量的 logind/systemd 会话里整个 WSL 回退被跳过。

## 本机的环境缺口与修复

- 缺口：omp 进程树实测 WSL_ 变量计数为 0、无 `DISPLAY`/`WAYLAND_DISPLAY`（`XDG_SESSION_TYPE=tty`）；新登录 zsh 同样为 0。
- 能力其实都在：`wl-paste` 已装、`/run/user/1000/wayland-0` 软链指向 WSLg、`/mnt/wslg/.X11-unix/X0` 存在、`powershell.exe` 读取实测 exit 0。缺的是指路的环境变量。
- 修复（已执行并验证）：`~/.zshenv` 追加 `export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"`；隔离验证 `env -u WAYLAND_DISPLAY zsh -c ...` 输出 wayland-0；用户确认 Win+V 恢复。等价备选是任意非空 `WSL_DISTRO_NAME` 走 powershell.exe 路线（同样实测可行）。
- 落点选 `~/.zshenv` 的理由：所有 zsh 进程（含 herdr 拉起的 pane）必读之，新 pane、新登录、新 omp 全覆盖。

## herdr 的结构事实

- 每命名会话一个 server 进程：socket 在 `~/.config/herdr/sessions/<name>/herdr.sock`；server 常驻（PPID=1），cgroup 落在 logind session scope。154864 承载 main 会话为推断：omp(519090) 的 pstree 父链是 herdr(154864)，且其环境含 main 会话 socket 变量（server 进程自身环境未读出该变量）；mon 侧对应为用户确认 + 侧证。
- pane 环境继承 server 启动环境同为推断（父链 + pane 环境变量）；omp 环境的 `HERDR_SOCKET_PATH` 是 pane 侧实测。
- herdr 自有图片粘贴桥接（`remote_image_paste` 键、`pane_clipboard` OSC52）属于另一套机制，与本次文本粘贴路径无关；文本粘贴对 herdr 是透明字节流。

## 证据边界

- xterm.js 把 ctrl+v 求值为 `^V` 字符的内部键盘映射未验证：前端包内只见到按键求值后的分发代码；「omp 的 ctrl+v 处理器被触发」是可观测事实。
- 鼠标选区复制的具体触发方式未验证；图片粘贴经 WSLg 未实测；排障期间另一 pane 的 omp 环境未验证。

## See Also

- [ttyd 前端编译模型与 xterm 版本锁定](ttyd-frontend-compilation.md)
- [Herdr + Plannotator 工具链全量 Reference](../herdr-plannotator/toolchain-reference.md)
