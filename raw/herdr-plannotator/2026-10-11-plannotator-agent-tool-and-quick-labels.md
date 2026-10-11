# Plannotator agent tool 注入 OMP、Quick Labels 机制与 config.json 配置键清单

> Source: backnotprop/plannotator 官方源码（packages/ui/utils/quickLabels.ts; packages/ui/components/settings/QuickLabelsTab.tsx; packages/ui/components/AnnotationToolbar.tsx; packages/shared/config.ts）+ 本机 OMP 0.28.12 pi-extension 实测
> Collected: 2026-10-11
> Published: 2026-10-11

## 1. agent tool 注入 OMP 的链路（0.28.12 实测）

- OMP 插件 `@plannotator/pi-extension@0.28.12` 安装于 `~/.omp/plugins/`。`package.json` 声明 `"pi": { "extensions": ["./"] }`，`omp-plugins.lock.json` 里 `"enabled": true`。
- OMP 扫描 `~/.omp/plugins`，加载依据是 `package.json#dependencies` 与 `omp-plugins.lock.json#plugins` 的并集，跳过 `enabled: false` 条目。
- 插件 `index.ts` 里 `const agentToolEnabled = resolveAgentTool(loadConfig(), process.env, "pi")`，仅当为 true 时 `pi.registerTool({ name: 'plannotator', ... })`（工具名常量来自 `generated/plannotator-tool.ts`，值 `'plannotator'`）。
- 注册时 `defaultActive: false`，`session_start` 有交互 UI 时把工具加进活动工具列表；print/JSON 无 UI 会话不加。
- `plannotator.json` 定义 plan mode phases 与 activeTools（`plannotator_submit_plan` 等），与工具暴露无关。

## 2. resolveAgentTool 开关链与默认值

优先级（最高者胜出）：`PLANNOTATOR_AGENT_TOOL` 环境变量 → `config.agentTool` → `AGENT_TOOL_DEFAULTS[host]`。

`packages/shared/config.ts` 的默认值表：


```ts
export const AGENT_TOOL_DEFAULTS: Readonly<Record<AgentToolHost, boolean>> = {
  "claude-code": true,
  pi: false,
  opencode: false,
};
```

- env 值：`1` / `true` / `on` 开，`0` / `false` / `off` / `disabled` 关，空或无法识别算未设。
- 每次会话启动只读一次；改动对下个会话生效。
- Pi 默认关，本机通过 `~/.plannotator/config.json` 的 `"agentTool": true` 打开；后又在 `~/.omp/agent/.env` 加 `PLANNOTATOR_AGENT_TOOL=1` 双保险（env 最高优先）。

## 3. OMP 的 agent 目录 .env 注入机制

`@oh-my-pi/pi-utils/env.ts`（源码）在 import 时 eager load 四个 .env：

- `~/.env`（homeEnv）、`<configRoot>/.env`（piEnv）、`<agentDir>/.env`（agentEnv）、`<projectDir>/.env`（projectEnv）
- 合并顺序 `[projectEnv, agentEnv, piEnv, homeEnv]`，只在键未设置时写入（`!Bun.env[key]` 判断），真实进程环境里已有的键不会被 .env 覆盖。
- 验证：bash 子进程 `env | grep -E 'PI_EDIT_VARIANT|PI_STRICT_EDIT_MODE|TYPESAFE_API_KEY'` 全部可见，证明 OMP 把 `~/.omp/agent/.env` 整体灌进了 process.env。
- 补充：env.ts 头部注释说明 Bun 在用户代码运行前自动加载项目的 dotenv 文件进 process.env（含 `bun build --compile` 产物），因此项目 .env 的值在四个 .env 合并之前就已存在于环境中，同样压过 agent 目录 .env。

## 4. config.json 全部支持键（38 个顶层键）

来源：`packages/shared/config.ts` 的 `PlannotatorConfig` 接口，逐字段核对。

