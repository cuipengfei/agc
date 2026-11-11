---
name: info-tracker
description: Use when 需要汇总上游 agent 工具的发布动态、GitHub Copilot 官方更新与定价变动，并生成中文变化分析。
---

# info-tracker

跟踪四类信息源并输出结构化结果，由 agent 读取后写出中文分析。

## 运行方式

人工在仓库根目录运行：

```bash
python3 .agents/skills/info-tracker/scripts/run.py
```

脚本把一个 JSON 对象打印到 stdout，并同时写入 `state/runs/<UTC 时间戳>.json`（路径见 JSON 的 `result_path` 字段）。从 stdout 或该文件读取结果均可。任何来源有 errors 时退出码为 1，否则为 0。

## 读取结果

JSON 顶层为 `run_at`、`result_path`、`sources`。`sources` 的键与 `scripts/run.py` 注册的来源键一致，当前为 `releases`、`github_copilot_pricing`、`opencode_go_pricing`、`github_copilot_changelog`；新增来源后会增加对应键。每个来源有：

- `status`：`ok` 或 `error`
- `changes`：变化数组；release 条目含 `repository`、`tag`、`published_at`、`url`、`prerelease`、`notes`；pricing 条目含 `document`、`url`、`diff`；Copilot changelog 条目含 `change_type`（`added` 或 `modified`）、`id`、`title`、`published_at`、`modified_at`、`url`、`content`（文章正文 HTML）
- `errors`：错误数组；每条错误文本必须包含具体 `owner/repo`、定价文档名或 `GitHub Copilot changelog`，以明确失败对象

向用户用中文归纳每个来源的**新增、修改、影响和链接**。注意：

- `changes` 为空数组且无 errors = 本次无变化，如实说明"无变化"。
- `status` 为 `error` 或 `errors` 非空 = 该来源抓取失败，必须单独说明失败原因，**不能**说成"无变化"。

## GitHub Copilot changelog

`sources.json` 的 `github_copilot_changelog` 保存 GitHub Blog 页面及对应 WordPress JSON API 地址。collector 通过 API 按 Copilot 分类读取文章正文，并依照 `X-WP-TotalPages` 获取全部分页。无需额外 Python 依赖。

首次运行时，以当前 UTC 时间向前回溯 `backfill_days`（当前为 28）天。状态文件保存首次时间起点；后续从该起点重新获取发布或修改的文章，按文章 ID 去重并比较完整内容。只有完整采集成功后才替换状态文件。

## 历史与边界

- 本文所有 `state/` 路径以 `.agents/skills/info-tracker/` 为基准。活动状态为 `state/release-tracker/state.json`、`state/github-copilot-pricing-monitor/<name>.baseline`（`<name>` 为定价文档名）、`state/opencode-go-pricing-monitor/pricing.baseline`、`state/github-copilot-changelog/state.json`；运行结果位于 `state/runs/`。
- `state/` 是本地历史目录，已被 Git 忽略，从旧 Hermes/Kimi Claw workspace 迁移而来；保留所有旧归档，不需要提交。
- 本 skill 不包含 lock、cron 调度器或推送投递；也不会直接调用任何独立模型 API——中文分析由读取结果的 agent 完成。

## 添加新信息源

新来源需要三步：

1. 在 `scripts/` 下新增一个 collector，提供 `collect(state_dir, config)`，只更新成功来源的状态，并返回包含 `status`、`changes`、`errors` 的结果对象。
2. 在 `sources.json` 中增加对应来源键及配置条目。
3. 在 `scripts/run.py` 中导入新 collector，并在来源列表中注册来源键、状态目录名和 collector 的 `collect` 函数。来源键须与 `sources.json` 中的键一致，状态目录名用于 `state/<状态目录名>/`，返回结果会写入 `sources[来源键]`。

来源按上述注册列表抓取；新增 URL 需完成这三步。
