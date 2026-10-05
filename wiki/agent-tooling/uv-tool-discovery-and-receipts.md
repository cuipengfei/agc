# uv 工具发现机制与 uv-receipt.toml

> Sources: DeepWiki（astral-sh/uv 源码索引）, 2026-10-05; 本机实测, 2026-10-05
> Raw: [uv-tool-receipts-deepwiki](../../raw/agent-tooling/2026-10-05-uv-tool-receipts-deepwiki.md)
> Updated: 2026-10-05

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

## 对配置同步实践的启示

- 「只跟踪工具清单、不跟踪依赖环境」在 uv 世界的对应物就是逐目录收集 `uv-receipt.toml`，没有更集中的文件可用。
- 遍历方式必须浅层：用 `*/uv-receipt.toml` 这类 glob 只展开一层目录；若先 `rglob("*")` 再过滤，每次同步都要遍历全部 94,152 个 venv 文件，本机实测纯遍历耗时约 2.9 秒。
- 凭据风险按纵深防御处理：DeepWiki 称 uv 写入 receipt 时已省略 index URL 凭据，但该说法来自二手源码索引且未来行为可能变化，因此 agc 仓库的 `uv-tools-receipts` 同步条目仍标 `protected: true`，并在 `policy.py` 增加 `URL_CREDENTIAL` 规则脱敏 `scheme://user:pass@` 形态，配套泄漏测试。本机 12 个 receipt 当前逐一检查均不含 `options`/`index`/`@` 字段。
