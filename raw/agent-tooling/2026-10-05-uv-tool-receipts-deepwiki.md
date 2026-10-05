# uv 工具发现机制与 uv-receipt.toml（DeepWiki + 本机实测）

> Source: DeepWiki 对 astral-sh/uv 源码索引的问答（https://deepwiki.com/search/how-does-uv-tool-list-discover_fad510ad-9bc5-47ed-84e5-b3b00a6bcacc）；本机 uv 安装目录实测
> Collected: 2026-10-05
> Published: Unknown

## DeepWiki 回答原文（机制层）

`uv tool list` discovers installed tools by reading per-tool `uv-receipt.toml` files from the tools directory. There is no single global manifest or lock file listing all installed tools; the per-tool receipts are the primary source of truth.

The `uv tool list` command initiates the discovery process by first obtaining an `InstalledTools` instance, which represents the collection of uv-managed tools installed on the system. It then acquires a global lock on the tools directory to prevent concurrent access issues.

The core of the discovery involves iterating through subdirectories within the root tools directory. For each subdirectory, it attempts to parse the directory name as a `PackageName`. If successful, it constructs the path to the expected `uv-receipt.toml` file within that tool's directory.

The `uv-receipt.toml` file is then read and parsed into a `ToolReceipt` object using `ToolReceipt::from_string()`. If the receipt is missing or invalid, the tool is either skipped with a warning or an error is recorded. Valid `Tool` objects extracted from these receipts are collected and sorted for display.

The `uv-receipt.toml` file stores metadata about an installed tool in a `Tool` struct. This includes:

- Requirements: The original package requirements for the tool, including any `--with` dependencies.
- Constraints and Overrides: Any custom constraints or overrides applied during installation or upgrade.
- Entrypoints: A list of `ToolEntrypoint` objects, detailing the executable names and their installation paths.
- Tool Options: Configuration settings used during the tool's installation or upgrade, such as `resolution` strategy, `exclude-newer` timestamps, and `index-url`. Importantly, credentials for index URLs are omitted from the receipt.
- Build Constraint Dependencies: Dependencies specifically used during the build process, including their hashes.

The `InstalledTools::tools()` method is responsible for scanning the tool directories and reading the `uv-receipt.toml` files.

## 本机实测（2026-10-05，WSL2）

- `~/.local/share/uv/` 下只有三个子目录：`python/`、`tools/`、`credentials/`；无全局工具清单文件。
- `~/.config/uv/uv-receipt.json`（316B）是 uv 安装器自身的收据，与已安装工具无关。
- 每个工具目录是一个完整 venv（含 `bin/`、`lib/`、`pyvenv.cfg`、`uv-receipt.toml`），整个 tools 目录体积 3.0G，文件总数 94,152（python os.walk 实测，纯遍历耗时约 2.9 秒）。
- `~/.local/share/uv/tools/` 下 12 个工具目录：book-to-skill、ddgs、graphifyy、headroom-ai、httpie、litellm、oxylabs-mcp、pipx、python-lsp-server、semgrep、serena-agent、trafilatura。
- 12 个 `uv-receipt.toml` 合计 3.2KB；逐一 grep 检查均不含 `options`、`index`、`@` 字段。
- semgrep 的 receipt 内容示例（249B）：

```toml
[tool]
requirements = [{ name = "semgrep" }]
entrypoints = [
    { name = "pysemgrep", install-path = "/home/cpf/.local/bin/pysemgrep", from = "semgrep" },
    { name = "semgrep", install-path = "/home/cpf/.local/bin/semgrep", from = "semgrep" },
]
```

- `uv tool list` 本机输出即按工具名列出版本与 entrypoints，与 DeepWiki 描述的「逐目录读 receipt」机制一致。
