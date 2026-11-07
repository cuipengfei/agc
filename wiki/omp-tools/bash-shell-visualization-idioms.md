# OMP bash 命令行折叠标记与 /dev/null 语义

> Sources: OMP 18.18.0 源码摘录与原生渲染实测，2026-11-07
> Raw: [折叠分支、设置项与渲染实测](../../raw/omp-tools/2026-11-07-omp-bash-shell-viz-idioms-source.md)
> Updated: 2026-11-07

## Overview

OMP 的 bash 工具结果会把命令行的常见写法折叠成短标记，`🔇 out` 是其中表示输出重定向到 `/dev/null` 的那一个。折叠发生在显示层，命令按原样执行；被重定向的输出由操作系统丢弃，模型拿不到。命令文本先经过用户级 `rtk` 扩展改写，该扩展只加 `rtk ` 前缀，不增删重定向。

## 四个重定向标记

| 命令写法 | 显示 | 效果 |
|---|---|---|
| `>/dev/null` | `🔇 out` | 标准输出丢弃 |
| `2>/dev/null` | `🔇 err` | 错误输出丢弃 |
| `&>/dev/null`、`&>>/dev/null` | `🔇 silent` | 两个流都丢弃 |
| `2>&1` | `+err` | 错误输出并入标准输出，两个流都被收走 |

判定逻辑在 `redirections` 里按 `RedirTarget::Word` 的目标字面量走：目标为 `/dev/null` 时按 `OutErr`/`AppendErr`、`RedirFd::Num(2)`、其余三种情况分别输出 `silent`、`err`、`out`；`fd Num(2)` 加 `DupOut` 且目标为 `1` 时输出 `" +err"`。两个分支都要求 `layers.idioms` 为真，该层在默认选项里是 `true`。

同一行的 `exit 1 · 79ms` 属于工具结果尾部的退出码与耗时，与折叠无关。

## 命令文本的来源链

模型发出的命令先经过 `~/.omp/.pi/extensions/rtk.ts`：它把命令交给 `rtk rewrite`，命中时直接写回 `event.input.command`，所以界面上看到的命令可能带一个模型没写的 `rtk ` 前缀。

该扩展的契约：命中重写时退出码为 0 或 3，未命中为 1；命令已以 `rtk ` 开头或 `RTK_DISABLED` 为 `1` 时跳过；异常一律放行。实测 6 次 `rtk rewrite` 调用里，2 次带重定向的输入都是原样保留，没有任何一次新增或删除重定向。样本量只够说明这几次的行为。

结论：`/dev/null` 必须出现在被解析的命令文本里才会出标记。本次样本中 `rtk rewrite` 没有新增或删除重定向，所以重定向来自传入的命令文本；该实例里模型的原始输入没有取回，这一环按样本推断，未直接核对。

## 被丢弃的输出拿不回来

重定向进 `/dev/null` 的字节由操作系统丢弃，工具结果里没有对应内容。实测 `echo visible-line; echo hidden-line >/dev/null`，工具结果只含 `visible-line`。TUI 的可视化面板是否另存一份副本未检查。

这与 `+err` 的差别值得记住：`2>&1` 把错误输出改道到标准输出，两边都会被收走，模型能看到；只有 `🔇` 那一类才是真的丢弃。命令失败时配上 `🔇`，失败原因不在工具结果里，模型要诊断就得重新运行并保留输出。

## 同一区域的其它折叠词汇

| 标记 | 含义 | 例子 |
|---|---|---|
| `⇡ first N` | 管道接到 `head` | `ls 2>&1 \| head` → `ls +err ⇡ first 10` |
| `⇣ last N` | 管道接到 `tail` | `ls \| tail -n 5` → `ls ⇣ last 5` |
| `⟵ <语言> ↓`、`«EOF»` | heredoc 作为输入，收尾标记单独一行 | `cat <<'EOF' > x.txt` → `cat ⟵ text ↓ >x.txt` |
| `⟦script ↓⟧`、`‹…›` | 内嵌代码折叠，过长用方括号形式，较短直接内联 | `grep -q foo file` → `grep -q ‹foo› file` |
| `⏱ 30s` | `timeout` 限时 | `timeout 30s cmd` → `⏱ 30s cmd` |
| `↻ N` | 循环轮数 | 读源码得到，未实测 |
| `↳` / `↷` | 分支命中 / 未命中 | 读源码得到，未实测 |
| `┌ <标题>` / `└` | 语句组外框 | 读源码得到，未实测 |
| `→ ` / `→& ` | 管道连接，带 `&` 表示同时传递错误输出 | 读源码得到，未实测 |

另有一类没有图标的语义替换：`set -e` → `# stop on first error`，`set -x` → `# trace commands`，`cmd || true` → `cmd may fail`，`time cmd` → `timed cmd`，`FOO=1 cmd` → `env(FOO = "1") cmd`。

## 开关与版本边界

- 总开关是 `display.shellVisualization`，boolean，默认开启；关掉后整块可视化消失，命令按原文显示。关闭后的界面效果尚未实跑。
- 折叠层 `idioms` 另有独立默认值，默认开启。
- `🔇` 是界面里的标准 emoji（U+1F507），与 `symbolPreset` 的三档图标预设无关；这些折叠字形不随预设切换。
- 源码取证在 `v18.18.0` tag 上完成；本地 clone 的版本是 `18.14.1`，其工作树与全部历史里都没有这个字面量。

## See Also

- [OMP 内建工具全集、会话暴露边界与内部地址空间](builtin-tools-and-internal-urls.md) — bash 工具的身份、可用性与审批类别
- [OMP Hooks vs Extensions](../omp-extensibility/hooks-vs-extensions.md) — `tool_call` 阶段改写命令的扩展能力边界
- [OMP 界面图标：三档 symbolPreset 与 Glyph Protocol](../omp/symbol-presets-and-glyph-protocol.md) — 图标体系与 emoji 的分界
