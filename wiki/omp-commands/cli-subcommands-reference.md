# OMP CLI 子命令全量参考

> Sources: 本机 omp v18.10.1 `omp --help` 输出直采; omp.sh/docs/cli 页面 Tavily advanced extract, 2026-10-12
> Raw: [CLI help 与文档页参考](../../raw/omp-commands/2026-10-12-cli-help-and-docs-reference.md)
> Updated: 2026-10-12

## Overview

OMP 的 shell 接口由一个默认命令 `launch`、约 60 个子命令和 50 余个启动 flag 组成。`launch` 是默认命令：第一个非 flag 单词不是已注册命令时，剩余内容全部当作初始请求。子命令按用途分为八组：会话协作与本地服务、认证与 provider 检查、插件 marketplace skill 与配置、项目维护与诊断、独立检查与媒体工具、SSH 与统计。本机 v18.10.1 的 `--help` 有 14 个命令未出现在 omp.sh/docs/cli。

## 入口形态

| 目的 | 最小命令 |
|---|---|
| 当前目录开交互 TUI | `omp` |
| 带请求启动 | `omp "Fix the failing tests"` |
| 首条消息附加上下文 | `omp @plan.md @截图.png "Implement this"` |
| 输出一次答案就退出 | `omp -p "Summarize this project"` |
| 管道输入一次性运行 | `git diff \| omp -p "Review this diff"` |
| 继续本会话 | `omp -c` / `omp -r`（不带值开选择器） |
| 机器可读事件流 | `omp -p --mode json` |
| 协议服务器 | `omp --mode rpc` 或 `omp acp` |

位置参数拼接成初始请求；`@` 前缀附加文件（文本进上下文、图片走图像输入）；stdin 非 TTY 时自动读取；`@file` 不存在或不可读会让命令失败。请求本身以命令名开头时用显式 `omp launch ...`。

## 启动 flags（七组）

### 工作区与配置

`--cwd`、`--add-dir`（可重复）、`--allow-home`、`--profile`、`--alias`（生成 shell 快捷方式后退出）、`--config`（可重复，后者覆盖前者）。

配置合并顺序：内置默认值 → 全局配置 → 项目配置 → `PI_CONFIG_FILES` → 多个 `--config` → 运行时 flag。

### 会话保存与恢复

`-c/--continue`、`-r/--resume`（按 ID 前缀/JSONL 路径恢复，不带值开选择器）、`--from-claude`、`--from-codex`、`--session-dir`、`--no-session`（本次不保存会话）、`--no-title`、`--export`（渲染 HTML 后退出）。文档页还列出 `--fork`、`--provider-session-id`、`--prompt-cache-key`，本机 `--help` FLAGS 段未列出。

### 模型与推理

`--model`（模糊匹配）、`--provider`（旧版）、`--smol`/`--slow`/`--plan`（覆盖三个模型角色）、`--models`（限制 Ctrl+P 循环清单，可带 effort 如 `sonnet:high`）、`--thinking`（off|minimal|low|medium|high|xhigh|max|auto）、`--service-tier`（none|auto|default|flex|scale|priority）、`--hide-thinking`、`--print-thoughts`、`--external-thinking`。

### prewalk 与 plan 执行

`--prewalk`（计划 todo 建立后第一次 edit/write 时切到快模型）、`--prewalk-into`（默认 smol 角色）、`--no-prewalk`、`--plan-yolo`（只读 plan 模式启动，模型第一次 resolve 时自动批准并切换模型执行）、`--plan-yolo-into`、`--goal`（以目标模式全新启动，仅交互模式）。

### 能力、审批与运行时

`--tools`、`--no-tools`、`--no-lsp`、`--no-pty`、`--approval-mode`（always-ask|write|yolo）、`--auto-approve`、`--advisor`、`--max-time`（600、10m、1h）。

### 扩展、hook、skill、rules

`-e/--extension`、`--hook`（可重复）、`--no-extensions`（显式 `-e`/`--hook` 仍生效）、`--plugin-dir`（可重复）、`--skills`（glob 过滤）、`--no-skills`、`--no-rules`。

### 系统提示与输出

`--system-prompt`（整体替换）、`--system-prompt-template`（Handlebars 模板，与前者互斥）、`--append-system-prompt`、`-p/--print`、`--mode`（text|json|rpc|rpc-ui）。

## 子命令（八组）

### 会话、协作与本地服务

