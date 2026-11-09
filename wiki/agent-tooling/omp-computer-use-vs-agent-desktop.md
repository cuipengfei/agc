# OMP computer use 与 agent-desktop 对照

> Sources: vercel-labs/agent-desktop README 与 CONCEPTS.md, 2026-11-09; can1357/oh-my-pi 的桌面实现与批准设置源码, 2026-11-09
> Raw: [agent-desktop 摘录](../../raw/agent-tooling/2026-11-09-agent-desktop-readme-and-concepts.md); [OMP 源码摘录](../../raw/omp-tools/2026-11-09-omp-computer-approval-and-delivery-source.md)
> Updated: 2026-11-09

## Overview

两者都能让 agent 看屏幕并操作桌面：都读操作系统无障碍树，都按元素引用定位，也都提供截图与坐标路径。OMP 的坐标路径先试后台投递，不先抢焦点；agent-desktop 的坐标回退要求前台模式。层级不同。OMP 的 `computer` 是注入 Eval 的预置对象，只能在 OMP 会话里用，本身不是独立工具；agent-desktop 1.2.0 是独立二进制，同一套核心以 CLI、MCP 服务与 C 库三种形态暴露，自身不含模型。实际差别落在四件事：输入怎么送达、引用活多久、动作前判定多少、留下什么证据。

## 层级与入口

| | OMP computer | agent-desktop 1.2.0 |
|---|---|---|
| 入口 | Eval 全局 `computer`，不是独立工具 | CLI、`mcp` 常驻服务、C 库 |
| 命令面 | 桌面、窗口、元素三层的方法 | 60 个命令名，56 个可用 |
| 模型 | 由宿主 agent 驱动 | 自身不含模型 |

agent-desktop 的 `key-down`、`key-up`、`mouse-down`、`mouse-up` 四个命令名不可用，等的是能保证释放按住状态的守护进程。

## 相同点

- 语义来源都是 AX 树，按元素引用定位。
- 都有机器级输入互斥：agent-desktop 的 interaction lease 覆盖派发阶段，不覆盖派发前的等待。
- 都支持截图、多显示器、窗口枚举、应用启动、剪贴板。

## 感知

OMP 提供截图与 AX 文本树两条路径。AX 默认深度 24、单次最多 800 节点；`find` 走单独的查询路径，5000 节点、深度 64。截图最大宽度默认 3840、最大高度 2400，不保留原始细节的传输与部分模型降到 1280×896。

agent-desktop 用 snapshot 返回 JSON 树，引用带快照编号限定；截图是一条独立命令，结果作为数据交回；动作前有 auto-wait，默认最多等 5000ms。

信息密度的控制方式不同：OMP 给固定上限并在文末标记截断，agent-desktop 把等待预算放在动作前，感知结果按命令边界逐个返回。

## 动作与投递

OMP 分三档：后台、接管、拒绝。后台路线不激活目标、不动真实指针；不可用时由 `computer.backgroundFallback` 决定重跑接管还是直接拒绝。

agent-desktop 分两档：headless 只用语义操作，不移动光标、不合成键盘输入，语义路径走不通就失败；headed 显式开启，先满足动作声明的焦点与光标前置条件。物理输入只在 headed 下发生，按平台是 `SendInput`、`CGEvent`、XTest 或 Mutter RemoteDesktop。

坐标点击两边都有。agent-desktop 的 `mouse-click` 要求光标策略，也就是 headed；裸坐标不带窗口身份，落点由调用方负责。

按住类：OMP 的 `holdKeys` 与 `holdMouse` 支持 0–100 秒，每次退出都释放；agent-desktop 的四条按住命令不可用。

## 接口与成本

OMP 的一次 Eval 调用里可以连续执行多个桌面调用，`computer.run` 还能跑整段脚本；截图按原始细节作为普通图像内容进入模型。

agent-desktop 每条命令输出一个 JSON envelope；`batch` 在一条命令内顺序执行多条，帮助文本写明是非原子的；`mcp` 是一个常驻服务。

## 安全与失败

批准：OMP 的 read 与 exec 只是分类，是否询问由 `tools.approvalMode` 决定。默认 `yolo` 自动批准各级；`always-ask` 才对写与 exec 询问，`write` 只对 exec 询问；逐工具策略的覆盖在所有档位生效；没有会话设置上下文时按 `always-ask` 处理。`computer.control.acquire` 不受档位影响，默认也会询问。

agent-desktop 的交互策略是 headless 与 headed 两档，另有 `permissions` 命令报告授权状态。

敏感字段：agent-desktop 在读取与动作两侧都不回显安全字段的值；OMP 在写回读路径保证密码不进入错误文本。

## 平台

| 平台 | OMP | agent-desktop |
|---|---|---|
| macOS | 14 以上用 ScreenCaptureKit，12 与 13 走 CoreGraphics | macOS 13 以上，AX API |
| Windows | 原生捕获、Win32 输入、UI Automation | Windows 10 1809 以上，UI Automation |
| Linux | X11 原生；Wayland 输入走 portal 或 `LIBEI_SOCKET`，发布版不带 PipeWire 截图 | Ubuntu 24.04 以上，X11 或 Wayland，AT-SPI |

## 引用寿命

OMP 的引用活在工作进程里：当前与上一个快照都没登记过的元素过期；进程重启时截图帧与引用一起清空。

agent-desktop 的引用映射写盘，但查找限定在选中的会话命名空间。同一命名空间里换进程、换 agent 能继续用；换会话后旧引用作废。多 agent 模式下快照按会话共享。

## 各自独有优势

OMP 这边：

- 后台投递，不激活目标、不动真实指针就能完成输入，失败还能按配置决定接管。
- 一次往返多步，可写条件与断言。
- 截图直接进模型上下文。

agent-desktop 这边：

- 引用在同一命名空间内跨进程续用。
- 动作前 auto-wait 与显式的交互策略分层。
- 命令面更宽：窗口几何、通知、光标可视化、批量、内嵌说明书、权限检查。
- CLI、MCP、C 库三种入口，自身不含模型。

## 未验证

- 两边都没有实测延迟、成本与失败率。
- agent-desktop 的 Wayland 输入深度只按概念文档归类，未逐条核对平台实现。
- OMP 的读取路径是否对密码框脱敏没有核实，现有摘录只覆盖写回读。

## See Also

- [OMP computer prelude 与桌面自动化](../omp-tools/computer-prelude-desktop-automation.md)
- [agent-browser 与 chrome-devtools MCP 对比](agent-browser-vs-chrome-devtools-mcp.md)
