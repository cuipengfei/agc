# 浏览器终端链路剪贴板路径排障 raw

> Source: 本机排障会话（ttyd→herdr→omp 剪贴板链路，无外部 URL）
> Collected: 2026-10-16
> Published: Unknown

## 1. 现象

- Win+V 粘贴进 omp TUI 时 omp 状态栏警告 `Clipboard is empty`；Ctrl+Shift+V 正常。
- 用户先行验证方式（未落盘任何 rc 文件）：`WAYLAND_DISPLAY=wayland-0 omp --resume <session-id>`，inline 环境变量前缀启动单进程。
- 修复持久化后用户确认：Win+V 恢复可用。

## 2. omp 源码证据（本机安装包 dist 直读，2026-10-16）

安装包：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js`（含巨量单行，以下按字节偏移定位）。

### WSL 判定函数（偏移 90835 附近）

```js
function oS(e=process.platform,t=process.env){return e==="linux"&&Boolean(t.WSL_DISTRO_NAME||t.WSL_INTEROP)}
```

纯环境变量判定，不查内核版本。

### 文本读取路线（偏移 10045200-10048189）

核心片段：

```js
async function BMo(){try{return await g2(["xclip","-selection","clipboard","-o"])}catch{return await g2(["xsel","--clipboard","--output"])}}
// ...
if(oS()){let r=await FMo();if(r!==null)return r}
let t=Boolean(process.env.WAYLAND_DISPLAY),n=Boolean(process.env.DISPLAY);
if(t)try{return await g2(["wl-paste","--type","text","--no-newline"])}catch{if(n)return await BMo()}else if(n)return await BMo()
// ...
return""
```

`FMo` 为 WSL 文本回退，用 `Bun.spawn(["powershell.exe","-NoProfile","-NonInteractive","-Command",yQl])`，`yQl` 原文：

```powershell
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
[Console]::Out.Write([string](Get-Clipboard -Raw))
```

### 图片读取路线（`dcr`，偏移 10043538 附近）

- `oS()` 为真 → `DMo`：`powershell.exe` + `System.Windows.Forms.Clipboard]::GetImage()` 转 base64 PNG；
- linux 且有 `WAYLAND_DISPLAY` → `wl-paste --list-types` 循环；
- 无显示服务器 → 返回 null。

### 粘贴处理器与警告（`handleImagePaste`，偏移 12499500-12504500）

```js
let l=this.clipboard.readText();l.then(()=>{},()=>{});
let c=await this.clipboard.readImage();
if(c){ ... return await o.attach(...) }
let d=await l;if(!d)return this.ctx.showStatus("Clipboard is empty"),!1;
```

图片与文本并发读取，两者皆空时弹 `Clipboard is empty`。

### 键位默认值（偏移 1729 附近）

```js
"app.clipboard.pasteImage":{defaultKeys:yBt(),description:"Paste image or text from clipboard"}
"app.clipboard.pasteTextRaw":{defaultKeys:["ctrl+shift+v","alt+shift+v"],description:"Paste text from clipboard as raw text (no collapse)"}
```

### 类型声明佐证（dist/types/utils/clipboard.d.ts）

- `readTextFromClipboard`：Native Windows 走原生 addon，失败才回退 `powershell.exe`；
- 原文：`WSL reaches the host clipboard through powershell.exe`；
- 原文（readMacFileUrlsFromClipboard 注释）：`falling through to "Clipboard is empty"`。

## 3. 进程链与环境证据（命令输出摘录）

### 进程链（pstree -sp）

```
systemd(1)---herdr(154864)---zsh(154898)---omp(519090)
systemd(1)---herdr(154864)---zsh(155144)---omp(517653)
```

（排障后 pane 内 omp 以 --resume 重启为新 PID 549854/557177，父链不变。）

### herdr 进程与会话（procs / ps 输出）

- 两个 `herdr server`：PID 149692（STARTED Fri Oct 16 13:10:24 2026，PPID 1）、PID 154864（13:16:23，PPID 1）。
- 客户端：`herdr --session mon`（pts/0，PID 505646）、`herdr --session main`（pts/9，PID 506478）。
- cgroup：`0::/user.slice/user-1000.slice/session-c21.scope`（154864）、`0::/user.slice/user-1000.slice/session-c20.scope`（149692）。
- `ls /home/cpf/.config/herdr/sessions/` → `main`、`mon`。

### 环境变量（/proc/<pid>/environ 摘录）

- omp(519090)：grep `^WSL_` 计数 0；无 `DISPLAY`、`WAYLAND_DISPLAY`；`XDG_SESSION_TYPE=tty`；`XDG_RUNTIME_DIR=/run/user/1000`；PATH 含 `/mnt/c/Windows/System32/WindowsPowerShell/v1.0`。
- omp(519090) 环境另含 `HERDR_BIN_PATH=/home/cpf/.local/bin/herdr` 与 `HERDR_SOCKET_PATH=/home/cpf/.config/herdr/sessions/main/herdr.sock`（pane 侧实测；「环境继承自 server」为推断，依据 pstree 父链 herdr(154864)→zsh→omp）。
- herdr server(154864)：实测读出 `XDG_SESSION_ID=c21`、`XDG_RUNTIME_DIR=/run/user/1000`，无 `DISPLAY`/`WAYLAND_DISPLAY`；**未读出 `HERDR_SOCKET_PATH`**（grep 无匹配）。
- herdr server(149692)：仅有 `XDG_SESSION_ID=c20` 匹配，无 `HERDR_SOCKET_PATH`。
- 新登录 zsh（`zsh -l -i -c '...grep -c "^WSL_"'`）→ 0。
- `/proc/sys/fs/binfmt_misc/` 含 `WSLInterop`。

## 4. 读取路线实测（2026-10-16）

- `powershell.exe -NoProfile -NonInteractive -Command '[Console]::OutputEncoding=[Text.Encoding]::UTF8; [Console]::Out.Write([string](Get-Clipboard -Raw))'` → `exit=0 len=18`。
- `XDG_RUNTIME_DIR=/run/user/1000 WAYLAND_DISPLAY=wayland-0 timeout 10 wl-paste --type text --no-newline` → `exit=0 len=49`。
- `ls -l /run/user/1000/wayland-0` → `lrwxrwxrwx ... /run/user/1000/wayland-0 -> /mnt/wslg/runtime-dir/wayland-0`。
- `/mnt/wslg/.X11-unix/X0` 存在；`/mnt/wslg` 目录存在。

## 5. ttyd 前端与 herdr 二进制取证

- ttyd 进程命令行（root）：`/usr/bin/ttyd -W -p 7681 ... -I /home/cpf/.local/share/ttyd/index-osc52.html login -f cpf`。
- index-osc52.html grep：含 `paste(e){(0,s.paste)(e,this.textarea,this.coreService,this.optionsService)}` 与 `attachCustomKeyEventHandler`（库存 xterm paste 管线，无自定义键处理块）；定制部分为 OSC52 转发块 + contextmenu 拦截块（实现细节见 wiki ttyd 文章及其 2026-10-06 raw）。
- `strings /home/cpf/.local/bin/herdr | grep -i clipboard`：含 `client_remote_image_paste_key`、`forward_clipboard`、`pane_clipboard`（OSC 52）等符号；**无** `Clipboard is empty`（该串为 omp 所有）。

## 6. herdr 结构事实：直接证据与用户陈述分列

**直接证据**：`sessions/` 目录为 main、mon 两个；omp(519090) 环境含 main 会话的 `HERDR_SOCKET_PATH`（父链 pstree 为 herdr(154864)→zsh→omp）；149692 环境不含 socket 变量；存在 `--session mon` 与 `--session main` 两个客户端进程；server 进程 PPID=1、cgroup 为 logind session scope。「154864 承载 main 会话」「pane 环境继承自 server」均为推断（父链 + pane 环境变量），server 进程自身环境未读出 socket 变量。

**用户陈述**：「我有两个 herdr 会话」；两会话各对应一个 server 进程。mon 侧与 149692 的对应关系未直接读取验证（无 socket 环境变量可读），仅为用户确认 + 「仅两个 server 存在」的侧证。

## 7. 修复与验证（已执行）

- `~/.zshenv` 追加一行：`export WAYLAND_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"`（写入前该文件仅 `TODO_FILE` 与 cargo env 两行）。
- 隔离验证：`env -u WAYLAND_DISPLAY zsh -c 'echo "WAYLAND_DISPLAY=[$WAYLAND_DISPLAY]"'` → `WAYLAND_DISPLAY=[wayland-0]`。
- 修复方式选型记录：Wayland 路线（wl-paste）与 WSL 变量路线（powershell.exe）两条均已实测可行；选中前者因 WSLg 原生、无需每次冷启动 powershell.exe。

## 8. 证据边界（未验证项）

- xterm.js 把 ctrl+v 求值为 `^V` 字符的内部键盘映射未验证：仅在前端包内见到按键求值后的分发代码（`_onKey.fire({key:i.key,domEvent:...})` 与 C0 判断），`keyCode-64` 类 C0 生成算术只命中渲染器代码。
- 鼠标选区复制的具体触发方式（右键/快捷键）未验证。
- 图片粘贴经 WSLg 通道未实测。
- 排障期间 pts/20 上另一个 omp 进程的环境未验证（Win+V 修复确认仅覆盖用户实际测试的那一个 pane）。
