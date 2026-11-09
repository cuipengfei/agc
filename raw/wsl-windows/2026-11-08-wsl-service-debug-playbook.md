# WSL 服务排障手法摘录

> Source: 本会话 wsl-webtop 与 agc 排障实测（2026-11-08 当日工具输出与会话笔记）
> Collected: 2026-11-08
> Published: Unknown

本文是原始材料摘录，供 wiki 文章《WSL 服务排障手法》作 Raw 引用。来源逐块标注：命令、预期输出、误判陷阱均来自当日实测。identifier 与代码一律保持英文原名。

## 手法 1：`LD_LIBRARY_PATH` 隔离对照

- 适用场景：程序崩溃，怀疑共享库版本而非程序本身。
- 命令模板：`apt download <pkg>=<version> && dpkg-deb -x <deb> /tmp/isolated && env LD_LIBRARY_PATH=/tmp/isolated/usr/lib/x86_64-linux-gnu <program> …`
- 预期输出：同一程序在隔离库下行为改变（如不再崩溃）。
- 误判陷阱：只解包 `.deb` 不改 `LD_LIBRARY_PATH` 时，程序仍加载系统库，对照无效。
- 本会话实例：同一 ttyd 二进制在 xtradeb libwebsockets 下崩溃，换官方库后 3 次请求无崩溃。

## 手法 2：`ss -ltnp` 验证监听地址

- 适用场景：服务绑定地址与预期不符，或 localhost 连接被拒。
- 命令模板：`ss -ltnp 'sport = :<port>'`
- 预期输出：显示 `127.0.0.1:<port>` 或 `0.0.0.0:<port>`。
- 误判陷阱：`-i lo` 在 WSL 可能解析为 `10.255.255.254` 而非回环，需用显式 `-i 127.0.0.1`。
- 本会话实例：ttyd 从 `0.0.0.0:7681` 收窄为 `127.0.0.1:7681`。

## 手法 3：`apt-cache policy` 与 `apt-mark showhold`

- 适用场景：版本来源不明、被第三方 PPA 抢占、或被 hold 锁住。
- 命令模板：`apt-cache policy <pkg>` 与 `apt-mark showhold`
- 预期输出：版本表含 Installed、Candidate、各来源优先级；hold 列表为空或列出包名。
- 误判陷阱：只看版本号不看优先级，会漏掉 `-1` 或 `510` 等关键信息。
- 本会话实例：xtradeb 版本被 `-1` 排除，ESM 版本以 `510` 胜出。

## 手法 4：`journalctl` 与 `NRestarts` 确认崩溃循环

- 适用场景：服务反复重启，需要区分配置错误与程序崩溃。
- 命令模板：`journalctl -u <service> --since '<time>'` 与 `systemctl show <service> -p MainPID -p NRestarts -p Result`
- 预期输出：日志含 `Main process exited, code=dumped, status=11/SEGV` 或 `Scheduled restart job`；`NRestarts` 计数递增。
- 误判陷阱：`Restart=always` 会掩盖崩溃，需看 `NRestarts` 是否持续增长。
- 本会话实例：ttyd 的 `Restart=always` 与 `SIGSEGV` 构成 23 次重启循环。

## 边界

- 本会话未做浏览器端验收；排障手法本身不依赖浏览器。
- 误判陷阱条目来自当日实测，未跨环境复现。
