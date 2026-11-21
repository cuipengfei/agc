# Remote File Picker

在 VS Code Web 按 `Ctrl+O`，通过浏览器内的 elFinder 界面选择当前服务端文件。界面显示在编辑器标签页，文件打开在原来的编辑器组中，编辑和保存使用 VS Code 文件通道。

## 环境

扩展运行在 VS Code 的 workspace extension host，使用 `vscode.workspace.fs`。WSL 和 Docker Linux 容器只需要提供 VS Code serve-web 与服务端文件系统。界面由客户端浏览器绘制。

GUI 复用官方 elFinder 2.1.70，搭配 jQuery 3.7.1 和 jQuery UI 1.13.3。资源随 VSIX 打包，本地消息通道负责目录数据和文件选择。

## 使用

1. 在编辑器中按 `Ctrl+O`，或执行 **Remote File Picker: Open File**。
2. 使用目录树和文件列表浏览目录，或在地址栏输入服务端的绝对路径。
3. 用 elFinder 的 Places 收藏常用目录。收藏保存在对应服务端的扩展状态中，重开选择器后保留。
4. 双击文件或确认选择，在原编辑器组中打开文件。取消按钮、`Esc` 和关闭选择器标签页会返回原编辑器。

选择器按只读浏览与选择用途配置。文件内容由 VS Code 编辑器读取和保存。目录读取或打开失败会显示错误，并允许继续选择。

选择器各处的文字使用 `editor.fontFamily` 和 `editor.fontSize`，设置变化会在已打开的界面中生效。文件夹与文件隐藏选择器只读政策附带的装饰图标，实际访问被拒绝时仍显示相应状态和错误。

打开目录时只读取当前目录及其直接子项。子目录提示通过 elFinder 的 `subdirs` 按需查询，元数据读取以最多 16 项并发执行。初始化目录树仍提供完整祖先；读取结果仅在单次请求内复用，后续导航和刷新读取当前文件系统状态。

快捷键在 Web 界面启用，终端保留自己的 `Ctrl+O`。用户自定义快捷键优先，可在 **Preferences: Open Keyboard Shortcuts** 搜索 `remoteFilePicker.open` 调整绑定。

## 构建与安装

从本目录执行：

```bash
bun install --frozen-lockfile
bun run test
bun run package
```

`build-assets.js` 从固定依赖复制浏览器资源到 `media/vendor/`。该目录为构建产物，VSIX 包含资源，Git 不跟踪这些副本。许可证在 `THIRD-PARTY-LICENSES.txt`。

在当前 VS Code Web 的扩展面板执行 **Extensions: Install from VSIX...**，选择 `remote-file-picker-0.2.1.vsix`。也可使用当前服务端的 CLI：

```bash
/path/to/server/bin/code-server-insiders --install-extension /path/to/remote-file-picker-0.2.1.vsix --force
```

安装后按提示重新加载编辑器窗口。

## 验证

`bun run test` 验证真实临时文件系统上的 elFinder 只读连接协议，以及受控 VS Code 接口下的面板生命周期、文件打开、错误、取消和收藏持久化。

`bun run smoke` 使用 Chromium 和真实 elFinder 执行无截图的浏览器功能验证。浏览器和 VS Code 平台接口之间的测试连接使用受控消息桥，目录内容来自实际临时文件系统。

`bun run smoke --url http://localhost:6688/` 使用服务端提供的 remote authority 创建临时工作区，从 Explorer 打开测试文件，再通过 Ctrl+O 选择中文文件、编辑、保存到原文件、重新打开选择器并取消。测试结束会删除临时文件。布局由用户查看确认；浏览器测试不生成截图。

## 更新记录

### 0.2.1

目录树、列表、工具栏和菜单使用 VS Code 编辑器字体设置，并保留动态更新。清理只读政策附带的图标装饰。目录内容按需读取，移除普通目录打开时的祖先与兄弟目录扫描，并并发读取子项元数据。

### 0.2.0

提供按需激活的 Web Ctrl+O 入口、elFinder 浏览器文件选择界面、服务端目录连接、绝对路径导航、Places 收藏持久化和原编辑器组文件打开。
