# Remote File Picker

在 VS Code Web 按 `Ctrl+O`，在编辑器标签页中使用服务端 Yazi 选择文件。确认后返回原编辑器组，文件编辑和保存使用 VS Code。

## 环境

扩展运行在服务端的 workspace extension host。WSL 或 Docker 容器需要安装 Yazi，并让 VS Code 服务进程的 `PATH` 可以找到 `yazi`。界面由 VS Code 的集成终端显示，扩展没有运行时 npm 依赖。

## 使用

1. 在编辑器中按 `Ctrl+O`，或执行 **Remote File Picker: Open File**。
2. 起始目录为当前文件所在目录；没有当前文件时使用工作区目录，没有工作区时使用服务端用户主目录。
3. 使用 Yazi 的按键和鼠标浏览。默认 `↑`、`↓` 移动，`→` 进入目录，`←` 返回上级目录，`Enter` 确认文件。
4. 确认后，Yazi 退出，所选文件在原编辑器组打开。支持 Yazi 返回的多个文件；目录结果会显示错误，不会交给编辑器打开。
5. 默认按 `q` 取消，也可以关闭终端标签页。取消后恢复原编辑器。默认 `Esc` 取消 Yazi 内部选择或关闭内部操作。

重复执行打开命令会显示同一个选择器。每次选择使用独立私有临时目录，结束时删除结果和临时目录。快捷键在 Web 界面启用，终端中的 `Ctrl+O` 仍交给终端；用户自定义快捷键优先。

## Yazi 配置

扩展直接启动 `yazi --chooser-file <结果文件>`，继承 VS Code 服务端终端环境，由 Yazi 自己加载配置。

默认 Unix 配置目录为 `~/.config/yazi/`，`YAZI_CONFIG_HOME` 可以指定其他目录。主要文件是 `yazi.toml`（一般设置）、`keymap.toml`（按键）、`theme.toml`（配色），以及 `init.lua` 和 `plugins/`（插件）。自定义按键会改变上述默认操作。配置说明：<https://yazi-rs.github.io/docs/configuration/overview>。

Yazi 的 chooser 模式改变文件确认的返回方式，仍保留用户配置中的文件管理操作。扩展只验证选择结果并打开文件；删除、重命名等 Yazi 操作遵循用户自己的配置和文件系统权限。

Yazi 图标与文字使用 VS Code 的终端字体设置 `terminal.integrated.fontFamily` 和 `terminal.integrated.fontSize`。图标需要 Nerd Font 支持。终端响应超时的说明：<https://yazi-rs.github.io/docs/faq#trt>。

## 构建与安装

```bash
bun install --frozen-lockfile
bun run test
bun run package
```

在当前 VS Code Web 的扩展面板执行 **Extensions: Install from VSIX...**，选择 `remote-file-picker-0.3.0.vsix`，或使用服务端 CLI：

```bash
/path/to/server/bin/code-server-insiders --install-extension /path/to/remote-file-picker-0.3.0.vsix --force
```

安装后重新加载编辑器窗口。

## 验证

`bun run test` 使用真实私有临时目录和受控 VS Code 接口验证启动、重复触发、Unicode 文件路径、确认、取消、目录拒绝、异常和关闭时的资源清理。

`bun run smoke --profile /path/to/disposable-chrome-profile --url 'http://localhost:6693/?folder=vscode-remote://localhost:6693/path/to/test-workspace'` 在独立 `user-data-dir` 的 serve-web 实例中启动 Yazi、确认文件、取消选择、编辑并保存原文件。使用专用测试工作区，Chrome profile 和服务数据放在工作区之外。运行前，用指定的 Chrome profile 信任该测试工作区；脚本在其内部创建随机测试数据目录，结束时删除。遇到信任提示会终止并报错。

## 更新记录

### 0.3.0

提供 Yazi 编辑器终端选择器，沿用服务端 Yazi 配置，使用 chooser 结果打开文件，并管理终端退出、原编辑器恢复和私有临时目录清理。
