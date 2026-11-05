# Horizon GitHub Actions Workflow Template and Default Config

> Source: https://github.com/Thysrael/Horizon — .github/workflows/daily-summary.yml.disabled and data/config.github.json
> Collected: 2026-11-04
> Published: Unknown (repository live documents)

## .github/workflows/daily-summary.yml.disabled (full text)

```yaml
name: Daily Horizon Summary

on:
  schedule:
    # GitHub scheduled workflows use UTC. 20:00 UTC is 04:00 Asia/Shanghai;
    # this intentionally runs early to offset the observed schedule delay.
    - cron: '0 23 * * *'
  workflow_dispatch:      # Allow manual trigger

jobs:
  daily-summary:
    runs-on: ubuntu-latest
    permissions:
      contents: write  # Needed to commit changes

    steps:
      - name: Checkout code
        uses: actions/checkout@v6

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install uv
        uses: astral-sh/setup-uv@v6
        with:
          version: "0.11.26"

      - name: Install dependencies
        run: uv sync

      - name: Prepare GitHub Actions config
        run: cp data/config.github.json data/config.json

      - name: Run Horizon
        env:
          # Map secrets to environment variables expected by config.json
          # Modify these based on your data/config.github.json provider settings
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          LWN_KEY: ${{ secrets.LWN_KEY }}
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
          HORIZON_WEBHOOK_URL: ${{ secrets.HORIZON_WEBHOOK_URL }}
        run: uv run horizon --hours 24

      - name: Set current date as environment variable
        run: echo "DATE=$(date +'%Y-%m-%d')" >> $GITHUB_ENV

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
          keep_files: true  # Keep existing summaries on gh-pages branch
          commit_message: "📝 Daily Summary: ${{ env.DATE }}"
          publish_branch: gh-pages
          enable_jekyll: true
```

Key observations from the workflow:

- Cron: `0 23 * * *` (UTC 23:00 = Beijing 07:00). Also supports `workflow_dispatch` manual trigger.
- Runner: `ubuntu-latest`, Python 3.12, uv 0.11.26.
- Config preparation: `cp data/config.github.json data/config.json` — uses the GitHub-specific config, not a user's local config.
- Secrets mapped: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `LWN_KEY`, `DEEPSEEK_API_KEY`, `HORIZON_WEBHOOK_URL`.
- Pages deployment: `peaceiris/actions-gh-pages@v4`, publish_dir `./docs`, publish_branch `gh-pages`, `keep_files: true`, `enable_jekyll: true`.
- Workflow does NOT persist: `data/subscribers.json` (email subscriber list), `data/wechat_session.json` (WeChat session). Each Actions run starts with empty state for these files.
- Workflow does NOT configure: `email` section, `wechat` section. The default `data/config.github.json` only enables webhook.

## data/config.github.json (full text)

