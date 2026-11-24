# OMP 19.1.1–19.0.1 配置项增量

> Sources: can1357/oh-my-pi v19.1.1、v19.1.0、v19.0.1 CHANGELOG 与 Releases, 2026-11-19 至 2026-11-23; 本机 v19.1.1 设置注册表、源码与用户级配置, 2026-11-23
> Raw: [OMP 19.1.1–19.0.1 配置项增量与本机会话迁移](../../raw/omp-config/2026-11-23-omp-19-1-release-config-inventory.md); [Magic Edit 源码与本机运行取证](../../raw/omp-tools/2026-11-23-magic-edit-source-and-runtime.md); [OMP pi-native、auth-gateway 与 scoped clients 源码取证](../../raw/omp-auth/2026-11-23-pi-native-gateway-and-scoped-clients.md); [copilot-api 失败诊断与本机链路超时取值摘录](../../raw/copilot-gateway/2026-11-25-copilot-api-failure-diagnostics.md)
> Updated: 2026-11-25

## Overview

最近三个正式版本是 v19.1.1、v19.1.0、v19.0.1。配置变化包括 `computer.takeover`、扩展 Todo 后端、状态栏 `tree`、工具命令四键改名、Magic Edit、MCP 进程共享与空闲停止、Binary Ninja、PTY 通知、模型级 Snapcompact 形状和 `pi-native` 网关目录。v19.1.0 还用 bash tool commands 取代了旧 `xd://` 工具设备。

本机安装版本和 NPM `latest` 都是 `19.1.1`。本机已完成 Magic Edit 与四个工具键迁移；两个流超时键在 2026-11-25 由 `150` 秒改为 `420` 秒。

## 新增、改名与移除的 config.yml 设置

| 版本 | 配置 | 注册表默认 | 本机最终值 | 行为 |
|---|---|---|---|---|
| 19.1.1 | `computer.takeover` | `fallback` | `fallback` | 控制桌面自动化何时使用前台窗口，取代 `computer.backgroundFallback` |
| 19.1.1 | `todo.backend` | `native` | `native` | 选择会话 Todo 后端；扩展后端可镜像完整 Todo 列表 |
| 19.1.1 | 状态栏段 `tree` | 预设未包含 | 未启用 | rewind 或分支上显示会话树位置；Tern 点击打开 `/tree` |
| 19.1.0 | `tools.commands` | `true` | `false` | 工具作为 bash 命令或顶层工具提供 |
| 19.1.0 | `tools.commandDocs` | `catalog` | `inline` | 控制命令帮助进入系统提示的方式 |
| 19.1.0 | `tools.commandInline` | `[]` | `[]` | `builtins` 模式下额外内联匹配的动态命令 |
| 19.1.0 | `tools.commandNotices` | `true` | `true` | 控制命令挂载和卸载通知 |
| 19.1.0 | `edit.mode: magic`、`edit.magic.model` | `hashline`；模型未设置 | `magic`；模型未设置 | 主模型描述修改，apply model 生成并应用补丁 |
| 19.1.0 | `mcp.shared` | `true` | `true` | 通过 daemon 共享适用的 MCP 单元 |
| 19.1.0 | `mcp.idleStopMinutes` | `5` | `5` | 无租约、无请求、无开放订阅后的空闲停止时间 |
| 19.1.0 | `pty.notify` | `on` | `on` | PTY 程序等待键盘输入时通知 |
| 19.1.0 | `disassembler.backend: binja` | `auto` | `auto` | 反汇编后端增加 Binary Ninja |
| 19.1.0 | `binja.installDir`、`binja.python`、`BN_INSTALL_DIR` | 空值、自动探测 | 空值 | 指定 Binary Ninja 核心库位置或可用 Python 3 |
| 19.1.0 | `browser.relayUrl` | 未设置 | 未设置 | 本机 relay 改由 Chrome 扩展 native host 提供；此键保留给远端转发 relay |
| 19.1.0 | 移除 `tui.completeScrollback` | 无 | 旧值为 `true` | 被覆盖的 transcript 行始终进入终端回滚区 |

四个工具键的旧名称依次是 `tools.xdev`、`tools.xdevDocs`、`tools.xdevInlineDevices`、`tools.xdevNotices`。本机迁移后由 `omp config get` 读回的值为 `false`、`inline`、`[]`、`true`。

## `computer.takeover` 四档

| 值 | 行为 |
|---|---|
| `fallback` | 后台投递优先，后台不可用时短暂接管并恢复焦点；agent 也可显式请求接管 |
| `foreground` | OMP 根据目标是否已在前台、后台是否可用决定；agent 不能强制接管 |
| `always` | 每次窗口或元素输入都先激活目标，完成后恢复焦点 |
| `refuse` | 禁止前台接管；无法后台投递的调用失败，并拒绝 agent 请求的前台切换与桌面输入 |

旧 `backgroundFallback: refuse` 迁移为 `takeover: refuse`，旧 `takeover` 对应 `takeover: fallback`。

## `tools.commands: false` 的实际边界

