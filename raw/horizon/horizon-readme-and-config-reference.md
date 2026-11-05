# Horizon README and Configuration Reference

> Source: https://github.com/Thysrael/Horizon — README.md and docs/configuration.md
> Collected: 2026-11-04
> Published: Unknown (repository live documents)

## README 摘录

### What Horizon Is

Horizon is a Python AI-powered news radar. It collects content from multiple sources, uses an LLM to score, deduplicate, classify, and write summaries, then generates a daily briefing (bilingual Chinese/English) and delivers it to configured channels.

### How It Works

Four-stage pipeline:

1. Scrape — fetch content from configured sources in the last N hours.
2. AI analysis and filtering — each item routes to a profile (editorial rule template), scored by an LLM against that profile's scoring criteria. Items below threshold are dropped; duplicate topics merged.
3. Enrichment — for retained items, generate summaries, background, community discussion summaries per profile format. Web search can supplement background.
4. Generate briefing and deliver — group all content by profile, generate Markdown briefing, save to `data/summaries/`, push to configured delivery channels.

### Supported Sources

| Source | What it fetches | Comments |
|--------|----------------|----------|
| Hacker News | Top stories by score | Yes (top N comments) |
| RSS / Atom | Any RSS or Atom feed | — |
| Reddit | Subreddits + user posts | Yes (top N comments) |
| Telegram | Public channel messages | — |
| Twitter / X | User timelines + keyword searches (Apify) | Yes (top N replies) |
| GitHub | User events & repo releases | — |
| OpenBB | Financial company news by watchlist/provider | — |
| OSS Insight | Trending open-source repositories | — |
| GDELT | News matching a search query | — |
| Google News | News search via RSS | — |

### Profiles

A profile is a reusable set of editorial rules: what belongs, what's worth keeping, and what to write. Built-in examples: `tech-news`, `tech-blog`, `finance-news`, `ai-creator`.

### Installation

**Option A: Local Installation**

```bash
git clone https://github.com/Thysrael/Horizon.git
cd Horizon
uv sync          # recommended
# or
pip install -e .
```

Optional extras: `uv sync --extra dev` (test), `uv sync --extra openbb` (financial news source).

**Option B: Docker**

```bash
git clone https://github.com/Thysrael/Horizon.git
cd Horizon
docker compose build horizon
```

### Configuration

**Option A: Interactive wizard (recommended)**

```bash
uv run horizon-wizard
```

**Option B: Manual**

```bash
cp .env.example .env          # Add your API keys
cp data/config.example.json data/config.json  # Customize your sources
```

Minimal config example:

```jsonc
{
  "ai": {
    "provider": "openai",
    "model": "gpt-4",
    "api_key_env": "OPENAI_API_KEY"
  },
  "sources": {
    "rss": [
      {
        "name": "Simon Willison",
        "url": "https://simonwillison.net/atom/everything/",
        "profile": "tech-news"
      }
    ]
  },
  "processing": {
    "profiles_dir": "profiles",
    "default_profile": "tech-news",
    "profile_settings": {
      "tech-news": {
        "threshold": 7.0,
        "topic_dedup": true
      }
    }
  }
}
```

`api_key_env` is an environment variable name, not the key value. Put the real secret in `.env`.

### Run

```bash
uv run horizon [OPTIONS]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--hours N` | 24 | Fetch from last N hours |
| `-d`, `--data-dir PATH` | `data` | Path to the data directory |
| `-c`, `--config PATH` | `<data-dir>/config.json` | Path to config file |
| `-l`, `--log-level LEVEL` | `WARNING` | Logging level |

Report saved to `data/summaries/`.

### Automate

Schedule with GitHub Actions using `.github/workflows/daily-summary.yml.disabled`. Template is disabled in this repository; configure for your deployment and rename to `daily-summary.yml` to enable.

### Delivery Channels

| Channel | What it does |
|---------|--------------|
| GitHub Pages Daily Site | Copies generated Markdown into `docs/` so GitHub Pages can publish a daily-updated briefing site |
| Email Subscription | Sends the daily briefing to subscribers and handles subscribe/unsubscribe requests through SMTP/IMAP |
| Webhook Notification | Pushes success or failure results to Feishu/Lark, DingTalk, Slack, Discord, or any custom webhook endpoint |
| WeChat Notification | Sends briefings through iLink Bot after QR login and a message from you; WeChat reply limits apply |

### MCP Server

