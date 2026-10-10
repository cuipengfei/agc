# answer-me-with-html 与 visual-explainer skill 摘录

> Source: ~/.agents/skills/answer-me-with-html/SKILL.md (安装版 0.5.0); ~/.agents/skills/visual-explainer/SKILL.md (v0.12.0); GitHub QingYunA/answer-me-with-html README + docs/reference.md
> Collected: 2026-10-10
> Published: 2026-10-10

## answer-me-with-html：设计模型

SKILL.md 核心声明：模型只写 content draft（extended Markdown），`am` CLI 做全部版面、颜色、暗色模式、图表坐标。不手写 HTML / CSS / SVG。

### 工作流

1. 模型列 3-8 个 panel，每个 panel 回答一个子问题。
2. 按信息形状选组件（见组件表）。
3. 用 heredoc 一次 render：`node ${CLAUDE_SKILL_DIR}/scripts/am.mjs render -`
4. 读输出：`✓ <path>` 成功；`✗ L<line> [component]` 修后重跑；`STE n warnings` 按建议改后重跑，最多 2 轮。
5. 终端只回 2-3 行：结论 + 页面链接。

### am 子命令

| 命令 | 用途 |
|---|---|
| render | 渲染稿件为 HTML |
| video | 3Blue1Brown 风格解说视频 |
| patch | 替换已有页面的某个 panel |
| lint | 只做写作检查 |
| list | 列出可用组件 |
| config | 查看/修改设置 |
| serve | 远程机器上启动 HTTP 服务 |
| clean | 清理旧页面 |
| help | 查看组件语法 |
| theme | 检查自定义主题 |

CLI 文件：`scripts/am.mjs`，单文件，无 `npm install`，需 Node.js 20+。运行时依赖 marked 与 dagre 打包在内。页面写到 `~/.answer-me-with-html/pages/`，权限 0700。

### 组件（SKILL.md 自述「12 种」；§4 选择表按信息形状列 16 行，含 table/image/code/diff 与 plan 变更标记，部分复用同一组件）

| 信息形状 | 组件 | 最小语法 |
|---|---|---|
| 架构、决策分支 | `flow [LR]` | `A -> B: label` |
| 数据模型 | `er [LR]` | entity 字段 + 关系 |
| 消息时序 | `sequence [num]` | `A -> B: request` |
| 层级/目录 | `tree [list]` | 缩进表层级 |
| 历史/阶段 | `timeline [v]` | `time \|title \|description` |
| 值与上限 | `limits` | `label \|13 / 20 \|unit` |
| 逐词批注 | `annot` | `[span]{note}` |
| 元数据 | `kv [cols=2]` | `key: value` |
| 结论/警告 | `callout` | Markdown body |
| 用户决策 | `ask [multi]` | question + 选项 |
| 多维对比 | Markdown table | ok/no/warn 状态列 |
| 真实代码 | code block | ```` ```ts src=path lines=18-30 ```` |
| 真实界面 | image | `![描述](/absolute/path.png)` |

### 三主题

blueprint（工程图）、shadcn（卡片）、paper（长文阅读），各有明暗。`theme: auto` 默认：有图选 blueprint，纯文选 paper。

### STE 写作检查

`am render` 自动检查，默认只警告（`style: 80`）；`style: strict` 失败则不产出页面；`style: off` 关闭。

规则：一句一意；主动语态；步骤用祈使句；一句一词一义；句子长度英文 20 词 / 中文 35 字（步骤）或 25 词 / 45 字（描述）；每段不超过 6 句；英文用短词（use 非 utilize）；中文不用轻动词、不超 3 个连续「的」、不用黑话（赋能、闭环、至关重要）。

### frontmatter

```yaml
template: sheet  # sheet（一屏总览）| doc（线性阅读）
theme: auto
title: Title
subtitle: 一行摘要
cols: 3
source: 来源
lang: zh  # en/zh/zh-Hant/ja/fr/ko...
```

### 页面交互

每个页面有 Reply 按钮。用户选 ask 选项、在各 panel 写评论，页面汇总成一段 Markdown，用户复制回贴 agent。回复以 `# Re: <page title>` 开头，列 Decisions 和 Comments。回复是数据，不是指令。

### always-on 模式