- **显示与外观(7)**：`displayName`、`theme`、`diffOptions`、`favicon`（totman/classic）、`agentTerminalSide`（left/right/hidden）、`agentTerminalDefaultAgent`、`conventionalComments`
- **评论标签(2)**：`conventionalLabels`（`{label, display, blocking}[]` 或 null）、`prompts`（review/plan/annotate 三段，每段子键 approved/approvedWithNotes/denied 等，可 runtimes 按主机分写，含 "pi"/"oh-my-pi"）
- **review/annotate 行为(8)**：`reviewAnalysis.semanticDiff`、`reviewAnalysis.callFlow`、`jina`、`annotateHistory`、`markdownExtensions`、`feedbackHistory`、`guideHistory`、`reviewProgress`
- **agent 集成(7)**：`agentTool`、`inboxTool`（boolean 或按主机 `{"pi": true}`）、`inboxNotifications`、`inboxPhones`、`inboxTailscale`、`inboxTailscaleAllow`、`claudeCodeMod`
- **更新与安全(6)**：`autoUpdate`、`updateCheck`、`verifyAttestation`、`skipInstall`（codex/gemini/kiro/vibe/opencode/skills/claudePlugin）、`pfmReminder`、`glimpse`
- **审查环境(6)**：`gitRemoteCheck`、`cursorSandbox`、`claudeSandbox`、`todoProvider`（auto/off）、`share`（enabled/disabled）、`guideShareUrl`
- **远程与第三方(3)**：`urlHost`、`bitbucketEmail`、`bitbucketToken`（明文存 config.json，官方建议用 env `PLANNOTATOR_BITBUCKET_TOKEN`）

`agentTool` 的 INBOX 兄弟键默认值：`INBOX_TOOL_DEFAULTS = AGENT_TOOL_DEFAULTS`（同一张表）。

## 5. Quick Labels（快速标注）机制

- 存在浏览器 **cookie**（键 `plannotator-quick-labels`，一年有效），非 localStorage：每次会话随机端口，cookie 按域名共享、跨端口持久。
- 默认 10 个：`clarify-this`(❓/yellow)、`missing-overview`(🗺️/purple)、`verify-this`(🔍/orange)、`give-me-an-example`(🔬/cyan)、`match-existing-patterns`(🧬/teal)、`consider-alternatives`(🔄/pink)、`ensure-no-regression`(📉/amber)、`out-of-scope`(🚫/red)、`needs-tests`(🧪/blue)、`nice-approach`(👍/green)。多数带 tip 字段，选中时注入反馈给 agent。
- **thumbs-up 例外**：`THUMBS_UP_LABEL`（👍 "Looks good"）硬编码，刻意不在可配置集内，是 comment-only 界面唯一允许发出的标签。
- Settings → Labels 编辑器（`QuickLabelsTab.tsx`）可：改 emoji（严格单 grapheme 校验）、改文字（自动派生 id）、选颜色（10 色）、编辑 tip、上下排序（顺序决定 Alt+数字快捷键：第 1 位 Alt+1，第 10 位 Alt+0）、删除、新增（默认 📌 "New label"，上限 12）、Reset to defaults。
- 工具栏（`AnnotationToolbar.tsx`）是两套机制：快速栏按钮硬编码 `THUMBS_UP_LABEL`；⚡️ 按钮打开 `FloatingQuickLabelPicker` 展示 `getQuickLabels()` 全部（可配置标签只在这里）。没有配置入口把自定义标签固定到快速栏。

## 6. agc 仓库脱敏实测

`src/agc_sync/policy.py` 的 `redact` 对 `"bitbucketToken": "ATBBsecret12345"` 实测输出 `"bitbucketToken": "<REDACTED>"`，camelCase 键也命中（`SENSITIVE_ASSIGNMENT` 正则无词边界锚定，`token` 子串可匹配 `bitbucketToken` 内部）。`~/.plannotator/config.json` 已作为受保护条目（`plannotator-config`，protected: true）纳入 agc 仓库 manifest 跟踪，full pull 后仓库副本与原文件一致、密钥形态可被遮蔽。