# WSL 侧 VS Code Insiders 服务端设置快照

> Source: 本机文件系统观察（WSL2，用户 cpf）
> Collected: 2026-10-21
> Published: 2026-10-21

## 服务端数据目录

`~/.vscode-server-insiders/data` 下：

```text
[User]
History/
globalStorage/
workspaceStorage/
keybindings.json  408B
[Machine]
keybindings.json  209B
settings.json  956B
[User/settings.json]
absent
```

`data/User/` 目录存在，内含 `keybindings.json`、`History/`、`globalStorage/`、`workspaceStorage/`；其中没有 `settings.json`。

## Machine/settings.json

文件共 22 行、20 个顶层键，`python3 json.load` 解析通过。全文：

```json
{
    "editor.fontFamily": "'Maple Mono NF CN', 'JetBrains Mono'",
    "editor.wordWrap": "on",
    "window.autoDetectColorScheme": true,
    "diffEditor.codeLens": true,
    "diffEditor.wordWrap": "on",
    "workbench.editor.wrapTabs": true,
    "terminal.integrated.copyOnSelection": true,
    "terminal.integrated.confirmOnExit": "hasChildProcesses",
    "terminal.integrated.cursorBlinking": true,
    "terminal.integrated.cursorStyleInactive": "block",
    "terminal.integrated.gpuAcceleration": "on",
    "scm.inputFontFamily": "'Maple Mono NF CN', 'JetBrains Mono'",
    "terminal.integrated.fontFamily": "'Maple Mono NF CN', 'JetBrains Mono'",
    "terminal.integrated.fontLigatures.enabled": true,
    "editor.wrappingStrategy": "advanced",
    "editor.fontLigatures": true,
    "json.schemaDownload.enable": true,
    "openchamber.apiUrl": "http://localhost:4096",
    "terminal.integrated.enableImages": true,
    "window.title": "${rootName}"
}
```

本次新增的键为 `"window.title": "${rootName}"`，其余 19 项为文件原有内容。

## 浏览器观察

访问 `http://127.0.0.1:6689/` 返回：

```text
The latest version of the Visual Studio Code Server is downloading, please wait a moment...<script>setTimeout(()=>location.reload(),1500)</script>
```

服务端仍在下载更新，浏览器标签标题未能观察。
