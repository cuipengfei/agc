# OMP bash 命令行折叠标记与 /dev/null 语义：源码摘录与渲染实测

> Source: 本机安装包 `@oh-my-pi/pi-coding-agent` 18.18.0（`~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent`）与其原生模块 `@oh-my-pi/pi-natives-linux-x64/pi_natives.linux-x64-modern.node`；本地 clone `/home/cpf/code-inside/oh-my-pi` 的 `v18.18.0` tag；本机 `~/.omp/.pi/extensions/rtk.ts`；会话内实测，2026-11-07
> Collected: 2026-11-07
> Published: Unknown

## 1. 版本边界

- 安装版 `packages/coding-agent/package.json` 的 `version` 为 `18.18.0`。
- 本地 clone HEAD `1f23be9b8986237afb78aa15e91bbb57d98ce784`，其 `packages/coding-agent/package.json` 的 `version` 为 `18.14.1`。
- 在本地 clone 的工作树与 `--all` 历史里检索 `🔇` 无命中。安装版与本地 clone 版本不一致，因此源码取证全部在 `v18.18.0` tag 上进行：`git fetch origin refs/tags/v18.18.0:refs/tags/v18.18.0`，再执行 `git grep -n '🔇' v18.18.0 -- crates packages`。
- 命中路径：`v18.18.0:crates/pi-shell/src/bash/trace/viz/printer.rs:1434`。
- JS bundle `dist/cli.js`（18601469 字节）内检索 `🔇` 与 `+err` 均为 0 命中；`🔇` 在原生 `.node` 的字符串表中出现 1 次。

## 2. 重定向折叠分支（printer.rs 摘录）

```rust
fn redirections(&self, cmd: &Command, s: &Simple, c: &Context<'_>) -> Vec<Segment> {
    let mut out = Vec::new();
    let args = arguments_with_redirs(s, cmd);
    let name = command_name(s).unwrap_or_default();
    for redir in &cmd.redirs {
        let text = match &redir.target {
            RedirTarget::HereDoc(doc) => {
                if self.options.layers.unwrap {
                    format!(
                        " ⟵ {} ↓",
                        embedded::heredoc_language(&name, &args, &String::from_utf8_lossy(&doc.delim))
                    )
                } else {
                    let fd = fd_text(redir.fd.as_ref());
                    format!(
                        " {fd}{}{}",
                        redir_operator(redir.op),
                        String::from_utf8_lossy(&doc.delim_raw)
                    )
                }
            },
            RedirTarget::Word(w) => {
                let raw_target = literal(w);
                if self.options.layers.idioms && raw_target.as_deref() == Some("/dev/null") {
                    format!(
                        " 🔇 {}",
                        if matches!(redir.op, RedirOp::OutErr | RedirOp::AppendErr) {
                            "silent"
                        } else if matches!(redir.fd, Some(RedirFd::Num(2))) {
                            "err"
                        } else {
                            "out"
                        }
                    )
                } else if self.options.layers.idioms
                    && matches!(redir.fd, Some(RedirFd::Num(2)))
                    && redir.op == RedirOp::DupOut
                    && raw_target.as_deref() == Some("1")
                {
                    " +err".into()
                } else {
                    format!(
                        " {}{}{}",
                        fd_text(redir.fd.as_ref()),
                        redir_operator(redir.op),
                        if self.options.layers.idioms {
                            literal(w).unwrap_or_else(|| self.words(c).word(w))
                        } else {
                            c.text(w.span)
                        }
                    )
                }
            },
        };
        out.push(self.segment(
            c,
            cmd.id,
            redir.span,
            text,
            if self.options.layers.idioms {
                "redir badge"
            } else {
                "redir"
            },
            true,
        ));
    }
    out
}
```

同一函数里，heredoc 的收尾标记格式为 `heredoc «{}»{}`。

## 3. idioms 层默认值（viz/model.rs:116）

```rust
Self { color: true, inline: true, idioms: true, effects: true, unwrap: true }
```

## 4. 设置项定义（dist/cli.js 内联）

```text
id:"display.shellVisualization",type:"boolean",default:!0,ui:{tab:"appearance",group:"Display",label:"Shell Visualization",description:"Show bash commands as an interactive execution visualization instead of plain shell commands"}
```

设置 id 为 `display.shellVisualization`，类型 boolean，默认 `!0`（即 true）。

## 5. 渲染实测

用安装版原生模块复现渲染：`new ShellVisualization(JSON.stringify({v:1,seq:1,t_ns:0,script,units:[],history:[]}))`，再 `present({view:"pseudo",layers:{color:false,inline:true,idioms:true,effects:true,unwrap:true},split:false,playing:false,speed:1,expandedNodes:[]})`，返回 JSON 字符串，取 `rows[].segments[].text` 拼接。

