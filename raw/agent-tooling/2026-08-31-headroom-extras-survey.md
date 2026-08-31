# Headroom v0.37.0 Extras 安装调查

> Source: 本机安装收据与命令输出; 官方 pyproject.toml v0.37.0 permalink; 源码 `headroom/image/compressor.py` v0.37.0 permalink
> Collected: 2026-08-31
> Published: 2026-08-31

## 本机版本与安装方式

- 版本: `0.37.0`
  - 命令输出: `headroom, version 0.37.0`
- 安装: `uv tool install 'headroom-ai[proxy,mcp,code,html,relevance]'`
- receipt: `~/.local/share/uv/tools/headroom-ai/uv-receipt.toml`
  - 内容: `requirements = [{ name = "headroom-ai", extras = ["proxy", "mcp", "code", "html", "relevance"] }]`
- 可执行: `/home/cpf/.local/bin/headroom`

## 官方源码 permalink

- pyproject.toml commit `32d7ca4`: https://github.com/headroomlabs-ai/headroom/blob/32d7ca4577d599b8a5f811ada74cf31504302c9d/pyproject.toml
- `headroom/image/compressor.py` commit `32d7ca4`: https://github.com/headroomlabs-ai/headroom/blob/32d7ca4577d599b8a5f811ada74cf31504302c9d/headroom/image/compressor.py
- `headroom/image/image_types.py` commit `32d7ca4`: https://github.com/headroomlabs-ai/headroom/blob/32d7ca4577d599b8a5f811ada74cf31504302c9d/headroom/image/image_types.py

## 当前已装 extras

| extra | 对应包 | 作用 |
|---|---|---|
| proxy | FastAPI/uvicorn, HTTP/2, ONNX Kompress, zstd | API 代理、压缩、CCR、cache、rate limit、budget |
| mcp | `mcp>=1.28.1,<2.0.0` | MCP server: `headroom_retrieve` / `compress` / `stats` |
| code | tree-sitter | AST-aware 代码压缩 (`--code-aware`) |
| html | trafilatura | 网页正文提取与压缩 |
| relevance | fastembed | 语义相关性排序 |

## 本机运行参数

```text
headroom proxy ... --code-aware --mode cache
```

## v0.37.0 官方全部 extras

从 `pyproject.toml [project.optional-dependencies]`：

```toml
all = ["ml","image","memory","memory-stack","relevance","code","html","spreadsheet","reports","proxy-prod","otel","evals","bedrock","anyllm","langchain","agno","autogen","crewai","strands","dev","voice","voice-train"]

proxy = ["fastapi[standard]>=0.115.0","uvicorn[standard]>=0.34.0","aiohttp>=3.11.0","onnxruntime>=1.21.0","python-multipart>=0.0.18","zstandard>=0.23.0"]
mcp = ["mcp>=1.28.1,<2.0.0"]

ml = ["torch>=2.6.0","transformers>=4.50.0"]
image = ["pillow>=11.0.0","rapidocr-onnxruntime>=1.4.0","siglip"]
memory = ["sqlite-vec>=0.1.0","aiosqlite>=0.21.0","ulid-py>=1.1.0","markdownify>=0.14.0","nltk>=3.9.0"]
memory-stack = ["mem0ai>=0.1.0","qdrant-client>=1.13.0","neo4j>=5.28.0"]
relevance = ["fastembed>=0.6.0"]
code = ["tree-sitter>=0.24.0"]
html = ["trafilatura>=2.0.0","lxml[html_clean]>=5.4.0"]
spreadsheet = ["openpyxl>=3.1.0"]
reports = ["jinja2>=3.1.0","matplotlib>=3.10.0"]
proxy-prod = ["gunicorn>=23.0.0"]
otel = ["opentelemetry-api>=1.30.0","opentelemetry-sdk>=1.30.0","opentelemetry-exporter-otlp>=1.30.0"]
evals = ["pytest>=8.3.0","pytest-cov>=6.0.0","pytest-xdist>=3.6.0"]

# Provider integrations
bedrock = ["boto3>=1.37.0"]
anyllm = ["any-llm>=0.1.0"]

# SDK integrations
langchain = ["langchain>=0.3.0"]
agno = ["agno>=1.3.0"]
autogen = ["autogen-core>=0.5.0"]
crewai = ["crewai>=0.108.0"]
strands = ["strands-agents>=1.0.0"]

# Voice
dev = ["pre-commit>=4.2.0","ruff>=0.11.0","mypy>=1.15.0","pytest>=8.3.0","pytest-cov>=6.0.0","pytest-xdist>=3.6.0"]
voice = ["librosa>=0.11.0","soundfile>=0.13.0","pydub>=0.25.0"]
voice-train = ["voice","torch>=2.6.0","transformers>=4.50.0","datasets>=3.5.0","accelerate>=1.6.0","peft>=0.15.0"]
```

