# Herdr Annotate 0.4.0 → 0.9.10 升级实测与配置边界

> Source: 本机 `herdr plugin update -y` 输出与安装目录；本机插件清单原文；上游 README（0.9.10）
> Collected: 2026-11-15
> Published: Unknown

## 升级输出（本机实测，2026-11-15）

用户执行 `herdr plugin update -y`，preview 原文：

```
Plugin update preview:
  id: annotate
  name: Annotate
  version: 0.9.10
  source: plannotator/herdr-annotate
  commit: 29643fb42fcd6fb504a5512115be1dbf1ab338f8
  actions: 11
  startup commands: 0
  events: 0
  panes: 3
  link handlers: 0
  build commands: 3
    build: bash scripts/fetch-herdr-annotate.sh
    build (skipped on linux): powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts/fetch-herdr-annotate.ps1
    build: bash scripts/fetch-plannotator-tui.sh
    action capture: ./bin/herdr-annotate.exe capture
    action copy-archive: ./bin/herdr-annotate.exe copy-archive
    action copy-context: ./bin/herdr-annotate.exe copy-context
    action gate: ./bin/plannotator-tui.exe herdr open --gate
    action last: ./bin/plannotator-tui.exe herdr last
    action last-newest: ./bin/plannotator-tui.exe herdr last --newest
    action manage: ./bin/herdr-annotate.exe manage
    action open: ./bin/plannotator-tui.exe herdr open
    action paste-archive: ./bin/herdr-annotate.exe paste-archive
    action send-archive: ./bin/herdr-annotate.exe send-archive
    action terminal: ./bin/plannotator-tui.exe herdr terminal
    pane doc: sh -c exec bash "$HERDR_PLUGIN_ROOT/scripts/plannotator-tui.sh" herdr pane
    pane editor: ./bin/herdr-annotate.exe editor
    pane manager: ./bin/herdr-annotate.exe manager
  replaces: annotate from github:plannotator/herdr-annotate@7c8f5a177b8285dc56efc471ef04f7ab44a2b4b6
Updated annotate from plannotator/herdr-annotate.
Config: /home/cpf/.config/herdr/plugins/config/annotate
```

## 安装位置

新版本落在版本化目录：

`/home/cpf/.config/herdr/plugins/github-installations/annotate-9c299759567c/1437553-0/checkout`

旧路径 `/home/cpf/.config/herdr/plugins/github/annotate-9c299759567c` 已不再生效。

## 构建方式：下载预编译二进制，未本地编译

三个 build 命令里有两条负责取二进制（`herdr-plugin.toml` 第 15–21、88–90 行）：

```toml
[[build]]
platforms = ["macos", "linux"]
command = ["bash", "scripts/fetch-herdr-annotate.sh"]

[[build]]
platforms = ["windows"]
command = ["powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", "scripts/fetch-herdr-annotate.ps1"]
```

```toml
[[build]]
platforms = ["macos", "linux"]
command = ["bash", "scripts/fetch-plannotator-tui.sh"]
```

### `scripts/fetch-herdr-annotate.sh`

版本由 `herdr-annotate.version` 提供；本机该文件内容为 `0.2.4`。

下载基址与校验：

```bash
asset="herdr-annotate-$target"
base="https://github.com/plannotator/herdr-annotate/releases/download/rust-lite-v$version"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
```

```bash
fetch "$base/$asset" "$tmp/$asset"
fetch "$base/SHA256SUMS" "$tmp/SHA256SUMS"
expected="$(grep " $asset\$" "$tmp/SHA256SUMS" | awk '{print $1}')"
[ -n "$expected" ] || { echo "$asset is not listed in $base/SHA256SUMS" >&2; exit 1; }
```

```bash
[ "$actual" = "$expected" ] || { echo "sha256 mismatch for $asset: expected $expected, got $actual" >&2; exit 1; }
```

平台映射原文：

```bash
case "$(uname -s)/$(uname -m)" in
  Darwin/arm64)              target=aarch64-apple-darwin ;;
  Darwin/x86_64)             target=x86_64-apple-darwin ;;
  Linux/x86_64)              target=x86_64-unknown-linux-gnu ;;
  Linux/aarch64|Linux/arm64) target=aarch64-unknown-linux-gnu ;;
  *) echo "no native Herdr Annotate Lite build for $(uname -s)/$(uname -m)" >&2; exit 1 ;;
esac
```

本地构建覆盖（`HERDR_ANNOTATE_BIN`），以及「stamp 不足够、要实际执行一次」的注释：

```bash
# The stamp alone is not enough: a plugin directory synced from another machine carries that
# machine's binary and stamp. Run it; one that cannot execute here falls through to the download.
```

### `scripts/fetch-plannotator-tui.sh`