会话开始时在界面上观察到的原始行（用户提供，未在同一会话内复跑该调用）：`rtk ps -p 2694951 🔇 out +err  exit 1 · 79ms`。前段为重写后的命令与折叠标记，尾部是退出码与耗时。

| 命令 | 渲染文本 |
|---|---|
| `rtk ps -p 2694951 >/dev/null 2>&1` | `rtk ps -p 2694951 🔇 out +err` |
| `echo hi >/dev/null` | `print("hi") 🔇 out` |
| `make 2>/dev/null` | `make 🔇 err` |
| `cmd &>/dev/null` | `cmd 🔇 silent` |
| `cmd &>>/dev/null` | `cmd 🔇 silent` |
| `cmd 2>&1 >/dev/null` | `cmd +err 🔇 out` |
| `2>/dev/null` | ` 🔇 err` |
| `cmd >/dev/null 2>&1 &` | `spawn cmd 🔇 out +err` |
| `ls 2>&1 \| head` | `ls +err ⇡ first 10` |
| `ls \| tail -n 5` | `ls ⇣ last 5` |
| `cat <<'EOF' > x.txt`（含 body 与 EOF） | `cat ⟵ text ↓ >x.txt`，下一行 `text · heredoc «EOF»`，再下一行 `body` |
| `grep -q foo file` | `grep -q ‹foo› file` |
| `mkdir -p a && cd a` | `mkdir -p a`，下一行 `and cwd a` |
| `set -e` | `# stop on first error` |
| `set -x` | `# trace commands` |
| `FOO=1 cmd` | `env(FOO = "1") cmd` |
| `timeout 30s cmd` | `⏱ 30s cmd` |
| `cmd \|\| true` | `cmd may fail` |
| `cmd \|\| :` | `cmd may fail` |
| `time cmd` | `timed cmd` |
| `sudo cmd` | `sudo cmd` |
| `export FOO=1` | `export FOO=1` |

`echo` 被折叠成 `print(...)` 来自同一套伪代码视图的惯用法折叠，与本主题无关。

## 6. 丢弃验证

模型侧实测：工具调用 `echo visible-line; echo hidden-line >/dev/null`，工具结果只含 `visible-line`，`hidden-line` 未出现在结果中。

结论边界：该实测证明重定向进 `/dev/null` 的字节不进入工具结果；未检查 TUI 的 shell 可视化面板是否会为可视化目的保留一份副本。

## 7. 命令文本来源链（rtk 扩展）

`~/.omp/.pi/extensions/rtk.ts`（79 行）要点：

- 加载时执行 `rtk --version`；缺失或 `major === 0 && minor < 23` 时禁用（`MIN_SUPPORTED_RTK_MINOR = 23`）。
- 监听 `pi.on("tool_call", ...)`，只处理 `isToolCallEventType("bash", event)`。
- 命令以 `rtk ` 开头时跳过；`RTK_DISABLED === "1"` 时跳过。
- 执行 `pi.exec("rtk", ["rewrite", cmd], { timeout: 2000 })`；`result.killed` 或退出码不是 0 / 3 时原样放行；命中时 `event.input.command = rewritten`。
- 异常一律 fail open，仅 `console.warn`。

`rtk rewrite` 实测（`rtk` 位于 `/home/cpf/.local/bin/rtk`）：

| 输入 | 输出 | 退出码 |
|---|---|---|
| `ps -p 2694951` | `rtk ps -p 2694951` | 0 |
| `ls -la` | `rtk ls -la` | 0 |
| `echo hi` | 无输出 | 1 |
| `ps -p 2694951 >/dev/null 2>&1` | `rtk ps -p 2694951 >/dev/null 2>&1` | 0 |
| `git status >/dev/null 2>&1` | `rtk git status >/dev/null 2>&1` | 3 |
| `npm test 2>/dev/null` | 无输出 | 1 |

样本边界：共 6 次调用，只有 2 次带重定向，只能说明这几次里 rtk 没有新增或删除重定向，不足以证明对所有子命令都如此。

## 8. 未验证项

- 终端实际由哪个字体渲染 `🔇` 未检查。
- 把 `display.shellVisualization` 置为 false 后的界面效果未实跑。
- `↻ {n}`（循环轮数）、`↳` / `↷`（分支是否命中）、`┌ {title}` / `└`（外框）的渲染例只从源码读出，未纳入实测表。
- `rtk` 是用户级扩展，未验证关闭该扩展后同一命令的显示差异。