```bash
uv run horizon-mcp
```

Tools: `hz_validate_config`, `hz_fetch_items`, `hz_score_items`, `hz_filter_items`, `hz_enrich_items`, `hz_generate_summary`, `hz_run_pipeline`.

## Configuration Guide 摘录 (docs/configuration.md)

### AI Providers

Supported providers: Anthropic Claude, OpenAI, Gemini, Azure OpenAI, MiniMax, Aliyun DashScope, Doubao, DeepSeek, Ollama, OpenClaw, OpenAI-ChatGPT (Sign in with ChatGPT).

`api_key_env` is always an environment variable name, not the key value.

Common API key variable names:

| Provider | `api_key_env` value |
|---------|---------|
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` |
| Gemini | `GOOGLE_API_KEY` |
| MiniMax | `MINIMAX_API_KEY` |
| Aliyun DashScope | `DASHSCOPE_API_KEY` |
| Doubao | `DOUBAO_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |

### AI Throttling and Concurrency

`throttle_sec`: Pause between scored items in seconds. Default is `0`. `4.5` is reasonable for free-tier models capped at ~15 requests/minute.

`analysis_concurrency`: Number of items scored in parallel. Default `1`.
`enrichment_concurrency`: Number of high-scoring items enriched in parallel. Default `1`.

### Email Subscription

Disabled unless `email.enabled` is `true`. Uses SMTP to send, IMAP to check subscribe/unsubscribe.

```json
{
  "email": {
    "enabled": true,
    "smtp_server": "smtp.qq.com",
    "smtp_port": 465,
    "smtp_username": null,
    "imap_enabled": true,
    "imap_server": "imap.qq.com",
    "imap_port": 993,
    "email_address": "xxx@qq.com",
    "password_env": "EMAIL_PASSWORD",
    "sender_name": "Horizon Daily",
    "subscribe_keyword": "SUBSCRIBE",
    "unsubscribe_keyword": "UNSUBSCRIBE"
  }
}
```

Recipients loaded from `<data-dir>/subscribers.json`.

### Webhook Notification

Disabled unless `webhook.enabled` is `true`.

```json
{
  "webhook": {
    "enabled": true,
    "url_env": "HORIZON_WEBHOOK_URL",
    "delivery": "summary",
    "overview_position": "first",
    "platform": "generic",
    "layout": "markdown",
    "fallback_layout": "markdown",
    "languages": null,
    "request_body": {
      "text": "#{message_title}\n#{summary}"
    },
    "headers": ""
  }
}
```

`delivery`: `summary` (one full message) or `summary_and_items` (overview + one per item).
`layout`: `markdown` (default) or `collapsible` (Feishu/Lark only, collapsed panels).
Supported platforms: `generic`, `feishu`, `lark`.

### WeChat Notification

```json
{
  "wechat": {
    "enabled": true,
    "languages": ["zh"],
    "chunk_size": 4000
  }
}
```

Commands:

```bash
uv run horizon-wechat login                     # scan with WeChat, then message the bot
uv run horizon-wechat status                    # connection and estimated replies left
uv run horizon-wechat test --lang zh --dry-run  # preview without connecting or sending
uv run horizon-wechat test --lang zh             # send a test message
```

Login credentials and conversation context saved in `<data-dir>/wechat_session.json`. Keep this file between scheduled runs; on POSIX it is written with mode `0600`.

WeChat limits: a user message provides the context required for replies. Live testing observed a limit of 10 replies per context. Send the bot another message to refresh the context. Long or multilingual briefings may exhaust the budget partway through. A daily budget reset has not been confirmed; the API response remains authoritative.

### Static Site (GitHub Pages)

Horizon writes summaries to `data/summaries/` and copies publishable Markdown into `docs/` for GitHub Pages. Repository includes a disabled daily workflow template at `.github/workflows/daily-summary.yml.disabled`. Configure and rename to `daily-summary.yml` to enable.

### Environment Variable Substitution

Any string value in config.json supports `${VAR_NAME}` syntax. Variables expanded at runtime from environment (including `.env`). Unset variables left as `${NAME}` instead of becoming empty string.

### Docker

`docker-compose.yml` sets `restart: "no"`. The restart policy only controls whether the container restarts after exit; it cannot schedule calendar-based execution. To run periodically with Docker, use host cron or systemd timer to start a one-shot container:

```bash
0 8 * * * cd /path/to/Horizon && docker compose run --rm horizon
```
