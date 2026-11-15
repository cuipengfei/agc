# ttyd + Herdr 本机浏览器观察（2026-11-15）

> Source: 用户提供（会话内直接给出），`procs ttyd|cat;procs herdr|cat` 进程表与本机 `omp --help` 输出
> Collected: 2026-11-15
> Published: 2026-11-15

## 进程表摘录（原样，用户名替换为 <USER>）

```
 178     root │        0.0 0.0 00:03:54 │ /usr/bin/ttyd -W -p 7681 -i 127.0.0.1 -T xterm-256color -t enableSixel true -t fontSize 14 -t fontFamily Maple Mono NF CN, monospace -I /home/<USER>/.local/share/ttyd/index-osc52.html login -f <USER>
 2721    <USER>  │        0.0 0.1 00:04:54 │ /home/<USER>/.local/bin/herdr server
 7023    <USER>  │        9.5 0.2 01:29:59 │ /home/<USER>/.local/bin/herdr server
 369472  <USER>  │        0.0 0.0 00:00:37 │ /home/<USER>/.local/bin/herdr-core serve
 369478  <USER>  │        0.0 0.0 00:00:25 │ /home/<USER>/.local/bin/herdr-core hold --socket /run/user/1000/herdr-core/default.holder.60102e78.sock
1276553 <USER>  │ pts/0  9.3 0.1 00:01:16 │ herdr --session main
1279276 <USER>  │ pts/34 0.0 0.1 00:00:05 │ herdr --session mon
```

要点：

- ttyd 由 root 运行，参数含 `login -f <USER>`：连上 7681 即获得 <USER> 的登录 shell；绑定 127.0.0.1，仅本机可达；无鉴权参数。
- ttyd `-I` 指定的首页为 `index-osc52.html`（OSC52 剪贴板支持页）。
- 两个 `herdr server` 进程与一组 `herdr-core serve` / `herdr-core hold` 并存：TUI 线与 app 线同时运行。
- 两个 TUI 客户端：`herdr --session main`、`herdr --session mon`。

## omp --help 摘录

- 「acp    Run omp as an ACP server over stdio」
- 「--restore / --resume」出现在恢复相关帮助行（session restore 与 resume 两处）。

## 边界

- 只有进程列表与帮助输出；没有打开浏览器页面、没有操作界面、没有基准测试。
