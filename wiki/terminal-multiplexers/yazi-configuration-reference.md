# Yazi 配置参考与本机同步

> Sources: Yazi 官方文档与 v26.9.1 源码，2026-11-22；本机配置与 agc 同步实测，2026-11-22
> Raw: [Yazi 官方配置依据](../../raw/terminal-multiplexers/2026-11-22-yazi-configuration-official-reference.md); [本机配置与同步记录](../../raw/terminal-multiplexers/2026-11-22-yazi-user-config-and-agc-sync.md)
> Updated: 2026-11-22

## Overview

Yazi 发行版内置完整的行为、按键和主题预设。用户配置目录不存在时可以直接运行；用户文件只覆盖写出的字段，其余字段保留预设。完整逐键研究笔记位于 `docs/research/2026-11-22-yazi-configuration.md`。

## 配置根的选择

Yazi v26.9.1 只选择一个配置根，不叠加多个目录。

| 平台 | 高到低的选择顺序 |
| --- | --- |
| Linux、macOS、其他 Unix | 绝对路径 `YAZI_CONFIG_HOME` → 绝对路径 `XDG_CONFIG_HOME` 下的 `yazi` → 用户家目录下 `.config/yazi` |
| Windows | 绝对路径 `YAZI_CONFIG_HOME` → 系统配置目录下 `yazi/config`，官方写法为 `%AppData%\yazi\config` |

空值、相对路径和未经 Shell 展开的字面 `~` 不通过绝对路径检查，会继续尝试下一级。本机 `HOME=/home/cpf`，两个配置环境变量均未设置，因此配置根是 `/home/cpf/.config/yazi`。

## 配置文件分工

| 文件或目录 | 用途 |
| --- | --- |
| `yazi.toml` | 浏览、排序、预览、打开方式、任务和弹窗行为 |
| `keymap.toml` | 各界面的按键与动作 |
| `theme.toml` | 颜色、文字样式、边框和图标 |
| `vfs.toml` | SFTP 与自定义虚拟文件系统；v26.9.1 初始化代码直接读取 |
| `init.lua` | 同步执行 Lua 初始化 |
| `package.toml` | `ya pkg` 管理插件与 flavor 的版本锁定 |
| `plugins/` | Lua 插件目录 |
| `flavors/` | 预制主题目录 |

普通字段按字段覆盖预设。按键和打开规则等数组可以整体替换，也可以用 `prepend_*`、`append_*` 在默认数组前后插入。主题合并顺序为内置预设、选中的 flavor、用户 `theme.toml`；用户主题优先于 flavor。

## 当前本机配置

当前 `~/.config/yazi/yazi.toml` 只覆盖五项：

```toml
[mgr]
sort_by = "natural"
sort_translit = true
linemode = "size"
show_hidden = true

[preview]
wrap = "yes"
```

自然排序让 `1`、`2`、`10` 按数值顺序出现；`linemode = "size"` 在文件列表右侧显示大小；`show_hidden = true` 显示隐藏内容；`wrap = "yes"` 让长代码行折行。其他设置继续使用发行版预设。

## 内置主题与 flavor

v26.9.1 内置 `theme-dark.toml` 和 `theme-light.toml` 两套配色，分别对应终端暗色和亮色模式。它们随发行版提供，无需下载或复制到用户目录。

Dracula、Gruvbox 等命名主题通过 flavor 提供。需要整套配色时，在 `theme.toml` 的 `[flavor]` 中选择 `dark` 或 `light`；少量样式覆盖仍写在用户 `theme.toml`。

## 日志与 SFTP 边界

当前版本没有 `[log]` TOML 配置节。日志由环境变量 `YAZI_LOG` 控制，识别 `ERROR`、`WARN`、`INFO`、`DEBUG`，空值和其他字符串关闭日志。

SFTP 配置放在 `vfs.toml`。v26.9.1 的 `check_server_key` 直接返回 true；`no_cert_verify` 控制本地用户证书的签名和有效期校验，与服务器 host key 校验无关。连接敏感服务器前需要考虑这一行为。

## agc 同步

`manifest.json` 的 `yazi-config` 条目把 `~/.config/yazi/yazi.toml` 同步到仓库 `yazi/yazi.toml`，`protected` 为 false。`AGENTS.md` 已记录目录和来源映射。修改本机配置后运行：

```sh
./pull.sh
```

## 验证

本机 TOML 解析输出 `TOML parsed; recommended fields present`。真实终端验收显示 `.hidden`、自然顺序 `1 / 2 / 10` 和 `0B` 大小列，`q` 正常退出。

agc 实际同步输出 `updated=1`、`unchanged=91`、`missing=0`，来源与仓库副本比较为 `SOURCE_REPO_CMP=identical`；同步回归测试运行 50 项并通过。

## See Also

- [Yazi 远程文件选择器](../vscode/yazi-remote-file-picker.md)
- [Go 与 sip 安装升级](go-and-sip-install-upgrade.md)
