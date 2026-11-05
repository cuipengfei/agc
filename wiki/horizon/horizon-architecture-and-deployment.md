# Horizon 架构与部署方式

> Sources: Thysrael/Horizon README.md, docs/configuration.md, .github/workflows/daily-summary.yml.disabled, data/config.github.json; GitHub Actions billing docs (docs.github.com); 2026-11-04
> Raw: [README and Configuration Reference](../../raw/horizon/horizon-readme-and-config-reference.md); [GitHub Actions Template and Default Config](../../raw/horizon/horizon-github-actions-template-and-default-config.md); [GitHub Actions Billing Docs](../../raw/horizon/github-actions-billing-docs.md)
> Updated: 2026-11-04

## Overview

Horizon 是一个 Python 编写的 AI 新闻聚合器，从多个信息源抓取内容，用大模型打分、去重、分类并生成摘要，最终产出中英双语每日简报，推送到用户指定的渠道。仓库地址 https://github.com/Thysrael/Horizon。

## 工作流程

四阶段流水线：

1. **抓取（Scrape）**——从用户配置的信息源拉取最近 N 小时（默认 24）的内容。支持 10 种信息源：RSS/Atom、Hacker News、Reddit、Telegram、Twitter/X（Apify）、GitHub（用户事件与仓库 release）、OpenBB（金融新闻）、OSS Insight（开源趋势）、GDELT（全球新闻）、Google News。
2. **AI 分析与过滤**——每条内容路由到一个 profile（编辑规则模板），由大模型按该 profile 的评分标准打分（0–10 分）。低于阈值的丢弃，同一话题的多条内容合并去重。
3. **补充（Enrichment）**——对保留的内容，按 profile 指定的格式生成摘要、背景说明、社区讨论摘要。可以用 web search 补充背景信息。
4. **生成简报并投递**——把所有内容按 profile 分组，生成 Markdown 简报，保存到 `data/summaries/`，然后按配置的渠道推送。

## Profile 机制

Profile 是可复用的编辑规则集合，定义三件事：什么内容属于这个 profile、什么值得保留、应该写出什么格式的摘要。内置四个 profile：

| Profile | 用途 | 输出内容 |
|---------|------|---------|
| `tech-news` | 技术新闻 | 事件与背景，包含影响分析和社区讨论 |
| `tech-blog` | 工程深度文章 | 背景、解决方案和实用要点 |
| `finance-news` | 金融新闻 | 市场动态与发展 |
| `ai-creator` | AI 创作者素材 | 摘要，包含内容角度和切入点 |

每个信息源可以显式指定一个 profile，设为 `"auto"` 让 AI 匹配，或指定一个候选列表让 AI 从中选择。

## AI Provider

支持以下 provider：Anthropic Claude、OpenAI、Gemini、Azure OpenAI、MiniMax、Aliyun DashScope、Doubao、DeepSeek、Ollama、OpenClaw、OpenAI-ChatGPT（Sign in with ChatGPT，不需 API key）。

`api_key_env` 字段填环境变量名（如 `DEEPSEEK_API_KEY`），不是 key 本身。密钥放在 `.env` 文件里。

`throttle_sec` 控制每条内容之间的间隔（默认 0），`analysis_concurrency` 和 `enrichment_concurrency` 控制并行度（默认各 1）。

## 安装与配置

**本地安装：**

```bash
git clone https://github.com/Thysrael/Horizon.git
cd Horizon
uv sync
```

或 `pip install -e .`。可选 `--extra dev`（测试）、`--extra openbb`（金融新闻源）。

**Docker：**

```bash
docker compose build horizon
docker compose run --rm horizon
```

**配置：**

- `.env`——存放 API key 等密钥。
- `data/config.json`——运行时设置（信息源、AI provider、投递渠道、过滤阈值等）。可用 `uv run horizon-wizard` 向导自动生成。
- `profiles/`——分析提示词模板目录。

配置文件中任意字符串值支持 `${VAR_NAME}` 环境变量展开。未设置的变量保留原样 `${NAME}`，不会变成空字符串。

## 运行

```bash
uv run horizon              # 默认抓最近 24 小时
uv run horizon --hours 12   # 抓最近 12 小时
uv run horizon --data-dir /srv/horizon    # 指定状态目录
uv run horizon --config /etc/horizon/config.json  # 指定配置文件
```

简报保存到 `data/summaries/`（或 `--data-dir` 指定目录下的 `summaries/`）。

## 定时运行

三种方式：

| 方式 | 运行位置 | 调度机制 |
|------|---------|---------|
| GitHub Actions | GitHub CI runner | workflow 模板内置 cron `0 23 * * *`（UTC 23:00 = 北京 07:00） |
| 本地 cron | 用户自己的机器 | crontab 定时执行 `uv run horizon` |
| Docker + 主机 cron | 用户自己的机器或服务器 | 主机 cron 或 systemd timer 启动单次 `docker compose run --rm horizon` |