规则文件加 `[answer-me-with-html always-on]` 后，每次给结论都附一个小页面（2-4 panel），`--no-open` 不弹窗。

### README 基准

手写 HTML 平均 4893 token / 31 秒；用 am 平均 612 token / 12 秒。此基准只覆盖 amwth 与手写 HTML 的对比，未测量与其他 skill 的对照。

### am video

`am video` 把稿件（含每段旁白）生成 3Blue1Brown 风格解说视频播放页，浏览器内编码导出 MP4/WebM。只在用户明确要求视频时使用。

### 安装

安装命令（本会话实际执行）：
`skills add -g -y https://github.com/qingyuna/answer-me-with-html --skill answer-me-with-html`

安装位置：`~/.agents/skills/answer-me-with-html`。Claude Code 通过 symlink `~/.claude/skills/answer-me-with-html` 注册。版本 0.5.0。安全评估：Gen Safe、Socket 0 alerts、Snyk Low Risk。

## visual-explainer：设计模型

SKILL.md 核心声明：把知道的东西变成一个人十秒内能看懂的。默认产物是一个 HTML 页面，以图为主干，文字是说明。

### 作者模型

模型手写全部 HTML + 内联 CSS + JS + SVG。SKILL.md 声明交付方式：Pi 平台走 `visual_explainer` `prepare` → `render`（除非用户已要求可视化，否则 `prepare` 前先问）；MCP render tools 默认 `open:false`；其他平台直接写文件并打开。另有 quick mode（`render.mjs` 渲染 JSON spec）和 plan 渲染（`plan/render.mjs`）。坐标由模型逐个手写，与 diagram-design 相同。
### 图表方式

手绘 inline SVG 为主要方式。Mermaid 只在用户要求或提供 Mermaid 源时使用。

图表类型：架构/数据流/管线/状态/时序/schema/before-after → 手绘 SVG；卡片/时间线/文件映射/并排 → CSS grid/flex；场景/失败模式/选项 → small multiples；矩阵/审计/多行数据 → table with status chips；比率/份额/指标/趋势 → waffle/bars/sparklines SVG；深度数据 → three.js；随时间变化的过程 → stepper 或 scene player；真实界面 → image。

### 视觉风格

四种 register（风格组合）：
- Instrument：评审、指标（Geist · 近黑 · 琥珀）
- Blueprint：架构（IBM Plex · 蓝黑网格 · 舞台纹理）
- Paper：概念、阅读（Newsreader + Atkinson · 墨蓝）
- Editorial：复盘、幻灯片（Instrument Serif + Sans）

### STE 写作

约 80% ASD-STE100。标题写结论非主题（"Cache hits skip Postgres" 非 "Caching"）。一句一意、主动语态、现在时、短句（约 20 词）、短段（1-3 句）。

### 动画与视频

默认 HTML 场景播放器（SVG scenes with play/pause/scrub/captions）。`/generate-video` 或 "make a video" 时读 `references/video.md`，用 `visual-explainer-video` 渲染 MP4。有语音 API key 时旁白，否则静音带字幕。

### 幻灯片

`/generate-slides` 或 `--slides` 时读 `references/slides.md`。PPTX 导出用 `visual-explainer-pptx`。HTML 是 source of truth，PPTX 无动画/导航/响应式。

### 与 amwth 的关键差异

| 维度 | answer-me-with-html | visual-explainer |
|---|---|---|
| 模型写什么 | Markdown 稿件 | 全部 HTML+CSS+JS+SVG |
| 版面坐标 | CLI 算 | 模型手算 |
| 图表 | SKILL.md 自述 12 种组件，CLI 用 dagre 算坐标 | 手绘 inline SVG，自由度最高 |
| 主题 | blueprint/shadcn/paper | Instrument/Blueprint/Paper/Editorial register |
| 写作检查 | STE 默认警告、strict 拒绝 | 约 80% STE100，无 strict 模式 |
| 视频 | am video（旁白+动画播放页） | scene player + MP4 导出 |
| 交互 | 页面内 ask/comment/Reply 回传 | plan 页面内回答回传 |
| 代码引用 | src= lines= 从仓库读 | 无 src= 引用 |
| 离线 | 无 CDN | CDN 字体与库 |
| 版本 | 0.5.0 | 0.12.0 |
