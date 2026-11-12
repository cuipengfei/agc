# uv 工具发现机制与 uv-receipt.toml

> Sources: DeepWiki（astral-sh/uv 源码索引）, 2026-10-05; 本机实测, 2026-10-05; uv 官方文档、源码 `6ff87607937b55055ed4c75d3e965aad61bcbc91` 与本次会话安装升级日志, 2026-11-12
> Raw: [uv-tool-receipts-deepwiki](../../raw/agent-tooling/2026-10-05-uv-tool-receipts-deepwiki.md); [uv Git 安装与升级证据](../../raw/agent-tooling/2026-11-12-uv-git-tools-install-and-upgrade.md)
> Updated: 2026-11-12

## Overview

uv 没有 bun 那样的全局 package.json 清单。已安装工具的唯一事实来源是每个工具目录里的 `uv-receipt.toml`：`uv tool list` 通过 `InstalledTools::tools()` 遍历 tools 根目录的子目录、逐个读取并解析 receipt（`ToolReceipt::from_string()`）来发现工具，receipt 缺失或损坏的工具会被跳过或记录错误。要盘点一台机器上装了哪些 uv 工具，只能按目录收集 receipt。

## 目录形态

`~/.local/share/uv/` 下只有 `python/`、`tools/`、`credentials/` 三个子目录，无全局清单文件；`~/.config/uv/uv-receipt.json` 是 uv 安装器自身的收据，与工具无关。`tools/` 下每个工具是一个完整 venv（`bin/`、`lib/`、`pyvenv.cfg`、`uv-receipt.toml`）。本机实测：12 个工具、整个目录 3.0G、94,152 个文件，而 12 个 receipt 合计仅 3.2KB。

## receipt 内容

`uv-receipt.toml` 的 `Tool` 结构记录：

- **requirements**：原始包需求，含 `--with` 附加依赖；
- **constraints / overrides**：安装或升级时的约束；
- **entrypoints**：可执行名与安装路径（`ToolEntrypoint` 列表）；
- **tool options**：安装时的配置，如 `resolution` 策略、`exclude-newer`、`index-url`；DeepWiki 指出 index URL 的凭据在写入 receipt 时会被省略；
- **build constraint dependencies**：构建期依赖及其 hash。

## Git 来源工具的安装与升级

uv 支持从 Git 安装 Python CLI。每个 tool 使用独立环境，另一个全局工具环境里的 Python 包不会自动成为当前工具的导入依赖。mutator 的实测案例是：单独安装后导入 crapper 失败，通过 `--with` 把 crapper 加进 mutator 环境后，同一个检查输出 `crapper import: OK`。

```bash
uv tool install git+https://github.com/unclebob/mutator.git \
  --with git+https://github.com/unclebob/crapper.git
```

`--with` 是附加包需求，属于上文 receipt 的 requirements；它与包自身声明的 extra 分开。官方文档说明升级会保留安装设置，无需手工向 tool 环境执行 pip 安装。三个工具的完整安装命令见 [ub-mode 配套工具](ub-mode-companion-tools.md#uv-git-安装)。

```bash
uv tool list
uv tool upgrade crapper dryer mutator
uv tool upgrade --all
```

会话环境 uv 0.13.7 的 `uv tool list --all` 返回参数错误；列工具使用 `uv tool list`。`uv tool upgrade --all` 会检查全部已安装工具及其环境依赖。上述 Git 安装地址未指定 ref；日志中的 commit 是解析结果，不能仅凭它判定安装需求固定了 commit。若在安装 URL 中明确写入固定 commit，则后续升级仍受该来源约束。

### Updated 与 Nothing to upgrade

用户的升级日志同时出现同一 Git hash 的 `Updated` 和最终的 `Nothing to upgrade`。两者分别报告不同步骤：

| 输出 | 对应步骤 |
|---|---|
| `Updated <URL> (<hash>)` | Git checkout 完成，显示本次解析到的 revision |
| `Nothing to upgrade` | 最终没有需要升级的工具；待处理工具列表为空也会出现这条消息 |

当前源码 `on_checkout_complete` 直接格式化 `Updated`，该输出路径没有比较新旧 hash。因此，同一 hash 配合最终无升级结果属于正常的来源刷新。本次读取的源码是 `6ff87607937b55055ed4c75d3e965aad61bcbc91`，环境日志来自 uv 0.13.7，两者没有做发布版本对应核验。

实际验证覆盖临时 Git 安装、依赖导入和无更新场景的 `upgrade --all`，用户也提供了全局安装升级日志。没有模拟远端新增 commit 后的升级；相关命令的预期用途依据 uv 文档记录。

## 对配置同步实践的启示

- 「只跟踪工具清单、不跟踪依赖环境」在 uv 世界的对应物就是逐目录收集 `uv-receipt.toml`，没有更集中的文件可用。
- 遍历方式必须浅层：用 `*/uv-receipt.toml` 这类 glob 只展开一层目录；若先 `rglob("*")` 再过滤，每次同步都要遍历全部 94,152 个 venv 文件，本机实测纯遍历耗时约 2.9 秒。
- 凭据风险按纵深防御处理：DeepWiki 称 uv 写入 receipt 时已省略 index URL 凭据，但该说法来自二手源码索引且未来行为可能变化，因此 agc 仓库的 `uv-tools-receipts` 同步条目仍标 `protected: true`，并在 `policy.py` 增加 `URL_CREDENTIAL` 规则脱敏 `scheme://user:pass@` 形态，配套泄漏测试。本机 12 个 receipt 当前逐一检查均不含 `options`/`index`/`@` 字段。
