# tuios 0.13.1 升级语义、sip 依赖关系与 uv-bun 集成记录

> Source: [tuios v0.13.1 release notes](https://github.com/Gaurav-Gosain/tuios/releases/tag/v0.13.1)；[sip v0.10.0 release notes](https://github.com/Gaurav-Gosain/sip/releases/tag/v0.10.0)；[sip README（v0.10.0）](https://github.com/Gaurav-Gosain/sip/blob/v0.10.0/README.md)；[tuios go.mod（v0.13.1）](https://github.com/Gaurav-Gosain/tuios/blob/v0.13.1/go.mod)；本机 `go version -m`、`tuios --version`、`tuios update --help`、`uv-bun` 与 `bun test` 命令输出，2026-11-15 至 2026-11-16
> Collected: 2026-11-16
> Published: 2026-11-15

## tuios v0.13.1 发布与升级语义

`tuios v0.13.1` 发布于 `2026-11-15T03:53:44Z`（GitHub API `published_at`）。release notes 原文：

> A v0.12.1 daemon predates live upgrades, so it cannot hand its panes over. After you install, move it to the new build once:
>
> ```bash
> tuios restart-server
> ```
>
> The restart stops the programs in your panes. Each session comes back with its layout, the last 1000 lines of each pane's history and new shells. From v0.13.1 on, the next upgrade is live on macOS and Linux: `tuios daemon upgrade` moves the daemon to the new build and every program keeps running.

`tuios update --help` 原文关于 tuios-web 的联动：

> tuios-web is updated at the same time when it sits beside tuios. The two talk to one daemon and it compares their versions, so they move together or not at all.

同一帮助还写明：`tuios update` 只更新来自 release archive 的二进制，包管理器、Homebrew、Nix store 或 Go tool 拥有的副本拒绝覆盖；守护进程在重启前一直跑旧构建。

本机 `tuios --version` 输出（二进制已更新、daemon 未重启）：

```text
tuios version 0.13.1 [pure-Go backend]
Commit: f3eaaafc7c2354685338b1e354459059727ea9be
Built: 2026-11-15T03:31:54Z
By: goreleaser
```

## tuios v0.13.1 用户可见默认变化（release notes 摘录）

- **Cell frames 默认开启**：`The client writes frames as cells on every terminal you run tuios in, except on Windows, and on SSH and web clients.` 增量发帧的效果为 `With a typed key in a 200x60 window the frame went from 1023 us to 205 us, and from 792 to 376 allocations.` 画面异常时可设 `appearance.cell_frames = "off"` 或环境变量 `TUIOS_CELL_FRAME=0`。
- **OSC 133 提示符标记**：`bash and zsh panes get OSC 133 prompt marks. Set [shell] integration = "off" to start shells as before.`
- **用量限流独立状态**：`An agent that stops on a usage or rate limit is limit_reached now, not errored.`
- **Hook 直连 daemon socket**：`Hooks talk to the daemon directly. Run tuios integration install again to get hook commands that send each event to the daemon socket with nc -U or socat, so a hook no longer starts a whole tuios.`
- **稀有 Mermaid 类型移到 sketch 插件**：八种常见类型仍在主程序，其余需 `tuios plugins install sketch`。
- **从源码构建需要 Go 1.27.4 toolchain**；ghostty 后端使用 `libghostty-vt 1.0.1`。

以上配置键（`appearance.cell_frames`、`[shell] integration`、`[keybindings.lists]` 等）仅来自 release notes 文本；daemon 尚未重启，未与 `tuios list-options --json` 注册表核对。

## sip v0.10.0 发布要点

`sip v0.10.0` 发布于 `2026-10-26T11:30:34Z`（GitHub API `published_at`）。release notes 原文：

> This release adds a new renderer, the worker engine. It is opt-in. The default client is the same xterm.js client as in v0.9.4.
>
> The engine runs libghostty-vt and a WebGL2 renderer in Web Workers. The connection also runs in a worker, with the same transports and reconnect rules as the default client. Terminal output never reaches the page's main thread, so a flood of output does not freeze the page.
>
> I measured it with 50 MiB through `cat` in a real sip session, median of 3 runs:
>
> - Main thread time went from 6,788 ms with the default client to 190 ms with the engine. With the connection in the network worker, it is 10 ms.
> - The longest frame gap went from 250 ms to 16.8 ms, which is one frame at 60 Hz.

## sip 与 tuios 的依赖和抽离关系

仓库创建时间（GitHub API `created_at`）：`tuios` 为 `2025-09-06T18:13:51Z`，`sip` 为 `2025-12-02T19:09:04Z`。

sip README「Related」一节原文：

> - [TUIOS](https://github.com/Gaurav-Gosain/tuios), the terminal window manager sip was extracted from

sip README「What it does」相关原文：

> The client is vendored, not built. `static/webterm.js` is a standalone build of the webterm package, which inlines xterm.js and its fit, webgl, canvas, web-links, image and unicode-graphemes addons along with the kitty overlay, the clipboard layer, the width overrides, the transports, the buffer search and the touch layer.
>
> The optional vtgl renderer is a second file, `static/webterm-vtgl.js`, which the page loads only when the vtgl renderer is chosen. The experimental worker engine is `static/engine/`: libghostty-vt and a WebGL2 renderer in Web Workers, loaded only when the renderer is `engine`.

`tuios v0.13.1` 的 `go.mod` `require` 段含 `github.com/Gaurav-Gosain/sip v0.10.0`。本机 `go version -m` 实测：

- `~/.local/bin/tuios`（`github.com/Gaurav-Gosain/tuios/cmd/tuios`）：模块依赖表中**没有** `github.com/Gaurav-Gosain/sip`。
- `~/.local/bin/tuios-web`（`github.com/Gaurav-Gosain/tuios/cmd/tuios-web`）：含 `dep github.com/Gaurav-Gosain/sip v0.10.0 h1:u1pAfiSaUx9g3aB1kNH8KEzxP7j+ffHZkwImRhfGtfA=`。

`tuios` 仓库中不存在 `tuios-web` 独立仓库：`Gaurav-Gosain/tuios-web` 的 GitHub 查询无结果，`tuios-web` 的发布 tarball 是 `Gaurav-Gosain/tuios` release 的第二个资产。

## uv-bun 的 tuios 集成

改动前 `~/.local/bin/uv-bun` 第 3 段标题与工具清单：

```text
== [3/10] self-update (herdr, hc, umans, rtk, plannotator, witr, sip)
```

改动后（本机 2026-11-16 实测 `grep` 输出）：

```text
167:  header(3, "self-update (herdr, hc, umans, rtk, plannotator, witr, sip, tuios)");
175:    ["tuios", "Gaurav-Gosain/tuios"],
```

`tuios` 的本地版本解析走 `tuios --version` 首行专用正则（其余工具用 `tool X.Y.Z` 整行匹配格式），当前实现（`~/.local/bin/uv-bun` 第 192-199 行附近）：

```js
local = current.code === 0
  ? current.stdout.trim().match(tool === "witr"
    ? /^witr v(\d+\.\d+\.\d+)/
    : tool === "tuios"
      ? /^tuios version v?(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)/m
      : new RegExp(`^${tool} v?(\\d+\\.\\d+\\.\\d+(?:[-+][\\w.-]+)?)$`))?.[1]
  : null;
```

版本过期时执行 `tuios update`（`~/.local/bin/uv-bun` 第 335-340 行），一次同时换 `tuios` 与 `tuios-web` 两个二进制。

`uv-bun` 共十个段落，改动前后的段标题清单（`/tmp/uv-bun-check-before.txt` 与 2026-11-16 重跑核对一致）：

```text
== [1/10] global packages (ncu -g)
== [2/10] uv (self + tools)
== [3/10] self-update (herdr, hc, umans, rtk, plannotator, witr, sip)
== [4/10] apt (system packages)
== [5/10] projects
== [6/10] tokscale
== [7/10] skills (agent skill packages)
== [8/10] Codex plugins
== [9/10] OMP plugins
== [10/10] Herdr plugins
```

`~/.local/bin/uv-bun.test.js` 同步修改：工具清单加 `["tuios", "Gaurav-Gosain/tuios"]`；本地版本断言对 tuios 用首行专用正则；self-update 输出切分从 `== [3/9]` 修正为 `== [3/10]`（脚本实际已是十段，旧切分按九段切，断言仍过属碰巧）；新增 `expect(selfUpdate).toContain("tuios:")` 与 `expect(selfUpdate).toContain("upgrade: tuios update")`。

验证：`bun test /home/cpf/.local/bin/uv-bun.test.js` 结果 `1 pass, 0 fail`，耗时 49.8 秒。

## 证据边界

- tuios 0.13.1 各默认变化与 sip worker 引擎数字均来自 release notes 原文，未在运行中的实例上复测。
- daemon 仍在跑 0.12.1 旧构建（`tuios update` 输出与本机进程核实），0.13.1 的新行为未实际运行过。
- `tuios list-options --json` 的新注册表未采集（需 daemon 重启后才是 0.13.1 构建）。
- `Gaurav-Gosain/tuios-web` 仓库不存在这一结论来自 GraphQL 查询无结果与发布资产列表两个间接证据。
- webterm 仓库的提交历史未逐个对比，webterm → sip → tuios 的更新顺序依据 README 自述与 go.mod 版本固定关系。
