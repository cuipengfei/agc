# WSL mirrored 回环与桌面能力实测

> Source: 本机会话实测（WSL2 `mirrored` 网络模式；Windows 侧 PowerShell；OMP 18.12.6；`@oh-my-pi/pi-natives` 的 `DesktopSession`）
> Collected: 2026-10-26
> Published: Unknown

## 环境

- WSL 网络模式：`wslinfo --networking-mode` 输出 `mirrored`
- `WAYLAND_DISPLAY=wayland-0`、`DISPLAY=` 为空、`XDG_SESSION_TYPE=tty`
- `/run/user/1000/wayland-0 -> /mnt/wslg/runtime-dir/wayland-0`，`/run/user/1000/bus` 存在
- 运行中的无障碍组件：`at-spi-bus-launcher`、`at-spi2-registryd --use-gnome-session`
- WSL 内已缓存 Linux 版 Chrome for Testing：`~/.omp/puppeteer/chrome/linux-150.0.7871.24`

## OMP 设置

`omp config get` 实测：

- `browser.enabled` = false
- `browser.relay` = false
- `browser.headless` = true
- `browser.cdpUrl` 未设置
- `browser-relay` 扩展目录 `~/.omp/browser-relay` 不存在

## Windows → WSL 回环

WSL 内执行 `omp browser-relay serve`（监听 127.0.0.1:9224）后，从 Windows PowerShell 请求：

`http://127.0.0.1:9224/json/version`

结果：状态码 503，响应体 `omp browser relay: extension not connected`。

含义：Windows 侧进程能到达 WSL 内的 relay 端口。此时未加载浏览器扩展，`/ext` 的 WebSocket 握手未验证。

## WSL → Windows 回环

Windows PowerShell 在 `127.0.0.1:18082` 启动一次性 TCP 监听，从 WSL 内请求：

`curl http://127.0.0.1:18082/`

结果：返回 `win-ok`。

## Windows 侧浏览器与策略

- Chrome `156.0.8078.47`
- Edge `156.0.4314.42`
- 交互用户：39764
- `/mnt/c/Users/39764` 从 WSL 可写
- Windows 上 9222 端口无监听
- 注册表 `HKLM\SOFTWARE\Policies\Google\Chrome`、`HKCU\SOFTWARE\Policies\Google\Chrome` 及 Edge 对应键下未发现本地策略项

## 桌面能力探针（`DesktopSession.capabilities`）

在 WSL 内直接构造原生 `DesktopSession` 读取能力，输出原文：

```json
{"backend":"wayland","capture":false,"input":true,"ax":true,"backgroundWindowInput":false,"takeover":false,"applications":true,"menus":true,"heldInput":true,"spaces":false,"globalEscape":false,"capturePermission":"unavailable","inputPermission":"prompt-or-granted","axPermission":"granted","displayCount":0,"screenLocked":false,"displayAsleep":false,"displayServer":"wayland"}
```

同一会话的其它读取：

- `listDisplays()` → `[]`
- `listWindows()` → 长度 0
- `listApplications(null)` → 长度 110（来自 `/usr/share/applications` 的 .desktop 条目）

解读：后端为 wayland；无障碍为 granted 且能力为 true；截图能力 false 且原因为 `unavailable`；没有可枚举的显示与窗口。因此在这台机器上 `computer` 的像素路径无法工作，AX 与输入路径在原理上可用，但当前没有图形窗口可供操作。

## 清理

- 临时 PowerShell 探测脚本已删除
- WSL 内 18081、18082、9224 无监听
- Windows 侧 18082 无监听
