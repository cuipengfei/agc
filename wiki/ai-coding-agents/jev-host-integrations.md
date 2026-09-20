# Jev 在 OMP、Codex、OpenCode 的现成集成盘点

> Sources: 本会话只读调查（typesafe-ai 官方 org、GitHub code/issues/repos 搜索、registry 元数据、社区仓库）, 2026-09-19; 本会话只读直读（typesafe-ai/skills、antfu/skills-cli、官方文档页）, 2026-09-19
> Raw: [jev-ready-made-integrations](../../raw/ai-coding-agents/2026-09-19-jev-ready-made-integrations.md); [jev-three-host-sidecar-integration](../../raw/ai-coding-agents/2026-09-19-jev-three-host-sidecar-integration.md); [jev-official-skill-host-support](../../raw/ai-coding-agents/2026-09-19-jev-official-skill-host-support.md); [jev-channel-pricing-verification](../../raw/ai-coding-agents/2026-09-19-jev-channel-pricing-verification.md); [jev-omp-compatibility-probes](../../raw/ai-coding-agents/2026-09-19-jev-omp-compatibility-probes.md)
> Updated: 2026-09-19

## Overview

三宿主中，只有 OMP 对 Jev（TypeSafe System One）有**一方原生**集成（18.2.4 已发布，本机 18.2.5 已核验，ready-to-use）；Codex 与 OpenCode 均无原生支持，现成路径是社区 MCP server（jev-mcp 等）+ 各宿主自己的 MCP 配置机制。证据分级：**OMP 原生 = 本机会话核验**；Codex/OpenCode 的 jev-mcp、Jevbridge 等 = README/仓库层面的社区可配置方案，本轮**未本机安装、未注册、未调用任何端点**，不能视为已验证 ready-to-use。`@ai-sdk/typesafe-ai` 是 Vercel AI SDK 的 provider 组件，属 SDK 层，不是任何宿主的原生聊天 provider。

## 判定词汇表

- **ready-to-use（原生）**：装/配即用的一方内置支持。
- **社区 MCP 可配**：第三方 MCP server + 宿主 MCP 配置，理论配了即用，但未经本机运行验证。
- **仅 instruction skill**：只教 agent 怎么设计与编写集成，不含可执行组件。
- **通用 SDK**：官方库，需自行开发业务代码。
- **System One adapter**：方向相反——用 OpenAI/Anthropic LLM 模拟 System One API，不是调 Jev。
- **同名噪声 / demo**：名字撞车或示例项目，非宿主集成。

## OMP：一方原生集成（已发布，本机已核验）

- `judgment` 子系统内建 `TypeSafeJudge`，随 v18.2.4（2026-09-17）发布；本机 18.2.5 安装包内已核实存在。ready-to-use：设置 `TYPESAFE_API_KEY` 或 `/login typesafe`。
- 定位边界：这是把 Jev 用作 **OMP 内部 judgment 后端**（给 auto-thinking 分类、smart unexpected-stop、git TUI AI staging、eval `judge()` 供电），**不是把 Jev 暴露为 OMP 的聊天主模型**；auth 注册表注释亦写明 "TypeSafe (System One judgments) is not a chat-model provider"。
- 机制细节（后端、三值、回退链、消费方）见 [OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界](../omp/judgment-provider-and-eval-judge.md)。

## Codex：无原生；社区 MCP（README 层面，本轮未安装运行）

- 原生支持：GitHub code search `typesafe repo:openai/codex` 仅 3 个命中，全为 `typesafe_overrides`（Rust/serde 字段名），**同名噪声**；在所查范围未找到 Codex 对 TypeSafe/Jev 的原生支持。
- 社区 MCP（均走 `[mcp_servers.*]` 配置）：
  - `blakestone-x/jev-mcp`（Python，7★）：README 直接给出 `~/.codex/config.toml` 片段（`uvx --from git+.../jev-mcp@v0.2.1 jev-mcp`），附 Claude Code / Cursor 配置与 `scripts/register.sh`；工具面 classify/score/check/match/screen。成熟度：7★、3 commits、单人、无 CI、无测试目录（所查范围）、SECURITY.md 存在；本轮对 `src/` 核心 5 文件 + `uv.lock` 做过代码抽查，与 README 声称一致、未见 key 外传——但**抽查 ≠ 背书**，且 `uvx --from git+...` 每次冷启动执行远端代码，生产应 pin tag + 复核或 vendor。
  - `jkudish/jev-mcp`（TypeScript，69★，自述 "Proof of concept" → PoC）；另有 `itsmostafa/typesafe-mcp`（Go，62★）、`rashedInt32/jev-mcp`、`Brainwires/jevwire`、`arunav25/jev-mcp` 等，均未逐一审计。
- 结论：走 MCP 为社区可配路径；无官方/原生。本轮未安装运行，实际可用性未验证。