| 命令 | 用途 |
|---|---|
| `share` / `join` | 加密链接分享会话 / 加入协作（`share --gist` 改用私密 gist） |
| `collab` | 列出本地 Collab 主机元数据，`collab link <id>` 取控制链接 |
| `session` | 跨机器打包/解包/标记迁移会话 |
| `anonymize` | 导出可分享的脱敏会话副本 |
| `play` / `clip` / `stream` | 回放录制 / 上传 live.omp.sh clip / 广播到公开频道 |
| `render` | 完整会话线程过生产级终端渲染管线 |
| `ps` | 管理守护进程监管的后台进程（logs/stop/kill/restart） |
| `shell` | 交互 shell 控制台 |
| `browser-relay` | 本地 CDP 中继，让 browser prelude 驱动 Chrome 标签页；端点与安全边界见 [OMP browser prelude 与 relay 架构](../omp-tools/browser-prelude-and-relay-architecture.md) |
| `acp` | 以 stdio 跑 ACP 服务器 |

### 认证与 provider 检查

| 命令 | 用途 |
|---|---|
| `login` / `auth` | 登录 provider / 导出导入已存凭据 |
| `auth-broker` | 凭据金库：serve/token/login/logout/import/migrate/status/list |
| `auth-gateway` | HTTP 转发代理或 stdio JSON lines |
| `token` | 打印某 provider 的 API key 或 OAuth token |
| `usage` | 显示每个已认证账户的 provider 用量上限 |
| `models` | 列出/搜索/刷新可用模型 |
| `dry-balance` | 不真跑会话，模拟 OAuth 账户在多会话 ID 间的分配 |
| `bench` | 压测模型：TTFT/prefill 与解码吞吐 p50/p95 |

### 插件、marketplace、skill 与配置

| 命令 | 用途 |
|---|---|
| `plugin` | install/uninstall/link/doctor/features/config/enable/disable/marketplace/discover/upgrade |
| `install` | `plugin install`/`plugin link` 的别名 |
| `skill` | 在 skills.omp.sh registry 安装/搜索/发布 skill |
| `config` | list/get/set/reset/path/init-xdg |
| `update` | 检查并安装 omp 与插件更新 |
| `setup` | 交互 onboarding；`setup python` / `setup speech` |
| `completions` | 生成 bash/zsh/fish 补全脚本 |
| `tiny-models` | 下载本地小模型 |

### 项目维护与诊断

| 命令 | 用途 |
|---|---|
| `commit` | 生成提交信息、更新 changelog、提交暂存 diff |
| `cleanse` | 按请求推断检查器，用加权并行子代理修诊断问题 |
| `gc` | 存储垃圾回收（详见独立文章） |
| `worktree` (`wt`) | 列出/清理 omp 管理的 git worktree |
| `grievances` | 查看/清理/推送工具问题自动 QA 报告 |
| `images` (`img`) | 图片发布后端的状态/诊断/探测/清理 |
| `ttsr` | 检查与测试 Time-Traveling Stream Rules |
| `git` | 全屏 git UI：分屏 diff 查看器、暂存侧栏、提交编辑器 |

### 独立检查与媒体工具

| 命令 | 用途 |
|---|---|
| `read` | 打印 read 工具对路径/URL/内部 URI 的返回结果 |
| `grep` | 独立跑 omp 的正则搜索 |
| `find` | 语义搜索：描述行为，返回实现它的文件与行范围 |
| `search` (`q`) | 用配置的搜索提供商查网页 |
| `compress` | 把文本重写成密集 prompt 注册表 |
| `toks` | 用所有内置离线 tokenizer 统计 token |
| `gallery` | 渲染器预览（可截图，需 `vhs`） |
| `say` | 本地 TTS 朗读或写 WAV |
| `predict` | 输入 prompt 实时对比各家单词补全引擎 |
| `if-bench` | 指令遵循与工作记忆压测 |

### SSH 与统计

| 命令 | 用途 |
|---|---|
| `ssh` | add/remove/list 保存的 SSH 主机 |
| `stats` | 用量统计仪表盘（`-j` 输出 JSON，`-s` 控制台摘要） |

## 本机 help 与文档页差异

本机 `--help` 有、文档页 subcommand index 未列出的 14 个命令：`anonymize`、`auth`、`clip`、`collab`、`find`、`git`、`if-bench`、`login`、`play`、`predict`、`session`、`skill`、`stream`、`toks`。

文档页有、本机 `--help` FLAGS 段未列出的 flag：`--fork`、`--provider-session-id`、`--prompt-cache-key`、`--trusted-extension`、`--yolo`、`--session`（作为 `--resume` 的别名）。

## See Also

- [gc 存储垃圾回收](gc-storage-garbage-collection.md)
- [OMP Cleanse：动态诊断修复](cleanse.md)
