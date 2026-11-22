# VS Code Web 工作区信任边界

> Sources: 本机隔离 VS Code Web 验收过程与浏览器信任管理界面观察，2026-11-22
> Raw: [VS Code Web 工作区信任边界](../../raw/vscode/2026-11-22-yazi-vs-code-web-workspace-trust.md)
> Updated: 2026-11-22

## Overview

VS Code Web 的工作区信任提示是自动化浏览器验收最常见的假失败来源。信任状态随 Chrome `user-data-dir` 和 Web 服务实例保存，同一个隔离 server 中批准的信任记录换一个全新 Puppeteer profile 后仍会再次出现提示。

## 信任状态绑定关系

工作区信任保存在浏览器 profile 对应的 Web 存储中，同时与服务实例关联。验收要求脚本把 URL 的 `folder` 当作父目录并在其中创建随机测试子目录，授权范围必须限定到该随机工作区本身。如果把父目录设为工作区，测试工作区、Chrome profile、服务端 `user-data`、服务端 `server-data` 和临时 Yazi 配置会混进同一棵受信目录树。

## 安全边界

通用 smoke 脚本只检测 `Trust Folder & Continue` 提示并抛出错误，不自动点击。调用方需要用指定的 Chrome profile 在测试实例中通过真实界面批准测试工作区。

Chrome profile、服务端数据与测试工作区应放在不同目录。测试结束时清理信任列表中不再需要的条目，只保留专用测试工作区。

## 实测结论

改用专用测试工作区并预先用独立 Chrome profile 批准后，真实浏览器验收完整通过：启动 Yazi、目录导航、Unicode 文件选择、取消、编辑并保存原文件。

## See Also

- [Yazi 远程文件选择器](yazi-remote-file-picker.md)
- [VS Code Web Git hook 环境](serve-web-git-hook-environment.md)