版本由 `plannotator-tui.version` 提供；本机该文件内容为 `0.9.11`。

```bash
asset="plannotator-tui-$target"
base="https://github.com/plannotator/plannotator-tui/releases/download/v$version"
```

musl 分支原文：

```bash
  Linux/x86_64)
    # Alpine and other musl systems can't run the glibc build; the static musl build runs there.
    if [ -e /lib/ld-musl-x86_64.so.1 ]; then target=x86_64-unknown-linux-musl
    else target=x86_64-unknown-linux-gnu; fi ;;
```

失败语义原文：`A failed download never fails the plugin install: the TypeScript tools keep working and the review actions explain what to do. Only a bad PLANNOTATOR_TUI_BIN is an error.`

## 清单（`herdr-plugin.toml`）

```toml
id = "annotate"
name = "Annotate"
version = "0.9.10"
min_herdr_version = "0.8.0"
description = "Comment on terminal selections and copy annotations as agent context."
platforms = ["linux", "macos", "windows"]
```

11 个 action：`capture`、`copy-context`、`copy-archive`、`paste-archive`、`send-archive`、`manage`、`open`、`gate`、`last`、`last-newest`、`terminal`。

3 个 pane：`editor`（popup，88×24）、`manager`（popup，100×30）、`doc`（overlay）。

`open`、`gate`、`last`、`last-newest`、`terminal` 的 `platforms` 均为 `["macos", "linux"]`。

`doc` pane 的命令：

```toml
command = ["sh", "-c", "exec bash \"$HERDR_PLUGIN_ROOT/scripts/plannotator-tui.sh\" herdr pane"]
```

清单对 Ctrl-click 的注释：

```toml
# The review actions run the launcher, which reads Herdr's invocation context (the focused
# pane's folder and agent) and sends the review back to that agent. Ctrl-click on a
# file:// Markdown link is not captured here; the opt-in links/ add-on declares that handler and
# runs this plugin's launcher, so a plain install leaves the click to Herdr's default opener.
```

## 存储路径（`rust/src/paths.rs`）

```rust
/// Return Herdr's plugin-owned state directory when the runtime supplied one.
pub fn state_dir() -> Option<PathBuf> {
    std::env::var_os("HERDR_PLUGIN_STATE_DIR")
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}
```

```rust
/// Resolve the JSONL store inside a plugin state directory.
pub fn annotations_path(dir: &Path) -> PathBuf {
    dir.join("annotations.jsonl")
}

/// Resolve the archived-set JSONL store inside a plugin state directory.
pub fn archives_path(dir: &Path) -> PathBuf {
    dir.join("archives.jsonl")
}
```

`paths.rs` 全文 80 行，没有读取 `~/.config/herdr/plugins/config/<id>` 的代码路径。

## 配置目录实测

- `herdr plugin update` 输出末尾打印 `Config: /home/cpf/.config/herdr/plugins/config/annotate`。
- 该目录存在但为空。
- 插件状态目录为 `/home/cpf/.local/state/herdr/plugins/annotate/`（存放 `annotations.jsonl`、`archives.jsonl`）。
- `plannotator-tui` 自身读取的配置文件在 `~/.config/plannotator-tui/config.toml`。

## 上游 README（0.9.10）相关段落

终端输出审阅（第 227 行）：

```
`annotate.terminal` opens the focused pane's recent terminal output (the last 200 lines) for
```

Ctrl-click 为可选附加插件（第 251–265 行）：

```
#### Ctrl-click Markdown links (opt-in)

Annotate does not capture Ctrl-click on links by default, so `file://…md` links open the way
Herdr normally opens them. To send Ctrl-clicked `file://` Markdown links (`.md`, `.markdown`,
`.mdx`) to Annotate instead, install the Links add-on next to the Full install (on Windows, next
```

```
herdr plugin install plannotator/herdr-annotate/links
```

```
herdr plugin uninstall annotate-links
```

Links 附加插件的安装方式（第 343 行）：

```
The Links add-on has no build step: `herdr plugin link "$PWD/links"` links it as `annotate-links`.
```

## `herdr plugin list --json` 数据结构

本机输出顶层为 `result.plugins[]`，单条记录字段：

```json
{
  "plugin_id": "annotate",
  "version": "0.9.10",
  "source": {
    "kind": "github",
    "owner": "plannotator",
    "repo": "herdr-annotate",
    "resolved_commit": "29643fb42fcd6fb504a5512115be1dbf1ab338f8"
  }
}
```

## 未验证项

- 升级后未在 Herdr 内实际触发任何一个 action，`annotate.terminal` 的目视效果未确认。
- 未安装 Links 附加插件，Ctrl-click 行为未实测。
- 未运行 `plannotator-tui config` 读取生效配置。
