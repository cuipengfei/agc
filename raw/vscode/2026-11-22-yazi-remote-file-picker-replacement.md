# Yazi 远程文件选择器替换记录

> Source: 本机命令输出、扩展测试与浏览器验收记录，2026-11-21 至 2026-11-22
> Collected: 2026-11-22
> Published: 2026-11-22

## 原始目标

用户要求完整替换 `tools/vscode-remote-file-picker` 中的旧文件选择器方案，直接使用 Yazi 作为真实交互界面，同时核验本机 Yazi 来源、升级版本，并纳入 `uv-bun` 维护流程。

## 来源核验

旧版 `/usr/local/bin/yazi` 和 `/usr/local/bin/ya` 的 SHA256 与官方 25.5.31 Linux GNU 发行包一致。`dpkg -S` 未把这两个文件归入 Debian 包管理，说明它们是手工释放包安装，不是 apt 安装的软件包。

## 升级动作

新版从 `https://github.com/sxyazi/yazi/releases/download/v26.9.1/yazi-x86_64-unknown-linux-gnu.zip` 获取后校验 SHA256。两个源码 `/usr/local/bin/yazi` 和 `/usr/local/bin/ya` 先在同目录暂存，再分别原子 rename。实际完成版本为 26.9.1，升级后 `yazi --version`、`ya --version` 和 `uv-bun --yazi-check` 均确认。

## uv-bun 改动

`~/.local/bin/uv-bun` 新增 `--yazi-check` 和 `--yazi-up`，原有全量维护模式同时覆盖 Yazi。回归测试固定在 `~/.local/bin/uv-bun-yazi.test.ts`，迁移后再次运行得到 6 个测试通过。

## 扩展实现

`tools/vscode-remote-file-picker` 已替换为 0.3.0 的 Yazi 文件选择器。`Ctrl+O` 在编辑器标签页启动 Yazi，使用 `--chooser-file <path>` 把用户选择写入私有临时目录，之后读取结果并恢复同一个编辑器组。选择器不是只读界面，Yazi 原配置中的写操作继续生效。

选择路径会保留 remote URI 的 `scheme` 和 `authority`，否则远程服务器会无法正确定位文件。私有临时目录在终端退出后清理。

## 实测边界

Yazi 在 VS Code 集成终端中的成功选择表现为 `code: 0`，而 VS Code 自动关闭路径还会返回其他退出状态，所以判断成功读取选择不能只看 reason。手动强关窗口会得到 `code` 为 `undefined` 的取消路径。

当前 Chromium 上，Monaco 编辑器输入框由原生 `EditContext` 渲染，测试读写应命中 `.native-edit-context`，而不是只等待 `.view-lines` 出现。

## 验证结果

扩展侧有 15 个行为测试通过，语句覆盖 100%，最高 CRAP 7.3，45 个 mutants 全部检出。`uv-bun` 新增 Yazi 逻辑有 6 个行为测试通过，最高 CRAP 9，51 个 mutants 全部检出。

隔离 VS Code Web 验收覆盖目录导航、Unicode 文件选择、取消、返回编辑器并保存原文件。最终 `remote-file-picker-0.3.0.vsix` 只有 6 个文件，不含旧实现中的 `media/vendor/elfinder`、jQuery 或 jQuery UI。

## 仓库状态

仓库内改动以 `c5d94edea6` 提交，并已推送到 `origin/master`。VSIX 路径为 `tools/vscode-remote-file-picker/remote-file-picker-0.3.0.vsix`。
