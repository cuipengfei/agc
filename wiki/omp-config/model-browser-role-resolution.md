# OMP /model 模型浏览器：角色解析与 kind 过滤

> Sources: `can1357/oh-my-pi`（fork 已同步至 upstream/main `0f9139f546`）、本机 `pi-coding-agent` 安装版
> Raw: [model-browser 角色解析与 kind 过滤取证](../../raw/omp-config/2026-09-23-model-browser-role-resolution.md)
> Updated: 2026-09-23

`/model` 打开 `ModelHub`（`packages/tui/src/overlays/model-hub.ts`）。三栏：左侧会话/分支与后台 agent 列表；中间 provider 侧边栏（`All models N` 为当前范围模型数）；右侧角色列表。

## 两条过滤条

- `Kind:`（`#renderModelKindTabs`）按模型的 kind 标签过滤中间模型列表；`Alt+←/→` 切换；标签集合 `MODEL_KIND_TABS = ["all", ...MODEL_KINDS]`。
- `Roles:`（`#renderRoleTabs`，`all / chat / kinds`）过滤右侧显示哪些角色。

二者共用 `Alt+←/→`，焦点在哪一栏切哪一条。

## 核心机制：角色按受限集合解析，配置了却解析不到就显示 `—` 且无兜底

`model-hub.ts` 的 `ModelHubSource.resolveRoleValue` 把已配置的角色选择器交给 `resolveModelRoleValue` 解析，候选集合是 `allModels`。关键点（`:370-372`、`:383-399`）：当 `scopedModels.length > 0` 时，`allModels` 就是这份受限集合，只在该数组为空才回退到 `registry.getAll("all")` 完整目录。`scopedModels` 经 `selector-controller.ts:1064-1069` 传入，来源是当前项目的 `enabledModels`（`main.ts:928-956`）。

于是：

- 选择器指向 `enabledModels` 之外的 provider → 范围外 → 解析不到 → `—`。
- 选择器指向不存在的模型（如写错 provider 名）→ 无论范围如何 → `—`。

`model-browser.ts:183-195`：配置串非空就先记为「已配置」，解析不出模型时该角色被留空渲染成 `—`，且因已记为「已配置」，后续自动兜底挑选段（`:200`）被跳过。这就是「明明在 config 里配了却显示空」的根因。

本机实证：WEB=`openai-codex/gpt-5.6-luna`、JUDGE=`typesafe-zen/jev-1.13`（两者都是自定义 provider 里的真实模型）原先都显示 `—`，根因是这两个 provider 都不在 `enabledModels` 里。把 `openai-codex/*`、`typesafe-zen/*` 加入 `enabledModels` 后重进会话，两个角色正常解析。

## 全部内置角色（15 个，`model-roles.ts:54-88`）

角色分两段，`accepts` 是该角色接受的 kind。

### chat 段

| 标签 | 名称 | accepts |
|---|---|---|
| DEFAULT | Default | chat |
| SMOL | Fast | chat |
| SLOW | Thinking | chat |
| VISION | Vision | chat（面板放行全部 chat，看图能力运行时另判） |
| PLAN | Architect | chat |
| COMMIT | Commit | chat |
| TINY | Tiny | tiny 或 chat |
| MEMORY | Memory | tiny 或 chat |
| TASK | Subtask | chat |
| ADVISOR | Advisor | chat |

### kind 段

| 标签 | 名称 | accepts |
|---|---|---|
| IMAGE | Image generation | image |
| WEB | Web search | search，或带 `webSearch` 的 chat |
| SPEECH | Speech | tts |
| DICTATION | Dictation | stt |
| JUDGE | Judge | judge / tiny / chat |

`modelRoles`/`modelTags` 里出现的非内置键会引入自定义角色（`getKnownRoleIds`，`model-roles.ts:113-124`）。`modelTags` 是按角色名配置的展示元数据（`name/color/hidden`），模型的挑选仍由 `modelRoles` 完成。

## 全部 kind（10 个，`MODEL_KINDS`）

| kind | 含义 | 备注 |
|---|---|---|
| chat | 对话 LLM | 未标 kind 的一律算 chat |
| tiny | 小/快模型 | |
| image | 图像生成 | KIND_API_KINDS |
| tts | 文字转语音 | KIND_API_KINDS |
| stt | 语音转文字 | KIND_API_KINDS |
| search | 专用搜索模型 | |
| judge | 判定模型 | |
| embedding | 向量嵌入 | KIND_API_KINDS |
| rerank | 重排序 | KIND_API_KINDS |
| video | 视频生成 | KIND_API_KINDS |

`KIND_API_KINDS` 里的 6 种要求 provider 声明对应 kind 的 API 传输，否则 discovery 丢弃该行。某个 kind 类别为空，往往是范围内没有 provider 声明该 kind。

## designer 角色已移除

`designer` 曾是内置角色 + 独立 prompt 子 agent（`prompts/agents/designer.md`），由提交 `2493ba99c4`「removed designer subagent and model role」（2026-09-03，自 v18.1.5 起）移除，从 `model-roles.ts`、agent 注册、优先级表、docs 一并拔除。提交正文未给出动机。若 `config.yml` 残留 `designer:` 一行，会以自定义角色继续显示在 `/model`，删掉该行重进会话即消失。本机实证如此。
