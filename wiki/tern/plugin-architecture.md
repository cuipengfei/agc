# Tern 插件架构与平台边界

> Sources: Stencil official Tern Plugin SDK documentation, 2026-10-17
> Raw: [Packages、Architecture、Support Matrix 与 CLI 官方摘录](../../raw/tern/2026-10-17-plugin-sdk-four-pages.md)
> Updated: 2026-10-17

## 插件包与配置目录

插件是一个目录，包含 `plugin.toml`、最多两个 Luau 入口文件及其引用的模块和样式。只有清单与入口必需；清单未引用的其他文件不会自动读取。schema 1 会把未知键视为错误。

插件包位于 `<config>/plugins/`。安装包复制到该目录；linked package 保留原位置，适合开发。每个插件的数据目录为 `<state>/plugin-data/<id>/`，两半及各窗口共享同一个 `tern.kv` 存储。文件修改时间或长度变化时，各 VM 会重新读取；同时写入仍可能竞争，最后一次 rename 生效。

无效目录会作为 problem 列出错误并停止加载。有效包的状态为 Ready、Disabled 或 Failed。

## Host 与 Window 的分工

Host half 在会话 daemon 中运行；无 daemon 时在窗口进程的工作线程运行。它拥有块类型、命令 lens、pane hooks、spawn filter 和 `tern.pane`。Window half 在每个窗口的 UI 线程运行，拥有命令、键位、routes、chrome、`tern.css`、窗口事件和 `cx.layout`。

分开的原因来自运行状态的位置：pane 及其权威屏幕副本在 daemon，窗口只是镜像，因此 pane 扩展必须在 host 侧才能在窗口退出后继续存在并到达其他副本。标签页、焦点、键位和样式属于窗口，必须在它的 UI 线程修改，因此属于 window half。

块是一个 daemon pane，程序由 Lua table 提供。Lens 是否认领命令只由 manifest 的 match globs 决定；所有副本需要在运行 Lua 前作出一致决定，所以 lens 的 open handler 不能拒绝已经发生的认领，应通过收窄 globs 控制范围。

## 平台能力

macOS、Linux 和 Windows 支持 host 与 window 两半。iOS 不运行 host half，window half 以解释方式运行；shell 和 host 能力来自它连接的主机。

Web tab 不运行任何 Lua，也不加载自己的插件。它接收提供页面的那台主机的 catalog，因此能显示该主机的插件块、lens 视图和 effects，并安装 Ready 插件的 manifest styles。Window half 运行时通过 `tern.css` 添加的样式不会到达 Web tab。

## `tern plugin` 的行为范围

官方 Command Line 页面只覆盖 `tern plugin`，不覆盖 Tern 全部 CLI。该命令管理本机插件目录并请求 daemon 重载，自己不执行插件 Lua。

install、remove、link 和 unlink 修改目录后请求重载。install 与 link 会先校验清单、入口和样式，校验失败就不复制或写链接。重载结果可能包含 Failed 插件或目录问题，因此自动化需要同时检查退出码和重载报告。

`types` 写出当前 Tern 的 Luau API 定义文件，供编辑器使用；它不修改插件目录，也不连接 daemon。

## See Also

- [Tern 设置存储位置](settings-storage.md)
- [Tern：TSP 与 browser 后端](tsp-and-browser-backend.md)
