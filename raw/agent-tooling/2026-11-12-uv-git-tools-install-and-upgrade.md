# uv Git 工具安装、隔离依赖与升级输出

> Source: 当前会话的隔离安装命令与输出、用户提供的安装升级及 CLI 日志；https://docs.astral.sh/uv/concepts/tools/；下文 uv 固定提交源码
> Collected: 2026-11-12
> Published: Unknown

## 会话环境与操作边界

会话记录的本机版本为 `uv 0.13.7`。`uv tool list --all` 返回参数错误，改用 `uv tool list`。`uv tool upgrade --all` 支持升级全部工具。

首次安装验证使用 `/tmp/ub-uv-test/home` 作为临时 HOME，`/tmp/ub-uv-test/bin` 作为 `UV_TOOL_BIN_DIR`，没有替换用户的全局工具。稍后用户在全局环境自行运行相同安装命令并贴回输出。

## 官方文档原文摘录

来源：https://docs.astral.sh/uv/concepts/tools/#the-uv-tool-interface

> Tools can also be installed with `uv tool install`, in which case their executables are available on the `PATH` — an isolated virtual environment is still used, but it is not removed when the command completes.

来源：https://docs.astral.sh/uv/concepts/tools/#including-additional-dependencies

```text
uv tool install --with <extra-package> <tool-package>
```

> The `--with` option can be provided multiple times to include additional packages.

来源：https://docs.astral.sh/uv/concepts/tools/#upgrading-tools

> Tool environments may be upgraded via `uv tool upgrade`, or re-created entirely via subsequent `uv tool install` operations.

> Similarly, tool upgrades will retain the settings provided when installing the tool.

来源：https://docs.astral.sh/uv/concepts/tools/#tool-environments

> Tool environments are not intended to be mutated directly. It is strongly recommended never to mutate a tool environment manually, e.g., with a `pip` operation.

## 实际通过的安装命令

先分别安装 crapper、dryer、mutator。在 mutator 的环境中执行 `ensure_crapper()` 时，失败输出的关键句为：

```text
ImportError: crapper is not installed and was not found at
```

该句是错误消息前缀；路径部分未摘录。随后以 `--force` 重建临时 mutator 环境，附加 crapper，再执行同一导入检查：

```text
crapper import: OK
```

最终可用的安装命令为：

```bash
uv tool install git+https://github.com/unclebob/crapper.git
uv tool install git+https://github.com/unclebob/dryer.git
uv tool install \
  git+https://github.com/unclebob/mutator.git \
  --with git+https://github.com/unclebob/crapper.git
```

前三条命令每次只安装一个 tool；crapper 通过 `--with` 作为 mutator 环境的附加包。不能用两条 Git 地址作为两个位置参数一次安装两个工具，会话中这种尝试返回参数错误。

## 用户提供的全局安装日志摘录

crapper：

```text
+ crapper==0.1.0 (from git+https://github.com/unclebob/crapper.git@c757ec79a6c15dc815238bbd9c2f4601eb54d3cc)
+ tree-sitter==0.26.1
+ tree-sitter-language-pack==1.25.0
Installed 1 executable: crapper
```

dryer：

```text
+ dryer==0.1.0 (from git+https://github.com/unclebob/dryer.git@66ff6d21a42c04afcad89c78a80066176d1294b0)
+ tree-sitter==0.26.1
+ tree-sitter-language-pack==1.25.0
Installed 1 executable: dryer
```

mutator：

```text
+ crapper==0.1.0 (from git+https://github.com/unclebob/crapper.git@c757ec79a6c15dc815238bbd9c2f4601eb54d3cc)
+ mutator==0.1.0 (from git+https://github.com/unclebob/mutator.git@830ec7e9c39664d753f8699015bc796df67727b9)
+ tree-sitter==0.26.1
+ tree-sitter-language-pack==1.25.0
Installed 1 executable: mutator
```

三个安装记录均使用不含 ref 的原始 Git URL；uv 日志附加解析得到的 commit，不表示用户把安装来源固定为该 commit。

## 已安装 CLI 入口验证

用户的 `where` 输出包含 `/home/cpf/.local/bin/crapper`、`/home/cpf/.local/bin/dryer`、`/home/cpf/.local/bin/mutator`。本材料只据此记录命令路径，不推断 shell 重复路径的配置来源。

用户尝试三个 `--version`，均返回：

```text
Unknown option: --version
```

最后一个命令退出码为 1。随后用户运行三个 `--help`，均显示相应 Usage 和选项，没有参数错误。版本可由 `uv tool list` 查看；Git commit 可参考安装及升级日志。帮助入口通过不等于已完成真实项目分析。

## 升级操作与观察

```bash
uv tool upgrade crapper dryer mutator
uv tool upgrade --all
```

后一个命令还会检查其他已安装 uv tools。

隔离环境中运行 `uv tool upgrade --all`，没有新提交可安装，输出：

```text
Nothing to upgrade
```

详细日志显示对 Git 来源进行了查询。用户后来提供的全局升级日志原文摘录（删除终端进度覆盖，仅保留消息）：

```text
Updated https://github.com/unclebob/crapper.git (c757ec79a6c15dc815238bbd9c2f4601eb54d3cc)
Updated https://github.com/unclebob/mutator.git (830ec7e9c39664d753f8699015bc796df67727b9)
Updated https://github.com/oraios/serena (6e5c3776d4e67befaab7c290bc29b0279c98d1ed)
Nothing to upgrade
```

没有进行远端新增提交后的升级实验；这里实际观察的是来源刷新后仍使用相同提交的情况。

## uv 当前默认分支的源码解释

源码版本：`6ff87607937b55055ed4c75d3e965aad61bcbc91`，2026-11-12 读取。该版本与本机 `uv 0.13.7` 分开记录，没有核对其是否对应同一发布版本。

来源：https://github.com/astral-sh/uv/blob/6ff87607937b55055ed4c75d3e965aad61bcbc91/crates/uv-command-support/src/progress.rs

`on_checkout_complete` 中的原文摘录：

```rust
let message = format!(
    "    {} {} ({})",
    "Updated".bold().green(),
    url,
    rev.dimmed()
);
```

该消息报告 checkout 完成时的 URL 与解析出的 revision，没有在此格式化路径比较新旧 hash。

来源：https://github.com/astral-sh/uv/blob/6ff87607937b55055ed4c75d3e965aad61bcbc91/crates/uv-tool-commands/src/upgrade.rs

源码包含以下最终条件与消息：

```rust
if did_upgrade_tool.is_empty() && did_upgrade_environment.is_empty() {
    writeln!(printer.stderr(), "Nothing to upgrade")?;
```

这是条件片段，后续代码未摘录。同一消息还会在待处理工具列表为空时输出。结合用户这次列出具体 Git 来源的日志，这次是 Git 来源刷新完成，最终没有需要升级的工具。

## 证据边界

已执行：临时 Git 安装、三个帮助入口、mutator 导入失败和附加依赖后的成功、无更新场景的 upgrade-all；全局安装和升级来自用户提供的真实日志。未执行：新增远端提交后的工具及附加依赖升级、真实项目质量分析、uml-viewer 安装。
