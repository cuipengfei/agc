# Yazi 远程文件选择器

> Sources: 本机命令输出、扩展测试与浏览器验收记录，2026-11-22
> Raw: [Yazi 远程文件选择器替换记录](../../raw/vscode/2026-11-22-yazi-remote-file-picker-replacement.md)
> Updated: 2026-11-22

## Overview

`tools/vscode-remote-file-picker` 的 0.3.0 版本直接用 Yazi 作为远程 VS Code Web 的文件选择界面，取代旧的自写 webview、connector 和 elFinder 方案。扩展在编辑器标签页启动一个集成终端运行 `yazi --chooser-file <path>`，用户确认选择后读取私有结果文件并恢复同一个编辑器组。

## 为什么用 Yazi chooser

扩展不需要实现自己的目录 UI。启动 Yazi 就能复用用户已有的 Yazi 配置、键位和输入法。Yazi 的写操作、删除、重命名等能力继续由 Yazi 自己执行，选择器不是只读文件浏览器。

## 实现要点

选择结果写入私有临时目录，终端退出后读取并清理。取消路径也要恢复原来的编辑器状态。选择路径返回给 VS Code 时必须保留 remote URI 的 `scheme` 和 `authority`，否则远程服务器无法定位文件。

Yazi 在 VS Code 集成终端中成功选择返回 `code: 0`，但 VS Code 自动关闭路径还会返回其他退出状态，所以判断成功读取选择不能只看 reason。手动强关窗口得到 `code` 为 `undefined` 的取消路径。

## 本机版本与维护

旧版 `/usr/local/bin/yazi` 和 `/usr/local/bin/ya` 的 SHA256 与官方 25.5.31 Linux GNU 发行包一致，不受 `dpkg` 管理。当前版本 26.9.1，从 `https://github.com/sxyazi/yazi/releases/download/v26.9.1/yazi-x86_64-unknown-linux-gnu.zip` 下载并校验 SHA256 后替换。

`~/.local/bin/uv-bun` 提供 `--yazi-check` 和 `--yazi-up`，全量维护模式同时覆盖 Yazi。回归测试固定在 `~/.local/bin/uv-bun-yazi.test.ts`。

## 验证结论

扩展 15 个行为测试通过，语句覆盖 100%，最高 CRAP 7.3，45 个 mutants 全部检出。`uv-bun` Yazi 逻辑 6 个行为测试通过，最高 CRAP 9，51 个 mutants 全部检出。隔离 VS Code Web 验收覆盖启动、目录导航、Unicode 文件选择、取消和保存原文件。

最终 `remote-file-picker-0.3.0.vsix` 只有 6 个文件，不含旧实现的 vendor 资产。仓库改动以 `c5d94edea6` 提交并推送到 `origin/master`。

## See Also

- [VS Code Web 工作区信任边界](vs-code-web-workspace-trust.md)
- [VS Code Web Git hook 环境](serve-web-git-hook-environment.md)
- [Yazi 配置参考与本机同步](../terminal-multiplexers/yazi-configuration-reference.md)
