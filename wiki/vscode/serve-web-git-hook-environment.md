# VS Code Web Git hook 的 PATH 与 locale

> Sources: 本次会话的提交日志、本机 VS Code Insiders Git 扩展和服务环境观察，2026-11-21；systemd 本地手册，2026-11-21
> Raw: [VS Code Web Git hook 环境排障记录](../../raw/vscode/2026-11-21-serve-web-git-hook-path-locale.md)
> Updated: 2026-11-21

## 提交失败与进程环境

本机一次 Git 提交中，`tern-ci-checks` 在运行 `bun install --frozen-lockfile --prefer-offline` 时报告 `bun: command not found`，退出码为 `127`。Bun 已安装在 `~/.bun/bin`；运行中的 VS Code Insiders Web Git 扩展宿主进程与 systemd 用户管理器的 `PATH` 都缺少该目录。根据提交命令样式、扩展代码和进程环境，推断这次失败来自 VS Code Web 的 Git 提交流程；原提交进程已退出，未观察到当时的进程树和环境。

该仓库的 pre-commit 配置以 `language: system` 启动 Tern 检查。检查脚本先根据暂存文件确定检查范围，再将暂存内容导出到临时目录。涉及 Tern 时，脚本先调用 Bun 安装依赖，之后才运行 `cli.test.mjs`；本次失败发生在安装依赖的调用处。

## locale 警告

本机安装的 VS Code Insiders Git 扩展启动 Git 时设置 `LC_ALL=en_US.UTF-8` 和 `LANG=en_US.UTF-8`。排查时系统的 `locale -a` 只有 `C`、`C.utf8` 和 `POSIX`，提交日志因此出现 `setlocale` 警告。

运行 `sudo locale-gen en_US.UTF-8` 后，`/etc/locale.gen` 包含 `en_US.UTF-8 UTF-8`，`locale -a` 显示 `en_US.utf8`，指定 `LC_ALL=en_US.UTF-8` 后 `locale charmap` 输出 `UTF-8`。

## 用户服务的 PATH

终端配置和 systemd 用户管理器的环境分别建立。`systemctl --user import-environment PATH` 把执行该命令的终端 PATH 复制到当前用户管理器，之后启动的用户服务可以继承它；这个导入随用户管理器结束而失效。

本机随后把当时终端的完整 PATH 快照写入 `~/.config/environment.d/zz-terminal-path.conf`，移除临时导入值，执行 `systemctl --user daemon-reload` 并重启 VS Code Web 服务。该配置作用于由用户管理器启动且没有另行覆盖 PATH 的用户服务。文件保存的是快照；终端之后修改 PATH 时，需要同步更新该文件。

systemd 将 `environment.d` 配置文件跨目录按文件名字典序处理，排序靠后的赋值覆盖同一变量。本机 `99-environment.conf` 链接到设置 PATH 的 `/etc/environment`，`990-snapd.conf` 将 `/snap/bin` 追加到 PATH；`zz-terminal-path.conf` 排在两者之后。若另有排序更靠后的 PATH 赋值，以其结果为准。

## 验证范围

使用 systemd 用户环境生成器检查时，生成的 PATH 与当时终端的完整 PATH 一致。重新加载配置并重启服务后，用户管理器与服务主进程的 PATH 也与该终端一致。在服务的 PATH 和 `en_US.UTF-8` locale 下，Bash 运行 `bun --version` 输出 `1.4.5`，未出现原有 locale 警告；VS Code Web HTTP 入口返回 `200`。

本次没有重新执行原 Git 提交或完整 `tern-ci-checks`，也没有重启 systemd 用户管理器。环境生成器、重新加载后的用户管理器与重启后的服务分别完成了上述检查。

## See Also

- [VS Code serve-web 的设置分层：浏览器 User 与 WSL Remote](serve-web-settings-layers.md)
- [WSL 服务排障手法](../wsl-windows/wsl-service-debug-playbook.md)
