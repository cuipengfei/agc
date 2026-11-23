# OMP @smol 角色消费方与本机 gpt-6.1-terra 配置

> Source: 本机 `@oh-my-pi/pi-coding-agent` 19.1.1 源码；本机 `omp config get modelRoles`；`~/.omp/agent/agents/librarian.md`
> Collected: 2026-11-23
> Published: 2026-11-23

## 当前本机配置

`omp config get modelRoles` 中与本题相关的值：

```json
{
  "smol": "c8787/gpt-6.1-terra:low",
  "commit": "c8787/gpt-6-luna:low",
  "tiny": "sensenova/glm-5.3:max",
  "memory": "sensenova/glm-5.3:max",
  "widget": "sensenova/glm-5.3:max",
  "judge": "c8787/gpt-6-luna-decisions",
  "task": "kimi-code/k3.1-pro:max"
}
```

用户报告已将 `@smol` 从 `c8787/gpt-6-luna` 切换到 `c8787/gpt-6.1-terra`；命令读回确认了带 `:low` 的当前选择器。没有进行两个模型的 Magic Edit 对照实验。

## 直接使用 @smol 的消费方

| 消费方 | 源码位置与行为 |
|---|---|
| Magic Edit | `src/edit/magic.ts:347`：`edit.magic.model` 未设置时 `resolveRoleSelection(["smol"], ...)` |
| Edit Auto-Repair | `src/edit/auto-repair.ts:354-358`：解析 smol，在编辑破坏 AST 后修复区域并重新 parse |
| bundled scout | `src/prompts/agents/scout.md:5`：`model: "@smol"` |
| bundled sonic / Vibe | `src/task/agents.ts:67-69`、`src/vibe/runtime.ts:62-64`：机械修改与轻量执行使用 smol |
| 本机 librarian | `~/.omp/agent/agents/librarian.md:5-6`：`model: "@smol"`、`thinkingLevel: high` |
| `omp cleanse` | `src/cleanse/index.ts:21`、`src/commands/cleanse.ts:24`：默认 `@smol` |
| 后台 skill 描述压缩 | `src/extensibility/skill-descriptions.ts:82-100`：按 smol 角色链选择模型 |
| Sharpshooter | `src/sharpshooter/extract.ts:167-193`：未配置专用提取模型时回退 smol |
| Prewalk / auto-prewalk | `src/session/settings.ts:105,124,165`：默认目标 `@smol` |
| plan-yolo | `src/main.ts:1740`：`parsed.planYoloInto ?? "@smol"` |
| 模型档位循环 | `src/config/model-settings.ts:34`：默认顺序 `["smol", "default", "slow"]` |
| eval `completion()` | `src/eval/completion-bridge.ts:64-70`：`smol` tier 映射 `@smol` |
| CLI / 环境覆盖 | `src/main.ts:2088-2097`：`--smol` 或 `PI_SMOL_MODEL` 临时覆盖角色 |

## 先读专用角色、smol 作为后级候选的消费方

`src/config/model-resolver.ts:1283-1312`：

```ts
const ROLE_PRIORITY_ALIAS = {
    advisor: "slow",
    memory: "smol",
    tiny: "smol",
    widget: "smol",
};

const ROLE_CONFIGURED_FALLBACK = {
    advisor: { role: "slow", configuredOnly: true },
    memory: { role: "tiny", configuredOnly: false },
    tiny: { role: "smol", configuredOnly: false },
    widget: { role: "smol", configuredOnly: false },
};
```

具体功能：

- `commit/model-selection.ts:45-46`：commit 选择器未覆盖时使用 `["commit", "smol", ...CHAT_MODEL_ROLE_IDS]`。
- `commit/conventional/service.ts:99-108`：conventional commit 的 primary 负责 analysis，secondary 默认取 smol，负责 summary。
- `utils/title-generator.ts:163`：在线 tiny 候选顺序包含 `tiny`、`commit`、`smol`。
- `tts/speech-enhancer.ts:79-82`：speech rewrite 先走 tiny，再按 tiny 到 smol 的别名链解析。
- `memories/index.ts:562`：记忆 Phase 2 的 fallbackRole 为 smol。
- `job-widgets/author.ts:189-190`：widget 未配置时按 smol 解析，之后再看 widget fallback chain 或内置 smol 默认。
- `config/settings.ts:3905`：某些 judge 候选链可加入 `@tiny`、`@smol`、`@default`。

由于本机已经配置 `commit`、`tiny`、`memory`、`widget`、`judge`，不能把这些功能当前的主模型笼统写成 terra；需要按各自链和实际执行位置判断。

## Magic Edit 的 thinking 来源

`src/edit/magic.ts:347-350`：

```ts
const resolved = selector
    ? resolveModelRoleValue(selector, pool, ...)
    : resolveRoleSelection(["smol"], session.settings, pool);
// Typing a described change needs no deliberation: reasoning runs only when the selector asks (`…:low`).
const reasoning = toReasoningEffort(concreteThinkingLevel(resolved?.thinkingLevel));
```

因此当前 Magic Edit 的模型与档位请求来源为 `c8787/gpt-6.1-terra:low`。这能证明配置和请求档位，不能证明 terra 比 luna 更强、更快或更少触发十二轮。

## 本机 agent 专用配置与选择器后缀

`librarian.md` 的 frontmatter：

```yaml
model: "@smol"
thinkingLevel: high
```

仓库已有自定义 sub-agent 文章记录 selector 后缀优先于 agent frontmatter 的规则。当前 `@smol` 选择器本身带 `:low`，因此应以该后缀作为解析后的 thinkingLevel；未在本轮单独发起 librarian 请求测量实际行为。

## 证据边界

- 本文件只确认源码消费方和本机配置，不对模型能力排名。
- 后续 Terra 的 Magic Edit 表现应在真实调用后按 model_usage 另行记录。