## OpenCode：无原生；复用同一份 jev-mcp（本轮未安装运行）

- 原生支持：code search `typesafe`/`jev` 在 anomalyco/opencode 的命中均为 i18n 子串与测试噪声；在所查范围未找到官方集成或 opencode 插件市场上的 TypeSafe 插件。
- 协议边界：TypeSafe API 不兼容 OpenAI/Anthropic 协议，**不能靠填 baseURL 直连**。
- 最短路径：`opencode.json` 的 `mcp` map 配与 Codex 完全同一份 `jev-mcp`（宿主无关的 stdio MCP server），MCP tools 自动对 LLM 可见。
- 其他社区桥：`gamesonrblx/Jevbridge`（TS，13★，ACP/MCP 桥，5 commits）、`flaviusapop/jev-router`（JS，0★，turn-router）；均为 Jev 发布后数日内新建，**生态整体处于早期**。

## 官方 typesafe-ai/skills：仅 instruction skill

- 性质：纯 instruction skill——只教 agent 怎么设计与编写 TypeSafe 集成（选 primitive、设计原子 question、定阈值），不含任何 scripts/CLI/MCP/tool；真正调用 Jev 需要 agent 现场写代码（经 SDK 或 HTTP）。
- 官方点名 Claude Code 与 Codex，外加 "other agent environments"；OpenCode 可确认发现（skills-cli 目标表 `.opencode/skills/` + opencode 仓库自带 `.opencode/skills/` 两条独立证据）；**OMP 不可确认**——skills-cli 列的是 "Pi"，未列 oh-my-pi/omp，此项标 [未公开]。

## SDK / provider 组件（单独分层）

| 组件 | 分层判定 |
|---|---|
| `typesafe-sdk`（PyPI 0.7.0，MIT） | 官方通用 Python SDK，需自行开发 |
| `@typesafe-ai/sdk`（npm） | 官方通用 JS SDK，需自行开发 |
| `@ai-sdk/typesafe-ai`（npm 3.0.3，Apache-2.0） | Vercel AI SDK 官方 provider 组件——**SDK/provider 层，不是宿主原生聊天 provider** |
| `system-one-adapter-python`（PyPI `system-one-adapter`，MIT） | System One adapter，方向相反（LLM 模拟 System One API），非调 Jev |
| PyPI `typesafe-ai` 包 | 同名噪声：社区 anti-squat 占位 redirect shim，非官方包 |
| Netlify AI Gateway 上架 Jev | 平台托管集成，非本三宿主 |

2026-09-19 渠道实测更新：上述平台托管渠道已完成七渠道全景核验（TypeSafe 直连 / OpenRouter / Vercel / Netlify / Cloudflare / OpenCode Zen / Vivgrid）——输入定价基本一致（$0.042/M，Netlify 表取整 $0.04），免费条款差异大。**两处对此文此前结论的更正**：① OpenRouter 上**没有免费 jev**（jev-1.13 $0.042/M、is_free:false、无 :free 变体；此前「新用户免费 allowance」的表述已更正为账户通用额度 ≠ 模型免费），且其 jev 挂在 /api/alpha/decisions，与 OMP 硬编码的 /v1/systemone 路径不匹配，env 无解；② 平台托管集成 ≠ 可直接给 OMP 用——OMP judgment 只认 /v1/systemone 形状，七渠道中已实测可用的仅 OpenCode Zen 一家（原生暴露 /zen/v1/systemone；jev-1.13-free 限时免费，当日真 key 撞 429 FreeUsageLimitError、匿名通道 200）。Vercel/Netlify 为文档级协议兼容（分别差 key、需先生产部署站点），Cloudflare 需翻译 shim。判定明细见 [Jev 七渠道定价与 OMP systemone 兼容性判定](jev-omp-systemone-channel-compatibility.md)。

## 证据边界（未验证清单）

- Codex/OpenCode 侧的 jev-mcp、Jevbridge、jev-router 均**未本机安装、未注册、未调用任何端点**——它们是 README/仓库层面的社区可配置方案，本 wiki 不将其表述为已验证 ready-to-use。
- key 获取流程（console.typesafe.ai 是否即时自助或需审批）未验证。
- mcpmarket.com 所列 "Askjev" 等 MCP registry 条目的源码仓库未核实；@thdxr 关于 opencode Jev 驱动权限插件的 X 帖线索未核实 repo。
- 调查范围之外一律记 "在所查范围未找到"，不作绝对断言。

## See Also

- [OMP judgmentProvider、TypeSafe Judgment 与 eval judge() 的行为边界](../omp/judgment-provider-and-eval-judge.md)
- [Jev 七渠道定价与 OMP systemone 兼容性判定](jev-omp-systemone-channel-compatibility.md)
- [四 Agent CLI 能力面对比](cli-capability-surface.md)
