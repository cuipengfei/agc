# herdr-core 的 hc 命令面

> Sources: herdr-core `hc` 0.1.21 命令帮助, 2026-11-14
> Raw: [herdr-core hc 0.1.21 命令面完整帮助输出](../../raw/herdr-plannotator/2026-11-14-herdr-core-hc-cli-command-surface.md)
> Updated: 2026-11-14

## 终端地址与省略规则

每台终端有一个地址：`t7` 这类短号、用户给的名字，或其他机器上的 `machine/t7`。取终端参数的命令是 `get`、`attach`、`read`、`kill`、`rm`、`label`、`keep`、`send`、`keys`、`interrupt`、`wait`、`put`。`events` 用 `--terminal` 指定单个终端，`run` 用 `--parent` 指定父终端，两者都不接位置参数形式的终端地址。

在终端内执行时，`attach`、`read`、`get`、`kill`、`rm`、`wait`、`interrupt` 可以省略终端参数，此时 `hc` 自己挑一个。直接运行不带参数的 `hc` 会打开终端选择菜单，新建项排在最上面。

`hc` 的默认输出是 JSON，例外是 `run` 和 `read` 打印文本；`--json` 可强制 JSON。

## 建立与查看终端

| 命令 | 行为 |
|---|---|
| `hc run` | 新建终端并运行程序；不带参数时运行该机器的 shell；默认等待程序结束 |
| `hc ls` | 列出活动终端，`--all` 包含已结束的，`--label` 按标签筛选 |
| `hc get` | 查看单个终端的信息 |
| `hc attach` | 接入终端亲自操作；默认用 `Ctrl+\` 离开，程序继续运行 |
| `hc read` | 读当前画面，`--lines` 额外向上取历史行 |
| `hc label` | 设置或删除标签；`key=` 删除 |
| `hc keep` | 让终端在程序丢失后原地换成 shell，`--off` 关闭 |
| `hc kill` | 结束终端里的程序，先挂断再升级手段 |
| `hc rm` | 移除**已结束**的终端记录 |

`attach --observe` 只观看：不输入，也不改变尺寸；`--history` 在接入时先显示若干行历史。`keep` 不会重跑原来的命令，只提供 shell。

`ls --label` 与 `events --label` 都要求终端同时具备列出的全部标签。

### run 的关键选项

- `--bg` 启动后立即返回，适合服务与并行任务；配合 `--name` 取名，名字为 1 到 32 个 `a-z 0-9 - _` 字符，在活动终端中唯一。
- `--keep` 等价于对新建终端启用保留；`--rm` 在程序结束后自动清除记录，先让等待中的父终端拿到退出码。
- `--on` 在另一台已添加的机器上运行；`--cwd` 指定目录，跨机器时默认落到该机器的用户目录。
- `--timeout` 是等待多久返回一次，返回后程序继续运行；默认取配置 `wait_timeout`，否则 180 秒。
- 父子关系默认继承：从终端启动的终端以它为父，父程序结束时子终端也结束；`--no-parent`、`--outlive-parent` 分别取消继承与允许越过父结束。
- `--no-notify` 关闭向父终端写入的提示。

## 与终端里的程序交互

| 命令 | 行为 |
|---|---|
| `hc send` | 粘贴文字并按 Enter；会等待用户尚未提交的草稿 |
| `hc keys` | 发送具名按键：`enter`、`esc`、`tab`、`up`、`ctrl+c`、`alt+x`、`f5`、单字符等 |
| `hc interrupt` | 发送停止键并观察后果，默认观察 10 秒 |
| `hc wait` | 等待终端或子终端出现状态变化、指定输出或消息 |
| `hc put` | 把本地文件送到该终端所在机器，并打印落点 |

`send` 的三个门槛：`--if idle` 或 `--if working` 只在指定状态发送；程序阻塞时默认不输入，`--force` 才发送，可能替用户回答了对话框；`--wait` 发送后等待这次 send 开启的那一轮，`--timeout` 控制等待上限。

`wait` 的三种用法对应不同对象：

- 普通程序：`--output` 等开始等待之后的输出包含指定文字，转义序列会被剥掉；阻塞、出错或退出同样结束等待。
- 子终端：`--children all` 等到所有子终端都不再工作，未报告状态的按仍在工作算；`--children any` 等父终端未见的新消息，或下一个停下工作的子终端。
- 单个终端：不带 `--children` 时等它停止工作。

`--timeout` 到期只是返回，不终止任何程序；默认取配置 `wait_timeout`，否则 180 秒。

## 不建立终端

| 命令 | 行为 |
|---|---|
| `hc exec` | 运行一个程序，原样输出它写的内容并返回它的退出码；不建终端，不经过 shell |
| `hc file read` | 打印文本文件，`--offset` 从第几行开始、`--limit` 最多几行 |
| `hc file write` | 把管道输入写成文件，缺失目录一并创建 |
| `hc file edit` | 精确替换只出现一次的文本，`--old` 与 `--new` 可多组配对，全成或全不成 |

`exec` 的 `--env` 在 core 环境之上叠加，`-i` 把管道内容接到程序的标准输入，`--timeout` 默认 60 秒、最多 600 秒，到期会连同它启动的进程一起结束。`file read` 一次最多 8 MB。

`exec` 与 `file` 都支持 `--on` 指定远端机器，`--cwd` 决定相对路径的起点。

## 其他机器

先用 `hc machine add` 登记机器，之后在 `run`、`exec`、`file` 上用 `--on` 指名。

| 命令 | 行为 |
|---|---|
| `hc machine add` | 按 SSH 目标添加：主机名、`user@host`、`user@host:port`，或 SSH 配置里的 Host |
| `hc machine ls` | 列出本机已登记的机器 |
| `hc machine login` | 远端要求重新认证时再次登录 |
| `hc machine update` | 把当前 `hc` 复制过去并重启那台机器的 core，终端继续运行 |
| `hc machine rename` | 改本地名字，旧名字组成的终端地址随即失效 |
| `hc machine rm` | 忘记一台机器；**不结束**它上面的终端 |

`add` 的补充选项：`--name` 命名、`--session` 指定远端 session、`--install` 在远端缺 `hc` 或版本过旧时直接安装而不询问（用于脚本；在终端里会先问）、`--temp` 标记为短期机器（仅影响客户端展示，仍需 `rm` 删除）。`--via` 允许用其他命令替代 ssh 承担连接，要求双向原样传字节且不向用户提问；WSL 场景的写法是 `--via 'wsl.exe -d Ubuntu -e sh -c' --name wsl`。

## core 与工具

| 命令 | 行为 |
|---|---|
| `hc server start` / `stop` / `status` | 启停与查看 core |
| `hc server restart` | 重启 core，程序继续运行；`--fresh` 让新终端采用当前 shell 的环境 |
| `hc update` | 换掉当前 `hc` 并重启，终端继续运行 |
| `hc templates` | 列出可按名字运行的模板，目录为 `~/.config/herdr-core/templates` |
| `hc events` | 持续跟踪变化，可按终端、父子关系与标签过滤 |
| `hc connect` | 用标准输入输出承载 core 协议，`--session` 选择 session |
| `hc schema` | 打印全部 API 方法与 JSON Schema，供客户端开发 |

`server stop` 会停放启用了保留的终端，下次启动 core 时给它们 shell。

`update` 的三个来源：默认下载最新版、`--version X.Y.Z` 要求至少该版本（当前已达标则不动作）、`--from` 使用本地二进制。`--force` 才允许降版本或跨协议代际。

## 帮助层级

`hc <命令> --help` 查单条命令。分组命令（`file`、`server`、`machine`）也可用 `hc <分组> help <子命令>`，例如 `hc file help read`。`hc file help --help` 不被接受，会返回 `unrecognized subcommand '--help'` 的使用错误。

## 证据范围

- 命令名、选项、默认值均来自 raw 中保存的帮助原文。
- 本次只读帮助，未实际执行 `run`、`attach`、`machine add` 等会产生状态的操作；跨机器与保留终端的行为取自帮助描述。
- `hc --licenses` 与 `hc --skill` 只有顶层帮助提及，未展开其输出。

## See Also

- [herdr-core 安装配置与 WSL2/Tailscale 手机接入](herdr-core-install-config-wsl2-tailscale.md)
- [Herdr App、herdr-core 与手机](herdr-app-core-mobile.md)
- [Herdr + Plannotator 工具链全量 Reference](toolchain-reference.md)（Herdr TUI 的 CLI，与 `hc` 是两个程序）
