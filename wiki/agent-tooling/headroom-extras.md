# Headroom Extras：本地 Coding Agent 安装指南

> Sources: headroomlabs-ai/headroom v0.37.0 pyproject.toml; `headroom/image/compressor.py` v0.37.0 源码; 本机安装调查
> Raw: [2026-08-31-headroom-extras-survey](../../raw/agent-tooling/2026-08-31-headroom-extras-survey.md)
> Updated: 2026-08-31

## 概述

Headroom 用 extras 分组安装依赖。不同 extra 代表不同压缩介质、部署场景和 SDK 集成。对本地 coding agent 代理链（Claude Code/Codex/OMP），并非全部有用。

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
