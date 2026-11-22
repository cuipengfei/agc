# VS Code Web 工作区信任边界

> Source: 本机隔离 VS Code Web 验收过程与浏览器信任管理界面观察，2026-11-22
> Collected: 2026-11-22
> Published: 2026-11-22

## 原始问题

自动浏览器 smoke 反复在初始阶段失败。实际原因不是 picker 功能，而是 VS Code Web 的工作区信任提示挡住了后续自动化步骤。

## 已验证事实

工作区信任随 Chrome `user-data-dir` 和 Web 服务实例保存。同一个隔离 server 里通过界面批准的信任记录，换一个全新的 Puppeteer profile 后仍然出现 `Trust Folder & Continue` 提示，说明信任状态绑定在浏览器 profile 上。

脚本把 URL 的 `folder` 当作父目录并在其中创建随机测试子目录时，如果授权范围是父目录，测试工作区、Chrome profile、服务端 `user-data`、服务端 `server-data` 和临时 Yazi 配置都会被放进同一棵受信目录树。验收要求在脚本内部随机创建工作区，并把授权范围限定到该随机工作区本身。

## 安全边界

通用 smoke 脚本只检测 `Trust Folder & Continue` 提示并抛出错误，不自动点击。调用方需要用指定的 Chrome profile 在测试实例中通过真实界面信任测试工作区。

Chrome profile、服务端数据与测试工作区应放在不同目录，避免 profile 授权和测试数据混在一起。

## 实测结果

改用专用测试工作区并预先用独立 Chrome profile 批准后，真实浏览器验收完整通过：启动 Yazi、目录导航、Unicode 文件选择、取消、编辑并保存原文件。测试结束时信任列表只保留专用测试工作区路径。
