# Tern CLI 帮助行为原始材料

> Source: 本机 Tern 0.9.2 的 `tern --help`、`tern help dev` 与子命令帮助调用；官方 reference/cli.md
> Collected: 2026-10-17
> Published: Unknown

本材料不包含凭据、URL token 或用户命令内容。

## 根帮助命令范围

`tern --help` 的根帮助列出会话与窗格管理、运行、移动、画中画、关闭、输入、捕获、进程、事件、浏览器、远程、Web、注册和注销等命令。`tern help dev` 另行列出 `shot`、`serve`、`bundle` 以及 harness、pack、`__spawned` 等开发命令。

确认支持 `--help` 并返回完整说明的 18 个命令：

```text
inspect
new
split
run
move
pip
dock
rename
focus
close
kill
wait
keep-open
send
capture
process
events
browser
```

这些输出说明：

- `inspect` 列出当前窗口的会话、标签页和窗格。
- `new session` 和 `new tab` 创建会话或标签页，可带目录、keep-open 和启动命令。
- `split` 在指定窗格右侧或下方创建窗格。
- `run` 在指定窗格输入命令并回车。
- `move` 调整窗格相对位置或移动到新标签页。
- `focus` 使窗口聚焦指定窗格；`close` 关闭窗格；`kill session` 关闭会话。
- `send` 支持键位、文本、粘贴和鼠标事件。
- `wait` 可等待退出、提示符或 idle，超时返回 124。
- `capture` 可读取可见内容，支持 HTML、ANSI 和 scrollback。
- `process` 返回窗格进程信息；`events` 持续输出 JSON lines。
- `pip` 将窗格作为画中画显示，`dock` 放回分屏。
- `browser` 接收 JSON 操作并返回 JSON，支持 snapshot 和 act 等浏览器操作。

## 不支持 `--help` 或不能把帮助调用当只读操作的分支

实测中，部分命令不会把 `--help` 当作统一的帮助参数：

```text
remote update --help
error: unexpected argument '--help' found

  tip: to pass '--help' as a value, use '-- --help'
```

```text
remote setup --help
SSH login to --help failed: io error: dns error: failed to lookup address information: Name or service not known
```

```text
remote login --help
SSH login to --help failed: io error: dns error: failed to lookup address information: Name or service not known
```

`serve --help` 返回 `ETIMEDOUT`，而 `tern help dev` 说明 `tern serve` 会启动持续运行的 headless session，直到收到 `quit`。因此不能将超时当作无副作用的帮助输出。

`remote install --help` 与 `remote serve --help` 输出 usage 后退出状态 1；`remote trust --help` 输出 usage 后退出状态 1；`bundle --help` 输出需要当前目录为 git 仓库的错误；`shot --help` 输出需要先启动 `tern daemon` 的错误；`web serve --help` 只给单行 usage。上述结果都不能证明完整帮助支持。

第一次递归扫描因命令行为不一致被停止。停止后进程列表只存在原有 Tern daemon 和 web serve，没有本次帮助调用遗留的 serve、shot 或 bundle 进程。`tern ls --json` 的现有会话和 pane 与扫描前一致；`tern plugin list --json` 仍返回空插件目录。仓库未因帮助扫描产生改动。

## 远程分支证据边界

本机 `remote hosts` 与 `remote discover` 本次输出为空；`remote logout --help` 打印远程命令 usage 摘要；`remote doctor --help` 只给单行 usage。不能根据这些输出进一步证明远程安装、更新、信任或连接行为。远程功能描述只能限定在已读取的 usage 参数范围，实际行为未验证。

## 官方 CLI 参考范围

官方 `reference/cli.md` 只讲 `tern plugin` 子命令，不覆盖 Tern 全部 CLI。要查 `split`、`capture`、`browser` 等命令，需使用本机帮助或其他对应文档页，不能用该页补全全部命令行为。
