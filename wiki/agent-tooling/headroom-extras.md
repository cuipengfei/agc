# Headroom Extras：本地 Coding Agent 安装指南

> Sources: headroomlabs-ai/headroom v0.37.0 pyproject.toml; `headroom/image/compressor.py` v0.37.0 源码; 本机安装调查; v0.41.0 pyproject `[tool.maturin]` + crates/headroom-proxy Cargo.toml + crates.io + GitHub release assets + 本机进程验证, 2026-10-15
> Raw: [2026-08-31-headroom-extras-survey](../../raw/agent-tooling/2026-08-31-headroom-extras-survey.md); [2026-10-15-headroom-rust-core-and-proxy-distribution](../../raw/agent-tooling/2026-10-15-headroom-rust-core-and-proxy-distribution.md)
> Updated: 2026-10-15

## 概述

Headroom 用 extras 分组安装依赖。不同 extra 代表不同压缩介质、部署场景和 SDK 集成。对本地 coding agent 代理链（Claude Code/Codex/OMP），并非全部有用。

## Rust 核心与独立 Rust 代理

`headroom-ai` 的 wheel 是 maturin 混合构建：一个 wheel 同时装 Python 源码和编译好的 Rust 扩展（模块名 `headroom._core`，PyO3 abi3，本机文件名 `_core.abi3.so`，约 29 MB），Rust cdylib 来源是仓库的 `crates/headroom-py`。安装一步到位，没有单独的 core 包，也没有安装顺序依赖。

本机实测（2026-10-15）：`import headroom._core` 成功；运行中的代理进程（`headroom proxy --mode cache`）的 `/proc/<pid>/maps` 含 14 段 `_core.abi3.so` 映射（含可执行段），说明扩展已加载进进程。证据边界：这只证明扩展已加载，不证明具体压缩请求调用了 Rust 函数（Python 侧与 Rust 侧实现并存，各路径走向未验证）。

仓库里还有一个独立 Rust 代理 `crates/headroom-proxy`（axum 反向代理，v0.1.0），Cargo.toml 自述「Phase 1: drop-in passthrough in front of the Python proxy」。它未发布：crates.io 上 `headroom-proxy` 返回 404；v0.41.0 的 GitHub release 资产只有 5 个平台 wheel + 2 个 tgz + 1 个 sdist，无独立二进制；pyproject 的 maturin `manifest-path` 只指向 `crates/headroom-py`。「未见发布」限定于 crates.io 与 GitHub assets 查证范围。


## 核心五件套（已验证安装）

| extra | 用途 | 是否必须 |
|---|---|---|
| `proxy` | FastAPI/uvicorn 代理服务器、HTTP/2、ONNX Kompress、zstd 压缩 | 当前代理链部署需要 |
| `mcp` | MCP server：`headroom_retrieve` / `compress` / `stats` | 当前代理链部署需要 |
| `code` | tree-sitter AST 解析 → `--code-aware` 代码压缩 | 推荐 |
| `html` | trafilatura 提取网页正文 → HTML 压缩 | 推荐 |
| `relevance` | fastembed 语义相关性排序 | 推荐 |

安装命令：

```bash
uv tool install 'headroom-ai[proxy,mcp,code,html,relevance]'
```

## 压缩与内容格式 extras

| extra | 作用 | 建议 |
|---|---|---|
| `ml` | PyTorch 版 Kompress（替代默认 ONNX） | **不要**。ONNX 已足够，PyTorch 太重 |
| `image` | Pillow + RapidOCR + SigLIP → 图片 OCR/压缩 | **不要**。coding agent 的截图需要像素和布局；OCR 会丢失视觉关系 |
| `spreadsheet` | openpyxl → 读取 `.xlsx` / `.xlsm`（不支持 `.xls`） | 按需。经常处理 Excel 时才装 |

### image 的风险细节

`headroom/image/compressor.py` 定义四种处理模式：

- `PRESERVE`：保留原图
- `FULL_LOW`：降 quality / 缩尺寸（OpenAI low detail、Anthropic 512px、Google 768px）
- `CROP`：当前实现同样走降质路径，不是可靠区域裁剪
- `TRANSCODE`：OCR 后**整张图片被文本替换**

OCR 平均 confidence 阈值 0.7。低于阈值或失败时回退到 `FULL_LOW`，**不保留原图**。代码截图、UI、架构图、小字体场景下 OCR 可能读错字符、丢布局。

## 记忆与观测 extras

| extra | 作用 | 建议 |
|---|---|---|
| `memory` | sqlite-vec 层级记忆 | **不要**。你已有 Mnemopi，且 Headroom memory 当前 0 records |
| `memory-stack` | Mem0 + Qdrant + Neo4j | **不要**。严重 overkill |
| `vector` | HNSW 向量索引 | 不要。需编译工具链，sqlite-vec 足够 |
| `otel` | OpenTelemetry 指标导出 | 有 OTel collector 后端时才装 |

## 部署与报告 extras

| extra | 作用 | 建议 |
|---|---|---|
| `proxy-prod` | Gunicorn 生产部署 | 本地单用户不需要 |
| `reports` | Jinja2 + matplotlib 报告生成 | 不要。已有 `headroom savings` 和 `headroom dashboard` |
| `evals` | pytest benchmark | 开发 Headroom 自身才需要 |

## Provider / Agent Framework 集成 extras

以下全部**不需要**，除非你使用对应框架：

- `bedrock`（AWS）
- `anyllm`
- `langchain`
- `agno`
- `autogen`
- `crewai`
- `strands`

## 语音 extras

- `voice`：librosa / soundfile / pydub，语音 filler 检测
- `voice-train`：PyTorch 训练语音模型

两者对 coding agent 无意义。

## meta extra

- `all`：一揽子安装 ml、image、memory、voice、evals 等。**不要装**，重且多数用不上。

## 结论

保持当前安装：

```bash
uv tool install 'headroom-ai[proxy,mcp,code,html,relevance]'
```

未来只有两个合理的按需增量：

- 经常处理 Excel → 加 `spreadsheet`
- 经常让代理 OCR 图片 → 加 `image`（但注意上述风险）