```json
{
  "ai": {
    "provider": "deepseek",
    "model": "deepseek-v4-flash",
    "base_url": "https://api.deepseek.com",
    "api_key_env": "DEEPSEEK_API_KEY",
    "temperature": 0.3,
    "max_tokens": 8192,
    "throttle_sec": 1,
    "languages": [
      "zh",
      "en"
    ],
    "analysis_concurrency": 5,
    "enrichment_concurrency": 5
  },
  "processing": {
    "profiles_dir": "profiles",
    "default_profile": "tech-news",
    "profile_settings": {
      "tech-news": {
        "threshold": 7.0,
        "topic_dedup": true
      },
      "tech-blog": {
        "threshold": 4.0,
        "topic_dedup": false
      },
      "finance-news": {
        "threshold": 7.0,
        "topic_dedup": true
      }
    }
  },
  "sources": {
    "github": [
      {
        "type": "user_events",
        "username": "karpathy",
        "enabled": true,
        "profile": "tech-news"
      },
      {
        "type": "repo_releases",
        "owner": "vllm-project",
        "repo": "vllm",
        "enabled": true,
        "profile": "tech-news"
      },
      {
        "type": "repo_releases",
        "owner": "sgl-project",
        "repo": "sglang",
        "enabled": true,
        "profile": "tech-news"
      },
      {
        "type": "repo_releases",
        "owner": "triton-lang",
        "repo": "triton",
        "enabled": true,
        "profile": "tech-news"
      }
    ],
    "hackernews": {
      "enabled": true,
      "fetch_top_stories": 30,
      "min_score": 150,
      "profile": "tech-news"
    },
    "rss": [
      {
        "name": "Simon Willison",
        "url": "https://simonwillison.net/atom/everything/",
        "enabled": true,
        "category": "ai-tools",
        "profile": "tech-news"
      },
      {
        "name": "vLLM Blog",
        "url": "https://vllm.ai/blog/rss.xml",
        "enabled": true,
        "category": "llm-inference",
        "profile": "tech-blog",
        "content_extractor": "trafilatura"
      },
      {
        "name": "Sean Goedecke",
        "url": "https://www.seangoedecke.com/rss.xml",
        "enabled": true,
        "category": "software-engineering",
        "profile": "tech-blog",
        "content_extractor": "trafilatura"
      },
      {
        "name": "CNBC Finance",
        "url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664",
        "enabled": true,
        "category": "finance",
        "profile": "finance-news",
        "content_extractor": "trafilatura"
      },
      {
        "name": "GitHub Trending - Daily",
        "url": "https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml",
        "enabled": true,
        "category": "github-trending",
        "profile": "tech-news"
      },
      {
        "name": "Semianalysis",
        "url": "https://newsletter.semianalysis.com/feed",
        "enabled": true,
        "category": "semiconductors",
        "profile": "tech-news"
      },
      {
        "name": "LWN.net",
        "url": "https://lwn.net/headlines/full_text?key=${LWN_KEY}",
        "enabled": true,
        "category": "linux-kernel",
        "profile": "tech-news"
      }
    ],
    "reddit": {
      "enabled": true,
      "subreddits": [
        {
          "subreddit": "MachineLearning",
          "enabled": true,
          "sort": "hot",
          "time_filter": "day",
          "fetch_limit": 10,
          "min_score": 60,
          "profile": "tech-news"
        },
        {
          "subreddit": "LocalLLaMA",
          "enabled": true,
          "sort": "hot",
          "time_filter": "day",
          "fetch_limit": 10,
          "min_score": 60,
          "profile": "tech-news"
        }
      ],
      "users": [],
      "fetch_comments": 10
    },
    "telegram": {
      "enabled": true,
      "channels": [
        {
          "channel": "zaihuapd",
          "enabled": true,
          "fetch_limit": 20,
          "profile": ["tech-news", "finance-news"]
        }
      ]
    }
  },
  "collection": {
    "time_window_hours": 24
  },
  "digest": {
    "max_items": null,
    "profile_order": [
      "tech-news",
      "tech-blog",
      "finance-news"
    ],
    "category_groups": {},
    "default_group": "other",
    "default_group_limit": null
  },
  "webhook": {
    "enabled": true,
    "url_env": "HORIZON_WEBHOOK_URL",
    "delivery": "summary_and_items",
    "overview_position": "last",
    "platform": "feishu",
    "layout": "collapsible",
    "fallback_layout": "markdown",
    "languages": [
      "zh"
    ],
    "request_body": {
      "msg_type": "interactive",
      "card": {
        "schema": "2.0",
        "config": {
          "wide_screen_mode": true
        },
        "header": {
          "title": {
            "tag": "plain_text",
            "content": "#{message_title}"
          },
          "template": "blue"
        },
        "body": {
          "elements": [
            {
              "tag": "markdown",
              "content": "#{summary}"
            }
          ]
        }
      }
    },
    "headers": ""
  }
}
```

Key observations from config.github.json:

- Default AI provider: DeepSeek `deepseek-v4-flash`, base_url `https://api.deepseek.com`, throttle_sec 1, analysis_concurrency 5, enrichment_concurrency 5, languages ["zh", "en"].
- Default delivery: webhook only, platform `feishu`, layout `collapsible`, delivery `summary_and_items`, languages ["zh"].
- No `email` section configured.
- No `wechat` section configured.
- Default sources: GitHub (karpathy events, vLLM/SGLang/Triton releases), HN (top 30, min_score 150), RSS (7 feeds: Simon Willison, vLLM Blog, Sean Goedecke, CNBC Finance, GitHub Trending, Semianalysis, LWN.net), Reddit (MachineLearning, LocalLLaMA), Telegram (zaihuapd).
- `digest.max_items` is null (no cap), `profile_order` is ["tech-news", "tech-blog", "finance-news"].
