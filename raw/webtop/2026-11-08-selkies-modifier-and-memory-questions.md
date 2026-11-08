# i3 Ctrl Alt modifier 修改与 Selkies 内存归因问答摘录

> Source: 会话用户提问与调查代理输出；上游官方文档
> Collected: 2026-11-08
> Published: Unknown

本文是会话原始问答摘录。本批问题与回答均在 2026-11-08 当日完成。identifier 与代码一律保持英文原名。

## 用户提问原文

1. "alt key as win key did not work, win + d just show desktop, and win + enter, nothing happens i think this is win host os conflicts with browser i3, right? rtfm for common fixes, not invent new wheel"
2. "what does mod1 or mod4 mean? in this context? what other concepts related? explain and if i do not want to go full screen? what is a proper fix? use other mod key? what suggested?"
3. "ok, do, change mod key to control + alt then for me; after that, take a look at selkies proc , why it eats so much ram? normal?"

## 回答 1：Mod1/Mod4 是什么

来自用户 teach 请求后的回答：

> Mod1、Mod4 是 Linux 键盘系统里"修饰状态"的名称。当前配置用 Mod4 作为主要快捷键前缀，通常对应 Windows 徽标键。

> 修饰键用来改变其他按键的作用。例如按住 Ctrl 再按 C，程序识别的是 Ctrl+C 这个组合。

来自 [Sway 官方手册](https://github.com/swaywm/sway/blob/1652c54b73f67df17b7b4ab0b0f7048204aa8104/sway/sway.5.scd)：

| 名称 | 常见对应键 | 用途 |
|---|---|---|
| `Shift` | Shift | 大写字符、组合快捷键 |
| `Control` | Ctrl | 组合快捷键 |
| `Mod1` | Alt | 组合快捷键 |
| `Mod4` | Super，也就是 Win 键 | 常用作桌面快捷键前缀 |
| `Mod2` | Num Lock | 数字锁定状态 |
| `Mod5` | AltGr | 输入键盘布局中的第三层字符 |

> 数字表示名称编号，没有"Mod4 比 Mod1 更强"的含义。具体对应关系可以通过键盘映射改变。

> `$mod` 则是 **Sway 配置变量**。当前这两行： `set $mod Mod4` / `bindsym $mod+Return exec /usr/bin/st`，表示按 **Win+Enter** 打开终端。`Return` 是 Enter 的按键名称，`bindsym` 表示给按键组合绑定动作。

> 如果把变量改成 `Mod1`，快捷键就变成 **Alt+Enter**。这会改变 Sway 等待的组合。因此配置仍为 Mod4 时，你直接按 Alt+Enter 不会触发终端。

## 回答 2：为什么浏览器里会有冲突 + 不全屏的推荐

> Windows 和 Chrome 都有自己的快捷键。Windows 已经处理了 Win+D，远程桌面就没有收到完整组合。

来自 [Chrome Keyboard Lock 官方文档](https://developer.chrome.com/docs/capabilities/web-apis/keyboard-lock)：

> Selkies 的 Keyboard Lock 用于捕获更多组合，但 Chrome 要求它在网页主动进入全屏后使用。因此，**保持普通浏览器窗口时，合适的处理方法是选择较少冲突的远程快捷键。**

来自 [Chrome 快捷键表](https://support.google.com/chrome/answer/157179?hl=en&co=GENIE.Platform%3DDesktop)：

> 推荐把远程桌面的统一前缀设为：`set $mod Control+Mod1`。

推荐说明（原回答）：

> 这是 Sway 原生支持的组合修饰键写法。修改后，已有键盘绑定会变成：

| 操作 | 建议按键 |
|---|---|
| 打开终端 `st` | Ctrl+Alt+Enter |
| 打开应用启动器 `wmenu-run` | Ctrl+Alt+D |
| 移动窗口焦点 | Ctrl+Alt+H/J/K/L |
| 关闭当前窗口 | Ctrl+Alt+Shift+Q |

> 推荐 Ctrl+Alt 的依据 [INFERENCE] 是它与当前默认键位组合的已知 Chrome 冲突较少。单独使用 Alt 会遇到 Alt+D 地址栏、Alt+F 菜单、Alt+左右方向键历史导航等重合。

> 使用时按**左 Ctrl+左 Alt**，减少右 Alt 被键盘布局解释成 AltGr 的混淆。Ctrl+Alt+Del 等 Windows 系统组合仍由宿主处理。

## 回答 3：内存调查结论

来自调查代理 `SelkiesMemory` 的输出全文（实测+源码）：

> 1.2 GiB RSS 的主要来源已定位：约 598 MiB resident 是 wlroots 提交给 Selkies 内置 Smithay compositor 的 SHM 映射，另约 602 MiB 是私有匿名页。不是 PulseAudio 的两个 64 MiB memfd，也不能用"正常编码 buffers"解释全部。33 个约 17–18 MiB 的大 wlroots 映射、多个不同尺寸同时留存，远超 Pixelflux 官方双帧编码池；属于可疑高水位/缓冲生命周期留存，不能判为合理必需。约 2–3 分钟自然观察中 RSS 只增加 4 KiB、Anon 完全不变，未观察到持续增长；不能据此排除 resize/重连触发的泄漏。

### 用户可见摘要（最终交付回答）

> 你的 **7.7% 对应约 1.20 GiB 常驻内存**。读取进程内存映射后，主要构成为：

| 内存类别 | 常驻大小 | 已查明的来源 |
|---|---:|---|
| wlroots 共享内存映射 | 约 598 MiB | 嵌套 Sway 提交给 Selkies 内置 compositor 的画面缓冲区 |
| 私有匿名内存 | 约 602 MiB | 包含程序分配的内存；具体对象归属尚未全部确认 |
| 文件映射 | 约 33 MiB | 程序与动态库等 |

> **当前占用不能全部解释为必要的编码缓冲区。** 进程保留了 49 个 wlroots 映射，其中 33 个较大的映射合计约 590 MiB，存在多种尺寸。Pixelflux 官方的双帧编码池在 1080p 下约需 16 MiB，此外还有编码器参考图像等分配，但这些不足以解释全部占用。

> 最佳判断 **[INFERENCE] 是历史画面尺寸对应的缓冲区留存，加上匿名内存分配的高水位**。具体哪个对象没有释放仍未确认。

> 自然观察约两到三分钟，RSS 只增加 4 KiB，匿名内存没有增加。当前没有观察到持续增长。CPU 变为 0% 时，已持有的缓冲区不会自动释放。

## 未授权事项（会话内声明）

- 未操作浏览器验证按键或截图。
- 未重启桌面服务或 Selkies 进程。
- 未提交 Git、未推送；agc 工作树保持本会话早批入库后的状态（未提交文件仍在）。
- 未修改内存行为或应用猜测性内存修复。
