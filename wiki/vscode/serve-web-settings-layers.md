# VS Code serve-web 的设置分层：浏览器 User 与 WSL Remote

> Sources: VS Code 官方设置文档, Unknown; microsoft/vscode 源码 12cd3379, 2026-10-21; 本机 WSL 观察, 2026-10-21
> Raw: [vscode-settings-precedence-official](../../raw/vscode/vscode-settings-precedence-official.md); [2026-10-21-vscode-serve-web-remote-settings-source](../../raw/vscode/2026-10-21-vscode-serve-web-remote-settings-source.md); [2026-10-21-wsl-machine-settings-snapshot](../../raw/vscode/2026-10-21-wsl-machine-settings-snapshot.md)
> Updated: 2026-10-21

## Overview

VS Code 的 serve-web 把浏览器当作界面，把 WSL 里的服务端当作 Remote 端点。用户在浏览器里打开的「User settings JSON」存放在浏览器 IndexedDB 中；服务端读取的远程用户设置位于 `Machine/settings.json`。这两层都叫 User，远程层覆盖浏览器层。再往上还有工作区、工作区文件夹与 Policy；某一份设置能否写某个键，由该键的 scope 与所在层的 scope 集合决定。

## 两层「User settings」

| 层 | 存放位置 | 读取方 | 本机观察 |
|---|---|---|---|
| 浏览器 User | IndexedDB 数据库 `vscode-web-db` 的对象存储 `vscode-userdata-store`，注册为 `vscodeUserData` 文件系统 | Web 客户端 `web.main.ts` | 在 Web 里执行「Preferences: Open User Settings (JSON)」编辑的就是这一层 |
| 服务端 Remote | `<userDataPath>/Machine/settings.json` | `RemoteUserConfiguration` 通过服务端返回的 `settingsPath` 读取 | `/home/cpf/.vscode-server-insiders/data/Machine/settings.json`，956B |
| 服务端 User 目录 | `<userDataPath>/User/` | 键位、MCP、profile 与状态数据 | 存在 `keybindings.json`（408B），没有 `settings.json` |

`data/User/settings.json` 缺失，说明 WSL 侧没有一份传统的桌面式用户设置文件可改。`data/User/` 目录本身存在，服务端源码里的 `mcpResource` 指向 `data/User/mcp.json`。

## 远程设置文件的解析链路

1. 浏览器请求进入 `webClientServer.ts`，`remoteAuthority` 依次取 `x-original-host`、`x-forwarded-host`、请求的 `Host`，存在 `x-forwarded-port` 时替换端口。
2. 该值写入 `workbenchWebConfiguration.remoteAuthority`，随工作台配置下发。
3. `configurationService.ts` 在存在 `remoteAuthority` 时创建 `RemoteUserConfiguration`。
4. `RemoteUserConfiguration` 调用 `remoteAgentService.getEnvironment()`，读取返回的 `environment.settingsPath`。
5. `remoteAgentEnvironmentImpl.ts` 把 `settingsPath` 设为 `this._environmentService.machineSettingsResource`。
6. `serverEnvironmentService.ts` 计算 `machineSettingsResource`，结果为 `userDataPath/Machine/settings.json`。

因此同机 serve-web 的「远程」并不是另一台机器，而是 WSL 里的服务端进程；远程设置文件就是服务端数据目录下的 `Machine/settings.json`。

## 优先级

官方列出的顺序，后列覆盖前列：

| 顺序 | 层 |
|---|---|
| 1 | Default settings |
| 2 | User settings |
| 3 | Remote settings |
| 4 | Workspace settings |
| 5 | Workspace Folder settings |
| 6 | Language-specific default settings |
| 7 | Language-specific user settings |
| 8 | Language-specific remote settings |
| 9 | Language-specific workspace settings |
| 10 | Language-specific workspace folder settings |
| 11 | Policy settings |

源码侧的处理与这份列表一致：

- 本地用户配置与远程用户配置合并为一份用户配置，远程层覆盖本地层：`this._localUserConfiguration.merge(this._remoteUserConfiguration)`。
- 工作区合并顺序为默认配置、应用级配置、用户配置、工作区配置、内存配置；工作区文件夹配置随后合并。
- Policy 在最后按键写入，覆盖前面的值。

语言相关设置在这套合并里作为 override 标识参与，官方列表把它们展开成独立层级。

某份设置能否写在某一层，还受该键 scope 与层的 scope 集合约束。`window.title` 属于 WINDOW scope；工作区层接受 WINDOW，工作区文件夹层不接受。

## window.title 的适用范围

`window.title` 的注册块没有写 `scope`。`windowConfigurationNodeBase` 也没有写 `scope`。配置注册表在属性未声明 scope 时使用 `ConfigurationScope.WINDOW`。远程机器允许的 scope 集合 `REMOTE_MACHINE_SCOPES` 包含 `ConfigurationScope.WINDOW`，所以这个键可以写进 `Machine/settings.json`。工作区层的 scope 集合 `WORKSPACE_SCOPES` 包含 WINDOW，工作区设置可以写这个键；工作区文件夹层的 `FOLDER_SCOPES` 不包含 WINDOW，工作区文件夹设置不能写这个键。

本机 Remote 层的值为 `${rootName}`，文件共 20 个顶层键，`python3 json.load` 解析通过。本次没有检查当前工作区是否写入同名键，也没有检查是否有 Policy 管控；`${rootName}` 是 Remote 层的值，最终生效值取决于这些未检查的层。

## 写入与验证边界

- 编辑目标是 `<userDataPath>/Machine/settings.json`。本机为 `/home/cpf/.vscode-server-insiders/data/Machine/settings.json`。
- 在 Remote 与浏览器两层之间，浏览器 User 层的同名键会被 Remote 层覆盖；要让浏览器层的值生效，需要去掉 Remote 层的同名键。工作区层若写入同名键，会覆盖这两层。
- 服务端返回的页面仍是「The latest version of the Visual Studio Code Server is downloading, please wait a moment...」，浏览器标签标题尚未观察。服务端更新完成后重新加载 Web 窗口再看。
- 官方文档只列出 Windows、macOS、Linux 桌面版的用户设置文件位置，没有描述 Web 客户端的 IndexedDB 存储。IndexedDB 位置来自源码阅读。
- 工作区是否写入 `window.title`、是否有 Policy 管控，本次没有检查。工作区层接受 WINDOW scope，工作区文件夹层不接受。
- `data/User/` 下各子目录的完整用途没有逐项验证；本文只使用源码可证的 `mcp.json` 路径与本机可见的 `keybindings.json`。
