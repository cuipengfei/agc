# VS Code Web Git hook 的 PATH 与 locale 排障记录

> Source: 2026-11-21 本次会话中的提交日志、本机进程环境、VS Code Insiders Git 扩展和 agc hook 源码、systemd 本地手册与命令输出
> Collected: 2026-11-21
> Published: 2026-11-21

## 用户提供的提交日志

Git 提交时，`Detect hardcoded secrets` 显示 `Passed`；`Tern quick checks` 显示 `Failed`，hook id 为 `tern-ci-checks`，退出码为 `127`。相关错误摘录：

```text
bash: warning: setlocale: LC_ALL: cannot change locale (en_US.UTF-8): No such file or directory
bun: command not found
```

报错指向 `tools/tern-maintain/ci/check.sh` 的第 52 行。仓库 `.pre-commit-config.yaml` 中，该 hook 使用 `bash tools/tern-maintain/ci/check.sh --staged`，`language: system`，`always_run: true`。脚本根据暂存文件确定是否运行 Tern 检查，并将暂存内容导出到临时目录；Tern 检查先运行 `bun install --frozen-lockfile --prefer-offline`，然后运行 `bun test cli.test.mjs`。

## 进程环境和语言设置

本机会话的 `command -v bun` 找到 `~/.bun/bin/bun`。运行中的 VS Code Insiders Web 服务归属 systemd 用户单元 `code-serve-web.service`；其 Git 扩展宿主进程的 `PATH` 没有 `~/.bun/bin`，用户服务管理器的 `PATH` 也没有该目录。服务单元设置了 `LANG=en_US.UTF-8` 和 `LC_MESSAGES=en_US.UTF-8`。

安装在本机的 VS Code Insiders Git 扩展 `extensions/git/dist/main.js`，在启动 Git 时合并环境变量，代码中包括以下片段：

```text
LANGUAGE:"en",LC_ALL:"en_US.UTF-8",LANG:"en_US.UTF-8",GIT_PAGER:"cat"
```

同一扩展的 commit 代码可生成 `-c user.useConfigOnly=true`。根据提交命令样式、运行中扩展的环境和报错，推断该次失败发生在 VS Code Web 的 Git 提交流程。原提交进程已退出，未观察到该次提交的进程树或环境。

修复前，`locale -a` 的输出只有 `C`、`C.utf8` 和 `POSIX`。系统 locale 设置为 `LANG=C.UTF-8`。

## 持久配置与生效顺序

首先将当前终端的完整 `PATH` 导入 systemd 用户管理器并重启 `code-serve-web.service`；服务主进程的 `PATH` 与当时终端一致。该导入属于运行中的用户管理器环境。

随后创建 `~/.config/environment.d/zz-terminal-path.conf`，保存当时终端的完整 `PATH` 快照；移除之前导入的临时 `PATH`，执行 `systemctl --user daemon-reload` 并重启服务。快照影响由该 systemd 用户管理器启动且没有另行覆盖 `PATH` 的用户服务。终端之后修改 `PATH` 时，该快照不会自动更新。完整路径列表在此省略。

本机 `environment.d` 的配置顺序如下：`99-environment.conf` 链接到 `/etc/environment`，其中设置了 `PATH`；`990-snapd.conf` 将 `/snap/bin` 追加到 `PATH`。本地 `environment.d` 手册说明配置文件跨目录按文件名字典序处理，同一变量由排序靠后的赋值覆盖。`zz-terminal-path.conf` 排在上述文件之后。

使用 systemd 用户环境生成器，在仅指定 `HOME` 和基础 `PATH` 的环境下检查：生成的 `PATH` 与当时终端完整 `PATH` 一致。之后 `systemctl --user show-environment` 和服务主进程 `/proc/<PID>/environ` 中的 `PATH` 均与该终端一致。

## locale 和服务验证

执行 `sudo locale-gen en_US.UTF-8` 后，输出包含：

```text
Generating locales (this might take a while)...
  en_US.UTF-8... done
Generation complete.
```

`/etc/locale.gen` 中出现 `en_US.UTF-8 UTF-8`；`locale -a` 包含 `en_US.utf8`，`LC_ALL=en_US.UTF-8 locale charmap` 输出 `UTF-8`。

重启服务后，服务状态为 `active`；在其 `PATH` 与 `LC_ALL=en_US.UTF-8` 下运行 Bash 和 `bun --version`，输出 `1.4.5`，没有出现上述 locale 警告。VS Code Web 的 HTTP 入口返回 `200`。

本会话未重新执行用户的 Git 提交或完整 `tern-ci-checks`，也未重启 systemd 用户管理器。环境生成器、重新加载后的用户管理器与重启后的服务分别完成了上述检查。