当 bash 存在且 `tools.commands: true` 时，低频工具作为 `<tool> --help`、`<tool> <args>` 形式的 OMP 命令运行。`false`、没有 bash、或工具名受到限制时，另行启用的工具保留在顶层工具定义中。

`false` 只关闭 OMP 的 bash tool commands。bash 工具仍可运行系统已有的 `git`、`rg`、`python3` 等程序。其余三个命令设置管理帮助文本和通知，不改变 `false` 时的顶层暴露方式。

## MCP 空闲停止：stdio 与 HTTP

现代无 initialize handshake 的 server 不保存 caller state，可以按作用域共享。空闲计时要求没有进行中的请求，也没有仍开放的订阅；活动会重新计时。

| 形态 | 空闲后停止的对象 |
|---|---|
| stdio | OMP 启动的本地 MCP 子进程 |
| HTTP | OMP 持有的 upstream 连接和相关资源；远程 HTTP 服务继续运行 |
| 已执行 initialize、携带 caller state 的旧路径 | 保持会话隔离并等最后一个租约释放，不套用共享单元的空闲停止 |

`mcp.idleStopMinutes` 只用于共享 server。daemon 不可用时，OMP 回退到私有进程。

## models.yml、KDL 与环境变量

| 配置 | 引入或变化 | 说明 |
|---|---|---|
| `transport: pi-native` | 19.0.1 修复、19.1.1 增加目录 | provider 请求走网关 `/v1/pi/stream`；v19.1.1 从 `/v1/pi/models` 获取网关目录 |
| `snapcompactShape` | 19.0.1 新增 | 可放在模型、`modelOverrides` 和扩展注册模型上，包含 `variant` 与 `frameSize` |
| `prompt-perturbation` KDL axis | 19.1.0 新增 | 按安装 ID 固定改写静态系统提示和工具描述，便于在同一安装内复用前缀缓存 |
| `OMP_PROMPT_PERTURBATION` | 19.1.0 新增 | `1` 强制开启、`0` 强制关闭；未设置时服从 KDL，默认关闭 |
| `uncached-instructions` | 19.1.0 新增 | GPT-6.2 的 Responses 系统提示改放前置 `developer` 输入项 |

`snapcompactShape.frameSize` 接受 `64` 至 `2576`。全局 `snapcompact.shape` 为具体形状时优先；为 `auto` 时，依次使用模型级覆盖、模型系列默认形状和 API 系列回退形状。

## 既有配置的行为修复

| 版本 | 配置 | 变化与本机影响 |
|---|---|---|
| 19.1.0 | `providers.streamFirstEventTimeoutSeconds`、`providers.streamIdleTimeoutSeconds` | 自动看门狗为 15 分钟；配置 `0` 关闭、`-1` 使用自动值。本机两项原为 `150` 秒，2026-11-25 改为 `420` 秒 |
| 19.1.0 | `retry.maxDelayMs` | 默认和本机均为 `300000`；重置时间在上限内时，即使没有 `Retry-After` 也等待 |
| 19.1.0 | `autoResume` | 默认和本机均为 `false`；避免恢复其他 OMP 进程正在写入的会话 |
| 19.1.0 | `ovnfs.path` | 修复 Windows 反斜杠、空格和 `$` |
| 19.1.0 | `secrets.yml` | 斜杠正则支持 Unicode set mode 的 `v` 标志 |
| 19.1.0 | OpenCode `mcp.servers` | 支持 v2 嵌套形式，保留旧扁平 `mcp` |
| 19.1.0 | `XDG_CACHE_HOME` | Codex client version 缓存使用 `$XDG_CACHE_HOME/omp/codex-client-version.json` |
| 19.1.0 | 网页搜索角色与 provider 设置 | 当前会话及 sub-agent 覆盖层参与搜索顺序、排除、keyless、离线和超时计算 |
| 19.1.1 | `enabledModels`、provider 顺序、thinking level、upstream pin | 修复启动、切换、恢复、plan mode 和目录刷新后的设置一致性 |
| 19.0.1 | `modelRoles.web` | Codex/OpenAI 搜索把角色的 thinking level 传成 `reasoning.effort` |

## 本机迁移结果与边界

- `edit.mode` 和 `PI_EDIT_VARIANT` 均已设为 `magic`；`env -u PI_EDIT_VARIANT omp config get edit.mode` 返回 `magic`。
- 四个工具新键已显式写入并逐项读回。
- 本机值来自用户级配置与当前进程环境，项目配置、其他启动器和扩展运行时可能改变结果。
- 本次未逐项启动 Binary Ninja、桌面接管、外部 Todo 后端或浏览器 relay 做运行实验。

## See Also

- [Magic Edit：主模型描述、辅助模型修改](../omp-tools/magic-edit.md)
- [OpenAI Responses instructions 缓存与 GPT-6.2 绕过规则](openai-responses-instructions-cache.md)
- [OMP Auth Broker 与 Gateway](../omp-auth/auth-broker-gateway.md)
- [OMP Snapcompact 机制](snapcompact-mechanics.md)
- [OMP 配置语义手册](config-semantics.md)
- [OMP 18.12.1–18.10.1 配置项增量](release-config-changes-18-12-1-to-18-10-1.md)