### spreadsheet 格式边界

- `openpyxl` 官方支持格式：`.xlsx` / `.xlsm` / `.xltx` / `.xltm`（Office Open XML）
- 不支持旧二进制 `.xls`
- 来源：https://openpyxl.readthedocs.io/en/stable/

## image compressor 处理链（v0.37.0 源码）

`headroom/image/compressor.py` 的 `compress()` 管道（[`compressor.py#L647-L784`](https://github.com/headroomlabs-ai/headroom/blob/32d7ca4577d599b8a5f811ada74cf31504302c9d/headroom/image/compressor.py#L647-L784)）：

1. **Tile-boundary 对齐**：纯数学优化，零质量损失（[`compressor.py#L669-L682`](https://github.com/headroomlabs-ai/headroom/blob/32d7ca4577d599b8a5f811ada74cf31504302c9d/headroom/image/compressor.py#L669-L682)）
2. **ML 路由**：ONNX（生产）→ PyTorch（回退）（[`compressor.py#L699-L727`](https://github.com/headroomlabs-ai/headroom/blob/32d7ca4577d599b8a5f811ada74cf31504302c9d/headroom/image/compressor.py#L699-L727)）
3. **四种 Technique**（定义在 [`image_types.py#L17-L24`](https://github.com/headroomlabs-ai/headroom/blob/32d7ca4577d599b8a5f811ada74cf31504302c9d/headroom/image/image_types.py#L17-L24)）：
   - `PRESERVE`：保留原图（0% 节省）
   - `FULL_LOW`：OpenAI 改 low detail；Anthropic 缩至 512px；Google 缩至 768px（[`compressor.py#L586-L636`](https://github.com/headroomlabs-ai/headroom/blob/32d7ca4577d599b8a5f811ada74cf31504302c9d/headroom/image/compressor.py#L586-L636)）
   - `CROP`：当前实现同样走降质/缩图路径，未证实可靠区域裁剪
   - `TRANSCODE`：OCR 后整张图片被文本替换（声称 99% 节省）

OCR 由 RapidOCR 执行，平均 confidence 阈值 0.7（[`compressor.py#L404-L521`](https://github.com/headroomlabs-ai/headroom/blob/32d7ca4577d599b8a5f811ada74cf31504302c9d/headroom/image/compressor.py#L404-L521)）。
低于阈值或失败时回退到 `FULL_LOW`，**不保留原图**（[`compressor.py#L581-L583`](https://github.com/headroomlabs-ai/headroom/blob/32d7ca4577d599b8a5f811ada74cf31504302c9d/headroom/image/compressor.py#L581-L583)： `"OCR fallback: using full_low instead of transcode"`）。

## 当前 extras 覆盖判断

| extra | 是否已装 | 判断 |
|---|---|---|
| proxy | 是 | 核心，必须 |
| mcp | 是 | 核心，必须 |
| code | 是 | coding agent 用 `--code-aware`，有用 |
| html | 是 | 处理网页，有用 |
| relevance | 是 | 语义排序，有用 |
| ml | 否 | PyTorch 版 Kompress；当前 ONNX 足够 |
| image | 否 | OCR/图片压缩；coding agent 截图通常需要像素和布局，不建议 |
| memory | 否 | Headroom 层级记忆；当前 0 memories，且已有 Mnemopi |
| memory-stack | 否 | Mem0+Qdrant+Neo4j，严重 overkill |
| spreadsheet | 否 | 处理 Excel；按需 |
| reports | 否 | Jinja2 报告；已有 dashboard/savings |
| proxy-prod | 否 | Gunicorn 生产部署；本地不需要 |
| otel | 否 | OpenTelemetry；需后端 |
| voice | 否 | 语音 filler 检测 |
| voice-train | 否 | 训练语音模型 |
| bedrock | 否 | AWS |
| langchain | 否 | SDK 集成 |
| crewai | 否 | SDK 集成 |
| agno | 否 | SDK 集成 |
| autogen | 否 | SDK 集成 |
| strands | 否 | SDK 集成 |
| anyllm | 否 | SDK 集成 |
| evals | 否 | benchmark |
| dev | 否 | 开发依赖 |