Docker 的 `docker-compose.yml` 设为 `restart: "no"`，该选项只控制容器退出后是否重启，不能按日历定时启动。定时需要主机层面的 cron 或 systemd timer。

### GitHub Actions 部署

仓库提供模板 `.github/workflows/daily-summary.yml.disabled`，默认禁用。Fork 仓库后改名去掉 `.disabled` 后缀启用。

workflow 执行步骤：checkout → setup Python 3.12 → install uv 0.11.26 → `uv sync` → `cp data/config.github.json data/config.json` → `uv run horizon --hours 24` → 部署 `docs/` 到 `gh-pages` 分支（用 `peaceiris/actions-gh-pages@v4`，`keep_files: true`，`enable_jekyll: true`）。

secrets 映射：`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`GOOGLE_API_KEY`、`LWN_KEY`、`DEEPSEEK_API_KEY`、`HORIZON_WEBHOOK_URL`。也支持 `workflow_dispatch` 手动触发。

GitHub Actions 标准 runner 在公开仓库中完全免费（不消耗 included compute usage）。私有仓库的 runner 用量按金额从账户每月 included compute usage 中扣除：GitHub Free 计划每月 $12 USD，Linux 2-core runner 每分钟 $0.006 USD。模型 API 调用费用另算——默认配置用 DeepSeek `deepseek-v4-flash`，调用 DeepSeek API 的费用由用户的 DeepSeek 账户承担，与 GitHub Actions 额度无关。

## 投递渠道

四条渠道，在 GitHub Actions 下的可用性不同：

| 渠道 | 机制 | GitHub Actions 模板默认 | 在 Actions 下要额外做什么 |
|------|------|----------------------|------------------------|
| GitHub Pages | 把 Markdown 复制到 `docs/`，Pages 自动发布静态网站 | ✅ 已配 | 无需额外操作 |
| Webhook | HTTP POST 推送到飞书/Lark、钉钉、Slack、Discord 或自定义端点 | ✅ 已配（飞书） | 把 webhook URL 存到 `HORIZON_WEBHOOK_URL` secret |
| 邮件 | SMTP 发送简报；IMAP 处理订阅/退订邮件 | ❌ 未配 | 在 config.json 里加 `email` 段、SMTP 凭据存 Secrets；订阅者列表 `data/subscribers.json` 默认 workflow 不持久化，每次 run 从空状态开始；IMAP 订阅/退订功能需要配置且状态文件不保留 |
| 微信 | 通过 iLink Bot 发送，需扫码登录并从微信发消息触发 | ❌ 未配 | 首次扫码登录是交互操作；`data/wechat_session.json` 需要在定时运行之间保留，默认 workflow 未配置持久化此文件；模板未直接支持微信连续投递，补上安全的会话恢复后再验证 |

模板默认配置（`data/config.github.json`）只启用了 webhook，platform 为 `feishu`，layout 为 `collapsible`，delivery 为 `summary_and_items`，languages 为 `["zh"]`。Pages 通过 workflow 的部署步骤自动完成。邮件和微信在模板中没有配置。

微信投递的限制：用户发送的一条消息提供回复所需的上下文，实测每个上下文最多 10 条回复。长简报可能中途用尽额度。每日额度重置尚未确认。会话凭据保存在 `<data-dir>/wechat_session.json`（POSIX 权限 0600），需要在定时运行之间保留此文件。

## 默认 GitHub 配置的信息源

`data/config.github.json` 预配了以下信息源：

- GitHub：karpathy 用户事件；vLLM、SGLang、Triton 仓库 release
- Hacker News：top 30，min_score 150
- RSS：Simon Willison、vLLM Blog、Sean Goedecke、CNBC Finance、GitHub Trending Daily、Semianalysis、LWN.net（共 7 个 feed）
- Reddit：MachineLearning、LocalLLaMA（各 fetch_limit 10，min_score 60）
- Telegram：zaihuapd 频道

AI provider 默认为 DeepSeek `deepseek-v4-flash`，`throttle_sec` 1，`analysis_concurrency` 5，`enrichment_concurrency` 5，`languages` `["zh", "en"]`。

`digest.max_items` 为 null（无总量限制），`profile_order` 为 `["tech-news", "tech-blog", "finance-news"]`。

## MCP Server

```bash
uv run horizon-mcp
```

提供 7 个工具：`hz_validate_config`、`hz_fetch_items`、`hz_score_items`、`hz_filter_items`、`hz_enrich_items`、`hz_generate_summary`、`hz_run_pipeline`。可以让 AI 助手通过 MCP 协议调用 Horizon 的各个阶段，而不是一次性跑完整个流水线。
